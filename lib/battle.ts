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

export type BattleRole = 'host' | 'guest';
export type BattleProgress = { floor:number; turns:number; finished:boolean };
export type BattleRoom = {
  code:string;
  hostUid:string;
  hostName:string;
  guestUid:string|null;
  guestName:string|null;
  status:'waiting'|'playing'|'finished'|'cancelled';
  hostProgress:BattleProgress;
  guestProgress:BattleProgress;
  createdAt?:unknown;
  updatedAt?:unknown;
};

async function ensureUser(){
  if(!firebaseReady||!auth) throw new Error('Firebase is not configured');
  if(auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

function cleanName(name:string){
  const value=Array.from(name.trim()||'名無しの登山者').slice(0,12).join('');
  return value||'名無しの登山者';
}
function makeCode(){
  return String(100+Math.floor(Math.random()*900));
}
const initialProgress:BattleProgress={floor:1,turns:10,finished:false};

export async function createBattleRoom(name:string){
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
      hostUid:user.uid,hostName:cleanName(name),guestUid:null,guestName:null,status:'waiting',
      hostProgress:{...initialProgress},guestProgress:{...initialProgress},createdAt:serverTimestamp(),updatedAt:serverTimestamp(),
    };
    await setDoc(ref,room); return {code,role:'host' as const};
  }
  throw new Error('ルームコードを作成できませんでした');
}

export async function joinBattleRoom(codeInput:string,name:string){
  if(!db) throw new Error('Firestore is not configured');
  const user=await ensureUser(); const code=codeInput.trim().toUpperCase();
  if(!/^\d{3}$/.test(code)) throw new Error('3桁のルームコードを入力してください');
  const ref=doc(db,'battleRooms',code);
  await runTransaction(db,async tx=>{
    const snap=await tx.get(ref); if(!snap.exists()) throw new Error('ルームが見つかりません');
    const room=snap.data() as BattleRoom;
    if(room.hostUid===user.uid) throw new Error('同じ端末から自分のルームには参加できません');
    if(room.status!=='waiting'||room.guestUid) throw new Error('このルームは参加受付を終了しています');
    tx.update(ref,{guestUid:user.uid,guestName:cleanName(name),status:'playing',guestProgress:{...initialProgress},updatedAt:serverTimestamp()});
  });
  return {code,role:'guest' as const};
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
  const user=await ensureUser(); const ref=doc(db,'battleRooms',code); const snap=await getDoc(ref);
  if(!snap.exists()) return; const room=snap.data() as BattleRoom;
  if((role==='host'&&room.hostUid!==user.uid)||(role==='guest'&&room.guestUid!==user.uid)) return;
  const field=role==='host'?'hostProgress':'guestProgress';
  const patch:any={[field]:{floor:Math.max(1,Math.floor(progress.floor)),turns:Math.max(0,Math.floor(progress.turns)),finished:Boolean(progress.finished)},updatedAt:serverTimestamp()};
  const other=role==='host'?room.guestProgress:room.hostProgress;
  if(progress.finished&&other?.finished) patch.status='finished';
  await updateDoc(ref,patch);
}
