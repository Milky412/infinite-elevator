'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge, Box, Button, Center, Divider, Flex, Grid, GridItem, HStack, Icon, IconButton,
  Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Progress, Select,
  SimpleGrid, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useDisclosure, VStack
} from '@chakra-ui/react';
import {
  FaArrowUp, FaBolt, FaBookOpen, FaBoxOpen, FaCircleQuestion, FaCoins, FaDoorClosed,
  FaElevator, FaGavel, FaGem, FaGift, FaHammer, FaHeart, FaHotTubPerson, FaStar, FaWandMagicSparkles,
  FaPlay, FaRankingStar, FaSackDollar, FaSkull, FaStore, FaSun,
  FaTrophy, FaVolumeHigh, FaVolumeXmark
} from 'react-icons/fa6';
import type { Item, ItemId, Room, State } from '../lib/types';
import { firebaseReady } from '../lib/firebase';
import { getCurrentMonthKey, getCurrentMonthLabel, loadRankingView, previewRankings, submitRankings, type MyRankingResult, type RankingEntry, type RankingScope, type ScorePreviewBundle } from '../lib/leaderboard';
import { appendPlayHistory, getLocalHistorySummary, getOrCreatePlayerId, loadPlayHistory } from '../lib/localProfile';
import { cancelBattleRoom, createBattleRoom, getBattlePlayers, joinBattleRoom, subscribeBattleRoom, updateBattleProgress, type BattleRole, type BattleRoom } from '../lib/battle';
import { advanceRankCpu, applyTrophyDelta, clearPreviousWeekSnapshot, createRankCpuPlayers, getJstWeekLabel, loadMyTrophyRanking, loadTrophyProfile, loadTrophyRankings, rankMatchOrder, submitFinalizedWeekToAlltime, submitWeeklyTrophies, trophyDeltaForPlace, type RankCpu, type TrophyProfile, type TrophyRankingEntry, type TrophyRankingScope } from '../lib/ranked';

import { Action, Bullet, HelpSection, InfoModal, StageGuideModal, StagePreviewModal } from './GameModals';
import { baseState, itemPalette, makeItem, masterItemIds, pick, ri, stageCatalog, stageRouteMap, tierMeta, type FatePending, type KeyKind, type StageCatalogEntry } from './gameConfig';
import { playSfx, startBgm, stopBgm, type BgmMood, type DoorChoice, type SfxName } from './gameAudio';

