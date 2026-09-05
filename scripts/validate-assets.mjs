import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {GLTFLoader} from '../dist/vendor/loaders/GLTFLoader.js';
import {terrainSampler,cellXZ} from '../dist/terrain.mjs';
import {Box3} from 'three';
import {formation,SQUADS} from '../dist/formations.mjs';

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
  const required=name==='army'?['P','L','N','S','G','B','R','K','A','H'].flatMap(t=>['Unit_'+t,'LOD_'+t]):['Terrain'];
  for(const n of required)assert(data.nodes.some(o=>o.name===n),`Missing ${n}`);
  const triangles=data.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+data.accessors[p.indices].count/3,0);
  reports[name]={bytes:bytes.length,triangles,meshes:data.meshes.length};
  if(name==='army'){
    const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
    gltf.scene.updateMatrixWorld(true);
    for(const prefix of ['Unit_','LOD_']){
      for(const role of ['P','L','N','S','G','B','R','K','A','H']){
        const unit=gltf.scene.getObjectByName(prefix+role);assert.equal(unit.userData.style,'sengoku_fantasy');
        const parts=role==='B'?['Eboshi','Kariginu','RitualStaff']:['P','L','A'].includes(role)?['Jingasa']:['Kabuto','Maedate'];
        if(['P','L'].includes(role))parts.push('Yari','Sashimono');
        if(role==='K')parts.push('Gunbai','Jinbaori');
        for(const part of parts){let found=false;unit.traverse(o=>{if(o.isMesh&&o.name.endsWith('_'+part))found=true;});assert(found,`Samurai missing ${prefix}${role}/${part}`);}
      }
      const heavy=gltf.scene.getObjectByName(prefix+'H');assert.equal(heavy.userData.armor,'o_yoroi');
      for(const part of ['Do','Kabuto','Maedate','Menpo','SodeL','SodeR','Tachi','Promotion']){
        let found=false;heavy.traverse(o=>{if(o.name.endsWith('_'+part))found=true;});assert(found,`Heavy knight missing ${prefix}${part}`);
      }
      const heavyBounds=new Box3().setFromObject(heavy),infantryBounds=new Box3().setFromObject(gltf.scene.getObjectByName(prefix+'P'));
      assert(heavyBounds.max.x-heavyBounds.min.x>(infantryBounds.max.x-infantryBounds.min.x)*1.4,'Heavy armor must have a broader silhouette than infantry');
      assert((heavyBounds.max.y-heavyBounds.min.y)*1.25>2.1,'Heavy knights must retain their large silhouette in LOD');
      const commander=gltf.scene.getObjectByName(prefix+'N');assert.equal(commander.userData.mount,'horse');
      const archer=gltf.scene.getObjectByName(prefix+'A');assert.equal(archer.userData.weapon,'bow');
      for(const part of ['Bow','Bowstring','Quiver','Arrows','Promotion']){
        let found=false;archer.traverse(o=>{if(o.name.endsWith('_'+part))found=true;});assert(found,`Archer missing ${prefix}${part}`);
      }
      // Mixed squads must resolve each member's model and fit with its equipment.
      for(const type of Object.keys(SQUADS))for(const compact of [false,true])for(const m of formation(type,compact)){
        const model=gltf.scene.getObjectByName(prefix+m.type);assert(model,`Missing squad member ${prefix}${m.type}`);
        const bounds=new Box3().setFromObject(model);
        for(const x of [bounds.min.x,bounds.max.x])assert(Math.abs(m.x+x*1.25)<6,`${type}/${m.type} equipment exceeds cell width`);
        for(const z of [bounds.min.z,bounds.max.z])assert(Math.abs(m.z+z*1.25)<6,`${type}/${m.type} equipment exceeds cell depth`);
      }
      const root=gltf.scene.getObjectByName(prefix+'R');assert.equal(root.userData.mount,'dragon');
      for(const part of ['WingL','WingR','Tail','ForelegL','ForelegR','HindlegL','HindlegR','Promotion']){
        let found=false;root.traverse(o=>{if(o.name.endsWith('_'+part))found=true;});assert(found,`Dragon missing ${part}`);
      }
      const bounds=new Box3().setFromObject(root);
      assert((bounds.max.y-bounds.min.y)*1.25>3,'Mounted rider silhouette must exceed 3m');
      assert((bounds.max.z-bounds.min.z)*1.25>4,'Dragon must retain its head and tail in LOD');
      for(const compact of [false,true])for(const m of formation('R',compact)){
        for(const x of [bounds.min.x,bounds.max.x])assert(Math.abs(m.x+x*1.25)<6,'Dragon wings exceed cell');
        for(const z of [bounds.min.z,bounds.max.z])assert(Math.abs(m.z+z*1.25)<6,'Dragon tail exceeds cell');
      }
    }
  }
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
