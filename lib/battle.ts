import { signInAnonymously } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';

export type BattleRole = 'p1' | 'p2' | 'p3' | 'p4';
export type BattleProgress = {
  floor:number;
  turns:number;
  finished:boolean;
  roomTitle?:string;
  phase?:'ready'|'dialogue'|'moving'|'event'|'finished';
};
export type BattlePlayer = { uid:string; name:string; progress:BattleProgress };
export type BattleRoom = {
  code:string;
  hostUid:string;
  maxPlayers:2|3|4;
  players:Partial<Record<BattleRole,BattlePlayer>>;
  status:'waiting'|'playing'|'finished'|'cancelled';
  createdAt?:unknown;
  updatedAt?:unknown;
};

const roles:BattleRole[]=['p1','p2','p3','p4'];
const initialProgress:BattleProgress={floor:1,turns:10,finished:false,roomTitle:'エレベーターホール',phase:'ready'};

async function ensureUser(){
  if(!firebaseReady||!auth) throw new Error('Firebase is not configured');
  if(auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

function cleanName(name:string){
  const value=Array.from(name.trim()||'名無しの登山者').slice(0,12).join('');
  return value||'名無しの登山者';
}
function makeCode(){ return String(100+Math.floor(Math.random()*900)); }
function playerCount(room:Pick<BattleRoom,'players'>){ return roles.filter(r=>Boolean(room.players?.[r])).length; }

export function getBattlePlayers(room:BattleRoom){
  return roles.flatMap(role=>room.players?.[role]?[{role,player:room.players[role]!}]:[]);
}

export async function createBattleRoom(name:string,maxPlayers:2|3|4=2){
  if(!db) throw new Error('Firestore is not configured');
  const user=await ensureUser();
  for(let attempt=0;attempt<20;attempt++){
    const code=makeCode(); const ref=doc(db,'battleRooms',code); const snap=await getDoc(ref);
    if(snap.exists()){
      const existing=snap.data() as BattleRoom;
      const createdAtMs=(existing.createdAt as any)?.toMillis?.() ?? Date.now();
      const reusable=existing.status==='finished'||existing.status==='cancelled'||Date.now()-createdAtMs>2*60*60*1000;
      if(!reusable) continue;
    }
    const room:Omit<BattleRoom,'code'>={
      hostUid:user.uid,maxPlayers,players:{p1:{uid:user.uid,name:cleanName(name),progress:{...initialProgress}}},status:'waiting',
      createdAt:serverTimestamp(),updatedAt:serverTimestamp(),
    };
    await setDoc(ref,room); return {code,role:'p1' as const};
  }
  throw new Error('ルームコードを作成できませんでした');
}

export async function joinBattleRoom(codeInput:string,name:string){
  if(!db) throw new Error('Firestore is not configured');
  const user=await ensureUser(); const code=codeInput.trim();
  if(!/^\d{3}$/.test(code)) throw new Error('3桁のルームコードを入力してください');
  const ref=doc(db,'battleRooms',code);
  let assigned:BattleRole|null=null;
  await runTransaction(db,async tx=>{
    const snap=await tx.get(ref); if(!snap.exists()) throw new Error('ルームが見つかりません');
    const room=snap.data() as BattleRoom;
    if(getBattlePlayers({...room,code}).some(x=>x.player.uid===user.uid)) throw new Error('同じ端末から同じルームへ重複参加できません');
    if(room.status!=='waiting') throw new Error('このルームは参加受付を終了しています');
    const count=playerCount(room);
    if(count>=room.maxPlayers) throw new Error('このルームは満員です');
    assigned=roles.find(r=>!room.players?.[r])||null;
    if(!assigned) throw new Error('参加枠がありません');
    const nextPlayers={...(room.players||{}),[assigned]:{uid:user.uid,name:cleanName(name),progress:{...initialProgress}}};
    const nextCount=roles.filter(r=>Boolean(nextPlayers[r])).length;
    tx.update(ref,{players:nextPlayers,status:nextCount>=room.maxPlayers?'playing':'waiting',updatedAt:serverTimestamp()});
  });
  if(!assigned) throw new Error('参加に失敗しました');
  return {code,role:assigned};
}

export function subscribeBattleRoom(code:string,callback:(room:BattleRoom|null)=>void):Unsubscribe{
  if(!db){callback(null);return ()=>{};}
  return onSnapshot(doc(db,'battleRooms',code),snap=>callback(snap.exists()?({code:snap.id,...(snap.data() as Omit<BattleRoom,'code'>)}):null),()=>callback(null));
}

export async function cancelBattleRoom(code:string){
  if(!db||!code) return;
  const user=await ensureUser(); const ref=doc(db,'battleRooms',code); const snap=await getDoc(ref);
  if(!snap.exists()) return; const room=snap.data() as BattleRoom;
  if(room.hostUid!==user.uid||room.status!=='waiting') return;
  await updateDoc(ref,{status:'cancelled',updatedAt:serverTimestamp()});
}

export async function updateBattleProgress(code:string,role:BattleRole,progress:BattleProgress){
  if(!db) return;
  const user=await ensureUser();
  const ref=doc(db,'battleRooms',code);
  const floor=Math.max(1,Math.floor(progress.floor));
  const turns=Math.max(0,Math.floor(progress.turns));
  const roomTitle=(progress.roomTitle||'エレベーターホール').slice(0,40);

  // 通常の進行同期では players 全体を書き戻さない。
  // 以前は複数人が同時更新すると、古い snapshot の players で他プレイヤーの
  // finished=true を上書きしてしまい、全員終了判定が永久に成立しないことがあった。
  if(!progress.finished){
    await updateDoc(ref,{
      [`players.${role}.progress.floor`]:floor,
      [`players.${role}.progress.turns`]:turns,
      [`players.${role}.progress.roomTitle`]:roomTitle,
      [`players.${role}.progress.phase`]:progress.phase||'ready',
      updatedAt:serverTimestamp(),
    });
    return;
  }

  // 終了確定は transaction で現在の最新状態を読み、本人の finished だけを確定。
  // 同時に複数人が終了しても Firestore が競合を再試行するため、終了状態を失わない。
  await runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists()) throw new Error('対戦ルームが見つかりません');
    const room=snap.data() as BattleRoom;
    const player=room.players?.[role];
    if(!player||player.uid!==user.uid) throw new Error('対戦プレイヤーを確認できません');

    const finalProgress:BattleProgress={floor,turns,finished:true,roomTitle,phase:'finished'};
    const nextPlayers={...(room.players||{}),[role]:{...player,progress:finalProgress}};
    const joined=roles.flatMap(r=>nextPlayers[r]?[nextPlayers[r]!]:[]);
    const allFinished=joined.length===room.maxPlayers&&joined.every(p=>p.progress?.finished===true);

    tx.update(ref,{
      [`players.${role}.progress`]:finalProgress,
      ...(allFinished?{status:'finished' as const}:{}),
      updatedAt:serverTimestamp(),
    });
  });
}
