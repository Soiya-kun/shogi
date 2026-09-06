export const STAGES={
 samurai:{id:'samurai',title:'風渡る草原',description:'40部隊、392人。丘陵に布陣する両軍。',eyebrow:'THE WINDWARD MEADOW',width:108},
 yankee:{id:'yankee',title:'黒金一番街',description:'40人の抗争。雨上がりの繁華街。',eyebrow:'KUROGANE NIGHT DISTRICT',width:27},
};
export let stage=STAGES.samurai;
export let stageChosen=false;
try{const id=localStorage.getItem('aether-stage');if(STAGES[id]){stage=STAGES[id];stageChosen=true;}}catch{}
export function setStage(id){stage=STAGES[id]??STAGES.samurai;stageChosen=true;try{localStorage.setItem('aether-stage',stage.id);}catch{}}
export const STREET_NAMES={P:'短ランの若手',L:'長ランの突撃役',N:'旧車のバイク乗り',S:'武闘派',G:'副総長',B:'切れ者の幹部',R:'特攻隊長',K:'総長'};
