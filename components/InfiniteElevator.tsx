'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge, Box, Button, Center, Divider, Flex, Grid, GridItem, HStack, Icon, IconButton,
  Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Progress,
  SimpleGrid, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useDisclosure, VStack
} from '@chakra-ui/react';
import {
  FaArrowUp, FaBolt, FaBookOpen, FaBoxOpen, FaCircleQuestion, FaCoins, FaDoorClosed,
  FaElevator, FaGem, FaGavel, FaGift, FaHammer, FaHeart, FaHotTubPerson, FaWandMagicSparkles,
  FaPlay, FaRankingStar, FaRing, FaSackDollar, FaSkull, FaStar, FaStore, FaSun,
  FaTicket, FaTree, FaTrophy, FaVolumeHigh, FaVolumeXmark
} from 'react-icons/fa6';
import type { Item, ItemId, Room, State } from '../lib/types';
import { firebaseReady } from '../lib/firebase';
import { getCurrentMonthKey, getCurrentMonthLabel, loadRankingView, previewRankings, submitRankings, type MyRankingResult, type RankingEntry, type RankingScope, type ScorePreviewBundle } from '../lib/leaderboard';
import { appendPlayHistory, getLocalHistorySummary, getOrCreatePlayerId, loadPlayHistory } from '../lib/localProfile';

const tierMeta = [
  {name:'Tier 1 Common', bg:'radial-gradient(circle at center, rgba(14,165,233,.15), rgba(15,23,42,.95))', color:'cyan.300'},
  {name:'Tier 2 Uncommon', bg:'radial-gradient(circle at center, rgba(16,185,129,.20), rgba(15,23,42,.95))', color:'green.300'},
  {name:'Tier 3 Rare', bg:'radial-gradient(circle at center, rgba(168,85,247,.25), rgba(15,23,42,.95))', color:'purple.300'},
  {name:'Tier 4 Epic', bg:'radial-gradient(circle at center, rgba(239,68,68,.30), rgba(15,23,42,.95))', color:'red.300'},
  {name:'Tier 5 Legend', bg:'radial-gradient(circle at center, rgba(245,158,11,.35), rgba(15,23,42,.95))', color:'yellow.300'},
];



type StageCatalogEntry={tier:number;title:string;desc:string;image?:string;bg:string;accent:string;label?:string};
const stageCatalog:StageCatalogEntry[]=[
{tier:0,title:'エレベーターホール',desc:'すべての冒険が始まる巨大昇降塔の入口。',image:'stages/stage-01.webp',bg:'linear-gradient(180deg,#0c1117,#020304)',accent:'#d7d2c8',label:'START'},
{tier:1,title:'何も無い部屋',desc:'静寂だけが残る空室。',image:'stages/stage-02.webp',bg:'linear-gradient(145deg,#1b1d20,#08090a)',accent:'#a3a3a3'},
{tier:1,title:'ラッキー部屋',desc:'淡い緑の光に包まれ、運気が上昇する。',image:'stages/stage-03.webp',bg:'radial-gradient(circle at 50% 38%,rgba(74,222,128,.35),transparent 42%),linear-gradient(180deg,#0d2a19,#060b08)',accent:'#86efac'},
{tier:2,title:'健康の湯',desc:'Tier2の癒やし温泉。浸かると残り回数が+1。',image:'stages/stage-04.webp',bg:'radial-gradient(circle at 50% 72%,rgba(103,232,249,.28),transparent 42%),linear-gradient(180deg,#14313a,#071015)',accent:'#a5f3fc'},
{tier:1,title:'落ちている財布',desc:'無人の金属廊下に、ぽつんと財布が落ちている。',image:'stages/stage-05.webp',bg:'radial-gradient(circle at 50% 70%,rgba(250,204,21,.18),transparent 25%),linear-gradient(180deg,#24200e,#090806)',accent:'#fde68a'},
{tier:1,title:'短い階段',desc:'+5〜20階進める短い階段。',image:'stages/stage-06.webp',bg:'linear-gradient(155deg,#1b2b3b,#080b10 70%)',accent:'#93c5fd'},
{tier:1,title:'2つの扉',desc:'行き先の異なる二枚の扉が現れる分岐室。',image:'stages/stage-07.webp',bg:'radial-gradient(circle at 28% 50%,rgba(251,146,60,.18),transparent 30%),radial-gradient(circle at 72% 50%,rgba(96,165,250,.18),transparent 30%),linear-gradient(180deg,#24170d,#09090b)',accent:'#fdba74'},
{tier:1,title:'小さなお店',desc:'塔の片隅で営業する小さな商店。',image:'stages/stage-08.webp',bg:'radial-gradient(circle at 50% 22%,rgba(250,204,21,.18),transparent 34%),linear-gradient(180deg,#2b2412,#0b0a07)',accent:'#fde68a'},
{tier:2,title:'小さな宝箱',desc:'500〜1000円、または宝石1個が入ったTier2宝箱。',image:'stages/stage-09.webp',bg:'radial-gradient(circle at 50% 65%,rgba(192,132,252,.24),transparent 34%),linear-gradient(180deg,#21132f,#09070d)',accent:'#d8b4fe'},
{tier:1,title:'占い師の小部屋',desc:'紫の水晶光が揺れる神秘的な占い部屋。',image:'stages/stage-10.webp',bg:'radial-gradient(circle at 50% 38%,rgba(192,132,252,.34),transparent 35%),linear-gradient(180deg,#281344,#080711)',accent:'#d8b4fe'},
{tier:1,title:'3つの怪しい小箱',desc:'赤・青・緑の小箱が並ぶ不穏な小部屋。',image:'stages/stage-11.webp',bg:'radial-gradient(circle at 24% 70%,rgba(248,113,113,.23),transparent 22%),radial-gradient(circle at 50% 70%,rgba(96,165,250,.22),transparent 22%),radial-gradient(circle at 76% 70%,rgba(74,222,128,.22),transparent 22%),linear-gradient(180deg,#17181b,#070809)',accent:'#e5e7eb'},
{tier:1,title:'怪しい物々交換所',desc:'古い露店と積まれた荷物が並ぶ交換所。',image:'stages/stage-12.webp',bg:'radial-gradient(circle at 50% 25%,rgba(217,119,6,.18),transparent 35%),linear-gradient(180deg,#2b1b0d,#0b0805)',accent:'#fdba74'},
{tier:1,title:'運命の分岐路',desc:'暗い塔内で二方向へ分かれる巨大通路。',image:'stages/stage-13.webp',bg:'linear-gradient(160deg,#172330,#070a0e 72%)',accent:'#cbd5e1'},
{tier:2,title:'自動販売機',desc:'場違いな光を放つ古い自動販売機。',image:'stages/stage-14.webp',bg:'radial-gradient(circle at 50% 55%,rgba(56,189,248,.22),transparent 30%),linear-gradient(180deg,#0f2430,#071015)',accent:'#7dd3fc'},
{tier:2,title:'超ラッキー部屋',desc:'強い緑光と粒子が舞う幸運の部屋。',image:'stages/stage-15.webp',bg:'radial-gradient(circle at center,rgba(74,222,128,.42),transparent 44%),linear-gradient(180deg,#0c351d,#071009)',accent:'#86efac'},
{tier:3,title:'無病の湯',desc:'Tier3の上質な温泉。残り回数が+2〜3。',image:'stages/stage-16.webp',bg:'radial-gradient(circle at 50% 68%,rgba(125,211,252,.34),transparent 42%),linear-gradient(180deg,#173b48,#071116)',accent:'#bae6fd'},
{tier:2,title:'ルビーの採掘場',desc:'赤い鉱脈が岩壁を走る灼熱の採掘洞。',image:'stages/stage-17.webp',bg:'radial-gradient(circle at 50% 58%,rgba(248,113,113,.30),transparent 38%),linear-gradient(145deg,#381717,#0c0808 70%)',accent:'#fca5a5'},
{tier:2,title:'長い階段',desc:'+20〜50階進める長い螺旋階段。',image:'stages/stage-18.webp',bg:'linear-gradient(155deg,#20354b,#080c12 70%)',accent:'#93c5fd'},
{tier:2,title:'大きなお店',desc:'照明と棚が増えた本格的なショップフロア。',image:'stages/stage-19.webp',bg:'radial-gradient(circle at 50% 18%,rgba(250,204,21,.22),transparent 34%),linear-gradient(180deg,#342b13,#0b0a07)',accent:'#fde68a'},
{tier:2,title:'地下カードサロン',desc:'深緑のテーブルと低い照明が並ぶ地下サロン。',image:'stages/stage-20.webp',bg:'radial-gradient(circle at center,rgba(13,148,136,.28),transparent 45%),linear-gradient(180deg,#07372f,#050b0a)',accent:'#5eead4'},
{tier:2,title:'魔法鍛冶屋',desc:'炉の橙光と火花が飛び散る鍛冶工房。',image:'stages/stage-21.webp',bg:'radial-gradient(circle at 50% 68%,rgba(251,146,60,.36),transparent 42%),linear-gradient(180deg,#35180b,#0d0805)',accent:'#fdba74'},
{tier:2,title:'運試しの祭壇',desc:'金色の燭光が灯る古代祭壇。',image:'stages/stage-22.webp',bg:'radial-gradient(circle at 50% 38%,rgba(253,224,71,.28),transparent 40%),linear-gradient(180deg,#352b0f,#0b0a06)',accent:'#fde68a'},
{tier:2,title:'ミステリーオークション',desc:'仮面の客席を思わせる薄暗い競売場。',image:'stages/stage-23.webp',bg:'radial-gradient(circle at 50% 24%,rgba(217,119,6,.24),transparent 38%),linear-gradient(180deg,#2b1a0b,#0b0805)',accent:'#fbbf24'},
{tier:3,title:'スロットカジノ',desc:'紫とピンクのネオンが瞬く異質なカジノ。',image:'stages/stage-24.webp',bg:'radial-gradient(circle at 20% 18%,rgba(236,72,153,.34),transparent 32%),radial-gradient(circle at 80% 25%,rgba(139,92,246,.38),transparent 34%),linear-gradient(160deg,#200b36,#080511 70%)',accent:'#f0abfc'},
{tier:3,title:'極ラッキー部屋',desc:'祝福の粒子と緑光が満ちた高位の幸運部屋。',image:'stages/stage-25.webp',bg:'radial-gradient(circle at center,rgba(74,222,128,.52),transparent 45%),linear-gradient(180deg,#0f4425,#071109)',accent:'#bbf7d0'},
{tier:4,title:'不老不死の湯',desc:'Tier4の伝説的な温泉。残り回数が+4〜5。',image:'stages/stage-26.webp',bg:'radial-gradient(circle at 50% 22%,rgba(255,255,255,.18),transparent 32%),radial-gradient(circle at 50% 70%,rgba(186,230,253,.42),transparent 42%),linear-gradient(180deg,#31506c,#101724)',accent:'#e0f2fe'},
{tier:3,title:'エメラルドの採掘場',desc:'緑の結晶が洞窟全体を照らす採掘場。',image:'stages/stage-27.webp',bg:'radial-gradient(circle at 50% 58%,rgba(52,211,153,.31),transparent 38%),linear-gradient(145deg,#143a2c,#080d0a 70%)',accent:'#6ee7b7'},
{tier:3,title:'果てしなく長い階段',desc:'+50〜100階進める終点の見えない巨大階段。',image:'stages/stage-28.webp',bg:'radial-gradient(circle at 50% 10%,rgba(147,197,253,.18),transparent 30%),linear-gradient(155deg,#243a55,#070a10 74%)',accent:'#bfdbfe'},
{tier:3,title:'ホームセンター',desc:'塔の中とは思えない巨大な物資売り場。',image:'stages/stage-29.webp',bg:'radial-gradient(circle at 50% 20%,rgba(250,204,21,.24),transparent 34%),linear-gradient(180deg,#3a3014,#0b0a07)',accent:'#fde68a'},
{tier:3,title:'不思議なアイテム箱',desc:'紫金の光を漏らす豪華な箱が置かれている。',image:'stages/stage-30.webp',bg:'radial-gradient(circle at 50% 62%,rgba(192,132,252,.36),transparent 35%),linear-gradient(180deg,#2b1640,#09070d)',accent:'#e9d5ff'},
{tier:3,title:'アンケート娘',desc:'2択アンケートで多数派を当てる不思議な調査室。',image:'stages/survey-girl.webp',bg:'radial-gradient(circle at 50% 35%,rgba(244,114,182,.28),transparent 38%),linear-gradient(180deg,#32172a,#0d0810)',accent:'#f9a8d4'},
{tier:4,title:'ワープホール',desc:'青紫の空間が歪み、行き先の見えない門が開く。',image:'stages/stage-31.webp',bg:'radial-gradient(circle at center,rgba(34,211,238,.40),rgba(168,85,247,.22) 32%,transparent 55%),linear-gradient(180deg,#082333,#0b0718)',accent:'#67e8f9'},
{tier:4,title:'神々の競売場',desc:'黄金の柱と赤い幕に囲まれた荘厳な競売場。',image:'stages/stage-32.webp',bg:'radial-gradient(circle at 50% 18%,rgba(250,204,21,.34),transparent 34%),linear-gradient(180deg,#4a2b0c,#130a05)',accent:'#fde68a'},
{tier:4,title:'ダイヤモンドの採掘場',desc:'青白い結晶光が反射する極上の鉱山。',image:'stages/stage-33.webp',bg:'radial-gradient(circle at 50% 55%,rgba(34,211,238,.38),transparent 38%),linear-gradient(145deg,#123544,#080d11 70%)',accent:'#a5f3fc'},
{tier:2,title:'ATM',desc:'お金を預け、次の遭遇時に5倍で受け取れる特殊端末。',image:'stages/ATM.webp',bg:'radial-gradient(circle at 50% 45%,rgba(34,211,238,.26),transparent 36%),linear-gradient(180deg,#102631,#071014)',accent:'#67e8f9'},
{tier:5,title:'究極のルーレット',desc:'金・紫・赤の光が回転する神々の遊戯場。',image:'stages/stage-34.webp',bg:'conic-gradient(from 0deg at 50% 50%,rgba(250,204,21,.32),rgba(168,85,247,.28),rgba(239,68,68,.26),rgba(250,204,21,.32)),radial-gradient(circle,#563008,#0a0a0d 68%)',accent:'#fde68a'},
{tier:5,title:'神の故郷',desc:'白金の光が降り注ぐ、塔の最上位に近い聖域。',image:'stages/stage-35.webp',bg:'radial-gradient(circle at 50% 12%,rgba(255,255,255,.82),rgba(250,204,21,.34) 28%,transparent 58%),linear-gradient(180deg,#7a5917,#2d2409 42%,#090b10)',accent:'#fff7c2'},
{tier:5,title:'伝説の神器商店',desc:'ここでしか買えない三種の神器を扱う伝説級の商店。',image:'stages/legendary-relic-shop.webp',bg:'radial-gradient(circle at 50% 18%,rgba(250,204,21,.55),transparent 38%),linear-gradient(180deg,#5a3b0c,#180f05)',accent:'#fde68a'},
{tier:6,title:'地獄の門',desc:'赤黒い霧と灼熱の亀裂が広がる脱出専用フロア。',image:'stages/stage-36.webp',bg:'radial-gradient(circle at 50% 28%,rgba(185,28,28,.70),transparent 38%),linear-gradient(180deg,#3b0505,#0b0000 72%,#000)',accent:'#fca5a5',label:'HELL'}
];


type SfxName = 'click'|'start'|'door'|'move1'|'move2'|'move3'|'move4'|'arrive'|'success'|'fail'|'coin'|'item'|'buy'|'sell'|'mine'|'gem'|'card'|'casino'|'slotStop'|'jackpot'|'warpUp'|'warpDown'|'roulette'|'hell'|'gameover'|'discard'|'upgrade';
type DoorChoice = 'creaky'|'silver'|'gold'|'luck'|'health'|'money';
let audioContext: AudioContext | null = null;
function playSfx(name:SfxName, enabled=true){
  if(!enabled || typeof window==='undefined') return;
  try{
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if(!AC) return;
    if(!audioContext) audioContext = new AC();
    const ctx=audioContext;
    if(ctx.state==='suspended') void ctx.resume();
    const now=ctx.currentTime;
    const tone=(freq:number,start=0,dur=.08,type:OscillatorType='square',vol=.055,endFreq?:number)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type=type; o.frequency.setValueAtTime(freq,now+start);
      if(endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),now+start+dur);
      g.gain.setValueAtTime(.0001,now+start); g.gain.exponentialRampToValueAtTime(vol,now+start+.008); g.gain.exponentialRampToValueAtTime(.0001,now+start+dur);
      o.connect(g); g.connect(ctx.destination); o.start(now+start); o.stop(now+start+dur+.02);
    };
    const noise=(start=0,dur=.09,vol=.035)=>{
      const len=Math.max(1,Math.floor(ctx.sampleRate*dur)); const b=ctx.createBuffer(1,len,ctx.sampleRate); const d=b.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const src=ctx.createBufferSource(),g=ctx.createGain(); src.buffer=b; g.gain.setValueAtTime(vol,now+start); g.gain.exponentialRampToValueAtTime(.0001,now+start+dur); src.connect(g);g.connect(ctx.destination);src.start(now+start);
    };
    switch(name){
      case 'click': tone(520,0,.045,'square',.025,430); break;
      case 'start': tone(392,0,.09,'triangle',.05);tone(523,.08,.1,'triangle',.055);tone(659,.17,.14,'triangle',.06);break;
      case 'door': tone(150,0,.18,'sawtooth',.025,80);noise(0,.15,.018);break;
      case 'move1': tone(440,0,.08,'square',.04);tone(554,.08,.08,'square',.04);break;
      case 'move2': tone(392,0,.07,'square',.045);tone(587,.07,.07,'square',.05);tone(784,.14,.09,'square',.05);break;
      case 'move3': tone(523,0,.06,'sawtooth',.04);tone(784,.06,.07,'sawtooth',.045);tone(1047,.13,.12,'sawtooth',.05);break;
      case 'move4': tone(660,0,.05,'square',.045);tone(880,.05,.05,'square',.05);tone(1320,.10,.06,'square',.055);tone(1760,.16,.12,'triangle',.055);break;
      case 'arrive': tone(880,0,.08,'sine',.06);tone(1320,.09,.16,'sine',.045);break;
      case 'success': tone(523,0,.07,'triangle',.05);tone(659,.07,.07,'triangle',.055);tone(784,.14,.13,'triangle',.06);break;
      case 'fail': tone(330,0,.1,'sawtooth',.04);tone(247,.1,.12,'sawtooth',.04);break;
      case 'coin': tone(1175,0,.05,'sine',.055);tone(1568,.06,.09,'sine',.05);break;
      case 'item': tone(880,0,.05,'sine',.045);tone(1319,.05,.06,'sine',.05);tone(1760,.11,.12,'sine',.045);break;
      case 'buy': tone(740,0,.05,'square',.04);tone(988,.06,.08,'square',.045);break;
      case 'sell': tone(1047,0,.05,'sine',.05);tone(1319,.05,.05,'sine',.05);tone(1568,.1,.09,'sine',.05);break;
      case 'mine': noise(0,.1,.07);tone(110,0,.11,'square',.06,70);break;
      case 'gem': tone(988,0,.05,'sine',.045);tone(1480,.04,.08,'sine',.05);tone(1976,.11,.1,'sine',.04);break;
      case 'card': noise(0,.055,.025);tone(330,0,.045,'triangle',.025);break;
      case 'casino': tone(220,0,.05,'square',.035);tone(330,.05,.05,'square',.035);tone(440,.1,.05,'square',.04);break;
      case 'slotStop': tone(900,0,.045,'square',.045,700);break;
      case 'jackpot': [523,659,784,1047].forEach((f,i)=>tone(f,i*.07,.13,'triangle',.06));break;
      case 'warpUp': tone(220,0,.32,'sine',.05,1320);break;
      case 'warpDown': tone(880,0,.32,'sine',.05,110);break;
      case 'roulette': [330,440,554,660].forEach((f,i)=>tone(f,i*.055,.07,'square',.035));break;
      case 'hell': tone(92,0,.35,'sawtooth',.055,55);noise(.02,.28,.02);break;
      case 'gameover': tone(392,0,.13,'triangle',.05);tone(294,.13,.14,'triangle',.05);tone(196,.27,.28,'triangle',.055);break;
      case 'discard': tone(250,0,.08,'square',.035,120);break;
      case 'upgrade': tone(440,0,.06,'triangle',.045);tone(660,.06,.06,'triangle',.05);tone(990,.12,.13,'triangle',.055);break;
    }
  }catch{}
}

