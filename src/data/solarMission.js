// MISSION 05 — Solar Energy. Same engine shape as the other missions.
// S = step for trained adults. K = a child can help (adult nearby).
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })
const K = (...a) => ({ ...S(...a), kid: true })
const L = (ha, en) => ({ ha, en })

export const solarMission = {
  id: 'solar',
  no: 5,
  mixed: true,
  title: L('HASKEN RANA', 'SOLAR ENERGY'),
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Solar Pioneer'] },

  teach: [
    { emoji: '🧑🏾‍🔧', title: L('Sannu, ƙaramin mai ƙirƙira! 👋', 'Hello, young inventor! 👋'), lines: [
      { text: L('A wani ƙauye, dare yana yi duhu. Mutane suna kashe kuɗi da yawa a kan mai don samun haske.', 'In a village the nights are dark. People spend a lot of money on fuel for light.') },
      { text: L('Rana tana haskakawa kowace rana kyauta. Za ka iya taimaka mana mu yi amfani da ita?', 'The sun shines every day for free. Can you help us use it?') }] },
    { emoji: '🌍', title: L('Abu na asali da sabon abu', 'Resource and new product'), lines: [
      { text: L('Hasken rana abu na asali ne. Yana fitowa daga yanayi, kyauta.', 'Sunlight is a resource. It comes from nature, for free.') },
      { text: L('Allon solar yana mai da shi wutar lantarki. Wannan sabon abu ne mai amfani.', 'A solar panel turns it into electricity. That is a useful new product.') },
      { text: L('Abu na asali → Sarrafawa → Sabon abu → Amfani', 'Resource → Processing → New product → Value') }] },
    { emoji: '☀️', title: L('Rana', 'The sun'), lines: [
      { k: 'whatIs', text: L('Rana tauraruwa ce mai ba da haske da zafi.', 'The sun is a star that gives light and heat.') },
      { k: 'whatDoes', text: L('Tana ba da makamashi kyauta kowace rana.', 'It gives free energy every day.') },
      { k: 'whyNeeded', text: L('Makamashin ba ya ƙarewa, kuma ba ya gurɓata iska.', 'This energy does not run out and does not pollute the air.') }] },
    { emoji: '⚠️', warn: true, title: L('Tsaro', 'Safety'), lines: [
      { text: L('Kada ka kalli rana kai tsaye. Yana cutar da idanu.', 'Never look straight at the sun. It harms your eyes.') },
      { text: L('Allon solar yana zafi a rana. Kada ka taɓa waya da aka bare ko soket na wutar gida. Manya ne kawai ke haɗa baturi da waya. Wannan wasa ne kawai.', 'A solar panel gets hot in the sun. Never touch bare wires or mains sockets. Only adults connect batteries and wires. This is a game only.') }] },
    { emoji: '🔆', title: L('Allon solar', 'Solar panel'), lines: [
      { k: 'whatIs', text: L('Faranti ne da ke ɗaukar hasken rana.', 'A flat plate that catches sunlight.') },
      { k: 'whatDoes', text: L('Yana mai da hasken rana zuwa wutar lantarki.', 'It turns sunlight into electricity.') },
      { k: 'whyNeeded', text: L('Don samun wuta ba tare da mai ko layin wuta ba.', 'To get power without fuel or power lines.') }] },
    { emoji: '🔋', title: L('Baturi', 'Battery'), lines: [
      { k: 'whatIs', text: L('Baturi yana adana wutar lantarki.', 'A battery stores electricity.') },
      { k: 'whatDoes', text: L('Yana ba da wuta da dare, lokacin da babu rana.', 'It gives power at night, when there is no sun.') },
      { k: 'whyNeeded', text: L('Don haske ya ci gaba bayan rana ta faɗi.', 'So the light keeps going after the sun sets.') }] },
    { emoji: '🎛️', title: L('Mai kula da caji', 'Charge controller'), lines: [
      { k: 'whatIs', text: L('Ƙaramar na’ura ce da ke kula da cajin baturi.', 'A small device that looks after the battery charge.') },
      { k: 'whatDoes', text: L('Tana hana baturi cikawa fiye da kima.', 'It stops the battery from overfilling.') },
      { k: 'whyNeeded', text: L('Don baturi ya daɗe kuma ya kasance lafiya.', 'So the battery lasts long and stays safe.') }] },
    { emoji: '💡', title: L('Fitila da cajar waya', 'Lamp and phone charger'), lines: [
      { k: 'whatIs', text: L('Abubuwan da ke amfani da wutar lantarki.', 'Things that use the electricity.') },
      { k: 'whatDoes', text: L('Fitila tana haskakawa. Cajar waya tana cika wayar.', 'A lamp gives light. A charger fills a phone.') },
      { k: 'whyNeeded', text: L('Su ne dalilin gina tsarin: amfani.', 'They are the reason we build the system: value.') }] },
    { emoji: '💰', title: L('Sarrafawa yana ƙara ƙima', 'Processing adds value'), lines: [
      { text: L('Hasken rana kyauta ne, amma allon solar da baturi suna da farashi a farko.', 'Sunlight is free, but the panel and battery cost money at the start.') },
      { text: L('Bayan haka ba a kashe kuɗin mai. Ana iya sayar da fitilun solar ko cajin waya.', 'After that there is no fuel to buy. Solar lamps or phone charging can be sold.') },
      { text: L('Kowanne yana da hanyarsa. Wasu matakai na manya ne kawai. Za ka kalle su duka.', 'Each has its own way. Some steps are for adults only. You will watch them all.') }] },
  ],

  steps: {
    sun: S('☀️', 'Rana ta haskaka', 'The sun shines', 'Rana tana aika hasken rana zuwa ƙasa.', 'The sun sends sunlight down to the ground.'),
    panel: S('🔆', 'Allon solar ya ɗauki haske', 'The panel catches light', 'Allon yana ɗaukar hasken rana ya mai da shi wuta.', 'The panel catches sunlight and turns it into electricity.'),
    ctrl: S('🎛️', 'Mai kula da caji', 'Charge controller', 'Wutar tana wucewa ta mai kula da caji. Manya ne ke haɗa shi.', 'The electricity passes through the charge controller. Adults connect it.'),
    battery: S('🔋', 'Baturi ya adana wuta', 'The battery stores power', 'Baturi yana adana wutar don dare.', 'The battery keeps the power for the night.'),
    lamp: S('💡', 'Fitila ta haska', 'The lamp lights up', 'Da dare, baturi yana ba fitila wuta ta haska.', 'At night the battery gives the lamp power to shine.'),
    pplace: K('📍', 'Sanya allon a rana', 'Put the panel in the sun', 'Ana sanya allon a wuri mai rana, ba inuwa.', 'The panel goes in a sunny place, not in shade.'),
    pcable: S('🔌', 'Haɗa kebul', 'Connect the cable', 'Babba yana haɗa kebul ɗin cajar waya da allon.', 'An adult connects the phone cable to the panel.'),
    pcharge: K('📱', 'Waya tana caji', 'The phone charges', 'Waya tana caji da hasken rana.', 'The phone charges using sunlight.'),
    punplug: S('⏏️', 'Cire kebul', 'Unplug the cable', 'Babba yana cire kebul idan waya ta cika.', 'An adult unplugs the cable when the phone is full.'),
    pstore: K('🏠', 'Ajiye allon', 'Store the panel', 'Ana ajiye allon a wuri mai tsabta da bushewa.', 'The panel is kept in a clean, dry place.'),
    cspot: K('🌤️', 'Zaɓi wuri mai rana', 'Choose a sunny spot', 'Wuri ba tare da inuwar bishiya ko gini ba.', 'A place with no shade from trees or buildings.'),
    ctilt: S('📐', 'Karkatar da allon', 'Tilt the panel', 'Babba yana karkatar da allon zuwa sama, yana fuskantar kudu.', 'An adult tilts the panel up, facing south.'),
    cclean: K('🧽', 'Goge ƙura', 'Wipe off dust', 'Idan allon bai da zafi, a goge ƙura da rigar laushi. Babba yana kusa.', 'When the panel is cool, wipe off dust with a soft cloth. An adult is nearby.'),
    ccheck: S('🔍', 'Duba waya', 'Check the wires', 'Babba yana duba wayoyi da haɗin su.', 'An adult checks the wires and connections.'),
  },
  procedures: [
    { id: 'lamp', emoji: '💡', name: L('Fitilar solar', 'Solar lamp'), steps: ['sun', 'panel', 'ctrl', 'battery', 'lamp'], result: { emoji: '💡', name: L('Fitilar solar', 'Solar lamp') },
      summary: L('Fitilar solar: rana → allon → mai kula → baturi → fitila.', 'Solar lamp: sun → panel → controller → battery → lamp.') },
    { id: 'phone', emoji: '📱', name: L('Cajin waya da rana', 'Charging a phone with sun'), steps: ['pplace', 'pcable', 'pcharge', 'punplug', 'pstore'], result: { emoji: '📱', name: L('Cajin waya da rana', 'Charging a phone with sun') },
      summary: L('Cajin waya: allon yana cikin rana, babba yana haɗa kebul. Ba a buƙatar baturi.', 'Phone charging: the panel sits in the sun and an adult connects the cable. No battery needed.') },
    { id: 'care', emoji: '🧽', name: L('Kula da allon solar', 'Looking after a solar panel'), steps: ['cspot', 'ctilt', 'cclean', 'ccheck'], result: { emoji: '🔆', name: L('Allon solar lafiya', 'A healthy solar panel') },
      summary: L('Kula da allo: wuri mai rana, karkata, goge ƙura, duba waya.', 'Panel care: sunny spot, tilt, wipe dust, check wires.') },
  ],

  challenges: [
    { type: 'sort', key: 'sort', items: [
      { emoji: '🌞', kind: 'resource', name: L('Hasken rana', 'Sunlight'), why: L('Yana fitowa daga yanayi, kyauta. Abu na asali ne.', 'It comes from nature, for free. It is a resource.') },
      { emoji: '💡', kind: 'product', name: L('Fitilar solar', 'Solar lamp'), why: L('An yi ta daga allon solar da baturi. Sabon abu ne.', 'It is made from a panel and a battery. It is a new product.') },
      { emoji: '💨', kind: 'resource', name: L('Iska', 'Wind'), why: L('Iska tana fitowa daga yanayi. Abu na asali ne.', 'Wind comes from nature. It is a resource.') },
      { emoji: '📱', kind: 'product', name: L('Waya da aka caji da rana', 'A phone charged by the sun'), why: L('Wutar rana ta zama amfani. Sakamako ne mai ƙima.', 'Sun power became something useful. It is the valuable result.') }] },
    { type: 'sort', key: 'safety',
      ask: L('Wannan lafiya ne ko haɗari?', 'Is this safe or dangerous?'),
      options: [{ kind: 'safe', icon: '✅', label: L('Lafiya', 'Safe') }, { kind: 'danger', icon: '⚠️', label: L('Haɗari', 'Dangerous') }],
      items: [
        { emoji: '😎', kind: 'danger', name: L('Kallon rana kai tsaye', 'Looking straight at the sun'), why: L('Yana cutar da idanu. Kada ka yi.', 'It harms your eyes. Never do it.') },
        { emoji: '🧽', kind: 'safe', name: L('Goge ƙurar allo mai sanyi da rigar laushi (babba yana kusa)', 'Wiping a cool panel with a soft cloth (adult nearby)'), why: L('Wannan lafiya ne idan allon bai da zafi.', 'This is safe when the panel is cool.') },
        { emoji: '🔌', kind: 'danger', name: L('Taɓa waya da aka bare', 'Touching a bare wire'), why: L('Wutar lantarki tana iya cutarwa. Ka gaya wa babba.', 'Electricity can hurt you. Tell an adult.') },
        { emoji: '💡', kind: 'safe', name: L('Amfani da fitilar solar da dare', 'Using a solar lamp at night'), why: L('Wannan lafiya ne.', 'This is safe.') },
        { emoji: '🔋', kind: 'danger', name: L('Wargaza baturi', 'Taking a battery apart'), why: L('Baturi yana da sinadari mai haɗari. Manya ne kawai.', 'A battery holds harmful chemicals. Adults only.') }] },
    { type: 'business', key: 'business' },
  ],

  quiz: [
    { q: L('Menene allon solar ke yi?', 'What does a solar panel do?'),
      a: [L('Yana mai da hasken rana wutar lantarki', 'Turns sunlight into electricity'), L('Yana sa ruwan sama', 'Makes rain'), L('Yana dafa abinci', 'Cooks food')], c: 0,
      e: L('Allon solar yana ɗaukar hasken rana ya mai da shi wutar lantarki.', 'A solar panel catches sunlight and turns it into electricity.') },
    { q: L('Me ya sa ba a kallon rana kai tsaye?', 'Why do we never look straight at the sun?'),
      a: [L('Yana cutar da idanu', 'It harms the eyes'), L('Yana da daɗi', 'It is fun'), L('Yana sa sanyi', 'It makes us cold')], c: 0,
      e: L('Hasken rana yana da ƙarfi sosai kuma yana cutar da idanu.', 'Sunlight is very strong and harms the eyes.') },
    { q: L('Wane sashi ne yake adana wuta don dare?', 'Which part stores power for the night?'),
      a: [L('Fitila', 'Lamp'), L('Baturi', 'Battery'), L('Rana', 'Sun')], c: 1,
      e: L('Baturi yana adana wutar da allon ya samu, don a yi amfani da ita da dare.', 'The battery keeps the power the panel made, for use at night.') },
    { q: L('Me ya sa muke da mai kula da caji?', 'Why do we have a charge controller?'),
      a: [L('Don baturi kada ya cika fiye da kima', 'So the battery does not overfill'), L('Don ya yi kyau', 'To look nice'), L('Don ya sa rana ta haskaka', 'To make the sun shine')], c: 0,
      e: L('Mai kula da caji yana kare baturi, don ya daɗe.', 'The charge controller protects the battery so it lasts.') },
    { q: L('Wa ke haɗa baturi da waya?', 'Who connects batteries and wires?'),
      a: [L('Yaro shi kaɗai', 'A child alone'), L('Manya', 'Adults'), L('Babu kowa', 'Nobody')], c: 1,
      e: L('Wutar lantarki tana iya cutarwa. Manya ne kawai ke haɗawa.', 'Electricity can hurt. Only adults connect things.') },
    { q: L('A ina ake sanya allon solar?', 'Where do we put a solar panel?'),
      a: [L('A wuri mai rana, ba inuwa', 'In a sunny place with no shade'), L('A cikin akwati', 'Inside a box'), L('A ƙarƙashin bishiya', 'Under a tree')], c: 0,
      e: L('Allon yana buƙatar haske kai tsaye, don haka a guji inuwa.', 'The panel needs direct light, so avoid shade.') },
    { q: L('Yaya ake samun riba?', 'How do we find profit?'),
      a: [L('Farashin sayarwa − kuɗin da aka kashe', 'Selling price − money spent'), L('Farashin sayarwa + kuɗin da aka kashe', 'Selling price + money spent'), L('Kuɗin ƙunshewa kaɗai', 'Packaging cost only')], c: 0,
      e: L('Riba = farashin sayarwa − jimillar kuɗin da aka kashe.', 'Profit = selling price − total money spent.') },
  ],
}
