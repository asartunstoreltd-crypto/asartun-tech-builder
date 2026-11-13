// MISSION 01 content. Every mission uses this same shape (see MissionEngine).
// stages: teach → show → practice → challenge → quiz → reward
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })

export const cassavaMission = {
  id: 'cassava',
  no: 1,
  title: { ha: 'ROGO', en: 'ROGO (CASSAVA)' },
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Future Entrepreneur'] },

  // TEACH: pages shown one at a time. line.k = label key from the dictionary.
  teach: [
    { emoji: '🧑🏾‍🔧', title: { ha: 'Sannu, ƙaramin mai ƙirƙira! 👋', en: 'Hello, young inventor! 👋' }, lines: [{ text: { ha: 'Wani manomi ya girbe rogo da yawa.', en: 'A farmer harvested lots of cassava.' } }, { text: { ha: 'Yana son ya san abubuwan da za a iya samarwa daga rogon. Za ka iya taimaka masa?', en: 'He wants to know what can be made from it. Can you help him?' } }] },
    { emoji: '🌍', title: { ha: 'Abu na asali da sabon abu', en: 'Resource and new product' }, lines: [
      { text: { ha: 'Abu na asali yana fitowa daga yanayi. Misali: rogo, ruwa.', en: 'A resource comes from nature. Example: cassava, water.' } },
      { text: { ha: 'Sabon abu ana yin shi daga abu na asali. Misali: garri daga rogo.', en: 'A new product is made from a resource. Example: garri from cassava.' } },
      { text: { ha: 'Abu na asali → Sarrafawa → Sabon abu → Amfani', en: 'Resource → Processing → New product → Value' } }] },
    { emoji: '🌱', title: { ha: 'Rogo', en: 'Cassava' }, lines: [
      { k: 'whatIs', text: { ha: 'Rogo tushe ne da ke girma a gona.', en: 'Cassava is a root that grows in the field.' } },
      { k: 'whatDoes', text: { ha: 'Ana ci bayan an sarrafa shi.', en: 'We eat it after it is processed.' } },
      { k: 'whyNeeded', text: { ha: 'Mu sarrafa shi don kada ya lalace kuma ya zama mai amfani.', en: 'We process it so it does not spoil and becomes useful.' } }] },
    { emoji: '⚠️', warn: true, title: { ha: 'Tsaro', en: 'Safety' }, lines: [
      { text: { ha: 'Rogo danye zai iya zama guba idan ba a sarrafa shi daidai ba.', en: 'Raw cassava can be poisonous if it is not processed the right way.' } },
      { text: { ha: 'Kada ka yi da kanka. Manya masu horo ne kawai ya kamata su sarrafa shi. Wannan wasa ne kawai.', en: 'Never try it yourself. Only trained adults should process it. This is a game only.' } }] },
    { emoji: '🥣', title: { ha: 'Garri', en: 'Garri' }, lines: [
      { k: 'whatIs', text: { ha: 'Busasshen hatsi ƙanana daga rogo.', en: 'Dry tiny grains made from cassava.' } },
      { k: 'whatDoes', text: { ha: 'Ana jiƙa shi da ruwa a sha, ko a yi eba.', en: 'Soak it in water to drink, or make eba.' } },
      { k: 'whyNeeded', text: { ha: 'Yana daɗewa idan an ajiye shi a busasshe.', en: 'It lasts long when kept dry.' } }] },
    { emoji: '🍲', title: { ha: 'Fufu', en: 'Fufu' }, lines: [
      { k: 'whatIs', text: { ha: 'Taliya mai laushi daga rogo da ya yi tsami.', en: 'Soft dough from soured cassava.' } },
      { k: 'whatDoes', text: { ha: 'Ana ci da miya.', en: 'We eat it with soup.' } },
      { k: 'whyNeeded', text: { ha: 'Tsami yana sauya ɗanɗano kuma yana sa shi laushi.', en: 'Souring changes the taste and makes it soft.' } }] },
    { emoji: '🌾', title: { ha: 'Garin rogo', en: 'Cassava flour' }, lines: [
      { k: 'whatIs', text: { ha: 'Farin gari mai laushi daga busasshen rogo.', en: 'Soft white powder from dried cassava.' } },
      { k: 'whatDoes', text: { ha: 'Ana yin burodi ko kunun da shi.', en: 'Used for baking and porridge.' } },
      { k: 'whyNeeded', text: { ha: 'Gari ya fi sauƙin ɗauka da ajiya fiye da rogo danye.', en: 'Flour is easier to carry and store than fresh roots.' } }] },
    { emoji: '🥛', title: { ha: 'Sitaci', en: 'Starch' }, lines: [
      { k: 'whatIs', text: { ha: 'Farin gari da ake raba daga ruwan rogo.', en: 'White powder separated from cassava water.' } },
      { k: 'whatDoes', text: { ha: 'Ana dafa abinci, wanki, da yin manna da shi.', en: 'Used for cooking, laundry and glue.' } },
      { k: 'whyNeeded', text: { ha: 'Sitaci yana zama a ƙasan ruwa, don haka ana iya raba shi.', en: 'Starch sinks in water, so it can be separated.' } }] },
    { emoji: '💰', title: { ha: 'Sarrafawa yana ƙara ƙima', en: 'Processing adds value' }, lines: [
      { text: { ha: 'Rogo danye yana da arha kuma yana lalacewa da sauri.', en: 'Raw cassava is cheap and spoils quickly.' } },
      { text: { ha: 'Garri, fufu, gari da sitaci suna da ƙima fiye, kuma ana iya sayar da su.', en: 'Garri, fufu, flour and starch are worth more and can be sold.' } },
      { text: { ha: 'Kowanne yana da hanyarsa ta sarrafawa. Za ka kalle su duka.', en: 'Each one has its own way of being made. You will watch them all.' } }] },
  ],

  // SHOW + PRACTICE: one separate pathway per product (they are NOT the same).
  steps: {
    peel: S('🔪', 'Feɗe', 'Peel', 'Manya suna cire bawon rogo.', 'Adults remove the cassava skin.'),
    wash: S('🚿', 'Wanke', 'Wash', 'Ana wanke rogon da ruwa mai tsabta.', 'The cassava is washed with clean water.'),
    grate: S('⚙️', 'Markaɗa', 'Grate', 'Ana markaɗa rogon ya zama gauraye mai danshi.', 'The cassava is grated into a wet pulp.'),
    pressFerment: S('🪨', 'Matse, a bar ya yi tsami', 'Press and sour', 'Ana matse ruwan, a bar gaurayen ya yi tsami na kwanaki.', 'The water is pressed out and the pulp sours for days.'),
    sieve: S('🧺', 'Tace', 'Sieve', 'Ana tace shi don ya yi laushi daidai.', 'It is sieved so the grains are even.'),
    roast: S('🔥', 'Soya a kaskon', 'Roast in a pan', 'Manya suna soya shi a kaskon har ya bushe.', 'Adults roast it in a pan until dry.'),
    coolPack: S('📦', 'Sanyaya a ƙunshe', 'Cool and pack', 'Ana barin shi ya huce, sai a saka a jaka.', 'It cools down, then goes into a bag.'),
    soak: S('💧', 'Jiƙa a bar ya yi tsami', 'Soak and sour', 'Ana jiƙa rogo a ruwa har ya yi tsami da laushi.', 'The cassava soaks in water until soft and sour.'),
    mash: S('🥄', 'Dake a tace', 'Mash and sieve', 'Ana dake shi a tace, a cire zaruruwa.', 'It is mashed and sieved to remove fibres.'),
    drain: S('🫗', 'Zubar da ruwan', 'Pour off the water', 'Ana zubar da ruwan a bar gaurayen.', 'The water is poured off and the pulp stays.'),
    cook: S('🍲', 'Dafa ya yi laushi', 'Cook until soft', 'Manya suna dafa shi har ya zama taliya mai laushi.', 'Adults cook it until it becomes soft dough.'),
    chip: S('✂️', 'Yanka ƙananan guda', 'Cut small pieces', 'Ana yanka rogo ƙanana don ya bushe da sauri.', 'Cassava is cut small so it dries fast.'),
    dry: S('☀️', 'Busar da shi sosai', 'Dry it well', 'Ana busar da shi sosai a rana ko da na’ura.', 'It is dried well in the sun or by a machine.'),
    mill: S('🏭', 'Niƙa ya zama gari', 'Grind to powder', 'Ana niƙa busasshen rogo ya zama gari.', 'The dry cassava is ground into flour.'),
    pack: S('📦', 'Ƙunshe', 'Pack', 'Ana saka shi a jaka mai tsabta.', 'It goes into a clean bag.'),
    rinse: S('🌊', 'Wanke gaurayen a tace', 'Rinse pulp through a sieve', 'Ana wanke gaurayen ta cikin tace. Ruwan fari yana ɗauke da sitaci.', 'The pulp is rinsed through a sieve. The white water carries starch.'),
    settle: S('⏳', 'A bar sitaci ya zauna', 'Let the starch settle', 'Ana barin ruwan, sitaci kuma yana zama a ƙasa.', 'The water rests and the starch sinks to the bottom.'),
  },
  procedures: [
    { id: 'garri', emoji: '🥣', name: { ha: 'Garri', en: 'Garri' }, steps: ['peel', 'wash', 'grate', 'pressFerment', 'sieve', 'roast', 'coolPack'], result: { emoji: '🥣', name: { ha: 'Garri', en: 'Garri' } },
      summary: { ha: 'Garri yana buƙatar tsami da soyawa.', en: 'Garri needs souring and roasting.' } },
    { id: 'fufu', emoji: '🍲', name: { ha: 'Fufu', en: 'Fufu' }, steps: ['peel', 'wash', 'soak', 'mash', 'drain', 'cook'], result: { emoji: '🍲', name: { ha: 'Fufu', en: 'Fufu' } },
      summary: { ha: 'Fufu yana buƙatar jiƙa da dafawa. Ba a soya shi.', en: 'Fufu needs soaking and cooking. It is not roasted.' } },
    { id: 'flour', emoji: '🌾', name: { ha: 'Garin rogo', en: 'Cassava flour' }, steps: ['peel', 'wash', 'chip', 'dry', 'mill', 'sieve', 'pack'], result: { emoji: '🌾', name: { ha: 'Garin rogo', en: 'Cassava flour' } },
      summary: { ha: 'Garin rogo yana buƙatar bushewa da niƙa.', en: 'Cassava flour needs drying and grinding.' } },
    { id: 'starch', emoji: '🥛', name: { ha: 'Sitaci', en: 'Starch' }, steps: ['peel', 'wash', 'grate', 'rinse', 'settle', 'dry', 'pack'], result: { emoji: '🥛', name: { ha: 'Sitaci', en: 'Starch' } },
      summary: { ha: 'Sitaci yana buƙatar wanki da barin ya zauna a ƙasa.', en: 'Starch needs rinsing and settling.' } },
  ],

  // CHALLENGE: only after teaching and practice. type → component in MissionEngine.
  challenges: [
    { type: 'sort', key: 'sort', items: [
      { emoji: '🌱', kind: 'resource', name: { ha: 'Rogo a gona', en: 'Cassava in the field' }, why: { ha: 'Rogo yana girma a gona. Abu na asali ne.', en: 'Cassava grows in the field. It is a resource.' } },
      { emoji: '🥣', kind: 'product', name: { ha: 'Garri', en: 'Garri' }, why: { ha: 'Ana yin garri daga rogo. Sabon abu ne.', en: 'Garri is made from cassava. It is a new product.' } },
      { emoji: '💧', kind: 'resource', name: { ha: 'Ruwa', en: 'Water' }, why: { ha: 'Ruwa yana fitowa daga yanayi. Abu na asali ne.', en: 'Water comes from nature. It is a resource.' } },
      { emoji: '🥛', kind: 'product', name: { ha: 'Sitaci', en: 'Starch' }, why: { ha: 'Ana raba sitaci daga rogo. Sabon abu ne.', en: 'Starch is separated from cassava. It is a new product.' } }] },
    { type: 'business', key: 'business' },
  ],

  // TEST: only about what was taught. e = explanation shown on a wrong answer.
  quiz: [
    { q: { ha: 'Menene sarrafawa ke yi wa rogo?', en: 'What does processing do to cassava?' },
      a: [{ ha: 'Yana mai da shi sabon abu mai amfani', en: 'Turns it into a useful new product' }, { ha: 'Yana sa ya ɓace', en: 'Makes it disappear' }, { ha: 'Yana sa shi ya zama guba', en: 'Makes it poisonous' }], c: 0,
      e: { ha: 'Sarrafawa yana mai da rogo sabon abu, kamar garri.', en: 'Processing turns cassava into a new product, like garri.' } },
    { q: { ha: 'Me ya sa ba a cin rogo danye?', en: 'Why do we not eat raw cassava?' },
      a: [{ ha: 'Ya yi sanyi sosai', en: 'It is too cold' }, { ha: 'Zai iya zama guba', en: 'It can be poisonous' }, { ha: 'Ba shi da ɗanɗano', en: 'It has no taste' }], c: 1,
      e: { ha: 'Rogo danye zai iya zama guba. Shi ya sa manya masu horo ne ke sarrafa shi.', en: 'Raw cassava can be poisonous. That is why trained adults process it.' } },
    { q: { ha: 'Wane ne ake soyawa a kaskon?', en: 'Which one is roasted in a pan?' },
      a: [{ ha: 'Garri', en: 'Garri' }, { ha: 'Fufu', en: 'Fufu' }, { ha: 'Sitaci', en: 'Starch' }], c: 0,
      e: { ha: 'Ana soya garri. Fufu ana dafa shi, sitaci kuma ana barin shi ya zauna a ƙasa.', en: 'Garri is roasted. Fufu is cooked, and starch is left to settle.' } },
    { q: { ha: 'Wane ne ake busarwa a niƙa ya zama gari?', en: 'Which one is dried and ground into powder?' },
      a: [{ ha: 'Fufu', en: 'Fufu' }, { ha: 'Garin rogo', en: 'Cassava flour' }, { ha: 'Garri', en: 'Garri' }], c: 1,
      e: { ha: 'Ana busar da rogo sosai, sai a niƙa shi ya zama garin rogo.', en: 'Cassava is dried well, then ground into cassava flour.' } },
    { q: { ha: 'Wane ne farin gari da ke zama a ƙasan ruwa?', en: 'Which white powder sinks in water?' },
      a: [{ ha: 'Garri', en: 'Garri' }, { ha: 'Fufu', en: 'Fufu' }, { ha: 'Sitaci', en: 'Starch' }], c: 2,
      e: { ha: 'Sitaci yana zama a ƙasan ruwa, shi ya sa ake iya raba shi.', en: 'Starch sinks in water, so it can be separated.' } },
    { q: { ha: 'Wa ya kamata ya sarrafa rogo a zahiri?', en: 'Who should really process cassava?' },
      a: [{ ha: 'Manya masu horo', en: 'Trained adults' }, { ha: 'Yaro shi kaɗai', en: 'A child alone' }, { ha: 'Babu kowa', en: 'Nobody' }], c: 0,
      e: { ha: 'Manya masu horo ne kawai ya kamata su yi, domin tsaro.', en: 'Only trained adults should do it, for safety.' } },
    { q: { ha: 'Yaya ake samun riba?', en: 'How do we find profit?' },
      a: [{ ha: 'Farashin sayarwa + kuɗin da aka kashe', en: 'Selling price + money spent' }, { ha: 'Farashin sayarwa − kuɗin da aka kashe', en: 'Selling price − money spent' }, { ha: 'Kuɗin ƙunshewa kaɗai', en: 'Packaging cost only' }], c: 1,
      e: { ha: 'Riba = farashin sayarwa − jimillar kuɗin da aka kashe.', en: 'Profit = selling price − total money spent.' } },
  ],
}
