// Yankee presentation copy. Conditions and event identities remain shared.
const orders={attack:['オラ、気合入れろ。攻めるぞ！','Get fired up. We are going on the attack!'],defend:['おう、守り固めるぞ。','Yeah. Tighten up our defense.'],counter:['上等だ。やり返す機を待つぞ。','Bring it on. We will wait for our chance.'],auto:['任せとけ。流れは俺が読む。','Leave it to me. I will read the game.']};
export function presentEvent(e,theme='samurai'){
  if(theme!=='yankee')return e;
  const copy=YANKEE[e.id]??{kanji:e.kanji,english:e.english,ja:'',subtitle:''};
  const result={...e,...copy,theme,detail:copy.kanji,voiceKey:`yankee.${e.voiceKey??e.id}`,marker:e.id===17?'気':'✦'};
  if(e.id>=1&&e.id<=5){result.formationName=e.kanji;result.detail=`${copy.kanji} · ${e.kanji}`;}
  if(e.id===97){const order=e.voiceKey?.split('.')[1];if(orders[order]){[result.ja,result.subtitle]=orders[order];}}
  if(e.id===96&&e.voice===false){result.kanji='次は任せた';result.detail=result.kanji;result.ja='次の番から、おめえに任せる。';result.subtitle='Your next turn is yours to call.';}
  if(e.resultSubtitle)result.resultSubtitle=YANKEE[60].kanji;
  return result;
}
export const YANKEE = {
  "1": {
    "kanji": "正面突破",
    "ja": "正面から行く。それでいい。",
    "english": "HEAD ON",
    "subtitle": "Straight through the front. That is how we do it."
  },
  "2": {
    "kanji": "横から行くぜ",
    "ja": "そっちばかり見てんなよ。",
    "english": "FROM THE SIDE",
    "subtitle": "Quit staring straight ahead."
  },
  "3": {
    "kanji": "ど真ん中",
    "ja": "真ん中、通らせてもらうぜ。",
    "english": "STRAIGHT THROUGH",
    "subtitle": "Make way. We are coming down the middle."
  },
  "4": {
    "kanji": "総長親衛隊",
    "ja": "総長、後ろは任せてくれ。",
    "english": "BOSS GUARD",
    "subtitle": "Boss, we have your back."
  },
  "5": {
    "kanji": "鉄壁の構え",
    "ja": "ここで腰を据えるぞ。",
    "english": "HOLDING GROUND",
    "subtitle": "Settle in. We are holding here."
  },
  "6": {
    "kanji": "喧嘩上等",
    "ja": "オラ、気合入れろ！ 押し込むぞ！",
    "english": "BRING IT ON",
    "subtitle": "Get fired up! Push them back!"
  },
  "7": {
    "kanji": "引かねえ",
    "ja": "ここは踏ん張りどころだ。",
    "english": "NO BACKING DOWN",
    "subtitle": "Dig your heels in. We hold here."
  },
  "8": {
    "kanji": "やり返すぜ",
    "ja": "売られた喧嘩だ。買ってやる！",
    "english": "PAYBACK",
    "subtitle": "They picked this fight. We will take it!"
  },
  "9": {
    "kanji": "二択だ",
    "ja": "どっちを助ける？",
    "english": "PICK ONE",
    "subtitle": "Which one are you saving?"
  },
  "10": {
    "kanji": "王手飛車",
    "ja": "総長も隊長も、目を離すなよ。",
    "english": "ROYAL FORK",
    "subtitle": "Keep an eye on your boss and your captain."
  },
  "11": {
    "kanji": "両王手",
    "ja": "両側から行くぜ！",
    "english": "DOUBLE CHECK",
    "subtitle": "We are coming from both sides!"
  },
  "12": {
    "kanji": "後ろにもいるぜ",
    "ja": "後ろがお留守だぜ。ナメんなよ。",
    "english": "WATCH YOUR BACK",
    "subtitle": "You left your back wide open."
  },
  "14": {
    "kanji": "動けねえだろ",
    "ja": "そこ、離れていいのか？",
    "english": "PINNED",
    "subtitle": "Sure you can leave that spot?"
  },
  "16": {
    "kanji": "若手の意地",
    "ja": "若手だからって、なめんなよ！",
    "english": "ROOKIE PRIDE",
    "subtitle": "Do not write off our rookies!"
  },
  "17": {
    "kanji": "本気",
    "ja": "こっから本気だ。ナメんなよ！",
    "english": "SERIOUS BUSINESS",
    "subtitle": "No more messing around. Don't underestimate us!"
  },
  "18": {
    "kanji": "助太刀",
    "ja": "待たせたな。俺も行くぜ。",
    "english": "BACKUP",
    "subtitle": "Kept you waiting. I'm in."
  },
  "19": {
    "kanji": "王手",
    "ja": "オラ、総長。出てこいや！",
    "english": "CHECK",
    "subtitle": "Hey, boss! Get out here!"
  },
  "21": {
    "kanji": "通さねえ",
    "ja": "総長の前に、俺がいる。",
    "english": "HOLD THE LINE",
    "subtitle": "You go through me first."
  },
  "23": {
    "kanji": "加勢",
    "ja": "一人で背負うな。",
    "english": "COVER",
    "subtitle": "You don't have to do this alone."
  },
  "24": {
    "kanji": "お返しだ",
    "ja": "上等だ。次はてめえだ！",
    "english": "COUNTERCHECK",
    "subtitle": "Bring it on. You're next!"
  },
  "29": {
    "kanji": "詰み",
    "ja": "もう終いだ。ケジメつけな。",
    "english": "CHECKMATE",
    "subtitle": "It's over. Take the loss."
  },
  "30": {
    "kanji": "決着",
    "ja": "今夜は、俺たちの勝ちだ。",
    "english": "VICTORY",
    "subtitle": "Tonight belongs to us."
  },
  "46": {
    "kanji": "下剋上",
    "ja": "うちの若えの、ナメてんじゃねえぞ！",
    "english": "UPSTART",
    "subtitle": "Do not underestimate our young blood!"
  },
  "47": {
    "kanji": "一直線",
    "ja": "オラ、そのまま突っ切れ！",
    "english": "STRAIGHT AHEAD",
    "subtitle": "Go on! Break straight through!"
  },
  "48": {
    "kanji": "飛び込み",
    "ja": "そっち、空いてるぜ！",
    "english": "DIVING IN",
    "subtitle": "There is an opening over there!"
  },
  "49": {
    "kanji": "剛腕",
    "ja": "ここは力で押し通す。",
    "english": "HEAVY HITTER",
    "subtitle": "We are forcing our way through."
  },
  "50": {
    "kanji": "総長は守る",
    "ja": "うちの総長に、手を出すな。",
    "english": "PROTECT THE BOSS",
    "subtitle": "Keep your hands off our boss."
  },
  "53": {
    "kanji": "カチコミ",
    "ja": "カチコミだ。気合入れろ！",
    "english": "RAID",
    "subtitle": "We're going in. Get fired up!"
  },
  "54": {
    "kanji": "武勇伝",
    "ja": "おめえ、いい根性してんな。",
    "english": "MAKING A NAME",
    "subtitle": "You have got some guts."
  },
  "55": {
    "kanji": "頼れる背中",
    "ja": "また助けられたな。",
    "english": "GOT YOUR BACK",
    "subtitle": "You saved us again."
  },
  "56": {
    "kanji": "おかえり",
    "ja": "戻ったか。まだ行けるな。",
    "english": "WELCOME BACK",
    "subtitle": "Back already? You still have fight in you."
  },
  "57": {
    "kanji": "落とし前",
    "ja": "さっきの分、返したぜ。",
    "english": "SCORE SETTLED",
    "subtitle": "That makes up for last time."
  },
  "58": {
    "kanji": "名乗り代わり",
    "ja": "これで顔、覚えたろ。",
    "english": "REMEMBER THE NAME",
    "subtitle": "You know that face now."
  },
  "60": {
    "kanji": "若手が決めた",
    "ja": "若手が決めた。",
    "english": "ROOKIE FINISH",
    "subtitle": "Our rookie settled it."
  },
  "62": {
    "kanji": "一番槍",
    "ja": "まずは一発、もらったぜ。",
    "english": "FIRST STRIKE",
    "subtitle": "That's the first hit."
  },
  "80": {
    "kanji": "出番だ",
    "ja": "ずっと、この時を待ってた。",
    "english": "MY TURN",
    "subtitle": "Been waiting for this moment."
  },
  "81": {
    "kanji": "最後の相棒",
    "ja": "まだ俺が残ってる。",
    "english": "LAST PARTNER",
    "subtitle": "I am still here."
  },
  "83": {
    "kanji": "守るだけじゃねえ",
    "ja": "今度は俺が出る。",
    "english": "MORE THAN A GUARD",
    "subtitle": "Now it is my turn to step up."
  },
  "84": {
    "kanji": "仲間の分だ",
    "ja": "あいつの分、返すぜ。",
    "english": "FOR OUR FRIEND",
    "subtitle": "That one was for our friend."
  },
  "85": {
    "kanji": "大物の器",
    "ja": "でかくなったな、お前。",
    "english": "BIG LEAGUE",
    "subtitle": "Look how far you have come."
  },
  "89": {
    "kanji": "若手の時代",
    "ja": "若えのが、のしてきやがった！",
    "english": "YOUNG BLOOD",
    "subtitle": "The young blood is moving up!"
  },
  "95": {
    "kanji": "夜露死苦",
    "ja": "おう、任せとけ。夜露死苦！",
    "english": "LEAVE IT TO ME",
    "subtitle": "Yeah, I've got this. Let's do it!"
  },
  "96": {
    "kanji": "任せた",
    "ja": "あとは頼んだぜ。",
    "english": "YOUR CALL",
    "subtitle": "Take it from here."
  },
  "97": {
    "kanji": "了解",
    "ja": "おう、その線で行くぞ。",
    "english": "GOT IT",
    "subtitle": "Yeah. That's how we'll play it."
  }
};
