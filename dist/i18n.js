export let language='ja';
try{if(localStorage.getItem('aether-language')==='en')language='en';}catch{}
export function setLanguage(value){language=value==='en'?'en':'ja';document.documentElement.lang=language;try{localStorage.setItem('aether-language',language);}catch{}}
const en={
 '舞台を選び直す':'Choose another stage',
 '紅の走り屋':'Red Street Crew','蒼の走り屋':'Blue Street Crew',
 '舞台':'Stage','戦国将棋':'Samurai Shogi','ヤンキー将棋':'Yankee Shogi','草原と侍の部隊戦':'Samurai squads on rolling grasslands','夜の繁華街・1マス1名':'Nightlife crossroads · One person per piece','舞台を選んで始める':'Choose your stage','舞台を変えると、新しい対局が始まります。':'Changing the stage starts a new game.','この舞台で始める':'Start on this stage','黒金一番街':'Kurogane Night District','暁の交差点':'Midnight Crossroads','40人の抗争。雨上がりの繁華街。':'40 rivals. A rain-soaked nightlife district.','1マス1名':'One person per square','短ランの若手':'Short-jacket Rookie','長ランの突撃役':'Long-coat Charger','旧車のバイク乗り':'Vintage Biker','武闘派':'Brawler','副総長':'Vice Leader','切れ者の幹部':'Strategist','特攻隊長':'Bike Captain','総長':'Gang Leader',
 '戦況':'Battle status','指揮':'Command','履歴':'History','設定':'Settings','対局メニュー':'Match menu','対局情報':'Match information','パネルを閉じる':'Close panel','閉じる':'Close',
 '先手の戦法':'Blue opening','先手の作戦':'Blue orders','後手の戦法':'Red opening','後手の作戦':'Red orders',
 '蒼穹の盤上':'Battle beneath the blue sky','風渡る草原':'The Windward Meadow','40部隊、392人。丘陵に布陣する両軍。':'40 squads, 392 soldiers. Two armies on the hills.',
 '戦場を準備しています…':'Preparing the battlefield…','全景':'Overview','部隊に寄る':'Close view','↻ 視点回転':'↻ Rotate view','俯瞰':'Top view',
 '左ドラッグで移動 · 右ドラッグで回転 · ホイールで拡大':'Left drag: pan · Right drag: rotate · Wheel: zoom','タップで選択 · 2本指で拡大':'Tap to select · Pinch to zoom',
 '先手のターン':'Blue to move','後手のターン':'Red to move','蒼の武士団':'Blue Samurai Army','紅の武士団':'Red Samurai Army',
 '部隊を選択してください':'Select a squad','部隊を選択':'Select a squad','光るマスへ移動できます':'Choose a highlighted square','王手 — 王を守ってください':'王手 — Protect your king',
 'AIへの作戦指示':'AI command','両軍を停止':'Stop both AIs','途中から任せる・手動に戻す。両軍AIで観戦もできます。':'Hand either army to AI at any time, take back control, or watch both AIs play.',
 'AIのテンポ':'AI pace','速い（約1秒）':'Fast (~1 second)','標準（約3秒）':'Normal (~3 seconds)','じっくり（約5秒）':'Slow (~5 seconds)',
 '戦闘演出':'Battle animations','効果音':'Sound effects','戦局演出の設定':'Presentation settings','演出':'Presentation','通常':'Normal','控えめ':'Subtle',
 '大将の字幕':'Commander subtitles','英語の副題':'English title captions','大将の音声':'Commander voice','音量':'Volume','大将の声は収録準備中です。台詞は字幕で表示します。':'Voice recordings are not available yet. Dialogue is shown as subtitles.',
 '解析による好手演出':'Highlight analyzed tactics','先手 · 蒼軍':'First · Blue army','後手 · 紅軍':'Second · Red army','AI開始':'Start AI','AI停止':'Stop AI',
 '戦法':'Opening','作戦':'Orders','手動で操作できます':'Manual control available','AIを再試行':'Retry AI','AIについて':'About the AI',
 '戦法は局面に応じて目指します。指示の変更は次の未確定の一手へ反映。演出中も対局は進みます。':'The AI pursues its opening when the position allows it. New orders apply to the next uncommitted move. Play continues during animations.',
 '待機部隊':'Reserves','持ち駒':'Captured pieces','戦況記録':'Move history','両軍が配置につきました。':'Both armies are in position.','この一局の見どころ':'Battle highlights',
 '部隊を選ぶ → 光るマスを選ぶ':'Select a squad → Choose a highlighted square','捕獲した部隊は味方として再投入できます。':'Deploy captured squads as reinforcements.',
 '一手戻す':'Undo','最初から':'New game','対局を最初から始めますか？':'Start a new game?','現在の対局と棋譜をリセットし、AIを停止して初期配置に戻します。':'Reset the match and move history, stop both AIs, and restore the starting position.',
 'キャンセル':'Cancel','最初から始める':'Start new game','部隊を昇格させますか？':'Promote this squad?','成ると、その駒の移動能力が変わります。':'Promotion changes this piece’s movement.','成る':'Promote','成らない':'Do not promote',
 'おまかせ':'Automatic','居飛車':'Static Rook','四間飛車':'Fourth-file Rook','中飛車':'Central Rook','攻勢':'Attack','守備':'Defend','反撃狙い':'Counterattack',
 '待機中の部隊はありません':'No reserve squads','AIが作戦を考えています':'AI is planning its move','AIを準備しています…':'Preparing AI…','AIを再試行するか、停止して手動で指せます':'Retry AI, or stop it to play manually',
 '対局は終了しました':'The game has ended','次の手番を待っています':'Waiting for its turn','この部隊は今は移動できません':'This squad cannot move now','このブラウザでは対局を保存できません':'Unable to save the game in this browser',
 '指示を反映して考えます':'Considering your orders','指示をこの局面へ戻しました':'Orders restored for this position','作戦に合わせて判断します':'Following the current orders','この局面では作戦指示を優先':'Prioritizing orders in this position','戦法の形を継続':'Continuing the opening','序盤の形を目指しています':'Developing the opening','現在の局面から移行を検討':'Considering an opening transition',
 '詰みを優先':'Prioritizing checkmate','玉の安全を優先':'Prioritizing king safety','戦法の形を優先':'Prioritizing the opening','投了':'Resignation',
 '足軽隊':'Ashigaru','長槍足軽隊':'Long-spear Ashigaru','弓足軽隊':'Archers','重装武者隊':'Armored Samurai','旗本隊':'Hatamoto','騎馬武者隊':'Mounted Samurai','龍武者隊':'Dragon Riders','陰陽師隊':'Onmyoji','本陣':'Headquarters',
 '密集隊形':'Close ranks','二列横隊':'Two ranks','騎馬武者1人＋弓足軽5人':'1 mounted captain + 5 archers','重装二列横隊':'Two armored ranks','方陣':'Square formation','騎馬隊形':'Cavalry formation','昇龍隊形':'Dragon formation','護衛陣形':'Guard formation','指揮官と護衛':'Commander and guards',
 '部隊を選択して指揮する108m四方の3D戦場':'108-metre 3D battlefield. Select a squad to command it.','視点を回転':'Rotate view','再読み込み':'Reload',
 '戦場を読み込めませんでした。WebGL対応ブラウザで再度お試しください。':'Unable to load the battlefield. Please try again in a WebGL-capable browser.',
 '端末の「動きを減らす」設定を適用しています':'Your device’s reduced-motion setting is active','着手は確定しました。表示を復元します':'Move committed. Restoring the display.',
 'AIの準備が時間内に完了しませんでした':'AI initialization timed out','AIを読み込めませんでした。再試行するか手動に切り替えてください':'Unable to load AI. Retry or switch to manual control','AIとの通信に失敗しました':'Communication with AI failed','AIの思考が時間内に完了しませんでした':'AI search timed out',
 'AIが指せる合法手がありません':'AI has no legal moves','AIの回答が現在の局面と一致しません':'The AI response does not match the current position','AIが合法でない着手を返しました':'AI returned an illegal move','AIの探索結果を比較できませんでした。再試行してください':'Unable to compare AI search results. Please retry.','現在は手動で指せません':'Manual moves are unavailable now',
 '終局 — 合法手がありません':'Game over — No legal moves','千日手 — 引き分け・指し直し':'Repetition — Draw; replay the game',
 '合法手ではありません':'This move is not legal','投了できない状態です':'Resignation is unavailable in this position','AIの宣言勝ちはこの対局では扱えません。手動に切り替えてください':'AI declaration wins are not supported. Switch to manual control.',
};
export function t(source){
 if(language==='ja')return source;
 if(en[source])return en[source];
 if(/^駒名 (ON|OFF)$/.test(source))return source.replace('駒名','Piece names');
 if(/^\d+ 手$/.test(source))return source.replace(' 手',source.startsWith('1 ')?' move':' moves');
 if(source.startsWith('思考中 · '))return 'Thinking · '+t(source.slice(6));
 if(source.startsWith('停止中：'))return 'Stopped: '+t(source.slice(4));
 if(source.startsWith('昇格 '))return 'Promoted '+t(source.slice(3));
 if(source.startsWith('部隊昇格 / '))return 'Squad promoted / '+t(source.slice(7));
 if(source.includes(' · '))return source.split(' · ').map(t).join(' · ');
 if(/^\d+(人|騎)$/.test(source))return source.replace('人',' soldiers').replace('騎',' riders');
 if(source==='成駒')return 'Promoted';
 if(source.endsWith('で判断'))return 'Following '+t(source.slice(0,-3)).toLowerCase()+' orders';
 if(/^[蒼紅]の武士団の勝利/.test(source))return (source[0]==='蒼'?'Blue':'Red')+' wins — '+(source.includes('詰み')?'詰み (Checkmate)':(source.includes('後手')?'Red':'Blue')+' AI resigned');
 if(source.includes('の反則負け — 連続王手の千日手'))return (source[0]==='蒼'?'Blue':'Red')+' loses — Repeated perpetual check';
 return source;
}
// Remember source text, so switching languages is reversible without touching game state.
const sources=new WeakMap(),attributes=new WeakMap();
export function translateUI(root=document.body){
 document.documentElement.lang=language;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode;if(node.parentElement.closest('script,style,#war-presentation,.war-command,#war-log'))continue;
  const current=node.nodeValue,old=sources.get(node),source=old&&current===old.rendered?old.source:current;
  const trimmed=source.trim(),rendered=source.replace(trimmed,t(trimmed));
  sources.set(node,{source,rendered});if(current!==rendered)node.nodeValue=rendered;
 }
 for(const node of root.querySelectorAll('[title],[aria-label]')){
  const record=attributes.get(node)??{};
  for(const key of ['title','aria-label'])if(node.hasAttribute(key)){const value=node.getAttribute(key),old=record[key],source=old&&value===old.rendered?old.source:value,rendered=t(source);record[key]={source,rendered};if(value!==rendered)node.setAttribute(key,rendered);}
  attributes.set(node,record);
 }
}
