// Analyse par Claude Code (session du 25/10/2026) : IWDominate (ONE Esports), sendo, udyon et Drollsnow (note.com), règles v1.2, instructions v2.
// Passages copiés tels quels depuis le texte réellement consulté (coach/cache/text, non republié).
const u = (content, lang, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-${n}`,
  context: { queue: "solo", rank: "non précisé", region: "non précisé" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "non-precise", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang, passage })),
});
const IWD = "c-oneesports-iwd-dragon", GK = "c-note-sendo-gank", GV = "c-note-sendo-give", MP = "c-note-sendo-midpush", UD = "c-note-udyon-macro", DS = "c-note-drollsnow-side";
const sendo = { levelContext: "maitre", context: { queue: "solo", rank: "maître (meilleur rang de l'auteur)", region: "JP" } };

export const units = [
  // ---------- IWDominate, analyse d'un match de LCS (compétition, 2021)
  u(IWD, "en", 1, {
    claim: "Selon IWDominate (ancien joueur de LCS, analyse d'un match pro) : avant un combat au dragon, le jungler et le support doivent arriver ensemble, pour retirer la vision adverse et créer des poches de vision à leur avantage.",
    roles: ["jungle", "support"], themes: ["vision", "macro", "synergie"], published: "2021-03-11", levelContext: "pro",
    context: { queue: "competition", rank: "pro (LCS)", region: "NA" },
    limits: ["Tiré d'un match de compétition : à transposer avec prudence en solo queue."],
    evidence: [["Analyse de TSM contre Dignitas", "[They] work together not only to deny vision but also create vision pockets so that, going into these dragon fights, they have massive advantages."], ["Analyse de TSM contre Dignitas", "With the dragon a minute away from respawning, Jungler Mingyi"]],
    use: { when: "Environ une minute avant l'apparition du dragon.", why: "En retirant la vision adverse et en créant leurs propres zones de vision, ils abordent le combat avec un gros avantage.", who: "Jungler et support (exemple tiré d'un match de LCS).", how: ["Jungler : termine ta tournée pour être prêt avant l'apparition du dragon.", "Va placer la vision avec ton support plutôt que chacun de son côté.", "Retirez ensemble les wards adverses autour de la fosse."], notWhen: "" },
  }),
  u(IWD, "en", 2, {
    claim: "Selon IWDominate (analyse d'un match pro) : quand ton équipe contrôle la rivière avant le dragon, combats l'adversaire au passage étroit qu'il doit emprunter, surtout s'il arrive sans Flash.",
    roles: ["all"], themes: ["teamfight", "macro"], published: "2021-03-11", levelContext: "pro",
    context: { queue: "competition", rank: "pro (LCS)", region: "NA" },
    limits: ["Tiré d'un match de compétition : à transposer avec prudence en solo queue."],
    evidence: [["Analyse de TSM contre Dignitas", "Dom points out that Dignitas should not be able to go through the small pathway, and would actually have to push through the mid lane and use the wider line brush to contest the dragon."], ["Analyse de TSM contre Dignitas", "The streamer also highlighted that Dignitas had four Flash-less players entering the chokepoint"]],
    use: { when: "Avant le dragon, ton équipe contrôle la rivière et l'adversaire doit passer par un chemin étroit pour contester.", why: "Au passage étroit, l'adversaire est regroupé et vulnérable, plus encore sans Flash.", who: "Toute l'équipe (exemple tiré d'un match de LCS).", how: ["Tiens la rivière avec la vision.", "Attends l'adversaire au passage étroit.", "Engage dès qu'il s'y engouffre, surtout si plusieurs adversaires n'ont pas Flash."], notWhen: "" },
  }),

  // ---------- sendo : éviter les ganks en début de partie (support, maître, patch 13.18)
  u(GK, "ja", 1, {
    ...sendo,
    claim: "Selon sendo (support, maître) : retiens les moments habituels des premiers ganks : vers 2 min après un seul camp, entre 2 min 30 et 2 min 50 après trois camps, vers 3 min 15 après une tournée complète, et vers 4 min 30 après une tournée et un retour à la base.",
    roles: ["all"], themes: ["survie", "jungle", "vision"], published: "2023-09-16", metaDependent: true, dependsOn: ["system:camps-de-jungle"],
    patch: { known: true, value: "13.18" },
    limits: ["Horaires du patch 13.18 : la vitesse des tournées a changé depuis.", "Selon l'auteur, plus le niveau monte, plus les junglers décalent leurs ganks pour éviter ces moments attendus."],
    evidence: [["「序盤の」ガンクの基礎知識", "１キャンプガンク：2分前後"], ["「序盤の」ガンクの基礎知識", "フルクリアガンク：3分15秒前後"], ["「序盤の」ガンクの基礎知識", "フルクリア→リコール後にガンク：4分30秒前後"]],
    use: { when: "Les cinq premières minutes de la partie, en lane.", why: "Le jungler doit tuer des camps pour monter de niveau, donc ses premiers ganks arrivent à des moments assez prévisibles.", who: "Tous les laners, et le support qui place la vision.", how: ["Devine le chemin du jungler adverse (buff rouge ou bleu au départ).", "Place ta ward juste avant ces moments-là.", "Joue plus prudemment autour de ces horaires."], notWhen: "" },
  }),
  u(GK, "ja", 2, {
    ...sendo,
    claim: "Selon sendo (support, maître) : avant de placer une ward, regarde l'état de ta vague maintenant et dans les secondes qui viennent, et où se trouve le jungler adverse. S'il gank le top, une ward posée au bot devant le dragon gaspille 30 secondes à 1 minute de vision.",
    roles: ["support", "bottom", "all"], themes: ["vision", "vagues"], published: "2023-09-16",
    evidence: [["敵ジャングラーのガンクルート予測", "①自分たちはいまプッシュウェーブなのか、プルウェーブなのか"], ["敵ジャングラーのガンクルート予測", "③敵ジャングルはいまどこにいるのか"], ["敵ジャングラーのガンクルート予測", "そうなると、いまワードを置いてしまうと 30秒～１分近く視界情報を無駄にしてしまう のです。"]],
    use: { when: "Phase de lane, au moment de placer une ward.", why: "Une ward a une durée limitée : posée trop tôt, elle ne voit plus rien quand le jungler arrive.", who: "Supports surtout, et tous les laners.", how: ["Regarde si ta vague pousse ou recule, et ce qu'elle fera ensuite.", "Regarde sur la carte où le jungler adverse a été vu pour la dernière fois.", "S'il est de l'autre côté, garde ta ward pour plus tard."], notWhen: "" },
  }),
  u(GK, "ja", 3, {
    ...sendo,
    claim: "Selon sendo (support, maître) : au bot, quand ta vague est tirée vers ta tourelle ou à l'équilibre, une ward proche suffit. Quand elle pousse, ward plus loin pour voir le jungler tôt, et ping ton ADC pour qu'il recule pendant que tu pars poser la ward.",
    roles: ["support", "bottom"], themes: ["vision", "vagues", "survie"], published: "2023-09-16",
    evidence: [["②オーソドックスなガンクレーン", "プルウェーブ/イーブンウェーブの場合はタワーにすぐ逃げ込めるためそこまで奥にワーディングをする必要がありません。"], ["②オーソドックスなガンクレーン", "プッシュウェーブの際は逃げるのに時間が掛かるため 敵を早期発見することが重要 です。"], ["②オーソドックスなガンクレーン", "その際ワードを置くときは 必ずADCにBackPINGを出す ようにしてください。"]],
    use: { when: "Phase de lane au bot, au moment de placer la vision contre un gank.", why: "Vague tirée : la tourelle est proche, inutile d'aller loin. Vague qui pousse : la fuite est longue, il faut voir le jungler plus tôt.", who: "Support (et ADC qui doit reculer).", how: ["Vague tirée ou à l'équilibre : ward proche, sans quitter ton ADC.", "Vague qui pousse : va warder plus loin sur le chemin du jungler.", "Avant de partir, ping ton ADC pour qu'il recule."], notWhen: "Vague tirée ou à l'équilibre : aller warder loin fait mourir ton ADC ou lui fait perdre des sbires, selon l'auteur." },
  }),
  u(GK, "ja", 4, {
    ...sendo,
    claim: "Selon sendo (support, maître) : contre un jungler qui saute par-dessus les murs (il cite Jarvan IV, Lee Sin, Rek'Sai, Nidalee, Kayn), évite d'assiéger la tourelle adverse si tu n'as pas de ward devant son buff bleu : il peut contourner et arriver par derrière.",
    roles: ["support", "bottom"], themes: ["vision", "survie", "vagues"], published: "2023-09-16", metaDependent: true,
    evidence: [["③ブリンクを持ったジャングラーのガンクレーン", "上記のガンクルートはブリンクを持った敵のジャングルルートです。敵がJ4・リーシン・レクサイ・ニダリー・ケインなどの場合です。"], ["③ブリンクを持ったジャングラーのガンクレーン", "ブリンクが強力なジャングラーの場合、 前提として最強ワードが置けていない場合はタワーシージを控えたほうがよい でしょう。"]],
    use: { when: "Ta vague est poussée jusqu'à la tourelle adverse et le jungler adverse a un saut ou un déplacement à travers les murs.", why: "Ces junglers savent contourner pour ganker par derrière.", who: "Duo du bot face à un jungler avec un saut (Jarvan IV, Lee Sin, Rek'Sai, Nidalee, Kayn selon l'auteur).", how: ["Avant d'assiéger, place une ward devant le buff bleu adverse.", "Sans cette ward, ne reste pas sous la tourelle adverse.", "Si tu veux vraiment assiéger, place au moins une ward sur le chemin de contournement."], notWhen: "" },
  }),

  // ---------- sendo : laisser un objectif (patch 14.15)
  u(GV, "ja", 1, {
    ...sendo,
    claim: "Selon sendo (support, maître) : quand ton équipe décide de laisser le dragon, pousse le mid en te décalant vers le haut de la carte. Inutile de warder côté bot : l'adversaire y est regroupé et peut te piéger.",
    roles: ["all"], themes: ["macro", "vision", "vagues"], published: "2024-08-07",
    evidence: [["パターン①　ミッドプッシュ", "その場合は ポジションを上に寄せながらMIDプッシュ をしましょう。もし1stタワーが折れていないのであれば、取れる可能性があります。"], ["パターン①　ミッドプッシュ", "その際、BOT側にワードは必要ありません。"]],
    use: { when: "Ton équipe a décidé de ne pas contester le dragon (adversaire plus fort, déjà en place, ou combat perdu d'avance).", why: "L'adversaire est regroupé au dragon : aller warder côté bot, c'est risquer de se faire attraper.", who: "Toute l'équipe.", how: ["Pousse la vague du mid.", "Décale-toi vers le haut de la carte.", "Si la première tourelle du mid adverse est debout, tente de la prendre."], notWhen: "Si l'objectif peut être pris ou disputé : l'auteur insiste pour ne pas abandonner un objectif jouable." },
  }),
  u(GV, "ja", 2, {
    ...sendo,
    claim: "Selon sendo (support, maître) : si l'adversaire met du monde au dragon, prends l'objectif de l'autre côté (Baron ou Héraut) : il y a peu de vision adverse à ce moment-là.",
    roles: ["all"], themes: ["macro"], published: "2024-08-07", metaDependent: true,
    evidence: [["パターン②　バロン/ヘラルドへのアクション", "敵がBOTに人数をかけているのなら、こっちは 反対側のオブジェクトを取る。"], ["パターン②　バロン/ヘラルドへのアクション", "敵は下にいるし、ドラゴンの準備をしていたために上サイドにはワードが少ないハズです。"]],
    use: { when: "L'adversaire se regroupe au dragon et ton équipe ne le conteste pas.", why: "L'adversaire a préparé la vision du côté du dragon : le haut de la carte est peu surveillé.", who: "Toute l'équipe.", how: ["Va vers l'objectif du haut de la carte.", "Prends-le, ou retourne-toi pour combattre si l'adversaire vient."], notWhen: "" },
  }),
  u(GV, "ja", 3, {
    ...sendo,
    claim: "Selon sendo (support, maître) : quand ton équipe laisse un objectif, va prendre la vision du côté opposé de la carte. C'est l'avantage que le support peut gagner en échange.",
    roles: ["support"], themes: ["vision", "macro"], published: "2024-08-07",
    evidence: [["パターン③　逆サイドの視界を確保", "どんな時でもサポートは 逆サイドの視界を取りに行きましょう。"], ["パターン③　逆サイドの視界を確保", "こちらが失った１つのオブジェクトの代わりに、視界という有利を取れるのがサポートです。"]],
    use: { when: "Ton équipe vient de décider de laisser un objectif à l'adversaire.", why: "Même sans tourelle ni objectif à prendre, la vision du côté opposé est un avantage facile à obtenir.", who: "Support.", how: ["Quitte la zone de l'objectif laissé.", "Va placer tes wards de l'autre côté de la carte.", "Si c'est impossible, prépare la vision contre les ganks qui suivront l'objectif."], notWhen: "" },
  }),
  u(GV, "ja", 4, {
    ...sendo,
    claim: "Selon sendo (support, maître) : si aller voir le dragon te met à 2 contre 4 sans renfort possible, n'y va pas, même pas pour le warder.",
    roles: ["all"], themes: ["survie", "macro"], published: "2024-08-07",
    evidence: [["応用編", "→ドラゴンを見に行っても 2 vs 4の状況、味方も寄れない状況なら見に行くのやめて下さい。"], ["応用編", "ドラゴンにワードすら要りません。"]],
    use: { when: "Plusieurs adversaires ont disparu de la carte près du dragon, et tes alliés ne peuvent pas te rejoindre.", why: "À 2 contre 4, aller voir le dragon ne rapporte rien et te fait mourir.", who: "Tous les postes, en particulier le duo du bot.", how: ["Compte les adversaires invisibles près du dragon.", "Si tu serais en infériorité sans renfort, ne t'approche pas.", "Prépare plutôt la vision contre les ganks d'après-dragon ou tire ta vague."], notWhen: "" },
  }),

  // ---------- sendo : pousser le mid avant un objectif (patch 14.9)
  u(MP, "ja", 1, {
    ...sendo,
    claim: "Selon sendo (support, maître) : pousse le mid avant un objectif. Tes sbires te donnent la vision du côté adverse, et si l'adversaire va nettoyer la vague, tu as quelques secondes en surnombre pour attraper un joueur mal placé.",
    roles: ["all"], themes: ["macro", "vagues", "vision"], published: "2024-05-02",
    evidence: [["①【大前提】敵側の視界が取れる", "MIDをプッシュすることで味方のミニオンが敵陣まで押せるため、 敵陣の情報を一方的に得ること ができます。"], ["②敵がMIDプッシュの対応に行くと一時的に人数差を作り出せるためキャッチが狙える", "敵がMIDのミニオン処理に向かっている際、 一時的に人数差が生まれます。キャッチをするならこの場面。"]],
    use: { when: "Avant un dragon ou un Baron, quand ton équipe peut pousser le mid.", why: "La vague te donne des informations, et l'adversaire qui va la nettoyer laisse ses alliés en infériorité.", who: "Toute l'équipe, en premier le mid et le jungler.", how: ["Pousse la vague du mid jusque chez l'adversaire.", "Regarde ce que voient tes sbires.", "Si un adversaire part nettoyer la vague, profites-en pour attraper un joueur mal placé."], notWhen: "" },
  }),
  u(MP, "ja", 2, {
    ...sendo,
    claim: "Selon sendo (support, maître) : la priorité au mid te donne les entrées de la rivière. C'est le chemin le plus large pour commencer le dragon ou le Baron, et il permet d'esquiver plus facilement les sorts de zone.",
    roles: ["all"], themes: ["macro", "teamfight"], published: "2024-05-02",
    evidence: [["④リバーの入り口という有利なポジションを取ることができる", "MIDをプッシュするとMIDの主導権を取ることができ、リバーの入り口を独占することができます。"], ["④リバーの入り口という有利なポジションを取ることができる", "このルートは他のどのルートよりも広くポジションを取ることが出来るため、ファイトが起こった際に敵のAOEスキルを避けやすかったり比較的自由なスペースを使うことができます。"]],
    use: { when: "Avant un objectif, surtout si l'adversaire a pris position le premier près de la fosse.", why: "L'entrée de la rivière par le mid laisse plus de place pour se positionner en combat.", who: "Toute l'équipe.", how: ["Pousse le mid pour en prendre la priorité.", "Entre dans la rivière par ce côté.", "Garde de l'espace pour esquiver les sorts de zone adverses."], notWhen: "" },
  }),
  u(MP, "ja", 3, {
    ...sendo,
    claim: "Selon sendo (support, maître) : pousser le mid avant un objectif est une assurance. Si tu perds le combat, tu ne perds que le dragon ou le Baron, et pas la tourelle du mid en plus.",
    roles: ["all"], themes: ["macro", "vagues"], published: "2024-05-02",
    evidence: [["⑥オブジェクトファイトで負けてしまった場合の保険になる", "オブジェクトファイトに負ける→ドラゴン(バロン)が取られる→そのままMIDプッシュされてタワーも取られる"], ["⑥オブジェクトファイトで負けてしまった場合の保険になる", "もし、MIDをプッシュできていれば最悪ドラゴン(バロン)を渡すだけで済むことになるでしょう。"]],
    use: { when: "Avant un combat autour d'un objectif.", why: "Sans vague poussée, l'adversaire qui gagne le combat enchaîne avec la tourelle du mid.", who: "Toute l'équipe.", how: ["Pousse le mid avant de te rendre à l'objectif.", "En cas de défaite, l'adversaire n'a pas de vague pour prendre ta tourelle."], notWhen: "" },
  }),
  u(MP, "ja", 4, {
    ...sendo,
    claim: "Selon sendo (support, maître) : si l'adversaire ne répond pas à ta poussée du mid parce qu'il est déjà installé sur l'objectif, et que tu perdrais le combat (composition, or ou niveaux), continue de pousser pour prendre la tourelle. Assiège-la en te tenant du côté opposé à l'adversaire.",
    roles: ["all"], themes: ["macro", "vagues"], published: "2024-05-02",
    evidence: [["⑤相手のタワーにプレッシャーをかけられる", "戦っても負けるようなチーム構成・金額差・レベル差の場合はそのままMIDプッシュを継続することで敵のタワーを破壊することができます。"], ["⑤相手のタワーにプレッシャーをかけられる", "※敵タワーを破壊する際は、敵がいるであろう場所とは逆側に身体を寄せながらシージしましょう。"]],
    use: { when: "Tu pousses le mid, personne ne vient nettoyer la vague, et l'adversaire a déjà pris position sur l'objectif.", why: "L'adversaire a fait de l'objectif sa priorité : la zone autour est dangereuse, mais sa tourelle est libre.", who: "Toute l'équipe.", how: ["Continue de pousser la vague du mid.", "Assiège la tourelle en te tenant du côté opposé à l'objectif.", "N'entre pas dans la zone de l'objectif."], notWhen: "Si ta composition, ton or et tes niveaux te permettent de gagner le combat : ce conseil vaut quand le combat serait perdu." },
  }),

  // ---------- udyon : top après la phase de lane (meilleur rang maître, Urgot)
  u(UD, "ja", 1, {
    levelContext: "maitre", context: { queue: "solo", rank: "diamant 2 (Master au mieux)", region: "JP" },
    claim: "Selon udyon (top, Master au mieux) : après avoir pris la première tourelle du top, pousse ta vague lentement à l'attaque de base jusqu'à la deuxième tourelle adverse. Ton adversaire ne peut plus prendre la vague et perd de l'expérience, ou doit partir roam.",
    roles: ["top"], themes: ["vagues", "macro"], published: "2026-02-15",
    evidence: [["・レーン勝利時の立ち位置", "基本的な動きとしてはミニオンを敵セカンドタワーに押し付ける。"], ["・レーン勝利時の立ち位置", "ここではスキルを使わずにＡＡ（オートアタック）で基本ミニオンを食べてゆっくり押しましょう。なぜなら相手がウェーブを食べれない+相手はやることがなく経験値ロスト及びロームするしかなくなるからです。"]],
    use: { when: "Tu as gagné ta lane au top et détruit la première tourelle adverse.", why: "L'adversaire ne peut plus farmer sa vague : il perd de l'expérience ou doit quitter la lane.", who: "Top laner qui a gagné sa lane.", how: ["Tue les sbires à l'attaque de base, sans tes compétences.", "Laisse la vague avancer lentement jusqu'à la deuxième tourelle.", "Reste prêt à fuir si le jungler ou le support adverse vient."], notWhen: "" },
  }),
  u(UD, "ja", 2, {
    levelContext: "maitre", context: { queue: "solo", rank: "diamant 2 (Master au mieux)", region: "JP" },
    claim: "Selon udyon (top, Master au mieux) : quand le dragon apparaît dans 1 minute à 30 secondes, quitte ta pression sur la tourelle et rejoins le dragon.",
    roles: ["top"], themes: ["macro"], published: "2026-02-15",
    evidence: [["・レーン勝利時の立ち位置", "この動きをドラゴンが始まる１分～３０秒まで繰り返す。"], ["・レーン勝利時の立ち位置", "ドラゴンまでの時間が１分～３０秒になったらドラゴンに寄るようにする。"]],
    use: { when: "Tu mets la pression sur la deuxième tourelle du top et le dragon apparaît dans 1 minute à 30 secondes.", why: "Ta pression au top a attiré l'adversaire : le côté du dragon est moins surveillé, et il faut y être à temps.", who: "Top laner.", how: ["Surveille le minuteur du dragon.", "Entre 1 minute et 30 secondes avant, quitte la lane.", "Rejoins ton équipe autour du dragon."], notWhen: "" },
  }),
  u(UD, "ja", 3, {
    levelContext: "maitre", context: { queue: "solo", rank: "diamant 2 (Master au mieux)", region: "JP" },
    claim: "Selon udyon (top, Master au mieux) : après la phase de lane, la répartition habituelle est la suivante : le duo du bot va au mid, le mid au top, et le top au bot, grâce à sa Téléportation et à sa résistance. Pousse les lanes où il n'y a personne plutôt que d'attendre tous au mid.",
    roles: ["all"], themes: ["macro", "vagues"], published: "2026-02-15", metaDependent: true, dependsOn: ["system:Téléportation"],
    evidence: [["❷レーンスワップタイミング", "基本的にはMIDレーナーはTOPが側、TOPレーナーはBOT側に行くのがセオリーだ。なぜTOPレーナーはBOTに行くかは単純にテレポートと体が硬いからだ。"], ["❷レーンスワップタイミング", "BOT２人はMIDレーン、MIDはTOPレーン、TOPはBOTレーンに行く構図となる。"]],
    use: { when: "Entre 15 et 20 minutes, quand les premières tourelles tombent et que la phase de lane se termine.", why: "Le duo du bot au mid peut voir le dragon et le Baron ; le top, résistant et avec sa Téléportation, tient la lane du bot.", who: "Toute l'équipe.", how: ["Duo du bot : va au mid.", "Mid : va au top ; top : va au bot.", "Pousse la lane où personne ne te fait face au lieu d'attendre au mid."], notWhen: "Avant d'avoir terminé ta quête de rôle, selon l'auteur (règle de sa saison)." },
  }),
  u(UD, "ja", 4, {
    levelContext: "maitre", context: { queue: "solo", rank: "diamant 2 (Master au mieux)", region: "JP" },
    claim: "Selon udyon (top, Master au mieux) : en lane de côté, ne dépasse la rivière vers le camp adverse que si ton équipe a l'avantage, si les adversaires sont visibles sur la carte, ou si une ward te montre que la zone est vide. Sinon, tu risques de mourir et de faire perdre un objectif.",
    roles: ["top", "all"], themes: ["survie", "macro", "vision"], published: "2026-02-15",
    evidence: [["❸ＴＯＰレーンからＢＯＴレーンスワップ後の動き", "これは防衛ラインだ。このラインよりも相手陣地に行くのは"], ["❸ＴＯＰレーンからＢＯＴレーンスワップ後の動き", "上記のような条件がないときに森に行くのは無謀であり、死ぬリスクが非常に高くなる。"]],
    use: { when: "Milieu de partie, tu pousses une lane de côté seul.", why: "Mourir en lane de côté peut coûter un dragon ou un Baron à ton équipe.", who: "Joueurs qui poussent une lane de côté, surtout le top.", how: ["Vérifie si ton équipe a l'avantage.", "Regarde si les adversaires sont visibles sur la carte, ou si une ward montre que la zone est vide.", "Sans aucune de ces conditions, reste de ton côté de la rivière."], notWhen: "" },
  }),
  // ---------- Drollsnow : pousser une lane de côté
  u(DS, "ja", 1, {
    claim: "Selon Drollsnow : en split push, la règle de base est de partir avant de mourir. L'idéal est d'obliger l'adversaire à envoyer du monde contre toi tout en restant en vie.",
    roles: ["top", "all"], themes: ["macro", "survie"], published: "2025-08-02", context: { queue: "solo", rank: "non précisé", region: "JP" },
    evidence: [["①サイドレーンに出るなら死ぬな", "スプリットプッシュの基本は死ぬ前に退くこと。"], ["①サイドレーンに出るなら死ぬな", "もちろん浮いた味方を倒す為に敵はリソースを消費するんだけど、ここで出来るだけリソースを使わせて、なおかつ自分は生存しているのが一番理想形。"]],
    use: { when: "Milieu et fin de partie, tu pousses seul une lane de côté.", why: "Mourir en lane de côté fait perdre la tourelle, les camps et parfois d'autres objectifs.", who: "Joueurs qui split push.", how: ["Pousse ta lane en surveillant la carte.", "Dès que plusieurs adversaires disparaissent ou viennent vers toi, recule.", "Oblige-les à venir à plusieurs, puis échappe-toi."], notWhen: "" },
  }),
  u(DS, "ja", 2, {
    claim: "Selon Drollsnow : ne split push pas sans Téléportation à l'opposé de l'objectif que ton équipe veut prendre. Si un combat éclate sans toi, il se joue à 4 contre 4, et la défaite coûte l'objectif et quatre kills, contre une seule tourelle de ton côté.",
    roles: ["top", "all"], themes: ["macro", "teamfight"], published: "2025-08-02", context: { queue: "solo", rank: "non précisé", region: "JP" }, metaDependent: true, dependsOn: ["system:Téléportation"],
    evidence: [["③スプリットするならオブジェクト意識を持て", "TPを持たずに欲しいオブジェクトとは逆サイドに走ってデスします"], ["③スプリットするならオブジェクト意識を持て", "仮にオブジェクトファイトが起きても味方は寄ってこないので、4vs4になるので有利どころか下手をすると不利を背負って集団戦で負けます。"]],
    use: { when: "Un dragon ou un Baron approche et tu hésites à partir pousser une lane de côté.", why: "Sans toi, ton équipe perd son avantage numérique au moment du combat.", who: "Joueurs qui split push, en particulier le top.", how: ["Regarde quel objectif ton équipe veut prendre.", "Sans Téléportation, ne pars pas à l'opposé de cet objectif.", "Rejoins ton équipe avant le combat."], notWhen: "" },
  }),
];
