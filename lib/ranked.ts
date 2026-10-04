// コンピュータ戦のCPU行動・トロフィー保存・週間/総合トロフィーランキングを担当する。
// CPUのstrategyは画面へ公開せず、各CPUは選ばれた方針に沿って報酬/アイテム利用を重み付けする。
import { signInAnonymously } from 'firebase/auth';
import {
  collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';

export type RankCpuStrategy = 'luck' | 'turns' | 'floor' | 'money' | 'balanced';
export type RankCpuItem = 'mirror' | 'ring' | 'party_set' | 'shop_ticket';
export type RankCpu = {
  id: string;
  name: string;
  strategy: RankCpuStrategy;
  floor: number;
  turns: number;
  luck: number;
  money: number;
  items: RankCpuItem[];
  finished: boolean;
  lastAction: string;
  roomTitle: string;
  roomImage: string;
};

export type TrophyProfile = {
  weekKey: string;
  trophies: number;
  previousWeekKey?: string;
  previousWeekTrophies?: number;
};

export type TrophyRankingEntry = {
  id?: string;
  uid?: string;
  playerId: string;
  name: string;
  trophies: number;
  weekKey: string;
  updatedAt?: unknown;
};

export type TrophyRankingScope = 'weekly' | 'alltime';

const TROPHY_PROFILE_KEY = 'infinite_elevator_trophy_profile_v1';
const CPU_NAMES = ['クロウ','ミナト','ルナ','ノア','レイ','アオイ','シオン','カイ','ユウ','ナギ','ソラ','リク'];
const STRATEGIES: RankCpuStrategy[] = ['luck','turns','floor','money','balanced'];
const ri=(a:number,b:number)=>Math.floor(Math.random()*(b-a+1))+a;

const CPU_ROOM_VISUALS={
  luck:[
    {title:'ラッキー部屋',image:'stages/stage-03.webp'},
    {title:'超ラッキー部屋',image:'stages/stage-15.webp'},
    {title:'占い師の小部屋',image:'stages/stage-10.webp'},
  ],
  turns:[
    {title:'健康の湯',image:'stages/stage-04.webp'},
    {title:'無病の湯',image:'stages/stage-16.webp'},
    {title:'自動販売機',image:'stages/stage-14.webp'},
  ],
  floor:[
    {title:'短い階段',image:'stages/stage-06.webp'},
    {title:'長い階段',image:'stages/stage-18.webp'},
    {title:'果てしなく長い階段',image:'stages/stage-28.webp'},
  ],
  money:[
    {title:'落ちている財布',image:'stages/stage-05.webp'},
    {title:'小さなお店',image:'stages/stage-08.webp'},
    {title:'大きなお店',image:'stages/stage-19.webp'},
  ],
  item:[
    {title:'小さな宝箱',image:'stages/stage-09.webp'},
    {title:'魔法鍛冶屋',image:'stages/stage-21.webp'},
    {title:'不思議なアイテム箱',image:'stages/stage-30.webp'},
  ],
} as const;

export const RANK_CPU_ITEM_LABELS:Record<RankCpuItem,string>={
  mirror:'乱反射の鏡', ring:'幸運の指輪', party_set:'パーティーセット', shop_ticket:'お店チケット',
};
const pick=<T,>(xs:T[])=>xs[Math.floor(Math.random()*xs.length)];

// 週の区切りは月曜 00:00 JST。YYYY-MM-DD形式でその週の月曜日を返す。
export function getJstWeekKey(now=new Date()){
  const jstMs=now.getTime()+9*60*60*1000;
  const jst=new Date(jstMs);
  const day=(jst.getUTCDay()+6)%7; // Monday=0
  const monday=new Date(Date.UTC(jst.getUTCFullYear(),jst.getUTCMonth(),jst.getUTCDate()-day));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth()+1).padStart(2,'0')}-${String(monday.getUTCDate()).padStart(2,'0')}`;
}

export function getJstWeekLabel(now=new Date()){
  const key=getJstWeekKey(now);
  const [y,m,d]=key.split('-').map(Number);
  return `${y}年${m}月${d}日(月)〜`;
}

export function loadTrophyProfile(now=new Date()):TrophyProfile{
  const currentWeek=getJstWeekKey(now);
  if(typeof window==='undefined') return {weekKey:currentWeek,trophies:0};
  try{
    const raw=JSON.parse(localStorage.getItem(TROPHY_PROFILE_KEY)||'null') as TrophyProfile|null;
    if(!raw||typeof raw.trophies!=='number'||!raw.weekKey){
      const initial={weekKey:currentWeek,trophies:0};
      localStorage.setItem(TROPHY_PROFILE_KEY,JSON.stringify(initial));
      return initial;
    }
    if(raw.weekKey===currentWeek){
      // トロフィーは常に0以上。過去データに負数が残っていても読み込み時に補正する。
      const normalized={...raw,trophies:Math.max(0,Math.trunc(raw.trophies))};
      if(normalized.trophies!==raw.trophies) localStorage.setItem(TROPHY_PROFILE_KEY,JSON.stringify(normalized));
      return normalized;
    }
    const rolled:TrophyProfile={
      weekKey:currentWeek,
      trophies:0,
      previousWeekKey:raw.weekKey,
      previousWeekTrophies:Math.max(0,Math.trunc(raw.trophies)),
    };
    localStorage.setItem(TROPHY_PROFILE_KEY,JSON.stringify(rolled));
    return rolled;
  }catch{
    return {weekKey:currentWeek,trophies:0};
  }
}

export function applyTrophyDelta(delta:number,now=new Date()){
  const profile=loadTrophyProfile(now);
  // 順位減算や切断ペナルティがあっても、トロフィーは0未満にしない。
  const next={...profile,trophies:Math.max(0,profile.trophies+delta)};
  if(typeof window!=='undefined') localStorage.setItem(TROPHY_PROFILE_KEY,JSON.stringify(next));
  return next;
}

export function clearPreviousWeekSnapshot(profile:TrophyProfile){
  // 通信中にランク戦が終わってトロフィーが増減していても、現在値を巻き戻さない。
  const current=typeof window!=='undefined'?loadTrophyProfile():profile;
  const next={weekKey:current.weekKey,trophies:current.trophies};
  if(typeof window!=='undefined') localStorage.setItem(TROPHY_PROFILE_KEY,JSON.stringify(next));
  return next;
}

async function ensureUser(){
  if(!firebaseReady||!auth) return null;
  if(auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

function trophyCollection(scope:TrophyRankingScope,weekKey=getJstWeekKey()){
  if(!db) throw new Error('Firestore is not configured');
  return scope==='weekly'
    ? collection(db,'trophyRankingsWeekly',weekKey,'entries')
    : collection(db,'trophyRankingsAlltime');
}

export async function submitWeeklyTrophies(playerId:string,name:string,trophies:number,weekKey=getJstWeekKey()){
  if(!firebaseReady||!db||!playerId) return false;
  const user=await ensureUser(); if(!user) return false;
  await setDoc(doc(trophyCollection('weekly',weekKey),playerId),{
    uid:user.uid,playerId,name:Array.from(name.trim()||'名無しの登山者').slice(0,12).join(''),
    trophies:Math.max(0,Math.trunc(trophies)),weekKey,updatedAt:serverTimestamp(),
  });
  return true;
}

// 総合ランキングは「終了した週の最終トロフィー」の自己ベストを保持する。
export async function submitFinalizedWeekToAlltime(playerId:string,name:string,trophies:number,weekKey:string){
  if(!firebaseReady||!db||!playerId) return false;
  const user=await ensureUser(); if(!user) return false;
  const ref=doc(trophyCollection('alltime'),playerId);
  const snap=await getDoc(ref);
  const current=snap.exists()?Number((snap.data() as TrophyRankingEntry).trophies||0):null;
  if(current!==null&&current>=trophies) return true;
  await setDoc(ref,{
    uid:user.uid,playerId,name:Array.from(name.trim()||'名無しの登山者').slice(0,12).join(''),
    trophies:Math.max(0,Math.trunc(trophies)),weekKey,updatedAt:serverTimestamp(),
  });
  return true;
}

export async function loadTrophyRankings(scope:TrophyRankingScope,weekKey=getJstWeekKey()){
  if(!firebaseReady||!db) return [] as TrophyRankingEntry[];
  const snap=await getDocs(query(trophyCollection(scope,weekKey),orderBy('trophies','desc'),limit(50)));
  return snap.docs.map(d=>({id:d.id,...(d.data() as TrophyRankingEntry)}));
}

export async function loadMyTrophyRanking(scope:TrophyRankingScope,playerId:string,weekKey=getJstWeekKey()){
  if(!firebaseReady||!db||!playerId) return null;
  const mine=await getDoc(doc(trophyCollection(scope,weekKey),playerId));
  if(!mine.exists()) return null;
  const entry={id:mine.id,...(mine.data() as TrophyRankingEntry)};
  const higher=await getCountFromServer(query(trophyCollection(scope,weekKey),where('trophies','>',entry.trophies)));
  return {entry,rank:higher.data().count+1};
}

export function createRankCpuPlayers():RankCpu[]{
  const names=[...CPU_NAMES].sort(()=>Math.random()-.5).slice(0,4);
  return names.map((name,index)=>({
    id:`cpu${index+1}`, name, strategy:pick(STRATEGIES), floor:1, turns:10, luck:0, money:1000,
    items:[], finished:false, lastAction:'待機中', roomTitle:'エレベーターホール', roomImage:'stages/stage-01.webp',
  }));
}

function maybeUseItem(cpu:RankCpu){
  const next={...cpu,items:[...cpu.items]};
  let floorMultiplier=1;
  const take=(item:RankCpuItem)=>{const i=next.items.indexOf(item);if(i>=0)next.items.splice(i,1);return i>=0;};
  if(next.items.includes('mirror')&&(next.strategy==='floor'||next.luck>=7||Math.random()<.22)){
    take('mirror'); floorMultiplier=ri(2,4); next.lastAction=`鏡×${floorMultiplier}を使用`;
  }
  if(next.items.includes('ring')&&(next.strategy==='luck'||next.strategy==='balanced'||Math.random()<.18)){
    take('ring'); const gain=ri(3,8); next.luck+=gain; next.lastAction=`指輪で運気+${gain}`;
  }
  if(next.items.includes('party_set')&&(next.strategy==='turns'||next.strategy==='floor'||Math.random()<.15)){
    take('party_set'); next.turns+=1; next.lastAction='パーティーセットで残り回数+1';
  }
  if(next.items.includes('shop_ticket')&&(next.strategy==='money'||Math.random()<.12)){
    take('shop_ticket'); const cost=Math.min(next.money,ri(200,700)); next.money-=cost;
    next.items.push(pick<RankCpuItem>(['mirror','ring','party_set']));
    next.lastAction='お店チケットでアイテムを補充';
  }
  return {cpu:next,floorMultiplier};
}

function rewardForStrategy(strategy:RankCpuStrategy){
  const r=Math.random();
  if(strategy==='luck') return r<.44?'luck':r<.62?'turns':r<.76?'floor':r<.88?'money':'item';
  if(strategy==='turns') return r<.44?'turns':r<.62?'luck':r<.76?'floor':r<.88?'money':'item';
  if(strategy==='floor') return r<.44?'floor':r<.62?'luck':r<.76?'turns':r<.88?'item':'money';
  if(strategy==='money') return r<.42?'money':r<.68?'item':r<.80?'turns':r<.90?'luck':'floor';
  return r<.20?'luck':r<.40?'turns':r<.60?'floor':r<.80?'money':'item';
}

export function advanceRankCpu(input:RankCpu):RankCpu{
  if(input.turns<=0) return {...input,turns:0,finished:true,lastAction:'行動終了'};
  let {cpu,floorMultiplier}=maybeUseItem(input);
  cpu.turns=Math.max(0,cpu.turns-1);

  // プレイヤーの通常上昇に近い形で、運気が高いほど上昇量が伸びる。
  const tierRoll=Math.random();
  const tier=tierRoll<.65?1:tierRoll<.90?2:tierRoll<.98?3:4;
  const base=tier===1?ri(1,12):tier===2?ri(10,30):tier===3?ri(25,50):ri(40,80);
  const luckMult=tier===1?ri(2,3):tier===2?ri(3,4):tier===3?ri(4,5):ri(5,7);
  const steps=(base+Math.max(0,cpu.luck)*luckMult)*floorMultiplier;
  cpu.floor+=steps;

  const reward=rewardForStrategy(cpu.strategy);
  const roomVisual=pick([...CPU_ROOM_VISUALS[reward]]);
  cpu.roomTitle=roomVisual.title;
  cpu.roomImage=roomVisual.image;
  if(reward==='luck'){
    const gain=ri(1,cpu.strategy==='luck'?5:3); cpu.luck+=gain; cpu.lastAction=`${steps}階上昇 / 運気+${gain}`;
  }else if(reward==='turns'){
    const gain=Math.random()<(cpu.strategy==='turns'?0.55:0.30)?2:1; cpu.turns+=gain; cpu.lastAction=`${steps}階上昇 / 残り+${gain}`;
  }else if(reward==='floor'){
    const bonus=ri(cpu.strategy==='floor'?12:5,cpu.strategy==='floor'?45:24); cpu.floor+=bonus; cpu.lastAction=`${steps}階上昇 / 階段+${bonus}`;
  }else if(reward==='money'){
    const gain=ri(cpu.strategy==='money'?500:150,cpu.strategy==='money'?1600:800); cpu.money+=gain; cpu.lastAction=`${steps}階上昇 / +${gain}円`;
    if(cpu.strategy==='money'&&cpu.money>=500&&cpu.items.length<3&&Math.random()<.65){cpu.money-=500;cpu.items.push(pick<RankCpuItem>(['mirror','ring','party_set','shop_ticket']));cpu.lastAction+=' / アイテム購入';}
  }else{
    if(cpu.items.length<3){const item=pick<RankCpuItem>(['mirror','ring','party_set','shop_ticket']);cpu.items.push(item);cpu.lastAction=`${steps}階上昇 / アイテム獲得`;}
    else cpu.lastAction=`${steps}階上昇 / アイテム満杯`;
  }
  cpu.finished=cpu.turns<=0;
  return cpu;
}

export function rankMatchOrder(player:{name:string;floor:number;luck:number;money:number},cpus:RankCpu[]){
  // 同階の場合は運気→所持金の順でタイブレークし、5人対戦の順位を確定する。
  return [
    {id:'player',name:player.name,floor:player.floor,luck:player.luck,money:player.money,isPlayer:true},
    ...cpus.map(c=>({id:c.id,name:c.name,floor:c.floor,luck:c.luck,money:c.money,isPlayer:false})),
  ].sort((a,b)=>b.floor-a.floor||b.luck-a.luck||b.money-a.money||a.id.localeCompare(b.id));
}

export function trophyDeltaForPlace(place:number){ return place===1?3:place===2?1:place===3?0:place===4?-1:-2; }