type BgmMood = 'tier1'|'tier2'|'tier3'|'tier4'|'tier5'|'god'|'casino'|'blackjack'|'hell'|'mystic'|'lucky'|'health'|'mining'|'shop'|'treasure'|'forge'|'auction'|'adventure';
const BGM_MOOD_GAIN:Record<BgmMood,number>={
  tier1:4.5,tier2:4.2,tier3:3.8,tier4:4.3,tier5:3.2,god:2.8,
  casino:4.5,blackjack:4.5,hell:4.3,mystic:4.0,lucky:4.0,health:4.5,
  mining:4.2,shop:4.5,treasure:4.0,forge:4.3,auction:4.3,adventure:4.5
};
let bgmTimer:number|null=null;
let bgmMood:BgmMood|null=null;
let bgmTier=1;
let bgmStep=0;
let bgmMaster:GainNode|null=null;
const IN_GAME_BGM_VOLUME=1;
function stopBgm(){
  if(typeof window!=='undefined' && bgmTimer!==null) window.clearInterval(bgmTimer);
  bgmTimer=null; bgmMood=null; bgmTier=1; bgmStep=0;
  if(bgmMaster && audioContext){
    const old=bgmMaster;
    const now=audioContext.currentTime;
    try{
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(Math.max(.0001,old.gain.value),now);
      old.gain.exponentialRampToValueAtTime(.0001,now+.08);
      window.setTimeout(()=>{try{old.disconnect();}catch{}},110);
    }catch{try{old.disconnect();}catch{}}
    bgmMaster=null;
  }
}
function startBgm(mood:BgmMood, enabled=true, tier=1){
  if(!enabled || typeof window==='undefined'){stopBgm();return;}
  try{
    const AC=window.AudioContext || (window as any).webkitAudioContext;
    if(!AC)return;
    if(!audioContext)audioContext=new AC();
    const ctx=audioContext; if(ctx.state==='suspended') void ctx.resume();
    if(bgmMood===mood && bgmTier===tier && bgmTimer!==null)return;
    stopBgm(); bgmMood=mood; bgmTier=tier;
    bgmMaster=ctx.createGain();
    const moodGain=IN_GAME_BGM_VOLUME*BGM_MOOD_GAIN[mood];
    bgmMaster.gain.setValueAtTime(.0001,ctx.currentTime);
    bgmMaster.gain.exponentialRampToValueAtTime(moodGain,ctx.currentTime+.035);
    bgmMaster.connect(ctx.destination);

    type MoodCfg={
      chords:number[][]; bass:number[]; melody:number[]; ms:number;
      padType:OscillatorType; leadType:OscillatorType;
      padVol:number; bassVol:number; leadVol:number;
      cutoff:number; detune:number; shimmer?:boolean; tension?:boolean;
    };
    const cfgs:Record<BgmMood,MoodCfg>={
      // 静かなロビー。柔らかいコードと控えめなベル。
      tier1:{
        chords:[[261.63,329.63,392],[220,277.18,329.63],[174.61,220,261.63],[196,246.94,293.66]],
        bass:[65.41,55,43.65,49], melody:[523.25,493.88,440,392,440,493.88,392,329.63], ms:1180,
        padType:'sine',leadType:'triangle',padVol:.018,bassVol:.018,leadVol:.012,cutoff:1350,detune:7
      },
      // 少し推進感。冒険っぽい広がり。
      tier2:{
        chords:[[293.66,349.23,440],[261.63,329.63,392],[220,293.66,349.23],[246.94,293.66,369.99]],
        bass:[73.42,65.41,55,61.74], melody:[587.33,698.46,659.25,523.25,587.33,783.99,698.46,587.33], ms:980,
        padType:'triangle',leadType:'sine',padVol:.020,bassVol:.020,leadVol:.014,cutoff:1700,detune:9
      },
      // 神秘感。浮遊する短三和音と余韻の長い旋律。
      tier3:{
        chords:[[329.63,392,493.88],[293.66,369.99,440],[261.63,329.63,415.3],[293.66,349.23,440]],
        bass:[82.41,73.42,65.41,73.42], melody:[659.25,783.99,987.77,880,783.99,659.25,739.99,587.33], ms:1120,
        padType:'sine',leadType:'sine',padVol:.023,bassVol:.020,leadVol:.014,cutoff:1550,detune:12,shimmer:true
      },
      // 重厚・緊張感。低いドローンと広いコード。
      tier4:{
        chords:[[174.61,207.65,261.63],[196,246.94,293.66],[164.81,207.65,246.94],[146.83,196,233.08]],
        bass:[43.65,49,41.2,36.71], melody:[349.23,392,466.16,523.25,466.16,392,349.23,293.66], ms:920,
        padType:'sawtooth',leadType:'triangle',padVol:.017,bassVol:.026,leadVol:.011,cutoff:780,detune:5,tension:true
      },
      // 荘厳。オルガンのような持続音と鐘。
      tier5:{
        chords:[[261.63,392,523.25],[293.66,440,587.33],[329.63,493.88,659.25],[392,523.25,783.99]],
        bass:[65.41,73.42,82.41,98], melody:[783.99,987.77,1174.66,1046.5,1318.51,1174.66,987.77,1567.98], ms:1320,
        padType:'sine',leadType:'sine',padVol:.027,bassVol:.022,leadVol:.016,cutoff:2100,detune:13,shimmer:true
      },
      // 神の故郷。聖歌・鐘・高音の倍音をイメージ。
      god:{
        chords:[[261.63,329.63,392,523.25],[349.23,440,523.25,698.46],[392,493.88,587.33,783.99],[329.63,415.3,493.88,659.25]],
        bass:[65.41,87.31,98,82.41], melody:[1046.5,1318.51,1567.98,2093,1567.98,1318.51,1174.66,1567.98], ms:1480,
        padType:'sine',leadType:'sine',padVol:.030,bassVol:.018,leadVol:.017,cutoff:2600,detune:15,shimmer:true
      },
      // カジノ。ウォーキングベース風＋柔らかいコード。
      casino:{
        chords:[[329.63,415.3,493.88],[349.23,440,523.25],[293.66,369.99,440],[311.13,392,466.16]],
        bass:[82.41,98,110,123.47,98,82.41,73.42,77.78], melody:[659.25,783.99,739.99,659.25,587.33,698.46,783.99,880], ms:760,
        padType:'triangle',leadType:'sine',padVol:.017,bassVol:.023,leadVol:.012,cutoff:1800,detune:6
      },
      // 地下カードサロン。暗めのラウンジ風。
      blackjack:{
        chords:[[196,233.08,293.66],[174.61,220,261.63],[220,261.63,329.63],[196,246.94,293.66]],
        bass:[49,43.65,55,49], melody:[392,466.16,440,349.23,392,523.25,466.16,392], ms:1280,
        padType:'triangle',leadType:'sine',padVol:.018,bassVol:.020,leadVol:.010,cutoff:1100,detune:8
      },
      // 地獄。旋律ではなく低いドローン中心。
      hell:{
        chords:[[55,82.41,110],[49,73.42,98],[46.25,69.3,92.5],[41.2,61.74,82.41]],
        bass:[27.5,24.5,23.12,20.6], melody:[110,103.83,92.5,98,87.31,82.41,92.5,73.42], ms:1550,
        padType:'sawtooth',leadType:'sine',padVol:.018,bassVol:.030,leadVol:.006,cutoff:420,detune:3,tension:true
      },
      // 占い・祭壇。透明感のあるアンビエント。
      mystic:{
        chords:[[261.63,311.13,392],[293.66,349.23,440],[246.94,293.66,369.99],[277.18,329.63,415.3]],
        bass:[65.41,73.42,61.74,69.3], melody:[783.99,932.33,1046.5,1244.51,1046.5,932.33,830.61,698.46], ms:1380,
        padType:'sine',leadType:'sine',padVol:.022,bassVol:.014,leadVol:.013,cutoff:1900,detune:16,shimmer:true
      },
      // 幸運系。明るいメジャーコードと柔らかなベル。Tierが高いほど華やかになる。
      lucky:{
        chords:[[261.63,329.63,392],[293.66,369.99,440],[329.63,415.3,493.88],[349.23,440,523.25]],
        bass:[65.41,73.42,82.41,87.31], melody:[659.25,783.99,880,987.77,1046.5,987.77,880,783.99], ms:1040,
        padType:'sine',leadType:'triangle',padVol:.020,bassVol:.014,leadVol:.013,cutoff:2100,detune:11,shimmer:true
      },
      // 健康・温泉系。ゆったりした長いコードと低い呼吸感。
      health:{
        chords:[[261.63,329.63,392],[246.94,311.13,369.99],[220,277.18,329.63],[233.08,293.66,349.23]],
        bass:[65.41,61.74,55,58.27], melody:[523.25,587.33,659.25,587.33,523.25,493.88,440,493.88], ms:1450,
        padType:'sine',leadType:'sine',padVol:.024,bassVol:.013,leadVol:.009,cutoff:1250,detune:18
      },
      // 採掘系。洞窟の重さを感じる低音と金属的な余韻。
      mining:{
        chords:[[130.81,164.81,196],[146.83,174.61,220],[123.47,155.56,185],[110,146.83,174.61]],
        bass:[32.7,36.71,30.87,27.5], melody:[261.63,329.63,392,349.23,293.66,392,466.16,329.63], ms:1120,
        padType:'triangle',leadType:'triangle',padVol:.020,bassVol:.026,leadVol:.009,cutoff:760,detune:4,tension:true
      },
      // ショップ系。明るく落ち着いた買い物BGM。
      shop:{
        chords:[[261.63,329.63,392],[349.23,440,523.25],[293.66,369.99,440],[392,493.88,587.33]],
        bass:[65.41,87.31,73.42,98], melody:[523.25,659.25,587.33,698.46,659.25,783.99,698.46,587.33], ms:920,
        padType:'triangle',leadType:'sine',padVol:.017,bassVol:.016,leadVol:.011,cutoff:1750,detune:7
      },
      // 宝箱・アイテム箱系。期待感のあるキラキラした進行。
      treasure:{
        chords:[[329.63,415.3,493.88],[392,493.88,587.33],[440,554.37,659.25],[493.88,622.25,739.99]],
        bass:[82.41,98,110,123.47], melody:[659.25,830.61,987.77,1174.66,987.77,830.61,739.99,987.77], ms:1080,
        padType:'sine',leadType:'triangle',padVol:.020,bassVol:.012,leadVol:.014,cutoff:2350,detune:14,shimmer:true
      },
      // 鍛冶屋。炉と金属をイメージした重厚なリズム感。
      forge:{
        chords:[[164.81,207.65,246.94],[174.61,220,261.63],[146.83,185,220],[196,246.94,293.66]],
        bass:[41.2,43.65,36.71,49], melody:[329.63,392,493.88,440,392,523.25,466.16,392], ms:850,
        padType:'sawtooth',leadType:'triangle',padVol:.015,bassVol:.024,leadVol:.009,cutoff:850,detune:5,tension:true
      },
      // 競売・オークション。高級感と緊張感のある進行。
      auction:{
        chords:[[220,277.18,329.63],[246.94,311.13,369.99],[261.63,329.63,392],[293.66,369.99,440]],
        bass:[55,61.74,65.41,73.42], melody:[440,554.37,659.25,622.25,739.99,659.25,587.33,698.46], ms:1000,
        padType:'triangle',leadType:'sine',padVol:.019,bassVol:.018,leadVol:.011,cutoff:1450,detune:9
      },
      // 扉・階段・分岐など冒険系。前進感のあるコード。
      adventure:{
        chords:[[196,246.94,293.66],[220,277.18,329.63],[246.94,293.66,369.99],[261.63,329.63,392]],
        bass:[49,55,61.74,65.41], melody:[392,493.88,587.33,659.25,587.33,523.25,493.88,587.33], ms:900,
        padType:'triangle',leadType:'triangle',padVol:.018,bassVol:.019,leadVol:.011,cutoff:1550,detune:7
      }
    };
    const c=cfgs[mood];
    const tierShape=Math.max(1,Math.min(5,tier));
    const pitchScale=Math.pow(2,((tierShape-1)*0.45)/12);
    const brightness=1+(tierShape-1)*0.09;
    const volumeScale=1+(tierShape-1)*0.035;

    const connectToDestination=(node:AudioNode, cutoff:number, volume:number)=>{
      const filter=ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=cutoff; filter.Q.value=.45;
      const gain=ctx.createGain(); gain.gain.value=volume;
      node.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      return gain;
    };
    const sustainedTone=(freq:number,when:number,dur:number,type:OscillatorType,vol:number,detune=0,cutoff=c.cutoff)=>{
      const o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
      o.type=type; o.frequency.value=freq*pitchScale; o.detune.value=detune;
      f.type='lowpass'; f.frequency.value=cutoff*brightness; f.Q.value=.35;
      g.gain.setValueAtTime(.0001,when);
      g.gain.linearRampToValueAtTime(vol*volumeScale,when+.22);
      g.gain.setValueAtTime(vol*volumeScale,Math.max(when+.24,when+dur-.38));
      g.gain.exponentialRampToValueAtTime(.0001,when+dur);
      o.connect(f);f.connect(g);g.connect(bgmMaster || ctx.destination);o.start(when);o.stop(when+dur+.05);
    };
    const padChord=(notes:number[],when:number,dur:number)=>{
      notes.forEach((n,i)=>{
        sustainedTone(n,when,dur,c.padType,c.padVol,c.detune*(i-1));
        // デチューンした2本目で厚みを出す
        sustainedTone(n,when+.01,dur,c.padType,c.padVol*.44,-c.detune*(i+1),c.cutoff*.92);
      });
    };
    const bass=(freq:number,when:number,dur:number)=>{
      sustainedTone(freq,when,dur,'sine',c.bassVol,0,Math.min(520,c.cutoff));
      if(mood==='tier4'||mood==='hell') sustainedTone(freq/2,when,dur,'triangle',c.bassVol*.35,0,260);
    };
    const lead=(freq:number,when:number,dur:number)=>{
      const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      o.type=c.leadType;o.frequency.value=freq*pitchScale;f.type='lowpass';f.frequency.value=Math.max(900,c.cutoff*1.15);f.Q.value=.25;
      g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(c.leadVol*volumeScale,when+.06);g.gain.exponentialRampToValueAtTime(.0001,when+dur);
      o.connect(f);f.connect(g);g.connect(bgmMaster || ctx.destination);o.start(when);o.stop(when+dur+.05);
    };
    const bell=(freq:number,when:number)=>{
      [1,2.01,3.98].forEach((mul,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq*mul*pitchScale;
        g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime((i===0?.012:.0045),when+.01);g.gain.exponentialRampToValueAtTime(.0001,when+1.6+i*.25);
        o.connect(g);g.connect(bgmMaster || ctx.destination);o.start(when);o.stop(when+2);
      });
    };
    const breath=(when:number,dur:number,vol=.0025)=>{
      const len=Math.max(1,Math.floor(ctx.sampleRate*dur));const b=ctx.createBuffer(1,len,ctx.sampleRate);const d=b.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=(Math.random()*2-1);
      const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=b;f.type='lowpass';f.frequency.value=mood==='hell'?180:480;
      g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(vol,when+.25);g.gain.exponentialRampToValueAtTime(.0001,when+dur);
      src.connect(f);f.connect(g);g.connect(bgmMaster || ctx.destination);src.start(when);src.stop(when+dur+.05);
    };

    const tick=()=>{
      if(!audioContext||bgmMood!==mood)return;
      const now=audioContext.currentTime+.02;
      const chord=c.chords[bgmStep%c.chords.length];
      const dur=Math.max(.9,(c.ms/1000)*1.55);
      padChord(chord,now,dur);
      bass(c.bass[bgmStep%c.bass.length],now,dur*.9);

      // 旋律は毎回ではなく間を空けて鳴らし、ピコピコ感を抑える
      if(bgmStep%2===0) lead(c.melody[bgmStep%c.melody.length],now+.28,Math.min(.9,dur*.72));
      if(c.shimmer && bgmStep%4===0) bell(c.melody[(bgmStep+2)%c.melody.length],now+.42);
      if(c.tension && bgmStep%3===0) breath(now,dur*.95,mood==='hell'?.0045:.0026);
      if(mood==='casino' && bgmStep%2===1) lead(c.melody[(bgmStep+3)%c.melody.length],now+.46,.34);
      if(mood==='god' && bgmStep%2===0) bell(c.melody[bgmStep%c.melody.length]/2,now+.12);
      bgmStep++;
    };
    tick(); bgmTimer=window.setInterval(tick,c.ms);
  }catch{}
}

