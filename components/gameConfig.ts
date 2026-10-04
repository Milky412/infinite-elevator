// ゲーム全体で共有する定数・型・アイテム生成処理。
// 巨大な画面コンポーネントから静的データを分離し、イベント処理を読みやすくする。
import { FaBolt, FaGem, FaGift, FaRing, FaStar, FaTicket, FaTree, FaWandMagicSparkles } from 'react-icons/fa6';
import type { Item, ItemId, State } from '../lib/types';

export const tierMeta = [
  {name:'Tier 1', bg:'radial-gradient(circle at center, rgba(14,165,233,.15), rgba(15,23,42,.95))', color:'cyan.300'},
  {name:'Tier 2', bg:'radial-gradient(circle at center, rgba(16,185,129,.20), rgba(15,23,42,.95))', color:'green.300'},
  {name:'Tier 3', bg:'radial-gradient(circle at center, rgba(168,85,247,.25), rgba(15,23,42,.95))', color:'purple.300'},
  {name:'Tier 4', bg:'radial-gradient(circle at center, rgba(239,68,68,.30), rgba(15,23,42,.95))', color:'red.300'},
  {name:'Tier 5', bg:'radial-gradient(circle at center, rgba(245,158,11,.35), rgba(15,23,42,.95))', color:'yellow.300'},
];



export type StageCatalogEntry={tier:number;title:string;desc:string;image?:string;bg:string;accent:string;label?:string};
export type KeyKind='copper'|'silver'|'gold'|'diamond';
export type FatePending={money:number;luck:number;turns:number;items:Item[];labels:string[]};
export const stageCatalog:StageCatalogEntry[]=[
{tier:0,title:'エレベーターホール',desc:'すべての冒険が始まる巨大昇降塔の入口。',image:'stages/stage-01.webp',bg:'linear-gradient(180deg,#0c1117,#020304)',accent:'#d7d2c8',label:''},
{tier:1,title:'何も無い部屋',desc:'静寂だけが残る空室。',image:'stages/stage-02.webp',bg:'linear-gradient(145deg,#1b1d20,#08090a)',accent:'#a3a3a3'},
{tier:1,title:'猫の部屋',desc:'猫たちと遊べる、静かな癒やしの部屋。',image:'stages/stage-cat-room.webp',bg:'radial-gradient(circle at 50% 38%,rgba(244,114,182,.22),transparent 40%),linear-gradient(180deg,#2b1b25,#0b090b)',accent:'#f9a8d4'},
{tier:1,title:'犬の部屋',desc:'犬たちと遊べる、明るくにぎやかな部屋。',image:'stages/stage-dog-room.webp',bg:'radial-gradient(circle at 50% 38%,rgba(251,191,36,.22),transparent 40%),linear-gradient(180deg,#2a2315,#0b0a08)',accent:'#fde68a'},
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
{tier:1,title:'自動販売機',desc:'場違いな光を放つ古い自動販売機。',image:'stages/stage-14.webp',bg:'radial-gradient(circle at 50% 55%,rgba(56,189,248,.22),transparent 30%),linear-gradient(180deg,#0f2430,#071015)',accent:'#7dd3fc'},
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
{tier:2,title:'スクラッチくじの部屋',desc:'3か所を削って同じ宝石が揃えば賞金獲得。',image:'stages/stage-scratch-room.webp',bg:'radial-gradient(circle at 50% 45%,rgba(250,204,21,.24),transparent 36%),linear-gradient(180deg,#33230c,#0b0804)',accent:'#fde68a'},
{tier:3,title:'運命の扉',desc:'当たりを選び続けるほど報酬が累積。途中で持ち帰ることもできる。',image:'stages/stage-fate-door.webp',bg:'radial-gradient(circle at 50% 36%,rgba(168,85,247,.30),transparent 40%),linear-gradient(180deg,#28133f,#09070e)',accent:'#d8b4fe'},
{tier:3,title:'海賊船の隠し部屋',desc:'10個の箱から3つ選び、宝物庫を開く鍵を探す。',image:'stages/stage-pirate-secret-room.webp',bg:'radial-gradient(circle at 50% 25%,rgba(251,146,60,.24),transparent 36%),linear-gradient(180deg,#30200e,#0b0906)',accent:'#fdba74'},
{tier:4,title:'封印された宝物庫',desc:'海賊船で得た鍵を使い、鍵の種類に応じた宝箱を開ける。',image:'stages/stage-sealed-vault.webp',bg:'radial-gradient(circle at 50% 38%,rgba(250,204,21,.30),transparent 40%),linear-gradient(180deg,#3a2a0b,#0b0905)',accent:'#fde68a'},
{tier:5,title:'天国への階段',desc:'現在階数を1.1〜1.5倍へ引き上げる伝説級の階段。',image:'stages/stage-heaven-stairs.webp',bg:'radial-gradient(circle at 50% 10%,rgba(255,255,255,.58),rgba(250,204,21,.22) 32%,transparent 58%),linear-gradient(180deg,#49628a,#111827 72%)',accent:'#fef3c7'},
{tier:5,title:'究極のルーレット',desc:'金・紫・赤の光が回転する神々の遊戯場。',image:'stages/stage-34.webp',bg:'conic-gradient(from 0deg at 50% 50%,rgba(250,204,21,.32),rgba(168,85,247,.28),rgba(239,68,68,.26),rgba(250,204,21,.32)),radial-gradient(circle,#563008,#0a0a0d 68%)',accent:'#fde68a'},
{tier:5,title:'神の故郷',desc:'白金の光が降り注ぐ、塔の最上位に近い聖域。',image:'stages/stage-35.webp',bg:'radial-gradient(circle at 50% 12%,rgba(255,255,255,.82),rgba(250,204,21,.34) 28%,transparent 58%),linear-gradient(180deg,#7a5917,#2d2409 42%,#090b10)',accent:'#fff7c2'},
{tier:5,title:'伝説の神器商店',desc:'ここでしか買えない三種の神器を扱う伝説級の商店。',image:'stages/legendary-relic-shop.webp',bg:'radial-gradient(circle at 50% 18%,rgba(250,204,21,.55),transparent 38%),linear-gradient(180deg,#5a3b0c,#180f05)',accent:'#fde68a'},
{tier:6,title:'地獄の門',desc:'赤黒い霧と灼熱の亀裂が広がる脱出専用フロア。',image:'stages/stage-36.webp',bg:'radial-gradient(circle at 50% 28%,rgba(185,28,28,.70),transparent 38%),linear-gradient(180deg,#3b0505,#0b0000 72%,#000)',accent:'#fca5a5',label:''}
];

