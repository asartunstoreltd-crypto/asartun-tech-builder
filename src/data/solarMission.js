// MISSION 05 — Solar energy. Same engine shape as the other missions.
// S = step done by trained adults. K = step a child can help with (adult nearby).
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })
const K = (...a) => ({ ...S(...a), kid: true })

export const solarMission = {
  id: 'solar',
  no: 5,
  mixed: true,
  title: { ha: 'HASKEN RANA', en: 'SOLAR ENERGY' },
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Solar Star'] },

  teach: [
    { emoji: '🧑🏾‍🌾', title: { ha: 'Sannu, ƙaramin mai ƙirƙira! 👋', en: 'Hello, young inventor! 👋' }, lines: [
      { text: { ha: 'A wani ƙauye, yara ba su iya karatu da dare. Fitilu suna ƙarewa kuma kananzir yana da tsada.', en: 'In a village, children cannot study at night. Lamps run out and kerosene is expensive.' } },
      { text: { ha: 'Rana tana haskakawa kyauta kowace rana. Za ka iya taimaka musu su yi amfani da ita?', en: 'The sun shines for free every day. Can you help them use it?' } }] },
    { emoji: '☀️', title: { ha: 'Hasken rana abu na asali ne', en: 'Sunlight is a resource' }, lines: [
      { text: { ha: 'Hasken rana yana zuwa kyauta kowace rana. Abu na asali ne.', en: 'Sunlight comes free every day. It is a resource.' } },
      { text: { ha: 'Idan an sarrafa shi da faifan rana, sai ya zama wutar lantarki, sabon abu mai amfani.', en: 'When we process it with a solar panel, it becomes electricity, a useful new product.' } },
      { text: { ha: 'Abu na asali → Sarrafawa → Sabon abu → Amfani', en: 'Resource → Processing → New product → Value' } }] },
    { emoji: '🔆', title: { ha: 'Makamashin rana', en: 'Solar energy' }, lines: [
      { text: { ha: 'Makamashin rana wuta ce da ake samu daga hasken rana.', en: 'Solar energy is power we get from sunlight.' } },
      { text: { ha: 'Faifan rana yana juya haske zuwa wutar lantarki.', en: 'A solar panel turns light into electricity.' } },
      { text: { ha: 'Yana aiki ba tare da hayaƙi ba, kuma rana ba ta ƙarewa.', en: 'It works without smoke, and the sun does not run out.' } }] },
    { emoji: '⚠️', warn: true, title: { ha: 'Tsaro', en: 'Safety' }, lines: [
      { text: { ha: 'Kada ka kalli rana kai tsaye, har da ta gilashin ƙara girma. Yana cutar da ido.', en: 'Never look straight at the sun, not even through a magnifying glass. It hurts your eyes.' } },
      { text: { ha: 'Kada ka taɓa wayoyi ko baturi, kuma kada ka hau rufi. Ƙwararre babba ne kawai ke girkawa. Wannan wasa ne kawai.', en: 'Do not touch wires or batteries, and do not climb on a roof. Only a trained adult installs. This is a game only.' } }] },
    { emoji: '🔲', title: { ha: 'Faifan rana', en: 'Solar panel' }, lines: [
      { k: 'whatIs', text: { ha: 'Faifai mai ƙananan sel da ke ɗaukar hasken rana.', en: 'A flat board with small cells that catch sunlight.' } },
      { k: 'whatDoes', text: { ha: 'Yana mayar da haske zuwa wutar lantarki.', en: 'It turns light into electricity.' } },
      { k: 'whyNeeded', text: { ha: 'Yana ba da wuta a wuraren da babu layin wuta.', en: 'It gives power where there is no power line.' } }] },
    { emoji: '🔋', title: { ha: 'Baturi', en: 'Battery' }, lines: [
      { k: 'whatIs', text: { ha: 'Akwati da ke adana wutar lantarki.', en: 'A box that stores electricity.' } },
      { k: 'whatDoes', text: { ha: 'Yana adana wuta da rana don a yi amfani da ita da dare.', en: 'It saves power in the day so we can use it at night.' } },
      { k: 'whyNeeded', text: { ha: 'Ba tare da baturi ba, wuta tana ƙarewa da zarar rana ta faɗi.', en: 'Without a battery, the power stops as soon as the sun sets.' } }] },
    { emoji: '💡', title: { ha: 'Fitila da na’urar kula', en: 'Lamp and controller' }, lines: [
      { text: { ha: 'Fitilar LED tana haske da ɗan wuta kaɗan.', en: 'An LED lamp shines using very little power.' } },
      { text: { ha: 'Na’urar kula tana hana baturi cika fiye da kima ko ƙarewa gaba ɗaya.', en: 'The controller stops the battery from overfilling or running completely flat.' } },
      { text: { ha: 'Faifai → Na’urar kula → Baturi → Fitila', en: 'Panel → Controller → Battery → Lamp' } }] },
    { emoji: '📍', title: { ha: 'Inda ake ɗora faifai', en: 'Where to place a panel' }, lines: [
      { text: { ha: 'Faifai yana buƙatar rana sosai, ba inuwa ba.', en: 'A panel needs plenty of sun and no shade.' } },
      { text: { ha: 'Ana karkatar da shi zuwa rana kuma a kiyaye shi daga ƙura.', en: 'It is tilted towards the sun and kept free of dust.' } },
      { text: { ha: 'Ko da gajimare, faifai yana ba da ɗan wuta, amma ƙasa da lokacin rana mai ƙarfi.', en: 'Even on cloudy days a panel gives some power, but less than in strong sun.' } }] },
    { emoji: '💰', title: { ha: 'Sarrafawa yana ƙara ƙima', en: 'Processing adds value' }, lines: [
      { text: { ha: 'Faifan rana yana rage kuɗin kananzir da batir.', en: 'A solar panel cuts the cost of kerosene and batteries.' } },
      { text: { ha: 'Mutum zai iya buɗe wurin cajin waya ya sayar da sabis.', en: 'A person can open a phone-charging point and sell the service.' } },
      { text: { ha: 'Busar da abinci da rana yana sa mangwaro da tumatir su daɗe, kuma ana iya sayarwa. Za ka kalle su duka.', en: 'Drying food in the sun makes mango and tomato last longer, and it can be sold. You will watch them all.' } }] },
  ],

  steps: {
    findSun: K('🌞', 'A nemi wurin rana', 'Find a sunny spot', 'A nemi wuri mai hasken rana da ba shi da inuwa.', 'Find a place with full sunshine and no shade.'),
    mountPanel: S('🔆', 'A ɗora faifan rana', 'Mount the panel', 'Babba yana ɗora faifan a kan tsayayyen goyon baya, ya karkatar da shi zuwa rana.', 'An adult fixes the panel on a firm support, tilted towards the sun.'),
    wireController: S('🔌', 'A haɗa na’urar kula', 'Connect the controller', 'Ƙwararre yana haɗa wayoyi zuwa na’urar kula da caji.', 'A trained technician connects the wires to the charge controller.'),
    connectBattery: S('🔋', 'A haɗa baturi', 'Connect the battery', 'Ƙwararre yana haɗa baturi don ya adana wuta.', 'A trained technician connects a battery to store the power.'),
    connectLamp: S('💡', 'A haɗa fitila', 'Connect the lamp', 'Ƙwararre yana haɗa fitilar LED.', 'A trained technician connects the LED lamp.'),
    plugUSB: S('📱', 'A saka cajar waya', 'Plug in the phone charger', 'Babba yana saka wayar a mashigar USB.', 'An adult plugs the phone into the USB socket.'),
    chargeDay: K('⏳', 'A bar ta yi caji da rana', 'Let it charge in the day', 'Faifan yana tara hasken rana yana cika baturi cikin yini.', 'The panel gathers sunlight and fills the battery during the day.'),
    nightUse: K('🌙', 'A kunna da dare', 'Switch on at night', 'Da dare, a kunna fitilar tare da babba kusa.', 'At night, switch on the lamp with an adult nearby.'),
    prepFood: S('🔪', 'A yanka abinci', 'Slice the food', 'Babba yana wanke yana yanka mangwaro ko tumatir siraran guntu.', 'An adult washes and slices mango or tomato into thin pieces.'),
    spreadTray: K('🧺', 'A shimfiɗa a kan tire', 'Spread on a tray', 'A shimfiɗa guntun a kan tire mai tsabta, kada su taru.', 'Spread the pieces on a clean tray, not touching each other.'),
    coverNet: K('🕸️', 'A rufe da raga', 'Cover with a net', 'A rufe da raga mai tsabta don kare shi daga ƙudaje da ƙura.', 'Cover with a clean net to keep off flies and dust.'),
    dryInSun: K('☀️', 'A bushar da rana', 'Dry in the sun', 'A bar tire a rana na kwanaki har abincin ya bushe.', 'Leave the tray in the sun for days until the food is dry.'),
    storeDry: K('🫙', 'A adana a kwano busasshe', 'Store in a dry container', 'A saka busasshen abincin a kwano mai murfi, a wuri busasshe.', 'Put the dried food in a lidded container in a dry place.'),
    checkDirt: K('🔍', 'A duba datti', 'Look for dirt', 'A duba ko ƙura ta lulluɓe faifan.', 'Look to see if dust covers the panel.'),
    wipePanel: K('🧽', 'A goge a hankali', 'Wipe gently', 'A goge faifan da kyalle mai laushi da ɗanshi, tare da babba.', 'Wipe the panel with a soft damp cloth, with an adult.'),
    checkWires: S('🧰', 'A duba wayoyi', 'Check the wires', 'Ƙwararre yana duba wayoyi da haɗin su.', 'A technician checks the wires and joints.'),
    keepClear: K('🌳', 'A hana inuwa', 'Keep shade away', 'A gaya wa babba ya cire rassan da ke inuwantar da faifan.', 'Tell an adult to trim branches that shade the panel.'),
  },
  procedures: [
    { id: 'lamp', emoji: '💡', name: { ha: 'Fitilar rana', en: 'Solar lamp' }, steps: ['findSun', 'mountPanel', 'wireController', 'connectBattery', 'connectLamp', 'chargeDay', 'nightUse'], result: { emoji: '💡', name: { ha: 'Hasken fitila da dare', en: 'Light at night' } },
      summary: { ha: 'Fitilar rana: faifan yana caji da rana, baturi yana adana, fitila tana haske da dare.', en: 'Solar lamp: the panel charges in the day, the battery stores it, the lamp shines at night.' } },
    { id: 'phone', emoji: '📱', name: { ha: 'Wurin cajin waya', en: 'Phone charging point' }, steps: ['findSun', 'mountPanel', 'wireController', 'connectBattery', 'plugUSB', 'chargeDay'], result: { emoji: '🔌', name: { ha: 'Cajin waya da rana', en: 'Phone charging by sun' } },
      summary: { ha: 'Wurin cajin waya: faifan rana yana ba da wuta ga mashigar USB ta hanyar na’urar kula.', en: 'Phone charging point: the panel powers a USB socket through the controller.' } },
    { id: 'dryer', emoji: '🥭', name: { ha: 'Busar da abinci da rana', en: 'Solar food drying' }, steps: ['prepFood', 'spreadTray', 'coverNet', 'dryInSun', 'storeDry'], result: { emoji: '🥭', name: { ha: 'Busasshen mangwaro', en: 'Dried mango' } },
      summary: { ha: 'Busar da abinci: a yanka, a shimfiɗa, a rufe, a bushar da rana, a adana.', en: 'Solar drying: slice, spread, cover, dry in the sun and store.' } },
    { id: 'care', emoji: '🧽', name: { ha: 'Kula da faifan rana', en: 'Caring for the panel' }, steps: ['checkDirt', 'wipePanel', 'checkWires', 'keepClear'], result: { emoji: '✨', name: { ha: 'Faifai mai aiki da kyau', en: 'A panel that works well' } },
      summary: { ha: 'Kula: a duba datti, a goge, ƙwararre yana duba wayoyi, a hana inuwa.', en: 'Care: check dirt, wipe, a technician checks wires, keep shade away.' } },
  ],

  challenges: [
    { type: 'sort', key: 'sort', items: [
      { emoji: '☀️', kind: 'resource', name: { ha: 'Hasken rana', en: 'Sunlight' }, why: { ha: 'Rana tana ba da haske kyauta. Abu na asali ne.', en: 'The sun gives light for free. It is a resource.' } },
      { emoji: '💡', kind: 'product', name: { ha: 'Fitilar rana', en: 'Solar lamp' }, why: { ha: 'An yi ta daga faifan rana da baturi. Sabon abu ne.', en: 'It is made from a panel and a battery. It is a new product.' } },
      { emoji: '🥭', kind: 'resource', name: { ha: 'Mangwaro sabo', en: 'Fresh mango' }, why: { ha: 'Yana fitowa daga itace. Abu na asali ne.', en: 'It comes from a tree. It is a resource.' } },
      { emoji: '🍑', kind: 'product', name: { ha: 'Busasshen mangwaro', en: 'Dried mango' }, why: { ha: 'An bushar da shi da rana. Sabon abu ne.', en: 'It was dried in the sun. It is a new product.' } }] },
    { type: 'safety', key: 'safety', items: [
      { emoji: '🌳', kind: 'safe', name: { ha: 'Zauna a inuwa lokacin zafi', en: 'Sit in the shade when it is hot' }, why: { ha: 'Wannan lafiya ne.', en: 'This is safe.' } },
      { emoji: '🧺', kind: 'safe', name: { ha: 'Shimfiɗa busasshen abinci a tire', en: 'Spread food on a drying tray' }, why: { ha: 'Wannan lafiya ne idan abincin mai tsabta ne.', en: 'This is safe when the food is clean.' } },
      { emoji: '🕶️', kind: 'adult', name: { ha: 'Kalli rana kai tsaye', en: 'Look straight at the sun' }, why: { ha: 'Kada ka yi. Yana cutar da ido. Ka gaya wa babba.', en: 'Never do it. It hurts your eyes. Tell an adult.' } },
      { emoji: '🪜', kind: 'adult', name: { ha: 'Hau rufi don gyara faifai', en: 'Climb on a roof to fix a panel' }, why: { ha: 'Faɗuwa tana da haɗari. Ƙwararre babba ne kawai.', en: 'Falling is dangerous. Only a trained adult.' } },
      { emoji: '🔌', kind: 'adult', name: { ha: 'Taɓa wayoyi da hannu mai ruwa', en: 'Touch wires with wet hands' }, why: { ha: 'Ruwa da wutar lantarki haɗari ne. Ka kira babba.', en: 'Water and electricity are dangerous together. Call an adult.' } }] },
    { type: 'business', key: 'business' },
  ],

  quiz: [
    { q: { ha: 'Menene makamashin rana?', en: 'What is solar energy?' },
      a: [{ ha: 'Wuta da ake samu daga hasken rana', en: 'Power we get from sunlight' }, { ha: 'Wuta daga gawayi', en: 'Power from charcoal' }, { ha: 'Iska daga fanka', en: 'Wind from a fan' }], c: 0,
      e: { ha: 'Faifan rana yana juya hasken rana zuwa wutar lantarki.', en: 'A solar panel turns sunlight into electricity.' } },
    { q: { ha: 'Me faifan rana yake yi?', en: 'What does a solar panel do?' },
      a: [{ ha: 'Yana tace ruwa', en: 'It filters water' }, { ha: 'Yana mayar da haske zuwa wutar lantarki', en: 'It turns light into electricity' }, { ha: 'Yana kiwon kifi', en: 'It raises fish' }], c: 1,
      e: { ha: 'Sel ɗin faifan suna ɗaukar haske su mayar da shi wuta.', en: 'The cells in the panel catch light and turn it into power.' } },
    { q: { ha: 'Me ya sa ake amfani da baturi?', en: 'Why do we use a battery?' },
      a: [{ ha: 'Don ya yi nauyi', en: 'To make it heavy' }, { ha: 'Don ya yi ƙara', en: 'To make noise' }, { ha: 'Don adana wuta a yi amfani da ita da dare', en: 'To store power for use at night' }], c: 2,
      e: { ha: 'Baturi yana adana wutar da faifan ya samu da rana.', en: 'The battery keeps the power the panel made in the day.' } },
    { q: { ha: 'Ina ya fi dacewa a ɗora faifan rana?', en: 'Where is the best place for a solar panel?' },
      a: [{ ha: 'A cikin inuwa', en: 'In the shade' }, { ha: 'Wuri mai rana ba inuwa', en: 'A sunny place with no shade' }, { ha: 'A cikin rami', en: 'In a hole' }], c: 1,
      e: { ha: 'Inuwa tana rage wutar da faifan ke bayarwa.', en: 'Shade reduces the power the panel gives.' } },
    { q: { ha: 'Me ya kamata ka yi game da rana mai ƙarfi?', en: 'What should you do about strong sunlight?' },
      a: [{ ha: 'Ka guji kallon rana kai tsaye', en: 'Never look straight at the sun' }, { ha: 'Ka kalle ta kai tsaye', en: 'Look straight at it' }, { ha: 'Ka kalle ta ta gilashin ƙara girma', en: 'Look at it through a magnifying glass' }], c: 0,
      e: { ha: 'Kallon rana yana cutar da ido har ta hanyar gilashi.', en: 'Looking at the sun hurts your eyes, even more through a lens.' } },
    { q: { ha: 'Wa ke girka faifan rana a rufi?', en: 'Who installs a solar panel on a roof?' },
      a: [{ ha: 'Yaro shi kaɗai', en: 'A child alone' }, { ha: 'Babu kowa', en: 'Nobody' }, { ha: 'Ƙwararre babba', en: 'A trained adult' }], c: 2,
      e: { ha: 'Rufi da wayoyi suna da haɗari. Ƙwararre ne kawai ke yi.', en: 'Roofs and wires are dangerous. Only a trained person does it.' } },
    { q: { ha: 'Me ya sa busar da abinci da rana yake da amfani?', en: 'Why is drying food in the sun useful?' },
      a: [{ ha: 'Yana sa abinci ya daɗe kuma za a iya sayarwa', en: 'It makes food last and it can be sold' }, { ha: 'Yana sa abinci ya ruɓe', en: 'It makes food rot' }, { ha: 'Yana ƙara ruwa a abinci', en: 'It adds water to food' }], c: 0,
      e: { ha: 'Abincin da ya bushe yana daɗewa kafin ya lalace.', en: 'Dry food lasts longer before it spoils.' } },
  ],
}