const ri=(a:number,b:number)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=<T,>(a:T[])=>a[Math.floor(Math.random()*a.length)];

function makeItem(id:ItemId,n=1):Item{
  switch(id){
    case 'mirror': return {id,name:`乱反射の鏡★${n}`,type:'consumable',paramN:n,desc:`使うと次に進む階数が${n}倍になる。`,price:n*150+200,icon:FaWandMagicSparkles};
    case 'ring': return {id,name:`幸運の指輪★${n}`,type:'consumable',paramN:n,desc:`3ターンの間運気が+${n}。`,price:n*100+200,icon:FaRing};
    case 'sage_gem': return {id,name:'賢者の宝石',type:'consumable',desc:'現在階の1の位だけ運気上昇。',price:600,icon:FaGem};
    case 'party_set': return {id,name:'パーティーセット',type:'consumable',desc:'次回のボタン押下で好演出確定。',price:500,icon:FaGift};
    case 'money_tree': return {id,name:`お金のなる木★${n}`,type:'passive',paramN:n,desc:`毎ターンお金+${100*n}円。`,price:n*400+400,icon:FaTree};
    case 'blessing_charm': return {id,name:`幸せのお守り★${n}`,type:'passive',paramN:n,desc:`毎ターン運気+${n}。`,price:n*400+400,icon:FaStar};
    case 'shop_ticket': return {id,name:'お店チケット',type:'consumable',desc:'次の部屋が確実にお店になる。',price:0,icon:FaTicket};
    case 'ruby': return {id,name:'ルビー',type:'gem',count:n,desc:'ショップで300円で売れる宝石。',price:300,icon:FaGem};
    case 'emerald': return {id,name:'エメラルド',type:'gem',count:n,desc:'ショップで500円で売れる宝石。',price:500,icon:FaGem};
    case 'diamond': return {id,name:'ダイヤモンド',type:'gem',count:n,desc:'ショップで1000円で売れる宝石。',price:1000,icon:FaGem};
    case 'yata_mirror': return {id,name:'乱反射の八咫鏡',type:'passive',desc:'持っている間、ボタンで出た上昇階数が常に2倍になる伝説の神器。',price:2500,icon:FaWandMagicSparkles};
    case 'kusanagi': return {id,name:'強運の天叢雲剣',type:'passive',desc:'持っている間、ボタンを押すたびに運気+2・所持金+200円。',price:1500,icon:FaBolt};
    case 'immortal_mag': return {id,name:'不老の八尺瓊勾玉',type:'passive',desc:'持っている間、Tier4以上の部屋が出るまで残り回数が減らない。Tier4以上に到着すると消失。',price:1500,icon:FaGem};
  }
}
const baseState:State={floor:1,turnsLeft:10,luck:0,money:1000,highScore:1,items:[],logs:[],ringBuff:{active:false,turns:0,amount:0},mirrorMultiplier:1,partySet:false,inHell:false};

