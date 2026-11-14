// MISSION 07 — Build a device to solve a household problem. Same engine shape as the other missions.
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })
const K = (...a) => ({ ...S(...a), kid: true })
const L = (ha, en) => ({ ha, en })

export const deviceMission = {
  id: 'device',
  no: 7,
  mixed: true,
  title: L('GINA NA’URA DON MATSALAR GIDA', 'BUILD A DEVICE FOR A HOME PROBLEM'),
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Home Inventor'] },

  teach: [
    { emoji: '🧑🏾‍🔧', title: L('Sannu, ƙaramin mai ƙirƙira! 👋', 'Hello, young inventor! 👋'), lines: [
      { text: L('A wani gida, abinci yana lalacewa da sauri, ba a wanke hannu sosai, kuma shuka tana bushewa.', 'In one home food spoils fast, hands are not washed well, and plants dry up.') },
      { text: L('Za ka iya taimaka musu ka ƙirƙiri na’urori masu warware matsalolin?', 'Can you help them invent devices to solve these problems?') }] },
    { emoji: '🔍', title: L('Yadda mai ƙirƙira yake aiki', 'How an inventor works'), lines: [
      { text: L('Mai ƙirƙira yana farawa da matsala, ba da na’ura ba.', 'An inventor starts with a problem, not with a machine.') },
      { text: L('Gano matsala → Tunani → Tsara → Gina → Gwada → Gyara', 'Find a problem → Imagine → Plan → Build → Test → Improve') }] },
    { emoji: '⚠️', warn: true, title: L('Tsaro', 'Safety'), lines: [
      { text: L('Manya ne kawai ke yanka, huda, amfani da wuta ko dafa ruwa.', 'Only adults cut, drill, use fire or boil water.') },
      { text: L('Kada ka yi amfani da kwalba da aka sa sinadari ko magani a ciki. Kada ka taɓa gilashi da ya karye. Wannan wasa ne kawai.', 'Never use a bottle that held chemicals or medicine. Never touch broken glass. This is a game only.') }] },
    { emoji: '🏺', title: L('Na’urar sanyaya abinci ta tukwane biyu', 'Pot-in-pot cooler'), lines: [
      { k: 'whatIs', text: L('Tukwane biyu na yumɓu, ɗaya a cikin ɗaya, da yashi mai ɗanshi a tsakani.', 'Two clay pots, one inside the other, with wet sand between them.') },
      { k: 'whatDoes', text: L('Tana sanyaya abinci ba tare da wutar lantarki ba.', 'It keeps food cool without electricity.') },
      { k: 'whyNeeded', text: L('Ruwa yana ƙafewa ya ɗauki zafi, abinci kuma yana daɗewa.', 'Water dries up and takes the heat away, so food lasts longer.') },
      { k: 'fact', text: L('Wani malamin Najeriya, Mohammed Bah Abba, ya shahara da wannan ƙirƙira.', 'A Nigerian teacher, Mohammed Bah Abba, became famous for this invention.') }] },
    { emoji: '🚰', title: L('Wurin wanke hannu mai ƙafa', 'Foot-pedal hand-washing station'), lines: [
      { k: 'whatIs', text: L('Jarka mai ƙaramin rami da igiya da allon taka.', 'A jerrycan with a small hole, a string and a foot pedal.') },
      { k: 'whatDoes', text: L('Idan ka taka, ruwa yana zubowa. Ba sai ka taɓa famfo ba.', 'When you step, water flows. You do not touch a tap.') },
      { k: 'whyNeeded', text: L('Wanke hannu yana kare mu daga cututtuka.', 'Washing hands protects us from sickness.') }] },
    { emoji: '💧', title: L('Kwalbar ban ruwa', 'Bottle drip watering'), lines: [
      { k: 'whatIs', text: L('Kwalba mai ruwa da ƙaramin rami a murfi, an juye a ƙasa.', 'A water bottle with a tiny hole in the cap, set upside down in the soil.') },
      { k: 'whatDoes', text: L('Tana ba shuka ruwa a hankali.', 'It waters the plant slowly.') },
      { k: 'whyNeeded', text: L('Ba a ɓatar da ruwa, shuka kuma ba ta bushewa.', 'No water is wasted and the plant does not dry up.') }] },
    { emoji: '💰', title: L('Ƙirƙira tana ƙara ƙima', 'Inventions add value'), lines: [
      { text: L('Na’ura mai warware matsala ana iya amfani da ita a gida ko a sayar.', 'A device that solves a problem can be used at home or sold.') },
      { text: L('Kowanne yana da hanyarsa. Wasu matakai na manya ne kawai. Za ka kalle su duka.', 'Each has its own way. Some steps are for adults only. You will watch them all.') }] },
  ],

  steps: {
    gfind: K('🔍', 'Gano matsala', 'Find a problem', 'Ana duba gida a gano abin da ke damun mutane.', 'Look around and find what bothers people.'),
    gask: K('🗣️', 'Tambayi mutane', 'Ask people', 'Ana tambayar iyali yadda matsalar take.', 'Ask the family how the problem affects them.'),
    gidea: K('💡', 'Yi tunanin mafita', 'Think of ideas', 'Ana tunanin hanyoyi da yawa, har da masu sauƙi.', 'Think of many ways, including simple ones.'),
    gplan: K('✏️', 'Zana tsari', 'Draw a plan', 'Ana zana na’urar da sassan da za a yi amfani da su.', 'Draw the device and the parts you need.'),
    gbuild: S('🔨', 'Gina tare da babba', 'Build with an adult', 'Babba yana yin yanka da huda; yaro yana taimakawa a sauran.', 'An adult does the cutting and drilling; you help with the rest.'),
    gtest: K('🧪', 'Gwada', 'Test it', 'Ana gwada ko na’urar tana warware matsalar.', 'Test whether the device solves the problem.'),
    gimprove: K('🔧', 'Gyara', 'Improve it', 'Ana gyara abin da bai yi kyau ba.', 'Fix whatever did not work well.'),
    cpots: K('🏺', 'Tara tukwane biyu', 'Collect two clay pots', 'Ɗaya ƙarami, ɗaya babba, ƙarami ya shiga cikin babba.', 'One small and one big. The small one fits inside the big one.'),
    csand: K('🏖️', 'Zuba yashi a ƙasa', 'Put sand at the bottom', 'Ana zuba yashi a ƙasan babbar tukunya.', 'Put a layer of sand at the bottom of the big pot.'),
    cinner: K('🫙', 'Saka ƙaramar tukunya', 'Place the small pot inside', 'Ana saka ƙaramar tukunya a tsakiya.', 'Place the small pot in the middle.'),
    cwet: K('💦', 'Cika gibin da yashi mai ɗanshi', 'Fill the gap with wet sand', 'Ana zuba yashi da ruwa a gibin tsakanin tukwanen.', 'Pour wet sand into the gap between the pots.'),
    cfood: K('🍅', 'Saka abinci', 'Put food inside', 'Ana saka tumatur ko kayan marmari a ƙaramar tukunya.', 'Put tomatoes or fruit into the small pot.'),
    ccover: K('🧺', 'Rufe da rigar da aka jiƙa', 'Cover with a damp cloth', 'Ana rufe da rigar da aka jiƙa, a ajiye a inuwa.', 'Cover with a damp cloth and keep it in the shade.'),
    tcollect: K('🧴', 'Tara jarka mara komai', 'Collect an empty jerrycan', 'Jarka mai tsabta da ba a taɓa sa sinadari a ciki ba.', 'A clean jerrycan that never held chemicals.'),
    thole: S('🕳️', 'Huda ƙaramin rami', 'Make a small hole', 'Babba yana huda ƙaramin rami kusa da ƙasa.', 'An adult makes a small hole near the bottom.'),
    tstring: S('🪢', 'Ɗaura igiya da allon taka', 'Tie the string and pedal', 'Babba yana ɗaura igiya da allo da za a taka.', 'An adult ties a string to a pedal you step on.'),
    thang: K('🪝', 'Rataye a cika da ruwa', 'Hang it and fill with water', 'Ana rataye jarka a cika ta da ruwa mai tsabta.', 'Hang the jerrycan and fill it with clean water.'),
    tsoap: K('🧼', 'Saka sabulu', 'Add soap', 'Ana rataye sabulu kusa.', 'Hang a bar of soap nearby.'),
    twash: K('🙌', 'Wanke hannu', 'Wash your hands', 'Ana taka allo, ruwa ya zubo, a wanke hannu da sabulu.', 'Step on the pedal, water flows, wash with soap.'),
    dbottle: K('🧴', 'Tara kwalba', 'Collect a bottle', 'Kwalbar filastik mara komai da aka wanke.', 'An empty, washed plastic bottle.'),
    dhole: S('🕳️', 'Huda murfi', 'Make a tiny hole in the cap', 'Babba yana huda ƙaramin rami a murfi.', 'An adult makes a tiny hole in the cap.'),
    dfill: K('💧', 'Cika da ruwa', 'Fill with water', 'Ana cika kwalba da ruwa a rufe.', 'Fill the bottle with water and close it.'),
    dplant: K('🌱', 'Juye a cikin ƙasa', 'Push it upside down in the soil', 'Ana tura wuyan kwalba a ƙasa kusa da shuka.', 'Push the neck into the soil next to the plant.'),
    dwatch: K('👀', 'Duba shuka', 'Watch the plant', 'Ruwa yana zubowa a hankali. Ana dubawa kowace rana.', 'Water drips slowly. Check it every day.'),
    drefill: K('🔁', 'Sake cikawa', 'Refill', 'Idan ruwa ya ƙare, a sake cikawa.', 'When it is empty, refill it.'),
  },
  procedures: [
    { id: 'design', emoji: '🔍', name: L('Matakan mai ƙirƙira', 'The inventor steps'), steps: ['gfind', 'gask', 'gidea', 'gplan', 'gbuild', 'gtest', 'gimprove'], result: { emoji: '💡', name: L('Na’ura mai amfani', 'A useful device') },
      summary: L('Farawa da matsala, ba da na’ura ba. Ana gwadawa ana gyarawa.', 'Start with a problem, not a machine. Test and improve.') },
    { id: 'cooler', emoji: '🏺', name: L('Tukwane biyu masu sanyaya abinci', 'Pot-in-pot cooler'), steps: ['cpots', 'csand', 'cinner', 'cwet', 'cfood', 'ccover'], result: { emoji: '🏺', name: L('Na’urar sanyaya abinci', 'A food cooler') },
      summary: L('Sanyaya: yashi mai ɗanshi da rigar da aka jiƙa. Babu wuta, babu yanka.', 'Cooling: wet sand and a damp cloth. No electricity and no cutting.') },
    { id: 'tippy', emoji: '🚰', name: L('Wurin wanke hannu mai ƙafa', 'Hand-washing station'), steps: ['tcollect', 'thole', 'tstring', 'thang', 'tsoap', 'twash'], result: { emoji: '🚰', name: L('Wurin wanke hannu', 'A hand-washing station') },
      summary: L('Wanke hannu: babba yana huda ya ɗaura igiya, sai a rataye a cika.', 'Hand-washing: an adult drills and ties the string, then it is hung and filled.') },
    { id: 'drip', emoji: '💧', name: L('Kwalbar ban ruwa', 'Bottle drip watering'), steps: ['dbottle', 'dhole', 'dfill', 'dplant', 'dwatch', 'drefill'], result: { emoji: '🌱', name: L('Shuka mai ruwa', 'A watered plant') },
      summary: L('Ban ruwa: ƙaramin rami a murfi, an juye a ƙasa.', 'Watering: a tiny hole in the cap, set upside down in the soil.') },
  ],

  challenges: [
    { type: 'sort', key: 'sort',
      ask: L('Wannan matsala ce ko mafita?', 'Is this a problem or a solution?'),
      options: [{ kind: 'problem', icon: '🔍', label: L('Matsala', 'Problem') }, { kind: 'solution', icon: '💡', label: L('Mafita', 'Solution') }],
      items: [
        { emoji: '🍅', kind: 'problem', name: L('Abinci yana lalacewa da sauri', 'Food spoils fast'), why: L('Wannan matsala ce da ake buƙatar warwarewa.', 'This is a problem that needs solving.') },
        { emoji: '🏺', kind: 'solution', name: L('Tukwane biyu masu sanyaya abinci', 'Pot-in-pot cooler'), why: L('Wannan mafita ce ga lalacewar abinci.', 'This is a solution to food spoiling.') },
        { emoji: '🤲', kind: 'problem', name: L('Ƙazantar hannu tana yaɗa cuta', 'Dirty hands spread sickness'), why: L('Wannan matsala ce.', 'This is a problem.') },
        { emoji: '🚰', kind: 'solution', name: L('Wurin wanke hannu mai ƙafa', 'Foot-pedal hand-washing station'), why: L('Wannan mafita ce ga ƙazantar hannu.', 'This is a solution to dirty hands.') }] },
    { type: 'safety', key: 'safety', items: [
      { emoji: '🍅', kind: 'safe', name: L('Saka tumatur a ƙaramar tukunya', 'Putting tomatoes in the small pot'), why: L('Wannan lafiya ne.', 'This is safe.') },
      { emoji: '🌱', kind: 'safe', name: L('Duba shuka da kwalbar ban ruwa', 'Checking the plant with the drip bottle'), why: L('Wannan lafiya ne.', 'This is safe.') },
      { emoji: '🔪', kind: 'adult', name: L('Yanka ko huda jarka', 'Cutting or drilling a jerrycan'), why: L('Kayan huda suna da kaifi. Babba ne kawai.', 'Drills and knives are sharp. Only an adult.') },
      { emoji: '♨️', kind: 'adult', name: L('Dafa ruwa ko amfani da wuta', 'Boiling water or using fire'), why: L('Zafi yana ƙonewa. Babba ne kawai.', 'Heat burns. Only an adult.') },
      { emoji: '🧪', kind: 'adult', name: L('Amfani da tsohuwar kwalbar sinadari', 'Using an old chemical bottle'), why: L('Kada ka taɓa ta. Ka gaya wa babba.', 'Do not touch it. Tell an adult.') }] },
    { type: 'business', key: 'business' },
  ],

  quiz: [
    { q: L('Daga ina mai ƙirƙira yake farawa?', 'Where does an inventor start?'),
      a: [L('Daga matsala', 'With a problem'), L('Daga na’ura mai tsada', 'With an expensive machine'), L('Daga hutu', 'With a rest')], c: 0,
      e: L('Mai ƙirƙira yana farawa da gano matsala.', 'An inventor starts by finding a problem.') },
    { q: L('Me ya sa tukwane biyu ke sanyaya abinci?', 'Why does the pot-in-pot cooler keep food cool?'),
      a: [L('Ruwan da ke ƙafewa yana ɗaukar zafi', 'Evaporating water takes the heat away'), L('Yana da wutar lantarki', 'It has electricity'), L('Yana da kankara', 'It has ice')], c: 0,
      e: L('Yashi mai ɗanshi yana ƙafewa, ya ɗauki zafi, abinci ya yi sanyi.', 'Wet sand dries up and takes heat away, so the food stays cool.') },
    { q: L('Wa ke huda jarka?', 'Who drills the jerrycan?'),
      a: [L('Babba', 'An adult'), L('Yaro shi kaɗai', 'A child alone'), L('Kowa', 'Anyone')], c: 0,
      e: L('Kayan huda suna da kaifi. Babba ne kawai.', 'Drills are sharp. Only an adult.') },
    { q: L('Me ya sa wurin wanke hannu yake da amfani?', 'Why is a hand-washing station useful?'),
      a: [L('Yana kare mu daga cututtuka', 'It protects us from sickness'), L('Yana sa hannu su yi ƙazanta', 'It makes hands dirty'), L('Yana sa ruwa ya ƙare', 'It uses up the water')], c: 0,
      e: L('Wanke hannu da sabulu yana kashe ƙwayoyin cuta.', 'Washing with soap removes germs.') },
    { q: L('Wane ne ba a soya shi ko dafa shi a wannan darasin?', 'Which device uses no fire at all in this lesson?'),
      a: [L('Tukwane biyu masu sanyaya', 'Pot-in-pot cooler'), L('Dafa ruwa', 'Boiling water'), L('Soya abinci', 'Frying food')], c: 0,
      e: L('Tukwane biyu suna amfani da yashi mai ɗanshi ne kawai, babu wuta.', 'The pot cooler uses only wet sand. There is no fire.') },
    { q: L('Wane ne “mafita” ga ƙazantar hannu?', 'Which is a “solution” to dirty hands?'),
      a: [L('Wurin wanke hannu mai ƙafa', 'A hand-washing station'), L('Jefar da sabulu', 'Throwing away the soap'), L('Rufe famfo', 'Closing the tap')], c: 0,
      e: L('Mafita tana warware matsala. Wurin wanke hannu yana warware ƙazanta.', 'A solution fixes a problem. A hand-washing station fixes dirty hands.') },
    { q: L('Yaya ake samun riba?', 'How do we find profit?'),
      a: [L('Farashin sayarwa − kuɗin da aka kashe', 'Selling price − money spent'), L('Farashin sayarwa + kuɗin da aka kashe', 'Selling price + money spent'), L('Kuɗin ƙunshewa kaɗai', 'Packaging cost only')], c: 0,
      e: L('Riba = farashin sayarwa − jimillar kuɗin da aka kashe.', 'Profit = selling price − total money spent.') },
  ],
}
