// A presentation clock never controls a shogi turn. All poses are sampled by age.
export const COMBAT_LIMITS=Object.freeze({battles:6,mobileBattles:4,particles:192,history:48});
export const COMBAT_TIMING=Object.freeze({approach:600,battle:3000,occupy:600,total:4200});
export const COMBATS=Object.freeze({
  P:{name:'足軽の連続槍突き',duration:COMBAT_TIMING.total,reach:9.2,impact:.46},
  L:{name:'長槍の一斉突撃',duration:COMBAT_TIMING.total,reach:10,impact:.46},
  N:{name:'騎馬隊長の合図と一斉射撃',duration:COMBAT_TIMING.total,reach:24,impact:.57},
  S:{name:'重装武者の振り下ろし',duration:COMBAT_TIMING.total,reach:8.4,impact:.49},
  G:{name:'旗本の挟撃',duration:COMBAT_TIMING.total,reach:9,impact:.48},
  B:{name:'符術と護衛の斬り込み',duration:COMBAT_TIMING.total,reach:17,impact:.55},
  R:{name:'騎馬武者の突撃',duration:COMBAT_TIMING.total,reach:11,impact:.47},
  D:{name:'龍の降下と炎',duration:COMBAT_TIMING.total,reach:14,impact:.50},
  K:{name:'軍配と護衛の進撃',duration:COMBAT_TIMING.total,reach:10,impact:.50},
});
export const combatStyle=p=>p.t==='R'&&p.p?'D':p.t;
export const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=(t,a,b)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
const pulse=(t,a,b,c)=>smooth(t,a,b)*(1-smooth(t,b,c));
export function battleProgress(age){
  const ms=clamp(age)*COMBAT_TIMING.total;
  if(ms<COMBAT_TIMING.approach)return ms/COMBAT_TIMING.approach*.23;
  if(ms<COMBAT_TIMING.approach+COMBAT_TIMING.battle)return .23+(ms-COMBAT_TIMING.approach)/COMBAT_TIMING.battle*.53;
  return .76+(ms-COMBAT_TIMING.approach-COMBAT_TIMING.battle)/COMBAT_TIMING.occupy*.24;
}
export function combatStage(style,t){const hit=COMBATS[style].impact;return t<.23?'approach':t<hit?'attack':t<hit+.09?'impact':t<.76?'defeat':t<.97?'occupy':'settle';}

// Positive forward is towards the opponent (model front is local -Z).
export function attackPose(style,m,index,t){
  const p={forward:0,side:0,lean:0,twist:0,lift:0,armR:0,armL:0,armRY:0,armLY:0};
  const row=clamp((m.z+4)/8),hit=COMBATS[style].impact,ready=pulse(t,.16,.32,.78);
  const strike=pulse(t,hit-.08+row*.04,hit+.015+row*.04,hit+.19+row*.04);
  switch(style){
    case 'P':{const probe=pulse(t,.25+row*.015,.30+row*.015,.36+row*.015);p.armR=-1.48*ready;p.forward=strike*1.25+probe*.55;p.lean=-strike*.19-probe*.08;p.armL=-strike*.45;break;}
    case 'L':p.armR=-1.55*ready;p.forward=2.1*pulse(t,.27,.48,.72);p.lean=-.25*ready;break;
    case 'N':
      if(m.type==='N'){p.armR=-2.4*pulse(t,.13,.28,.49);p.armRY=-.28*ready;}
      else {const draw=pulse(t,.22+index*.006,.38+index*.006,.58);p.armL=-1.25*draw;p.armLY=.30*draw;p.armR=-1.2*draw;p.armRY=-.8*draw;p.twist=-.18*draw;}
      break;
    case 'S':{const wind=pulse(t,.16,.37,.54);p.armR=-2.8*wind-1.25*strike;p.armL=-2.5*wind-1.2*strike;p.armRY=.42*ready;p.armLY=-.50*ready;p.forward=1.45*strike;p.lean=-.38*strike+.12*wind;break;}
    case 'G':{const flank=Math.abs(m.x)>1,thrust=pulse(t,flank?.40:.27,flank?.51:.38,flank?.73:.52);p.armR=-1.5*ready;p.forward=thrust*(flank?1.75:.65);p.side=flank?-Math.sign(m.x)*.45*thrust:0;p.lean=-.18*thrust;break;}
    case 'B':
      if(m.type==='B'){p.armR=-1.7*pulse(t,.15,.30,.60);p.armL=-.7*ready;}
      else {const cut=pulse(t,.48,.60,.75);p.forward=(12+m.z)*smooth(t,.48,.62)*(1-smooth(t,.76,.97));p.armR=-2.4*pulse(t,.39,.50,.59)-1.2*cut;p.twist=(index%2?1:-1)*.4*cut;p.lean=-.24*cut;}
      break;
    case 'R':p.armR=-1.48*ready;p.forward=1.65*strike;p.lean=-.13*strike;break;
    case 'D':p.lift=-1.9*pulse(t,.03,.31,.85);p.armR=-1.45*ready;p.lean=-.14*ready;break;
    case 'K':
      if(m.type==='K'){p.forward=-1.6*ready;p.armR=-1.9*pulse(t,.13,.28,.52);p.armRY=.6*Math.sin(t*18)*ready;}
      else {p.forward=1.8*strike;p.armR=-1.5*ready;p.lean=-.18*strike;}
      break;
  }
  return p;
}
export function defeatPose(m,index,t,impact){
  const row=clamp((m.z+4)/8),start=impact+row*.045;
  const fall=smooth(t,start+.01,start+.14),fade=smooth(t,.74+row*.025,.94);
  const guard=smooth(t,.23,.29)*(1-smooth(t,impact-.02,impact+.03));
  return {fall,guard,lean:fall*1.48+guard*.08*Math.sin(t*35+index),roll:(index%2?1:-1)*fall*.15,back:fall*.6+guard*.15,scale:1-fade};
}