function itemPalette(item:Item){
  switch(item.id){
    case 'mirror': return {bg:'rgba(8,145,178,.18)',border:'cyan.500',icon:'cyan.200',text:'cyan.100'};
    case 'ring': return {bg:'rgba(5,150,105,.18)',border:'green.500',icon:'green.200',text:'green.100'};
    case 'sage_gem': return {bg:'rgba(126,34,206,.20)',border:'purple.500',icon:'purple.200',text:'purple.100'};
    case 'party_set': return {bg:'rgba(219,39,119,.18)',border:'pink.500',icon:'pink.200',text:'pink.100'};
    case 'money_tree': return {bg:'rgba(101,163,13,.18)',border:'lime.500',icon:'lime.200',text:'lime.100'};
    case 'blessing_charm': return {bg:'rgba(16,185,129,.18)',border:'teal.500',icon:'teal.200',text:'teal.100'};
    case 'shop_ticket': return {bg:'rgba(217,119,6,.18)',border:'orange.500',icon:'orange.200',text:'orange.100'};
    case 'ruby': return {bg:'rgba(220,38,38,.18)',border:'red.500',icon:'red.300',text:'red.100'};
    case 'emerald': return {bg:'rgba(5,150,105,.18)',border:'green.500',icon:'green.300',text:'green.100'};
    case 'diamond': return {bg:'rgba(14,165,233,.18)',border:'blue.400',icon:'blue.200',text:'blue.100'};
    case 'yata_mirror': return {bg:'rgba(250,204,21,.18)',border:'yellow.400',icon:'yellow.200',text:'yellow.100'};
    case 'kusanagi': return {bg:'rgba(239,68,68,.18)',border:'red.400',icon:'orange.200',text:'orange.100'};
    case 'immortal_mag': return {bg:'rgba(192,132,252,.20)',border:'purple.400',icon:'purple.200',text:'purple.100'};
    default: return {bg:'rgba(55,65,81,.9)',border:'gray.500',icon:'gray.200',text:'white'};
  }
}


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
  const [rareArrival,setRareArrival]=useState(0);
  const [doorChoices,setDoorChoices]=useState<DoorChoice[]>([]);
  const [gameSpeed,setGameSpeed]=useState<1|2>(1);
  const fastTimeout=(fn:()=>void,ms:number)=>window.setTimeout(fn,ms/gameSpeed);
  const fastInterval=(fn:()=>void,ms:number)=>window.setInterval(fn,ms/gameSpeed);
  const rules=useDisclosure(), guide=useDisclosure(), itemGuide=useDisclosure(), rank=useDisclosure(), stagePreview=useDisclosure(), inventoryPanel=useDisclosure(), logPanel=useDisclosure(), nameEdit=useDisclosure(), historyModal=useDisclosure(), resetRecords=useDisclosure();
  const [previewStage,setPreviewStage]=useState<StageCatalogEntry|null>(null);
  const [statusDetail,setStatusDetail]=useState<'turns'|'luck'|'money'|null>(null);
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
    if(!firebaseReady){
      setRankingStatus('offline');
    }else{
      // 起動時にはFirestoreを読まない。ランキングを開いた時だけ取得する。
      setRankingStatus('connecting');
    }
  },[]);

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
    setRankingMode('monthly');
    void loadRankingMode('monthly');
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
    else if(room.kind==='fortune'||room.kind==='altar'||room.kind==='ultimate'||room.kind==='warp') mood='mystic';
    else if(room.kind==='mining'||title.includes('採掘')) mood='mining';
    else if(room.kind==='shop'||room.kind==='vending'||title.includes('お店')||title.includes('ホームセンター')||title.includes('自動販売機')) mood='shop';
    else if(room.kind==='forge') mood='forge';
    else if(room.kind==='auction'||room.kind==='mystery'||title.includes('競売')||title.includes('オークション')) mood='auction';
    else if(room.kind==='itembox'||title.includes('宝箱')||title.includes('アイテム箱')||title.includes('小箱')) mood='treasure';
    else if(title.includes('ラッキー')||title.includes('運気')) mood='lucky';
    else if(title.includes('健康')||title.includes('無病')||title.includes('不老不死')||title.includes('湯')) mood='health';
    else if(room.kind==='doors'||room.kind==='crossroads'||title.includes('階段')||title.includes('扉')||title.includes('分岐')) mood='adventure';
    startBgm(mood,soundOn,room.tier);
    return ()=>{};
  },[room.tier,room.kind,room.title,s.inHell,soundOn,menu,gameover]);

  useEffect(()=>{
    if(room.kind!=='vending') setVendingFeedback(null);
  },[room.kind,room.title]);
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

  const start=()=>{playSfx('start',soundOn);runRecordedRef.current=false;setNewPersonalBest(false);setScorePreview(null);setScorePreviewError('');setScorePreviewLoading(false);setRoomIntro(false);scoreSubmitLockRef.current=false;setScoreSubmitting(false);setScoreSaveMessage('');setScoreSubmitted(false);setForgeUsed(false);setAtmDeposit(0);setAtmInput('');setLegendShopUsed(false);setWarpAnimating(false);setWarpMessage('');setS({...baseState,highScore:s.highScore});setMenu(false);setGameover(false);setDoors(true);setRoom({tier:1,title:'エレベーターホール',desc:'エレベーターに乗りました。ボタンを押して上の階を目指しましょう！'});};
  const end=()=>{
    playSfx('gameover',soundOn);
    scoreSubmitLockRef.current=false;setScoreSubmitting(false);setScoreSaveMessage('');setScoreSubmitted(false);setAtmDeposit(0);setAtmInput('');
    const beatHighScore=s.floor>s.highScore;
    setNewPersonalBest(beatHighScore);
    if(!runRecordedRef.current){
      runRecordedRef.current=true;
      const history=appendPlayHistory({score:s.floor,floor:s.floor,money:s.money,luck:s.luck});
      setLocalPlayHistory(history);
      setLocalHistorySummary(getLocalHistorySummary(history));
    }
    setGameover(true);
    if(beatHighScore){void refreshScorePreview(s.floor);}else{setScorePreview(null);setScorePreviewError('');setScorePreviewLoading(false);}
    setS(x=>{const h=Math.max(x.highScore,x.floor); localStorage.setItem('infinite_elevator_highscore',String(h)); return {...x,highScore:h};});
  };

  const triggerRoom=(forcedTier?:number,forcedType?:string)=>{
    let tier=forcedTier||1; if(!forcedTier){const r=Math.random()*100;tier=r<40?1:r<70?2:r<90?3:r<99?4:5;} if(forcedShop){tier=1;forcedType='SHOP_SMALL';setForcedShop(false);}
    executeRoom(tier,forcedType);
  };
  const executeRoom=(tier:number,type?:string)=>{
    setRoomIntro(true);
    if(tier>=4){setS(current=>{const had=current.items.some(i=>i.id==='immortal_mag');return had?{...current,items:current.items.filter(i=>i.id!=='immortal_mag'),logs:['不老の八尺瓊勾玉が役目を終えて消失した。',...current.logs]}:current;});}
    if(tier===1){const t=type||pick(['NOTHING','LUCKY','MONEY_FOUND','STAIRS_SHORT','DOORS','SHOP_SMALL','FORTUNE','BOXES','BARTER','CROSSROADS']);
      if(t==='NOTHING')show({tier,title:'何も無い部屋',desc:'静けさが漂っている。',result:'変化なし'});
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
    } else if(tier===2){const t=type||pick(['VENDING','SUPER_LUCKY','HEALTH','TREASURE','RUBY_MINING','STAIRS_MED','SHOP_MED','BLACKJACK','FORGE','ALTAR','MYSTERY_AUCTION','ATM']);
      if(t==='VENDING'){setVendingCount(0);const sale=Math.random()<.20;show({tier,title:'自動販売機',desc:'購入すると1/2の確率で+1される。購入は1回の訪問につき最大5回まで。',result:sale?'🎉 20%抽選当選！ 半額セール開催中':'自販機発見',resultType:sale?'gold':'neutral',kind:'vending',payload:{sale}});}
      else if(t==='SUPER_LUCKY'){const g=ri(3,5);show({tier,title:'超ラッキー部屋',desc:'鮮やかな緑の光と粒子がゆっくり舞い始める。',result:'強い祝福を受け取ろう',kind:'reveal',payload:{type:'luck',amount:g}});}
      else if(t==='HEALTH'){const g=1;show({tier,title:'健康の湯',desc:'あたたかな湯気が疲れをゆっくりほどいていく。',result:'温泉に浸かって休もう',kind:'reveal',payload:{type:'health',amount:g}});}
      else if(t==='TREASURE'){show({tier,title:'小さな宝箱',desc:'少し上質な古い宝箱が置かれている。',result:'宝箱を開けてみよう',kind:'reveal',payload:{type:'treasure'}});}
      else if(t==='RUBY_MINING')setupMining(tier,'ruby');
      else if(t==='STAIRS_MED'){const g=ri(20,50);show({tier,title:'長い階段',desc:'高い場所へ続く長い螺旋階段が現れた。',result:'息を整えて登ろう',kind:'reveal',payload:{type:'stairs',amount:g}});}
      else if(t==='SHOP_MED')setupShop(tier,3); else if(t==='BLACKJACK'){setBj({playing:false,bet:100,p:[],d:[]});setBjPhase('');show({tier,title:'地下カードサロン',desc:'BJでディーラーと勝負(21以内で高い方が勝ち)。',result:'勝負可能',kind:'blackjack'});}
      else if(t==='FORGE'){setForgeUsed(false);show({tier,title:'魔法鍛冶屋',desc:'鏡や指輪の性能を無料で1つだけ強化(+1~3)します！',result:'この部屋では1回だけ強化できます',kind:'forge'});}
      else if(t==='ALTAR')show({tier,title:'運試しの祭壇',desc:'何を捧げるかで加護が変わる。',result:'祭壇に祈る',kind:'altar'});
      else if(t==='ATM'){setAtmInput('');show({tier,title:'ATM',desc:atmDeposit>0?'以前預けたお金が満期になっている。5倍で受け取れる。':'好きな金額を預けられる特殊ATM。次にこの部屋へ来ると5倍になって戻ってくる。',result:atmDeposit>0?`預金 ${atmDeposit}円 → 受取 ${atmDeposit*5}円`:'預け入れ可能',resultType:atmDeposit>0?'gold':'neutral',kind:'atm'});}
      else show({tier,title:'ミステリーオークション',desc:'謎の袋が出品中。(1000円)',result:'競り参加',kind:'mystery'});
    } else if(tier===3){const t=type||pick(['CASINO','SUPER_LUCKY_3','HEALTH_2','EMERALD_MINING','STAIRS_LONG','SHOP_LARGE','ITEM_BOX','SURVEY_GIRL']);
      if(t==='CASINO'){setCasinoSpinsLeft(10);setSlotMessage('');setSlot(['❔','❔','❔']);setSlotWin(false);show({tier,title:'スロットカジノ',desc:'1回の訪問につき最大10スピン。ルビー5倍・エメラルド10倍・ダイヤ30倍。',result:'CASINO OPEN / 残り10回',kind:'casino'});} 
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
    } else if(tier===4){const t=type||pick(['WARP','AUCTION','DIAMOND_MINING','HEALTH_3']);
      if(t==='WARP')show({tier,title:'ワープホール',desc:'使うとランダムに移動できる。',result:'ワープホール現る',kind:'warp'});
      else if(t==='AUCTION')show({tier,title:'神々の競売場',desc:'最高峰の品がオークションに出品。',result:'競売開催中',kind:'auction'});
      else if(t==='DIAMOND_MINING')setupMining(tier,'diamond');
      else if(t==='HEALTH_3'){const g=ri(4,5);show({tier,title:'不老不死の湯',desc:'天空の湯から神秘的な光が立ち上っている。',result:'伝説の湯へ浸かろう',kind:'reveal',payload:{type:'health',amount:g}});}
    } else {const t=type||pick(['ULTIMATE_ROULETTE','GOD','LEGEND_SHOP']);if(t==='ULTIMATE_ROULETTE'){setUltimateMessage('???');setUltimateSpinning(false);show({tier,title:'究極のルーレット',desc:'神々の気まぐれ。究極ルーレットに挑むか？',result:'運命のルーレット',kind:'ultimate'});} else if(t==='LEGEND_SHOP'){setLegendShopUsed(false);show({tier,title:'伝説の神器商店',desc:'この場所でしか手に入らない三種の神器を扱う。購入できるのは1回の訪問につき1つだけ。',result:'神器を1つ選べ',resultType:'gold',kind:'legendshop'});} else show({tier,title:'神の故郷',desc:'好きなアイテムを一つ選べます。',result:'神の加護',kind:'god'});}
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

    const stageMap:Record<string,{tier:number;type:string}>={
      '何も無い部屋':{tier:1,type:'NOTHING'},
      'ラッキー部屋':{tier:1,type:'LUCKY'},
      '落ちている財布':{tier:1,type:'MONEY_FOUND'},
      '短い階段':{tier:1,type:'STAIRS_SHORT'},
      '2つの扉':{tier:1,type:'DOORS'},
      '小さなお店':{tier:1,type:'SHOP_SMALL'},
      '占い師の小部屋':{tier:1,type:'FORTUNE'},
      '3つの怪しい小箱':{tier:1,type:'BOXES'},
      '怪しい物々交換所':{tier:1,type:'BARTER'},
      '運命の分岐路':{tier:1,type:'CROSSROADS'},
      '自動販売機':{tier:2,type:'VENDING'},
      '超ラッキー部屋':{tier:2,type:'SUPER_LUCKY'},
      '健康の湯':{tier:2,type:'HEALTH'},
      '小さな宝箱':{tier:2,type:'TREASURE'},
      'ルビーの採掘場':{tier:2,type:'RUBY_MINING'},
      '長い階段':{tier:2,type:'STAIRS_MED'},
      '大きなお店':{tier:2,type:'SHOP_MED'},
      '地下カードサロン':{tier:2,type:'BLACKJACK'},
      '魔法鍛冶屋':{tier:2,type:'FORGE'},
      '運試しの祭壇':{tier:2,type:'ALTAR'},
      'ミステリーオークション':{tier:2,type:'MYSTERY_AUCTION'},
      'スロットカジノ':{tier:3,type:'CASINO'},
      '極ラッキー部屋':{tier:3,type:'SUPER_LUCKY_3'},
      '無病の湯':{tier:3,type:'HEALTH_2'},
      'エメラルドの採掘場':{tier:3,type:'EMERALD_MINING'},
      '果てしなく長い階段':{tier:3,type:'STAIRS_LONG'},
      'ホームセンター':{tier:3,type:'SHOP_LARGE'},
      '不思議なアイテム箱':{tier:3,type:'ITEM_BOX'},
      'アンケート娘':{tier:3,type:'SURVEY_GIRL'},
      'ワープホール':{tier:4,type:'WARP'},
      '神々の競売場':{tier:4,type:'AUCTION'},
      'ダイヤモンドの採掘場':{tier:4,type:'DIAMOND_MINING'},
      '不老不死の湯':{tier:4,type:'HEALTH_3'},
      'ATM':{tier:2,type:'ATM'},
      '究極のルーレット':{tier:5,type:'ULTIMATE_ROULETTE'},
      '神の故郷':{tier:5,type:'GOD'},
      '伝説の神器商店':{tier:5,type:'LEGEND_SHOP'}
    };
    const target=stageMap[stage.title];
    if(target) executeRoom(target.tier,target.type);
  };

  const setupMining=(tier:number,gem:ItemId)=>{setRocks(Array.from({length:5},()=>{const ok=Math.random()<.60;const r=Math.random();const count=ok?(r<.55?1:r<.85?2:3):0;return {gem:ok?gem:null,count,open:false}}));setPicks(2);show({tier,title:gem==='ruby'?'ルビーの採掘場':gem==='emerald'?'エメラルドの採掘場':'ダイヤモンドの採掘場',desc:'5つの岩から2つ壊そう！宝石が出るかも！',result:'岩を選んで壊そう',kind:'mining'});};
  const setupShop=(tier:number,count:number)=>{const pool=[makeItem('mirror',ri(3,5)),makeItem('ring',ri(6,9)),makeItem('shop_ticket'),makeItem('sage_gem'),makeItem('party_set'),makeItem('money_tree',ri(1,2)),makeItem('blessing_charm',ri(1,2))].sort(()=>Math.random()-.5).slice(0,count).map(item=>({item,sold:false}));setShop(pool);show({tier,title:count===1?'小さなお店':count===3?'大きなお店':'ホームセンター',desc:'アイテムの購入が可能。※宝石のみ売却できます。',result:'ショップ営業中',kind:'shop'});};

  const press=()=>{if(moving||gameover||s.turnsLeft<=0||s.inHell)return; playSfx('door',soundOn); setMoving(true);setDoors(false); let x={...s,items:[...s.items],ringBuff:{...s.ringBuff}}; const protectedByMag=x.items.some(i=>i.id==='immortal_mag'); if(!protectedByMag)x.turnsLeft--; x.items.forEach(i=>{if(i.id==='money_tree')x.money+=100*(i.paramN||1); if(i.id==='blessing_charm')x.luck+=(i.paramN||1); if(i.id==='kusanagi'){x.luck+=2;x.money+=200;}});
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
      setOverlay({show:true,tier:1,steps:ri(1,12),detail:'NORMALから昇格抽選スタート…',locked:false});
      let currentTier=1; let ticks=0;
      const timer=fastInterval(()=>{ticks++;playSfx(currentTier>=3?'slotStop':'click',soundOn);setOverlay(o=>({...o,steps:ri(1,Math.max(12,Math.min(99,rawSteps))),detail:currentTier===1?'昇格するか…？':currentTier===2?'🚀 さらに上へ昇格抽選…！':currentTier===3?'⚡ OVERDRIVE昇格を抽選中…！':'🔥 神速モード確定へ…！'}));},85);
      const promote=(tier:number,msg:string)=>{currentTier=tier;playSfx((`move${Math.min(4,tier)}` as SfxName),soundOn);setOverlay(o=>({...o,tier,detail:msg}));};
      if(targetTier>=2)fastTimeout(()=>promote(2,'昇格！ 🚀 BOOSTER'),700);
      if(targetTier>=3){fastTimeout(()=>setOverlay(o=>({...o,detail:'BOOSTER継続… まだ止まらない…！'})),1250);fastTimeout(()=>promote(3,'さらに昇格！ ⚡ LIMIT BREAK'),1750);}
      if(targetTier>=4){fastTimeout(()=>setOverlay(o=>({...o,detail:'LIMIT BREAK継続… 最上位まで行くか…！？'})),2550);fastTimeout(()=>{promote(4,'最上位昇格！ ✨ OVERDRIVE / 激熱 ✨');playSfx('jackpot',soundOn);},3200);}
      const revealDelay=targetTier===1?1380:targetTier===2?2100:targetTier===3?3000:4500;
      fastTimeout(()=>{
        window.clearInterval(timer);
        setOverlay({show:true,tier:targetTier,steps:rawSteps,detail:`素の上昇値：基礎${base} + 運気(${effectiveLuck})×${luckMult}`,locked:true});
        const finish=()=>{const multDetail=[mirrorMul>1?`乱反射×${mirrorMul}`:'',yataMul>1?'八咫鏡×2':''].filter(Boolean).join(' ＋ ');setOverlay({show:true,tier:targetTier,steps:finalSteps,detail:multDetail?`✨ ${multDetail} 適用！ ${rawSteps} → ${finalSteps}階 ✨`:`上昇階数 +${finalSteps} 確定！`,locked:true});playSfx(targetTier>=3?'jackpot':'arrive',soundOn);fastTimeout(()=>{setOverlay(o=>({...o,show:false}));setS(y=>({...y,floor:y.floor+finalSteps,logs:[`【ボタン】演出${targetTier}! +${finalSteps}階登った！`,...y.logs]}));fastTimeout(()=>{playSfx('arrive',soundOn);triggerRoom();setDoors(true);setMoving(false);},180);},900);};
        if(mirrorMul>1){fastTimeout(()=>{playSfx('item',soundOn);setOverlay({show:true,tier:targetTier,steps:rawSteps,detail:`🪞 乱反射の鏡★${mirrorMul} 発動！ ${rawSteps}階を ×${mirrorMul} へ！`,locked:true});fastTimeout(finish,900);},650);}else{fastTimeout(finish,650);}
      },revealDelay);
    },420);
  };

  const useItem=(i:number)=>{const item=s.items[i]; if(!item||item.type!=='consumable')return; if(item.id==='mirror'&&s.mirrorMultiplier>1){playSfx('fail',soundOn);log(`乱反射の鏡★${s.mirrorMultiplier}が発動待機中のため、別の鏡は使えない`);return;} playSfx('item',soundOn); const ns={...s,items:[...s.items]}; if(item.id==='mirror')ns.mirrorMultiplier=item.paramN||1; else if(item.id==='ring'){if(ns.ringBuff.active)return;ns.ringBuff={active:true,turns:3,amount:item.paramN||1};ns.luck+=item.paramN||1;} else if(item.id==='sage_gem')ns.luck+=ns.floor%10; else if(item.id==='party_set')ns.partySet=true; else if(item.id==='shop_ticket')setForcedShop(true); ns.items.splice(i,1);setS(ns);setSelected(null);};
  const sellGem=(i:number)=>{const item=s.items[i];if(item?.type!=='gem'||(room.kind!=='shop'&&room.kind!=='legendshop')){playSfx('fail',soundOn);return;}playSfx('sell',soundOn);const total=item.price*(item.count||1);setS(x=>({...x,money:x.money+total,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};
  const discard=(i:number)=>{playSfx('discard',soundOn);setS(x=>({...x,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};

  const submitScore=async()=>{
    if(!newPersonalBest||scoreSubmitted||scoreSubmitLockRef.current)return;
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

  const warp=(min:number,max:number,label:string)=>{if(warpAnimating)return;setWarpAnimating(true);setWarpMessage(`${label}：空間座標を固定中…`);playSfx('roulette',soundOn);let tick=0;const timer=fastInterval(()=>{const fake=ri(min,max);setWarpMessage(`🌀 座標跳躍中… ${fake>=0?'+':''}${fake}階？`);playSfx(tick%3===0?'warpUp':'slotStop',soundOn);tick++;},110);fastTimeout(()=>{window.clearInterval(timer);setWarpMessage('⚡ 次元境界を突破！');playSfx('jackpot',soundOn);},1250);fastTimeout(()=>{const d=ri(min,max);playSfx(d>=0?'warpUp':'warpDown',soundOn);setWarpMessage(`${d>=0?'+':''}${d}階へ座標確定！`);setWarpAnimating(false);show({...room,result:`${d>=0?'+':''}${d}階へワープ開始！`,resultType:d>=0?'gold':'danger'});fastTimeout(()=>moveByEvent(d,`${label} / WARP`),420);},1850);};
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
    if(kind==='crossroads')return <SimpleGrid columns={2} spacing={2}><Action title="平坦路" sub="確実に+300円" onClick={()=>{playSfx('coin',soundOn);patch(current=>({money:current.money+300}));show({...room,kind:undefined,result:'+300円',resultType:'success'})}}/><Action title="茨の道" sub="1500円 or -500円" onClick={()=>{const win=Math.random()<.5;playSfx(win?'success':'fail',soundOn);patch(current=>({money:Math.max(0,current.money+(win?1500:-500))}));show({...room,kind:undefined,result:win?'+1500円':'-500円',resultType:win?'gold':'danger'})}}/></SimpleGrid>;
    if(kind==='barter')return <Stack spacing={1.5}><HStack justify="space-between"><Text fontSize="10px" color="gray.300">この訪問での交換</Text><Badge colorScheme={barterCount>=5?'red':'teal'}>{barterCount} / 5回</Badge></HStack><Action title="運気2 ⇆ 300円" disabled={barterCount>=5} onClick={()=>{if(barterCount>=5){playSfx('fail',soundOn);return;}if(s.luck>=2){playSfx('coin',soundOn);patch(current=>({luck:current.luck-2,money:current.money+300}));setBarterCount(c=>c+1);}else playSfx('fail',soundOn);}}/><Action title="600円 ⇆ 回数+1" disabled={barterCount>=5} onClick={()=>{if(barterCount>=5){playSfx('fail',soundOn);return;}if(s.money>=600){playSfx('success',soundOn);patch(current=>({money:current.money-600,turnsLeft:current.turnsLeft+1}));setBarterCount(c=>c+1);}else playSfx('fail',soundOn);}}/>{barterCount>=5&&<Text fontSize="10px" color="orange.200" textAlign="center">この訪問での交換上限（5回）に達しました</Text>}</Stack>;
    if(kind==='reveal'){
      const type=room.payload?.type as string|undefined;
      const amount=Number(room.payload?.amount||0);
      const icon=type==='health'?'♨️':type==='stairs'?'🪜':type==='luck'?'🍀':type==='wallet'?'👛':'🎁';
      const buttonLabel=type==='health'?'湯に浸かる':type==='stairs'?'階段を登る':type==='luck'?'祝福を受け取る':type==='wallet'?'財布を拾う':'宝箱を開ける';
      return <Stack spacing={2}><Center><Box w="86px" h="86px" rounded="full" display="grid" placeItems="center" bg="blackAlpha.500" border="1px solid" borderColor={eventAnimating?'yellow.300':'whiteAlpha.300'} boxShadow={eventAnimating?'0 0 34px rgba(250,204,21,.55), inset 0 0 22px rgba(255,255,255,.10)':'inset 0 0 16px rgba(0,0,0,.6)'} animation={eventAnimating?'revealPulse .42s ease-in-out infinite alternate':undefined}><Text fontSize="4xl">{icon}</Text></Box></Center><Button w="100%" colorScheme={type==='health'?'cyan':type==='luck'?'green':type==='stairs'?'blue':'yellow'} color={type==='wallet'||type==='treasure'?'black':undefined} isLoading={eventAnimating} loadingText="結果を確認しています…" isDisabled={eventAnimating} onClick={()=>{if(eventAnimating)return;setEventAnimating(true);playSfx(type==='stairs'?'move2':type==='health'?'success':type==='luck'?'item':'roulette',soundOn);show({...room,result:type==='treasure'?'宝箱の鍵がゆっくり外れていく…':'効果が現れ始めた…'});fastTimeout(()=>{if(type==='luck'){patch(current=>({luck:current.luck+amount}));playSfx('success',soundOn);show({...room,kind:undefined,result:`運気 +${amount}`,resultType:'success'});}else if(type==='health'){patch(current=>({turnsLeft:current.turnsLeft+amount}));playSfx('success',soundOn);show({...room,kind:undefined,result:`残り回数 +${amount}`,resultType:'success'});}else if(type==='stairs'){setEventAnimating(false);show({...room,result:`+${amount}階！ 階段を移動中…`,resultType:'gold'});fastTimeout(()=>moveByEvent(amount,room.title),260);return;}else if(type==='wallet'){patch(current=>({money:current.money+amount}));playSfx('coin',soundOn);show({...room,kind:undefined,result:`財布の中に ${amount}円！`,resultType:'gold'});}else if(type==='treasure'){if(Math.random()<.5){const money=ri(500,1000);patch(current=>({money:current.money+money}));playSfx('coin',soundOn);show({...room,kind:undefined,result:`宝箱から ${money}円！`,resultType:'gold'});}else{const gem=pick<ItemId>(['ruby','emerald','diamond']);addItem(makeItem(gem,1));playSfx('gem',soundOn);show({...room,kind:undefined,result:`宝箱から ${gem==='ruby'?'ルビー':gem==='emerald'?'エメラルド':'ダイヤモンド'} ×1！`,resultType:'gold'});}}setEventAnimating(false);},1100);}}>{buttonLabel}</Button><Text fontSize="9px" color="gray.400" textAlign="center">結果は演出後に確定します</Text></Stack>;
    }
    if(kind==='vending'){
      const sale=!!room.payload?.sale;const luckPrice=sale?100:200;const turnPrice=sale?200:400;
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
    if(kind==='mining')return <><SimpleGrid columns={5} spacing={1}>{rocks.map((r,i)=>{const reveal=r.open||picks<=0;return <Button key={i} h="62px" p={1} bg={r.open?'gray.800':picks<=0?'blackAlpha.500':'gray.700'} border="1px solid" borderColor={r.open?'cyan.600':picks<=0?'whiteAlpha.300':'gray.600'} isDisabled={r.open||picks<=0} opacity={!r.open && picks<=0 ? .65 : 1} onClick={()=>{playSfx('mine',soundOn);const n=[...rocks];n[i]={...n[i],open:true};setRocks(n);setPicks(p=>p-1);}}>{reveal?(r.gem?<VStack spacing={0}><Icon as={FaGem} color={r.gem==='ruby'?'red.300':r.gem==='emerald'?'green.300':'cyan.200'}/><Text fontSize="10px">x{r.count}</Text><Text fontSize="8px" color={r.open?'cyan.200':'gray.400'}>{r.open?'採掘':'未選択'}</Text></VStack>:<VStack spacing={0}><Text fontSize="10px" color="gray.400">空</Text><Text fontSize="8px" color={r.open?'cyan.200':'gray.500'}>{r.open?'採掘':'未選択'}</Text></VStack>):<Icon as={FaHammer}/>}</Button>})}</SimpleGrid>{picks<=0&&<><Text mt={2} fontSize="9px" color="gray.300" textAlign="center">未選択の岩も公開しました。薄く表示されているものが選ばなかった岩です。</Text><Button mt={2} w="100%" colorScheme="green" size="sm" onClick={()=>{const got=rocks.filter(r=>r.open&&r.gem);if(got.length===0){playSfx('fail',soundOn);show({...room,kind:undefined,result:'何も貰えなかった...',resultType:'neutral'});return;}playSfx('gem',soundOn);got.forEach(r=>addItem(makeItem(r.gem!,r.count)));const total=got.reduce((a,r)=>a+r.count,0);show({...room,kind:undefined,result:`宝石を${total}個拾った！`,resultType:'gold'});}}>宝石を拾って進む</Button></>}</>;
    if(kind==='shop')return <Stack spacing={1.5} maxH="145px" overflowY="auto">{shop.map((g,i)=><Flex key={i} p={2} bg="gray.800" rounded="lg" align="center" opacity={g.sold ? .5 : 1}><Icon as={g.item.icon||FaGift} mr={2}/><Box flex="1"><Text fontSize="11px" fontWeight="bold">{g.item.name}</Text><Text fontSize="9px" color="gray.400">{g.item.price}円</Text></Box><Button size="xs" colorScheme="yellow" isDisabled={g.sold} onClick={()=>{if(s.money<g.item.price){playSfx('fail',soundOn);return;}if(s.items.length>=3&&g.item.type!=='gem'){playSfx('click',soundOn);setPendingOverflow(g.item);setPendingOverflowPurchase({source:'shop',cost:g.item.price,shopIndex:i});return;}playSfx('buy',soundOn);patch(current=>({money:current.money-g.item.price}));addItem(g.item);setShop(x=>x.map((v,j)=>j===i?{...v,sold:true}:v));}}>{g.sold?'SOLD OUT':'購入'}</Button></Flex>)}</Stack>;
    if(kind==='blackjack')return <Stack spacing={2} bg="blackAlpha.500" p={2.5} rounded="xl" border="1px solid" borderColor="teal.700"><HStack justify="space-between"><Text fontSize="xs">賭け金</Text><HStack><Button size="xs" isDisabled={bj.playing} onClick={()=>setBj(x=>({...x,bet:Math.max(100,x.bet-100)}))}>-</Button><Text color="yellow.300">{bj.bet}円</Text><Button size="xs" isDisabled={bj.playing} onClick={()=>setBj(x=>({...x,bet:x.bet+100}))}>+</Button></HStack></HStack>{bjPhase&&<Box bg="teal.950" border="1px solid" borderColor="teal.700" rounded="md" px={2} py={1.5}><Text fontSize="10px" color="teal.100" textAlign="center" fontWeight="700">{bjPhase}</Text></Box>}{!bj.playing?<Button size="sm" colorScheme="teal" onClick={()=>{if(s.money<bj.bet){playSfx('fail',soundOn);return;}setS(x=>({...x,money:x.money-bj.bet}));setBj(x=>({...x,playing:true,p:[],d:[]}));setBjPhase('カードをシャッフルしています…');playSfx('card',soundOn);fastTimeout(()=>{const p1=card(),d1=card();setBj(x=>({...x,playing:true,p:[p1],d:[d1]}));setBjPhase(`最初のカード：あなた ${p1} / Dealer ${d1}`);playSfx('card',soundOn);fastTimeout(()=>{const p2=card(),d2=card();setBj(x=>({...x,p:[p1,p2],d:[d1,d2]}));setBjPhase('初期配布完了。HITかSTANDを選んでください');playSfx('card',soundOn);},650);},600);}}>勝負開始！(勝利時2倍)</Button>:<><Flex gap={2}><Box flex="1" bg="green.950" rounded="lg" p={2}><Text fontSize="9px" color="green.300">YOU</Text><Text fontSize="sm" fontWeight="900">{bj.p.join(' / ')||'…'}</Text><Text fontSize="xs" color="green.200">合計 {hand(bj.p)}</Text></Box><Box flex="1" bg="red.950" rounded="lg" p={2}><Text fontSize="9px" color="red.300">DEALER</Text><Text fontSize="sm" fontWeight="900">{bj.d.join(' / ')||'…'}</Text><Text fontSize="xs" color="red.200">合計 {hand(bj.d)}</Text></Box></Flex><HStack><Button size="sm" flex="1" onClick={()=>{setBjPhase('カードを1枚引きます…');fastTimeout(()=>{playSfx('card',soundOn);const drawn=card();const p=[...bj.p,drawn];const total=hand(p);setBj(x=>({...x,p}));setBjPhase(`${drawn}を引いた → 合計${total}`);if(total>21){fastTimeout(()=>{playSfx('fail',soundOn);setBj(x=>({...x,playing:false}));show({...room,kind:undefined,result:`${drawn}を引いて合計${total} → BUST（21超過）`,resultType:'danger'});},650);}},500);}}>HIT</Button><Button size="sm" flex="1" colorScheme="green" onClick={()=>{setBjPhase('Dealerのターン…');let d=[...bj.d];const reveal=()=>{if(hand(d)<17){fastTimeout(()=>{const c=card();d=[...d,c];setBj(x=>({...x,d}));setBjPhase(`Dealerが ${c} を引いた → 合計${hand(d)}`);playSfx('card',soundOn);reveal();},650);}else{fastTimeout(()=>{const pv=hand(bj.p),dv=hand(d);const win=dv>21||pv>dv;const draw=pv===dv;playSfx(win?'success':draw?'click':'fail',soundOn);if(win)setS(x=>({...x,money:x.money+bj.bet*2}));else if(draw)setS(x=>({...x,money:x.money+bj.bet}));setBj(x=>({...x,d,playing:false}));setBjPhase(dv>21?`Dealer BUST：合計${dv}`:`最終結果 YOU ${pv} / DEALER ${dv}`);show({...room,kind:undefined,result:win?'勝利！':draw?'引き分け':'敗北...',resultType:win?'gold':draw?'neutral':'danger'});},750);}};reveal();}}>STAND</Button></HStack></>}</Stack>;
    if(kind==='casino')return <Stack spacing={2}>
      <Flex align="center" justify="space-between" bg="whiteAlpha.100" border="1px solid" borderColor="purple.500" rounded="lg" px={3} py={2}>
        <Text fontSize="11px" color="gray.200" fontWeight="700">この訪問で回せる回数</Text>
        <Text fontSize="sm" color={casinoSpinsLeft>0?'yellow.300':'red.300'} fontWeight="900">残り {casinoSpinsLeft} / 10 回</Text>
      </Flex>
      <HStack justify="center"><Button size="xs" isDisabled={slotSpinning||casinoSpinsLeft<=0} onClick={()=>setSlotBet(Math.max(20,slotBet-20))}>-</Button><Text color="yellow.300" fontWeight="900">{slotBet}円</Text><Button size="xs" isDisabled={slotSpinning||casinoSpinsLeft<=0} onClick={()=>setSlotBet(slotBet+20)}>+</Button></HStack>
      <HStack justify="center" spacing={2}>{slot.map((v,i)=><Center key={i} bg={slotWin?'yellow.900':'black'} border="2px solid" borderColor={slotWin?'yellow.300':slotSpinning?'purple.400':'whiteAlpha.200'} boxShadow={slotWin?'0 0 18px rgba(250,204,21,.85)':'inset 0 0 12px rgba(0,0,0,.7)'} animation={slotWin?'slotJackpot .42s ease-in-out infinite alternate':slotMessage.includes('リーチ')?'reachPulse .3s ease-in-out infinite alternate':undefined} rounded="lg" w="62px" h="62px" fontSize="2xl">{v}</Center>)}</HStack>
      {slotMessage&&<Box px={3} py={2} rounded="lg" bg={slotWin?'yellow.900':slotMessage.includes('リーチ')?'red.900':'whiteAlpha.100'} border="1px solid" borderColor={slotWin?'yellow.300':slotMessage.includes('リーチ')?'orange.300':'whiteAlpha.200'} animation={slotWin?'winText .5s ease-in-out infinite alternate':undefined}><Text textAlign="center" fontSize={slotWin?'sm':'xs'} fontWeight="900" color={slotWin?'yellow.200':slotMessage.includes('リーチ')?'orange.100':'gray.100'}>{slotMessage}</Text></Box>}
      <Button colorScheme="purple" size="sm" isLoading={slotSpinning} loadingText="リール回転中…" onClick={()=>{
        if(casinoSpinsLeft<=0){playSfx('fail',soundOn);setSlotMessage('このカジノでは10回遊び終えました');show({...room,result:'この訪問での上限10回に到達',resultType:'neutral'});return;}
        if(s.money<slotBet||slotSpinning){playSfx('fail',soundOn);return;}
        setCasinoSpinsLeft(v=>Math.max(0,v-1));
        const sy=['🔴','🟢','💎','🎡'];
        // 指定された3つ揃い確率：ルビー8% / エメラルド5% / ダイヤ2% / ルーレット1%。
        // 残り84%はハズレ。ハズレの一部だけ2リール同柄にしてリーチ演出を出す。
        const roll=Math.random();
        let final:string[];
        if(roll<.08) final=['🔴','🔴','🔴'];
        else if(roll<.13) final=['🟢','🟢','🟢'];
        else if(roll<.15) final=['💎','💎','💎'];
        else if(roll<.16) final=['🎡','🎡','🎡'];
        else if(Math.random()<.38){
          const reachSymbol=pick(sy);
          final=[reachSymbol,reachSymbol,pick(sy.filter(v=>v!==reachSymbol))];
        }else{
          do{final=[pick(sy),pick(sy),pick(sy)];}while(final[0]===final[1]&&final[1]===final[2]);
        }
        playSfx('casino',soundOn); setS(x=>({...x,money:x.money-slotBet})); setSlotSpinning(true); setSlotWin(false); setSlotMessage('3つのリールが回転中…'); setSlot(['🎰','🎰','🎰']);
        const timers=final.map((_,i)=>fastInterval(()=>setSlot(cur=>cur.map((v,j)=>j===i?pick(sy):v)),95));
        const isReach=final[0]===final[1];
        const stops=[760,1480,isReach?2780:2280];
        stops.forEach((ms,i)=>fastTimeout(()=>{window.clearInterval(timers[i]);setSlot(cur=>cur.map((v,j)=>j===i?final[i]:v));playSfx('slotStop',soundOn);if(i===0)setSlotMessage('1リール停止… 次は中央！');else if(i===1&&isReach){playSfx('jackpot',soundOn);setSlotMessage(`🔥 リーチ！ ${final[0]} ${final[1]} … 最終リールに注目！ 🔥`);}else if(i===1)setSlotMessage('2リール停止… 最終リールへ！');else setSlotMessage('3リール停止！ 判定中…');},ms));
        fastTimeout(()=>{
          let mult=0; let label='';
          if(final.every(v=>v==='🔴')){mult=5;label='ルビー';}
          if(final.every(v=>v==='🟢')){mult=10;label='エメラルド';}
          if(final.every(v=>v==='💎')){mult=30;label='ダイヤモンド';}
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
        },isReach?3040:2540);
      }} isDisabled={casinoSpinsLeft<=0}>スロットを回す</Button>
      <Box bg="blackAlpha.500" border="1px solid" borderColor="purple.500" rounded="xl" p={2.5}>
        <Text fontSize="11px" fontWeight="900" color="purple.200" mb={1.5} textAlign="center">🎰 配当表</Text>
        <Stack spacing={1}>
          {[['🔴 🔴 🔴','ルビー揃い 8%','5倍','red.300'],['🟢 🟢 🟢','エメラルド揃い 5%','10倍','green.300'],['💎 💎 💎','ダイヤモンド揃い 2%','30倍','cyan.200'],['🎡 🎡 🎡','ルーレット揃い 1%','10〜50倍','yellow.200']].map(([icons,name,payout,color])=><Flex key={name as string} px={2} py={1} bg="whiteAlpha.100" rounded="md" align="center"><Text fontSize="11px" minW="82px">{icons}</Text><Text fontSize="9px" color="gray.200" flex="1">{name}</Text><Text fontSize="10px" fontWeight="900" color={color}>{payout}</Text></Flex>)}
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
      <Button w="100%" colorScheme="yellow" color="black" h="48px" isDisabled={ultimateSpinning||eventAnimating} isLoading={ultimateSpinning||eventAnimating} loadingText={ultimateSpinning?'神々の運命が回転中…':'結果を刻んでいる…'} onClick={()=>{if(ultimateSpinning||eventAnimating)return;setUltimateSpinning(true);setUltimateMessage('運命の輪が加速している…');playSfx('roulette',soundOn);const labels=['✨ 階数 1.5倍！','💰 お金 +5,000円！','⚡ 回数+5 ＆ 運気+10！','💀 地獄の門'];let idx=0;const timer=fastInterval(()=>{setUltimateMessage(labels[idx%labels.length]);playSfx(idx%3===0?'jackpot':'slotStop',soundOn);idx++;},95);fastTimeout(()=>{setUltimateMessage('⚡ 最終判定 ⚡');playSfx('jackpot',soundOn);},1750);fastTimeout(()=>{window.clearInterval(timer);const r=ri(0,3);const chosen=labels[r];setUltimateMessage(chosen);setUltimateSpinning(false);setEventAnimating(true);playSfx('jackpot',soundOn);window.setTimeout(()=>{if(r===0){const target=Math.max(1,Math.floor(s.floor*1.5));const delta=target-s.floor;setEventAnimating(false);show({...room,result:`究極ルーレット結果：${chosen} / ${target}階へ移動開始！`,resultType:'gold'});fastTimeout(()=>moveByEvent(delta,'究極ルーレット'),350);return;}if(r===1)patch(current=>({money:current.money+5000}));if(r===2)patch(current=>({turnsLeft:current.turnsLeft+5,luck:current.luck+10}));if(r===3){playSfx('hell',soundOn);patch({inHell:true});setRoomIntro(true);setHellDie(null);setHellRolling(false);setHellMessage('「5」が出れば生還。1回振るごとに残り回数を1消費する。');setEventAnimating(false);show({tier:5,title:'地獄の門',desc:'ここは脱出判定専用フロア。サイコロで「5」を出した瞬間だけ地上へ戻れる。失敗しても挑戦は続くが、振るたびに残り回数を1消費する。',result:'脱出条件：5を出せ / 成功率 1/6',resultType:'danger',kind:'hell'});return;}setEventAnimating(false);show({...room,kind:undefined,result:`究極ルーレット結果：${chosen}`,resultType:'gold'});},2000);},2850);}}>運命のルーレットを回す！</Button>
    </Stack>;
    if(kind==='god')return <Stack spacing={1}>{[makeItem('mirror',8),makeItem('ring',15),makeItem('money_tree',3),makeItem('blessing_charm',3)].map((it,i)=><Action key={i} title={it.name} onClick={()=>{playSfx('item',soundOn);addItem(it);show({...room,kind:undefined,result:`${it.name} 獲得！`,resultType:'gold'})}}/>)}</Stack>;
    if(kind==='hell')return <Stack spacing={2}>
      <Box p={3} bg="red.950" border="1px solid" borderColor="red.700" rounded="xl"><Text fontSize="11px" color="red.100" fontWeight="800">💀 脱出ルール</Text><Text mt={1} fontSize="10px" color="red.200">サイコロで「5」が出れば即生還。5以外は失敗。振るたびに残り回数 -1。</Text><HStack mt={2} justify="center"><Badge colorScheme="red">成功率 1 / 6</Badge><Badge colorScheme="orange">残り {s.turnsLeft} 回</Badge></HStack></Box>
      <Center position="relative" h="118px" bg="radial-gradient(circle,rgba(127,29,29,.62),rgba(0,0,0,.78) 72%)" border="2px solid" borderColor={hellRolling?'red.200':'red.800'} rounded="2xl" boxShadow={hellRolling?'0 0 38px rgba(248,113,113,.85), inset 0 0 32px rgba(127,29,29,.65)':'inset 0 0 20px rgba(0,0,0,.6)'} overflow="hidden" animation={hellRolling?'hellShake .14s linear infinite':'none'}>
        {hellRolling&&<><Box position="absolute" w="76px" h="76px" rounded="full" border="2px solid" borderColor="red.300" animation="hellRing .55s ease-out infinite"/><Box position="absolute" w="76px" h="76px" rounded="full" border="1px solid" borderColor="orange.200" animation="hellRing .75s ease-out .15s infinite"/><Text position="absolute" top="6px" fontSize="8px" letterSpacing=".20em" color="red.100" fontWeight="900">HELL DICE // ONLY 5 ESCAPES</Text></>}
        <Text zIndex={2} fontSize="6xl" fontWeight="black" color={hellDie===5?'yellow.200':'red.100'} textShadow={hellRolling?'0 0 18px rgba(248,113,113,.9)':'0 0 8px rgba(0,0,0,.8)'} animation={hellRolling?'hellPulse .12s ease-in-out infinite alternate':undefined}>{hellDie??'🎲'}</Text>
      </Center>
      <Text minH="34px" fontSize="xs" color="red.100" textAlign="center" fontWeight="700">{hellMessage}</Text>
      <Button w="100%" h="46px" colorScheme="red" isDisabled={hellRolling||eventAnimating||s.turnsLeft<=0} isLoading={hellRolling} loadingText="地獄のサイコロが暴れている…" onClick={()=>{if(hellRolling||s.turnsLeft<=0)return;setHellRolling(true);setHellMessage('🔥 門が震えている…「5」だけが生還を許される！');playSfx('hell',soundOn);let n=0;const timer=fastInterval(()=>{const d=ri(1,6);setHellDie(d);playSfx(n%3===0?'roulette':'slotStop',soundOn);n++;if(n===9)setHellMessage('⚠️ 最終判定が近い…！');},70);fastTimeout(()=>{window.clearInterval(timer);setHellMessage('……出目、確定。');playSfx('hell',soundOn);},1250);fastTimeout(()=>{const roll=ri(1,6);setHellDie(roll);setHellRolling(false);setS(x=>({...x,turnsLeft:Math.max(0,x.turnsLeft-1)}));if(roll===5){setEventAnimating(true);setHellMessage('🔥 5……！ 門が大きく震え始めた……');playSfx('hell',soundOn);window.setTimeout(()=>{playSfx('jackpot',soundOn);setHellMessage('🔥 門が砕けるように開いた！ 生還成功！');setS(x=>({...x,inHell:false}));setEventAnimating(false);show({tier:1,title:'地獄から生還',desc:'5を引き当て、閉ざされていた門が開いた。元の世界へ帰還した。',result:'5が出た！ 生還成功！',resultType:'success'});},1300);}else{playSfx('fail',soundOn);setHellMessage(`${roll}…！ 門は開かない。5を出すまで脱出できない。`);show({...room,result:`出目 ${roll}：脱出失敗（5のみ成功）`,resultType:'danger'});}},1600);}}>サイコロを振る（回数 -1）</Button>
      {s.turnsLeft<=0&&<Text fontSize="10px" color="orange.200" textAlign="center">残り回数が0です。下の「ゲームを終了する」からリザルトへ進めます。</Text>}
    </Stack>;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[room,s,rocks,picks,shop,bj,slotBet,slot,slotSpinning,slotWin,slotMessage,casinoSpinsLeft,soundOn,doorChoices,gameSpeed,forgeUsed,fortuneReading,boxRewards,boxSelected,boxRevealAll,itemBoxOpening,ultimateSpinning,ultimateMessage,bjPhase,eventAnimating,atmDeposit,atmInput,legendShopUsed,warpAnimating,warpMessage]);

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
    if(k==='hell'||s.inHell)return {bg:'radial-gradient(circle at 50% 25%, rgba(127,29,29,.75), transparent 38%), linear-gradient(180deg,#300505 0%,#090000 70%,#000 100%)',accent:'rgba(248,113,113,.22)',label:'HELL GATE'};
    if(k==='god')return {bg:'radial-gradient(circle at 50% 15%, rgba(255,255,255,.72), rgba(250,204,21,.30) 25%, transparent 55%), linear-gradient(180deg,#6b4d13 0%,#2b2208 38%,#090b10 100%)',accent:'rgba(253,224,71,.28)',label:'DIVINE SANCTUARY'};
    if(k==='ultimate')return {bg:'conic-gradient(from 0deg at 50% 50%,rgba(250,204,21,.22),rgba(168,85,247,.18),rgba(239,68,68,.18),rgba(250,204,21,.22)), radial-gradient(circle,#422006,#090b10 68%)',accent:'rgba(250,204,21,.22)',label:'ULTIMATE CHAMBER'};
    if(k==='casino')return {bg:'radial-gradient(circle at 20% 15%,rgba(236,72,153,.25),transparent 32%),radial-gradient(circle at 80% 25%,rgba(139,92,246,.30),transparent 34%),linear-gradient(160deg,#180a2c,#080510 70%)',accent:'rgba(192,132,252,.20)',label:'NEON CASINO'};
    if(k==='blackjack')return {bg:'radial-gradient(circle at center,rgba(13,148,136,.20),transparent 45%),linear-gradient(180deg,#062b25,#06100f 70%,#020505)',accent:'rgba(45,212,191,.16)',label:'UNDERGROUND CARD SALON'};
    if(k==='mining')return {bg:room.tier===4?'radial-gradient(circle at 50% 35%,rgba(34,211,238,.22),transparent 35%),linear-gradient(145deg,#10242c,#090d11 70%)':room.tier===3?'radial-gradient(circle at 50% 35%,rgba(52,211,153,.18),transparent 35%),linear-gradient(145deg,#10251e,#080d0a 70%)':'radial-gradient(circle at 50% 35%,rgba(248,113,113,.18),transparent 35%),linear-gradient(145deg,#271414,#0d0909 70%)',accent:'rgba(148,163,184,.12)',label:'MINING CAVERN'};
    if(k==='fortune')return {bg:'radial-gradient(circle at 50% 30%,rgba(192,132,252,.26),transparent 35%),radial-gradient(circle at 15% 15%,rgba(255,255,255,.10),transparent 2%),linear-gradient(180deg,#24103c,#080710 75%)',accent:'rgba(192,132,252,.18)',label:'FORTUNE ROOM'};
    if(k==='altar')return {bg:'radial-gradient(circle at 50% 30%,rgba(253,224,71,.20),transparent 38%),linear-gradient(180deg,#2d2510,#0b0a06 72%)',accent:'rgba(253,224,71,.14)',label:'ALTAR'};
    if(k==='warp')return {bg:'radial-gradient(circle at center,rgba(34,211,238,.30),rgba(168,85,247,.15) 32%,transparent 55%),linear-gradient(180deg,#071b2a,#0a0714 75%)',accent:'rgba(34,211,238,.18)',label:'WARP FIELD'};
    if(k==='atm')return {bg:'radial-gradient(circle at 50% 45%,rgba(34,211,238,.28),transparent 42%),linear-gradient(180deg,#0b2531,#071014 75%)',accent:'rgba(34,211,238,.20)',label:'ATM VAULT'};
    if(k==='survey')return {bg:'radial-gradient(circle at 50% 42%,rgba(244,114,182,.25),transparent 42%),linear-gradient(180deg,#32172a,#0d0810 75%)',accent:'rgba(244,114,182,.18)',label:'SURVEY ROOM'};
    if(k==='legendshop')return {bg:'radial-gradient(circle at 50% 20%,rgba(250,204,21,.36),transparent 42%),linear-gradient(180deg,#4b320b,#120b04 75%)',accent:'rgba(250,204,21,.22)',label:'DIVINE RELIC SHOP'};
    if(k==='shop')return {bg:'radial-gradient(circle at 50% 10%,rgba(250,204,21,.16),transparent 32%),linear-gradient(180deg,#252010,#0d0c08 75%)',accent:'rgba(250,204,21,.10)',label:'SHOP FLOOR'};
    if(k==='forge')return {bg:'radial-gradient(circle at 50% 60%,rgba(251,146,60,.28),transparent 38%),linear-gradient(180deg,#26130a,#0d0805 75%)',accent:'rgba(251,146,60,.16)',label:'ARCANE FORGE'};
    if(t.includes('湯'))return {bg:'radial-gradient(circle at 50% 70%,rgba(103,232,249,.22),transparent 42%),linear-gradient(180deg,#10252d,#081014 75%)',accent:'rgba(103,232,249,.12)',label:'HEALING SPA'};
    if(t.includes('ラッキー'))return {bg:'radial-gradient(circle at center,rgba(74,222,128,.22),transparent 42%),linear-gradient(180deg,#0d2819,#080d0a 75%)',accent:'rgba(74,222,128,.12)',label:'LUCKY FLOOR'};
    if(room.tier===4)return {bg:'radial-gradient(circle at center,rgba(248,113,113,.18),transparent 45%),linear-gradient(180deg,#2a1010,#0d0909 75%)',accent:'rgba(248,113,113,.12)',label:''};
    if(room.tier===5)return {bg:'radial-gradient(circle at center,rgba(250,204,21,.24),transparent 44%),linear-gradient(180deg,#33260b,#0d0b06 75%)',accent:'rgba(250,204,21,.14)',label:''};
    return {bg:tierMeta[Math.min(4,Math.max(0,room.tier-1))].bg,accent:'rgba(255,255,255,.05)',label:''};
  },[room,s.inHell]);

  const resultColor=room.resultType==='success'?'green':room.resultType==='danger'?'red':room.resultType==='gold'?'yellow':'gray';
  const tier=tierMeta[Math.min(4,Math.max(0,room.tier-1))];
  const finalMode=s.turnsLeft<=0 && !moving && !gameover;
  const disabled=finalMode ? (moving||gameover||slotSpinning||bj.playing) : (moving||gameover||slotSpinning||bj.playing||s.inHell);

  const scoreHasSaveTarget=Boolean(scorePreview&&(scorePreview.monthly.eligible||scorePreview.alltime.eligible));
  const scoreRegistrationDisabled=!newPersonalBest||scoreSubmitted||scoreSubmitting||scorePreviewLoading||Boolean(firebaseReady&&scorePreview&&!scoreHasSaveTarget);
  const handleButtonSound=(e:React.MouseEvent)=>{const el=e.target as HTMLElement;if(el.closest('button'))playSfx('click',soundOn);};

  return <><style>{`@keyframes cathedralFlicker{0%,100%{opacity:.3}50%{opacity:.62}}@keyframes steelSweep{0%{transform:translateX(-160%)}100%{transform:translateX(160%)}}@keyframes elevatorAura{from{transform:scale(.9);opacity:.45}to{transform:scale(1.08);opacity:1}}@keyframes hypeBlink{0%,45%{opacity:1}46%,100%{opacity:.35}}@keyframes hellPulse{from{transform:scale(.9) rotate(-7deg)}to{transform:scale(1.10) rotate(7deg)}}@keyframes hellShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@keyframes hellRing{0%{transform:scale(.55) rotate(0deg);opacity:.9}100%{transform:scale(1.55) rotate(220deg);opacity:0}}@keyframes revealPulse{from{transform:scale(.96);filter:brightness(.95)}to{transform:scale(1.06);filter:brightness(1.35)}}@keyframes ultimateWheel{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes floorTravel{0%{transform:translateY(26px) scale(.92);opacity:0}35%{opacity:1}70%{transform:translateY(-10px) scale(1.04);opacity:1}100%{transform:translateY(-34px) scale(1.08);opacity:0}}@keyframes floorLines{from{background-position:0 0}to{background-position:0 120px}}@keyframes warpSpin{0%{transform:rotate(0deg) scale(.85);filter:brightness(1)}50%{transform:rotate(180deg) scale(1.08);filter:brightness(1.8)}100%{transform:rotate(360deg) scale(.85);filter:brightness(1)}}@keyframes ultimateFlash{0%,100%{opacity:.45;filter:brightness(1)}50%{opacity:1;filter:brightness(1.8)}}@keyframes slotJackpot{from{transform:scale(.96);filter:brightness(.9)}to{transform:scale(1.04);filter:brightness(1.35)}}@keyframes reachPulse{from{transform:scale(.98);filter:brightness(1)}to{transform:scale(1.035);filter:brightness(1.45)}}@keyframes rareArrival{0%{opacity:0;transform:scale(.72)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.24)}}@keyframes rareRing{0%{opacity:0;transform:scale(.35)}35%{opacity:.95}100%{opacity:0;transform:scale(1.65)}}@keyframes rareSpark{0%{opacity:0;transform:translateY(18px) scale(.6)}35%{opacity:1}100%{opacity:0;transform:translateY(-44px) scale(1.15)}}`}</style><Center h="100dvh" w="100vw" minH={0} p={0} overflow="hidden" bg="#020304">
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
              <Button w="100%" maxW="280px" h="56px" bg="linear-gradient(180deg,#17191c,#090a0c)" color="#f1eee6" border="1px solid rgba(232,229,220,.46)" borderRadius="2px" fontFamily="heading" letterSpacing=".16em" fontSize="md" leftIcon={<FaPlay/>} boxShadow="inset 0 1px rgba(255,255,255,.06),0 10px 28px rgba(0,0,0,.55)" _hover={{bg:'linear-gradient(180deg,#3a171b,#12090b)',borderColor:'#b8565c',color:'white'}} _active={{transform:'translateY(1px)',bg:'#18090c'}} onClick={start}>ゲームを始める</Button>
            </Center>
            <SimpleGrid mt={2.5} columns={2} spacing={{base:1.5,lg:2}}>{[[FaRankingStar,'ランキング',openRanking],[FaCircleQuestion,'ルール説明',rules.onOpen],[FaBookOpen,'ステージ図鑑',guide.onOpen],[FaGem,'アイテム図鑑',itemGuide.onOpen]].map(([ic,label,fn]:any)=><Button key={label} size="sm" minH="42px" bg="rgba(7,8,10,.78)" color="rgba(237,234,225,.84)" border="1px solid rgba(180,184,186,.24)" borderRadius="2px" leftIcon={<Icon as={ic}/>} fontFamily="heading" fontSize="11px" letterSpacing=".08em" _hover={{bg:'rgba(54,18,22,.88)',borderColor:'rgba(174,66,74,.75)',color:'white'}} onClick={fn}>{label}</Button>)}</SimpleGrid>
          </Box>
        </Flex>
      </Flex>}

      <Flex h="100%" direction="column" position="relative" overflow="hidden" bg={roomAtmosphere.bg} bgImage={activeStageImageUrl?`linear-gradient(180deg,rgba(2,4,6,.16),rgba(2,4,6,.36)), url("${activeStageImageUrl}")`:undefined} bgSize="cover" bgPosition="center center" bgRepeat="no-repeat" bgAttachment="scroll">
        <Box position="absolute" inset={0} pointerEvents="none" bg="linear-gradient(180deg,rgba(0,0,0,.20) 0%,rgba(0,0,0,.12) 20%,rgba(0,0,0,.10) 44%,rgba(0,0,0,.12) 64%,rgba(0,0,0,.22) 100%)"/>
        <Box position="absolute" inset={0} pointerEvents="none" bg="linear-gradient(90deg,rgba(0,0,0,.46),transparent 18%,transparent 82%,rgba(0,0,0,.46))"/>
        <Box position="absolute" top="-8%" left="50%" transform="translateX(-50%)" w="46%" h="74%" pointerEvents="none" bg="linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.03) 38%,transparent 90%)" filter="blur(12px)" opacity={.52} animation="cathedralFlicker 5s ease-in-out infinite"/>
        <Box position="absolute" inset={0} pointerEvents="none" opacity={.24} bgImage={`repeating-linear-gradient(90deg, transparent 0 35px, rgba(170,174,176,.05) 36px 37px),repeating-linear-gradient(0deg, transparent 0 70px, ${roomAtmosphere.accent} 71px 72px)`}/>
        <Box position="absolute" top={{base:2,md:3}} left={{base:2,md:3}} zIndex={25} w={{base:'calc(100% - 16px)',md:'min(760px, calc(100% - 24px))'}} maxW="760px" px={{base:2,md:3}} py={{base:1.5,md:2}} bg="rgba(4,6,8,.78)" backdropFilter="blur(9px)" border="1px solid rgba(218,216,208,.24)" borderRadius="10px" boxShadow="0 12px 30px rgba(0,0,0,.38)">
          <VStack spacing={1.5} align="stretch">
            <Grid
              templateColumns={{base:'minmax(0,1fr) auto',md:'118px minmax(0,1fr) auto'}}
              templateAreas={{base:'"floor controls" "stats stats"',md:'"floor stats controls"'}}
              columnGap={{base:2,md:2.5}}
              rowGap={{base:1.5,md:0}}
              alignItems="center"
              w="100%"
              minW={0}
            >
              <HStack gridArea="floor" minW={0} spacing={1.5} pr={{base:0,md:2}} borderRight={{base:'none',md:'1px solid rgba(255,255,255,.14)'}}>
                <Box minW={0}><Text fontSize={{base:'8px',md:'9px'}} color="gray.400" fontWeight="700">CURRENT FLOOR</Text><HStack spacing={1}><Text fontFamily="mono" fontSize={{base:'xl',md:'3xl'}} color="#f2eee5" fontWeight="900" noOfLines={1}>{s.floor}</Text><Text fontSize="9px" color="gray.300">F</Text></HStack></Box>
              </HStack>
              <Grid gridArea="stats" templateColumns="minmax(0,.82fr) minmax(0,.82fr) minmax(0,1.36fr)" gap={{base:1,md:1.5}} minW={0} w="100%">
                {[[FaBolt,'残り',s.turnsLeft,'yellow.300','turns'],[FaStar,'運気',s.luck,'green.300','luck'],[FaCoins,'所持金',s.money,'yellow.200','money']].map(([ic,l,v,c,key]:any)=>{const moneyText=key==='money'?`${Number(v).toLocaleString('ja-JP')}円`:'';const moneyLen=moneyText.length;return <Button key={l} minW={0} w="100%" h={{base:'44px',md:'52px'}} px={{base:key==='money'?1.5:1,md:key==='money'?2.5:2}} py={{base:1,md:1.5}} justifyContent="flex-start" overflow="hidden" bg="rgba(0,0,0,.48)" border="1px solid rgba(255,255,255,.12)" borderRadius="8px" _hover={{bg:'rgba(255,255,255,.12)',borderColor:'rgba(255,255,255,.22)'}} _active={{transform:'translateY(1px)'}} onClick={()=>setStatusDetail(key)}><HStack spacing={{base:.75,md:1.25}} minW={0} w="100%"><Icon as={ic} color={c} boxSize={{base:3.5,md:4}} flexShrink={0}/><Box minW={0} textAlign="left" flex="1" overflow="hidden"><Text fontSize={{base:'7px',md:'9px'}} color="gray.300" fontWeight="700" noOfLines={1}>{l}</Text><Text fontSize={key==='money'?{base:moneyLen>=13?'8px':moneyLen>=11?'9px':'11px',md:moneyLen>=15?'10px':moneyLen>=12?'12px':'14px'}:{base:'11px',md:'15px'}} lineHeight="1.15" fontFamily="mono" fontWeight="900" color={c} whiteSpace="nowrap" letterSpacing={key==='money'&&moneyLen>=11?'-0.04em':undefined} overflow="hidden" textOverflow="clip">{key==='money'?moneyText:v}</Text></Box></HStack></Button>})}
              </Grid>
              <HStack gridArea="controls" spacing={1} flexShrink={0} justify="flex-end"><Button size="xs" minW="38px" h="28px" px={1.5} bg={gameSpeed===2?'#521920':'rgba(255,255,255,.07)'} color="white" border="1px solid rgba(200,200,200,.18)" onClick={()=>setGameSpeed(v=>v===1?2:1)}>×{gameSpeed}</Button><IconButton aria-label="bgm" size="xs" h="28px" minW="28px" variant="ghost" color={soundOn?'#ddd7cb':'gray.500'} icon={soundOn?<FaVolumeHigh/>:<FaVolumeXmark/>} onClick={()=>setSoundOn(v=>!v)}/></HStack>
            </Grid>
            <HStack spacing={1.5} align="center" justify="flex-start" w="100%">
              <Button h="28px" size="xs" variant="outline" borderColor="whiteAlpha.300" bg="rgba(0,0,0,.36)" onClick={inventoryPanel.onOpen}>アイテム {s.items.length}/3</Button>
              <Button h="28px" size="xs" variant="outline" borderColor="whiteAlpha.300" bg="rgba(0,0,0,.36)" onClick={logPanel.onOpen}>ログ</Button>
              {(s.ringBuff.active||s.mirrorMultiplier>1||s.partySet)&&<HStack spacing={1} flexWrap="wrap">{s.ringBuff.active&&<Badge fontSize="7px" colorScheme="green">指輪+{s.ringBuff.amount} / 残り{s.ringBuff.turns}</Badge>}{s.mirrorMultiplier>1&&<Badge fontSize="7px" colorScheme="cyan">鏡×{s.mirrorMultiplier}</Badge>}{s.partySet&&<Badge fontSize="7px" colorScheme="pink">演出UP</Badge>}</HStack>}
            </HStack>
            <Box w="100%" overflowX="auto" overflowY="hidden" sx={{WebkitOverflowScrolling:'touch'}}>
              <HStack spacing={1.5} justify="flex-start" minW="max-content" pb={.5}>
                {s.items.length===0?<Text fontSize="8px" color="gray.500" px={1}>所持アイテムなし</Text>:s.items.map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} h="32px" minW="auto" px={2} flexShrink={0} justifyContent="flex-start" bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} borderRadius="6px" _hover={{filter:'brightness(1.12)'}} onClick={()=>setSelected(i)}><HStack spacing={1.5}><Icon as={it.icon||FaGift} boxSize={3} color={pal.icon}/><Text fontSize="8px" fontWeight="900" whiteSpace="nowrap">{it.name}{it.type==='gem'?` ×${it.count||1}`:''}</Text></HStack></Button>})}
              </HStack>
            </Box>
          </VStack>
        </Box>

        <Flex flex="1" minH={0} position="relative" px={{base:2,md:4,lg:6}} pt={{base:'184px',md:'154px',lg:'158px'}} pb={roomIntro?{base:'8px',md:'12px',lg:'14px'}:{base:'82px',md:'92px',lg:'98px'}} align="center" justify="center" overflow="hidden" boxSizing="border-box">
          {roomAtmosphere.label&&<Text position="absolute" top="10px" right="12px" fontSize="8px" letterSpacing=".22em" fontWeight="900" color="whiteAlpha.300">{roomAtmosphere.label}</Text>}{rareArrival>0&&<Box position="absolute" inset={0} zIndex={16} pointerEvents="none" overflow="hidden">
            <Box position="absolute" inset="-18%" bg={rareArrival===5?'radial-gradient(circle,rgba(253,224,71,.48) 0%,rgba(250,204,21,.18) 28%,transparent 62%)':'radial-gradient(circle,rgba(244,63,94,.34) 0%,rgba(168,85,247,.14) 35%,transparent 65%)'} animation="rareArrival .9s ease-out both"/>
            <Center position="absolute" inset={0}>
              <Box w="118px" h="118px" rounded="full" border="3px solid" borderColor={rareArrival===5?'yellow.200':'red.300'} boxShadow={rareArrival===5?'0 0 34px rgba(253,224,71,.85), inset 0 0 28px rgba(253,224,71,.38)':'0 0 30px rgba(248,113,113,.78), inset 0 0 24px rgba(168,85,247,.32)'} animation="rareRing 1.05s ease-out both"/>
            </Center>
            {Array.from({length:rareArrival===5?12:8}).map((_,i)=><Box key={i} position="absolute" left={`${8+((i*83)%84)}%`} top={`${58+((i*17)%28)}%`} w={rareArrival===5?'5px':'4px'} h={rareArrival===5?'5px':'4px'} rounded="full" bg={rareArrival===5?'yellow.200':'red.200'} boxShadow="0 0 10px currentColor" animation={`rareSpark ${.65+(i%4)*.12}s ease-out ${i*.045}s both`}/>) }
          </Box>}{!roomIntro&&<VStack zIndex={10} w="100%" maxW={{base:'326px',md:'520px',lg:'650px'}} spacing={{base:2.5,lg:3.5}} maxH="100%" overflowY="auto" px={{base:0,lg:4}} py={{base:3,lg:4}} bg="rgba(4,6,8,.44)" backdropFilter="blur(5px)" border="1px solid rgba(218,216,208,.16)" borderRadius="10px" boxShadow="0 14px 34px rgba(0,0,0,.36)"><Badge bg="rgba(0,0,0,.52)" color={room.tier>=4?'#d4b7b7':'#c9c7c0'} border="1px solid rgba(200,202,200,.22)" borderRadius="1px" px={2.5} py={.5} fontFamily="heading" letterSpacing=".12em">{s.inHell?'Tier 6 HELL':tier.name}</Badge><Center w={{base:'66px',lg:'82px'}} h={{base:'66px',lg:'82px'}} rounded="full" bg="radial-gradient(circle,rgba(255,255,255,.055),rgba(0,0,0,.55))" border="1px solid" borderColor={roomIdentity.color} boxShadow={`0 0 28px ${roomIdentity.glow}, inset 0 0 18px rgba(255,255,255,.025)`}><Icon as={roomIdentity.icon} boxSize={{base:6,lg:8}} color={roomIdentity.color}/></Center><Text fontFamily="heading" fontSize={{base:'lg',lg:'2xl'}} letterSpacing=".08em" fontWeight="700" color="#f0ede5" textShadow="0 2px 12px #000">{room.title}</Text><Box w="54px" h="1px" bg="linear-gradient(90deg,transparent,#8d3238,transparent)"/><Text fontSize={{base:'xs',lg:'sm'}} color="rgba(230,228,220,.72)" textAlign="center" lineHeight="1.75" px={{base:2,lg:5}}>{room.desc}</Text>{room.result&&<Badge px={3} py={1} maxW="100%" whiteSpace="normal" textAlign="center" lineHeight="1.4" colorScheme={resultColor}>{room.result}</Badge>}{interactive&&<Box w="100%" mt={2}>{interactive}</Box>}</VStack>}
          {roomIntro&&<Box position="absolute" zIndex={24} left="50%" transform="translateX(-50%)" w={{base:'calc(100% - 16px)',md:'calc(100% - 48px)',lg:'min(920px, calc(100% - 120px))'}} bottom={{base:2,md:3,lg:3}} maxH={{base:'54%',md:'48%',lg:'44%'}} overflowY="auto" p={{base:3,md:4}} bg="linear-gradient(180deg,rgba(3,5,8,.88),rgba(5,8,12,.92))" backdropFilter="blur(8px)" border="1px solid rgba(235,232,220,.34)" borderRadius="10px" boxShadow="0 18px 45px rgba(0,0,0,.58)">
            <HStack mb={2} spacing={2}><Badge bg="rgba(123,36,44,.86)" color="white" px={2} py={.5}>{novelSpeaker}</Badge><Text fontSize="9px" color="gray.400">{room.title}</Text></HStack>
            <Text color="#f3efe7" fontSize={{base:'sm',md:'md'}} lineHeight="1.9" textShadow="0 2px 8px #000">{room.desc}</Text>
            {room.result&&<Text mt={1.5} color="whiteAlpha.700" fontSize={{base:'10px',md:'xs'}}>{room.result}</Text>}
            <Flex mt={3} justify="flex-end"><Button size="sm" bg="rgba(110,31,39,.92)" color="white" border="1px solid rgba(218,112,120,.52)" _hover={{bg:'#7f2831'}} onClick={()=>{playSfx('click',soundOn);setRoomIntro(false);}}>{room.kind?'選択肢へ':'次へ'} ▶</Button></Flex>
          </Box>}
          <Box position="absolute" top={0} left={0} w="50%" h="100%" bg="linear-gradient(90deg,#07090b,#181b1f 75%,#090b0d)" borderRight="1px solid" borderColor="rgba(205,207,205,.25)" zIndex={20} transform={doors?'translateX(-100%)':'translateX(0)'} transition={`transform ${0.6/gameSpeed}s cubic-bezier(.77,0,.175,1)`}/><Box position="absolute" top={0} right={0} w="50%" h="100%" bg="linear-gradient(90deg,#090b0d,#181b1f 25%,#07090b)" borderLeft="1px solid" borderColor="rgba(205,207,205,.25)" zIndex={20} transform={doors?'translateX(100%)':'translateX(0)'} transition={`transform ${0.6/gameSpeed}s cubic-bezier(.77,0,.175,1)`}/>
          {floorTransition.show&&<Center position="absolute" inset={0} zIndex={34} bg="rgba(2,5,10,.94)" flexDir="column" overflow="hidden"><Box position="absolute" inset={0} bgImage="repeating-linear-gradient(180deg,transparent 0 18px,rgba(125,211,252,.14) 19px 21px)" animation="floorLines .28s linear infinite"/><Text zIndex={1} fontSize="9px" letterSpacing=".22em" color="cyan.200" fontWeight="900">FLOOR TRANSITION</Text><Text zIndex={1} mt={2} fontFamily="heading" fontSize="sm" color="white" fontWeight="900">{floorTransition.label}</Text><HStack zIndex={1} mt={3} spacing={3} animation="floorTravel .75s ease-in-out infinite"><Text fontFamily="mono" fontSize="3xl" color="gray.400" fontWeight="900">{floorTransition.from}F</Text><Icon as={FaArrowUp} color="cyan.300"/><Text fontFamily="mono" fontSize="4xl" color="cyan.100" fontWeight="black" textShadow="0 0 18px rgba(103,232,249,.65)">{floorTransition.to}F</Text></HStack><Text zIndex={1} mt={2} fontSize="10px" color="cyan.100">{floorTransition.phase}</Text><Text zIndex={1} mt={4} fontSize="9px" color="gray.400">到着先で新しいイベントが発生します</Text></Center>}
                    {overlay.show&&<Center position="absolute" inset={0} bg={overlay.tier===4?'linear-gradient(180deg,rgba(69,26,3,.96),rgba(0,0,0,.97))':'rgba(0,0,0,.94)'} zIndex={30} flexDir="column" overflow="hidden"><Box position="absolute" inset="-20%" bg={overlay.tier===4?'radial-gradient(circle,rgba(250,204,21,.25),transparent 50%)':overlay.tier===3?'radial-gradient(circle,rgba(168,85,247,.22),transparent 50%)':overlay.tier===2?'radial-gradient(circle,rgba(16,185,129,.16),transparent 50%)':'radial-gradient(circle,rgba(34,211,238,.12),transparent 50%)'} animation="elevatorAura .55s ease-in-out infinite alternate"/><Text zIndex={1} fontSize="10px" letterSpacing=".24em" color="whiteAlpha.700" fontWeight="900">ELEVATOR SYSTEM</Text><Badge zIndex={1} mt={2} px={3} py={1} fontSize="xs" colorScheme={overlay.tier===4?'yellow':overlay.tier===3?'purple':overlay.tier===2?'green':'cyan'}>{['','NORMAL RISE','🚀 BOOSTER','⚡ LIMIT BREAK','✨ OVERDRIVE / 激熱 ✨'][overlay.tier]}</Badge>{overlay.tier>=3&&<Text zIndex={1} mt={2} fontSize={overlay.tier===4?'xl':'md'} fontWeight="black" color={overlay.tier===4?'yellow.200':'purple.200'} textShadow="0 0 18px currentColor" animation="hypeBlink .28s steps(2) infinite">{overlay.tier===4?'超 激 熱':'CHANCE UP!'}</Text>}<Text zIndex={1} fontFamily="mono" fontSize={overlay.locked?'7xl':'6xl'} fontWeight="black" color={tierMeta[Math.min(4,overlay.tier-1)].color} textShadow="0 0 24px currentColor" transform={overlay.locked?'scale(1.08)':'scale(.92)'} transition="all .18s ease">+{overlay.steps}</Text><Text zIndex={1} fontSize="11px" color={overlay.locked?'white':'gray.300'} fontWeight={overlay.locked?'900':'600'} mt={2}>{overlay.detail}</Text><HStack zIndex={1} mt={3} spacing={1}>{Array.from({length:8}).map((_,i)=><Box key={i} w="18px" h="4px" rounded="full" bg={i<overlay.tier*2?(overlay.tier===4?'yellow.300':overlay.tier===3?'purple.300':overlay.tier===2?'green.300':'cyan.300'):'whiteAlpha.200'} boxShadow={i<overlay.tier*2?'0 0 8px currentColor':undefined}/>)}</HStack></Center>}
        </Flex>

        {!roomIntro&&<Box position="absolute" left={{base:2,md:'12%'}} right={{base:2,md:'12%'}} bottom={{base:2,md:3}} bg="rgba(3,4,6,.72)" backdropFilter="blur(9px)" p={{base:1.5,lg:2}} border="1px solid" borderColor="rgba(205,207,205,.22)" borderRadius="10px" zIndex={22}><Center><Button w="100%" maxW={{base:'100%',lg:'720px'}} h={{base:'50px',lg:'58px'}} bg={finalMode?"linear-gradient(180deg,#5b171e,#1e090c)":"linear-gradient(180deg,#1c1f23,#090a0c)"} color="#f1eee6" fontFamily="heading" letterSpacing=".10em" fontSize="md" fontWeight="800" textShadow="0 2px 5px #000" border="1px solid" borderColor={finalMode?"#a44850":"rgba(226,224,216,.42)"} borderRadius="2px" boxShadow={finalMode?"0 0 20px rgba(130,28,36,.30),inset 0 1px rgba(255,255,255,.05)":"0 8px 20px rgba(0,0,0,.50),inset 0 1px rgba(255,255,255,.05)"} _hover={{bg:finalMode?'#6d1c24':'#272a2e',borderColor:finalMode?'#cf666e':'#d9d5ca',color:'white'}} _active={{transform:'translateY(1px)',bg:'#0a0b0d'}} _disabled={{opacity:.48,color:'whiteAlpha.700',cursor:'not-allowed'}} leftIcon={finalMode?undefined:<FaArrowUp/>} isDisabled={disabled||eventAnimating||floorTransition.show||overlay.show} onClick={()=>{if(finalMode)end();else press();}}>{finalMode?'ゲームを終了する':'ボタンを押す'}</Button></Center></Box>}
      </Flex>

      <Modal isOpen={statusDetail!==null} onClose={()=>setStatusDetail(null)} isCentered size="xs"><ModalOverlay bg="rgba(0,0,0,.62)" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,rgba(18,21,25,.98),rgba(5,7,9,.99))" maxW="320px" border="1px solid rgba(218,216,208,.28)" borderRadius="12px" boxShadow="0 22px 60px rgba(0,0,0,.66)"><ModalHeader color="#eee9df" fontFamily="heading" textAlign="center" pb={1}>{statusDetail==='turns'?'残り回数':statusDetail==='luck'?'運気':'所持金'}</ModalHeader><ModalBody pt={2} pb={5} textAlign="center"><Center mb={3}><Icon as={statusDetail==='turns'?FaBolt:statusDetail==='luck'?FaStar:FaCoins} boxSize={8} color={statusDetail==='turns'?'yellow.300':statusDetail==='luck'?'green.300':'yellow.200'}/></Center><Text fontFamily="mono" fontWeight="900" fontSize="4xl" color={statusDetail==='turns'?'yellow.200':statusDetail==='luck'?'green.200':'yellow.100'} textShadow="0 0 18px rgba(255,255,255,.12)">{statusDetail==='turns'?`${s.turnsLeft}回`:statusDetail==='luck'?s.luck.toLocaleString('ja-JP'):`${s.money.toLocaleString('ja-JP')}円`}</Text><Text mt={2} fontSize="10px" color="gray.400">{statusDetail==='turns'?'ボタンを押せる残り回数です':statusDetail==='luck'?'現在の運気です':'現在の所持金です'}</Text></ModalBody><ModalFooter pt={0}><Button w="100%" size="sm" onClick={()=>setStatusDetail(null)}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={inventoryPanel.isOpen} onClose={inventoryPanel.onClose} isCentered><ModalOverlay bg="rgba(0,0,0,.72)" backdropFilter="blur(6px)"/><ModalContent bg="linear-gradient(180deg,rgba(17,20,24,.98),rgba(5,6,8,.99))" maxW={{base:'350px',md:'520px'}} border="1px solid rgba(218,216,208,.28)" borderRadius="10px"><ModalHeader color="#eee9df" fontFamily="heading">アイテム ({s.items.length}/3)</ModalHeader><ModalBody>{s.items.length===0?<Text py={6} textAlign="center" color="gray.500">アイテムを持っていません</Text>:<Stack spacing={2}>{s.items.map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} h="58px" justifyContent="flex-start" bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} _hover={{filter:'brightness(1.12)'}} onClick={()=>{inventoryPanel.onClose();setSelected(i);}}><HStack w="100%"><Center w="34px" h="34px" rounded="md" bg="blackAlpha.400"><Icon as={it.icon||FaGift} color={pal.icon}/></Center><Box flex="1" textAlign="left"><Text fontSize="11px" fontWeight="900">{it.name}{it.type==='gem'?` ×${it.count||1}`:''}</Text><Text fontSize="9px" color="whiteAlpha.700">{it.type==='gem'?'宝石':it.type==='passive'?'常時効果':'消費アイテム'}</Text></Box></HStack></Button>})}</Stack>}</ModalBody><ModalFooter><Button w="100%" onClick={inventoryPanel.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={logPanel.isOpen} onClose={logPanel.onClose} isCentered><ModalOverlay bg="rgba(0,0,0,.72)" backdropFilter="blur(6px)"/><ModalContent bg="linear-gradient(180deg,rgba(17,20,24,.98),rgba(5,6,8,.99))" maxW={{base:'350px',md:'560px'}} border="1px solid rgba(218,216,208,.28)" borderRadius="10px"><ModalHeader color="#eee9df" fontFamily="heading">ログ</ModalHeader><ModalBody maxH="58vh" overflowY="auto">{s.logs.length===0?<Text color="gray.500">システム: ゲーム開始</Text>:<Stack spacing={1}>{s.logs.map((l,i)=><Text key={i} fontSize="11px" color="gray.300" py={1.5} borderBottom="1px solid" borderColor="whiteAlpha.100">{l}</Text>)}</Stack>}</ModalBody><ModalFooter><Button w="100%" onClick={logPanel.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <InfoModal ctl={rules} title="ルール説明" color="green">
        <HelpSection title="1. ゲームの目的">
          <Bullet>「ボタンを押す」を使って、限られた回数の中でできるだけ高い階まで登るゲームです。</Bullet>
          <Bullet>ランキングの主な記録は <b>最終到達階数</b> です。高階層を目指しましょう。</Bullet>
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
          <Bullet><b>スロットカジノ</b>：1回の訪問につき最大10回まで。絵柄が揃うと倍率に応じた配当がもらえます。</Bullet>
          <Bullet><b>占い師の小部屋</b>：占い結果によって運気が上下します。</Bullet>
          <Bullet><b>運試しの祭壇</b>：祈る対象を1つ選び、30%で強力な加護を受けます。階数の加護に成功すると、移動先でも新しいイベントが発生します。</Bullet>
        </HelpSection>
      </InfoModal>
      <StageGuideModal ctl={guide} stages={stageCatalog} basePath={process.env.NEXT_PUBLIC_BASE_PATH||''} onPreview={(stage)=>{setPreviewStage(stage);stagePreview.onOpen();}} onPlay={playCatalogStage}/>
      <StagePreviewModal ctl={stagePreview} stage={previewStage} basePath={process.env.NEXT_PUBLIC_BASE_PATH||''} onPlay={playCatalogStage}/>
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
      <Modal isOpen={rank.isOpen} onClose={rank.onClose} isCentered><ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW={{base:'360px',md:'640px'}} border="1px solid rgba(218,216,208,.28)" borderRadius="8px" boxShadow="0 24px 80px rgba(0,0,0,.72)"><ModalHeader fontFamily="heading" letterSpacing=".08em" color="#eee9df" borderBottom="1px solid rgba(180,184,186,.16)">全国ランキング</ModalHeader><ModalBody maxH="72vh" overflowY="auto">
        <Tabs index={rankingMode==='monthly'?0:1} onChange={(i)=>{const mode:RankingScope=i===0?'monthly':'alltime';void loadRankingMode(mode);}} variant="soft-rounded" colorScheme="red" size="sm">
          <TabList mb={3}><Tab flex="1">月間</Tab><Tab flex="1">総合</Tab></TabList>
          <Box mb={3} px={2} py={1.5} bg="blackAlpha.300" borderRadius="6px"><Text fontSize="9px" color="gray.400">{rankingMode==='monthly'?`月間 ${getCurrentMonthLabel()}・毎月1日0:00(JST)更新`:'全期間の自己ベスト'}</Text><Text mt={.5} fontSize="9px" color={rankingViews[rankingMode].cached?'cyan.200':'gray.500'}>{rankingViews[rankingMode].cached?'キャッシュから表示中（再読込を節約）':'Top50 + 自分の順位のみ取得 / 51〜1000位は保存のみ'}</Text></Box>
          <Text mb={2} fontSize="10px" color={rankingStatus==='online'?'#9ab39e':rankingStatus==='connecting'?'#c7b58e':'#b57d7d'}>{rankingStatus==='online'?'● ランキング取得済み':rankingStatus==='connecting'?'ランキング読込中…':rankingStatus==='offline'?'ローカルランキングモード':'Firebase接続エラー'}</Text>
          {firebaseReady&&<Box mb={4} p={3} bg="rgba(84,28,34,.28)" border="1px solid rgba(180,74,82,.42)" borderRadius="8px"><Text fontSize="9px" color="gray.400" letterSpacing=".10em">{rankingMode==='monthly'?'今月のあなた':'総合のあなた'}</Text>{rankingStatus==='connecting'&&!rankingViews[rankingMode].loaded?<Text mt={1} color="gray.400">集計中…</Text>:rankingViews[rankingMode].mine?.entry&&rankingViews[rankingMode].mine?.rank?<><HStack mt={1} align="baseline"><Text fontFamily="heading" fontSize="3xl" color="#f0d9aa" fontWeight="900">{rankingViews[rankingMode].mine?.rank}位</Text><Text fontSize="10px" color="gray.400">/ Top 1000</Text></HStack><Flex mt={1} justify="space-between"><Text fontSize="11px" color="#eee9df" noOfLines={1}>{rankingViews[rankingMode].mine?.entry?.name}</Text><Text fontSize="12px" color="#f0d9aa" fontWeight="900">{Number(rankingViews[rankingMode].mine?.entry?.score||0).toLocaleString()}階</Text></Flex></>:<><Text mt={1} fontSize="lg" color="gray.300" fontWeight="800">まだTop1000登録なし</Text><Text mt={1} fontSize="9px" color="gray.500">ゲーム終了後に自己ベストを登録すると、ここに順位が表示されます。</Text></>}</Box>}
          <HStack mb={2} justify="space-between"><Text fontSize="11px" color="#eee9df" fontWeight="900">{rankingMode==='monthly'?'月間 TOP 50':'総合 TOP 50'}</Text><Button size="xs" variant="ghost" color="gray.400" onClick={()=>void loadRankingMode(rankingMode,true)}>再読込</Button></HStack>{rankingViews[rankingMode].rows.length?rankingViews[rankingMode].rows.slice(0,50).map((r,i)=><Flex key={r.id||i} py={1.5} borderBottom="1px solid" borderColor="rgba(200,202,200,.12)" align="center"><Text w="38px" color={i<3?'#e1c071':'#9b4148'} fontWeight="900">#{i+1}</Text><Text flex="1" noOfLines={1} color="#dfdcd4">{r.name}</Text><Text color="#d7d1c3" fontWeight="800">{Number(r.score).toLocaleString()}階</Text></Flex>):<Text color="gray.500">{rankingStatus==='connecting'?'読み込み中…':'まだ登録がありません'}</Text>}
        </Tabs>
      </ModalBody><ModalFooter><Button w="100%" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.24)" borderRadius="2px" _hover={{bg:'#351419'}} onClick={rank.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={pendingOverflow!==null} onClose={()=>{}} closeOnOverlayClick={false} isCentered><ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW="350px" border="1px solid rgba(218,216,208,.28)" borderRadius="2px"><ModalHeader fontFamily="heading" color="#eee9df" borderBottom="1px solid rgba(180,184,186,.16)">持ち物がいっぱいです</ModalHeader><ModalBody><Text fontSize="xs" color="gray.300" mb={3}>{pendingOverflowPurchase?`「${pendingOverflow?.name}」を購入すると持ち物が4つになります。入れ替えるアイテムを選ぶか、購入をキャンセルしてください。`:`新しく「${pendingOverflow?.name}」を入手しました。4つのうち捨てる1つを選んでください。`}</Text><Stack spacing={2}>{[...s.items,...(pendingOverflow?[pendingOverflow]:[])].map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} h="54px" justifyContent="flex-start" bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} _hover={{filter:'brightness(1.15)'}} onClick={()=>resolveOverflow(i)}><HStack w="100%"><Icon as={it.icon||FaGift} color={pal.icon}/><Box flex="1" textAlign="left"><Text fontSize="11px" fontWeight="900">{it.name}{it.type==='gem'?` ×${it.count||1}`:''}</Text><Text fontSize="9px" color="whiteAlpha.700">{i===3?'新しく入手したアイテム':'現在の持ち物'}</Text></Box><Text fontSize="10px" color="red.200" fontWeight="900">これを捨てる</Text></HStack></Button>})}</Stack>{pendingOverflowPurchase&&<Button mt={4} w="100%" variant="outline" colorScheme="gray" onClick={cancelOverflowPurchase}>購入をキャンセル</Button>}</ModalBody></ModalContent></Modal>
      <Modal isOpen={selected!==null} onClose={()=>setSelected(null)} isCentered><ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,#15181c,#07080a)" maxW="330px" border="1px solid rgba(218,216,208,.28)" borderRadius="2px"><ModalHeader fontFamily="heading" color="#eee9df" borderBottom="1px solid rgba(180,184,186,.16)"><HStack><Center w="36px" h="36px" rounded="lg" bg="gray.700"><Icon as={selectedItem?.icon||FaGift} color={selectedItem?itemPalette(selectedItem).icon:'gray.200'}/></Center><Text>{selectedItem?.name}</Text></HStack></ModalHeader><ModalBody><Text fontSize="sm" color="gray.100">{selectedItem?.desc}</Text></ModalBody><ModalFooter gap={2}>{selectedItem?.type==='consumable'&&<Button colorScheme="green" onClick={()=>useItem(selected!)}>使用する</Button>}{selectedItem?.type==='gem'&&(room.kind==='shop'||room.kind==='legendshop')&&<Button colorScheme="yellow" onClick={()=>sellGem(selected!)}>売却 +{(selectedItem.price*(selectedItem.count||1))}円</Button>}{selectedItem?.type==='gem'&&room.kind!=='shop'&&room.kind!=='legendshop'&&<Text fontSize="xs" color="gray.400" alignSelf="center">宝石はショップ系または伝説の神器商店で売却できます</Text>}<Button colorScheme="red" variant="outline" onClick={()=>discard(selected!)}>捨てる</Button><Button onClick={()=>setSelected(null)}>閉じる</Button></ModalFooter></ModalContent></Modal>
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
                    <Box flex="1" minW={0}><HStack spacing={2}><Text fontSize="md" color="#eee9df" fontWeight="900">{Number(record.floor||record.score).toLocaleString()}階</Text>{record.score===best&&<Badge colorScheme="yellow" fontSize="8px">BEST</Badge>}</HStack><Text mt={.5} fontSize="9px" color="gray.500">{label}</Text></Box>
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

            {newPersonalBest?<Box mt={3} p={3} textAlign="left" bg="rgba(73,28,34,.20)" border="1px solid rgba(180,74,82,.34)" borderRadius="8px">
              <Text mb={2} fontSize="10px" color="#e8dcc6" fontWeight="900">自己最高記録を更新！ 今回スコアの暫定順位</Text>
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

            {newPersonalBest&&<HStack mt={3} align="stretch">
              <Input value={nickname} onChange={e=>setNickname(Array.from(e.target.value).slice(0,12).join(''))} maxLength={12} isDisabled={scoreSubmitting||scoreSubmitted} placeholder="プレイヤー名（12文字まで）" textAlign="center"/>
              <Button minW="108px" colorScheme="yellow" onClick={submitScore} isDisabled={scoreRegistrationDisabled} isLoading={scoreSubmitting} loadingText="保存中">{scoreSubmitted?'登録済み':scorePreviewLoading?'順位確認中':firebaseReady&&scorePreview&&!scoreHasSaveTarget?'保存対象外':'ランキング登録'}</Button>
            </HStack>}
            {scoreSaveMessage&&<Text mt={2} fontSize="10px" color={scoreSubmitted?'green.200':rankingStatus==='error'?'red.200':'yellow.100'}>{scoreSaveMessage}</Text>}
            <HStack justify="space-between" mt={3} color="gray.400"><Text fontSize="xs">最終所持金: <b>{s.money.toLocaleString()}円</b></Text><Text fontSize="xs">最終運気: <b>{s.luck}</b></Text></HStack>
          </ModalBody>
          <ModalFooter><Button w="100%" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.28)" borderRadius="2px" _hover={{bg:'#351419',borderColor:'#8f3940'}} isDisabled={scoreSubmitting} onClick={()=>{setGameover(false);setMenu(true)}}>{scoreSubmitting?'保存完了までお待ちください':newPersonalBest&&!scoreSubmitted&&(!firebaseReady||Boolean(scorePreviewError)||scoreHasSaveTarget)?'登録せずメインメニューへ':'メインメニューへ'}</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  </Center></>;
}

