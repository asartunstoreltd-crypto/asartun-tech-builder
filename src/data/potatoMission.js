// MISSION 02 — same engine shape as cassavaMission.js
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })

export const potatoMission = {
  id: 'potato',
  no: 2,
  title: { ha: 'DANKALIN TURAWA', en: 'POTATOES' },
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Potato Master'] },

  teach: [
    { emoji: '🧑🏾‍🌾', title: { ha: 'Sannu, ƙaramin mai ƙirƙira! 👋', en: 'Hello, young inventor! 👋' }, lines: [
      { text: { ha: 'Wata mata mai gona ta girbe dankalin turawa da yawa. Wasu suna fara lalacewa.', en: 'A woman farmer harvested lots of potatoes. Some are starting to spoil.' } },
      { text: { ha: 'Tana son ta san abin da za a iya yi da shi. Za ka iya taimaka mata?', en: 'She wants to know what can be made from them. Can you help her?' } }] },
    { emoji: '🌍', title: { ha: 'Ka tuna: abu na asali da sabon abu', en: 'Remember: resource and new product' }, lines: [
      { text: { ha: 'Dankali abu na asali ne. Yana fitowa daga ƙasa.', en: 'A potato is a resource. It comes from the soil.' } },
      { text: { ha: 'Sabon abu ana yin shi daga abu na asali, kamar chips daga dankali.', en: 'A new product is made from a resource, like chips from potatoes.' } },
      { text: { ha: 'Abu na asali → Sarrafawa → Sabon abu → Amfani', en: 'Resource → Processing → New product → Value' } }] },
    { emoji: '🥔', title: { ha: 'Dankalin turawa', en: 'Potato' }, lines: [
      { k: 'whatIs', text: { ha: 'Tushe ne da ke girma a ƙarƙashin ƙasa. Yana cike da sitaci.', en: 'A root that grows under the soil. It is full of starch.' } },
      { k: 'whatDoes', text: { ha: 'Ana ci bayan an dafa shi.', en: 'We eat it after it is cooked.' } },
      { k: 'whyNeeded', text: { ha: 'Yana lalacewa idan an ajiye shi da daɗewa. Sarrafawa yana taimakawa.', en: 'It spoils when kept too long. Processing helps.' } }] },
    { emoji: '⚠️', warn: true, title: { ha: 'Tsaro', en: 'Safety' }, lines: [
      { text: { ha: 'Kada a ci dankalin da ya yi kore ko ya fito da tsiro. Yana iya sa rashin lafiya.', en: 'Never eat potatoes that are green or have sprouts. They can make you ill.' } },
      { text: { ha: 'Mai mai zafi da wuta suna da haɗari. Manya ne kawai ke soya da dafawa. Wannan wasa ne kawai.', en: 'Hot oil and fire are dangerous. Only adults fry and boil. This is a game only.' } }] },
    { emoji: '🍟', title: { ha: 'Chips', en: 'Chips' }, lines: [
      { k: 'whatIs', text: { ha: 'Dogayen guntun dankali masu kauri da aka soya.', en: 'Thick sticks of potato that are fried.' } },
      { k: 'whatDoes', text: { ha: 'Ana ci da abinci ko da miya.', en: 'We eat them with a meal or a sauce.' } },
      { k: 'whyNeeded', text: { ha: 'Soyawa yana ba su ɗanɗano, kuma ana iya sayar da su.', en: 'Frying gives them taste, and they can be sold.' } }] },
    { emoji: '🍘', title: { ha: 'Crisps', en: 'Crisps' }, lines: [
      { k: 'whatIs', text: { ha: 'Siraran yankan dankali da aka soya har suka yi ƙwaƙƙwafa.', en: 'Very thin potato slices fried until crunchy.' } },
      { k: 'whatDoes', text: { ha: 'Ana ci a matsayin abun ciye-ciye.', en: 'Eaten as a snack.' } },
      { k: 'whyNeeded', text: { ha: 'Ana saka musu gishiri don ɗanɗano.', en: 'Salt is added for taste.' } }] },
    { emoji: '🌾', title: { ha: 'Garin dankali', en: 'Potato flour' }, lines: [
      { k: 'whatIs', text: { ha: 'Gari mai laushi daga busasshen dankali.', en: 'Soft powder from dried potato.' } },
      { k: 'whatDoes', text: { ha: 'Ana amfani da shi a burodi da miya mai kauri.', en: 'Used in baking and to thicken soups.' } },
      { k: 'whyNeeded', text: { ha: 'Gari yana daɗewa, ba ya lalacewa da sauri.', en: 'Flour lasts long and does not spoil quickly.' } }] },
    { emoji: '🥄', title: { ha: 'Dakakken dankali', en: 'Mashed potato' }, lines: [
      { k: 'whatIs', text: { ha: 'Dankalin da aka dafa aka dake shi ya yi laushi.', en: 'Potato that is boiled and mashed until smooth.' } },
      { k: 'whatDoes', text: { ha: 'Ana ci da nama ko kifi.', en: 'Eaten with meat or fish.' } },
      { k: 'whyNeeded', text: { ha: 'Hanya ce mai sauƙi ta amfani da dankali kafin ya lalace.', en: 'An easy way to use potatoes before they spoil.' } }] },
    { emoji: '💰', title: { ha: 'Sarrafawa yana ƙara ƙima', en: 'Processing adds value' }, lines: [
      { text: { ha: 'Dankali danye yana da arha kuma yana lalacewa.', en: 'Raw potato is cheap and spoils.' } },
      { text: { ha: 'Chips, crisps, gari da dakakken dankali suna kawo kuɗi.', en: 'Chips, crisps, flour and mashed potato can earn money.' } },
      { text: { ha: 'Kowanne yana da hanyarsa ta musamman. Za ka kalle su duka.', en: 'Each has its own special way. You will watch them all.' } }] },
  ],

  steps: {
    wash: S('🚿', 'Wanke', 'Wash', 'Ana wanke dankali don cire ƙasa.', 'Potatoes are washed to remove soil.'),
    peel: S('🔪', 'Feɗe', 'Peel', 'Manya suna cire bawon dankali.', 'Adults remove the potato skin.'),
    cutSticks: S('🍟', 'Yanka dogayen guda', 'Cut into sticks', 'Ana yanka dankali dogayen guda masu kauri.', 'Potatoes are cut into thick sticks.'),
    slice: S('🥔', 'Yanka siriri-siriri', 'Slice very thin', 'Ana yanka dankali siriri sosai.', 'Potatoes are sliced very thin.'),
    rinse: S('💧', 'Wanke sitaci', 'Rinse off starch', 'Ana wanke yankan a ruwa don cire sitaci mai yawa.', 'The pieces are rinsed to remove extra starch.'),
    pat: S('🧻', 'Shanye ruwa', 'Pat dry', 'Ana shanye ruwa daga yankan don mai kada ya yi tsalle.', 'The pieces are patted dry so hot oil does not splash.'),
    fry: S('🔥', 'Soya a mai', 'Fry in oil', 'Manya suna soya su a mai mai zafi har su yi launin zinariya.', 'Adults fry them in hot oil until golden.'),
    season: S('🧂', 'Saka gishiri', 'Add salt', 'Ana saka ɗan gishiri don ɗanɗano.', 'A little salt is added for taste.'),
    pack: S('📦', 'Ƙunshe', 'Pack', 'Ana saka su a jaka mai tsabta.', 'They go into a clean bag.'),
    dry: S('☀️', 'Busar da shi sosai', 'Dry it well', 'Ana busar da yankan sosai a rana ko da na’ura.', 'The slices are dried well in the sun or by a machine.'),
    mill: S('🏭', 'Niƙa', 'Grind', 'Ana niƙa busasshen dankali ya zama gari.', 'The dry potato is ground into flour.'),
    sieve: S('🧺', 'Tace', 'Sieve', 'Ana tace garin don ya yi laushi.', 'The flour is sieved to make it smooth.'),
    boil: S('♨️', 'Dafa', 'Boil', 'Manya suna dafa dankali a ruwa har ya yi laushi.', 'Adults boil the potatoes in water until soft.'),
    mash: S('🥄', 'Dake', 'Mash', 'Ana dake dankalin har ya yi laushi.', 'The potatoes are mashed until smooth.'),
    serve: S('🍽️', 'Zuba a faranti', 'Serve', 'Ana zuba shi a faranti a ci.', 'It is served on a plate to eat.'),
  },
  procedures: [
    { id: 'chips', emoji: '🍟', name: { ha: 'Chips', en: 'Chips' }, steps: ['wash', 'peel', 'cutSticks', 'rinse', 'pat', 'fry', 'pack'], result: { emoji: '🍟', name: { ha: 'Chips', en: 'Chips' } },
      summary: { ha: 'Chips: dogayen guda masu kauri, ana soya su (manya).', en: 'Chips: thick sticks, fried by adults.' } },
    { id: 'crisps', emoji: '🍘', name: { ha: 'Crisps', en: 'Crisps' }, steps: ['wash', 'peel', 'slice', 'rinse', 'pat', 'fry', 'season', 'pack'], result: { emoji: '🍘', name: { ha: 'Crisps', en: 'Crisps' } },
      summary: { ha: 'Crisps: siraran yanka, ana soya su, sa’an nan a saka gishiri.', en: 'Crisps: very thin slices, fried, then salted.' } },
    { id: 'flour', emoji: '🌾', name: { ha: 'Garin dankali', en: 'Potato flour' }, steps: ['wash', 'peel', 'slice', 'dry', 'mill', 'sieve', 'pack'], result: { emoji: '🌾', name: { ha: 'Garin dankali', en: 'Potato flour' } },
      summary: { ha: 'Garin dankali: ana busarwa a niƙa. Ba a soya shi.', en: 'Potato flour: dried and ground. It is not fried.' } },
    { id: 'mash', emoji: '🥄', name: { ha: 'Dakakken dankali', en: 'Mashed potato' }, steps: ['wash', 'peel', 'boil', 'mash', 'serve'], result: { emoji: '🥄', name: { ha: 'Dakakken dankali', en: 'Mashed potato' } },
      summary: { ha: 'Dakakken dankali: ana dafawa a dake. Ba a soya shi.', en: 'Mashed potato: boiled and mashed. It is not fried.' } },
  ],

  challenges: [
    { type: 'sort', key: 'sort', items: [
      { emoji: '🥔', kind: 'resource', name: { ha: 'Dankali a gona', en: 'Potato in the field' }, why: { ha: 'Dankali yana girma a ƙasa. Abu na asali ne.', en: 'Potatoes grow in the soil. It is a resource.' } },
      { emoji: '🍟', kind: 'product', name: { ha: 'Chips', en: 'Chips' }, why: { ha: 'Ana yin chips daga dankali. Sabon abu ne.', en: 'Chips are made from potatoes. They are a new product.' } },
      { emoji: '💧', kind: 'resource', name: { ha: 'Ruwa', en: 'Water' }, why: { ha: 'Ruwa yana fitowa daga yanayi. Abu na asali ne.', en: 'Water comes from nature. It is a resource.' } },
      { emoji: '🍘', kind: 'product', name: { ha: 'Crisps', en: 'Crisps' }, why: { ha: 'Ana yin crisps daga siraran dankali. Sabon abu ne.', en: 'Crisps are made from thin potato slices. They are a new product.' } }] },
    { type: 'business', key: 'business' },
  ],

  quiz: [
    { q: { ha: 'Me ya sa ba a cin dankalin da ya yi kore ko ya fito da tsiro?', en: 'Why do we not eat green or sprouting potatoes?' },
      a: [{ ha: 'Yana iya sa rashin lafiya', en: 'It can make us ill' }, { ha: 'Yana da daɗi sosai', en: 'It is very tasty' }, { ha: 'Yana da tsada', en: 'It is expensive' }], c: 0,
      e: { ha: 'Dankali kore ko mai tsiro yana iya sa rashin lafiya. Ka jefar da shi.', en: 'Green or sprouting potatoes can make you ill. Throw them away.' } },
    { q: { ha: 'Wane ne ake yankawa siriri sosai, a soya, a saka gishiri?', en: 'Which one is sliced very thin, fried and salted?' },
      a: [{ ha: 'Dakakken dankali', en: 'Mashed potato' }, { ha: 'Crisps', en: 'Crisps' }, { ha: 'Garin dankali', en: 'Potato flour' }], c: 1,
      e: { ha: 'Crisps siraran yanka ne da ake soyawa a saka musu gishiri.', en: 'Crisps are thin slices that are fried and then salted.' } },
    { q: { ha: 'Wane ne ake busarwa a niƙa ya zama gari?', en: 'Which one is dried and ground into powder?' },
      a: [{ ha: 'Garin dankali', en: 'Potato flour' }, { ha: 'Chips', en: 'Chips' }, { ha: 'Dakakken dankali', en: 'Mashed potato' }], c: 0,
      e: { ha: 'Ana busar da yankan dankali sosai, sai a niƙa su ya zama gari.', en: 'Potato slices are dried well, then ground into flour.' } },
    { q: { ha: 'Wane ne ake dafawa a dake, ba a soya shi ba?', en: 'Which one is boiled and mashed, not fried?' },
      a: [{ ha: 'Crisps', en: 'Crisps' }, { ha: 'Chips', en: 'Chips' }, { ha: 'Dakakken dankali', en: 'Mashed potato' }], c: 2,
      e: { ha: 'Ana dafa dankali sai a dake shi. Ba a soya shi.', en: 'The potatoes are boiled and then mashed. They are not fried.' } },
    { q: { ha: 'Wa ya kamata ya soya a mai mai zafi?', en: 'Who should fry in hot oil?' },
      a: [{ ha: 'Manya masu horo', en: 'Trained adults' }, { ha: 'Yaro shi kaɗai', en: 'A child alone' }, { ha: 'Babu kowa', en: 'Nobody' }], c: 0,
      e: { ha: 'Mai mai zafi yana ƙonewa. Manya ne kawai ya kamata su yi.', en: 'Hot oil can burn badly. Only adults should do it.' } },
    { q: { ha: 'Menene sarrafawa ke yi wa dankali?', en: 'What does processing do to potatoes?' },
      a: [{ ha: 'Yana mai da shi sabon abu mai ƙima', en: 'Turns it into a new product worth more' }, { ha: 'Yana sa ya ɓace', en: 'Makes it disappear' }, { ha: 'Babu komai', en: 'Nothing' }], c: 0,
      e: { ha: 'Sarrafawa yana mai da dankali chips, crisps ko gari da za a iya sayarwa.', en: 'Processing turns potatoes into chips, crisps or flour that can be sold.' } },
    { q: { ha: 'Yaya ake samun riba?', en: 'How do we find profit?' },
      a: [{ ha: 'Farashin sayarwa − kuɗin da aka kashe', en: 'Selling price − money spent' }, { ha: 'Farashin sayarwa + kuɗin da aka kashe', en: 'Selling price + money spent' }, { ha: 'Kuɗin ƙunshewa kaɗai', en: 'Packaging cost only' }], c: 0,
      e: { ha: 'Riba = farashin sayarwa − jimillar kuɗin da aka kashe.', en: 'Profit = selling price − total money spent.' } },
  ],
}
