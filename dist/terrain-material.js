import * as T from './three.module.js';

export async function terrainMaterial(renderer) {
  const loader=new T.TextureLoader(),sets={};
  await Promise.all(['aerial_grass_rock','brown_mud_dry','rocky_terrain_02'].map(async name=>{
    const textures=await Promise.all(['color','normal','roughness'].map(async kind=>{
      const t=await loader.loadAsync(`./assets/textures/${name}_${kind}.jpg`);
      t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      if(kind==='color')t.colorSpace=T.SRGBColorSpace;return t;
    }));sets[name]=textures;
  }));
  const [grass,normal,roughness]=sets.aerial_grass_rock;
  const mat=new T.MeshStandardMaterial({map:grass,normalMap:normal,normalScale:new T.Vector2(.65,.65),roughnessMap:roughness,roughness:1});
  const [rockMap,rockNormal,rockRough]=sets.rocky_terrain_02;
  mat.userData.rockMaterial=new T.MeshStandardMaterial({map:rockMap,normalMap:rockNormal,roughnessMap:rockRough,roughness:1});
  mat.onBeforeCompile=shader=>{
    ['dirt','rock'].forEach((prefix,i)=>sets[['brown_mud_dry','rocky_terrain_02'][i]].forEach((texture,j)=>shader.uniforms[prefix+['Color','Normal','Rough'][j]]={value:texture}));
    shader.vertexShader='varying vec3 vLand;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLand=position;');
    shader.fragmentShader=`varying vec3 vLand;
      uniform sampler2D dirtColor; uniform sampler2D dirtNormal; uniform sampler2D dirtRough;
      uniform sampler2D rockColor; uniform sampler2D rockNormal; uniform sampler2D rockRough;
      float landNoise(vec2 p){return sin(p.x*.93+sin(p.y*.62))*cos(p.y*.83-p.x*.27)+.5*sin(p.x*1.91+p.y*1.28);}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      float path=-11.0+8.0*sin(vLand.z*.032)+3.0*sin(vLand.z*.071);
      float dirt=1.0-smoothstep(1.8,4.5,abs(vLand.x-path)+landNoise(vLand.xz*.6)*.5);
      dirt=max(dirt,smoothstep(.65,1.25,landNoise(vLand.xz*.11))*.65);
      float rock=smoothstep(9.0,20.0,vLand.y)*smoothstep(-.3,.9,landNoise(vLand.xz*.08));
      vec4 grassA=texture2D(map,vMapUv);
      vec4 grassB=texture2D(map,mat2(.8,-.6,.6,.8)*vMapUv*.43+vec2(4.6,9.1));
      grassA.rgb=mix(grassA.rgb,grassB.rgb,.28)*vec3(.83,.99,.86);
      grassA.rgb*=.92+.08*landNoise(vLand.xz*.045);
      vec4 soil=mix(grassA,texture2D(dirtColor,vMapUv*.8),dirt);
      soil=mix(soil,texture2D(rockColor,vMapUv*.65),rock);
      diffuseColor*=soil;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
      float surfaceRough=mix(texture2D(roughnessMap,vRoughnessMapUv).g,texture2D(dirtRough,vRoughnessMapUv*.8).g,dirt);
      float roughnessFactor=roughness*mix(surfaceRough,texture2D(rockRough,vRoughnessMapUv*.65).g,rock);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      vec3 mapN=mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(dirtNormal,vNormalMapUv*.8).xyz,dirt);
      mapN=mix(mapN,texture2D(rockNormal,vNormalMapUv*.65).xyz,rock)*2.0-1.0;
      mapN.xy*=normalScale;
      normal=normalize(tbn*mapN);
    `);
  };
  mat.customProgramCacheKey=()=> 'landscape-v1';return mat;
}