function Action({title,sub,onClick,disabled=false}:{title:string;sub?:string;onClick:()=>void;disabled?:boolean}){return <Button h="auto" minH="52px" py={2.5} px={3} bg="linear-gradient(180deg,rgba(31,34,38,.94),rgba(7,8,10,.96))" color="#eeeae1" border="1px solid" borderColor="rgba(205,207,205,.28)" borderRadius="2px" boxShadow="inset 0 1px rgba(255,255,255,.04),0 5px 14px rgba(0,0,0,.42)" _hover={{bg:'linear-gradient(180deg,#3c171b,#13090b)',color:'white',borderColor:'#9d454c'}} _active={{bg:'#13080a',color:'white',transform:'translateY(1px)'}} _focusVisible={{boxShadow:'0 0 0 2px rgba(174,72,79,.52)'}} isDisabled={disabled} onClick={onClick}><VStack spacing={0.5} w="100%"><Text fontFamily="heading" fontSize="sm" letterSpacing=".05em" lineHeight="1.25" fontWeight="800" color="#f0ede5" textShadow="0 2px 4px #000">{title}</Text>{sub&&<Text fontSize="10px" lineHeight="1.3" color="rgba(228,226,218,.68)" fontWeight="600">{sub}</Text>}</VStack></Button>}
function StageGuideModal({ctl,stages,basePath,onPreview,onPlay}:{ctl:ReturnType<typeof useDisclosure>;stages:StageCatalogEntry[];basePath:string;onPreview:(stage:StageCatalogEntry)=>void;onPlay:(stage:StageCatalogEntry)=>void}){
  const groups=[0,1,2,3,4,5,6];
  const labels:Record<number,string>={0:'SPECIAL / START',1:'Tier 1 — Common 40%',2:'Tier 2 — Uncommon 30%',3:'Tier 3 — Rare 20%',4:'Tier 4 — Epic 9%',5:'Tier 5 — Legend 1%',6:'SPECIAL — HELL'};
  return <Modal isOpen={ctl.isOpen} onClose={ctl.onClose} isCentered size="sm"><ModalOverlay bg="blackAlpha.900" backdropFilter="blur(7px)"/><ModalContent bg="linear-gradient(180deg,#12151a,#050607)" maxW={{base:'390px',md:'720px',lg:'940px'}} maxH="90vh" border="1px solid rgba(218,216,208,.30)" borderRadius="3px" boxShadow="0 24px 80px rgba(0,0,0,.78)"><ModalHeader fontFamily="heading" color="#eee9df" letterSpacing=".10em" borderBottom="1px solid rgba(170,174,176,.16)">ステージ図鑑</ModalHeader><ModalBody px={3} py={3} overflowY="auto"><Text mb={3} fontSize="10px" color="gray.400" lineHeight="1.7">背景をタップすると大きく表示できます。</Text><Stack spacing={4}>{groups.map(tier=>{const rows=stages.filter(s=>s.tier===tier);if(!rows.length)return null;return <Box key={tier}><HStack mb={2}><Box w="3px" h="14px" bg={tier>=5?'#d6b85e':tier===4?'#a44850':tier===3?'#8b5cf6':tier===2?'#2f9d76':'#77808a'}/><Text fontSize="10px" letterSpacing=".10em" fontWeight="900" color="gray.300">{labels[tier]}</Text></HStack><SimpleGrid columns={{base:1,md:2,lg:3}} spacing={2}>{rows.map(stage=><Box key={`${stage.tier}-${stage.title}`} h={{base:'150px',lg:'175px'}} overflow="hidden" position="relative" border="1px solid rgba(210,212,210,.18)" borderRadius="3px" bg="#08090b" _hover={{borderColor:stage.accent}} transition="all .18s"><Box position="absolute" inset={0} bgImage={stage.image?`linear-gradient(90deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.34) 52%,rgba(0,0,0,.18) 100%), url("${basePath}/${stage.image}")`:`linear-gradient(90deg,rgba(0,0,0,.68),rgba(0,0,0,.18)), ${stage.bg}`} bgSize="cover" bgPosition="center"/><Box position="absolute" inset={0} bg="linear-gradient(180deg,transparent 26%,rgba(0,0,0,.84) 100%)"/><Box position="relative" zIndex={1} h="100%" p={3} display="flex" flexDirection="column" justifyContent="flex-end" cursor="pointer" onClick={()=>onPreview(stage)}><HStack spacing={2}><Badge bg="rgba(0,0,0,.62)" color={stage.accent} border="1px solid" borderColor={stage.accent} borderRadius="1px" fontSize="8px">{stage.tier===0?'START':stage.tier===6?'HELL':`TIER ${stage.tier}`}</Badge>{stage.label&&<Text fontSize="8px" letterSpacing=".16em" color="whiteAlpha.600">{stage.label}</Text>}</HStack><Text mt={1} fontFamily="heading" fontSize="md" color="#f3f0e8" fontWeight="800" letterSpacing=".05em" textShadow="0 2px 7px #000">{stage.title}</Text><Text mt={.5} fontSize="9px" lineHeight="1.45" color="whiteAlpha.700" noOfLines={1}>{stage.desc}</Text></Box></Box>)}</SimpleGrid></Box>})}</Stack></ModalBody><ModalFooter borderTop="1px solid rgba(170,174,176,.12)"><Button w="100%" borderRadius="2px" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.24)" _hover={{bg:'#351419',borderColor:'#8f3940'}} onClick={ctl.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
}
function StagePreviewModal({ctl,stage,basePath,onPlay}:{ctl:ReturnType<typeof useDisclosure>;stage:StageCatalogEntry|null;basePath:string;onPlay:(stage:StageCatalogEntry)=>void}){if(!stage)return null;return <Modal isOpen={ctl.isOpen} onClose={ctl.onClose} isCentered size="sm"><ModalOverlay bg="rgba(0,0,0,.88)" backdropFilter="blur(8px)"/><ModalContent overflow="hidden" bg="#050607" maxW={{base:'390px',md:'760px',lg:'920px'}} border="1px solid rgba(218,216,208,.28)" borderRadius="3px"><Box position="relative" h={{base:'420px',md:'500px',lg:'560px'}} bgImage={stage.image?`linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.14) 52%,rgba(0,0,0,.88) 100%), url("${basePath}/${stage.image}")`:`linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.14) 52%,rgba(0,0,0,.88) 100%), ${stage.bg}`} bgSize="cover" bgPosition="center"><Box position="absolute" inset={0} bg="radial-gradient(circle at 50% 20%,rgba(255,255,255,.08),transparent 32%)"/><Box position="absolute" left={4} right={4} bottom={4}><Badge bg="rgba(0,0,0,.68)" color={stage.accent} border="1px solid" borderColor={stage.accent} borderRadius="1px">{stage.tier===0?'START':stage.tier===6?'HELL':`TIER ${stage.tier}`}</Badge><Text mt={2} fontFamily="heading" fontSize="2xl" color="#f4f0e8" fontWeight="800" textShadow="0 3px 10px #000">{stage.title}</Text><Text mt={1} fontSize="xs" lineHeight="1.8" color="whiteAlpha.800">{stage.desc}</Text></Box></Box><ModalFooter><Button w="100%" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.24)" borderRadius="2px" _hover={{bg:'#351419'}} onClick={ctl.onClose}>図鑑へ戻る</Button></ModalFooter></ModalContent></Modal>}

