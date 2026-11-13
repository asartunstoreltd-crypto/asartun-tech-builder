// MISSION 07 — Build a device for a home problem. Same engine shape as the other missions.
// S = step done by trained adults. K = step a child can help with (adult nearby).
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })
const K = (...a) => ({ ...S(...a), kid: true })

export const deviceMission = {
  id: 'device',
  no: 7,
  mixed: true,
  title: { ha: 'GINA NA’URA DON MATSALAR GIDA', en: 'BUILD A DEVICE FOR A HOME PROBLEM' },
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Home Inventor'] },

  teach: [
    { emoji: '🏠', title: { ha: 'Sannu, ƙaramin mai ƙirƙira! 👋', en: 'Hello, young inventor! 👋' }, lines: [
      { text: { ha: 'Iyalin Malam Ali ba su da inda za su wanke hannu kafin cin abinci. Tumatir ɗinsu kuma yana lalacewa da sauri.', en: 'Mr Ali’s family has nowhere to wash hands before eating. Their tomatoes also spoil fast.' } },
      { text: { ha: 'Za ka iya taimaka musu su gina na’urori masu sauƙi?', en: 'Can you help them build simple devices?' } }] },
    { emoji: '♻️', title: { ha: 'Tsofaffin kaya abu na asali ne', en: 'Old things are resources' }, lines: [
      { text: { ha: 'Kwalbar filastik da tukunyar yumɓu abubuwan asali ne.', en: 'A plastic bottle and a clay pot are resources.' } },
      { text: { ha: 'Idan an sarrafa su, sai su zama na’ura mai magance matsala, sabon abu mai amfani.', en: 'When we process them, they become a device that solves a problem, a useful new product.' } },
      { text: { ha: 'Abu na asali → Sarrafawa → Sabon abu → Amfani', en: 'Resource → Processing → New product → Value' } }] },
    { emoji: '📐', title: { ha: 'Yadda injiniya yake aiki', en: 'How an engineer works' }, lines: [
      { text: { ha: 'Injiniya yana magance matsala da na’ura.', en: 'An engineer solves a problem with a device.' } },
      { text: { ha: 'Matakai: Matsala → Mafita → Zane → Gini → Gwaji → Gyara.', en: 'Steps: Problem → Idea → Design → Build → Test → Improve.' } },
      { text: { ha: 'Kullum a tambayi mutane abin da suke buƙata kafin a fara.', en: 'Always ask people what they need before you start.' } }] },
    { emoji: '⚠️', warn: true, title: { ha: 'Tsaro', en: 'Safety' }, lines: [
      { text: { ha: 'Kayan aiki masu kaifi, huda da guduma na manya ne kawai.', en: 'Sharp tools, drilling and hammers are for adults only.' } },
      { text: { ha: 'Kada ka yi amfani da wuta ko wutar lantarki ta gida. Ruwan wanke hannu ba na sha ba ne. Wannan wasa ne kawai.', en: 'Do not use fire or house electricity. Hand-washing water is not for drinking. This is a game only.' } }] },
    { emoji: '🧼', title: { ha: 'Wurin wanke hannu (tippy tap)', en: 'Hand-washing station (tippy tap)' }, lines: [
      { k: 'whatIs', text: { ha: 'Kwalbar ruwa da aka rataye da igiya a kan sanda.', en: 'A water bottle hung with string on a stick frame.' } },
      { k: 'whatDoes', text: { ha: 'Idan ka taka igiya, ruwa yana zubowa ba tare da ka taɓa kwalba ba.', en: 'When you step on the string, water pours out without touching the bottle.' } },
      { k: 'whyNeeded', text: { ha: 'Wanke hannu da sabulu yana rage cututtuka.', en: 'Washing hands with soap reduces sickness.' } }] },
    { emoji: '🏺', title: { ha: 'Tukunya cikin tukunya (mai sanyaya)', en: 'Pot-in-pot cooler' }, lines: [
      { k: 'whatIs', text: { ha: 'Tukwane biyu da yashi mai ɗanshi a tsakaninsu.', en: 'Two pots with damp sand between them.' } },
      { k: 'whatDoes', text: { ha: 'Ruwan yana ƙafewa, sai cikin tukunyar ya yi sanyi.', en: 'The water evaporates and the inner pot gets cooler.' } },
      { k: 'whyNeeded', text: { ha: 'Kayan lambu suna daɗewa kafin su lalace.', en: 'Vegetables last longer before they spoil.' } }] },
    { emoji: '🌱', title: { ha: 'Kwalbar digar ruwa', en: 'Bottle drip watering' }, lines: [
      { k: 'whatIs', text: { ha: 'Kwalba mai ƙananan ramuka da ake binnewa kusa da shuka.', en: 'A bottle with tiny holes buried near a plant.' } },
      { k: 'whatDoes', text: { ha: 'Tana digar ruwa kaɗan-kaɗan zuwa tushen shuka.', en: 'It drips a little water to the plant’s roots.' } },
      { k: 'whyNeeded', text: { ha: 'Tana rage ɓarnar ruwa a lokacin rani.', en: 'It saves water in the dry season.' } }] },
    { emoji: '🔁', title: { ha: 'Gwaji da gyara', en: 'Test and improve' }, lines: [
      { text: { ha: 'Bayan gini, a gwada. Ba kowace na’ura ke aiki da kyau a farko ba.', en: 'After building, test it. Not every device works well the first time.' } },
      { text: { ha: 'A canza abu ɗaya a lokaci guda, sannan a sake gwadawa.', en: 'Change one thing at a time, then test again.' } },
      { text: { ha: 'Kuskure yana koya mana.', en: 'Mistakes teach us.' } }] },
    { emoji: '💰', title: { ha: 'Na’ura mai amfani tana da ƙima', en: 'A useful device has value' }, lines: [
      { text: { ha: 'Na’urar da ke magance matsalar gida za a iya sayarwa ko gyarawa.', en: 'A device that solves a home problem can be sold or repaired.' } },
      { text: { ha: 'Matasa masu ƙirƙira suna iya gina na’urori ga maƙwabta su samu kuɗi.', en: 'Young inventors can build devices for neighbours and earn money.' } },
      { text: { ha: 'Kowanne yana da hanyarsa. Za ka kalle su duka.', en: 'Each one has its own way of being made. You will watch them all.' } }] },
  ],

  steps: {
    askFamily: K('🗣️', 'A tambayi iyali', 'Ask the family', 'A tambayi iyali game da matsalar da suke fuskanta a gida.', 'Ask the family about a problem they face at home.'),
    pickIdea: K('💡', 'A zaɓi mafita', 'Choose an idea', 'A tattauna mafita da dama, a zaɓi mafi sauƙi da aminci.', 'Discuss several ideas and choose the simplest, safest one.'),
    drawPlan: K('✏️', 'A zana shirin', 'Draw the plan', 'A zana na’urar da sassanta.', 'Draw the device and its parts.'),
    buildIt: K('🛠️', 'A gina na’urar', 'Build it', 'A gina na’urar daga sassan da aka tattara, tare da babba.', 'Build the device from the collected parts, with an adult.'),
    observe: K('🔍', 'A duba abin da ya faru', 'Observe what happened', 'A duba ko na’urar ta magance matsalar.', 'Check whether the device solved the problem.'),
    changeOne: K('🔁', 'A canza abu ɗaya', 'Change one thing', 'A canza abu ɗaya kawai a lokaci guda.', 'Change only one thing at a time.'),
    testAgain: K('✅', 'A sake gwadawa', 'Test again', 'A sake gwadawa a ga ko ya fi kyau.', 'Test again to see if it is better.'),
    collectBottle: K('🧴', 'A tattara kwalba', 'Collect a bottle', 'A nemo kwalbar filastik mai tsabta.', 'Find a clean plastic bottle.'),
    makeHole: S('🔨', 'A huda', 'Make the hole', 'Babba yana huda ƙaramin rami da kayan aiki mai kaifi.', 'An adult makes a small hole with a sharp tool.'),
    hangFrame: K('🪢', 'A rataye a kan sanda', 'Hang it on a frame', 'A rataye kwalbar a kan sanda da igiya, tare da babba.', 'Hang the bottle on a stick frame with string, with an adult.'),
    addSoap: K('🧼', 'A ɗaure sabulu', 'Add the soap', 'A ɗaure sabulu kusa da kwalbar.', 'Tie a bar of soap next to the bottle.'),
    fillWater: K('💧', 'A cika da ruwa mai tsabta', 'Fill with clean water', 'A cika kwalbar da ruwa mai tsabta.', 'Fill the bottle with clean water.'),
    testWash: K('🙌', 'A gwada wanke hannu', 'Test washing hands', 'A taka igiyar ƙafa don ruwa ya zubo, a wanke hannu da sabulu.', 'Step on the string so water pours, and wash hands with soap.'),
    chooseTwoPots: K('🏺', 'A samo tukwane biyu', 'Get two pots', 'A samo babbar tukunya da ƙarama da za ta shiga cikinta, tare da babba.', 'Get a big pot and a smaller one that fits inside, with an adult.'),
    addSand: K('🏖️', 'A zuba yashi a tsakani', 'Fill between with sand', 'A zuba yashi tsakanin tukwanen.', 'Pour sand into the gap between the pots.'),
    wetSand: K('💦', 'A jiƙa yashi', 'Wet the sand', 'A zuba ruwa a yashi har ya yi ɗanshi.', 'Pour water on the sand until it is damp.'),
    putFood: K('🍅', 'A saka kayan lambu', 'Put in vegetables', 'A saka tumatir ko kayan lambu masu tsabta a ƙaramar tukunya.', 'Put clean tomatoes or vegetables in the small pot.'),
    coverCloth: K('🧻', 'A rufe da kyalle mai ɗanshi', 'Cover with a damp cloth', 'A rufe da kyalle mai ɗanshi a ajiye a inuwa.', 'Cover with a damp cloth and keep it in the shade.'),
    keepWet: K('♻️', 'A riƙa jiƙa yashi', 'Keep the sand damp', 'A riƙa jiƙa yashi kowace rana.', 'Re-wet the sand every day.'),
    dripHoles: S('🔩', 'A huda ƙananan ramuka', 'Make tiny holes', 'Babba yana huda ƙananan ramuka a kwalba.', 'An adult makes tiny holes in the bottle.'),
    burySetup: K('🌱', 'A binne kusa da shuka', 'Bury it near the plant', 'A tura kwalbar cikin ƙasa kusa da shuka.', 'Push the bottle into the soil near the plant.'),
    fillBottle: K('🚰', 'A cika da ruwa', 'Fill it with water', 'A cika kwalbar da ruwa.', 'Fill the bottle with water.'),
    watchPlant: K('👀', 'A kalli shuka', 'Watch the plant', 'A kalli ko ƙasa tana da ɗanshi kuma shuka tana girma.', 'See whether the soil stays damp and the plant grows.'),
  },
  procedures: [
    { id: 'tap', emoji: '🧼', name: { ha: 'Wurin wanke hannu', en: 'Hand-washing station' }, steps: ['collectBottle', 'makeHole', 'hangFrame', 'addSoap', 'fillWater', 'testWash'], result: { emoji: '🧼', name: { ha: 'Wurin wanke hannu', en: 'A hand-washing station' } },
      summary: { ha: 'Wurin wanke hannu: kwalba, rami, sanda da igiya, sabulu, ruwa, sannan gwaji.', en: 'Hand-washing station: bottle, hole, stick frame and string, soap, water, then a test.' } },
    { id: 'cooler', emoji: '🏺', name: { ha: 'Tukunya cikin tukunya', en: 'Pot-in-pot cooler' }, steps: ['chooseTwoPots', 'addSand', 'wetSand', 'putFood', 'coverCloth', 'keepWet'], result: { emoji: '🍅', name: { ha: 'Kayan lambu masu sanyi', en: 'Cooler vegetables' } },
      summary: { ha: 'Mai sanyaya: tukwane biyu, yashi mai ɗanshi, kyalle mai ɗanshi, inuwa.', en: 'Cooler: two pots, damp sand, a damp cloth and shade.' } },
    { id: 'drip', emoji: '🌱', name: { ha: 'Kwalbar digar ruwa', en: 'Bottle drip watering' }, steps: ['collectBottle', 'dripHoles', 'burySetup', 'fillBottle', 'watchPlant'], result: { emoji: '🌿', name: { ha: 'Shuka mai ruwa', en: 'A well-watered plant' } },
      summary: { ha: 'Digar ruwa: kwalba mai ƙananan ramuka kusa da shuka tana ba ta ruwa a hankali.', en: 'Drip watering: a bottle with tiny holes near the plant waters it slowly.' } },
    { id: 'design', emoji: '📐', name: { ha: 'Tsarin injiniya', en: 'The design process' }, steps: ['askFamily', 'pickIdea', 'drawPlan', 'buildIt', 'observe', 'changeOne', 'testAgain'], result: { emoji: '🏅', name: { ha: 'Na’ura mafi kyau', en: 'A better device' } },
      summary: { ha: 'Tsari: a tambaya, a zaɓi, a zana, a gina, a gwada, a canza, a sake gwadawa.', en: 'Process: ask, choose, draw, build, test, change, test again.' } },
  ],

  challenges: [
    { type: 'sort', key: 'sort', items: [
      { emoji: '🧴', kind: 'resource', name: { ha: 'Kwalbar filastik', en: 'Plastic bottle' }, why: { ha: 'Tsohuwar kwalba abu na asali ce da za a sake amfani da ita.', en: 'An old bottle is a resource that can be reused.' } },
      { emoji: '🧼', kind: 'product', name: { ha: 'Wurin wanke hannu', en: 'Hand-washing station' }, why: { ha: 'An yi shi daga kwalba, igiya da sanda. Sabon abu ne.', en: 'It is made from a bottle, string and a stick. It is a new product.' } },
      { emoji: '🏺', kind: 'resource', name: { ha: 'Tukunyar yumɓu', en: 'Clay pot' }, why: { ha: 'Yumɓu abu na asali ne.', en: 'Clay is a resource.' } },
      { emoji: '🍅', kind: 'product', name: { ha: 'Mai sanyaya tukunya cikin tukunya', en: 'Pot-in-pot cooler' }, why: { ha: 'An gina shi daga tukwane da yashi. Sabon abu ne.', en: 'It is built from pots and sand. It is a new product.' } }] },
    { type: 'safety', key: 'safety', items: [
      { emoji: '🧼', kind: 'safe', name: { ha: 'Wanke hannu da sabulu', en: 'Wash hands with soap' }, why: { ha: 'Wannan lafiya ne kuma yana da muhimmanci.', en: 'This is safe and important.' } },
      { emoji: '💦', kind: 'safe', name: { ha: 'Jiƙa yashi a tukunya', en: 'Wet the sand in the pot cooler' }, why: { ha: 'Wannan lafiya ne.', en: 'This is safe.' } },
      { emoji: '🔨', kind: 'adult', name: { ha: 'Huda kwalba da kayan aiki mai kaifi', en: 'Make holes with a sharp tool' }, why: { ha: 'Kaifi na manya ne kawai.', en: 'Sharp tools are for adults only.' } },
      { emoji: '🪜', kind: 'adult', name: { ha: 'Hau sama don rataya na’ura', en: 'Climb up to hang a device' }, why: { ha: 'Faɗuwa tana da haɗari. Ka kira babba.', en: 'Falling is dangerous. Call an adult.' } },
      { emoji: '🔌', kind: 'adult', name: { ha: 'Taɓa wayoyin wutar gida', en: 'Touch the wires of house electricity' }, why: { ha: 'Wutar lantarki tana kisa. Babba kawai.', en: 'Electricity can kill. Only an adult.' } }] },
    { type: 'business', key: 'business' },
  ],

  quiz: [
    { q: { ha: 'Menene matakin farko na injiniya?', en: 'What is the first step of an engineer?' },
      a: [{ ha: 'A fara gini kai tsaye', en: 'Start building straight away' }, { ha: 'A fahimci matsalar da farko', en: 'Understand the problem first' }, { ha: 'A fara sayarwa', en: 'Start selling' }], c: 1,
      e: { ha: 'Injiniya yana tambaya yana fahimtar matsala kafin ya gina.', en: 'An engineer asks and understands the problem before building.' } },
    { q: { ha: 'Me ya sa ake wanke hannu da sabulu?', en: 'Why do we wash hands with soap?' },
      a: [{ ha: 'Yana rage cututtuka', en: 'It reduces sickness' }, { ha: 'Yana sa hannu nauyi', en: 'It makes hands heavy' }, { ha: 'Yana ƙara ƙura', en: 'It adds dust' }], c: 0,
      e: { ha: 'Sabulu yana cire ƙwayoyin cuta daga hannu.', en: 'Soap removes germs from hands.' } },
    { q: { ha: 'Me tukunya cikin tukunya da yashi mai ɗanshi yake yi?', en: 'What does a pot-in-pot with damp sand do?' },
      a: [{ ha: 'Yana ƙone kayan lambu', en: 'It burns vegetables' }, { ha: 'Yana haskakawa', en: 'It gives light' }, { ha: 'Yana sanyaya kayan lambu', en: 'It keeps vegetables cooler' }], c: 2,
      e: { ha: 'Ruwan da ke ƙafewa yana sanyaya cikin tukunyar.', en: 'Water evaporating cools the inner pot.' } },
    { q: { ha: 'Me za ka yi idan na’ura ba ta yi aiki a gwajin farko?', en: 'What do you do if a device does not work on the first test?' },
      a: [{ ha: 'Na daina', en: 'Give up' }, { ha: 'Na canza abu ɗaya na sake gwadawa', en: 'Change one thing and test again' }, { ha: 'Na jefar da ita', en: 'Throw it away' }], c: 1,
      e: { ha: 'Injiniya yana gyara abu ɗaya a lokaci guda.', en: 'Engineers fix one thing at a time.' } },
    { q: { ha: 'Wa ke huda da kayan aiki masu kaifi?', en: 'Who makes holes with sharp tools?' },
      a: [{ ha: 'Babba', en: 'An adult' }, { ha: 'Yaro shi kaɗai', en: 'A child alone' }, { ha: 'Babu kowa', en: 'Nobody' }], c: 0,
      e: { ha: 'Kaifi na manya ne kawai.', en: 'Sharp tools are for adults only.' } },
    { q: { ha: 'Me ya sa kwalbar digar ruwa take da amfani?', en: 'Why is a drip bottle useful?' },
      a: [{ ha: 'Don a ƙara ɓarna', en: 'To waste more water' }, { ha: 'Don ya yi kyau', en: 'To look nice' }, { ha: 'Don a rage ɓarnar ruwa', en: 'To save water' }], c: 2,
      e: { ha: 'Tana ba shuka ruwa kaɗan-kaɗan ba tare da ɓarna ba.', en: 'It gives the plant a little water at a time without waste.' } },
    { q: { ha: 'Me ya kamata ka yi da kayan lambu kafin saka su a tukunya?', en: 'What should you do with vegetables before putting them in the pot?' },
      a: [{ ha: 'Na tabbatar suna da tsabta', en: 'Make sure they are clean' }, { ha: 'Na sa su cikin laka', en: 'Put them in mud' }, { ha: 'Na bar su a rana mai zafi', en: 'Leave them in hot sun' }], c: 0,
      e: { ha: 'Kayan lambu masu tsabta suna daɗewa kuma lafiya ne.', en: 'Clean vegetables last longer and are safe.' } },
  ],
}
