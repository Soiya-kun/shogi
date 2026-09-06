// Keep the artist's standalone assets independent of the shared army export.
export async function updateAshigaru(army,loader){
  const models=await Promise.all(['detail','lod'].map(name=>loader.loadAsync(`./assets/ashigaru/${name}.glb`)));
  for(const [i,name] of ['Unit_P','LOD_P'].entries()){
    const old=army.getObjectByName(name),root=models[i].scene.getObjectByName(name);
    if(!old||!root)throw new Error(`Ashigaru template missing: ${name}`);
    const promotion=[];old.traverse(o=>{if(o.name.endsWith('_Promotion'))promotion.push(o.clone(true));});
    root.removeFromParent();root.scale.multiplyScalar(.8);
    const parent=old.parent;old.removeFromParent();parent.add(root);
    // Existing promotion ornament is already in game coordinates.
    for(const ornament of promotion){ornament.scale.multiplyScalar(1/.8);ornament.position.multiplyScalar(1/.8);root.add(ornament);}
  }
  army.updateMatrixWorld(true);
}