function InfoModal({ctl,title,color,children}:{ctl:ReturnType<typeof useDisclosure>;title:string;color:string;children:React.ReactNode}){return <Modal isOpen={ctl.isOpen} onClose={ctl.onClose} isCentered><ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)"/><ModalContent bg="linear-gradient(180deg,#14171b,#07080a)" maxW={{base:'360px',md:'620px',lg:'720px'}} border="1px solid" borderColor="rgba(218,216,208,.30)" borderRadius="2px" boxShadow="0 24px 80px rgba(0,0,0,.72)"><ModalHeader fontFamily="heading" color="#eee9df" letterSpacing=".09em" borderBottom="1px solid rgba(170,174,176,.16)">{title}</ModalHeader><ModalBody maxH="68vh" overflowY="auto"><Stack fontSize="xs" color="rgba(230,228,220,.72)" lineHeight="1.8" spacing={3}>{children}</Stack></ModalBody><ModalFooter><Button w="100%" borderRadius="2px" bg="#111317" color="#eee9df" border="1px solid rgba(205,207,205,.24)" _hover={{bg:'#351419',borderColor:'#8f3940'}} onClick={ctl.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>}

function HelpSection({title,children}:{title:string;children:React.ReactNode}){return <Box bg="rgba(255,255,255,.03)" border="1px solid rgba(205,207,205,.12)" borderRadius="3px" px={3} py={2.5}><Text mb={2} fontFamily="heading" fontSize="sm" color="#eee9df" letterSpacing=".05em">{title}</Text><Stack spacing={1.5}>{children}</Stack></Box>}
function Bullet({children}:{children:React.ReactNode}){return <HStack align="start" spacing={2}><Text mt="1px" color="#b8565c" fontWeight="900">•</Text><Text flex="1">{children}</Text></HStack>}
