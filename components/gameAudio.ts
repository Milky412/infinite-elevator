// Web Audio APIで効果音/BGMを生成する音響モジュール。
// 音源ファイルを増やさず、ゲーム状況ごとのサウンドをここで一元管理する。

export type SfxName = 'click'|'start'|'door'|'move1'|'move2'|'move3'|'move4'|'arrive'|'success'|'fail'|'coin'|'item'|'buy'|'sell'|'mine'|'gem'|'card'|'casino'|'slotStop'|'jackpot'|'warpUp'|'warpDown'|'roulette'|'hell'|'gameover'|'discard'|'upgrade';
export type DoorChoice = 'creaky'|'silver'|'gold'|'luck'|'health'|'money';
let audioContext: AudioContext | null = null;
export function playSfx(name:SfxName, enabled=true){
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

export type BgmMood = 'tier1'|'tier2'|'tier3'|'tier4'|'tier5'|'god'|'casino'|'blackjack'|'hell'|'mystic'|'lucky'|'health'|'mining'|'shop'|'treasure'|'forge'|'auction'|'adventure';
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
export function stopBgm(){
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
export function startBgm(mood:BgmMood, enabled=true, tier=1){
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

