import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {GLTFLoader} from '../dist/vendor/loaders/GLTFLoader.js';
import {terrainSampler,cellXZ} from '../dist/terrain.mjs';

// Three imports resolve through the installed dev dependency during offline QA.
export function parseGLB(buffer) {
  assert.equal(buffer.readUInt32LE(0),0x46546c67,'GLB magic');assert.equal(buffer.readUInt32LE(4),2);
  assert.equal(buffer.readUInt32LE(8),buffer.length,'GLB declared length');
  return JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
}
const reports={};
for(const name of ['meadow','army']) {
  const bytes=await readFile(new URL(`../dist/assets/${name}.glb`,import.meta.url));
  const data=parseGLB(bytes);
  assert(data.buffers.every(b=>!b.uri),'GLB must be self-contained');
  assert(!data.images?.length,'Current artwork uses portable vertex colors');
  const required=name==='army'?['P','L','N','S','G','B','R','K'].flatMap(t=>['Unit_'+t,'LOD_'+t]):['Terrain'];
  for(const n of required)assert(data.nodes.some(o=>o.name===n),`Missing ${n}`);
  const triangles=data.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+data.accessors[p.indices].count/3,0);
  reports[name]={bytes:bytes.length,triangles,meshes:data.meshes.length};
  if(name==='meadow') {
    const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
    gltf.scene.updateMatrixWorld(true);const terrain=gltf.scene.getObjectByName('Terrain');
    const geo=terrain.geometry.clone().applyMatrix4(terrain.matrixWorld);
    const h=terrainSampler(geo.attributes.position.array,geo.index.array);
    const heights=Array.from({length:81},(_,i)=>h(...cellXZ(i)));
    assert(heights.every(Number.isFinite));assert(Math.max(...heights)-Math.min(...heights)<6,'Playable slope exceeds art budget');
    reports[name].playableHeightRange=[Math.min(...heights),Math.max(...heights)];
  }
}
assert(Object.values(reports).reduce((s,r)=>s+r.bytes,0)<28*1024*1024,'GLB transfer budget: 28 MiB');
assert((await stat(new URL('../assets/blender/aether-assets.blend',import.meta.url))).size>0);
const sources=JSON.parse(await readFile(new URL('../dist/assets/textures/sources.json',import.meta.url),'utf8'));
assert.equal(sources.files.length,9);
let textureBytes=0;
for(const source of sources.files){
  assert.equal(source.license,'CC0');
  const bytes=await readFile(new URL('../dist/assets/textures/'+source.file,import.meta.url));
  assert.equal(bytes.readUInt16BE(0),0xffd8,'Texture must be a local JPEG');textureBytes+=bytes.length;
}
assert(textureBytes+Object.values(reports).reduce((s,r)=>s+r.bytes,0)<34*1024*1024,'Initial artwork budget: 34 MiB');
reports.textures={files:9,bytes:textureBytes};
console.log(JSON.stringify(reports,null,2));
