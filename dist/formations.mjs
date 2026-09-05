// One logical shogi piece remains one squad. Headcounts are visual only.
export const SQUADS={
  P:{name:'足軽隊',count:12,formation:'密集隊形',kind:'block',cols:4,spacing:2.7,rowSpacing:3.4},
  L:{name:'長槍足軽隊',count:10,formation:'二列横隊',kind:'block',cols:5,spacing:2.1,rowSpacing:5.8},
  N:{name:'弓足軽隊',count:6,formation:'騎馬武者1人＋弓足軽5人',kind:'wedge',spacing:3.8,rowSpacing:3.5,bannerOffsetX:1.3},
  S:{name:'重装武者隊',count:8,formation:'重装二列横隊',kind:'block',model:'H',cols:4,spacing:2.75,rowSpacing:6.0},
  G:{name:'旗本隊',count:9,formation:'方陣',kind:'block',cols:3,spacing:3.65,rowSpacing:3.4,bannerOffsetX:1.3},
  R:{name:'竜武者隊',count:8,unit:'騎',formation:'飛行隊形',kind:'flight',spacing:3.8,flightHeight:3.5},
  B:{name:'陰陽師隊',count:6,formation:'護衛陣形',kind:'guard',radiusX:4.2,radiusZ:3.8},
  K:{name:'本陣',count:8,formation:'指揮官と護衛',kind:'guard',radiusX:4.2,radiusZ:4.0},
};
export function formation(type, compact=false) {
  const spec=SQUADS[type];if(!spec)throw new Error('Unknown squad '+type);
  const out=[];
  if(spec.kind==='flight') {
    for(let row=0;row<3;row++){
      const n=row===1?2:3;
      for(let col=0;col<n;col++)out.push({x:(col-(n-1)/2)*spec.spacing,z:(row-1)*3.1,altitudeOffset:row===1?1.3:0,type});
    }
  } else if(spec.kind==='wedge') {
    for(let row=0;row<3;row++)for(let col=0;col<=row;col++)out.push({x:(col-row/2)*spec.spacing,z:(row-1)*spec.rowSpacing,type:row===0?type:'A'});
  } else if(spec.kind==='guard') {
    out.push({x:0,z:0,type});
    const n=spec.count-1;
    for(let i=0;i<n;i++){const a=Math.PI*2*i/n;out.push({x:Math.cos(a)*spec.radiusX,z:Math.sin(a)*spec.radiusZ,type:type==='K'?'G':'S'});}
  } else {
    const rows=Math.ceil(spec.count/spec.cols);
    for(let i=0;i<spec.count;i++)out.push({x:(i%spec.cols-(spec.cols-1)/2)*spec.spacing,z:(Math.floor(i/spec.cols)-(rows-1)/2)*(spec.rowSpacing??1.85),type:spec.model??type});
  }
  // Coarse quality reduces representation only; rules, hands and roster stay identical.
  // Include both ends of the formation so compact squads also fill the cell.
  return compact&&out.length>6 ? Array.from({length:6},(_,i)=>out[Math.round(i*(out.length-1)/5)]) : out;
}
