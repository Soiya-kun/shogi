import {initial,legal,apply,check,names,key} from './rules.mjs';
export function validPosition(g) {
  return g && Array.isArray(g.b) && g.b.length===81 && g.b.every(p=>p===null||(p&&Object.hasOwn(names,p.t)&&[0,1].includes(p.s)&&typeof p.p==='boolean'))
    && [0,1].includes(g.turn) && Number.isInteger(g.ply) && g.ply>=0 && Array.isArray(g.h) && g.h.length===2
    && g.h.every(h=>h&&typeof h==='object'&&!Array.isArray(h)&&Object.entries(h).every(([t,n])=>t!=='K'&&Object.hasOwn(names,t)&&Number.isInteger(n)&&n>=0&&n<=18))
    && [0,1].every(s=>g.b.filter(p=>p?.s===s&&p.t==='K').length===1);
}
export class Match {
  constructor(saved) {
    this.reset();
    if(saved && validPosition(saved.g) && Array.isArray(saved.past) && saved.past.every(validPosition)
      && Array.isArray(saved.records) && saved.records.length===saved.past.length
      && saved.records.every(r=>typeof r.text==='string'&&[0,1].includes(r.mover)&&typeof r.check==='boolean')) {
      this.g=saved.g;this.past=saved.past;this.records=saved.records;this.end=typeof saved.end==='string'?saved.end:'';
    }
  }
  reset(){this.g=initial();this.past=[];this.records=[];this.end='';}
  get moves(){return this.end?[]:legal(this.g);}
  play(request) {
    const m=this.moves.find(m=>m.from===request.from&&m.to===request.to&&m.drop===request.drop&&!!m.promote===!!request.promote);
    if(!m)throw new Error('合法手ではありません');
    const before=structuredClone(this.g),p=m.drop?{t:m.drop}:before.b[m.from];
    this.past.push(before);this.g=apply(this.g,m);
    this.records.push({m,text:(before.turn?'△ ':'▲ ')+(9-m.to%9)+'一二三四五六七八九'[Math.floor(m.to/9)]+' '+names[p.t]+(m.drop?' 打':m.promote?' 成':''),mover:before.turn,check:check(this.g,this.g.turn)});
    if(!legal(this.g).length)this.end=check(this.g,this.g.turn)?(before.turn?'紅':'蒼')+'の騎士団の勝利 — 詰み':'終局 — 合法手がありません';
    const seq=[...this.past,this.g],hits=seq.map((s,i)=>key(s)===key(this.g)?i:-1).filter(i=>i>=0);
    if(hits.length>=4){const r=this.records.slice(hits[hits.length-4]),checker=[0,1].find(s=>r.some(v=>v.mover===s)&&r.filter(v=>v.mover===s).every(v=>v.check));this.end=checker!==undefined?(checker?'紅':'蒼')+'の反則負け — 連続王手の千日手':'千日手 — 引き分け・指し直し';}
    return {before,after:this.g,m};
  }
  undo(){if(!this.past.length)return;this.g=this.past.pop();this.records.pop();this.end='';}
  serialize(){return {g:this.g,past:this.past,records:this.records,end:this.end};}
}