export const stageRouteMap:Record<string,{tier:number;type:string}>={
  '何も無い部屋':{tier:1,type:'NOTHING'},'猫の部屋':{tier:1,type:'CAT_ROOM'},'犬の部屋':{tier:1,type:'DOG_ROOM'},'ラッキー部屋':{tier:1,type:'LUCKY'},'落ちている財布':{tier:1,type:'MONEY_FOUND'},'短い階段':{tier:1,type:'STAIRS_SHORT'},'2つの扉':{tier:1,type:'DOORS'},'小さなお店':{tier:1,type:'SHOP_SMALL'},'占い師の小部屋':{tier:1,type:'FORTUNE'},'3つの怪しい小箱':{tier:1,type:'BOXES'},'怪しい物々交換所':{tier:1,type:'BARTER'},'運命の分岐路':{tier:1,type:'CROSSROADS'},
  '自動販売機':{tier:1,type:'VENDING'},'超ラッキー部屋':{tier:2,type:'SUPER_LUCKY'},'健康の湯':{tier:2,type:'HEALTH'},'小さな宝箱':{tier:2,type:'TREASURE'},'ルビーの採掘場':{tier:2,type:'RUBY_MINING'},'長い階段':{tier:2,type:'STAIRS_MED'},'大きなお店':{tier:2,type:'SHOP_MED'},'地下カードサロン':{tier:2,type:'BLACKJACK'},'魔法鍛冶屋':{tier:2,type:'FORGE'},'運試しの祭壇':{tier:2,type:'ALTAR'},'ミステリーオークション':{tier:2,type:'MYSTERY_AUCTION'},'スクラッチくじの部屋':{tier:2,type:'SCRATCH'},'ATM':{tier:2,type:'ATM'},
  'スロットカジノ':{tier:3,type:'CASINO'},'極ラッキー部屋':{tier:3,type:'SUPER_LUCKY_3'},'無病の湯':{tier:3,type:'HEALTH_2'},'エメラルドの採掘場':{tier:3,type:'EMERALD_MINING'},'果てしなく長い階段':{tier:3,type:'STAIRS_LONG'},'ホームセンター':{tier:3,type:'SHOP_LARGE'},'不思議なアイテム箱':{tier:3,type:'ITEM_BOX'},'アンケート娘':{tier:3,type:'SURVEY_GIRL'},'運命の扉':{tier:3,type:'FATE_DOOR'},'海賊船の隠し部屋':{tier:3,type:'PIRATE_ROOM'},
  'ワープホール':{tier:4,type:'WARP'},'神々の競売場':{tier:4,type:'AUCTION'},'ダイヤモンドの採掘場':{tier:4,type:'DIAMOND_MINING'},'不老不死の湯':{tier:4,type:'HEALTH_3'},'封印された宝物庫':{tier:4,type:'SEALED_VAULT'},
  '究極のルーレット':{tier:5,type:'ULTIMATE_ROULETTE'},'神の故郷':{tier:5,type:'GOD'},'伝説の神器商店':{tier:5,type:'LEGEND_SHOP'},'天国への階段':{tier:5,type:'HEAVEN_STAIRS'}
};
export const masterItemIds:ItemId[]=['mirror','ring','sage_gem','party_set','money_tree','blessing_charm','shop_ticket','ruby','emerald','diamond','yata_mirror','kusanagi','immortal_mag'];



// 小さなランダム処理と、IDからアイテム表示データを組み立てる共通ヘルパー。
export const ri=(a:number,b:number)=>Math.floor(Math.random()*(b-a+1))+a;
export const pick=<T,>(a:T[])=>a[Math.floor(Math.random()*a.length)];

export function makeItem(id:ItemId,n=1):Item{
  switch(id){
    case 'mirror': return {id,name:`乱反射の鏡★${n}`,type:'consumable',paramN:n,desc:`使うと次に進む階数が${n}倍になる。`,price:n*150+200,icon:FaWandMagicSparkles};
    case 'ring': return {id,name:`幸運の指輪★${n}`,type:'consumable',paramN:n,desc:`3ターンの間運気が+${n}。`,price:n*50+100,icon:FaRing};
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
export const baseState:State={floor:1,turnsLeft:10,luck:0,money:1000,highScore:1,items:[],logs:[],ringBuff:{active:false,turns:0,amount:0},mirrorMultiplier:1,partySet:false,inHell:false};

export function itemPalette(item:Item){
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


