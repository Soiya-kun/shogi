import {readFile,writeFile} from 'node:fs/promises';
const source=await readFile(new URL('../docs/battle-presentation-scripts.md',import.meta.url),'utf8');
const catalog={};
for(const match of source.matchAll(/^### (\d+)｜(.+?) — (.+)\r?\n([\s\S]*?)(?=^###? |$(?![\s\S]))/gm)){
  const [,id,kanji,english,body]=match;
  const ja=body.match(/\*\*大将\*\*：.*?「(.+?)」/)?.[1]??'';
  const subtitle=body.match(/\*\*英語字幕\*\*：`([^`]+)`/)?.[1]??'';
  catalog[Number(id)]={id:Number(id),kanji,english:english.trim(),ja,subtitle};
}
if(Object.keys(catalog).length!==100)throw new Error('台本100件を読み取れません');
await writeFile(new URL('../dist/presentation-catalog.mjs',import.meta.url),'// Generated from docs/battle-presentation-scripts.md; npm run catalog\nexport const SCRIPTS='+JSON.stringify(catalog,null,2)+';\n');
