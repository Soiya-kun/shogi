import test from 'node:test';
import assert from 'node:assert/strict';
import {YANKEE,presentEvent} from '../dist/presentation-themes.mjs';
import {IMPLEMENTED,event} from '../dist/battle-events.mjs';
test('all implemented presentations have distinct bilingual Yankee copy without changing evidence',()=>{
 assert.deepEqual(Object.keys(YANKEE).map(Number).sort((a,b)=>a-b),[...IMPLEMENTED].sort((a,b)=>a-b));
 for(const id of IMPLEMENTED){const e=event(id,{gameId:'test',positionRevision:5,side:1});const p=presentEvent(e,'yankee');for(const field of ['kanji','ja','english','subtitle'])assert.ok(p[field],`${id}.${field}`);for(const field of ['id','eventId','side','positionRevision','priority','intensity','subjectPieceIds'])assert.deepEqual(p[field],e[field]);assert.equal(presentEvent(e,'samurai'),e);assert.ok(p.voiceKey.startsWith('yankee.'));}
});
test('command variants, formations and terminal subtitle retain meaning',()=>{
 assert.match(presentEvent({id:97,voiceKey:'97.defend'},'yankee').ja,/守り/);
 assert.match(presentEvent({id:96,voice:false},'yankee').ja,/次の番/);
 assert.equal(presentEvent({id:4,kanji:'美濃囲い'},'yankee').formationName,'美濃囲い');
 assert.equal(presentEvent({id:29,resultSubtitle:'歩兵決着'},'yankee').resultSubtitle,'若手が決めた');
 assert.equal(presentEvent({id:17},'yankee').kanji,'本気');
 assert.equal(presentEvent({id:999,kanji:'判定',ja:'武将の声'},'yankee').ja,'');
});
