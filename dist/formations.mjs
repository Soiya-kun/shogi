// One logical shogi piece remains one squad. Headcounts are visual only.
export const SQUADS={
  P:{name:'歩兵隊',count:12,formation:'密集隊形',kind:'block',cols:4,spacing:1.65},
  L:{name:'長槍隊',count:10,formation:'二列横隊',kind:'block',cols:5,spacing:1.6},
  N:{name:'騎兵隊',count:6,formation:'楔形隊形',kind:'wedge',spacing:2.0},
  S:{name:'剣士隊',count:8,formation:'散開隊形',kind:'block',cols:4,spacing:1.95},
  G:{name:'近衛隊',count:9,formation:'方陣',kind:'block',cols:3,spacing:1.8},
  R:{name:'重装隊',count:8,formation:'盾壁',kind:'block',cols:4,spacing:1.9},
  B:{name:'魔導隊',count:6,formation:'護衛陣形',kind:'guard',spacing:2.0},
  K:{name:'本陣',count:8,formation:'指揮官と護衛',kind:'guard',spacing:2.0},
};
export function formation(type, compact=false) {
  const spec=SQUADS[type];if(!spec)throw new Error('Unknown squad '+type);
  const out=[];
  if(spec.kind==='wedge') {
    for(let row=0;row<3;row++)for(let col=0;col<=row;col++)out.push({x:(col-row/2)*spec.spacing,z:row*1.9-1.9,type});
  } else if(spec.kind==='guard') {
    out.push({x:0,z:0,type});
    const n=spec.count-1;
    for(let i=0;i<n;i++){const a=Math.PI*2*i/n;out.push({x:Math.cos(a)*2.8,z:Math.sin(a)*2.4,type:type==='K'?'G':'S'});}
  } else {
    const rows=Math.ceil(spec.count/spec.cols);
    for(let i=0;i<spec.count;i++)out.push({x:(i%spec.cols-(spec.cols-1)/2)*spec.spacing,z:(Math.floor(i/spec.cols)-(rows-1)/2)*1.85,type});
  }
  // Coarse quality reduces representation only; rules, hands and roster stay identical.
  return compact&&out.length>6 ? Array.from({length:6},(_,i)=>out[Math.floor(i*out.length/6)]) : out;
}