// ゲーム本体。状態管理・イベント進行・ランキング/対戦連携を担当する。
// 静的データ、音響、汎用モーダルは別ファイルへ分離している。
export default function InfiniteElevator(){
  const [s,setS]=useState<State>(baseState);
  const [menu,setMenu]=useState(true); const [moving,setMoving]=useState(false); const [doors,setDoors]=useState(false);
  const [room,setRoom]=useState<Room>({tier:1,title:'エレベーターホール',desc:'ボタンを押して上の階を目指しましょう！'});
  const [roomIntro,setRoomIntro]=useState(false);
  const [overlay,setOverlay]=useState<{show:boolean,tier:number,steps:number,detail:string,locked:boolean}>({show:false,tier:1,steps:0,detail:'',locked:false});
  const [selected,setSelected]=useState<number|null>(null); const [pendingOverflow,setPendingOverflow]=useState<Item|null>(null); const [pendingOverflowPurchase,setPendingOverflowPurchase]=useState<{source:'shop'|'legendshop'|'auction';cost:number;shopIndex?:number}|null>(null); const [gameover,setGameover]=useState(false); const [nickname,setNickname]=useState(''); const [nameDraft,setNameDraft]=useState(''); const [newPersonalBest,setNewPersonalBest]=useState(false);
  const [rankingMode,setRankingMode]=useState<RankingScope>('monthly');
  const [rankingViews,setRankingViews]=useState<Record<RankingScope,{rows:RankingEntry[];mine:MyRankingResult|null;loaded:boolean;cached:boolean}>>({monthly:{rows:[],mine:null,loaded:false,cached:false},alltime:{rows:[],mine:null,loaded:false,cached:false}});
  const [rankingStatus,setRankingStatus]=useState<'connecting'|'online'|'offline'|'error'>(firebaseReady?'connecting':'offline'); const [scoreSubmitted,setScoreSubmitted]=useState(false); const [scoreSubmitting,setScoreSubmitting]=useState(false); const [scoreSaveMessage,setScoreSaveMessage]=useState(''); const scoreSubmitLockRef=useRef(false); const [playerId,setPlayerId]=useState(''); const [scorePreview,setScorePreview]=useState<ScorePreviewBundle|null>(null); const [scorePreviewLoading,setScorePreviewLoading]=useState(false); const [scorePreviewError,setScorePreviewError]=useState(''); const [localHistorySummary,setLocalHistorySummary]=useState({count:0,best:0}); const [localPlayHistory,setLocalPlayHistory]=useState(()=>[] as ReturnType<typeof loadPlayHistory>); const runRecordedRef=useRef(false); const [forcedShop,setForcedShop]=useState(false); const [soundOn,setSoundOn]=useState(true);
  const [developerMode,setDeveloperMode]=useState(false);
  const [masterActive,setMasterActive]=useState(false); const masterRoomQueueRef=useRef<string[]>([]);
  const [masterFloor,setMasterFloor]=useState(1); const [masterLuck,setMasterLuck]=useState(0); const [masterTurns,setMasterTurns]=useState(10); const [masterMoney,setMasterMoney]=useState(1000);
  const [masterStartStage,setMasterStartStage]=useState('エレベーターホール'); const [masterQueueDraft,setMasterQueueDraft]=useState(''); const [masterNextStages,setMasterNextStages]=useState<string[]>([]);
  const [masterItems,setMasterItems]=useState<Array<{id:ItemId|'';n:number}>>([{id:'',n:1},{id:'',n:1},{id:'',n:1}]);
  const [devGrantItem,setDevGrantItem]=useState<ItemId|'mirror'>('mirror'); const [devGrantN,setDevGrantN]=useState(1); const [devRuntimeStage,setDevRuntimeStage]=useState('');
  const [rocks,setRocks]=useState<{gem:ItemId|null,count:number,open:boolean}[]>([]); const [picks,setPicks]=useState(0);
  const [shop,setShop]=useState<{item:Item,sold:boolean}[]>([]); const [bj,setBj]=useState<{playing:boolean,bet:number,p:number[],d:number[]}>({playing:false,bet:100,p:[],d:[]});
  const [forgeUsed,setForgeUsed]=useState(false);
  const [fortuneReading,setFortuneReading]=useState(false);
  const [itemBoxOpening,setItemBoxOpening]=useState(false);
  const [ultimateSpinning,setUltimateSpinning]=useState(false);
  const [eventAnimating,setEventAnimating]=useState(false);
  const [atmDeposit,setAtmDeposit]=useState(0);
  const [atmInput,setAtmInput]=useState('');
  const [legendShopUsed,setLegendShopUsed]=useState(false);
  const [warpAnimating,setWarpAnimating]=useState(false);
  const [warpMessage,setWarpMessage]=useState('');
  const [floorTransition,setFloorTransition]=useState<{show:boolean;from:number;to:number;label:string;phase:string}>({show:false,from:1,to:1,label:'',phase:''});
  const [ultimateMessage,setUltimateMessage]=useState('???');
  const [bjPhase,setBjPhase]=useState('');
  const [hellRolling,setHellRolling]=useState(false);
  const [hellDie,setHellDie]=useState<number|null>(null);
  const [hellMessage,setHellMessage]=useState('「5」が出れば生還。1回振るごとに残り回数を1消費する。');
  const [boxRewards,setBoxRewards]=useState<{type:'money'|'luck'|'turn',value:number}[]>([]);
  const [boxSelected,setBoxSelected]=useState<number|null>(null);
  const [boxRevealAll,setBoxRevealAll]=useState(false);
  const [slotBet,setSlotBet]=useState(20); const [slot,setSlot]=useState(['❔','❔','❔']); const [slotSpinning,setSlotSpinning]=useState(false);
  const [slotWin,setSlotWin]=useState(false); const [slotMessage,setSlotMessage]=useState('');
  const [casinoSpinsLeft,setCasinoSpinsLeft]=useState(10);
  const [vendingFeedback,setVendingFeedback]=useState<{kind:'luck'|'turn';gain:number;cost:number}|null>(null);
  const [barterCount,setBarterCount]=useState(0);
  const [vendingCount,setVendingCount]=useState(0);
  const [keys,setKeys]=useState<Record<KeyKind,number>>({copper:0,silver:0,gold:0,diamond:0});
  const [scratchOutcome,setScratchOutcome]=useState<'ruby'|'emerald'|'diamond'|'miss'>('miss');
  const [scratchRevealed,setScratchRevealed]=useState<boolean[]>([false,false,false]);
  const [scratchPaid,setScratchPaid]=useState(false);
  const [fateStage,setFateStage]=useState(0);
  const [fatePending,setFatePending]=useState<FatePending>({money:500,luck:0,turns:0,items:[],labels:['初期報酬 500円']});
  const [fateDone,setFateDone]=useState(false);
  const [fateOpeningDoor,setFateOpeningDoor]=useState<number|null>(null);
  const [pirateBoxes,setPirateBoxes]=useState<(KeyKind|null)[]>([]);
  const [piratePicks,setPiratePicks]=useState<number[]>([]);
  const [pirateRevealAll,setPirateRevealAll]=useState(false);
  const [vaultOpeningKey,setVaultOpeningKey]=useState<KeyKind|null>(null);
  const [vaultPhase,setVaultPhase]=useState<'idle'|'shake'|'glow'|'open'>('idle');
  const [itemGrantQueue,setItemGrantQueue]=useState<Item[]>([]);
  const [rareArrival,setRareArrival]=useState(0);
  const [doorChoices,setDoorChoices]=useState<DoorChoice[]>([]);
  const [gameSpeed,setGameSpeed]=useState<1|2|3>(1);
  // 開発者プレイ専用。AUTOは会話送りと通常のエレベーター操作だけを自動化し、選択が必要なイベントでは待機する。
  const [devAutoPlay,setDevAutoPlay]=useState(false);
  const fastTimeout=(fn:()=>void,ms:number)=>window.setTimeout(fn,ms/gameSpeed);
  const fastInterval=(fn:()=>void,ms:number)=>window.setInterval(fn,ms/gameSpeed);
  const rules=useDisclosure(), guide=useDisclosure(), itemGuide=useDisclosure(), rank=useDisclosure(), computerBattleMenu=useDisclosure(), rankedResult=useDisclosure(), stagePreview=useDisclosure(), inventoryPanel=useDisclosure(), logPanel=useDisclosure(), nameEdit=useDisclosure(), historyModal=useDisclosure(), resetRecords=useDisclosure(), battleLobby=useDisclosure(), battleResult=useDisclosure();
  const [previewStage,setPreviewStage]=useState<StageCatalogEntry|null>(null);
  const [statusDetail,setStatusDetail]=useState<'turns'|'luck'|'money'|null>(null);
  const [battleCodeInput,setBattleCodeInput]=useState('');
  const [battleCode,setBattleCode]=useState('');
  const [battleRole,setBattleRole]=useState<BattleRole|null>(null);
  const [battleRoom,setBattleRoom]=useState<BattleRoom|null>(null);
  const [battleBusy,setBattleBusy]=useState(false);
  const [battleError,setBattleError]=useState('');
  const [battleActive,setBattleActive]=useState(false);
  const [battleRunFinished,setBattleRunFinished]=useState(false);
  const [battleMaxPlayers,setBattleMaxPlayers]=useState<2|3|4>(2);
  const [spectateRole,setSpectateRole]=useState<BattleRole|null>(null);
  const battleStartedRef=useRef(false);
  const battleUnsubRef=useRef<null|(()=>void)>(null);
  // コンピュータ戦はローカルCPU 3人との4人戦。AIのstrategyは内部状態だけに保持し画面には公開しない。
  const [rankedActive,setRankedActive]=useState(false);
  const [rankedCpus,setRankedCpus]=useState<RankCpu[]>([]);
  const [rankedPlayerFinished,setRankedPlayerFinished]=useState(false);
  const rankedAwardedRef=useRef(false);
  const [rankedMatchResult,setRankedMatchResult]=useState<null|{place:number;delta:number;before:number;after:number;order:ReturnType<typeof rankMatchOrder>}>(null);
  const [trophyProfile,setTrophyProfile]=useState<TrophyProfile>({weekKey:'',trophies:0});
  const [rankingCategory,setRankingCategory]=useState<'floor'|'trophy'>('floor');
  const [trophyRankingMode,setTrophyRankingMode]=useState<TrophyRankingScope>('weekly');
  const [trophyRankingRows,setTrophyRankingRows]=useState<TrophyRankingEntry[]>([]);
  const [myTrophyRanking,setMyTrophyRanking]=useState<null|{entry:TrophyRankingEntry;rank:number|null}>(null);
  const [trophyRankingLoading,setTrophyRankingLoading]=useState(false);
  const menuVisualSrc=`${process.env.NEXT_PUBLIC_BASE_PATH||''}/start-screen-v45.png`;
  const menuVisualSrcPc=`${process.env.NEXT_PUBLIC_BASE_PATH||''}/start-screen-pc-v58.png`;

  useEffect(()=>{
    const h=Number(localStorage.getItem('infinite_elevator_highscore')||'1');
    const n=localStorage.getItem('infinite_elevator_nickname')||'';
    const id=getOrCreatePlayerId();
    setPlayerId(id);
    const history=loadPlayHistory();
    setLocalPlayHistory(history);
    setLocalHistorySummary(getLocalHistorySummary(history));
    setS(x=>({...x,highScore:Math.max(1,h)}));
    setNickname(n);
    const trophy=loadTrophyProfile();
    setTrophyProfile(trophy);
    if(firebaseReady){
      const safeName=n||'名無しの登山者';
      // 週が切り替わっていた場合、前週の最終トロフィーを総合ランキングへ確定してからスナップショットを消す。
      if(trophy.previousWeekKey&&typeof trophy.previousWeekTrophies==='number'){
        void submitFinalizedWeekToAlltime(id,safeName,trophy.previousWeekTrophies,trophy.previousWeekKey).then(ok=>{
          if(ok){const cleared=clearPreviousWeekSnapshot(trophy);setTrophyProfile(cleared);}
        }).catch(()=>{});
      }
      void submitWeeklyTrophies(id,safeName,trophy.trophies,trophy.weekKey).catch(()=>{});
    }
    if(!firebaseReady){
      setRankingStatus('offline');
    }else{
      // 起動時にはFirestoreを読まない。ランキングを開いた時だけ取得する。
      setRankingStatus('connecting');
    }
  },[]);

  useEffect(()=>()=>{battleUnsubRef.current?.();battleUnsubRef.current=null;},[]);

  const loadRankingMode=async(mode:RankingScope, force=false)=>{
    setRankingMode(mode);
    if(!firebaseReady){
      const key=mode==='monthly'?`infinite_elevator_local_rankings_monthly_${getCurrentMonthKey()}`:'infinite_elevator_local_rankings';
      const rows=JSON.parse(localStorage.getItem(key)||'[]').slice(0,50);
      setRankingViews(v=>({...v,[mode]:{rows,mine:null,loaded:true,cached:true}}));
      setRankingStatus('offline');
      return;
    }
    if(rankingViews[mode].loaded&&!force){setRankingStatus('online');return;}
    setRankingStatus('connecting');
    try{
      const id=playerId||getOrCreatePlayerId();
      if(!playerId)setPlayerId(id);
      const view=await loadRankingView(mode,id,force);
      setRankingViews(v=>({...v,[mode]:{rows:view.rows,mine:view.mine,loaded:true,cached:view.cached}}));
      setRankingStatus('online');
    }catch{
      setRankingStatus('error');
    }
  };

  const openRanking=()=>{
    rank.onOpen();
    setRankingCategory('floor');
    setRankingMode('monthly');
    void loadRankingMode('monthly');
  };

  const loadTrophyRankingMode=async(mode:TrophyRankingScope)=>{
    setTrophyRankingMode(mode);setTrophyRankingLoading(true);
    try{
      const id=playerId||getOrCreatePlayerId();
      const [rows,mine]=await Promise.all([loadTrophyRankings(mode),loadMyTrophyRanking(mode,id)]);
      setTrophyRankingRows(rows);setMyTrophyRanking(mine);
    }catch{setTrophyRankingRows([]);setMyTrophyRanking(null);}
    finally{setTrophyRankingLoading(false);}
  };
  const changeRankingCategory=(category:'floor'|'trophy')=>{
    setRankingCategory(category);
    if(category==='floor') void loadRankingMode(rankingMode);
    else void loadTrophyRankingMode(trophyRankingMode);
  };


  useEffect(()=>{
    window.dispatchEvent(new CustomEvent('infinite-elevator-menu-bgm',{detail:{enabled:menu&&!gameover&&soundOn}}));
  },[menu,gameover,soundOn]);


  useEffect(()=>{
    if(menu||gameover){stopBgm();return;}
    let mood:BgmMood=`tier${Math.min(5,Math.max(1,room.tier))}` as BgmMood;
    const title=room.title||'';
    if(s.inHell||room.kind==='hell') mood='hell';
    else if(room.kind==='casino') mood='casino';
    else if(room.kind==='blackjack') mood='blackjack';
    else if(room.kind==='god') mood='god';
    else if(room.kind==='fortune'||room.kind==='altar'||room.kind==='ultimate'||room.kind==='warp'||room.kind==='fatedoor'||room.kind==='sealedvault'||room.kind==='heavenstairs') mood='mystic';
    else if(room.kind==='mining'||title.includes('採掘')) mood='mining';
    else if(room.kind==='shop'||room.kind==='vending'||title.includes('お店')||title.includes('ホームセンター')||title.includes('自動販売機')) mood='shop';
    else if(room.kind==='forge') mood='forge';
    else if(room.kind==='auction'||room.kind==='mystery'||title.includes('競売')||title.includes('オークション')) mood='auction';
    else if(room.kind==='itembox'||room.kind==='scratch'||room.kind==='pirate'||title.includes('宝箱')||title.includes('アイテム箱')||title.includes('小箱')) mood='treasure';
    else if(title.includes('ラッキー')||title.includes('運気')) mood='lucky';
    else if(title.includes('健康')||title.includes('無病')||title.includes('不老不死')||title.includes('湯')) mood='health';
    else if(room.kind==='doors'||room.kind==='crossroads'||title.includes('階段')||title.includes('扉')||title.includes('分岐')) mood='adventure';
    startBgm(mood,soundOn,room.tier);
    return ()=>{};
  },[room.tier,room.kind,room.title,s.inHell,soundOn,menu,gameover]);

  useEffect(()=>{
    if(room.kind!=='vending') setVendingFeedback(null);
  },[room.kind,room.title]);
  useEffect(()=>{
    if(!battleActive||battleRunFinished||!battleCode||!battleRole)return;
    const phase:'ready'|'dialogue'|'moving'|'event' = roomIntro?'dialogue':(moving||floorTransition.show||overlay.show)?'moving':eventAnimating?'event':'ready';
    const timer=window.setTimeout(()=>{void updateBattleProgress(battleCode,battleRole,{floor:s.floor,turns:s.turnsLeft,finished:false,roomTitle:room.title,phase});},320);
    return ()=>window.clearTimeout(timer);
  },[battleActive,battleRunFinished,battleCode,battleRole,s.floor,s.turnsLeft,room.title,roomIntro,moving,eventAnimating,floorTransition.show,overlay.show]);
  useEffect(()=>{
    if(!battleActive||!battleRunFinished||!battleRoom||!battleRole||battleResult.isOpen)return;
    const players=getBattlePlayers(battleRoom);
    const me=battleRoom.players?.[battleRole];
    const allFinished=players.length===battleRoom.maxPlayers&&players.every(({player})=>player.progress.finished===true);
    if(me?.progress.finished&&allFinished) battleResult.onOpen();
  },[battleActive,battleRunFinished,battleRoom,battleRole,battleResult.isOpen]);

  // 最終状態の送信が一時的な通信エラーで失敗しても、観戦待機で固まらないよう再送する。
  // Firestore 側で自分の finished=true を確認できた時点で interval は自動停止する。
  useEffect(()=>{
    if(!battleActive||!battleRunFinished||!battleCode||!battleRole||!battleRoom)return;
    const me=battleRoom.players?.[battleRole];
    if(me?.progress.finished)return;
    let sending=false;
    const resend=()=>{
      if(sending)return;
      sending=true;
      void updateBattleProgress(battleCode,battleRole,{floor:s.floor,turns:0,finished:true,roomTitle:room.title,phase:'finished'})
        .catch(()=>{})
        .finally(()=>{sending=false;});
    };
    resend();
    const timer=window.setInterval(resend,2500);
    return ()=>window.clearInterval(timer);
  },[battleActive,battleRunFinished,battleCode,battleRole,battleRoom,s.floor,room.title]);

  useEffect(()=>{
    if(!battleRunFinished||!battleRoom||!battleRole)return;
    const candidates=getBattlePlayers(battleRoom).filter(({role,player})=>role!==battleRole&&!player.progress.finished);
    if(candidates.length===0){setSpectateRole(null);return;}
    if(!spectateRole||!candidates.some(x=>x.role===spectateRole)) setSpectateRole(candidates[0].role);
  },[battleRunFinished,battleRoom,battleRole,spectateRole]);

  // プレイヤーの残り回数が尽きた後は、行動可能なCPUを3秒ごとに1部屋ずつ同時進行させる。
  useEffect(()=>{
    if(!rankedActive||!rankedPlayerFinished||rankedAwardedRef.current)return;
    const hasCpuTurns=rankedCpus.some(cpu=>cpu.turns>0);
    if(hasCpuTurns){
      const timer=window.setTimeout(()=>setRankedCpus(cpus=>cpus.map(cpu=>cpu.turns>0?advanceRankCpu(cpu):cpu)),3000);
      return ()=>window.clearTimeout(timer);
    }

    rankedAwardedRef.current=true;
    const order=rankMatchOrder({name:nickname||'あなた',floor:s.floor,luck:s.luck,money:s.money},rankedCpus);
    const place=order.findIndex(row=>row.isPlayer)+1;
    const delta=trophyDeltaForPlace(place);
    const beforeProfile=loadTrophyProfile();
    const afterProfile=applyTrophyDelta(delta);
    setTrophyProfile(afterProfile);
    setRankedMatchResult({place,delta,before:beforeProfile.trophies,after:afterProfile.trophies,order});
    playSfx(place===1?'jackpot':place===2?'success':'gameover',soundOn);
    rankedResult.onOpen();

    const id=playerId||getOrCreatePlayerId();
    const safeName=nickname||'名無しの登山者';
    if(firebaseReady){
      // 日付を跨いで週が変わっていた場合も、前週の最終値を総合へ確定する。
      if(beforeProfile.previousWeekKey&&typeof beforeProfile.previousWeekTrophies==='number'){
        void submitFinalizedWeekToAlltime(id,safeName,beforeProfile.previousWeekTrophies,beforeProfile.previousWeekKey).catch(()=>{});
      }
      void submitWeeklyTrophies(id,safeName,afterProfile.trophies,afterProfile.weekKey).catch(()=>{});
    }
  },[rankedActive,rankedPlayerFinished,rankedCpus,nickname,s.floor,s.luck,s.money,soundOn,playerId,rankedResult.isOpen]);

  const log=(m:string)=>setS(x=>({...x,logs:[m,...x.logs]}));
  const patch=(p:Partial<State>|((current:State)=>Partial<State>))=>setS(current=>({...current,...(typeof p==='function'?p(current):p)}));
  const addItem=(item:Item)=>{
    setS(x=>{
      const items=[...x.items];
      if(item.type==='gem'){
        const i=items.findIndex(v=>v.id===item.id);
        if(i>=0){items[i]={...items[i],count:(items[i].count||1)+(item.count||1)};return {...x,items,logs:[`「${item.name}」を入手！`,...x.logs]};}
      }
      if(items.length<3){items.push(item);return {...x,items,logs:[`アイテム「${item.name}」を入手！`,...x.logs]};}
      setPendingOverflow(item);
      return {...x,logs:[`持ち物がいっぱい！「${item.name}」を入手候補に追加`,...x.logs]};
    });
  };
  const resolveOverflow=(discardIndex:number)=>{
    const incoming=pendingOverflow;if(!incoming)return;
    const purchase=pendingOverflowPurchase;
    if(discardIndex===3){
      playSfx('discard',soundOn);
      log(purchase?`「${incoming.name}」の購入をキャンセルした`:`「${incoming.name}」を諦めた`);
      setPendingOverflow(null);setPendingOverflowPurchase(null);return;
    }
    setS(x=>{
      const items=[...x.items];const removed=items[discardIndex];items[discardIndex]=incoming;
      return {...x,money:purchase?x.money-purchase.cost:x.money,items,logs:[purchase?`「${removed.name}」を捨てて「${incoming.name}」を購入`:`「${removed.name}」を捨てて「${incoming.name}」を入手`,...x.logs]};
    });
    if(purchase?.source==='shop'&&purchase.shopIndex!==undefined)setShop(x=>x.map((v,j)=>j===purchase.shopIndex?{...v,sold:true}:v));
    if(purchase?.source==='legendshop')setLegendShopUsed(true);
    if(purchase?.source==='auction')show({...room,kind:undefined,result:`${incoming.name} 落札！`,resultType:'gold'});
    if(purchase?.source==='legendshop')show({...room,result:`${incoming.name} を購入！ この訪問での購入は完了。`,resultType:'gold'});
    playSfx(purchase?'buy':'item',soundOn);setPendingOverflow(null);setPendingOverflowPurchase(null);
  };
  const cancelOverflowPurchase=()=>{
    const incoming=pendingOverflow;if(!incoming||!pendingOverflowPurchase)return;
    playSfx('click',soundOn);log(`「${incoming.name}」の購入をキャンセルした`);setPendingOverflow(null);setPendingOverflowPurchase(null);
  };
  useEffect(()=>{
    if(pendingOverflow||itemGrantQueue.length===0)return;
    const [next,...rest]=itemGrantQueue;setItemGrantQueue(rest);addItem(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingOverflow,itemGrantQueue]);
  const show=(r:Room)=>{
    setRoom(r);
    setRareArrival(0);
    if(r.tier>=4){
      // 階数確定 → 到着後にレア部屋演出。文字ではなく光と波紋で見せる。
      fastTimeout(()=>{
        setRareArrival(r.tier);
        fastTimeout(()=>setRareArrival(0),r.tier===5?1700:1050);
      },280);
    }
  };

  const refreshScorePreview=async(score=s.floor)=>{
    const id=playerId||getOrCreatePlayerId();
    if(!playerId)setPlayerId(id);
    setScorePreview(null);
    setScorePreviewError('');
    if(!firebaseReady){setScorePreviewLoading(false);return;}
    setScorePreviewLoading(true);
    try{
      const preview=await previewRankings(score,id);
      setScorePreview(preview);
      setRankingStatus('online');
    }catch{
      setScorePreviewError('暫定順位を取得できませんでした。通信状態を確認して再取得してください。');
      setRankingStatus('error');
    }finally{
      setScorePreviewLoading(false);
    }
  };

  const resetRunCore=()=>{playSfx('start',soundOn);runRecordedRef.current=false;setNewPersonalBest(false);setScorePreview(null);setScorePreviewError('');setScorePreviewLoading(false);setRoomIntro(false);scoreSubmitLockRef.current=false;setScoreSubmitting(false);setScoreSaveMessage('');setScoreSubmitted(false);setForgeUsed(false);setAtmDeposit(0);setAtmInput('');setLegendShopUsed(false);setWarpAnimating(false);setWarpMessage('');setKeys({copper:0,silver:0,gold:0,diamond:0});setScratchRevealed([false,false,false]);setScratchPaid(false);setFateStage(0);setFateDone(false);setFateOpeningDoor(null);setFatePending({money:500,luck:0,turns:0,items:[],labels:['初期報酬 500円']});setPirateBoxes([]);setPiratePicks([]);setPirateRevealAll(false);setItemGrantQueue([]);setS({...baseState,highScore:s.highScore});setMenu(false);setGameover(false);setDoors(true);setRoom({tier:1,title:'エレベーターホール',desc:'エレベーターに乗りました。ボタンを押して上の階を目指しましょう！'});};
  const clearBattleSession=()=>{battleUnsubRef.current?.();battleUnsubRef.current=null;setBattleCode('');setBattleRole(null);setBattleRoom(null);setBattleActive(false);setBattleRunFinished(false);setSpectateRole(null);battleStartedRef.current=false;};
  const clearRankedSession=()=>{setRankedActive(false);setRankedCpus([]);setRankedPlayerFinished(false);setRankedMatchResult(null);rankedAwardedRef.current=false;};
  const start=()=>{setMasterActive(false);masterRoomQueueRef.current=[];clearBattleSession();clearRankedSession();resetRunCore();};
  const startBattleRun=()=>{setMasterActive(false);masterRoomQueueRef.current=[];clearRankedSession();setBattleActive(true);setBattleRunFinished(false);resetRunCore();};
  const startRankedRun=()=>{
    computerBattleMenu.onClose();
    setMasterActive(false);masterRoomQueueRef.current=[];clearBattleSession();
    setRankedActive(true);setRankedCpus(createRankCpuPlayers());setRankedPlayerFinished(false);setRankedMatchResult(null);rankedAwardedRef.current=false;
    resetRunCore();
  };
  const watchBattle=(code:string,role:BattleRole)=>{
    battleUnsubRef.current?.();
    battleUnsubRef.current=subscribeBattleRoom(code,room=>{
      setBattleRoom(room);
      if(!room){setBattleError('対戦ルームとの接続が切れました。');return;}
      if(room.status==='playing'&&!battleStartedRef.current){battleStartedRef.current=true;setBattleRole(role);setBattleCode(code);battleLobby.onClose();startBattleRun();}
    });
  };
  const createBattle=async()=>{
    if(!firebaseReady){setBattleError('オンライン対戦にはFirebase設定が必要です。');return;}
    setBattleBusy(true);setBattleError('');
    try{const result=await createBattleRoom(nickname,battleMaxPlayers);setBattleCode(result.code);setBattleRole(result.role);watchBattle(result.code,result.role);}
    catch(e){setBattleError(e instanceof Error?e.message:'ルーム作成に失敗しました');}
    finally{setBattleBusy(false);}
  };
  const joinBattle=async()=>{
    if(!firebaseReady){setBattleError('オンライン対戦にはFirebase設定が必要です。');return;}
    setBattleBusy(true);setBattleError('');
    try{const result=await joinBattleRoom(battleCodeInput,nickname);setBattleCode(result.code);setBattleRole(result.role);watchBattle(result.code,result.role);}
    catch(e){setBattleError(e instanceof Error?e.message:'ルーム参加に失敗しました');}
    finally{setBattleBusy(false);}
  };
  const end=()=>{
    playSfx('gameover',soundOn);
    scoreSubmitLockRef.current=false;setScoreSubmitting(false);setScoreSaveMessage('');setScoreSubmitted(false);setAtmDeposit(0);setAtmInput('');
    if(masterActive){setNewPersonalBest(false);setScorePreview(null);setScorePreviewError('');setScorePreviewLoading(false);setGameover(true);return;}
    const beatHighScore=s.floor>s.highScore;
    setNewPersonalBest(beatHighScore);
    if(!runRecordedRef.current){
      runRecordedRef.current=true;
      const history=appendPlayHistory({score:s.floor,floor:s.floor,money:s.money,luck:s.luck});
      setLocalPlayHistory(history);
      setLocalHistorySummary(getLocalHistorySummary(history));
    }
    setS(x=>{const h=Math.max(x.highScore,x.floor); localStorage.setItem('infinite_elevator_highscore',String(h)); return {...x,highScore:h};});
    if(rankedActive){
      // プレイヤー終了後、CPUに残り回数があれば3秒/1部屋で最後まで進ませる。
      setRankedPlayerFinished(true);
      return;
    }
    if(battleActive&&battleCode&&battleRole){
      // 最終操作確定後に完了を送信。結果画面は両者の完了を受信してから開く。
      setBattleRunFinished(true);
      void updateBattleProgress(battleCode,battleRole,{floor:s.floor,turns:0,finished:true,roomTitle:room.title,phase:'finished'}).catch(()=>{});
      return;
    }
    setGameover(true);
    if(firebaseReady){void refreshScorePreview(s.floor);}
    else if(beatHighScore){void refreshScorePreview(s.floor);}
    else{setScorePreview(null);setScorePreviewError('');setScorePreviewLoading(false);}
  };

  // 到着Tierと強制イベント条件から、実際に発生する部屋を決める。
  const triggerRoom=(forcedTier?:number,forcedType?:string)=>{
    if(masterActive&&!forcedTier&&!forcedType&&masterRoomQueueRef.current.length){
      const title=masterRoomQueueRef.current.shift()!;
      if(title==='地獄の門'){setHellDie(null);setHellRolling(false);setHellMessage('「5」が出れば生還。1回振るごとに残り回数を1消費する。');setS(x=>({...x,inHell:true}));show({tier:5,title:'地獄の門',desc:'開発者モードで予約された地獄の門。',result:'脱出条件：5を出せ / 成功率 1/6',resultType:'danger',kind:'hell'});return;}
      const target=stageRouteMap[title]; if(target){executeRoom(target.tier,target.type);return;}
    }
    let tier=forcedTier||1; if(!forcedTier){const r=Math.random()*100;tier=r<40?1:r<70?2:r<90?3:r<99?4:5;} if(forcedShop){tier=1;forcedType='SHOP_SMALL';setForcedShop(false);}
    executeRoom(tier,forcedType);
  };
  // Tier別イベントを初期化し、Room状態へ反映するイベントルーター。
  const executeRoom=(tier:number,type?:string)=>{
    setRoomIntro(true);
    if(tier>=4){setS(current=>{const had=current.items.some(i=>i.id==='immortal_mag');return had?{...current,items:current.items.filter(i=>i.id!=='immortal_mag'),logs:['不老の八尺瓊勾玉が役目を終えて消失した。',...current.logs]}:current;});}
    if(tier===1){const t=type||pick(['NOTHING','CAT_ROOM','DOG_ROOM','VENDING','LUCKY','MONEY_FOUND','STAIRS_SHORT','DOORS','SHOP_SMALL','FORTUNE','BOXES','BARTER','CROSSROADS']);
      if(t==='NOTHING')show({tier,title:'何も無い部屋',desc:'静けさが漂っている。',result:'変化なし'});
      else if(t==='CAT_ROOM')show({tier,title:'猫の部屋',desc:'のんびりした猫がこちらを見つめている。',result:'猫と遊んでみよう',kind:'pet',payload:{animal:'cat'}});
      else if(t==='DOG_ROOM')show({tier,title:'犬の部屋',desc:'しっぽを振った犬が嬉しそうに近づいてくる。',result:'犬と遊んでみよう',kind:'pet',payload:{animal:'dog'}});
      else if(t==='VENDING'){setVendingCount(0);const sale=Math.random()<.20;show({tier,title:'自動販売機',desc:'購入すると1/2の確率で+1される。購入は1回の訪問につき最大5回まで。',result:sale?'🎉 20%抽選当選！ 半額セール開催中':'自販機発見',resultType:sale?'gold':'neutral',kind:'vending',payload:{sale}});}
      else if(t==='LUCKY'){const g=ri(1,3);show({tier,title:'ラッキー部屋',desc:'淡い緑の光がゆっくりと集まってくる。',result:'祝福の光に触れてみよう',kind:'reveal',payload:{type:'luck',amount:g}});}
            else if(t==='MONEY_FOUND'){const g=ri(100,500);show({tier,title:'落ちている財布',desc:'静かな通路の床に、ひとつだけ財布が落ちている。',result:'中身を確認してみよう',kind:'reveal',payload:{type:'wallet',amount:g}});}
      else if(t==='STAIRS_SHORT'){const g=ri(5,20);show({tier,title:'短い階段',desc:'上へ続く短い階段が現れた。',result:'階段を登ってみよう',kind:'reveal',payload:{type:'stairs',amount:g}});}
      else if(t==='DOORS'){const all:DoorChoice[]=['creaky','silver','gold','luck','health','money'];setDoorChoices([...all].sort(()=>Math.random()-.5).slice(0,2));show({tier,title:'2つの扉',desc:'6種類の扉の中から、今回は2つだけが現れた。どちらか1つを選ぼう。',result:'2つの扉が出現',kind:'doors'});}
      else if(t==='SHOP_SMALL')setupShop(tier,1);
            else if(t==='FORTUNE'){setFortuneReading(false);show({tier,title:'占い師の小部屋',desc:'ミステリアスな占い師が水晶越しにあなたの運勢を見つめている。',result:'占ってもらおう',kind:'fortune'});}
      else if(t==='BOXES'){
        const rewards=[
          {type:'money' as const,value:ri(300,699)},
          {type:'luck' as const,value:ri(2,4)},
          {type:'turn' as const,value:1}
        ].sort(()=>Math.random()-.5);
        setBoxRewards(rewards);setBoxSelected(null);setBoxRevealAll(false);
        show({tier,title:'3つの怪しい小箱',desc:'直感でどれか1つを選ぼう。選んだ後、残りの箱の中身も公開される。',result:'箱を選択',kind:'boxes'});
      }
      else if(t==='BARTER'){setBarterCount(0);show({tier,title:'怪しい物々交換所',desc:'行商人がいる。交換できるのは1回の訪問につき最大5回まで。',result:'交換選択',kind:'barter'});}
      else show({tier,title:'運命の分岐路',desc:'道が2つに分かれている。',result:'道を選択',kind:'crossroads'});
    } else if(tier===2){const t=type||pick(['SUPER_LUCKY','HEALTH','TREASURE','RUBY_MINING','STAIRS_MED','SHOP_MED','BLACKJACK','FORGE','ALTAR','MYSTERY_AUCTION','ATM','SCRATCH']);
      if(t==='SUPER_LUCKY'){const g=ri(3,5);show({tier,title:'超ラッキー部屋',desc:'鮮やかな緑の光と粒子がゆっくり舞い始める。',result:'強い祝福を受け取ろう',kind:'reveal',payload:{type:'luck',amount:g}});}
      else if(t==='HEALTH'){const g=1;show({tier,title:'健康の湯',desc:'あたたかな湯気が疲れをゆっくりほどいていく。',result:'温泉に浸かって休もう',kind:'reveal',payload:{type:'health',amount:g}});}
      else if(t==='TREASURE'){show({tier,title:'小さな宝箱',desc:'少し上質な古い宝箱が置かれている。',result:'宝箱を開けてみよう',kind:'reveal',payload:{type:'treasure'}});}
      else if(t==='RUBY_MINING')setupMining(tier,'ruby');
      else if(t==='STAIRS_MED'){const g=ri(20,50);show({tier,title:'長い階段',desc:'高い場所へ続く長い螺旋階段が現れた。',result:'息を整えて登ろう',kind:'reveal',payload:{type:'stairs',amount:g}});}
      else if(t==='SHOP_MED')setupShop(tier,3); else if(t==='BLACKJACK'){setBj({playing:false,bet:100,p:[],d:[]});setBjPhase('');show({tier,title:'地下カードサロン',desc:'ブラックジャックでディーラーと勝負。21を超えず、より21に近い方が勝ち。',result:'勝負可能',kind:'blackjack'});}
      else if(t==='FORGE'){setForgeUsed(false);show({tier,title:'魔法鍛冶屋',desc:'鏡や指輪の性能を無料で1つだけ強化(+1~3)します！',result:'この部屋では1回だけ強化できます',kind:'forge'});}
      else if(t==='ALTAR')show({tier,title:'運試しの祭壇',desc:'何を捧げるかで加護が変わる。',result:'祭壇に祈る',kind:'altar'});
      else if(t==='SCRATCH'){const r=Math.random();setScratchOutcome(r<.25?'ruby':r<.40?'emerald':r<.45?'diamond':'miss');setScratchRevealed([false,false,false]);setScratchPaid(false);show({tier,title:'スクラッチくじの部屋',desc:'3つのスクラッチを全部削ろう。同じ宝石が3つ揃えば賞金獲得。',result:'ルビー25% / エメラルド15% / ダイヤ5%',kind:'scratch'});}
      else if(t==='ATM'){setAtmInput('');show({tier,title:'ATM',desc:atmDeposit>0?'以前預けたお金が満期になっている。5倍で受け取れる。':'好きな金額を預けられる特殊ATM。次にこの部屋へ来ると5倍になって戻ってくる。',result:atmDeposit>0?`預金 ${atmDeposit}円 → 受取 ${atmDeposit*5}円`:'預け入れ可能',resultType:atmDeposit>0?'gold':'neutral',kind:'atm'});}
      else show({tier,title:'ミステリーオークション',desc:'謎の袋が出品中。(1000円)',result:'競り参加',kind:'mystery'});
    } else if(tier===3){const t=type||pick(['CASINO','SUPER_LUCKY_3','HEALTH_2','EMERALD_MINING','STAIRS_LONG','SHOP_LARGE','ITEM_BOX','SURVEY_GIRL','FATE_DOOR','PIRATE_ROOM']);
      if(t==='FATE_DOOR'){setFateStage(0);setFateDone(false);setFateOpeningDoor(null);setFatePending({money:500,luck:0,turns:0,items:[],labels:['初期報酬 500円']});show({tier,title:'運命の扉',desc:'当たりの扉を選べば次へ進み報酬が累積。外れれば全て失う。好きな時に持ち帰れる。',result:'初期報酬 500円 / 挑戦するか持ち帰るか',kind:'fatedoor'});}
      else if(t==='PIRATE_ROOM'){const makeBox=():KeyKind|null=>{const r=Math.random();return r<.001?'diamond':r<.011?'gold':r<.061?'silver':r<.261?'copper':null};setPirateBoxes(Array.from({length:10},makeBox));setPiratePicks([]);setPirateRevealAll(false);show({tier,title:'海賊船の隠し部屋',desc:'10個の箱から3つ選ぼう。選択後、残りの箱の中身も公開される。',result:'3つの箱を選ぼう',kind:'pirate'});}
      else if(t==='CASINO'){setCasinoSpinsLeft(10);setSlotMessage('');setSlot(['❔','❔','❔']);setSlotWin(false);show({tier,title:'スロットカジノ',desc:'1回の訪問につき最大10スピン。現金配当に加えて、🍀揃いで運気、⚡揃いで残り回数を獲得。ベット上限500円。',result:'残り10回',kind:'casino'});} 
      else if(t==='SUPER_LUCKY_3'){const g=ri(6,8);show({tier,title:'極ラッキー部屋',desc:'強い祝福の光が部屋いっぱいに満ちていく。',result:'祝福を受け取ろう',kind:'reveal',payload:{type:'luck',amount:g}});}
      else if(t==='HEALTH_2'){const g=ri(2,3);show({tier,title:'無病の湯',desc:'青白い湯気と滝音が身体を包み込む。',result:'静かに湯へ浸かろう',kind:'reveal',payload:{type:'health',amount:g}});}
      else if(t==='EMERALD_MINING')setupMining(tier,'emerald');
      else if(t==='STAIRS_LONG'){const g=ri(50,100);show({tier,title:'果てしなく長い階段',desc:'終点の見えない巨大階段が闇の彼方まで続いている。',result:'覚悟を決めて登ろう',kind:'reveal',payload:{type:'stairs',amount:g}});}
      else if(t==='SHOP_LARGE')setupShop(tier,5); else if(t==='SURVEY_GIRL'){const surveys=[
        {q:'休日は外出派？おうち派？',a:'外出派',b:'おうち派',wa:48,wb:52,genre:'日常'},
        {q:'朝型？夜型？',a:'朝型',b:'夜型',wa:30,wb:70,genre:'生活'},
        {q:'犬派？猫派？',a:'犬派',b:'猫派',wa:52,wb:48,genre:'日常'},
        {q:'告白するなら直接？メッセージ？',a:'直接',b:'メッセージ',wa:68,wb:32,genre:'恋愛'},
        {q:'デートなら屋外？屋内？',a:'屋外',b:'屋内',wa:55,wb:45,genre:'恋愛'},
        {q:'旅行なら海？山？',a:'海',b:'山',wa:62,wb:38,genre:'旅行'},
        {q:'連絡は電話派？メッセージ派？',a:'電話',b:'メッセージ',wa:24,wb:76,genre:'日常'},
        {q:'好きな人には自分から行く？待つ？',a:'自分から行く',b:'待つ',wa:58,wb:42,genre:'恋愛'}
      ];const survey=pick(surveys);show({tier,title:'アンケート娘',desc:`女の子「ねえねえ、${survey.genre}系のアンケートに答えてくれない？」`,result:`女の子「${survey.q}」`,kind:'survey',payload:survey});}
      else {setItemBoxOpening(false);show({tier,title:'不思議なアイテム箱',desc:'豪華な箱が置いてある。中には特別なアイテムが入っていそうだ。',result:'箱を開けてみよう',kind:'itembox'});}
    } else if(tier===4){const t=type||pick(['WARP','AUCTION','DIAMOND_MINING','HEALTH_3','SEALED_VAULT']);
      if(t==='SEALED_VAULT')show({tier,title:'封印された宝物庫',desc:'持っている鍵の数だけ対応する宝箱を開けられる。鍵は開封時に1本消費する。',result:'鍵を選んで宝箱を開けよう',kind:'sealedvault'});
      else if(t==='WARP')show({tier,title:'ワープホール',desc:'使うとランダムに移動できる。',result:'ワープホール現る',kind:'warp'});
      else if(t==='AUCTION')show({tier,title:'神々の競売場',desc:'最高峰の品がオークションに出品。',result:'競売開催中',kind:'auction'});
      else if(t==='DIAMOND_MINING')setupMining(tier,'diamond');
      else if(t==='HEALTH_3'){const g=ri(4,5);show({tier,title:'不老不死の湯',desc:'天空の湯から神秘的な光が立ち上っている。',result:'伝説の湯へ浸かろう',kind:'reveal',payload:{type:'health',amount:g}});}
    } else {const t=type||pick(['ULTIMATE_ROULETTE','GOD','LEGEND_SHOP','HEAVEN_STAIRS']);if(t==='HEAVEN_STAIRS')show({tier,title:'天国への階段',desc:'天空へ続く階段。現在階数が1.1〜1.5倍になるまで一気に上昇する。',result:'天国への階段を登る',kind:'heavenstairs'}); else if(t==='ULTIMATE_ROULETTE'){setUltimateMessage('???');setUltimateSpinning(false);show({tier,title:'究極のルーレット',desc:'神々の気まぐれ。究極ルーレットに挑むか？',result:'運命のルーレット',kind:'ultimate'});} else if(t==='LEGEND_SHOP'){setLegendShopUsed(false);show({tier,title:'伝説の神器商店',desc:'この場所でしか手に入らない三種の神器を扱う。購入できるのは1回の訪問につき1つだけ。',result:'神器を1つ選べ',resultType:'gold',kind:'legendshop'});} else show({tier,title:'神の故郷',desc:'好きなアイテムを一つ選べます。',result:'神の加護',kind:'god'});}
  };


  const playCatalogStage=(stage:StageCatalogEntry)=>{
    playSfx('start',soundOn);
    runRecordedRef.current=false;
    setScorePreview(null);setScorePreviewError('');setScorePreviewLoading(false);
    scoreSubmitLockRef.current=false;
    setScoreSubmitting(false);
    setScoreSaveMessage('');
    setScoreSubmitted(false);
    setForgeUsed(false);
    setGameover(false);
    setMenu(false);
    setDoors(true);
    setMoving(false);
    setAtmDeposit(0);setAtmInput('');setLegendShopUsed(false);setWarpAnimating(false);setWarpMessage('');
    setKeys({copper:0,silver:0,gold:0,diamond:0});setScratchRevealed([false,false,false]);setScratchPaid(false);setFateStage(0);setFateDone(false);setFateOpeningDoor(null);setFatePending({money:500,luck:0,turns:0,items:[],labels:['初期報酬 500円']});setPirateBoxes([]);setPiratePicks([]);setPirateRevealAll(false);setItemGrantQueue([]);
    setS({...baseState,highScore:s.highScore});
    guide.onClose();
    stagePreview.onClose();
    setPreviewStage(null);

    if(stage.title==='エレベーターホール'){
      show({tier:1,title:'エレベーターホール',desc:'エレベーターに乗りました。ボタンを押して上の階を目指しましょう！'});
      return;
    }
    if(stage.title==='地獄の門'){
      setHellDie(null);
      setHellRolling(false);
      setHellMessage('「5」が出れば生還。1回振るごとに残り回数を1消費する。');
      setS(x=>({...x,inHell:true}));
      setRoomIntro(true);
      show({tier:5,title:'地獄の門',desc:'ここは脱出判定専用フロア。サイコロで「5」を出した瞬間だけ地上へ戻れる。失敗しても挑戦は続くが、振るたびに残り回数を1消費する。',result:'脱出条件：5を出せ / 成功率 1/6',resultType:'danger',kind:'hell'});
      return;
    }

    const target=stageRouteMap[stage.title];
    if(target) executeRoom(target.tier,target.type);
  };

  const startMasterRun=(stageOverride?:string)=>{
    clearBattleSession(); clearRankedSession(); playSfx('start',soundOn); runRecordedRef.current=true;
    setNewPersonalBest(false);setScorePreview(null);setScorePreviewError('');setScorePreviewLoading(false);scoreSubmitLockRef.current=false;setScoreSubmitting(false);setScoreSaveMessage('');setScoreSubmitted(false);
    setForgeUsed(false);setAtmDeposit(0);setAtmInput('');setLegendShopUsed(false);setWarpAnimating(false);setWarpMessage('');setKeys({copper:0,silver:0,gold:0,diamond:0});setScratchRevealed([false,false,false]);setScratchPaid(false);setFateStage(0);setFateDone(false);setFateOpeningDoor(null);setFatePending({money:500,luck:0,turns:0,items:[],labels:['初期報酬 500円']});setPirateBoxes([]);setPiratePicks([]);setPirateRevealAll(false);setItemGrantQueue([]);
    const items=masterItems.filter(x=>x.id).map(x=>makeItem(x.id as ItemId,Math.max(1,Math.floor(x.n||1))));
    setS({...baseState,highScore:s.highScore,floor:Math.max(1,Math.floor(masterFloor||1)),luck:Math.floor(masterLuck||0),turnsLeft:Math.max(0,Math.floor(masterTurns||0)),money:Math.max(0,Math.floor(masterMoney||0)),items});
    const startStage=stageOverride||masterStartStage;
    setMasterActive(true);masterRoomQueueRef.current=[...masterNextStages];setMenu(false);setGameover(false);setDoors(true);setMoving(false);setRoomIntro(false);
    window.setTimeout(()=>{
      if(startStage==='エレベーターホール'){show({tier:1,title:'エレベーターホール',desc:'開発者モードで開始。ボタンを押して進もう。'});return;}
      if(startStage==='地獄の門'){setHellDie(null);setHellRolling(false);setHellMessage('「5」が出れば生還。1回振るごとに残り回数を1消費する。');setS(x=>({...x,inHell:true}));show({tier:5,title:'地獄の門',desc:'開発者モードで直接移動。',result:'脱出条件：5を出せ / 成功率 1/6',resultType:'danger',kind:'hell'});return;}
      const target=stageRouteMap[startStage];if(target)executeRoom(target.tier,target.type);
    },0);
  };

  const goDeveloperStage=(stage:StageCatalogEntry)=>{
    guide.onClose();stagePreview.onClose();setPreviewStage(null);
    if(masterActive&&!menu){
      playSfx('door',soundOn);setRoomIntro(false);setDoors(true);setMoving(false);
      if(stage.title==='エレベーターホール'){show({tier:1,title:'エレベーターホール',desc:'開発者モードで直接移動。'});return;}
      if(stage.title==='地獄の門'){setHellDie(null);setHellRolling(false);setHellMessage('「5」が出れば生還。1回振るごとに残り回数を1消費する。');setS(x=>({...x,inHell:true}));show({tier:5,title:'地獄の門',desc:'開発者モードで直接移動。',result:'脱出条件：5を出せ / 成功率 1/6',resultType:'danger',kind:'hell'});return;}
      const target=stageRouteMap[stage.title];if(target)executeRoom(target.tier,target.type);
      return;
    }
    startMasterRun(stage.title);
  };

  const setupMining=(tier:number,gem:ItemId)=>{setRocks(Array.from({length:5},()=>{const ok=Math.random()<.60;const r=Math.random();const count=ok?(r<.55?1:r<.85?2:3):0;return {gem:ok?gem:null,count,open:false}}));setPicks(2);show({tier,title:gem==='ruby'?'ルビーの採掘場':gem==='emerald'?'エメラルドの採掘場':'ダイヤモンドの採掘場',desc:'5つの岩から2つ壊そう！宝石が出るかも！',result:'岩を選んで壊そう',kind:'mining'});};
  const setupShop=(tier:number,count:number)=>{const pool=[makeItem('mirror',ri(3,5)),makeItem('ring',ri(6,9)),makeItem('shop_ticket'),makeItem('sage_gem'),makeItem('party_set'),makeItem('money_tree',ri(1,2)),makeItem('blessing_charm',ri(1,2))].sort(()=>Math.random()-.5).slice(0,count).map(item=>({item,sold:false}));setShop(pool);show({tier,title:count===1?'小さなお店':count===3?'大きなお店':'ホームセンター',desc:'アイテムの購入が可能。※宝石のみ売却できます。',result:'ショップ営業中',kind:'shop'});};

  // プレイヤーがボタンを押したタイミングで、行動可能なCPUもそれぞれ1部屋進む。
  const stepRankedCpus=()=>{if(rankedActive&&!rankedPlayerFinished)setRankedCpus(cpus=>cpus.map(cpu=>cpu.turns>0?advanceRankCpu(cpu):cpu));};

  const press=()=>{if(moving||gameover||s.turnsLeft<=0||s.inHell)return; stepRankedCpus(); playSfx('door',soundOn); setMoving(true);setDoors(false); let x={...s,items:[...s.items],ringBuff:{...s.ringBuff}}; const protectedByMag=x.items.some(i=>i.id==='immortal_mag'); if(!protectedByMag)x.turnsLeft--; x.items.forEach(i=>{if(i.id==='money_tree')x.money+=100*(i.paramN||1); if(i.id==='blessing_charm')x.luck+=(i.paramN||1); if(i.id==='kusanagi'){x.luck+=2;x.money+=200;}});
    // 幸運の指輪は「次の3回の上昇計算」まで有効。3回目の計算後に解除する。
    const effectiveLuck=x.luck;
    let targetTier=1;
    if(x.partySet){const r=Math.random();targetTier=r<.72?2:r<.92?3:4;}
    else {const r=Math.random();targetTier=r<.65?1:r<.90?2:r<.98?3:4;}
    x.partySet=false;
    const base=targetTier===1?ri(1,12):targetTier===2?ri(10,30):targetTier===3?ri(25,50):ri(40,80);
    const luckMult=targetTier===1?ri(2,3):targetTier===2?ri(3,4):targetTier===3?ri(4,5):ri(5,7);
    const rawSteps=base+Math.max(0,effectiveLuck)*luckMult;
    if(x.ringBuff.active){
      const nextTurns=x.ringBuff.turns-1;
      if(nextTurns<=0){x.luck-=x.ringBuff.amount;x.ringBuff={active:false,turns:0,amount:0};}
      else x.ringBuff={...x.ringBuff,turns:nextTurns};
    }
    const mirrorMul=x.mirrorMultiplier;
    const yataMul=x.items.some(i=>i.id==='yata_mirror')?2:1;
    const finalSteps=rawSteps*mirrorMul*yataMul;
    x.mirrorMultiplier=1;
    setS(x);
    fastTimeout(()=>{
      setOverlay({show:true,tier:1,steps:ri(1,12),detail:'',locked:false});
      let currentTier=1; let ticks=0;
      const timer=fastInterval(()=>{ticks++;playSfx(currentTier>=3?'slotStop':'click',soundOn);setOverlay(o=>({...o,steps:ri(1,Math.max(12,Math.min(99,rawSteps))),detail:''}));},85);
      const promote=(tier:number,msg:string)=>{currentTier=tier;playSfx((`move${Math.min(4,tier)}` as SfxName),soundOn);setOverlay(o=>({...o,tier,detail:msg}));};
      if(targetTier>=2)fastTimeout(()=>promote(2,''),700);
      if(targetTier>=3){fastTimeout(()=>setOverlay(o=>({...o,detail:''})),1250);fastTimeout(()=>promote(3,''),1750);}
      if(targetTier>=4){fastTimeout(()=>setOverlay(o=>({...o,detail:''})),2550);fastTimeout(()=>{promote(4,'');playSfx('jackpot',soundOn);},3200);}
      const revealDelay=targetTier===1?1380:targetTier===2?2100:targetTier===3?3000:4500;
      fastTimeout(()=>{
        window.clearInterval(timer);
        setOverlay({show:true,tier:targetTier,steps:rawSteps,detail:'',locked:true});
        // 最終的な上昇階数を見せたあと、移動演出を挟んで到着階を明示する。
        const finish=()=>{
          const destinationFloor=x.floor+finalSteps;
          setOverlay({
            show:true,
            tier:targetTier,
            steps:finalSteps,
            detail:`${finalSteps}階上に進む`,
            locked:true,
          });
          playSfx(targetTier>=3?'jackpot':'arrive',soundOn);
          fastTimeout(()=>{
            setOverlay(o=>({...o,show:false}));
            setFloorTransition({show:true,from:x.floor,to:destinationFloor,label:'エレベーター上昇',phase:'上昇中…'});
            setS(y=>({...y,floor:y.floor+finalSteps,logs:[`【ボタン】演出${targetTier}! +${finalSteps}階登った！`,...y.logs]}));
            fastTimeout(()=>{
              setFloorTransition({show:true,from:x.floor,to:destinationFloor,label:'エレベーター上昇',phase:`${destinationFloor}階に到着`});
              playSfx('arrive',soundOn);
            },420);
            fastTimeout(()=>{
              setFloorTransition(t=>({...t,show:false}));
              triggerRoom();
              setDoors(true);
              setMoving(false);
            },900);
          },900);
        };
        if(mirrorMul>1){fastTimeout(()=>{playSfx('item',soundOn);setOverlay({show:true,tier:targetTier,steps:finalSteps,detail:'乱反射の鏡が発動！',locked:true});fastTimeout(finish,900);},650);}else{fastTimeout(finish,650);}
      },revealDelay);
    },420);
  };

  const useItem=(i:number)=>{const item=s.items[i]; if(!item||item.type!=='consumable')return; if(item.id==='mirror'&&s.mirrorMultiplier>1){playSfx('fail',soundOn);log(`乱反射の鏡★${s.mirrorMultiplier}が発動待機中のため、別の鏡は使えない`);return;} playSfx('item',soundOn); const ns={...s,items:[...s.items]}; if(item.id==='mirror')ns.mirrorMultiplier=item.paramN||1; else if(item.id==='ring'){if(ns.ringBuff.active)return;ns.ringBuff={active:true,turns:3,amount:item.paramN||1};ns.luck+=item.paramN||1;} else if(item.id==='sage_gem')ns.luck+=ns.floor%10; else if(item.id==='party_set')ns.partySet=true; else if(item.id==='shop_ticket')setForcedShop(true); ns.items.splice(i,1);setS(ns);setSelected(null);};
  const sellGem=(i:number)=>{const item=s.items[i];if(item?.type!=='gem'||(room.kind!=='shop'&&room.kind!=='legendshop')){playSfx('fail',soundOn);return;}playSfx('sell',soundOn);const total=item.price*(item.count||1);setS(x=>({...x,money:x.money+total,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};
  const discard=(i:number)=>{playSfx('discard',soundOn);setS(x=>({...x,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};

  const submitScore=async()=>{
    // 開発者モードのテストプレイはランキング/Firebaseへ絶対に書き込まない。
    if(masterActive){setScoreSaveMessage('開発者モードのためランキング保存は行いません。');return;}
    if(scoreSubmitted||scoreSubmitLockRef.current)return;
    const id=playerId||getOrCreatePlayerId();
    if(!playerId)setPlayerId(id);
    const hasEligiblePreview=!firebaseReady||Boolean(scorePreview&&(scorePreview.monthly.eligible||scorePreview.alltime.eligible));
    if(firebaseReady&&!hasEligiblePreview&&!scorePreviewError){
      setScoreSaveMessage('今回は月間・総合とも自己ベスト更新対象ではありません。');
      return;
    }
    scoreSubmitLockRef.current=true;
    setScoreSubmitting(true);
    setScoreSaveMessage('ランキングへ保存中…');
    const rawName=nickname.trim()||'名無しの登山者';
    const name=Array.from(rawName).slice(0,12).join('');
    if(name!==nickname.trim())setNickname(name);
    localStorage.setItem('infinite_elevator_nickname',name);
    try{
      if(firebaseReady){
        const result=await submitRankings({name,score:s.floor,floor:s.floor,money:s.money,luck:s.luck},id);
        setRankingViews({monthly:{rows:[],mine:null,loaded:false,cached:false},alltime:{rows:[],mine:null,loaded:false,cached:false}});
        const failed=[result.monthly.reason==='save_failed'?'月間':'',result.alltime.reason==='save_failed'?'総合':''].filter(Boolean);
        const updated=[result.monthly.accepted?'月間':'',result.alltime.accepted?'総合':''].filter(Boolean);
        if(failed.length){
          setRankingStatus('error');
          setScoreSaveMessage(`${failed.join('・')}ランキングの保存に失敗しました。保存済みの側は二重登録されません。もう一度お試しください。`);
          playSfx('fail',soundOn);
          if(updated.length)log(`${updated.join('・')}ランキングは保存済みです。${failed.join('・')}のみ再試行できます`);
          return;
        }
        setScoreSubmitted(true);
        setScoreSaveMessage(updated.length?`${updated.join('・')}ランキングへ保存しました！`:'自己ベスト未更新のため、ランキングへの書き込みはありませんでした。');
        if(updated.length){
          playSfx('success',soundOn);
          log(`${updated.join('・')}ランキングの自己ベストを更新しました`);
        }else{
          playSfx('click',soundOn);
          log('月間・総合とも自己ベスト未更新、またはTop1000圏外でした');
        }
        return;
      }
      const scoreRow={id,name,score:s.floor,floor:s.floor,money:s.money,luck:s.luck};
      const updateLocal=(key:string)=>{
        const local=JSON.parse(localStorage.getItem(key)||'[]');
        const withoutSelf=Array.isArray(local)?local.filter((row:any)=>row?.id!==id):[];
        const previous=Array.isArray(local)?local.find((row:any)=>row?.id===id):null;
        const best=previous&&Number(previous.score||0)>=s.floor?previous:scoreRow;
        const all=[...withoutSelf,best].sort((a:any,b:any)=>Number(b.score||0)-Number(a.score||0)).slice(0,1000);
        localStorage.setItem(key,JSON.stringify(all));
      };
      updateLocal('infinite_elevator_local_rankings');
      updateLocal(`infinite_elevator_local_rankings_monthly_${getCurrentMonthKey()}`);
      setRankingViews({monthly:{rows:[],mine:null,loaded:false,cached:false},alltime:{rows:[],mine:null,loaded:false,cached:false}});
      setScoreSubmitted(true);
      setScoreSaveMessage('ローカルランキングへ保存しました。');
      playSfx('success',soundOn);
    }catch{
      setRankingStatus('error');
      setScoreSaveMessage('通信エラーで保存できませんでした。接続を確認して、もう一度「登録」を押してください。');
      playSfx('fail',soundOn);
    }finally{
      scoreSubmitLockRef.current=false;
      setScoreSubmitting(false);
    }
  };

  const card=()=>Math.min(10,ri(1,10)); const hand=(a:number[])=>a.reduce((p,c)=>p+c,0);
  const moveByEvent=(delta:number,label:string)=>{
    if(eventAnimating)return;
    const from=s.floor;
    const to=Math.max(1,from+delta);
    setEventAnimating(true);
    setDoors(false);
    setFloorTransition({show:true,from,to,label,phase:'移動開始'});
    playSfx(delta>=0?'warpUp':'warpDown',soundOn);
    fastTimeout(()=>setFloorTransition({show:true,from,to,label,phase:'階層を移動中…'}),420);
    fastTimeout(()=>{
      patch(current=>({floor:Math.max(1,current.floor+delta)}));
      setFloorTransition({show:true,from,to,label,phase:`${to}階に到着`});
      playSfx('arrive',soundOn);
    },900);
    fastTimeout(()=>{
      setFloorTransition(x=>({...x,show:false}));
      triggerRoom();
      setDoors(true);
      setEventAnimating(false);
    },1500);
  };

  const warp=(min:number,max:number,label:string)=>{if(warpAnimating)return;setWarpAnimating(true);setWarpMessage(`${label}：空間座標を固定中…`);playSfx('roulette',soundOn);let tick=0;const timer=fastInterval(()=>{const fake=ri(min,max);setWarpMessage(`🌀 座標跳躍中… ${fake>=0?'+':''}${fake}階？`);playSfx(tick%3===0?'warpUp':'slotStop',soundOn);tick++;},110);fastTimeout(()=>{window.clearInterval(timer);setWarpMessage('⚡ 次元境界を突破！');playSfx('jackpot',soundOn);},1250);fastTimeout(()=>{const d=ri(min,max);playSfx(d>=0?'warpUp':'warpDown',soundOn);setWarpMessage(`${d>=0?'+':''}${d}階へ座標確定！`);setWarpAnimating(false);show({...room,result:`${d>=0?'+':''}${d}階へワープ開始！`,resultType:d>=0?'gold':'danger'});fastTimeout(()=>moveByEvent(d,`${label}`),420);},1850);};
  const buyAuction=(item:Item)=>{if(s.money<500){playSfx('fail',soundOn);return;}if(s.items.length>=3&&item.type!=='gem'){playSfx('click',soundOn);setPendingOverflow(item);setPendingOverflowPurchase({source:'auction',cost:500});return;}playSfx('buy',soundOn);patch(current=>({money:current.money-500}));addItem(item);show({...room,kind:undefined,result:`${item.name} 落札！`,resultType:'gold'});};

  const novelSpeaker=useMemo(()=>{
    const k=room.kind||'';
    if(k==='survey')return 'アンケート娘';
    if(k==='fortune')return '占い師';
    if(k==='shop')return '店員';
    if(k==='legendshop')return '神器商人';
    if(k==='auction'||k==='mystery')return '競売人';
    if(k==='blackjack'||k==='casino')return 'ディーラー';
    if(k==='atm')return 'ATM';
    if(k==='god')return '神々の声';
    if(k==='hell')return '？？？';
    if(k==='vending')return '自動販売機';
    return 'ナレーション';
  },[room.kind]);

  const interactive=useMemo(()=>{
    const kind=room.kind;
    if(kind==='doors'){
      const defs:Record<DoorChoice,{title:string;sub:string;go:()=>void}>={
        creaky:{title:'軋んだ扉',sub:'Tier 1 確定',go:()=>executeRoom(1)},
        silver:{title:'銀の扉',sub:'Tier 3 以上確定',go:()=>{const r=Math.random();executeRoom(r<.667?3:r<.967?4:5);}},
        gold:{title:'金の扉',sub:'Tier 4 以上確定',go:()=>executeRoom(Math.random()<.9?4:5)},
        luck:{title:'運気の扉',sub:'ラッキー系の部屋へ',go:()=>{const r=ri(1,3);executeRoom(r,r===1?'LUCKY':r===2?'SUPER_LUCKY':'SUPER_LUCKY_3');}},
        health:{title:'健康の扉',sub:'健康系の湯へ',go:()=>{const r=ri(2,4);executeRoom(r,r===2?'HEALTH':r===3?'HEALTH_2':'HEALTH_3');}},
        money:{title:'お金の扉',sub:'宝石採掘場へ',go:()=>{const r=ri(2,4);executeRoom(r,r===2?'RUBY_MINING':r===3?'EMERALD_MINING':'DIAMOND_MINING');}}
      };
      return <SimpleGrid columns={2} spacing={2}>{doorChoices.map(id=><Action key={id} title={defs[id].title} sub={defs[id].sub} onClick={defs[id].go}/>)}</SimpleGrid>;
    }
    if(kind==='pet'){
      const isCat=room.payload?.animal==='cat';
      const animal=isCat?'🐈':'🐕';
      const hearts=isCat?'🐾 💗 🐾':'🦴 💗 🐾';
      return <Stack spacing={2}><Center><Box position="relative" w={{base:'120px',md:'138px'}} h={{base:'96px',md:'108px'}} display="grid" placeItems="center" bg={isCat?'rgba(80,35,65,.62)':'rgba(91,65,24,.58)'} border="1px solid" borderColor={eventAnimating?(isCat?'pink.300':'yellow.300'):'whiteAlpha.300'} borderRadius="22px" boxShadow={eventAnimating?(isCat?'0 0 38px rgba(244,114,182,.55)':'0 0 38px rgba(250,204,21,.48)'):'0 10px 26px rgba(0,0,0,.35)'} animation={eventAnimating?'revealPulse .55s ease-in-out infinite alternate':undefined}><Text fontSize={{base:'5xl',md:'6xl'}}>{animal}</Text>{eventAnimating&&<Text position="absolute" top="4px" fontSize="lg" animation="rareSpark .9s ease-out infinite">💗</Text>}</Box></Center><Button w="100%" colorScheme={isCat?'pink':'orange'} isDisabled={eventAnimating} isLoading={eventAnimating} loadingText={isCat?'猫と遊んでいます…':'犬と遊んでいます…'} onClick={()=>{if(eventAnimating)return;setEventAnimating(true);playSfx('success',soundOn);show({...room,result:isCat?'猫がゴロゴロ喉を鳴らしている…':'犬が楽しそうにしっぽを振っている…'});fastTimeout(()=>{const found=Math.random()<.30;if(found){if(isCat){patch(current=>({luck:current.luck+2}));playSfx('success',soundOn);show({...room,kind:undefined,result:'猫が四つ葉のクローバーを持ってきた。運気 +2',resultType:'success'});}else{patch(current=>({turnsLeft:current.turnsLeft+1}));playSfx('success',soundOn);show({...room,kind:undefined,result:'犬が小さな砂時計を持ってきた。残り回数 +1',resultType:'success'});}}else{playSfx('item',soundOn);show({...room,kind:undefined,result:`${hearts} なんだか癒やされた…`,resultType:'neutral'});}setEventAnimating(false);},1500);}}>{isCat?'猫と遊ぶ':'犬と遊ぶ'}</Button></Stack>;
    }
    if(kind==='boxes'){
      const names=['赤','青','緑'];
      const rewardText=(r:{type:'money'|'luck'|'turn',value:number})=>r.type==='money'?`${r.value}円`:r.type==='luck'?`運気 +${r.value}`:`回数 +${r.value}`;
      const rewardIcon=(r:{type:'money'|'luck'|'turn',value:number})=>r.type==='money'?'💰':r.type==='luck'?'🍀':'⚡';
      return <Stack spacing={2}>
        <SimpleGrid columns={3} spacing={1.5}>{names.map((v,i)=>{
          const reward=boxRewards[i]; const selectedNow=boxSelected===i; const visible=boxSelected===null||selectedNow||boxRevealAll;
          return <Button key={v} minH="76px" h="auto" py={2} px={1.5} bg={selectedNow?(i===0?'red.700':i===1?'blue.700':'green.700'):boxSelected===null?(i===0?'red.800':i===1?'blue.800':'green.800'):visible?'gray.700':'gray.800'} color="white" border="2px solid" borderColor={selectedNow?(i===0?'red.300':i===1?'blue.300':'green.300'):boxRevealAll?'whiteAlpha.400':(i===0?'red.400':i===1?'blue.400':'green.400')} isDisabled={boxSelected!==null} opacity={boxSelected!==null&&!visible ? .55 : 1} onClick={()=>{
            if(boxSelected!==null||!reward)return;
            playSfx(reward.type==='money'?'coin':'success',soundOn);
            setBoxSelected(i);
            if(reward.type==='money')patch(current=>({money:current.money+reward.value})); else if(reward.type==='luck')patch(current=>({luck:current.luck+reward.value})); else patch(current=>({turnsLeft:current.turnsLeft+reward.value}));
            const msg=`${v}の箱：${rewardText(reward)}！`;
            show({...room,result:msg,resultType:reward.type==='money'?'gold':'success'});
            fastTimeout(()=>{setBoxRevealAll(true);playSfx('item',soundOn);},900);
          }}>
            <VStack spacing={1}><Text fontWeight="900" fontSize="xs">{v}の箱</Text>{boxSelected===null?<><Text fontSize="xl">📦</Text><Text fontSize="9px" color="gray.300">選ぶ</Text></>:visible&&reward?<><Text fontSize="xl">{rewardIcon(reward)}</Text><Text fontSize="10px" fontWeight="900" color={selectedNow?'cyan.100':'white'}>{rewardText(reward)}</Text>{selectedNow&&<Badge colorScheme="cyan" fontSize="8px">選択</Badge>}</>:<><Text fontSize="xl">📦</Text><Text fontSize="9px" color="gray.400">？？？</Text></>}</VStack>
          </Button>})}</SimpleGrid>
        {boxSelected!==null&&!boxRevealAll&&<Text textAlign="center" fontSize="10px" color="gray.300">残りの箱を開封しています…</Text>}
        {boxRevealAll&&<Text textAlign="center" fontSize="10px" color="cyan.200" fontWeight="bold">すべての箱の中身を公開しました</Text>}
      </Stack>;
    }
    if(kind==='scratch'){
      const symbols=scratchOutcome==='ruby'?['🔴','🔴','🔴']:scratchOutcome==='emerald'?['🟢','🟢','🟢']:scratchOutcome==='diamond'?['💎','💎','💎']:['🔴','🟢','💎'];
      const prize=scratchOutcome==='ruby'?800:scratchOutcome==='emerald'?1200:scratchOutcome==='diamond'?2000:0;
      const reveal=(i:number)=>{if(scratchRevealed[i])return;const next=[...scratchRevealed];next[i]=true;setScratchRevealed(next);playSfx('slotStop',soundOn);if(next.every(Boolean)&&!scratchPaid){setScratchPaid(true);fastTimeout(()=>{if(prize>0){patch(c=>({money:c.money+prize}));playSfx('jackpot',soundOn);show({...room,result:`${scratchOutcome==='ruby'?'ルビー':scratchOutcome==='emerald'?'エメラルド':'ダイヤモンド'}が3つ揃った！ +${prize}円`,resultType:'gold'});}else{playSfx('fail',soundOn);show({...room,result:'惜しい！ 今回は揃わなかった。',resultType:'neutral'});}},650);}};
      return <Stack spacing={2}><SimpleGrid columns={3} spacing={2}>{[0,1,2].map(i=><Button key={i} h="82px" bg={scratchRevealed[i]?'whiteAlpha.200':'gray.600'} border="2px solid" borderColor={scratchRevealed[i]?'yellow.300':'gray.400'} onClick={()=>reveal(i)} isDisabled={scratchRevealed[i]}><Text fontSize={scratchRevealed[i]?'3xl':'sm'}>{scratchRevealed[i]?symbols[i]:'削る'}</Text></Button>)}</SimpleGrid><Text fontSize="10px" color="yellow.100" textAlign="center">🔴 800円 / 🟢 1200円 / 💎 2000円</Text></Stack>;
    }
    if(kind==='fatedoor'){
      const cashout=()=>{if(fateDone||eventAnimating)return;setFateDone(true);patch(c=>({money:c.money+fatePending.money,luck:c.luck+fatePending.luck,turnsLeft:c.turnsLeft+fatePending.turns}));if(fatePending.items.length)setItemGrantQueue(q=>[...q,...fatePending.items]);playSfx('jackpot',soundOn);show({...room,kind:undefined,result:`報酬を獲得！ ${fatePending.labels.join(' / ')}`,resultType:'gold'});};
      const nextReward=(stage:number):{pending:Partial<FatePending>;label:string;item?:Item}=>{if(stage===1){if(Math.random()<.5)return{pending:{luck:5},label:'運気 +5'};return{pending:{turns:1},label:'残り回数 +1'};}if(stage===2){const item=Math.random()<.5?makeItem('mirror',ri(3,5)):makeItem('ring',ri(6,9));return{pending:{},label:item.name,item};}if(stage===3){if(Math.random()<.5)return{pending:{luck:15},label:'運気 +15'};return{pending:{turns:3},label:'残り回数 +3'};}if(stage===4){const item=pick<Item>([makeItem('mirror',ri(6,8)),makeItem('ring',ri(10,15)),makeItem('blessing_charm',ri(1,2)),makeItem('money_tree',ri(1,2))]);return{pending:{},label:item.name,item};}return{pending:{turns:6},label:'残り回数 +6'};};
      const choose=(door:number)=>{if(fateDone||fateStage>=5||eventAnimating)return;setEventAnimating(true);setFateOpeningDoor(door);playSfx('door',soundOn);show({...room,result:`扉 ${door+1} を開いている…`});fastTimeout(()=>{const stage=fateStage+1;const winners=stage<=3?2:1;const winDoors=[0,1,2].sort(()=>Math.random()-.5).slice(0,winners);if(!winDoors.includes(door)){setFateDone(true);setFatePending({money:0,luck:0,turns:0,items:[],labels:[]});playSfx('fail',soundOn);show({...room,kind:undefined,result:`第${stage}段階：扉の先は行き止まり… 累積報酬をすべて失った。`,resultType:'danger'});setFateOpeningDoor(null);setEventAnimating(false);return;}const rw=nextReward(stage);setFateStage(stage);setFatePending(p=>({money:p.money+(rw.pending.money||0),luck:p.luck+(rw.pending.luck||0),turns:p.turns+(rw.pending.turns||0),items:rw.item?[...p.items,rw.item]:p.items,labels:[...p.labels,rw.label]}));playSfx(stage>=4?'jackpot':'success',soundOn);show({...room,result:`扉が開いた！ 奥へ進み、第${stage}段階突破。${rw.label} が累積された。`,resultType:stage>=4?'gold':'success'});fastTimeout(()=>{setFateOpeningDoor(null);setEventAnimating(false);},500);},750);};
      return <Stack spacing={2}><Box p={2} bg="blackAlpha.500" rounded="lg"><Text fontSize="10px" color="purple.100">現在の累積報酬</Text><Text fontSize="11px" fontWeight="900" color="yellow.100">{fatePending.labels.length?fatePending.labels.join(' / '):'なし'}</Text><Text mt={1} fontSize="9px" color="gray.300">次の成功率：{fateStage<3?'2/3':fateStage<5?'1/3':'制覇'}</Text></Box>{!fateDone&&fateStage<5&&<SimpleGrid columns={3} spacing={2}>{[0,1,2].map(i=><Button key={i} h={{base:'102px',md:'128px'}} p={0} overflow="hidden" position="relative" bg="linear-gradient(180deg,#4b2d23 0%,#25130f 100%)" border="3px solid" borderColor={fateOpeningDoor===i?'yellow.300':'#9a6a45'} borderRadius="4px 4px 2px 2px" boxShadow="inset 0 0 0 3px rgba(0,0,0,.28), 0 6px 16px rgba(0,0,0,.35)" isDisabled={eventAnimating} onClick={()=>choose(i)} _hover={{filter:'brightness(1.15)',transform:'translateY(-2px)'}}><Box position="absolute" inset="7px" border="2px solid rgba(218,166,104,.5)" bg="linear-gradient(90deg,rgba(0,0,0,.16),transparent 30%,rgba(255,255,255,.05) 55%,rgba(0,0,0,.2))" transformOrigin="left center" animation={fateOpeningDoor===i?'fateDoorOpen .72s ease-in-out forwards':undefined}/><Box position="absolute" right="12px" top="50%" transform="translateY(-50%)" w="8px" h="8px" rounded="full" bg="yellow.500" boxShadow="0 0 7px rgba(250,204,21,.8)"/><VStack position="relative" zIndex={2} spacing={0}><Text fontSize={{base:'xs',md:'sm'}} color="orange.100" fontWeight="900">扉 {i+1}</Text></VStack></Button>)}</SimpleGrid>}{eventAnimating&&<Text textAlign="center" fontSize="10px" color="yellow.100" fontWeight="bold">扉が開く――</Text>}{!fateDone&&fateStage<5&&<Button colorScheme="yellow" color="black" isDisabled={eventAnimating} onClick={cashout}>ここでやめて報酬を受け取る</Button>}{fateStage===5&&!fateDone&&<Button colorScheme="yellow" color="black" isDisabled={eventAnimating} onClick={cashout}>完全制覇報酬を受け取る</Button>}</Stack>;
    }
    if(kind==='pirate'){
      const keyLabel=(k:KeyKind|null)=>k==='copper'?'銅の鍵':k==='silver'?'銀の鍵':k==='gold'?'金の鍵':k==='diamond'?'ダイヤモンドの鍵':'空箱';
      const keyStyle=(k:KeyKind|null)=>k==='copper'?{icon:'🗝️',bg:'linear-gradient(180deg,#8b5a32,#3f2818)',border:'#d08a55',text:'#ffd0a3'}:k==='silver'?{icon:'🗝️',bg:'linear-gradient(180deg,#9aa4ae,#39414b)',border:'#e2e8f0',text:'#f1f5f9'}:k==='gold'?{icon:'🔑',bg:'linear-gradient(180deg,#d4a017,#624500)',border:'#fde047',text:'#fff3a3'}:k==='diamond'?{icon:'💎',bg:'linear-gradient(180deg,#4fd1c5,#123a4a)',border:'#a5f3fc',text:'#d9ffff'}:{icon:'📦',bg:'linear-gradient(180deg,#35383d,#17191d)',border:'rgba(255,255,255,.18)',text:'#cbd5e0'};
      const pickBox=(i:number)=>{if(piratePicks.includes(i)||piratePicks.length>=3)return;const next=[...piratePicks,i];setPiratePicks(next);playSfx('item',soundOn);if(next.length===3){const gained:Record<KeyKind,number>={copper:0,silver:0,gold:0,diamond:0};next.forEach(idx=>{const k=pirateBoxes[idx];if(k)gained[k]++;});setKeys(prev=>({copper:prev.copper+gained.copper,silver:prev.silver+gained.silver,gold:prev.gold+gained.gold,diamond:prev.diamond+gained.diamond}));fastTimeout(()=>{setPirateRevealAll(true);playSfx(Object.values(gained).some(v=>v>0)?'success':'fail',soundOn);show({...room,result:Object.values(gained).some(v=>v>0)?`鍵を獲得！ 銅×${gained.copper} 銀×${gained.silver} 金×${gained.gold} ダイヤ×${gained.diamond}`:'3箱とも鍵なし…',resultType:Object.values(gained).some(v=>v>0)?'gold':'neutral'});},700);}};
      return <Stack spacing={2}><SimpleGrid columns={5} spacing={1}>{pirateBoxes.map((k,i)=>{const picked=piratePicks.includes(i);const visible=picked||pirateRevealAll;const style=keyStyle(visible?k:null);return <Button key={i} minH={{base:'68px',md:'78px'}} h="auto" p={1} isDisabled={piratePicks.length>=3||picked} onClick={()=>pickBox(i)} bg={style.bg} border="2px solid" borderColor={picked?'orange.200':style.border} boxShadow={visible&&k?`inset 0 0 18px ${k==='diamond'?'rgba(103,232,249,.28)':k==='gold'?'rgba(250,204,21,.22)':'rgba(255,255,255,.08)'}`:'none'}><VStack spacing={.5}><Text fontSize={{base:'xl',md:'2xl'}} filter={visible&&k==='diamond'?'drop-shadow(0 0 6px #67e8f9)':visible&&k==='gold'?'drop-shadow(0 0 5px #facc15)':undefined}>{visible?style.icon:'📦'}</Text><Text fontSize="8px" fontWeight="900" color={visible?style.text:'gray.300'} whiteSpace="normal">{visible?keyLabel(k):`${i+1}`}</Text>{picked&&<Badge fontSize="6px" colorScheme="orange">選択</Badge>}</VStack></Button>})}</SimpleGrid><Text fontSize="9px" color="gray.300" textAlign="center">選択 {piratePicks.length}/3　3つ選ぶと全箱を答え合わせ</Text></Stack>;
    }
    if(kind==='sealedvault'){
      const labels:Record<KeyKind,string>={copper:'銅',silver:'銀',gold:'金',diamond:'ダイヤモンド'};
      const chestMeta:Record<KeyKind,{bg:string;border:string;glow:string}>={
        copper:{bg:'linear-gradient(180deg,#7c4a2b,#2f1b12)',border:'#d08a55',glow:'rgba(217,145,91,.55)'},
        silver:{bg:'linear-gradient(180deg,#a7b0ba,#37404a)',border:'#e2e8f0',glow:'rgba(226,232,240,.65)'},
        gold:{bg:'linear-gradient(180deg,#d4a017,#5b4000)',border:'#fde047',glow:'rgba(250,204,21,.75)'},
        diamond:{bg:'linear-gradient(180deg,#38bdf8,#123a4a)',border:'#a5f3fc',glow:'rgba(103,232,249,.85)'}
      };
      const openChest=(k:KeyKind)=>{
        if(keys[k]<=0||eventAnimating)return;
        setEventAnimating(true);setVaultOpeningKey(k);setVaultPhase('shake');setKeys(v=>({...v,[k]:v[k]-1}));
        playSfx('roulette',soundOn);show({...room,result:`${labels[k]}の宝箱が震え始めた…`});
        fastTimeout(()=>{setVaultPhase('glow');playSfx('item',soundOn);show({...room,result:'宝箱の隙間から強い光が漏れてくる…'});},520);
        fastTimeout(()=>{setVaultPhase('open');playSfx(k==='diamond'||k==='gold'?'jackpot':'success',soundOn);},1050);
        fastTimeout(()=>{
          let luck=0,turns=0;const items:Item[]=[];
          if(k==='copper'){luck=ri(5,10);turns=ri(1,5);}else if(k==='silver'){luck=ri(8,15);turns=ri(3,6);if(Math.random()<1/8)items.push(Math.random()<.5?makeItem('money_tree',2):makeItem('blessing_charm',2));}else if(k==='gold'){luck=ri(10,20);turns=ri(7,8);if(Math.random()<.2)items.push(pick<Item>([makeItem('yata_mirror'),makeItem('kusanagi'),makeItem('immortal_mag')]));}else{luck=ri(20,50);turns=ri(8,12);items.push(pick<Item>([makeItem('yata_mirror'),makeItem('kusanagi'),makeItem('immortal_mag')]));}
          patch(c=>({luck:c.luck+luck,turnsLeft:c.turnsLeft+turns}));if(items.length)setItemGrantQueue(q=>[...q,...items]);
          playSfx(items.length?'jackpot':'success',soundOn);show({...room,result:`${labels[k]}の宝箱：運気 +${luck} / 残り回数 +${turns}${items.length?` / ${items[0].name} 獲得！`:''}`,resultType:'gold'});
          setVaultOpeningKey(null);setVaultPhase('idle');setEventAnimating(false);
        },1650);
      };
      return <Stack spacing={2}>
        {vaultOpeningKey&&<Center py={2}><Box position="relative" w={{base:'160px',md:'196px'}} h={{base:'126px',md:'148px'}} animation={vaultPhase==='shake'?'vaultChestShake .16s linear infinite':vaultPhase==='glow'?'vaultChestGlow .45s ease-in-out infinite alternate':undefined}>
          <Box position="absolute" left="10%" right="10%" bottom="8px" h="64%" bg={chestMeta[vaultOpeningKey].bg} border="3px solid" borderColor={chestMeta[vaultOpeningKey].border} borderRadius="8px 8px 14px 14px" boxShadow={vaultPhase==='glow'||vaultPhase==='open'?`0 0 46px ${chestMeta[vaultOpeningKey].glow}, inset 0 0 28px rgba(255,255,255,.18)`:'0 12px 28px rgba(0,0,0,.52)'} overflow="hidden">
            <Box position="absolute" inset={0} bg={vaultPhase==='glow'||vaultPhase==='open'?'radial-gradient(circle at 50% 15%,rgba(255,255,255,.92),transparent 56%)':'transparent'} opacity={vaultPhase==='open'?.98:.62}/>
          </Box>
          <Box position="absolute" left="8%" right="8%" top="18px" h="43px" bg={chestMeta[vaultOpeningKey].bg} border="3px solid" borderColor={chestMeta[vaultOpeningKey].border} borderRadius="16px 16px 5px 5px" transformOrigin="50% 100%" animation={vaultPhase==='open'?'vaultChestLidOpen .62s cubic-bezier(.18,.78,.25,1) forwards':undefined} boxShadow={vaultPhase==='glow'||vaultPhase==='open'?`0 0 34px ${chestMeta[vaultOpeningKey].glow}`:'0 6px 14px rgba(0,0,0,.42)'}/>
          {(vaultPhase==='glow'||vaultPhase==='open')&&<Box position="absolute" left="20%" right="20%" top="45px" h="22px" bg="linear-gradient(180deg,rgba(255,255,255,.95),rgba(250,204,21,.22),transparent)" filter="blur(2px)" animation="vaultLightBurst .45s ease-in-out infinite alternate"/>}
          <Text position="absolute" bottom="0" left="0" right="0" textAlign="center" fontSize="9px" fontWeight="900" color="white" textShadow="0 2px 6px #000">{vaultPhase==='shake'?'ガタガタ…':vaultPhase==='glow'?'鍵穴から光が――':vaultPhase==='open'?'宝箱が開いた！':''}</Text>
        </Box></Center>}
        {(['copper','silver','gold','diamond'] as KeyKind[]).map(k=><Button key={k} h="48px" justifyContent="space-between" colorScheme={k==='diamond'?'cyan':k==='gold'?'yellow':k==='silver'?'gray':'orange'} variant={keys[k]>0?'solid':'outline'} isDisabled={keys[k]<=0||eventAnimating} onClick={()=>openChest(k)}><Text>{labels[k]}の宝箱</Text><Badge>{keys[k]}本</Badge></Button>)}
        {Object.values(keys).every(v=>v===0)&&<Text fontSize="10px" color="gray.300" textAlign="center">鍵を持っていない。海賊船の隠し部屋で探そう。</Text>}
      </Stack>;
    }
    if(kind==='heavenstairs')return <Stack spacing={2}><Center><Text fontSize="5xl">☁️🪜✨</Text></Center><Button colorScheme="yellow" color="black" isDisabled={eventAnimating} onClick={()=>{if(eventAnimating)return;setEventAnimating(true);const tenth=ri(11,15);const mult=tenth/10;const target=Math.max(s.floor+1,Math.floor(s.floor*mult));const delta=target-s.floor;playSfx('jackpot',soundOn);show({...room,result:`倍率 ${mult.toFixed(1)}倍！ ${target}階へ上昇開始！`,resultType:'gold'});fastTimeout(()=>{setEventAnimating(false);moveByEvent(delta,`天国への階段 ×${mult.toFixed(1)}`);},850);}}>天国への階段を登る</Button><Text fontSize="10px" color="yellow.100" textAlign="center">現在階数がランダムで1.1〜1.5倍になります</Text></Stack>;
        if(kind==='crossroads')return <SimpleGrid columns={2} spacing={2}><Action title="平坦路" sub="確実に+300円" onClick={()=>{playSfx('coin',soundOn);patch(current=>({money:current.money+300}));show({...room,kind:undefined,result:'+300円',resultType:'success'})}}/><Action title="茨の道" sub="1500円 or -500円" onClick={()=>{const win=Math.random()<.5;playSfx(win?'success':'fail',soundOn);patch(current=>({money:Math.max(0,current.money+(win?1500:-500))}));show({...room,kind:undefined,result:win?'+1500円':'-500円',resultType:win?'gold':'danger'})}}/></SimpleGrid>;
    if(kind==='barter')return <Stack spacing={1.5}><HStack justify="space-between"><Text fontSize="10px" color="gray.300">この訪問での交換</Text><Badge colorScheme={barterCount>=5?'red':'teal'}>{barterCount} / 5回</Badge></HStack><Action title="運気2 ⇆ 300円" disabled={barterCount>=5} onClick={()=>{if(barterCount>=5){playSfx('fail',soundOn);return;}if(s.luck>=2){playSfx('coin',soundOn);patch(current=>({luck:current.luck-2,money:current.money+300}));setBarterCount(c=>c+1);}else playSfx('fail',soundOn);}}/><Action title="600円 ⇆ 回数+1" disabled={barterCount>=5} onClick={()=>{if(barterCount>=5){playSfx('fail',soundOn);return;}if(s.money>=600){playSfx('success',soundOn);patch(current=>({money:current.money-600,turnsLeft:current.turnsLeft+1}));setBarterCount(c=>c+1);}else playSfx('fail',soundOn);}}/>{barterCount>=5&&<Text fontSize="10px" color="orange.200" textAlign="center">この訪問での交換上限（5回）に達しました</Text>}</Stack>;
    if(kind==='reveal'){
      const type=room.payload?.type as string|undefined;
      const amount=Number(room.payload?.amount||0);
      const icon=type==='health'?'♨️':type==='stairs'?'🪜':type==='luck'?'🍀':type==='wallet'?'👛':'';
      const buttonLabel=type==='health'?'湯に浸かる':type==='stairs'?'階段を登る':type==='luck'?'祝福を受け取る':type==='wallet'?'財布を拾う':'宝箱を開ける';
      return <Stack spacing={2}><Center><Box w="86px" h="86px" rounded="full" display="grid" placeItems="center" bg="blackAlpha.500" border="1px solid" borderColor={eventAnimating?'yellow.300':'whiteAlpha.300'} boxShadow={eventAnimating?'0 0 34px rgba(250,204,21,.55), inset 0 0 22px rgba(255,255,255,.10)':'inset 0 0 16px rgba(0,0,0,.6)'} animation={eventAnimating?'revealPulse .42s ease-in-out infinite alternate':undefined}>{icon&&<Text fontSize="4xl">{icon}</Text>}</Box></Center><Button w="100%" colorScheme={type==='health'?'cyan':type==='luck'?'green':type==='stairs'?'blue':'yellow'} color={type==='wallet'||type==='treasure'?'black':undefined} isLoading={eventAnimating} loadingText="結果を確認しています…" isDisabled={eventAnimating} onClick={()=>{if(eventAnimating)return;setEventAnimating(true);playSfx(type==='stairs'?'move2':type==='health'?'success':type==='luck'?'item':'roulette',soundOn);if(type!=='treasure')show({...room,result:'効果が現れ始めた…'});fastTimeout(()=>{if(type==='luck'){patch(current=>({luck:current.luck+amount}));playSfx('success',soundOn);show({...room,kind:undefined,result:`運気 +${amount}`,resultType:'success'});}else if(type==='health'){patch(current=>({turnsLeft:current.turnsLeft+amount}));playSfx('success',soundOn);show({...room,kind:undefined,result:`残り回数 +${amount}`,resultType:'success'});}else if(type==='stairs'){setEventAnimating(false);show({...room,result:`+${amount}階！ 階段を移動中…`,resultType:'gold'});fastTimeout(()=>moveByEvent(amount,room.title),260);return;}else if(type==='wallet'){patch(current=>({money:current.money+amount}));playSfx('coin',soundOn);show({...room,kind:undefined,result:`財布の中に ${amount}円！`,resultType:'gold'});}else if(type==='treasure'){if(Math.random()<.5){const money=ri(500,1000);patch(current=>({money:current.money+money}));playSfx('coin',soundOn);show({...room,kind:undefined,result:`宝箱から ${money}円！`,resultType:'gold'});}else{const gem=pick<ItemId>(['ruby','emerald','diamond']);addItem(makeItem(gem,1));playSfx('gem',soundOn);show({...room,kind:undefined,result:`宝箱から ${gem==='ruby'?'ルビー':gem==='emerald'?'エメラルド':'ダイヤモンド'} ×1！`,resultType:'gold'});}}setEventAnimating(false);},1100);}}>{buttonLabel}</Button><Text fontSize="9px" color="gray.400" textAlign="center">結果は演出後に確定します</Text></Stack>;
    }
    if(kind==='vending'){
      const sale=!!room.payload?.sale;const luckPrice=sale?50:100;const turnPrice=sale?200:400;
      const buyDrink=(drink:'luck'|'turn',cost:number)=>{
        if(vendingCount>=5){playSfx('fail',soundOn);return;}
        if(s.money<cost){playSfx('fail',soundOn);setVendingFeedback(null);show({...room,result:`所持金が足りない…（必要 ${cost}円）`,resultType:'danger'});return;}
        const gain=Math.random()<.5?1:0;
        playSfx('buy',soundOn);
        fastTimeout(()=>playSfx(gain>0?'success':'click',soundOn),180);
        patch(current=>drink==='luck'?{money:current.money-cost,luck:current.luck+gain}:{money:current.money-cost,turnsLeft:current.turnsLeft+gain});
        setVendingFeedback({kind:drink,gain,cost});
        setVendingCount(c=>c+1);
      };
      return <Stack spacing={2}>
        <HStack justify="space-between"><Text fontSize="10px" color="gray.300">この訪問での購入</Text><Badge colorScheme={vendingCount>=5?'red':'green'}>{vendingCount} / 5回</Badge></HStack>
        {sale&&<Badge alignSelf="center" colorScheme="yellow" px={3} py={1}>🎉 半額セール！ 全商品50%OFF</Badge>}
        <SimpleGrid columns={2} spacing={2}>
          <Action title="運気ドリンク" sub={`${luckPrice}円 (50%で+1)`} disabled={vendingCount>=5} onClick={()=>buyDrink('luck',luckPrice)}/>
          <Action title="回数ドリンク" sub={`${turnPrice}円 (50%で+1)`} disabled={vendingCount>=5} onClick={()=>buyDrink('turn',turnPrice)}/>
        </SimpleGrid>
        {vendingCount>=5&&<Text fontSize="10px" color="orange.200" textAlign="center">この訪問での購入上限（5回）に達しました</Text>}
        {vendingFeedback&&<Box key={`${vendingFeedback.kind}-${vendingFeedback.gain}-${vendingFeedback.cost}`} p={3} rounded="xl" textAlign="center" bg={vendingFeedback.gain>0?'green.900':'gray.800'} border="2px solid" borderColor={vendingFeedback.gain>0?'green.300':'gray.500'} boxShadow={vendingFeedback.gain>0?'0 0 22px rgba(74,222,128,.45)':'0 0 14px rgba(255,255,255,.12)'} animation="revealPulse .35s ease-out 2 alternate">
          <Text fontSize="10px" color="gray.300" fontWeight="700">購入完了　−{vendingFeedback.cost}円</Text>
          <Text mt={1} fontSize={{base:'xl',md:'2xl'}} fontWeight="900" color={vendingFeedback.gain>0?'green.200':'gray.100'}>
            {vendingFeedback.kind==='luck'?'🍀 運気':'⚡ 残り回数'} {vendingFeedback.gain>0?'+1':'変化なし'}
          </Text>
          <Text mt={1} fontSize="10px" color={vendingFeedback.gain>0?'green.100':'gray.300'}>{vendingFeedback.gain>0?'効果が発動した！':'今回は効果が発動しなかった'}</Text>
        </Box>}
      </Stack>;
    }
    if(kind==='fortune')return <Stack spacing={2}><Center><Icon as={FaWandMagicSparkles} boxSize={10} color={fortuneReading?'purple.100':'purple.300'} animation={fortuneReading?'slotJackpot .35s ease-in-out infinite alternate':undefined}/></Center><Button w="100%" colorScheme="purple" isDisabled={fortuneReading} isLoading={fortuneReading} loadingText="運勢を占っています…" onClick={()=>{if(fortuneReading)return;setFortuneReading(true);playSfx('roulette',soundOn);show({...room,result:'水晶に星の光が集まっている…',resultType:'neutral'});fastTimeout(()=>{const table=[{name:'大吉',delta:5,text:'最高の運勢！大きな追い風が吹いている。'},{name:'吉',delta:3,text:'良い流れ。積極的な一歩が幸運を呼ぶ。'},{name:'小吉',delta:1,text:'小さな幸運が積み重なりそう。'},{name:'末吉',delta:0,text:'今は静かな運勢。焦らず進もう。'},{name:'凶',delta:-2,text:'少し注意が必要。慎重に進もう。'},{name:'大凶',delta:-4,text:'波乱の気配。無理は禁物。'}];const result=pick(table);setS(x=>({...x,luck:x.luck+result.delta}));setFortuneReading(false);playSfx(result.delta>0?'success':result.delta<0?'fail':'click',soundOn);show({...room,kind:undefined,desc:'占い師が水晶から目を離し、静かに運勢を告げた。',result:`運勢：${result.name} ／ ${result.text} ／ 運気 ${result.delta>0?'+':''}${result.delta}`,resultType:result.delta>0?'success':result.delta<0?'danger':'neutral'});},1400);}}>占ってもらう</Button>{fortuneReading&&<Text fontSize="10px" color="purple.200" textAlign="center">星の巡りを読み取っています…</Text>}</Stack>;
    if(kind==='altar')return <Stack spacing={1.5}><Text fontSize="10px" color="yellow.100" textAlign="center">祈れるのは1回だけ。成功率30%。成功すると選んだ加護を大きく受けられます。</Text><SimpleGrid columns={2} spacing={2}><Action title="🍀 運気" sub="成功：運気 +7〜10" onClick={()=>{const ok=Math.random()<.30;const g=ri(7,10);playSfx(ok?'success':'fail',soundOn);if(ok)setS(x=>({...x,luck:x.luck+g}));show({...room,kind:undefined,result:ok?`祈りが届いた！ 運気 +${g}`:'祈りは届かなかった…',resultType:ok?'success':'neutral'});}}/><Action title="🏢 階数" sub="成功：+50〜100階" onClick={()=>{const ok=Math.random()<.30;const g=ri(50,100);playSfx(ok?'success':'fail',soundOn);if(!ok){show({...room,kind:undefined,result:'祈りは届かなかった…',resultType:'neutral'});return;}show({...room,result:`祈りが届いた！ +${g}階へ導かれる…`,resultType:'gold'});fastTimeout(()=>moveByEvent(g,'祭壇の加護'),350);}}/><Action title="💰 金運" sub="成功：+1000〜1500円" onClick={()=>{const ok=Math.random()<.30;const g=ri(1000,1500);playSfx(ok?'coin':'fail',soundOn);if(ok)setS(x=>({...x,money:x.money+g}));show({...room,kind:undefined,result:ok?`金運の加護！ +${g}円`:'祈りは届かなかった…',resultType:ok?'gold':'neutral'});}}/><Action title="❤️ 健康運" sub="成功：残り回数 +5〜7" onClick={()=>{const ok=Math.random()<.30;const g=ri(5,7);playSfx(ok?'success':'fail',soundOn);if(ok)setS(x=>({...x,turnsLeft:x.turnsLeft+g}));show({...room,kind:undefined,result:ok?`健康運の加護！ 回数 +${g}`:'祈りは届かなかった…',resultType:ok?'success':'neutral'});}}/></SimpleGrid></Stack>;
    if(kind==='mining')return <><SimpleGrid columns={5} spacing={1}>{rocks.map((r,i)=>{const reveal=r.open||picks<=0;return <Button key={i} h="62px" p={1} bg={r.open?'gray.800':picks<=0?'blackAlpha.500':'gray.700'} border="1px solid" borderColor={r.open?'cyan.600':picks<=0?'whiteAlpha.300':'gray.600'} isDisabled={r.open||picks<=0} opacity={!r.open && picks<=0 ? .65 : 1} onClick={()=>{playSfx('mine',soundOn);const n=[...rocks];n[i]={...n[i],open:true};setRocks(n);setPicks(p=>p-1);}}>{reveal?(r.gem?<VStack spacing={0}><Icon as={FaGem} color={r.gem==='ruby'?'red.300':r.gem==='emerald'?'green.300':'cyan.200'}/><Text fontSize="10px">x{r.count}</Text><Text fontSize="8px" color={r.open?'cyan.200':'gray.400'}>{r.open?'採掘':'未選択'}</Text></VStack>:<VStack spacing={0}><Text fontSize="10px" color="gray.400">空</Text><Text fontSize="8px" color={r.open?'cyan.200':'gray.500'}>{r.open?'採掘':'未選択'}</Text></VStack>):<Icon as={FaHammer}/>}</Button>})}</SimpleGrid>{picks<=0&&<><Text mt={2} fontSize="9px" color="gray.300" textAlign="center">未選択の岩も公開しました。薄く表示されているものが選ばなかった岩です。</Text><Button mt={2} w="100%" colorScheme="green" size="sm" onClick={()=>{const got=rocks.filter(r=>r.open&&r.gem);if(got.length===0){playSfx('fail',soundOn);show({...room,kind:undefined,result:'何も貰えなかった...',resultType:'neutral'});return;}playSfx('gem',soundOn);const gemTotals=got.reduce<Record<string,number>>((acc,r)=>{if(r.gem)acc[r.gem]=(acc[r.gem]||0)+r.count;return acc;},{});Object.entries(gemTotals).forEach(([gemId,count])=>addItem(makeItem(gemId as ItemId,count)));const total=got.reduce((a,r)=>a+r.count,0);show({...room,kind:undefined,result:`宝石を${total}個拾った！`,resultType:'gold'});}}>宝石を拾って進む</Button></>}</>;
    if(kind==='shop')return <Stack spacing={1.5} maxH="145px" overflowY="auto">{shop.map((g,i)=><Flex key={i} p={2} bg="gray.800" rounded="lg" align="center" opacity={g.sold ? .5 : 1}><Icon as={g.item.icon||FaGift} mr={2}/><Box flex="1"><Text fontSize="11px" fontWeight="bold">{g.item.name}</Text><Text fontSize="9px" color="gray.400">{g.item.price}円</Text></Box><Button size="xs" colorScheme="yellow" isDisabled={g.sold} onClick={()=>{if(s.money<g.item.price){playSfx('fail',soundOn);return;}if(s.items.length>=3&&g.item.type!=='gem'){playSfx('click',soundOn);setPendingOverflow(g.item);setPendingOverflowPurchase({source:'shop',cost:g.item.price,shopIndex:i});return;}playSfx('buy',soundOn);patch(current=>({money:current.money-g.item.price}));addItem(g.item);setShop(x=>x.map((v,j)=>j===i?{...v,sold:true}:v));}}>{g.sold?'SOLD OUT':'購入'}</Button></Flex>)}</Stack>;
    if(kind==='blackjack')return <Stack spacing={2} bg="blackAlpha.500" p={2.5} rounded="xl" border="1px solid" borderColor="teal.700"><HStack justify="space-between"><Text fontSize="xs">賭け金</Text><HStack><Button size="xs" isDisabled={bj.playing} onClick={()=>setBj(x=>({...x,bet:Math.max(100,x.bet-100)}))}>-</Button><Text color="yellow.300">{bj.bet}円</Text><Button size="xs" isDisabled={bj.playing} onClick={()=>setBj(x=>({...x,bet:x.bet+100}))}>+</Button></HStack></HStack>{bjPhase&&<Box bg="teal.950" border="1px solid" borderColor="teal.700" rounded="md" px={2} py={1.5}><Text fontSize="10px" color="teal.100" textAlign="center" fontWeight="700">{bjPhase}</Text></Box>}{!bj.playing?<Button size="sm" colorScheme="teal" onClick={()=>{if(s.money<bj.bet){playSfx('fail',soundOn);return;}setS(x=>({...x,money:x.money-bj.bet}));setBj(x=>({...x,playing:true,p:[],d:[]}));setBjPhase('カードをシャッフルしています…');playSfx('card',soundOn);fastTimeout(()=>{const p1=card(),d1=card();setBj(x=>({...x,playing:true,p:[p1],d:[d1]}));setBjPhase(`最初のカード：あなた ${p1} / Dealer ${d1}`);playSfx('card',soundOn);fastTimeout(()=>{const p2=card(),d2=card();setBj(x=>({...x,p:[p1,p2],d:[d1,d2]}));setBjPhase('初期配布完了。HITかSTANDを選んでください');playSfx('card',soundOn);},650);},600);}}>勝負開始！(勝利時2倍)</Button>:<><Flex gap={2}><Box flex="1" bg="green.950" rounded="lg" p={2}><Text fontSize="9px" color="green.300">YOU</Text><Text fontSize="sm" fontWeight="900">{bj.p.join(' / ')||'…'}</Text><Text fontSize="xs" color="green.200">合計 {hand(bj.p)}</Text></Box><Box flex="1" bg="red.950" rounded="lg" p={2}><Text fontSize="9px" color="red.300">DEALER</Text><Text fontSize="sm" fontWeight="900">{bj.d.join(' / ')||'…'}</Text><Text fontSize="xs" color="red.200">合計 {hand(bj.d)}</Text></Box></Flex><HStack><Button size="sm" flex="1" onClick={()=>{setBjPhase('カードを1枚引きます…');fastTimeout(()=>{playSfx('card',soundOn);const drawn=card();const p=[...bj.p,drawn];const total=hand(p);setBj(x=>({...x,p}));setBjPhase(`${drawn}を引いた → 合計${total}`);if(total>21){fastTimeout(()=>{playSfx('fail',soundOn);setBj(x=>({...x,playing:false}));show({...room,kind:undefined,result:`${drawn}を引いて合計${total} → BUST（21超過）`,resultType:'danger'});},650);}},500);}}>HIT</Button><Button size="sm" flex="1" colorScheme="green" onClick={()=>{setBjPhase('Dealerのターン…');let d=[...bj.d];const reveal=()=>{if(hand(d)<17){fastTimeout(()=>{const c=card();d=[...d,c];setBj(x=>({...x,d}));setBjPhase(`Dealerが ${c} を引いた → 合計${hand(d)}`);playSfx('card',soundOn);reveal();},650);}else{fastTimeout(()=>{const pv=hand(bj.p),dv=hand(d);const win=dv>21||pv>dv;const draw=pv===dv;playSfx(win?'success':draw?'click':'fail',soundOn);if(win)setS(x=>({...x,money:x.money+bj.bet*2}));else if(draw)setS(x=>({...x,money:x.money+bj.bet}));setBj(x=>({...x,d,playing:false}));setBjPhase(dv>21?`Dealer BUST：合計${dv}`:`最終結果 YOU ${pv} / DEALER ${dv}`);show({...room,kind:undefined,result:win?'勝利！':draw?'引き分け':'敗北...',resultType:win?'gold':draw?'neutral':'danger'});},750);}};reveal();}}>STAND</Button></HStack></>}</Stack>;
    if(kind==='casino')return <Stack spacing={2}>
      <Flex align="center" justify="space-between" bg="whiteAlpha.100" border="1px solid" borderColor="purple.500" rounded="lg" px={3} py={2}>
        <Text fontSize="11px" color="gray.200" fontWeight="700">この訪問で回せる回数</Text>
        <Text fontSize="sm" color={casinoSpinsLeft>0?'yellow.300':'red.300'} fontWeight="900">残り {casinoSpinsLeft} / 10 回</Text>
      </Flex>
      <HStack justify="center"><Button size="xs" isDisabled={slotSpinning||casinoSpinsLeft<=0} onClick={()=>setSlotBet(Math.max(20,slotBet-20))}>-</Button><Text color="yellow.300" fontWeight="900">{slotBet}円</Text><Button size="xs" isDisabled={slotSpinning||casinoSpinsLeft<=0||slotBet>=500} onClick={()=>setSlotBet(Math.min(500,slotBet+20))}>+</Button></HStack>
      <HStack justify="center" spacing={2}>{slot.map((v,i)=><Center key={i} bg={slotWin?'yellow.900':'black'} border="2px solid" borderColor={slotWin?'yellow.300':slotSpinning?'purple.400':'whiteAlpha.200'} boxShadow={slotWin?'0 0 18px rgba(250,204,21,.85)':'inset 0 0 12px rgba(0,0,0,.7)'} animation={slotWin?'slotJackpot .28s ease-in-out infinite alternate':slotMessage.includes('リーチ')||slotMessage.includes('ラスト')?'slotHeat .34s ease-in-out infinite, slotShake .22s ease-in-out infinite':undefined} rounded="lg" w="62px" h="62px" fontSize="2xl">{v}</Center>)}</HStack>
      {slotMessage&&<Box px={3} py={2} rounded="lg" bg={slotWin?'yellow.900':slotMessage.includes('リーチ')||slotMessage.includes('ラスト')?'red.900':'whiteAlpha.100'} border="1px solid" borderColor={slotWin?'yellow.300':slotMessage.includes('リーチ')||slotMessage.includes('ラスト')?'orange.300':'whiteAlpha.200'} animation={slotWin?'slotJackpot .35s ease-in-out infinite alternate':slotMessage.includes('リーチ')||slotMessage.includes('ラスト')?'slotHeat .34s ease-in-out infinite':undefined}><Text textAlign="center" fontSize={slotWin?'sm':'xs'} fontWeight="900" color={slotWin?'yellow.200':slotMessage.includes('リーチ')||slotMessage.includes('ラスト')?'orange.100':'gray.100'}>{slotMessage}</Text></Box>}
      <Button colorScheme="purple" size="sm" isLoading={slotSpinning} loadingText="リール回転中…" onClick={()=>{
        if(casinoSpinsLeft<=0){playSfx('fail',soundOn);setSlotMessage('このカジノでは10回遊び終えました');show({...room,result:'この訪問での上限10回に到達',resultType:'neutral'});return;}
        if(s.money<slotBet||slotSpinning){playSfx('fail',soundOn);return;}
        setCasinoSpinsLeft(v=>Math.max(0,v-1));
        const sy=['🔴','🟢','💎','🎡','🍀','⚡'];
        // 3つ揃い確率：ルビー8% / エメラルド5% / ダイヤ2% / ルーレット1% / 🍀2.5% / ⚡2.5%。
        // 合計当選率21%。残り79%はハズレだが、一部をリーチにして期待感を演出する（当選率自体は変えない）。
        const roll=Math.random();
        let final:string[];
        if(roll<.08) final=['🔴','🔴','🔴'];
        else if(roll<.13) final=['🟢','🟢','🟢'];
        else if(roll<.15) final=['💎','💎','💎'];
        else if(roll<.16) final=['🎡','🎡','🎡'];
        else if(roll<.185) final=['🍀','🍀','🍀'];
        else if(roll<.21) final=['⚡','⚡','⚡'];
        else if(Math.random()<.55){
          const reachSymbol=pick(sy);
          final=[reachSymbol,reachSymbol,pick(sy.filter(v=>v!==reachSymbol))];
        }else{
          do{final=[pick(sy),pick(sy),pick(sy)];}while(final[0]===final[1]&&final[1]===final[2]);
        }
        playSfx('casino',soundOn); setS(x=>({...x,money:x.money-slotBet})); setSlotSpinning(true); setSlotWin(false); setSlotMessage('⚡ NEON CHARGE… リール始動！ ⚡'); setSlot(['🎰','🎰','🎰']);
        const timers=final.map((_,i)=>fastInterval(()=>setSlot(cur=>cur.map((v,j)=>j===i?pick(sy):v)),95));
        const isReach=final[0]===final[1];
        const stops=[820,1640,isReach?3520:2520];
        fastTimeout(()=>{setSlotMessage('');},420);
        stops.forEach((ms,i)=>fastTimeout(()=>{window.clearInterval(timers[i]);setSlot(cur=>cur.map((v,j)=>j===i?final[i]:v));playSfx('slotStop',soundOn);if(i===0)setSlotMessage('');else if(i===1&&isReach){playSfx('jackpot',soundOn);setSlotMessage('');}else if(i===1)setSlotMessage('');else setSlotMessage('');},ms));
        if(isReach){
          fastTimeout(()=>{playSfx('roulette',soundOn);setSlotMessage(`🔥 ${final[0]} ${final[1]} ── 止まれ…！ 最終リール超減速！`);},2380);
          fastTimeout(()=>{playSfx('jackpot',soundOn);setSlotMessage('⚡⚡ ラスト1コマ…！ ⚡⚡');},3060);
        }
        fastTimeout(()=>{
          let mult=0; let label='';
          if(final.every(v=>v==='🔴')){mult=5;label='ルビー';}
          if(final.every(v=>v==='🟢')){mult=10;label='エメラルド';}
          if(final.every(v=>v==='💎')){mult=30;label='ダイヤモンド';}
          if(final.every(v=>v==='🍀')){
            const gain=Math.floor(slotBet/10);
            playSfx('jackpot',soundOn);setSlotWin(true);setSlotMessage(`🍀 運気が大幅アップ！ +${gain} 🍀`);
            setS(x=>({...x,luck:x.luck+gain}));
            show({...room,result:`🍀揃い！ 運気 +${gain}`,resultType:'success'});
            setSlotSpinning(false);fastTimeout(()=>setSlotWin(false),2400);return;
          }
          if(final.every(v=>v==='⚡')){
            const gain=Math.floor(slotBet/20);
            playSfx('jackpot',soundOn);setSlotWin(true);setSlotMessage(`⚡ 残り回数が増加！ +${gain} ⚡`);
            setS(x=>({...x,turnsLeft:x.turnsLeft+gain}));
            show({...room,result:`⚡揃い！ 残り回数 +${gain}`,resultType:'success'});
            setSlotSpinning(false);fastTimeout(()=>setSlotWin(false),2400);return;
          }
          if(final.every(v=>v==='🎡')){
            playSfx('jackpot',soundOn);setSlotWin(true);
            setSlotMessage('🎡🎡🎡 ルーレット揃い！ 配当倍率を抽選中…');
            show({...room,result:'ルーレット揃い！ 10〜50倍ルーレット突入！',resultType:'gold'});
            const candidates=[10,15,20,25,30,35,40,45,50]; let rouletteTick=0;
            const rouletteTimer=fastInterval(()=>{const shown=candidates[rouletteTick%candidates.length];setSlotMessage(`🎡 倍率ルーレット回転中… ${shown}倍！？`);playSfx('slotStop',soundOn);rouletteTick++;},125);
            fastTimeout(()=>{window.clearInterval(rouletteTimer);const rouletteMult=ri(10,50);const prize=slotBet*rouletteMult;setSlotMessage(`🎉 倍率決定！ ${rouletteMult}倍！！ +${prize}円 🎉`);playSfx('jackpot',soundOn);setS(x=>({...x,money:x.money+prize}));show({...room,result:`ルーレット配当 ${rouletteMult}倍！ +${prize}円`,resultType:'gold'});setSlotSpinning(false);fastTimeout(()=>setSlotWin(false),2200);},2100);
            return;
          }
          if(mult){playSfx('jackpot',soundOn);setSlotWin(true);setSlotMessage(`✨ ${label}が3つ揃った！ ${mult}倍！ ✨`);setS(x=>({...x,money:x.money+slotBet*mult}));show({...room,result:`${label}揃い！ ${mult}倍 / +${slotBet*mult}円`,resultType:'gold'});fastTimeout(()=>setSlotWin(false),2200);}
          else{playSfx('fail',soundOn);setSlotMessage('残念…今回は3つ揃わなかった');show({...room,result:'ハズレ… 次の勝負へ！',resultType:'neutral'});}
          setSlotSpinning(false);
        },isReach?3820:2820);
      }} isDisabled={casinoSpinsLeft<=0}>スロットを回す</Button>
      <Box bg="blackAlpha.500" border="1px solid" borderColor="purple.500" rounded="xl" p={2.5}>
        <Text fontSize="11px" fontWeight="900" color="purple.200" mb={1.5} textAlign="center">🎰 配当表</Text>
        <Stack spacing={1}>
          {[['🔴 🔴 🔴','ルビー揃い 8%','5倍','red.300'],['🟢 🟢 🟢','エメラルド揃い 5%','10倍','green.300'],['💎 💎 💎','ダイヤモンド揃い 2%','30倍','cyan.200'],['🎡 🎡 🎡','ルーレット揃い 1%','10〜50倍','yellow.200'],['🍀 🍀 🍀','幸運揃い 2.5%','運気 +ベット÷10','green.200'],['⚡ ⚡ ⚡','回数揃い 2.5%','回数 +ベット÷20','orange.200']].map(([icons,name,payout,color])=><Flex key={name as string} px={2} py={1} bg="whiteAlpha.100" rounded="md" align="center"><Text fontSize="11px" minW="82px">{icons}</Text><Text fontSize="9px" color="gray.200" flex="1">{name}</Text><Text fontSize="10px" fontWeight="900" color={color}>{payout}</Text></Flex>)}
          <Text mt={1.5} fontSize="9px" color="gray.400" textAlign="center">ベット：20〜500円 / 20円刻み（上限のみ500円）</Text>
        </Stack>
      </Box>
    </Stack>;
    if(kind==='itembox')return <Stack spacing={2}><Center><Icon as={FaBoxOpen} boxSize={10} color={itemBoxOpening?'yellow.200':'purple.300'} animation={itemBoxOpening?'slotJackpot .35s ease-in-out infinite alternate':undefined}/></Center><Button w="100%" colorScheme="purple" isLoading={itemBoxOpening} loadingText="箱を開封中…" isDisabled={itemBoxOpening} onClick={()=>{if(itemBoxOpening)return;setItemBoxOpening(true);playSfx('roulette',soundOn);show({...room,result:'箱の鍵が外れた… 中身を確認中…',resultType:'neutral'});fastTimeout(()=>{const item=pick([makeItem('mirror',3),makeItem('ring',6),makeItem('sage_gem'),makeItem('party_set'),makeItem('shop_ticket')]);addItem(item);playSfx('item',soundOn);setItemBoxOpening(false);show({...room,kind:undefined,desc:'箱の中から光るアイテムが現れた！',result:`${item.name} を獲得！`,resultType:'gold'});},1200);}}>箱を開ける</Button></Stack>;
    if(kind==='forge'){
      const cap=(it:Item)=>it.id==='mirror'?8:it.id==='ring'?15:(it.id==='money_tree'||it.id==='blessing_charm')?3:null;
      const upgradable=s.items.filter(i=>{const c=cap(i);return c!==null && (i.paramN||1)<c;});
      if(forgeUsed)return <Box p={3} bg="whiteAlpha.100" rounded="lg" border="1px solid" borderColor="green.500"><Text fontSize="sm" fontWeight="900" color="green.200" textAlign="center">この鍛冶屋での強化は完了しました</Text></Box>;
      if(upgradable.length===0)return <Text fontSize="sm" color="gray.200" textAlign="center">強化できるアイテムがありません（上限到達）</Text>;
      return <Stack spacing={1}>{upgradable.map((it,i)=>{const c=cap(it)!;return <Action key={i} title={`${it.name} を無料で強化`} sub={`上限 ★${c} / この部屋では1回だけ`} onClick={()=>{const before=it.paramN||1;const boost=ri(1,3);const after=Math.min(c,before+boost);playSfx('upgrade',soundOn);setS(x=>({...x,items:x.items.map(v=>v===it?makeItem(v.id,after):v)}));setForgeUsed(true);show({...room,result:`${it.name} → ★${after} に強化！${after===c?'（上限）':''}`,resultType:'success'});}}/>})}</Stack>;
    }
    if(kind==='mystery')return <Center w="100%" textAlign="center"><VStack w="100%" maxW="280px" spacing={2}><Text fontSize="xs" color="yellow.200">中身は5種類のうちどれか1つ</Text><Button mx="auto" display="block" w="220px" colorScheme="yellow" color="black" fontWeight="900" onClick={()=>{if(s.money<1000){playSfx('fail',soundOn);show({...room,result:'所持金が足りない…',resultType:'danger'});return;}playSfx('buy',soundOn);setS(x=>({...x,money:x.money-1000}));const reward=pick<Item>([makeItem('ruby',3),makeItem('emerald',3),makeItem('diamond',3),makeItem('mirror',ri(5,8)),makeItem('ring',ri(5,15))]);addItem(reward);playSfx(reward.type==='gem'?'gem':'item',soundOn);show({...room,kind:undefined,result:`落札商品：${reward.name}${reward.type==='gem'?' ×3':''} を獲得！`,resultType:'gold'});}}>商品を買う（1000円）</Button></VStack></Center>;
    if(kind==='survey'){const sv=room.payload as {q:string;a:string;b:string;wa:number;wb:number;genre:string};const vote=(choice:'a'|'b')=>{if(eventAnimating)return;setEventAnimating(true);const va=ri(0,sv.wa),vb=ri(0,sv.wb);const chosenVotes=choice==='a'?va:vb;const otherVotes=choice==='a'?vb:va;const pickedLabel=choice==='a'?sv.a:sv.b;playSfx('click',soundOn);show({...room,result:`女の子「${pickedLabel}なんだね！ ちょっと集計するから待ってて…」`,resultType:'neutral'});window.setTimeout(()=>{playSfx('roulette',soundOn);show({...room,result:`女の子「結果が出たよ！ ${sv.a}は${va}票、${sv.b}は${vb}票！」`,resultType:'neutral'});},900);window.setTimeout(()=>{if(va===vb){playSfx('click',soundOn);show({...room,kind:undefined,result:`女の子「まさかの同票！ 今回は引き分けだね！」 ／ ${sv.a} ${va}票・${sv.b} ${vb}票 ／ 運気変化なし`,resultType:'neutral'});setEventAnimating(false);return;}const win=chosenVotes>otherVotes;const delta=win?ri(8,10):-ri(3,6);patch(current=>({luck:current.luck+delta}));playSfx(win?'success':'fail',soundOn);show({...room,kind:undefined,result:`女の子「${win?'やった！あなたは多数派だよ！':'あらら…少数派だったみたい。'}」 ／ ${sv.a} ${va}票・${sv.b} ${vb}票 ／ 運気 ${delta>0?'+':''}${delta}`,resultType:win?'success':'danger'});setEventAnimating(false);},2800);};return <Stack spacing={2}><Box p={3} bg="pink.950" border="1px solid" borderColor="pink.500" rounded="xl"><HStack align="start" spacing={2}><Center flexShrink={0} w="38px" h="38px" rounded="full" bg="pink.800" border="1px solid" borderColor="pink.300"><Text fontSize="xl">👧</Text></Center><Box flex="1"><Text fontSize="9px" color="pink.200" mb={1}>アンケート娘 / {sv.genre}</Text><Box px={2.5} py={2} bg="whiteAlpha.100" borderRadius="lg" position="relative"><Text fontSize="11px" color="white" fontWeight="800" lineHeight="1.65">「{sv.q}」</Text></Box></Box></HStack>{eventAnimating&&<Text mt={2} fontSize="9px" color="pink.100" textAlign="center">女の子が集計結果を確認しています…</Text>}</Box><Box px={3} py={2} bg="blackAlpha.500" border="1px solid" borderColor="pink.700" rounded="lg"><Text fontSize="9px" color="pink.100" lineHeight="1.6">どちらかを選ぶとアンケート結果を集計。あなたが多数派なら運気 +8〜10、少数派なら運気 -3〜6。同票なら変化なし。</Text></Box><SimpleGrid columns={2} spacing={2}><Button h="48px" colorScheme="pink" variant="outline" isDisabled={eventAnimating} onClick={()=>vote('a')}>{sv.a}</Button><Button h="48px" colorScheme="pink" variant="outline" isDisabled={eventAnimating} onClick={()=>vote('b')}>{sv.b}</Button></SimpleGrid></Stack>;}
    if(kind==='atm'){if(atmDeposit>0)return <Stack spacing={2}><Box p={3} bg="cyan.950" border="1px solid" borderColor="cyan.500" rounded="xl"><Text fontSize="10px" color="cyan.200">前回の預金</Text><Text fontSize="2xl" color="yellow.200" fontWeight="black" textAlign="center">{atmDeposit}円 → {atmDeposit*5}円</Text></Box><Button colorScheme="cyan" onClick={()=>{const pay=atmDeposit*5;patch(current=>({money:current.money+pay}));setAtmDeposit(0);playSfx('jackpot',soundOn);show({...room,kind:undefined,result:`ATM満期：${pay}円を受け取った！`,resultType:'gold'});}}>5倍になったお金を受け取る</Button></Stack>;const amount=Math.max(0,Math.floor(Number(atmInput)||0));return <Stack spacing={2}><Box p={3} bg="cyan.950" border="1px solid" borderColor="cyan.500" rounded="xl"><Text fontSize="10px" color="cyan.100">次にATMへ遭遇すると預けた金額が5倍になります。ゲーム終了で預金は消えます。</Text></Box><Input type="number" min={0} value={atmInput} onChange={e=>setAtmInput(e.target.value)} placeholder={`預ける金額（所持金 ${s.money}円）`} bg="blackAlpha.500"/><HStack><Button flex="1" variant="outline" colorScheme="cyan" onClick={()=>setAtmInput(String(s.money))}>全額</Button><Button flex="2" colorScheme="cyan" isDisabled={amount<=0||amount>s.money} onClick={()=>{patch(current=>({money:current.money-amount}));setAtmDeposit(amount);setAtmInput('');playSfx('coin',soundOn);show({...room,kind:undefined,result:`ATMに${amount}円を預けた。次回は${amount*5}円！`,resultType:'success'});}}>預ける</Button></HStack></Stack>;}
    if(kind==='legendshop'){const goods=[makeItem('yata_mirror'),makeItem('kusanagi'),makeItem('immortal_mag')];return <Stack spacing={2}><Box px={3} py={2} bg="blackAlpha.500" border="1px solid" borderColor="yellow.700" rounded="lg"><Text fontSize="9px" color="yellow.100">この店では神器の購入だけでなく、持っているルビー・エメラルド・ダイヤモンドも売却できます。下のアイテム欄から宝石を選んでください。</Text></Box>{goods.map((it,i)=><Box key={it.id} p={2.5} bg="rgba(44,30,5,.72)" border="1px solid" borderColor="yellow.600" rounded="lg"><Flex align="start" gap={2}><Icon as={it.icon||FaStar} color="yellow.200" mt={1}/><Box flex="1"><Text fontSize="11px" color="yellow.100" fontWeight="900">{it.name} / {it.price}円</Text><Text mt={1} fontSize="9px" color="gray.200" lineHeight="1.55">{it.desc}</Text></Box></Flex><Button mt={2} w="100%" size="sm" colorScheme="yellow" color="black" isDisabled={legendShopUsed||s.money<it.price} onClick={()=>{if(legendShopUsed||s.money<it.price){playSfx('fail',soundOn);return;}if(s.items.length>=3&&it.type!=='gem'){playSfx('click',soundOn);setPendingOverflow(it);setPendingOverflowPurchase({source:'legendshop',cost:it.price});return;}patch(current=>({money:current.money-it.price}));addItem(it);setLegendShopUsed(true);playSfx('jackpot',soundOn);show({...room,result:`${it.name} を購入！ この訪問での購入は完了。`,resultType:'gold'});}}>購入する</Button></Box>)}</Stack>;}
    if(kind==='warp')return <Stack spacing={1.5} w="100%"><Center position="relative" h={{base:'68px',md:'78px'}} overflow="hidden"><Box position="absolute" w={{base:'62px',md:'70px'}} h={{base:'62px',md:'70px'}} rounded="full" bg="conic-gradient(#22d3ee,#8b5cf6,#2563eb,#22d3ee)" opacity={warpAnimating ? .9 : .35} animation={warpAnimating?'warpSpin .45s linear infinite':'none'} boxShadow={warpAnimating?'0 0 30px rgba(34,211,238,.75)':'0 0 14px rgba(34,211,238,.25)'}/><Box position="absolute" w={{base:'42px',md:'48px'}} h={{base:'42px',md:'48px'}} rounded="full" bg="#05060a"/><Text zIndex={2} px={2} fontSize={{base:'9px',md:'10px'}} color="cyan.100" fontWeight="900" textAlign="center">{warpMessage||'ワープ先を選択'}</Text></Center><SimpleGrid columns={{base:1,md:3}} spacing={1.5}>{[['小さなワープホール','0 ～ +100階',0,100],['大きなワープホール','-30 ～ +200階',-30,200],['巨大なワープホール','-300 ～ +800階',-300,800]].map(([title,sub,min,max]:any)=><Button key={title} h={{base:'44px',md:'58px'}} py={1.5} px={2} bg="linear-gradient(180deg,rgba(20,42,52,.94),rgba(5,12,18,.96))" color="cyan.50" border="1px solid rgba(103,232,249,.34)" borderRadius="6px" _hover={{bg:'rgba(8,47,73,.95)',borderColor:'cyan.300'}} isDisabled={warpAnimating} onClick={()=>warp(min,max,title)}><VStack spacing={0}><Text fontSize={{base:'11px',md:'12px'}} fontWeight="900" noOfLines={1}>{title}</Text><Text fontSize={{base:'9px',md:'10px'}} color="cyan.200">{sub}</Text></VStack></Button>)}</SimpleGrid></Stack>;
    if(kind==='auction')return <Stack spacing={1}><Action title="乱反射の鏡★8 / 500円" onClick={()=>buyAuction(makeItem('mirror',8))}/><Action title="幸運の指輪★15 / 500円" onClick={()=>buyAuction(makeItem('ring',15))}/></Stack>;
    if(kind==='ultimate')return <Stack spacing={2}>
      <Box p={2.5} bg="rgba(15,10,2,.72)" border="1px solid" borderColor="yellow.500" rounded="xl">
        <Text fontSize="11px" fontWeight="900" color="yellow.200" textAlign="center" mb={2}>🎡 究極のルーレット 出現内容</Text>
        <SimpleGrid columns={2} spacing={1.5}>
          {[['✨','階数 1.5倍'],['💰','所持金 +5,000円'],['⚡','回数 +5 ＆ 運気 +10'],['💀','地獄の門へ']].map(([ic,txt])=><HStack key={txt} px={2} py={1.5} bg="blackAlpha.500" rounded="md" border="1px solid" borderColor="whiteAlpha.200"><Text>{ic}</Text><Text fontSize="9px" color="gray.100" fontWeight="800">{txt}</Text></HStack>)}
        </SimpleGrid>
        <Text mt={1.5} fontSize="8px" color="yellow.100" textAlign="center">4種類のうち1つが選ばれます</Text>
      </Box>
      <Center position="relative" h="148px" overflow="hidden">
        <Box position="absolute" w="128px" h="128px" rounded="full" bg="conic-gradient(#fde047,#a855f7,#ef4444,#f59e0b,#fde047)" opacity={ultimateSpinning ? .92 : .42} animation={ultimateSpinning?'ultimateWheel .55s linear infinite':'none'} boxShadow={ultimateSpinning?'0 0 42px rgba(250,204,21,.75)':'0 0 18px rgba(250,204,21,.22)'}/>
        <Box position="absolute" w="105px" h="105px" rounded="full" bg="#09070a" border="2px solid" borderColor="yellow.300" boxShadow="inset 0 0 26px rgba(168,85,247,.32)"/>
        {ultimateSpinning&&<><Box position="absolute" w="145px" h="145px" rounded="full" border="2px solid" borderColor="yellow.200" animation="hellRing .8s ease-out infinite"/><Box position="absolute" w="170px" h="170px" rounded="full" border="1px solid" borderColor="purple.300" animation="hellRing 1.05s ease-out .2s infinite"/></>}
        <VStack zIndex={2} spacing={1}><Text fontSize="9px" letterSpacing=".18em" color="yellow.100">DIVINE FATE</Text><Text px={3} textAlign="center" fontSize="sm" fontWeight="black" color="yellow.100" textShadow="0 0 12px rgba(250,204,21,.8)" animation={ultimateSpinning?'ultimateFlash .24s ease-in-out infinite':'none'}>{ultimateMessage}</Text></VStack>
      </Center>
      <Button w="100%" colorScheme="yellow" color="black" h="48px" isDisabled={ultimateSpinning||eventAnimating} isLoading={ultimateSpinning||eventAnimating} loadingText={ultimateSpinning?'神々の運命が回転中…':'結果を刻んでいる…'} onClick={()=>{if(ultimateSpinning||eventAnimating)return;setUltimateSpinning(true);setUltimateMessage('');playSfx('roulette',soundOn);const labels=['✨ 階数 1.5倍！','💰 お金 +5,000円！','⚡ 回数+5 ＆ 運気+10！','💀 地獄の門'];let idx=0;const timer=fastInterval(()=>{setUltimateMessage(labels[idx%labels.length]);playSfx(idx%3===0?'jackpot':'slotStop',soundOn);idx++;},95);fastTimeout(()=>{setUltimateMessage('');playSfx('jackpot',soundOn);},1750);fastTimeout(()=>{window.clearInterval(timer);const r=ri(0,3);const chosen=labels[r];setUltimateMessage(chosen);setUltimateSpinning(false);setEventAnimating(true);playSfx('jackpot',soundOn);window.setTimeout(()=>{if(r===0){const target=Math.max(1,Math.floor(s.floor*1.5));const delta=target-s.floor;setEventAnimating(false);show({...room,result:`究極ルーレット結果：${chosen} / ${target}階へ移動開始！`,resultType:'gold'});fastTimeout(()=>moveByEvent(delta,'究極ルーレット'),350);return;}if(r===1)patch(current=>({money:current.money+5000}));if(r===2)patch(current=>({turnsLeft:current.turnsLeft+5,luck:current.luck+10}));if(r===3){playSfx('hell',soundOn);patch({inHell:true});setRoomIntro(true);setHellDie(null);setHellRolling(false);setHellMessage('「5」が出れば生還。1回振るごとに残り回数を1消費する。');setEventAnimating(false);show({tier:5,title:'地獄の門',desc:'ここは脱出判定専用フロア。サイコロで「5」を出した瞬間だけ地上へ戻れる。失敗しても挑戦は続くが、振るたびに残り回数を1消費する。',result:'脱出条件：5を出せ / 成功率 1/6',resultType:'danger',kind:'hell'});return;}setEventAnimating(false);show({...room,kind:undefined,result:`究極ルーレット結果：${chosen}`,resultType:'gold'});},2000);},2850);}}>運命のルーレットを回す！</Button>
    </Stack>;
    if(kind==='god')return <Stack spacing={1}>{[makeItem('mirror',8),makeItem('ring',15),makeItem('money_tree',3),makeItem('blessing_charm',3)].map((it,i)=><Action key={i} title={it.name} onClick={()=>{playSfx('item',soundOn);addItem(it);show({...room,kind:undefined,result:`${it.name} 獲得！`,resultType:'gold'})}}/>)}</Stack>;
    if(kind==='hell')return <Stack spacing={2}>
      <Box p={3} bg="red.950" border="1px solid" borderColor="red.700" rounded="xl"><Text fontSize="11px" color="red.100" fontWeight="800">💀 脱出ルール</Text><Text mt={1} fontSize="10px" color="red.200">サイコロで「5」が出れば即生還。5以外は失敗。振るたびに残り回数 -1。</Text><HStack mt={2} justify="center"><Badge colorScheme="red">成功率 1 / 6</Badge><Badge colorScheme="orange">残り {s.turnsLeft} 回</Badge></HStack></Box>
      <Center position="relative" h="118px" bg="radial-gradient(circle,rgba(127,29,29,.62),rgba(0,0,0,.78) 72%)" border="2px solid" borderColor={hellRolling?'red.200':'red.800'} rounded="2xl" boxShadow={hellRolling?'0 0 38px rgba(248,113,113,.85), inset 0 0 32px rgba(127,29,29,.65)':'inset 0 0 20px rgba(0,0,0,.6)'} overflow="hidden" animation={hellRolling?'hellShake .14s linear infinite':'none'}>
        {hellRolling&&<><Box position="absolute" w="76px" h="76px" rounded="full" border="2px solid" borderColor="red.300" animation="hellRing .55s ease-out infinite"/><Box position="absolute" w="76px" h="76px" rounded="full" border="1px solid" borderColor="orange.200" animation="hellRing .75s ease-out .15s infinite"/></>}
        <Text zIndex={2} fontSize="6xl" fontWeight="black" color={hellDie===5?'yellow.200':'red.100'} textShadow={hellRolling?'0 0 18px rgba(248,113,113,.9)':'0 0 8px rgba(0,0,0,.8)'} animation={hellRolling?'hellPulse .12s ease-in-out infinite alternate':undefined}>{hellDie??'🎲'}</Text>
      </Center>
      <Text minH="34px" fontSize="xs" color="red.100" textAlign="center" fontWeight="700">{hellMessage}</Text>
      <Button w="100%" h="46px" colorScheme="red" isDisabled={hellRolling||eventAnimating||s.turnsLeft<=0} isLoading={hellRolling} loadingText="地獄のサイコロが暴れている…" onClick={()=>{if(hellRolling||s.turnsLeft<=0)return;setHellRolling(true);setHellMessage('🔥 門が震えている…「5」だけが生還を許される！');playSfx('hell',soundOn);let n=0;const timer=fastInterval(()=>{const d=ri(1,6);setHellDie(d);playSfx(n%3===0?'roulette':'slotStop',soundOn);n++;if(n===9)setHellMessage('⚠️ 最終判定が近い…！');},70);fastTimeout(()=>{window.clearInterval(timer);setHellMessage('……出目、確定。');playSfx('hell',soundOn);},1250);fastTimeout(()=>{const roll=ri(1,6);setHellDie(roll);setHellRolling(false);setS(x=>({...x,turnsLeft:Math.max(0,x.turnsLeft-1)}));if(roll===5){setEventAnimating(true);setHellMessage('🔥 5……！ 門が大きく震え始めた……');playSfx('hell',soundOn);window.setTimeout(()=>{playSfx('jackpot',soundOn);setHellMessage('🔥 門が砕けるように開いた！ 生還成功！');setS(x=>({...x,inHell:false}));setEventAnimating(false);show({tier:1,title:'地獄から生還',desc:'5を引き当て、閉ざされていた門が開いた。元の世界へ帰還した。',result:'5が出た！ 生還成功！',resultType:'success'});},1300);}else{playSfx('fail',soundOn);setHellMessage(`${roll}…！ 門は開かない。5を出すまで脱出できない。`);show({...room,result:`出目 ${roll}：脱出失敗（5のみ成功）`,resultType:'danger'});}},1600);}}>サイコロを振る（回数 -1）</Button>
      {s.turnsLeft<=0&&<Text fontSize="10px" color="orange.200" textAlign="center">残り回数が0です。下の「ゲームを終了する」からリザルトへ進めます。</Text>}
    </Stack>;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[room,s,rocks,picks,shop,bj,slotBet,slot,slotSpinning,slotWin,slotMessage,casinoSpinsLeft,soundOn,doorChoices,gameSpeed,forgeUsed,fortuneReading,boxRewards,boxSelected,boxRevealAll,itemBoxOpening,ultimateSpinning,ultimateMessage,bjPhase,eventAnimating,atmDeposit,atmInput,legendShopUsed,warpAnimating,warpMessage,scratchOutcome,scratchRevealed,scratchPaid,fateStage,fatePending,fateDone,pirateBoxes,piratePicks,pirateRevealAll,keys,vaultOpeningKey,vaultPhase,itemGrantQueue]);

  const roomIdentity=useMemo(()=>{
    const k=room.kind||''; const t=room.title;
    if(k==='hell')return {icon:FaSkull,color:'red.300',glow:'rgba(239,68,68,.45)'};
    if(k==='casino')return {icon:FaStar,color:'purple.200',glow:'rgba(168,85,247,.45)'};
    if(k==='blackjack')return {icon:FaGift,color:'teal.200',glow:'rgba(20,184,166,.40)'};
    if(k==='forge')return {icon:FaHammer,color:'orange.200',glow:'rgba(251,146,60,.40)'};
    if(k==='barter')return {icon:FaCoins,color:'teal.200',glow:'rgba(45,212,191,.35)'};
    if(k==='crossroads')return {icon:FaDoorClosed,color:'blue.200',glow:'rgba(96,165,250,.35)'};
    if(k==='vending')return {icon:FaSackDollar,color:'green.200',glow:'rgba(74,222,128,.35)'};
    if(k==='fortune')return {icon:FaWandMagicSparkles,color:'purple.200',glow:'rgba(168,85,247,.45)'};
    if(k==='mining')return {icon:FaHammer,color:room.tier===4?'cyan.200':room.tier===3?'green.200':'red.300',glow:'rgba(34,211,238,.32)'};
    if(k==='shop')return {icon:FaStore,color:'yellow.200',glow:'rgba(250,204,21,.35)'};
    if(k==='auction'||k==='mystery')return {icon:FaGavel,color:'yellow.200',glow:'rgba(250,204,21,.4)'};
    if(k==='itembox'||k==='boxes'||t.includes('宝箱'))return {icon:FaBoxOpen,color:'purple.200',glow:'rgba(192,132,252,.4)'};
    if(k==='ultimate')return {icon:FaStar,color:'yellow.200',glow:'rgba(250,204,21,.55)'};
    if(k==='god'||k==='altar')return {icon:FaSun,color:'yellow.100',glow:'rgba(253,224,71,.45)'};
    if(k==='warp')return {icon:FaWandMagicSparkles,color:'cyan.200',glow:'rgba(34,211,238,.45)'};
    if(k==='atm')return {icon:FaCoins,color:'cyan.200',glow:'rgba(34,211,238,.42)'};
    if(k==='survey')return {icon:FaHeart,color:'pink.200',glow:'rgba(244,114,182,.42)'};
    if(k==='legendshop')return {icon:FaSun,color:'yellow.100',glow:'rgba(250,204,21,.55)'};
    if(k==='scratch'||k==='pirate'||k==='sealedvault')return {icon:FaBoxOpen,color:'yellow.200',glow:'rgba(250,204,21,.35)'};
    if(k==='fatedoor')return {icon:FaDoorClosed,color:'purple.200',glow:'rgba(168,85,247,.40)'};
    if(k==='heavenstairs')return {icon:FaArrowUp,color:'yellow.100',glow:'rgba(255,255,255,.45)'};
    if(k==='doors')return {icon:FaDoorClosed,color:'orange.200',glow:'rgba(251,146,60,.35)'};
    if(t.includes('階段'))return {icon:FaArrowUp,color:'blue.200',glow:'rgba(96,165,250,.35)'};
    if(t.includes('何も無い'))return {icon:FaDoorClosed,color:'gray.300',glow:'rgba(148,163,184,.22)'};
    if(t.includes('湯'))return {icon:FaHotTubPerson,color:'cyan.200',glow:'rgba(34,211,238,.35)'};
    if(t.includes('財布')||t.includes('販売'))return {icon:FaSackDollar,color:'yellow.200',glow:'rgba(250,204,21,.35)'};
    if(t.includes('ラッキー')||t.includes('運命'))return {icon:FaStar,color:'green.200',glow:'rgba(74,222,128,.35)'};
    return {icon:FaElevator,color:'cyan.200',glow:'rgba(0,240,255,.20)'};
  },[room]);

  const selectedItem=selected===null?null:s.items[selected];

  const activeStageImage=useMemo(()=>stageCatalog.find(stage=>stage.title===room.title)?.image||null,[room.title]);
  const activeStageImageUrl=activeStageImage?`${process.env.NEXT_PUBLIC_BASE_PATH||''}/${activeStageImage}`:null;

  const roomAtmosphere=useMemo(()=>{
    const k=room.kind||''; const t=room.title;
    if(k==='hell'||s.inHell)return {bg:'radial-gradient(circle at 50% 25%, rgba(127,29,29,.75), transparent 38%), linear-gradient(180deg,#300505 0%,#090000 70%,#000 100%)',accent:'rgba(248,113,113,.22)',label:''};
    if(k==='god')return {bg:'radial-gradient(circle at 50% 15%, rgba(255,255,255,.72), rgba(250,204,21,.30) 25%, transparent 55%), linear-gradient(180deg,#6b4d13 0%,#2b2208 38%,#090b10 100%)',accent:'rgba(253,224,71,.28)',label:''};
    if(k==='ultimate')return {bg:'conic-gradient(from 0deg at 50% 50%,rgba(250,204,21,.22),rgba(168,85,247,.18),rgba(239,68,68,.18),rgba(250,204,21,.22)), radial-gradient(circle,#422006,#090b10 68%)',accent:'rgba(250,204,21,.22)',label:''};
    if(k==='casino')return {bg:'radial-gradient(circle at 20% 15%,rgba(236,72,153,.25),transparent 32%),radial-gradient(circle at 80% 25%,rgba(139,92,246,.30),transparent 34%),linear-gradient(160deg,#180a2c,#080510 70%)',accent:'rgba(192,132,252,.20)',label:''};
    if(k==='blackjack')return {bg:'radial-gradient(circle at center,rgba(13,148,136,.20),transparent 45%),linear-gradient(180deg,#062b25,#06100f 70%,#020505)',accent:'rgba(45,212,191,.16)',label:''};
    if(k==='mining')return {bg:room.tier===4?'radial-gradient(circle at 50% 35%,rgba(34,211,238,.22),transparent 35%),linear-gradient(145deg,#10242c,#090d11 70%)':room.tier===3?'radial-gradient(circle at 50% 35%,rgba(52,211,153,.18),transparent 35%),linear-gradient(145deg,#10251e,#080d0a 70%)':'radial-gradient(circle at 50% 35%,rgba(248,113,113,.18),transparent 35%),linear-gradient(145deg,#271414,#0d0909 70%)',accent:'rgba(148,163,184,.12)',label:''};
    if(k==='fortune')return {bg:'radial-gradient(circle at 50% 30%,rgba(192,132,252,.26),transparent 35%),radial-gradient(circle at 15% 15%,rgba(255,255,255,.10),transparent 2%),linear-gradient(180deg,#24103c,#080710 75%)',accent:'rgba(192,132,252,.18)',label:''};
    if(k==='altar')return {bg:'radial-gradient(circle at 50% 30%,rgba(253,224,71,.20),transparent 38%),linear-gradient(180deg,#2d2510,#0b0a06 72%)',accent:'rgba(253,224,71,.14)',label:''};
    if(k==='warp')return {bg:'radial-gradient(circle at center,rgba(34,211,238,.30),rgba(168,85,247,.15) 32%,transparent 55%),linear-gradient(180deg,#071b2a,#0a0714 75%)',accent:'rgba(34,211,238,.18)',label:''};
    if(k==='atm')return {bg:'radial-gradient(circle at 50% 45%,rgba(34,211,238,.28),transparent 42%),linear-gradient(180deg,#0b2531,#071014 75%)',accent:'rgba(34,211,238,.20)',label:''};
    if(k==='survey')return {bg:'radial-gradient(circle at 50% 42%,rgba(244,114,182,.25),transparent 42%),linear-gradient(180deg,#32172a,#0d0810 75%)',accent:'rgba(244,114,182,.18)',label:''};
    if(k==='scratch')return {bg:'radial-gradient(circle at 50% 40%,rgba(250,204,21,.24),transparent 42%),linear-gradient(180deg,#33230c,#0b0804 75%)',accent:'rgba(250,204,21,.16)',label:''};
    if(k==='fatedoor')return {bg:'radial-gradient(circle at 50% 36%,rgba(168,85,247,.28),transparent 42%),linear-gradient(180deg,#28133f,#09070e 75%)',accent:'rgba(192,132,252,.18)',label:''};
    if(k==='pirate')return {bg:'radial-gradient(circle at 50% 25%,rgba(251,146,60,.22),transparent 42%),linear-gradient(180deg,#30200e,#0b0906 75%)',accent:'rgba(251,146,60,.16)',label:''};
    if(k==='sealedvault')return {bg:'radial-gradient(circle at 50% 38%,rgba(250,204,21,.30),transparent 44%),linear-gradient(180deg,#3a2a0b,#0b0905 75%)',accent:'rgba(250,204,21,.20)',label:''};
    if(k==='heavenstairs')return {bg:'radial-gradient(circle at 50% 8%,rgba(255,255,255,.62),rgba(250,204,21,.18) 30%,transparent 56%),linear-gradient(180deg,#49628a,#111827 76%)',accent:'rgba(255,255,255,.20)',label:''};
    if(k==='legendshop')return {bg:'radial-gradient(circle at 50% 20%,rgba(250,204,21,.36),transparent 42%),linear-gradient(180deg,#4b320b,#120b04 75%)',accent:'rgba(250,204,21,.22)',label:''};
    if(k==='shop')return {bg:'radial-gradient(circle at 50% 10%,rgba(250,204,21,.16),transparent 32%),linear-gradient(180deg,#252010,#0d0c08 75%)',accent:'rgba(250,204,21,.10)',label:''};
    if(k==='forge')return {bg:'radial-gradient(circle at 50% 60%,rgba(251,146,60,.28),transparent 38%),linear-gradient(180deg,#26130a,#0d0805 75%)',accent:'rgba(251,146,60,.16)',label:''};
    if(t.includes('湯'))return {bg:'radial-gradient(circle at 50% 70%,rgba(103,232,249,.22),transparent 42%),linear-gradient(180deg,#10252d,#081014 75%)',accent:'rgba(103,232,249,.12)',label:''};
    if(t.includes('ラッキー'))return {bg:'radial-gradient(circle at center,rgba(74,222,128,.22),transparent 42%),linear-gradient(180deg,#0d2819,#080d0a 75%)',accent:'rgba(74,222,128,.12)',label:''};
    if(room.tier===4)return {bg:'radial-gradient(circle at center,rgba(248,113,113,.18),transparent 45%),linear-gradient(180deg,#2a1010,#0d0909 75%)',accent:'rgba(248,113,113,.12)',label:''};
    if(room.tier===5)return {bg:'radial-gradient(circle at center,rgba(250,204,21,.24),transparent 44%),linear-gradient(180deg,#33260b,#0d0b06 75%)',accent:'rgba(250,204,21,.14)',label:''};
    return {bg:tierMeta[Math.min(4,Math.max(0,room.tier-1))].bg,accent:'rgba(255,255,255,.05)',label:''};
  },[room,s.inHell]);

  const resultColor=room.resultType==='success'?'green':room.resultType==='danger'?'red':room.resultType==='gold'?'yellow':'gray';
  const tier=tierMeta[Math.min(4,Math.max(0,room.tier-1))];
  const finalMode=s.turnsLeft<=0 && !moving && !gameover;
  const disabled=finalMode ? (moving||gameover||slotSpinning||bj.playing) : (moving||gameover||slotSpinning||bj.playing||s.inHell);

  // 開発者AUTO: 演出中は待機し、会話は自動で送り、操作不要の部屋だけ次のボタンを押す。
  // interactive が存在する部屋（ショップ・選択イベント等）は意図しない選択を避けるため自動操作しない。
  useEffect(()=>{
    if(!masterActive||!devAutoPlay||menu||gameover||battleRunFinished)return;
    if(moving||eventAnimating||floorTransition.show||overlay.show||slotSpinning||bj.playing)return;
    const timer=window.setTimeout(()=>{
      if(roomIntro){setRoomIntro(false);return;}
      if(interactive||s.inHell)return;
      if(finalMode){end();return;}
      press();
    },Math.max(120,420/gameSpeed));
    return ()=>window.clearTimeout(timer);
  // press/end は最新stateを参照するため、進行状態が変わるたびに再評価する。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[masterActive,devAutoPlay,menu,gameover,battleRunFinished,moving,eventAnimating,floorTransition.show,overlay.show,slotSpinning,bj.playing,roomIntro,interactive,s.inHell,finalMode,gameSpeed,room.title,s.floor,s.turnsLeft]);

  // 開発者プレイを終了したら、専用機能が通常プレイへ残らないよう初期化する。
  useEffect(()=>{
    if(masterActive)return;
    if(devAutoPlay)setDevAutoPlay(false);
    if(gameSpeed===3)setGameSpeed(1);
  },[masterActive,devAutoPlay,gameSpeed]);

  const scoreHasSaveTarget=Boolean(scorePreview&&(scorePreview.monthly.eligible||scorePreview.alltime.eligible));
  // 登録可否は端末内の総合最高記録ではなく、月間/総合ランキングそれぞれの自己ベスト更新で判定する。
  const scoreCanRegister=firebaseReady?scoreHasSaveTarget:newPersonalBest;
  const scoreRegistrationDisabled=!scoreCanRegister||scoreSubmitted||scoreSubmitting||scorePreviewLoading;
  const handleButtonSound=(e:React.MouseEvent)=>{const el=e.target as HTMLElement;if(el.closest('button'))playSfx('click',soundOn);};

  return <><style>{`@keyframes fateDoorOpen{0%{transform:perspective(600px) rotateY(0deg)}100%{transform:perspective(600px) rotateY(-82deg);filter:brightness(1.35)}}@keyframes vaultChestShake{0%,100%{transform:translateX(0) rotate(0deg)}25%{transform:translateX(-4px) rotate(-1deg)}75%{transform:translateX(4px) rotate(1deg)}}@keyframes vaultChestGlow{from{transform:scale(.98);filter:brightness(1)}to{transform:scale(1.04);filter:brightness(1.55)}}@keyframes vaultChestOpen{0%{transform:scale(1);filter:brightness(1)}55%{transform:scale(1.08);filter:brightness(1.9)}100%{transform:scale(1.03);filter:brightness(1.35)}}@keyframes vaultChestLidOpen{0%{transform:perspective(420px) rotateX(0deg) translateY(0)}45%{transform:perspective(420px) rotateX(-42deg) translateY(-5px)}100%{transform:perspective(420px) rotateX(-108deg) translateY(-16px)}}@keyframes vaultLightBurst{from{opacity:.45;transform:scaleX(.8)}to{opacity:1;transform:scaleX(1.25)}}@keyframes cathedralFlicker{0%,100%{opacity:.3}50%{opacity:.62}}@keyframes steelSweep{0%{transform:translateX(-160%)}100%{transform:translateX(160%)}}@keyframes elevatorAura{from{transform:scale(.9);opacity:.45}to{transform:scale(1.08);opacity:1}}@keyframes hypeBlink{0%,45%{opacity:1}46%,100%{opacity:.35}}@keyframes hellPulse{from{transform:scale(.9) rotate(-7deg)}to{transform:scale(1.10) rotate(7deg)}}@keyframes hellShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@keyframes hellRing{0%{transform:scale(.55) rotate(0deg);opacity:.9}100%{transform:scale(1.55) rotate(220deg);opacity:0}}@keyframes revealPulse{from{transform:scale(.96);filter:brightness(.95)}to{transform:scale(1.06);filter:brightness(1.35)}}@keyframes ultimateWheel{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes floorTravel{0%{transform:translateY(26px) scale(.92);opacity:0}35%{opacity:1}70%{transform:translateY(-10px) scale(1.04);opacity:1}100%{transform:translateY(-34px) scale(1.08);opacity:0}}@keyframes floorLines{from{background-position:0 0}to{background-position:0 120px}}@keyframes warpSpin{0%{transform:rotate(0deg) scale(.85);filter:brightness(1)}50%{transform:rotate(180deg) scale(1.08);filter:brightness(1.8)}100%{transform:rotate(360deg) scale(.85);filter:brightness(1)}}@keyframes elevatorShaftScroll{0%{transform:translateY(-80px)}100%{transform:translateY(80px)}}@keyframes elevatorCabinFloat{0%,100%{transform:translateY(4px)}50%{transform:translateY(-5px)}}@keyframes elevatorArrowRise{0%{opacity:0;transform:translateY(16px)}45%{opacity:1}100%{opacity:0;transform:translateY(-18px)}}@keyframes ultimateFlash{0%,100%{opacity:.45;filter:brightness(1)}50%{opacity:1;filter:brightness(1.8)}}@keyframes slotJackpot{from{transform:scale(.96);filter:brightness(.9)}to{transform:scale(1.04);filter:brightness(1.35)}}@keyframes slotHeat{0%,100%{filter:brightness(1);box-shadow:0 0 8px rgba(168,85,247,.35)}50%{filter:brightness(1.7);box-shadow:0 0 28px rgba(244,63,94,.82)}}@keyframes slotShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}@keyframes reachPulse{from{transform:scale(.98);filter:brightness(1)}to{transform:scale(1.035);filter:brightness(1.45)}}@keyframes rareArrival{0%{opacity:0;transform:scale(.72)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.24)}}@keyframes rareRing{0%{opacity:0;transform:scale(.35)}35%{opacity:.95}100%{opacity:0;transform:scale(1.65)}}@keyframes rareSpark{0%{opacity:0;transform:translateY(18px) scale(.6)}35%{opacity:1}100%{opacity:0;transform:translateY(-44px) scale(1.15)}}`}</style><Center h="100dvh" w="100vw" minH={0} p={0} overflow="hidden" bg="#020304">
    <Box onClickCapture={handleButtonSound} w="100vw" maxW="100vw" h="100dvh" maxH="100dvh" bg="#06080a" borderRadius={0} overflow="hidden" position="relative" borderWidth={0} boxShadow="none">
      {menu&&<Flex position="absolute" inset={0} zIndex={40} bgImage={{base:`linear-gradient(180deg,rgba(0,0,0,.24) 0%,rgba(0,0,0,.10) 30%,rgba(2,3,4,.48) 56%,rgba(2,3,4,.84) 76%,#020304 100%), url("${menuVisualSrc}")`,lg:`linear-gradient(180deg,rgba(0,0,0,.18) 0%,rgba(0,0,0,.08) 26%,rgba(2,3,4,.38) 54%,rgba(2,3,4,.76) 78%,#020304 100%), url("${menuVisualSrcPc}")`}} bgSize="cover" bgRepeat="no-repeat" bgPosition={{base:'center center',lg:'center top'}} bgColor="#020304" direction="column" overflow="hidden">
        <Box position="absolute" inset={0} pointerEvents="none" bg="radial-gradient(circle at 50% 12%, rgba(255,255,255,.18), transparent 28%), linear-gradient(90deg,rgba(0,0,0,.52),transparent 18%,transparent 82%,rgba(0,0,0,.52))"/>
        <Box position="absolute" top={0} left="50%" transform="translateX(-50%)" w={{base:'54%',md:'46%'}} h="68%" pointerEvents="none" bg="linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.04) 34%,transparent 82%)" filter="blur(12px)" opacity={.54}/>
        <IconButton position="absolute" top={3} right={3} zIndex={2} aria-label="スタートBGM" size="sm" variant="outline" bg="rgba(4,5,6,.62)" borderColor="rgba(235,232,221,.32)" color={soundOn?'#eee9df':'gray.500'} icon={soundOn?<FaVolumeHigh/>:<FaVolumeXmark/>} _hover={{bg:'rgba(90,20,26,.72)'}} onClick={()=>setSoundOn(v=>!v)}/>
        <Box position="absolute" top={{base:4,lg:5}} left={{base:4,lg:5}} zIndex={2} px={3} py={2} bg="rgba(5,6,7,.70)" borderTop="1px solid rgba(224,222,214,.30)" borderBottom="1px solid rgba(224,222,214,.15)" backdropFilter="blur(6px)">
          <HStack spacing={2}><Icon as={FaTrophy} color="#b7aa89"/><Text fontSize="10px" letterSpacing=".12em" color="rgba(235,232,222,.72)" fontWeight="bold">自己最高記録</Text></HStack>
          <Text mt={1} fontFamily="heading" fontSize="2xl" color="#eee9df" fontWeight="700" textShadow="0 0 12px rgba(255,255,255,.16)">{s.highScore} 階</Text>
          <Text mt={1.5} maxW={{base:'220px',md:'280px'}} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontSize={{base:'10px',md:'11px'}} color="rgba(235,232,222,.78)">プレイヤー：{nickname||'名無しの登山者'}</Text>
          <Flex mt={2} gap={2} wrap="wrap" align="stretch">
            <Button h={{base:'32px',md:'34px'}} minW="0" px={{base:2.5,md:3}} size="sm" bg="rgba(20,22,26,.94)" color="#f2eee5" border="1px solid rgba(218,216,208,.38)" borderRadius="3px" fontSize={{base:'10px',md:'11px'}} fontWeight="800" boxShadow="0 5px 14px rgba(0,0,0,.28)" _hover={{bg:'rgba(58,22,27,.96)',borderColor:'rgba(190,79,87,.82)',color:'white'}} onClick={()=>{setNameDraft(nickname||'名無しの登山者');nameEdit.onOpen();}}>名前を変更</Button>
            <Button h={{base:'32px',md:'34px'}} minW="0" px={{base:2.5,md:3}} size="sm" bg="rgba(20,22,26,.94)" color="#f2eee5" border="1px solid rgba(218,216,208,.38)" borderRadius="3px" fontSize={{base:'10px',md:'11px'}} fontWeight="800" boxShadow="0 5px 14px rgba(0,0,0,.28)" _hover={{bg:'rgba(58,22,27,.96)',borderColor:'rgba(190,79,87,.82)',color:'white'}} onClick={()=>{setLocalPlayHistory(loadPlayHistory());historyModal.onOpen();}}>過去の記録</Button>
            <Button h={{base:'32px',md:'34px'}} minW="0" px={{base:2.5,md:3}} size="sm" bg="rgba(47,14,18,.94)" color="#ffd9dc" border="1px solid rgba(190,79,87,.62)" borderRadius="3px" fontSize={{base:'10px',md:'11px'}} fontWeight="800" boxShadow="0 5px 14px rgba(0,0,0,.28)" _hover={{bg:'rgba(88,24,31,.98)',borderColor:'rgba(235,110,120,.9)',color:'white'}} onClick={resetRecords.onOpen}>記録をリセット</Button>
          </Flex>
        </Box>

        <Flex mt="auto" px={{base:4,md:8,lg:16}} pb={{base:5,md:7,lg:8}} minH="0" justify="center" align="flex-end">
          <Box w="100%" maxW={{base:'100%',md:'560px',lg:'680px'}} bg="linear-gradient(180deg,rgba(8,9,11,.78),rgba(4,5,6,.90))" border="1px solid rgba(218,216,208,.26)" borderRadius="8px" boxShadow="0 18px 48px rgba(0,0,0,.48)" p={{base:3,md:4}} backdropFilter="blur(9px)">
            <Center>
              <Box position="relative" w="100%" maxW="320px">
              <Button mx="auto" display="flex" w="calc(100% - 40px)" maxW="280px" h="56px" bg={developerMode?'linear-gradient(180deg,#49350c,#161007)':'linear-gradient(180deg,#17191c,#090a0c)'} color={developerMode?'#fff2bd':'#f1eee6'} border="1px solid" borderColor={developerMode?'rgba(250,204,21,.72)':'rgba(232,229,220,.46)'} borderRadius="2px" fontFamily="heading" letterSpacing={developerMode?'.10em':'.16em'} fontSize={developerMode?'sm':'md'} leftIcon={<FaPlay/>} boxShadow={developerMode?'inset 0 1px rgba(255,255,255,.08),0 0 24px rgba(250,204,21,.16)':'inset 0 1px rgba(255,255,255,.06),0 10px 28px rgba(0,0,0,.55)'} _hover={{bg:developerMode?'linear-gradient(180deg,#6a4b0b,#201508)':'linear-gradient(180deg,#3a171b,#12090b)',borderColor:developerMode?'#facc15':'#b8565c',color:'white'}} _active={{transform:'translateY(1px)'}} onClick={()=>developerMode?startMasterRun():start()}>{developerMode?'開発設定でゲームを始める':'ゲームを始める'}</Button>
              <Box aria-hidden="true" position="absolute" top="0" right="0" w="28px" h="56px" opacity={0} cursor="default" onClick={(e)=>{e.stopPropagation();setDeveloperMode(v=>!v);}}/>
              </Box>
            </Center>
            {developerMode&&<Box mt={2.5} maxH={{base:'34vh',md:'42vh'}} overflowY="auto" px={2.5} py={2.5} bg="rgba(36,27,7,.88)" border="1px solid rgba(250,204,21,.42)" borderRadius="6px" boxShadow="inset 0 0 28px rgba(250,204,21,.04)">
              <HStack mb={2} justify="space-between"><HStack><Badge colorScheme="yellow" color="black" fontSize="9px">開発者モード</Badge><Text fontSize="9px" color="yellow.100">ゲーム設定を直接変更できます</Text></HStack><Button size="xs" h="24px" variant="outline" colorScheme="yellow" onClick={()=>setDeveloperMode(false)}>通常モードへ</Button></HStack>
              <SimpleGrid columns={{base:2,md:4}} spacing={1.5}>
                {[["開始階",masterFloor,setMasterFloor],["運気",masterLuck,setMasterLuck],["残り回数",masterTurns,setMasterTurns],["所持金",masterMoney,setMasterMoney]].map(([label,value,setter]:any)=><Box key={label}><Text fontSize="8px" color="yellow.100">{label}</Text><Input size="sm" h="32px" type="number" value={value} onChange={e=>setter(Number(e.target.value))} bg="rgba(0,0,0,.38)" borderColor="rgba(250,204,21,.25)"/></Box>)}
              </SimpleGrid>
              <Box mt={2}><Text mb={1} fontSize="8px" color="yellow.100">開始ステージ</Text><Select size="sm" h="32px" value={masterStartStage} onChange={e=>setMasterStartStage(e.target.value)} bg="#17130a" borderColor="rgba(250,204,21,.25)">{stageCatalog.map(stage=><option key={stage.title} value={stage.title}>{stage.label?`[${stage.label}] `:''}{stage.title}</option>)}</Select></Box>
              <Box mt={2}><Text mb={1} fontSize="8px" color="yellow.100">所持アイテム（3枠）</Text><Stack spacing={1}>{masterItems.map((slot,i)=><HStack key={i} spacing={1}><Select size="sm" h="30px" value={slot.id} onChange={e=>setMasterItems(v=>v.map((x,j)=>j===i?{...x,id:e.target.value as ItemId|''}:x))} bg="#17130a" borderColor="rgba(250,204,21,.22)"><option value="">なし</option>{masterItemIds.map(id=><option key={id} value={id}>{makeItem(id,1).name.replace('★1','')}</option>)}</Select><Input size="sm" h="30px" w="72px" type="number" min={1} value={slot.n} onChange={e=>setMasterItems(v=>v.map((x,j)=>j===i?{...x,n:Math.max(1,Number(e.target.value)||1)}:x))} bg="rgba(0,0,0,.38)" borderColor="rgba(250,204,21,.22)"/></HStack>)}</Stack></Box>
              <Box mt={2}><Text mb={1} fontSize="8px" color="yellow.100">次回以降の部屋</Text><HStack spacing={1}><Select size="sm" h="30px" value={masterQueueDraft} onChange={e=>setMasterQueueDraft(e.target.value)} bg="#17130a" borderColor="rgba(250,204,21,.22)"><option value="">部屋を選択</option>{stageCatalog.filter(x=>x.title!=='エレベーターホール').map(stage=><option key={stage.title} value={stage.title}>{stage.title}</option>)}</Select><Button size="xs" h="30px" colorScheme="yellow" color="black" isDisabled={!masterQueueDraft} onClick={()=>{if(masterQueueDraft){setMasterNextStages(v=>[...v,masterQueueDraft]);setMasterQueueDraft('');}}}>追加</Button></HStack>{masterNextStages.length>0&&<HStack mt={1} spacing={1} overflowX="auto">{masterNextStages.map((title,i)=><Badge key={`${title}-${i}`} flexShrink={0} colorScheme="yellow">{i+1}. {title}</Badge>)}<Button size="xs" h="22px" flexShrink={0} variant="ghost" colorScheme="red" onClick={()=>setMasterNextStages([])}>全解除</Button></HStack>}</Box>
              <Text mt={2} fontSize="8px" color="yellow.200">開発者モードのプレイは最高記録・履歴・ランキングへ保存されません。ステージ図鑑では任意ステージから直接開始できます。</Text>
            </Box>}
            <SimpleGrid mt={2.5} columns={{base:2,lg:6}} spacing={{base:1.5,lg:2}}>{[[FaTrophy,'コンピュータ戦',()=>{computerBattleMenu.onOpen();}],[FaRankingStar,'ランキング',openRanking],[FaBolt,'オンライン対戦',()=>{setBattleError('');setBattleCodeInput('');battleLobby.onOpen();}],[FaCircleQuestion,'ルール説明',rules.onOpen],[FaBookOpen,'ステージ図鑑',guide.onOpen],[FaGem,'アイテム図鑑',itemGuide.onOpen]].map(([ic,label,fn]:any)=><Button key={label} size="sm" minH="42px" bg="rgba(7,8,10,.78)" color="rgba(237,234,225,.84)" border="1px solid rgba(180,184,186,.24)" borderRadius="2px" leftIcon={<Icon as={ic}/>} fontFamily="heading" fontSize="11px" letterSpacing=".08em" _hover={{bg:'rgba(54,18,22,.88)',borderColor:'rgba(174,66,74,.75)',color:'white'}} onClick={fn}>{label}</Button>)}</SimpleGrid>
          </Box>
        </Flex>
      </Flex>}

      <Flex h="100%" direction="column" position="relative" overflow="hidden" bg={roomAtmosphere.bg} bgImage={activeStageImageUrl?`linear-gradient(180deg,rgba(2,4,6,.16),rgba(2,4,6,.36)), url("${activeStageImageUrl}")`:undefined} bgSize="cover" bgPosition="center center" bgRepeat="no-repeat" bgAttachment="scroll">
        <Box position="absolute" inset={0} pointerEvents="none" bg="linear-gradient(180deg,rgba(0,0,0,.20) 0%,rgba(0,0,0,.12) 20%,rgba(0,0,0,.10) 44%,rgba(0,0,0,.12) 64%,rgba(0,0,0,.22) 100%)"/>
        <Box position="absolute" inset={0} pointerEvents="none" bg="linear-gradient(90deg,rgba(0,0,0,.46),transparent 18%,transparent 82%,rgba(0,0,0,.46))"/>
        <Box position="absolute" top="-8%" left="50%" transform="translateX(-50%)" w="46%" h="74%" pointerEvents="none" bg="linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.03) 38%,transparent 90%)" filter="blur(12px)" opacity={.52} animation="cathedralFlicker 5s ease-in-out infinite"/>
        <Box position="absolute" inset={0} pointerEvents="none" opacity={.24} bgImage={`repeating-linear-gradient(90deg, transparent 0 35px, rgba(170,174,176,.05) 36px 37px),repeating-linear-gradient(0deg, transparent 0 70px, ${roomAtmosphere.accent} 71px 72px)`}/>
        <Box position="absolute" top={{base:2,md:3}} left={{base:2,md:3}} zIndex={25} w={{base:'calc(100% - 16px)',md:'min(760px, calc(100% - 24px))'}} maxW="760px" px={{base:1.5,md:3}} py={{base:1,md:2}} bg="rgba(4,6,8,.78)" backdropFilter="blur(9px)" border="1px solid" borderColor={masterActive?'rgba(250,204,21,.48)':'rgba(218,216,208,.24)'} borderRadius="10px" boxShadow={masterActive?'0 12px 30px rgba(0,0,0,.38),0 0 20px rgba(250,204,21,.08)':'0 12px 30px rgba(0,0,0,.38)'}>
          <VStack spacing={{base:.75,md:1.5}} align="stretch">
            <Grid
              templateColumns={{base:'minmax(0,1fr) auto',md:'118px minmax(0,1fr) auto'}}
              templateAreas={{base:'"floor controls" "stats stats"',md:'"floor stats controls"'}}
              columnGap={{base:2,md:2.5}}
              rowGap={{base:.75,md:0}}
              alignItems="center"
              w="100%"
              minW={0}
            >
              <HStack gridArea="floor" minW={0} spacing={1.5} pr={{base:0,md:2}} borderRight={{base:'none',md:'1px solid rgba(255,255,255,.14)'}}>
                <Box minW={0}><Text fontSize={{base:'7px',md:'9px'}} color="gray.400" fontWeight="700">CURRENT FLOOR</Text><HStack spacing={1}><Text fontFamily="mono" fontSize={{base:'lg',md:'3xl'}} color="#f2eee5" fontWeight="900" noOfLines={1}>{s.floor}</Text><Text fontSize="9px" color="gray.300">F</Text></HStack></Box>
              </HStack>
              <Grid gridArea="stats" templateColumns="minmax(0,.82fr) minmax(0,.82fr) minmax(0,1.36fr)" gap={{base:1,md:1.5}} minW={0} w="100%">
                {[[FaBolt,'残り',s.turnsLeft,'yellow.300','turns'],[FaStar,'運気',s.luck,'green.300','luck'],[FaCoins,'所持金',s.money,'yellow.200','money']].map(([ic,l,v,c,key]:any)=>{const moneyText=key==='money'?`${Number(v).toLocaleString('ja-JP')}円`:'';const moneyLen=moneyText.length;return <Button key={l} minW={0} w="100%" h={{base:'38px',md:'52px'}} px={{base:key==='money'?1.5:1,md:key==='money'?2.5:2}} py={{base:1,md:1.5}} justifyContent="flex-start" overflow="hidden" bg="rgba(0,0,0,.48)" border="1px solid rgba(255,255,255,.12)" borderRadius="8px" _hover={{bg:'rgba(255,255,255,.12)',borderColor:'rgba(255,255,255,.22)'}} _active={{transform:'translateY(1px)'}} onClick={()=>setStatusDetail(key)}><HStack spacing={{base:.75,md:1.25}} minW={0} w="100%"><Icon as={ic} color={c} boxSize={{base:3.5,md:4}} flexShrink={0}/><Box minW={0} textAlign="left" flex="1" overflow="hidden"><Text fontSize={{base:'7px',md:'9px'}} color="gray.300" fontWeight="700" noOfLines={1}>{l}</Text><Text fontSize={key==='money'?{base:moneyLen>=13?'8px':moneyLen>=11?'9px':'11px',md:moneyLen>=15?'10px':moneyLen>=12?'12px':'14px'}:{base:'11px',md:'15px'}} lineHeight="1.15" fontFamily="mono" fontWeight="900" color={c} whiteSpace="nowrap" letterSpacing={key==='money'&&moneyLen>=11?'-0.04em':undefined} overflow="hidden" textOverflow="clip">{key==='money'?moneyText:v}</Text></Box></HStack></Button>})}
              </Grid>
              <HStack gridArea="controls" spacing={1} flexShrink={0} justify="flex-end">{masterActive&&<Button size="xs" minW={{base:'42px',md:'50px'}} h={{base:'24px',md:'28px'}} px={1.5} bg={devAutoPlay?'#6b5208':'rgba(255,255,255,.07)'} color={devAutoPlay?'yellow.100':'white'} border="1px solid" borderColor={devAutoPlay?'yellow.400':'rgba(200,200,200,.18)'} onClick={()=>setDevAutoPlay(v=>!v)}>{devAutoPlay?'AUTO':'AUTO'}</Button>}<Button size="xs" minW={{base:'34px',md:'38px'}} h={{base:'24px',md:'28px'}} px={1.5} bg={(masterActive?gameSpeed===3:gameSpeed===2)?'#521920':'rgba(255,255,255,.07)'} color="white" border="1px solid rgba(200,200,200,.18)" onClick={()=>setGameSpeed(v=>masterActive?(v===3?1:3):(v===2?1:2))}>×{gameSpeed}</Button><IconButton aria-label="bgm" size="xs" h={{base:'24px',md:'28px'}} minW={{base:'24px',md:'28px'}} variant="ghost" color={soundOn?'#ddd7cb':'gray.500'} icon={soundOn?<FaVolumeHigh/>:<FaVolumeXmark/>} onClick={()=>setSoundOn(v=>!v)}/></HStack>
            </Grid>
            <HStack spacing={1.5} align="center" justify="flex-start" w="100%">
              <Button h={{base:'24px',md:'28px'}} size="xs" variant="outline" borderColor="whiteAlpha.300" bg="rgba(0,0,0,.36)" onClick={inventoryPanel.onOpen}>アイテム {s.items.length}/3</Button>
              <Button h={{base:'24px',md:'28px'}} size="xs" variant="outline" borderColor="whiteAlpha.300" bg="rgba(0,0,0,.36)" onClick={logPanel.onOpen}>ログ</Button>
              {masterActive&&<><Badge fontSize="7px" colorScheme={devAutoPlay?'yellow':'gray'}>{devAutoPlay?(interactive||s.inHell?'AUTO 待機':'AUTO 実行中'):'AUTO OFF'}</Badge><Badge fontSize="7px" colorScheme={gameSpeed===3?'red':'gray'}>DEV ×{gameSpeed}</Badge><Button h={{base:'24px',md:'28px'}} size="xs" variant="outline" borderColor="yellow.400" color="yellow.100" bg="rgba(72,51,8,.58)" _hover={{bg:'rgba(110,76,8,.76)'}} onClick={()=>{setDevAutoPlay(false);setGameSpeed(1);setGameover(false);setMasterActive(false);masterRoomQueueRef.current=[];setMenu(true);}}>タイトルに戻る</Button></>}
              {(s.ringBuff.active||s.mirrorMultiplier>1||s.partySet)&&<HStack spacing={1} flexWrap="wrap">{s.ringBuff.active&&<Badge fontSize="7px" colorScheme="green">指輪+{s.ringBuff.amount} / 残り{s.ringBuff.turns}</Badge>}{s.mirrorMultiplier>1&&<Badge fontSize="7px" colorScheme="cyan">鏡×{s.mirrorMultiplier}</Badge>}{s.partySet&&<Badge fontSize="7px" colorScheme="pink">演出強化</Badge>}</HStack>}
            </HStack>
            <Box w="100%" overflowX="auto" overflowY="hidden" sx={{WebkitOverflowScrolling:'touch'}}>
              <HStack spacing={1.5} justify="flex-start" minW="max-content" pb={.5}>
                {s.items.length===0&&Object.values(keys).every(v=>v===0)?<Text fontSize="8px" color="gray.500" px={1}>所持アイテムなし</Text>:<>{s.items.map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} h={{base:'27px',md:'32px'}} minW="auto" px={2} flexShrink={0} justifyContent="flex-start" bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} borderRadius="6px" _hover={{filter:'brightness(1.12)'}} onClick={()=>setSelected(i)}><HStack spacing={1.5}><Icon as={it.icon||FaGift} boxSize={3} color={pal.icon}/><Text fontSize="8px" fontWeight="900" whiteSpace="nowrap">{it.name}{it.type==='gem'?` ×${it.count||1}`:''}</Text></HStack></Button>})}{(['copper','silver','gold','diamond'] as KeyKind[]).filter(k=>keys[k]>0).map(k=>{const meta={copper:['🗝️','銅の鍵','#6b3f22','#d9915b'],silver:['🗝️','銀の鍵','#46515d','#dbe4ee'],gold:['🔑','金の鍵','#705400','#f6d44a'],diamond:['💎','ダイヤの鍵','#164e63','#67e8f9']}[k];return <Box key={`key-${k}`} h={{base:'27px',md:'32px'}} px={2} flexShrink={0} display="flex" alignItems="center" bg={meta[2]} color="white" border="1px solid" borderColor={meta[3]} borderRadius="6px"><HStack spacing={1}><Text fontSize="12px">{meta[0]}</Text><Text fontSize="8px" fontWeight="900" whiteSpace="nowrap">{meta[1]} ×{keys[k]}</Text></HStack></Box>})}</>}
              </HStack>
            </Box>
          </VStack>
        </Box>

        {battleActive&&battleRoom&&battleRole&&(()=>{
          const opponents=getBattlePlayers(battleRoom).filter(({role})=>role!==battleRole);
          return <Stack direction={{base:'row',md:'column'}} position="absolute" top={{base:'138px',md:'12px'}} left={{base:'6px',md:'auto'}} right={{base:'6px',md:'12px'}} zIndex={27} spacing={{base:1,md:1.5}} w={{base:'auto',md:'220px'}} align="stretch" pointerEvents="none">
            {opponents.map(({role,player})=>{
              const opp=player.progress;
              const oppStage=stageCatalog.find(stage=>stage.title===(opp.roomTitle||'エレベーターホール'));
              const oppImage=oppStage?.image?`${process.env.NEXT_PUBLIC_BASE_PATH||''}/${oppStage.image}`:null;
              const phaseLabel=opp.finished?'終了':opp.phase==='dialogue'?'会話':opp.phase==='moving'?'移動':opp.phase==='event'?'イベント':'操作中';
              return <Box key={role} position="relative" flex={{base:1,md:'none'}} minW={0} h={{base:'62px',md:'98px'}} overflow="hidden" bg="#050608" bgImage={oppImage?`linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.55)), url("${oppImage}")`:oppStage?.bg} bgSize="cover" bgPosition="center" border="1px solid rgba(235,112,122,.68)" borderRadius="8px" boxShadow="0 8px 22px rgba(0,0,0,.52)">
                <Box position="absolute" inset={0} bg="linear-gradient(180deg,rgba(0,0,0,.62),transparent 42%,rgba(0,0,0,.78))"/>
                <HStack position="absolute" top="4px" left="5px" right="5px" justify="space-between" spacing={1}>
                  <Text fontSize={{base:'6px',md:'8px'}} color="white" fontWeight="900" noOfLines={1}>{player.name}</Text>
                  <Badge fontSize={{base:'4px',md:'6px'}} colorScheme={opp.finished?'green':'red'}>{opp.finished?'終了':'プレイ中'}</Badge>
                </HStack>
                <Center position="absolute" inset={{base:'14px 3px 13px',md:'22px 5px 18px'}} flexDir="column">
                  <Text fontFamily="mono" fontSize={{base:'15px',md:'24px'}} lineHeight="1" color="yellow.100" fontWeight="900" textShadow="0 2px 7px #000">{opp.floor}F</Text>
                  <Text mt="2px" fontSize={{base:'5px',md:'7px'}} color="whiteAlpha.800" noOfLines={1}>{opp.roomTitle||'エレベーターホール'}</Text>
                </Center>
                <HStack position="absolute" bottom="3px" left="5px" right="5px" justify="space-between"><Text fontSize={{base:'5px',md:'7px'}} color="cyan.100" fontWeight="800">{phaseLabel}</Text><Text fontSize={{base:'5px',md:'7px'}} color="whiteAlpha.800">残り{opp.turns}</Text></HStack>
              </Box>;
            })}
          </Stack>;
        })()}

        {battleActive&&battleRunFinished&&battleRoom&&battleRole&&(()=>{
          const players=getBattlePlayers(battleRoom);
          const unfinished=players.filter(({role,player})=>role!==battleRole&&!player.progress.finished);
          if(unfinished.length===0)return null;
          const selected=unfinished.find(x=>x.role===spectateRole)||unfinished[0];
          const progress=selected.player.progress;
          const stage=stageCatalog.find(x=>x.title===(progress.roomTitle||'エレベーターホール'));
          const image=stage?.image?`${process.env.NEXT_PUBLIC_BASE_PATH||''}/${stage.image}`:null;
          const phaseLabel=progress.phase==='dialogue'?'会話中':progress.phase==='moving'?'移動中':progress.phase==='event'?'イベント中':'選択・操作中';
          return <Box position="absolute" inset={0} zIndex={36} bg="#020304" bgImage={image?`linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,.50)), url("${image}")`:stage?.bg} bgSize="cover" bgPosition="center" overflow="hidden">
            <Box position="absolute" inset={0} bg="linear-gradient(180deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.10) 25%,rgba(0,0,0,.16) 64%,rgba(0,0,0,.82) 100%)"/>
            <VStack position="absolute" top={{base:3,md:5}} left={{base:3,md:6}} right={{base:3,md:6}} spacing={2}>
              <HStack w="100%" justify="space-between"><Badge colorScheme="red" fontSize={{base:'9px',md:'11px'}}>観戦中</Badge><Text color="whiteAlpha.800" fontSize={{base:'9px',md:'11px'}}>全員終了後に結果を表示</Text></HStack>
              <HStack w="100%" spacing={2} overflowX="auto" justify={{base:'flex-start',md:'center'}}>{unfinished.map(({role,player})=><Button key={role} size="xs" flexShrink={0} bg={selected.role===role?'rgba(127,29,29,.92)':'rgba(0,0,0,.64)'} color="white" border="1px solid" borderColor={selected.role===role?'red.300':'whiteAlpha.300'} onClick={()=>setSpectateRole(role)}>{player.name} {player.progress.floor}F</Button>)}</HStack>
            </VStack>
            <Center position="absolute" inset={{base:'90px 12px 92px',md:'110px 40px 110px'}} flexDir="column" textAlign="center">
              <Text color="white" fontFamily="heading" fontSize={{base:'xl',md:'3xl'}} fontWeight="900" textShadow="0 3px 12px #000">{selected.player.name}</Text>
              <Text mt={2} color="whiteAlpha.800" fontSize={{base:'sm',md:'md'}} textShadow="0 2px 8px #000">{progress.roomTitle||'エレベーターホール'}</Text>
              <Text mt={3} fontFamily="mono" fontSize={{base:'6xl',md:'8xl'}} lineHeight="1" fontWeight="900" color="yellow.100" textShadow="0 4px 18px #000">{progress.floor}F</Text>
              <HStack mt={4} spacing={3}><Badge px={3} py={1.5} fontSize={{base:'10px',md:'13px'}} colorScheme="cyan">残り {progress.turns}</Badge><Badge px={3} py={1.5} fontSize={{base:'10px',md:'13px'}} colorScheme="purple">{phaseLabel}</Badge></HStack>
            </Center>
            <Center position="absolute" left={0} right={0} bottom={{base:5,md:7}}><Text color="whiteAlpha.700" fontSize={{base:'10px',md:'12px'}}>ほかのプレイヤーを選ぶと観戦先を切り替えられます</Text></Center>
          </Box>;
        })()}

        <Flex flex="1" minH={0} position="relative" px={{base:2,md:4,lg:6}} pt={{base:battleActive?'252px':'158px',md:battleActive?'154px':'154px',lg:battleActive?'158px':'158px'}} pb={roomIntro?{base:'8px',md:'12px',lg:'14px'}:{base:'82px',md:'92px',lg:'98px'}} align="center" justify="center" overflow="hidden" boxSizing="border-box">
          {roomAtmosphere.label&&<Text position="absolute" top="10px" right="12px" fontSize="8px" letterSpacing=".22em" fontWeight="900" color="whiteAlpha.300">{roomAtmosphere.label}</Text>}{rareArrival>0&&<Box position="absolute" inset={0} zIndex={16} pointerEvents="none" overflow="hidden">
            <Box position="absolute" inset="-18%" bg={rareArrival===5?'radial-gradient(circle,rgba(253,224,71,.48) 0%,rgba(250,204,21,.18) 28%,transparent 62%)':'radial-gradient(circle,rgba(244,63,94,.34) 0%,rgba(168,85,247,.14) 35%,transparent 65%)'} animation="rareArrival .9s ease-out both"/>
            <Center position="absolute" inset={0}>
              <Box w="118px" h="118px" rounded="full" border="3px solid" borderColor={rareArrival===5?'yellow.200':'red.300'} boxShadow={rareArrival===5?'0 0 34px rgba(253,224,71,.85), inset 0 0 28px rgba(253,224,71,.38)':'0 0 30px rgba(248,113,113,.78), inset 0 0 24px rgba(168,85,247,.32)'} animation="rareRing 1.05s ease-out both"/>
            </Center>
            {Array.from({length:rareArrival===5?12:8}).map((_,i)=><Box key={i} position="absolute" left={`${8+((i*83)%84)}%`} top={`${58+((i*17)%28)}%`} w={rareArrival===5?'5px':'4px'} h={rareArrival===5?'5px':'4px'} rounded="full" bg={rareArrival===5?'yellow.200':'red.200'} boxShadow="0 0 10px currentColor" animation={`rareSpark ${.65+(i%4)*.12}s ease-out ${i*.045}s both`}/>) }
          </Box>}{!roomIntro&&<VStack zIndex={10} w="100%" maxW={{base:'326px',md:'520px',lg:'650px'}} spacing={{base:2.5,lg:3.5}} maxH="100%" overflowY="auto" px={{base:0,lg:4}} py={{base:3,lg:4}} bg="rgba(4,6,8,.44)" backdropFilter="blur(5px)" border="1px solid rgba(218,216,208,.16)" borderRadius="10px" boxShadow="0 14px 34px rgba(0,0,0,.36)"><Badge bg="rgba(0,0,0,.52)" color={room.tier>=4?'#d4b7b7':'#c9c7c0'} border="1px solid rgba(200,202,200,.22)" borderRadius="1px" px={2.5} py={.5} fontFamily="heading" letterSpacing=".12em">{s.inHell?'Tier 6':tier.name}</Badge><Center w={{base:'66px',lg:'82px'}} h={{base:'66px',lg:'82px'}} rounded="full" bg="radial-gradient(circle,rgba(255,255,255,.055),rgba(0,0,0,.55))" border="1px solid" borderColor={roomIdentity.color} boxShadow={`0 0 28px ${roomIdentity.glow}, inset 0 0 18px rgba(255,255,255,.025)`}><Icon as={roomIdentity.icon} boxSize={{base:6,lg:8}} color={roomIdentity.color}/></Center><Text fontFamily="heading" fontSize={{base:'lg',lg:'2xl'}} letterSpacing=".08em" fontWeight="700" color="#f0ede5" textShadow="0 2px 12px #000">{room.title}</Text><Box w="54px" h="1px" bg="linear-gradient(90deg,transparent,#8d3238,transparent)"/><Text fontSize={{base:'xs',lg:'sm'}} color="rgba(230,228,220,.72)" textAlign="center" lineHeight="1.75" px={{base:2,lg:5}}>{room.desc}</Text>{room.result&&<Badge px={3} py={1} maxW="100%" whiteSpace="normal" textAlign="center" lineHeight="1.4" colorScheme={resultColor}>{room.result}</Badge>}{interactive&&<Box w="100%" mt={2}>{interactive}</Box>}</VStack>}
          {roomIntro&&<Box position="absolute" zIndex={24} left="50%" transform="translateX(-50%)" w={{base:'calc(100% - 16px)',md:'calc(100% - 48px)',lg:'min(920px, calc(100% - 120px))'}} bottom={{base:2,md:3,lg:3}} maxH={{base:'54%',md:'48%',lg:'44%'}} overflowY="auto" p={{base:3,md:4}} bg="linear-gradient(180deg,rgba(3,5,8,.88),rgba(5,8,12,.92))" backdropFilter="blur(8px)" border="1px solid rgba(235,232,220,.34)" borderRadius="10px" boxShadow="0 18px 45px rgba(0,0,0,.58)">
            <HStack mb={2} spacing={2}><Badge bg="rgba(123,36,44,.86)" color="white" px={2} py={.5}>{novelSpeaker}</Badge><Text fontSize="9px" color="gray.400">{room.title}</Text></HStack>
            <Text color="#f3efe7" fontSize={{base:'sm',md:'md'}} lineHeight="1.9" textShadow="0 2px 8px #000">{room.desc}</Text>
            {room.result&&<Text mt={1.5} color="whiteAlpha.700" fontSize={{base:'10px',md:'xs'}}>{room.result}</Text>}
            <Flex mt={3} justify="flex-end"><Button size="sm" bg="rgba(110,31,39,.92)" color="white" border="1px solid rgba(218,112,120,.52)" _hover={{bg:'#7f2831'}} onClick={()=>{playSfx('click',soundOn);setRoomIntro(false);}}>{room.kind?'選択肢へ':'次へ'} ▶</Button></Flex>
          </Box>}
          <Box position="absolute" top={0} left={0} w="50%" h="100%" bg="linear-gradient(90deg,#07090b,#181b1f 75%,#090b0d)" borderRight="1px solid" borderColor="rgba(205,207,205,.25)" zIndex={20} transform={doors?'translateX(-100%)':'translateX(0)'} transition={`transform ${0.6/gameSpeed}s cubic-bezier(.77,0,.175,1)`}/><Box position="absolute" top={0} right={0} w="50%" h="100%" bg="linear-gradient(90deg,#090b0d,#181b1f 25%,#07090b)" borderLeft="1px solid" borderColor="rgba(205,207,205,.25)" zIndex={20} transform={doors?'translateX(100%)':'translateX(0)'} transition={`transform ${0.6/gameSpeed}s cubic-bezier(.77,0,.175,1)`}/>
          {floorTransition.show&&<Center position="absolute" inset={0} zIndex={34} bg="rgba(2,5,10,.94)" flexDir="column" overflow="hidden"><Box position="absolute" inset={0} bgImage="repeating-linear-gradient(180deg,transparent 0 18px,rgba(125,211,252,.14) 19px 21px)" animation="floorLines .28s linear infinite"/><Text zIndex={1} fontSize="9px" letterSpacing=".22em" color="cyan.200" fontWeight="900">移動中</Text><Text zIndex={1} mt={2} fontFamily="heading" fontSize="sm" color="white" fontWeight="900">{floorTransition.label}</Text><HStack zIndex={1} mt={3} spacing={3} animation="floorTravel .75s ease-in-out infinite"><Text fontFamily="mono" fontSize="3xl" color="gray.400" fontWeight="900">{floorTransition.from}F</Text><Icon as={FaArrowUp} color="cyan.300"/><Text fontFamily="mono" fontSize="4xl" color="cyan.100" fontWeight="black" textShadow="0 0 18px rgba(103,232,249,.65)">{floorTransition.to}F</Text></HStack><Text zIndex={1} mt={2} fontSize="10px" color="cyan.100">{floorTransition.phase}</Text><Text zIndex={1} mt={4} fontSize="9px" color="gray.400">到着先で新しいイベントが発生します</Text></Center>}
                    {overlay.show&&<Center position="absolute" inset={0} bg={overlay.tier===4?'linear-gradient(180deg,rgba(69,26,3,.96),rgba(0,0,0,.97))':'rgba(0,0,0,.94)'} zIndex={30} flexDir="column" overflow="hidden">
                      <Box position="absolute" inset="-20%" bg={overlay.tier===4?'radial-gradient(circle,rgba(250,204,21,.25),transparent 50%)':overlay.tier===3?'radial-gradient(circle,rgba(168,85,247,.22),transparent 50%)':overlay.tier===2?'radial-gradient(circle,rgba(16,185,129,.16),transparent 50%)':'radial-gradient(circle,rgba(34,211,238,.12),transparent 50%)'} animation="elevatorAura .55s ease-in-out infinite alternate"/>
                      {!overlay.locked&&<>
                        <Box position="absolute" inset={0} opacity={.42} overflow="hidden">
                          {Array.from({length:9}).map((_,i)=><Flex key={i} position="absolute" left="8%" right="8%" top={`${i*14-12}%`} h="2px" bg="whiteAlpha.300" align="center" animation="elevatorShaftScroll .72s linear infinite"><Text position="absolute" right="0" top="-13px" fontFamily="mono" fontSize="8px" color="whiteAlpha.500">FLOOR {String((i+1)*10).padStart(3,'0')}</Text></Flex>)}
                          <Box position="absolute" top="0" bottom="0" left="20%" w="2px" bg="whiteAlpha.200"/><Box position="absolute" top="0" bottom="0" right="20%" w="2px" bg="whiteAlpha.200"/>
                        </Box>
                        <Center zIndex={1} w="118px" h="152px" mb={4} border="2px solid" borderColor="whiteAlpha.500" bg="blackAlpha.500" boxShadow="0 0 28px rgba(255,255,255,.12), inset 0 0 22px rgba(0,0,0,.8)" animation="elevatorCabinFloat .5s ease-in-out infinite" position="relative">
                          <Box position="absolute" left="50%" top="10px" bottom="10px" w="1px" bg="whiteAlpha.300"/>
                          <VStack spacing={0}><Icon as={FaArrowUp} color={tierMeta[Math.min(4,overlay.tier-1)].color} boxSize={7} animation="elevatorArrowRise .65s ease-out infinite"/><Text mt={2} fontSize="9px" letterSpacing=".2em" color="whiteAlpha.700">ELEVATOR</Text><Text fontSize="10px" color="white" fontWeight="900">上昇中</Text></VStack>
                        </Center>
                      </>}
                      <Text zIndex={1} fontFamily="mono" fontSize={overlay.locked?'7xl':'6xl'} fontWeight="black" color={tierMeta[Math.min(4,overlay.tier-1)].color} textShadow="0 0 24px currentColor" transform={overlay.locked?'scale(1.08)':'scale(.92)'} transition="all .18s ease">+{overlay.steps}</Text><Text zIndex={1} fontSize="11px" color={overlay.locked?'white':'gray.300'} fontWeight={overlay.locked?'900':'600'} mt={2}>{overlay.detail}</Text><HStack zIndex={1} mt={3} spacing={1}>{Array.from({length:8}).map((_,i)=><Box key={i} w="18px" h="4px" rounded="full" bg={i<overlay.tier*2?(overlay.tier===4?'yellow.300':overlay.tier===3?'purple.300':overlay.tier===2?'green.300':'cyan.300'):'whiteAlpha.200'} boxShadow={i<overlay.tier*2?'0 0 8px currentColor':undefined}/>)}</HStack></Center>}
        </Flex>

        {rankedActive&&<Box position="absolute" right={{base:2,md:3}} top={{base:'148px',md:'86px'}} zIndex={24} w={{base:'150px',md:'210px'}} p={2} bg="rgba(10,8,4,.86)" border="1px solid rgba(250,204,21,.38)" borderRadius="8px" backdropFilter="blur(8px)">
          <HStack justify="space-between" mb={1.5}><HStack spacing={1}><Icon as={FaTrophy} color="yellow.300" boxSize={3}/><Text fontSize="9px" color="yellow.100" fontWeight="900">RANK MATCH</Text></HStack><Badge colorScheme="yellow" fontSize="7px">4人戦</Badge></HStack>
          <Stack spacing={1}>{[{name:nickname||'あなた',floor:s.floor,turns:s.turnsLeft,isMe:true},...rankedCpus.map(c=>({name:c.name,floor:c.floor,turns:c.turns,isMe:false}))].sort((a,b)=>b.floor-a.floor).map((p,i)=><Flex key={`${p.name}-${i}`} align="center" gap={1}><Text w="16px" fontSize="8px" color={i===0?'yellow.200':'gray.400'}>{i+1}</Text><Text flex="1" minW={0} noOfLines={1} fontSize="8px" color={p.isMe?'cyan.100':'gray.200'} fontWeight={p.isMe?'900':'700'}>{p.name}</Text><Text fontSize="8px" color="#eee9df" fontWeight="900">{p.floor}F</Text><Text w="28px" textAlign="right" fontSize="7px" color="gray.500">残{p.turns}</Text></Flex>)}</Stack>
          {rankedPlayerFinished&&<Text mt={1.5} fontSize="7px" color="orange.200">残りCPUは3秒ごとに1部屋進みます</Text>}
        </Box>}
        {!roomIntro&&<Box position="absolute" left={{base:2,md:'12%'}} right={{base:2,md:'12%'}} bottom={{base:2,md:3}} bg="rgba(3,4,6,.72)" backdropFilter="blur(9px)" p={{base:1.5,lg:2}} border="1px solid" borderColor="rgba(205,207,205,.22)" borderRadius="10px" zIndex={22}><Center><Button w="100%" maxW={{base:'100%',lg:'720px'}} h={{base:'50px',lg:'58px'}} bg={finalMode?"linear-gradient(180deg,#5b171e,#1e090c)":"linear-gradient(180deg,#1c1f23,#090a0c)"} color="#f1eee6" fontFamily="heading" letterSpacing=".10em" fontSize="md" fontWeight="800" textShadow="0 2px 5px #000" border="1px solid" borderColor={finalMode?"#a44850":"rgba(226,224,216,.42)"} borderRadius="2px" boxShadow={finalMode?"0 0 20px rgba(130,28,36,.30),inset 0 1px rgba(255,255,255,.05)":"0 8px 20px rgba(0,0,0,.50),inset 0 1px rgba(255,255,255,.05)"} _hover={{bg:finalMode?'#6d1c24':'#272a2e',borderColor:finalMode?'#cf666e':'#d9d5ca',color:'white'}} _active={{transform:'translateY(1px)',bg:'#0a0b0d'}} _disabled={{opacity:.48,color:'whiteAlpha.700',cursor:'not-allowed'}} leftIcon={finalMode||battleRunFinished||rankedPlayerFinished?undefined:<FaArrowUp/>} isDisabled={disabled||eventAnimating||floorTransition.show||overlay.show||battleRunFinished||rankedPlayerFinished} onClick={()=>{if(battleRunFinished||rankedPlayerFinished)return;if(finalMode)end();else press();}}>{battleRunFinished?'ほかのプレイヤーの終了を待っています…':rankedPlayerFinished?'CPUの残り行動を待っています…':finalMode?(rankedActive?'コンピュータ戦を終了する':'ゲームを終了する'):'ボタンを押す'}</Button></Center></Box>}
      </Flex>

      <Modal isOpen={battleLobby.isOpen} onClose={()=>{if(!battleCode){battleLobby.onClose();setBattleError('');}}} closeOnOverlayClick={!battleCode} isCentered>
        <ModalOverlay bg="rgba(0,0,0,.84)" backdropFilter="blur(7px)"/>
        <ModalContent bg="linear-gradient(180deg,#171a20,#07080a)" maxW="410px" border="1px solid rgba(218,216,208,.28)" borderRadius="8px">
          <ModalHeader fontFamily="heading" color="#eee9df">オンライン対戦</ModalHeader>
          <ModalBody><Stack spacing={3}>
            <Text fontSize="11px" color="gray.300" lineHeight="1.8">2〜4人で同時にプレイし、全員の最終操作が終わった時点の到達階で順位を決めます。</Text>
            {battleCode&&battleRoom?<Box p={4} textAlign="center" bg="rgba(82,25,32,.36)" border="1px solid rgba(218,112,120,.42)" borderRadius="8px"><Text fontSize="9px" color="gray.400">3桁ルームコード</Text><Text mt={1} fontFamily="mono" fontSize="3xl" letterSpacing=".18em" color="yellow.100" fontWeight="900">{battleCode}</Text><Text mt={2} fontSize="10px" color="gray.300">参加者 {getBattlePlayers(battleRoom).length} / {battleRoom.maxPlayers} 人</Text><Stack mt={3} spacing={1}>{getBattlePlayers(battleRoom).map(({role,player})=><HStack key={role} justify="space-between" bg="blackAlpha.300" px={3} py={1.5} borderRadius="6px"><Text fontSize="10px" color="whiteAlpha.900">{player.name}</Text><Badge fontSize="7px" colorScheme={role===battleRole?'yellow':'cyan'}>{role===battleRole?'あなた':'参加済み'}</Badge></HStack>)}</Stack><Text mt={3} fontSize="9px" color="gray.400">人数が揃うと自動で開始します</Text></Box>:<><Text fontSize="10px" color="gray.400">ルーム作成人数</Text><SimpleGrid columns={3} spacing={2}>{([2,3,4] as const).map(n=><Button key={n} size="sm" bg={battleMaxPlayers===n?'#6b1c25':'whiteAlpha.080'} color="white" border="1px solid" borderColor={battleMaxPlayers===n?'red.300':'whiteAlpha.200'} onClick={()=>setBattleMaxPlayers(n)}>{n}人</Button>)}</SimpleGrid><Button h="48px" colorScheme="red" isLoading={battleBusy} onClick={()=>void createBattle()}>ルームを作成</Button><Divider borderColor="whiteAlpha.200"/><Text fontSize="10px" color="gray.400" textAlign="center">または3桁ルームコードで参加</Text><Input value={battleCodeInput} onChange={e=>setBattleCodeInput(e.target.value.replace(/\D/g,'').slice(0,3))} maxLength={3} inputMode="numeric" placeholder="3桁コード" textAlign="center" fontFamily="mono" letterSpacing=".22em"/><Button variant="outline" colorScheme="yellow" isLoading={battleBusy} isDisabled={battleCodeInput.length!==3} onClick={()=>void joinBattle()}>参加する</Button></>}
            {battleError&&<Text fontSize="10px" color="red.200" textAlign="center">{battleError}</Text>}
          </Stack></ModalBody>
          <ModalFooter>{battleCode?<Button w="100%" variant="outline" colorScheme="red" onClick={()=>{if(battleRole==='p1')void cancelBattleRoom(battleCode);clearBattleSession();battleLobby.onClose();}}>{battleRole==='p1'?'対戦をキャンセル':'待機画面を閉じる'}</Button>:<Button w="100%" variant="ghost" onClick={battleLobby.onClose}>閉じる</Button>}</ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={battleResult.isOpen} onClose={()=>{}} closeOnOverlayClick={false} isCentered>
        <ModalOverlay bg="rgba(0,0,0,.86)" backdropFilter="blur(7px)"/>
        <ModalContent bg="linear-gradient(180deg,#171a20,#07080a)" maxW="430px" border="1px solid rgba(218,216,208,.28)" borderRadius="8px">
          <ModalHeader textAlign="center" fontFamily="heading" color="#eee9df">オンライン対戦結果</ModalHeader>
          <ModalBody>{battleRoom&&battleRole&&(()=>{
            const sorted=getBattlePlayers(battleRoom).slice().sort((a,b)=>b.player.progress.floor-a.player.progress.floor);
            const myIndex=sorted.findIndex(x=>x.role===battleRole);
            return <Stack spacing={3}><Text textAlign="center" fontFamily="heading" fontSize="2xl" fontWeight="900" color={myIndex===0?'yellow.200':'#eee9df'}>{myIndex===0?'1位！':`${myIndex+1}位`}</Text><Stack spacing={2}>{sorted.map(({role,player},i)=><HStack key={role} p={3} bg={role===battleRole?'rgba(113,63,18,.30)':'whiteAlpha.050'} border="1px solid" borderColor={role===battleRole?'yellow.700':'whiteAlpha.100'} borderRadius="8px" justify="space-between"><HStack><Text w="30px" fontFamily="mono" fontSize="lg" fontWeight="900" color={i===0?'yellow.200':'whiteAlpha.700'}>{i+1}</Text><Text fontSize="11px" fontWeight="900" color="white">{player.name}{role===battleRole?'（あなた）':''}</Text></HStack><Text fontFamily="mono" fontSize="xl" fontWeight="900" color="cyan.100">{player.progress.floor}F</Text></HStack>)}</Stack><Text textAlign="center" fontSize="10px" color="gray.400">全員の最終操作が完了してから順位を確定しました。</Text></Stack>;
          })()}</ModalBody>
          <ModalFooter><Button w="100%" onClick={()=>{battleResult.onClose();clearBattleSession();setMenu(true);}}>メインメニューへ</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={statusDetail!==null} onClose={()=>setStatusDetail(null)} isCentered size="xs"><ModalOverlay bg="rgba(0,0,0,.62)" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,rgba(18,21,25,.98),rgba(5,7,9,.99))" maxW="320px" border="1px solid rgba(218,216,208,.28)" borderRadius="12px" boxShadow="0 22px 60px rgba(0,0,0,.66)"><ModalHeader color="#eee9df" fontFamily="heading" textAlign="center" pb={1}>{statusDetail==='turns'?'残り回数':statusDetail==='luck'?'運気':'所持金'}</ModalHeader><ModalBody pt={2} pb={5} textAlign="center"><Center mb={3}><Icon as={statusDetail==='turns'?FaBolt:statusDetail==='luck'?FaStar:FaCoins} boxSize={8} color={statusDetail==='turns'?'yellow.300':statusDetail==='luck'?'green.300':'yellow.200'}/></Center><Text fontFamily="mono" fontWeight="900" fontSize="4xl" color={statusDetail==='turns'?'yellow.200':statusDetail==='luck'?'green.200':'yellow.100'} textShadow="0 0 18px rgba(255,255,255,.12)">{statusDetail==='turns'?`${s.turnsLeft}回`:statusDetail==='luck'?s.luck.toLocaleString('ja-JP'):`${s.money.toLocaleString('ja-JP')}円`}</Text><Text mt={2} fontSize="10px" color="gray.400">{statusDetail==='turns'?'ボタンを押せる残り回数です':statusDetail==='luck'?'現在の運気です':'現在の所持金です'}</Text></ModalBody><ModalFooter pt={0}><Button w="100%" size="sm" onClick={()=>setStatusDetail(null)}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={inventoryPanel.isOpen} onClose={inventoryPanel.onClose} isCentered><ModalOverlay bg="rgba(0,0,0,.72)" backdropFilter="blur(6px)"/><ModalContent bg="linear-gradient(180deg,rgba(17,20,24,.98),rgba(5,6,8,.99))" maxW={{base:'350px',md:'520px'}} border="1px solid rgba(218,216,208,.28)" borderRadius="10px"><ModalHeader color="#eee9df" fontFamily="heading">アイテム ({s.items.length}/3)</ModalHeader><ModalBody>{s.items.length===0?<Text py={6} textAlign="center" color="gray.500">アイテムを持っていません</Text>:<Stack spacing={2}>{s.items.map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} h="58px" justifyContent="flex-start" bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} _hover={{filter:'brightness(1.12)'}} onClick={()=>{inventoryPanel.onClose();setSelected(i);}}><HStack w="100%"><Center w="34px" h="34px" rounded="md" bg="blackAlpha.400"><Icon as={it.icon||FaGift} color={pal.icon}/></Center><Box flex="1" textAlign="left"><Text fontSize="11px" fontWeight="900">{it.name}{it.type==='gem'?` ×${it.count||1}`:''}</Text><Text fontSize="9px" color="whiteAlpha.700">{it.type==='gem'?'宝石':it.type==='passive'?'常時効果':'消費アイテム'}</Text></Box></HStack></Button>})}</Stack>}{Object.values(keys).some(v=>v>0)&&<Box mt={4} pt={3} borderTop="1px solid rgba(255,255,255,.12)"><Text fontSize="10px" color="gray.300" mb={2} fontWeight="bold">鍵</Text><SimpleGrid columns={2} spacing={2}>{(['copper','silver','gold','diamond'] as KeyKind[]).filter(k=>keys[k]>0).map(k=>{const meta={copper:['🗝️','銅の鍵','orange'],silver:['🗝️','銀の鍵','gray'],gold:['🔑','金の鍵','yellow'],diamond:['💎','ダイヤモンドの鍵','cyan']}[k];return <HStack key={k} p={2} rounded="md" bg="whiteAlpha.100" border="1px solid rgba(255,255,255,.12)"><Text fontSize="xl">{meta[0]}</Text><Box><Text fontSize="9px" fontWeight="900">{meta[1]}</Text><Badge colorScheme={meta[2] as string} fontSize="8px">×{keys[k]}</Badge></Box></HStack>})}</SimpleGrid></Box>}</ModalBody><ModalFooter><Button w="100%" onClick={inventoryPanel.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={logPanel.isOpen} onClose={logPanel.onClose} isCentered><ModalOverlay bg="rgba(0,0,0,.72)" backdropFilter="blur(6px)"/><ModalContent bg="linear-gradient(180deg,rgba(17,20,24,.98),rgba(5,6,8,.99))" maxW={{base:'350px',md:'560px'}} border="1px solid rgba(218,216,208,.28)" borderRadius="10px"><ModalHeader color="#eee9df" fontFamily="heading">ログ</ModalHeader><ModalBody maxH="58vh" overflowY="auto">{s.logs.length===0?<Text color="gray.500">システム: ゲーム開始</Text>:<Stack spacing={1}>{s.logs.map((l,i)=><Text key={i} fontSize="11px" color="gray.300" py={1.5} borderBottom="1px solid" borderColor="whiteAlpha.100">{l}</Text>)}</Stack>}</ModalBody><ModalFooter><Button w="100%" onClick={logPanel.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <InfoModal ctl={rules} title="ルール説明" color="green">
        <HelpSection title="1. ゲームの目的">
          <Bullet>「ボタンを押す」を使って、限られた回数の中でできるだけ高い階まで登るゲームです。</Bullet>
          <Bullet>ランキングの主な記録は <b>最終到達階数</b> です。高階層を目指しましょう。</Bullet>
        </HelpSection>
        <HelpSection title="コンピュータ戦">
          <Bullet>プレイヤー1人とCPU3人で4人対戦します。最終到達階数が高い順に順位を決めます。</Bullet>
          <Bullet>順位報酬は <b>1位 +3 / 2位 +1 / 3位 -1 / 4位 -2 トロフィー</b> です。</Bullet>
          <Bullet>プレイヤーがボタンを押すたび、残り回数があるCPUも同じタイミングで1部屋進みます。</Bullet>
          <Bullet>プレイヤー終了後もCPUに残り回数がある場合、CPUは3秒ごとに1部屋進み、全員終了後に順位を確定します。</Bullet>
          <Bullet>CPUはアイテムを獲得・使用します。行動方針は5種類から内部でランダム選択され、内容はプレイヤーには表示されません。</Bullet>
          <Bullet>週間トロフィーは毎週月曜0:00(JST)にリセットされ、前週最終値は総合トロフィーランキングの自己ベスト候補になります。</Bullet>
        </HelpSection>
        <HelpSection title="2. 基本の流れ">
          <Bullet>1回ボタンを押すごとに、ランダムな階数だけ上へ進みます。</Bullet>
          <Bullet>上がった先では、ラッキー部屋・採掘場・カジノ・ショップなど、さまざまなイベント部屋が発生します。</Bullet>
          <Bullet>残り回数が0になっても、すぐには終了しません。下のボタンが「ゲームを終了する」に変わるので、自分で押した時にリザルトへ進みます。</Bullet>
        </HelpSection>
        <HelpSection title="3. 3つの重要ステータス">
          <Bullet><b>ボタン</b>：残り回数です。0になると新しく移動はできません。</Bullet>
          <Bullet><b>運気</b>：高いほど、ボタンを押した時の上昇階数ボーナスが大きくなります。</Bullet>
          <Bullet><b>所持金</b>：ショップ・オークション・カジノなどで使います。</Bullet>
        </HelpSection>
        <HelpSection title="4. アイテムと持ち物">
          <Bullet>持てるアイテムは最大3つです。4つ目を入手した時は、どれを捨てるか自分で選べます。</Bullet>
          <Bullet>宝石（ルビー・エメラルド・ダイヤモンド）は、ショップ系の部屋に来た時だけ売却できます。</Bullet>
          <Bullet>消費アイテムは任意のタイミングで使用可能、常時アイテムは持っているだけで効果があります。</Bullet>
        </HelpSection>
        <HelpSection title="5. よくある部屋の要点">
          <Bullet><b>採掘場</b>：5つの岩から2つだけ選べます。最後に選ばなかった岩の中身も公開されます。</Bullet>
          <Bullet><b>スロットカジノ</b>：1回の訪問につき最大10回、ベットは20〜500円。🍀揃いで運気、⚡揃いで残り回数がベット額に応じて増えます。</Bullet>
          <Bullet><b>占い師の小部屋</b>：占い結果によって運気が上下します。</Bullet>
          <Bullet><b>運試しの祭壇</b>：祈る対象を1つ選び、30%で強力な加護を受けます。階数の加護に成功すると、移動先でも新しいイベントが発生します。</Bullet>
        </HelpSection>
      </InfoModal>
      <StageGuideModal ctl={guide} stages={stageCatalog} basePath={process.env.NEXT_PUBLIC_BASE_PATH||''} developerMode={developerMode} onPreview={(stage)=>{setPreviewStage(stage);stagePreview.onOpen();}}/>
      <StagePreviewModal ctl={stagePreview} stage={previewStage} basePath={process.env.NEXT_PUBLIC_BASE_PATH||''} developerMode={developerMode} onDeveloperPlay={goDeveloperStage}/>
      <InfoModal ctl={itemGuide} title="アイテム図鑑" color="purple">
        <HelpSection title="消費アイテム">
          <Bullet><b>乱反射の鏡★n</b>：次にボタンを押した時の上昇階数を <b>n倍</b> にします。大きな上振れを狙う切り札です。</Bullet>
          <Bullet><b>幸運の指輪★n</b>：3ターンの間、運気が <b>+n</b> 上がります。中長期の安定強化向きです。</Bullet>
          <Bullet><b>賢者の宝石</b>：現在階の1の位ぶんだけ運気を上げます。高い1の位で使うと効率的です。</Bullet>
          <Bullet><b>お店チケット</b>：ショップでは0円。次の部屋を確実にショップ系にします。宝石を売りたい時にも便利です。</Bullet>
          <Bullet><b>パーティーセット</b>：次回のボタン演出が良い結果になりやすくなります。</Bullet>
        </HelpSection>
        <HelpSection title="常時効果アイテム">
          <Bullet><b>お金のなる木★n</b>：ボタンを押すたびに所持金が <b>+100×n円</b> 増えます。</Bullet>
          <Bullet><b>幸せのお守り★n</b>：ボタンを押すたびに運気が <b>+n</b> 増えます。</Bullet>
          <Bullet>どちらも持っているだけで発動するので、長期戦ほど強いアイテムです。</Bullet>
        </HelpSection>
        <HelpSection title="宝石アイテム">
          <Bullet><b>ルビー</b>：ショップで1個 <b>300円</b> で売却できます。</Bullet>
          <Bullet><b>エメラルド</b>：ショップで1個 <b>500円</b> で売却できます。</Bullet>
          <Bullet><b>ダイヤモンド</b>：ショップで1個 <b>1000円</b> で売却できます。</Bullet>
          <Bullet>宝石は採掘場やミステリーオークションで入手し、ショップ系の部屋に来た時だけ売れます。</Bullet>
        </HelpSection>
        <HelpSection title="持ち物のコツ">
          <Bullet>枠は3つしかないため、「即効性のある消費アイテム」と「長期で効く常時アイテム」のバランスが大切です。</Bullet>
          <Bullet>宝石を多く抱えた時は、お店チケットで売却タイミングを作ると整理しやすくなります。</Bullet>
        </HelpSection>
      </InfoModal>
      <Modal isOpen={computerBattleMenu.isOpen} onClose={computerBattleMenu.onClose} isCentered><ModalOverlay bg="blackAlpha.850" backdropFilter="blur(7px)"/><ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW={{base:'360px',md:'520px'}} border="1px solid rgba(250,204,21,.28)" borderRadius="8px"><ModalHeader fontFamily="heading" color="#eee9df">コンピュータ戦</ModalHeader><ModalBody>
        <Tabs variant="soft-rounded" colorScheme="yellow" size="sm" onChange={i=>{if(i===1)void loadTrophyRankingMode(trophyRankingMode);}}>
          <TabList mb={4}><Tab flex="1">対戦する</Tab><Tab flex="1">ランキング</Tab></TabList>
          <TabPanels>
            <TabPanel p={0}>
              <Box p={3} bg="blackAlpha.400" border="1px solid rgba(250,204,21,.18)" borderRadius="8px"><Text fontSize="11px" color="gray.200" lineHeight="1.8">3人のコンピュータと4人で対戦します。順位に応じてトロフィーが増減します。</Text><Text mt={2} fontSize="10px" color="gray.400">1位 +3 / 2位 +1 / 3位 -1 / 4位 -2</Text></Box>
              <Button mt={4} w="100%" h="52px" colorScheme="yellow" color="black" leftIcon={<FaPlay/>} onClick={startRankedRun}>対戦を開始する</Button>
              <Center mt={4} p={3} bg="rgba(250,204,21,.07)" border="1px solid rgba(250,204,21,.18)" borderRadius="8px" flexDir="column"><Text fontSize="9px" color="gray.500">現在のトロフィー</Text><HStack mt={1} spacing={2}><Icon as={FaTrophy} color="yellow.300"/><Text fontFamily="heading" fontSize="3xl" color="yellow.100" fontWeight="900">{trophyProfile.trophies}</Text></HStack></Center>
            </TabPanel>
            <TabPanel p={0}>
              <Tabs index={trophyRankingMode==='weekly'?0:1} onChange={i=>void loadTrophyRankingMode(i===0?'weekly':'alltime')} variant="soft-rounded" colorScheme="yellow" size="sm">
                <TabList mb={3}><Tab flex="1">週間</Tab><Tab flex="1">総合</Tab></TabList>
                <Box mb={3} p={3} bg="blackAlpha.400" border="1px solid rgba(250,204,21,.18)" borderRadius="8px"><Text fontSize="10px" color="yellow.100" fontWeight="900">{trophyRankingMode==='weekly'?`今週：${getJstWeekLabel()}`:'終了した各週の自己最高トロフィー'}</Text><Text mt={1} fontSize="9px" color="gray.400">週間トロフィーは毎週月曜 0:00 (JST) に0へリセット。リセット前の最終値が総合ランキング候補として保存されます。</Text></Box>
                <Flex mb={3} p={2.5} align="center" justify="space-between" bg="rgba(250,204,21,.07)" borderRadius="6px"><Box><Text fontSize="8px" color="gray.500">現在のトロフィー</Text><Text fontFamily="heading" fontSize="2xl" color="yellow.200" fontWeight="900">{trophyProfile.trophies}</Text></Box><Box textAlign="right"><Text fontSize="8px" color="gray.500">あなたの順位</Text><Text fontSize="lg" color="#eee9df" fontWeight="900">{myTrophyRanking?.rank?`${myTrophyRanking.rank}位`:'未登録'}</Text></Box></Flex>
                {trophyRankingLoading?<VStack py={8}><Progress w="100%" size="xs" isIndeterminate colorScheme="yellow"/><Text fontSize="10px" color="gray.400">読み込み中…</Text></VStack>:trophyRankingRows.length?<Stack spacing={0}>{trophyRankingRows.map((row,i)=><Flex key={row.id||i} py={2} borderBottom="1px solid rgba(255,255,255,.08)" align="center"><Text w="42px" color={i<3?'yellow.200':'gray.500'} fontWeight="900">#{i+1}</Text><Text flex="1" minW={0} noOfLines={1} color="#eee9df">{row.name}</Text><HStack spacing={1}><Icon as={FaTrophy} color="yellow.300" boxSize={3}/><Text color="yellow.100" fontWeight="900">{row.trophies}</Text></HStack></Flex>)}</Stack>:<Text py={8} textAlign="center" color="gray.500">まだ登録がありません</Text>}
              </Tabs>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ModalBody><ModalFooter><Button w="100%" onClick={computerBattleMenu.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={rankedResult.isOpen} onClose={()=>{}} closeOnOverlayClick={false} isCentered><ModalOverlay bg="blackAlpha.850" backdropFilter="blur(7px)"/><ModalContent bg="linear-gradient(180deg,#1d1809,#07080a)" maxW={{base:'360px',md:'470px'}} border="1px solid rgba(250,204,21,.38)" borderRadius="8px"><ModalHeader textAlign="center" fontFamily="heading" color="yellow.100">コンピュータ戦結果</ModalHeader><ModalBody>
        {rankedMatchResult&&<><Center><VStack spacing={1}><Icon as={FaTrophy} boxSize={9} color={rankedMatchResult.place===1?'yellow.300':'gray.300'}/><Text fontFamily="heading" fontSize="4xl" color="#fff2bd" fontWeight="900">{rankedMatchResult.place}位</Text><Badge colorScheme={rankedMatchResult.delta>0?'green':'red'} fontSize="sm">トロフィー {rankedMatchResult.delta>0?'+':''}{rankedMatchResult.delta}</Badge></VStack></Center>
        <Stack mt={4} spacing={1}>{rankedMatchResult.order.map((row,i)=><Flex key={row.id} p={2.5} bg={row.isPlayer?'rgba(34,211,238,.08)':'rgba(255,255,255,.035)'} border="1px solid" borderColor={row.isPlayer?'rgba(103,232,249,.28)':'rgba(255,255,255,.08)'} borderRadius="6px" align="center"><Text w="34px" color={i<3?'yellow.200':'gray.500'} fontWeight="900">{i+1}位</Text><Text flex="1" color={row.isPlayer?'cyan.100':'#eee9df'} fontWeight={row.isPlayer?'900':'700'}>{row.name}{row.isPlayer?'（あなた）':''}</Text><Text color="#f0d9aa" fontWeight="900">{row.floor.toLocaleString()}階</Text></Flex>)}</Stack>
        <Flex mt={4} p={3} justify="space-between" bg="blackAlpha.400" borderRadius="8px"><Text fontSize="11px" color="gray.400">今週のトロフィー</Text><Text fontFamily="mono" color="yellow.200" fontWeight="900">{rankedMatchResult.before} → {rankedMatchResult.after}</Text></Flex></>}
      </ModalBody><ModalFooter><Button w="100%" colorScheme="yellow" color="black" onClick={()=>{rankedResult.onClose();setRankedActive(false);setRankedPlayerFinished(false);setMenu(true);}}>メインメニューへ</Button></ModalFooter></ModalContent></Modal>

      <Modal isOpen={rank.isOpen} onClose={rank.onClose} isCentered><ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW={{base:'360px',md:'640px'}} border="1px solid rgba(218,216,208,.28)" borderRadius="8px" boxShadow="0 24px 80px rgba(0,0,0,.72)"><ModalHeader fontFamily="heading" letterSpacing=".08em" color="#eee9df" borderBottom="1px solid rgba(180,184,186,.16)">階数ランキング</ModalHeader><ModalBody maxH="72vh" overflowY="auto">

              <Tabs index={rankingMode==='monthly'?0:1} onChange={(i)=>{const mode:RankingScope=i===0?'monthly':'alltime';void loadRankingMode(mode);}} variant="soft-rounded" colorScheme="red" size="sm">
                <TabList mb={3}><Tab flex="1">月間</Tab><Tab flex="1">総合</Tab></TabList>
                <Box mb={3} px={2} py={1.5} bg="blackAlpha.300" borderRadius="6px"><Text fontSize="9px" color="gray.400">{rankingMode==='monthly'?`月間 ${getCurrentMonthLabel()}・毎月1日0:00(JST)更新`:'全期間の自己ベスト'}</Text><Text mt={.5} fontSize="9px" color={rankingViews[rankingMode].cached?'cyan.200':'gray.500'}>{rankingViews[rankingMode].cached?'キャッシュから表示中（再読込を節約）':'上位50 + 自分の順位のみ取得 / 51〜1000位は保存のみ'}</Text></Box>
                <Text mb={2} fontSize="10px" color={rankingStatus==='online'?'#9ab39e':rankingStatus==='connecting'?'#c7b58e':'#b57d7d'}>{rankingStatus==='online'?'● ランキング取得済み':rankingStatus==='connecting'?'ランキング読込中…':rankingStatus==='offline'?'ローカルランキングモード':'Firebase接続エラー'}</Text>
                {firebaseReady&&<Box mb={4} p={3} bg="rgba(84,28,34,.28)" border="1px solid rgba(180,74,82,.42)" borderRadius="8px"><Text fontSize="9px" color="gray.400" letterSpacing=".10em">{rankingMode==='monthly'?'今月のあなた':'総合のあなた'}</Text>{rankingStatus==='connecting'&&!rankingViews[rankingMode].loaded?<Text mt={1} color="gray.400">集計中…</Text>:rankingViews[rankingMode].mine?.entry&&rankingViews[rankingMode].mine?.rank?<><HStack mt={1} align="baseline"><Text fontFamily="heading" fontSize="3xl" color="#f0d9aa" fontWeight="900">{rankingViews[rankingMode].mine?.rank}位</Text><Text fontSize="10px" color="gray.400">/ Top 1000</Text></HStack><Flex mt={1} justify="space-between"><Text fontSize="11px" color="#eee9df" noOfLines={1}>{rankingViews[rankingMode].mine?.entry?.name}</Text><Text fontSize="12px" color="#f0d9aa" fontWeight="900">{Number(rankingViews[rankingMode].mine?.entry?.score||0).toLocaleString()}階</Text></Flex></>:<><Text mt={1} fontSize="lg" color="gray.300" fontWeight="800">まだTop1000登録なし</Text><Text mt={1} fontSize="9px" color="gray.500">ゲーム終了後に自己ベストを登録すると、ここに順位が表示されます。</Text></>}</Box>}
                <HStack mb={2} justify="space-between"><Text fontSize="11px" color="#eee9df" fontWeight="900">{rankingMode==='monthly'?'月間 上位50':'総合 上位50'}</Text><Button size="xs" variant="ghost" color="gray.400" onClick={()=>void loadRankingMode(rankingMode,true)}>再読込</Button></HStack>{rankingViews[rankingMode].rows.length?rankingViews[rankingMode].rows.slice(0,50).map((r,i)=><Flex key={r.id||i} py={1.5} borderBottom="1px solid" borderColor="rgba(200,202,200,.12)" align="center"><Text w="38px" color={i<3?'#e1c071':'#9b4148'} fontWeight="900">#{i+1}</Text><Text flex="1" noOfLines={1} color="#dfdcd4">{r.name}</Text><Text color="#d7d1c3" fontWeight="800">{Number(r.score).toLocaleString()}階</Text></Flex>):<Text color="gray.500">{rankingStatus==='connecting'?'読み込み中…':'まだ登録がありません'}</Text>}
              </Tabs>
            
      </ModalBody><ModalFooter><Button w="100%" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.24)" borderRadius="2px" _hover={{bg:'#351419'}} onClick={rank.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={pendingOverflow!==null} onClose={()=>{}} closeOnOverlayClick={false} isCentered><ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW="350px" border="1px solid rgba(218,216,208,.28)" borderRadius="2px"><ModalHeader fontFamily="heading" color="#eee9df" borderBottom="1px solid rgba(180,184,186,.16)">持ち物がいっぱいです</ModalHeader><ModalBody><Text fontSize="xs" color="gray.300" mb={3}>{pendingOverflowPurchase?`「${pendingOverflow?.name}」を購入すると持ち物が4つになります。入れ替えるアイテムを選ぶか、購入をキャンセルしてください。`:`新しく「${pendingOverflow?.name}」を入手しました。4つのうち捨てる1つを選んでください。`}</Text><Stack spacing={2}>{[...s.items,...(pendingOverflow?[pendingOverflow]:[])].map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} h="54px" justifyContent="flex-start" bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} _hover={{filter:'brightness(1.15)'}} onClick={()=>resolveOverflow(i)}><HStack w="100%"><Icon as={it.icon||FaGift} color={pal.icon}/><Box flex="1" textAlign="left"><Text fontSize="11px" fontWeight="900">{it.name}{it.type==='gem'?` ×${it.count||1}`:''}</Text><Text fontSize="9px" color="whiteAlpha.700">{i===3?'新しく入手したアイテム':'現在の持ち物'}</Text></Box><Text fontSize="10px" color="red.200" fontWeight="900">これを捨てる</Text></HStack></Button>})}</Stack>{pendingOverflowPurchase&&<Button mt={4} w="100%" variant="outline" colorScheme="gray" onClick={cancelOverflowPurchase}>購入をキャンセル</Button>}</ModalBody></ModalContent></Modal>
      <Modal isOpen={selected!==null} onClose={()=>setSelected(null)} isCentered><ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW="330px" border="1px solid rgba(218,216,208,.28)" borderRadius="2px"><ModalHeader fontFamily="heading" color="#eee9df" borderBottom="1px solid rgba(180,184,186,.16)"><HStack><Center w="36px" h="36px" rounded="lg" bg="gray.700"><Icon as={selectedItem?.icon||FaGift} color={selectedItem?itemPalette(selectedItem).icon:'gray.200'}/></Center><Text>{selectedItem?.name}</Text></HStack></ModalHeader><ModalBody>{selectedItem&&<Stack spacing={3}><HStack><Badge colorScheme={selectedItem.type==='gem'?'blue':selectedItem.type==='passive'?'yellow':'green'}>{selectedItem.type==='gem'?'宝石':selectedItem.type==='passive'?'常時効果':'消費アイテム'}</Badge>{selectedItem.paramN&&<Badge variant="outline" colorScheme="purple">★{selectedItem.paramN}</Badge>}</HStack><Box p={3} bg="rgba(255,255,255,.045)" border="1px solid rgba(255,255,255,.12)" borderRadius="8px"><Text fontSize={{base:'14px',md:'15px'}} lineHeight="1.9" color="#f1eee6" fontWeight="700">{selectedItem.desc}</Text></Box>{selectedItem.type==='consumable'&&<Text fontSize="11px" color="green.200">使用すると効果が発動し、このアイテムは消費されます。</Text>}{selectedItem.type==='passive'&&<Text fontSize="11px" color="yellow.100">所持しているだけで効果が発動します。捨てるまで効果が続きます。</Text>}{selectedItem.type==='gem'&&<Text fontSize="11px" color="cyan.100">売却価格：1個 {selectedItem.price.toLocaleString()}円 / 現在 {selectedItem.count||1}個（合計 {(selectedItem.price*(selectedItem.count||1)).toLocaleString()}円）</Text>}</Stack>}</ModalBody><ModalFooter gap={2}>{selectedItem?.type==='consumable'&&<Button colorScheme="green" onClick={()=>useItem(selected!)}>使用する</Button>}{selectedItem?.type==='gem'&&(room.kind==='shop'||room.kind==='legendshop')&&<Button colorScheme="yellow" onClick={()=>sellGem(selected!)}>売却 +{(selectedItem.price*(selectedItem.count||1))}円</Button>}{selectedItem?.type==='gem'&&room.kind!=='shop'&&room.kind!=='legendshop'&&<Text fontSize="xs" color="gray.400" alignSelf="center">宝石はショップ系または伝説の神器商店で売却できます</Text>}<Button colorScheme="red" variant="outline" onClick={()=>discard(selected!)}>捨てる</Button><Button onClick={()=>setSelected(null)}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={historyModal.isOpen} onClose={historyModal.onClose} isCentered size="md">
        <ModalOverlay bg="blackAlpha.850" backdropFilter="blur(6px)"/>
        <ModalContent bg="linear-gradient(180deg,#14171b,#07080a)" maxW={{base:'calc(100vw - 24px)',md:'560px'}} maxH="86vh" border="1px solid rgba(218,216,208,.30)" borderRadius="4px" boxShadow="0 24px 80px rgba(0,0,0,.72)">
          <ModalHeader fontFamily="heading" color="#eee9df" letterSpacing=".09em" borderBottom="1px solid rgba(170,174,176,.16)">過去の記録</ModalHeader>
          <ModalBody px={{base:3,md:4}} py={3} overflowY="auto">
            <Flex mb={3} px={3} py={2.5} justify="space-between" align="center" bg="rgba(255,255,255,.04)" border="1px solid rgba(205,207,205,.12)" borderRadius="4px">
              <Box><Text fontSize="9px" color="gray.500">保存件数</Text><Text fontSize="sm" color="#eee9df" fontWeight="900">{localPlayHistory.length} / 100</Text></Box>
              <Box textAlign="right"><Text fontSize="9px" color="gray.500">端末内ベスト</Text><Text fontSize="md" color="#f0d9aa" fontWeight="900">{getLocalHistorySummary(localPlayHistory).best.toLocaleString()}階</Text></Box>
            </Flex>
            {localPlayHistory.length===0?<Center py={10}><Text fontSize="sm" color="gray.500">まだプレイ記録がありません。</Text></Center>:<Stack spacing={2}>
              {localPlayHistory.map((record,index)=>{
                const ended=new Date(record.endedAt);
                const valid=!Number.isNaN(ended.getTime());
                const label=valid?ended.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'日時不明';
                const best=getLocalHistorySummary(localPlayHistory).best;
                return <Box key={`${record.endedAt}-${index}`} px={3} py={2.5} bg="rgba(255,255,255,.035)" border="1px solid" borderColor={record.score===best?'rgba(240,217,170,.52)':'rgba(205,207,205,.12)'} borderRadius="4px">
                  <Flex gap={3} align="center">
                    <Box minW="38px" textAlign="center"><Text fontSize="9px" color="gray.500">#{localPlayHistory.length-index}</Text></Box>
                    <Box flex="1" minW={0}><HStack spacing={2}><Text fontSize="md" color="#eee9df" fontWeight="900">{Number(record.floor||record.score).toLocaleString()}階</Text>{record.score===best&&<Badge colorScheme="yellow" fontSize="8px">最高</Badge>}</HStack><Text mt={.5} fontSize="9px" color="gray.500">{label}</Text></Box>
                    <Box textAlign="right"><Text fontSize="9px" color="gray.500">所持金</Text><Text fontSize="10px" color="#e8dcc6" fontWeight="800">{Number(record.money||0).toLocaleString()}円</Text><Text mt={.5} fontSize="9px" color="gray.500">運気 {Number(record.luck||0)}</Text></Box>
                  </Flex>
                </Box>;
              })}
            </Stack>}
          </ModalBody>
          <ModalFooter borderTop="1px solid rgba(170,174,176,.12)"><Button w="100%" borderRadius="2px" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.24)" _hover={{bg:'#351419',borderColor:'#8f3940'}} onClick={historyModal.onClose}>閉じる</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={resetRecords.isOpen} onClose={resetRecords.onClose} isCentered>
        <ModalOverlay bg="blackAlpha.850" backdropFilter="blur(6px)"/>
        <ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW="360px" border="1px solid rgba(218,216,208,.28)" borderRadius="4px">
          <ModalHeader fontFamily="heading" color="#eee9df">記録をリセット</ModalHeader>
          <ModalBody>
            <Text fontSize="sm" color="gray.200" fontWeight="800">端末内の最高記録と過去のプレイ履歴を削除しますか？</Text>
            <Text mt={2} fontSize="11px" color="gray.400">プレイヤー名とランキング用のプレイヤーIDは残ります。Firebaseに登録済みの月間・総合ランキングも削除されません。</Text>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" color="gray.300" onClick={resetRecords.onClose}>キャンセル</Button>
            <Button bg="#6d1f27" color="white" _hover={{bg:'#8a2832'}} onClick={()=>{
              localStorage.removeItem('infinite_elevator_highscore');
              localStorage.removeItem('infinite_elevator_play_history_v1');
              setLocalPlayHistory([]);
              setLocalHistorySummary({count:0,best:0});
              setS(x=>({...x,highScore:1}));
              resetRecords.onClose();
            }}>削除する</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={nameEdit.isOpen} onClose={nameEdit.onClose} isCentered>
        <ModalOverlay bg="blackAlpha.800"/>
        <ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW="340px" border="1px solid rgba(218,216,208,.28)" borderRadius="4px">
          <ModalHeader fontFamily="heading" color="#eee9df">プレイヤー名変更</ModalHeader>
          <ModalBody><Input value={nameDraft} onChange={e=>setNameDraft(Array.from(e.target.value).slice(0,12).join(''))} maxLength={12} placeholder="プレイヤー名（12文字まで）" textAlign="center"/></ModalBody>
          <ModalFooter gap={2}><Button variant="ghost" color="gray.300" onClick={nameEdit.onClose}>キャンセル</Button><Button colorScheme="yellow" onClick={()=>{const next=(nameDraft.trim()||'名無しの登山者').slice(0,12);setNickname(next);localStorage.setItem('infinite_elevator_nickname',next);nameEdit.onClose();}}>変更する</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={gameover} onClose={()=>{}} closeOnOverlayClick={false} isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/>
        <ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW={{base:'360px',md:'430px'}} maxH="92vh" textAlign="center" border="1px solid rgba(218,216,208,.28)" borderRadius="2px">
          <ModalHeader fontFamily="heading" letterSpacing=".10em" color="#eee9df" borderBottom="1px solid rgba(180,184,186,.16)">ゲーム終了</ModalHeader>
          <ModalBody overflowY="auto">
            <Text fontSize="xs" color="gray.400">最終到達階数</Text>
            <Text fontSize="4xl" color="#eee9df" fontFamily="heading" fontWeight="black">{s.floor.toLocaleString()} 階</Text>

            {(newPersonalBest||scorePreviewLoading||scoreHasSaveTarget)?<Box mt={3} p={3} textAlign="left" bg="rgba(73,28,34,.20)" border="1px solid rgba(180,74,82,.34)" borderRadius="8px">
              <Text mb={2} fontSize="10px" color="#e8dcc6" fontWeight="900">{newPersonalBest?'自己最高記録を更新！':'月間または総合ランキングの自己ベスト更新対象！'} 今回スコアの暫定順位</Text>
              {scorePreviewLoading&&<VStack py={3} spacing={2}><Progress w="100%" size="xs" isIndeterminate colorScheme="yellow"/><Text fontSize="10px" color="gray.400">月間・総合順位を確認中…</Text></VStack>}
              {!scorePreviewLoading&&scorePreviewError&&<Stack spacing={2}><Text fontSize="10px" color="red.200">{scorePreviewError}</Text><Button size="xs" variant="outline" colorScheme="yellow" onClick={()=>void refreshScorePreview(s.floor)}>順位を再確認</Button><Text fontSize="9px" color="gray.500">確認に失敗しても、必要なら下の登録ボタンから保存を試せます。</Text></Stack>}
              {!scorePreviewLoading&&scorePreview&&<SimpleGrid columns={2} spacing={2}>
                {(['monthly','alltime'] as const).map(scope=>{const p=scorePreview[scope];return <Box key={scope} p={2} bg="blackAlpha.400" borderRadius="6px" border="1px solid rgba(210,212,210,.12)">
                  <Text fontSize="9px" color="gray.400">{scope==='monthly'?`${scorePreview.monthLabel} 月間`:'総合'}</Text>
                  <Text mt={1} fontFamily="heading" fontSize="xl" color={p.rank<=50?'yellow.200':p.rank<=1000?'#eee9df':'gray.400'} fontWeight="900">{p.rank<=1000?`暫定 ${p.rank}位`:'Top1000圏外'}</Text>
                  {p.currentBestScore!==null&&<Text mt={1} fontSize="9px" color="gray.500">現在ベスト {p.currentBestScore.toLocaleString()}階</Text>}
                  <Text mt={1} fontSize="9px" color={p.eligible?'green.200':'gray.500'}>{p.eligible?(p.currentBestScore===null?'登録対象':'自己ベスト更新対象'):(p.wouldImprove?'Top1000保存対象外':'自己ベスト未更新')}</Text>
                </Box>})}
              </SimpleGrid>}
              {!firebaseReady&&<Text fontSize="10px" color="gray.400">オンラインランキングを利用できないため、端末内の記録のみ保存できます。</Text>}
            </Box>:<Box mt={3} p={3} bg="blackAlpha.300" borderRadius="8px"><Text fontSize="11px" color="gray.300" fontWeight="800">今回は自己最高記録の更新ではありませんでした。</Text><Text mt={1} fontSize="9px" color="gray.500">プレイ履歴には保存されています。</Text></Box>}

            <Flex mt={3} px={2} py={2} justify="space-between" align="center" bg="blackAlpha.300" borderRadius="6px">
              <Box textAlign="left"><Text fontSize="9px" color="gray.500">この端末のプレイ履歴</Text><Text fontSize="11px" color="#eee9df" fontWeight="800">{localHistorySummary.count}プレイ保存</Text></Box>
              <Box textAlign="right"><Text fontSize="9px" color="gray.500">端末内ベスト</Text><Text fontSize="12px" color="#f0d9aa" fontWeight="900">{localHistorySummary.best.toLocaleString()}階</Text></Box>
            </Flex>
            <Text mt={1} fontSize="8px" color="gray.600">プレイ履歴はこの端末内に最大100件保存されます。</Text>

            {scoreCanRegister&&<HStack mt={3} align="stretch">
              <Input value={nickname} onChange={e=>setNickname(Array.from(e.target.value).slice(0,12).join(''))} maxLength={12} isDisabled={scoreSubmitting||scoreSubmitted} placeholder="プレイヤー名（12文字まで）" textAlign="center"/>
              <Button minW="108px" colorScheme="yellow" onClick={submitScore} isDisabled={scoreRegistrationDisabled} isLoading={scoreSubmitting} loadingText="保存中">{scoreSubmitted?'登録済み':scorePreviewLoading?'順位確認中':firebaseReady&&scorePreview&&!scoreHasSaveTarget?'保存対象外':'ランキング登録'}</Button>
            </HStack>}
            {scoreSaveMessage&&<Text mt={2} fontSize="10px" color={scoreSubmitted?'green.200':rankingStatus==='error'?'red.200':'yellow.100'}>{scoreSaveMessage}</Text>}
            <HStack justify="space-between" mt={3} color="gray.400"><Text fontSize="xs">最終所持金: <b>{s.money.toLocaleString()}円</b></Text><Text fontSize="xs">最終運気: <b>{s.luck}</b></Text></HStack>
          </ModalBody>
          <ModalFooter><Button w="100%" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.28)" borderRadius="2px" _hover={{bg:'#351419',borderColor:'#8f3940'}} isDisabled={scoreSubmitting} onClick={()=>{setGameover(false);setMenu(true)}}>{scoreSubmitting?'保存完了までお待ちください':scoreCanRegister&&!scoreSubmitted?'登録せずメインメニューへ':'メインメニューへ'}</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  </Center></>;
}

