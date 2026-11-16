// HOME DEVICE — Level 2 (ages 11–13) additions to the EXISTING 'device' mission: science pages, a prediction, a simulation,
// comparison and fault-finding games, a cost sheet, a design-brief reflection and 5 more quiz questions.
// DRAFT content: science + Hausa need review. ALL NUMBERS ARE MODEL VALUES (illustrative), never real measurements or prices.
import { L, page, item, sortC, quest } from './dsl.js'
import { predictC, simC, planC, reflectC, opt, row } from './phase2dsl.js'

export const deviceL2Extra = {
  // inserted before the last existing teaching page ("Inventions add value")
  teach: [
    page('🏘️', 'Wanene ke da wannan matsala?', 'Who has this problem?', [
      [null, 'Iyali da ba su da firji: kayan lambu suna lalacewa a cikin zafi.', 'A family with no fridge: vegetables spoil in the heat.'],
      [null, 'Makaranta ko asibiti da ba su da famfo: mutane ba sa wanke hannu da kyau.', 'A school or clinic with no tap: people cannot wash their hands properly.'],
      [null, 'Mai lambu da ruwa kaɗan: shuke-shuke suna bushewa.', 'A gardener with little water: plants dry out.']]),
    page('🧱', 'Kayan aiki da halayensu', 'Materials and their properties', [
      [null, 'Yumɓu yana da ƙananan ramuka, ruwa yana iya ratsawa ta cikinsa. Filastik ba ya barin ruwa ya ratsa.', 'Clay has tiny pores, so water can pass through it. Plastic does not let water through.'],
      [null, 'Yashi yana riƙe ruwa. Kwalbar filastik tana da sauƙi, tana riƙe ruwa, kuma ana samunta a ko’ina.', 'Sand holds water. A plastic bottle is light, holds water and is easy to find.'],
      [null, 'Ko da yaushe ka tambayi: me ya sa aka zaɓi wannan kayan? Menene iyakarsa?', 'Always ask: why was this material chosen? What is its limit?']]),
    page('❄️', 'Kimiyya: na’urar sanyaya', 'Science: the cooler', [
      [null, 'Idan ruwa yana ƙafewa, yana ɗaukar zafi daga abin da ke kewaye da shi. Don haka cikin na’urar yana yin sanyi.', 'When water evaporates it takes heat from what is around it. So the inside of the cooler gets cooler.'],
      [null, 'Zafi, bushewar iska da iska mai motsi suna sa ƙafewa ya yi sauri. A rana mai ɗanshi, ƙafewa yana jinkiri.', 'Heat, dry air and moving air make evaporation faster. On a humid day, evaporation is slower.']]),
    page('🧼', 'Kimiyya: wurin wanke hannu', 'Science: the hand-washing station', [
      [null, 'Sabulu da gogewa suna cire datti da ƙwayoyin cuta daga fata, ruwa mai gudana kuma yana kwashe su.', 'Soap and rubbing lift dirt and germs off the skin, and running water carries them away.'],
      [null, 'Feda da ƙafa tana nufin ba ka taɓa famfo ko hannun da hannu mai datti ba.', 'A foot pedal means you do not touch a tap or handle with dirty hands.']]),
    page('💧', 'Kimiyya: ban ruwa da kwalba', 'Science: bottle drip watering', [
      [null, 'Ƙaramin rami yana barin ruwa ya fita a hankali. Dole iska ta shiga kwalbar domin ruwa ya fita.', 'A tiny hole lets water out slowly. Air has to get into the bottle for the water to come out.'],
      [null, 'Ruwa yana sauka kusa da tushen shuka, a hankali.', 'The water drips slowly, close to the plant’s roots.']]),
    page('🛠️', 'Me zai iya lalacewa?', 'What can go wrong?', [
      [null, 'Na’urar sanyaya: yashi ya bushe, a rana, ko rana mai ɗanshi.', 'Cooler: the sand dries out, it stands in the sun, or the day is humid.'],
      [null, 'Wurin wanke hannu: ruwa maras tsabta ko sabulu ya ƙare.', 'Hand-washing station: dirty water or no soap left.'],
      [null, 'Ban ruwa: ramin ya yi yawa ko ya toshe.', 'Drip bottle: the hole is too big or blocked.']]),
    page('📏', 'Gwaji mai adalci da aunawa', 'Fair testing and measuring', [
      [null, 'Canza abu ɗaya kawai a lokaci guda, sauran su zama iri ɗaya.', 'Change only one thing at a time and keep the rest the same.'],
      [null, 'Ka rubuta karatunka a tebur, ka kwatanta, sannan ka yanke shawara.', 'Write your readings in a table, compare them, then decide.']]),
    page('🧾', 'Nawa ne kuɗin ginawa?', 'How much will it cost?', [
      [null, 'Ka jera kayan aiki, ka rubuta farashin kasuwar yankinka, ka haɗa su waje ɗaya.', 'List the materials, write your local market price for each, and add them up.'],
      [null, 'Wannan shi ne kuɗin raka’a. Sai ka ƙara farashin sayarwa don ganin riba.', 'That is the unit cost. Then add a selling price to see the profit.']]),
  ],

  challenges: [
    predictC('predict', L('Wace na’urar sanyaya ce za ta fi sanyi a rana mai zafi da bushewa? (Dukansu suna da rigar da aka jiƙa a saman.)', 'Which cooler will stay coolest on a hot, dry day? (All three have a damp cloth on top.)'),
      [L('Yashi mai ɗanshi, a inuwa', 'Wet sand, in the shade'), L('Yashi busasshe, a rana', 'Dry sand, in the sun'), L('Yashi mai ɗanshi, a rana', 'Wet sand, in the sun')], 0,
      [row('Zafin waje', 'Outside air', '34 °C'), row('Yashi mai ɗanshi, inuwa', 'Wet sand, shade', '24 °C'), row('Yashi mai ɗanshi, rana', 'Wet sand, sun', '26 °C'), row('Yashi busasshe, rana', 'Dry sand, sun', '34 °C')],
      L('Yashi mai ɗanshi yana da ruwan da zai ƙafe, don haka yana ɗaukar zafi. Inuwa tana rage zafin da ke shigowa.', 'Wet sand has water that can evaporate, so it takes heat away. Shade reduces the heat coming in.')),
    simC('test', {
      title: L('Gwada na’urar sanyaya', 'Test the cooler'),
      intro: L('Canza saiti, ka yi gwaji, ka rubuta karatu.', 'Change the settings, run a test and record the reading.'),
      goal: L('Ka nemo saitin da ya fi sanyaya cikin na’urar.', 'Find the setting that keeps the inside coolest.'),
      unit: '°C', base: 34, better: 'low', minRuns: 3,
      vars: [
        { key: 'place', label: L('Ina aka ajiye na’urar?', 'Where is the cooler?'), options: [opt('shade', 'A inuwa', 'In the shade', 0), opt('sun', 'A rana', 'In the sun', 2)] },
        { key: 'sand', label: L('Yashi', 'The sand'), options: [opt('wet', 'Mai ɗanshi', 'Wet', -8), opt('dry', 'Busasshe', 'Dry', 0)] },
        { key: 'cloth', label: L('Rigar saman na’ura', 'Cloth on top'), options: [opt('damp', 'Rigar da aka jiƙa', 'Damp cloth', -2), opt('none', 'Babu riga', 'No cloth', 0)] }],
      explain: L('Saitin mafi sanyi shi ne inuwa, yashi mai ɗanshi da rigar da aka jiƙa. Kowanne yana taimaka wa ƙafewa ko rage zafi.', 'The coolest setting is shade, wet sand and a damp cloth. Each one helps evaporation or reduces heat.'),
    }),
    { ...sortC([
      item('🏺', 'good', 'Tukunyar yumɓu', 'Clay pot', 'Yumɓu yana da ƙananan ramuka, ruwa yana ratsawa.', 'Clay has tiny pores so water can pass through.'),
      item('🪣', 'poor', 'Bokitin filastik', 'Plastic bucket', 'Filastik ba ya barin ruwa ya ratsa, don haka ƙafewa a waje ya yi ƙaranci.', 'Plastic does not let water through, so there is little evaporation outside.'),
      item('🥣', 'poor', 'Kwanon ƙarfe', 'Metal bowl', 'Ƙarfe ba shi da ƙananan ramuka.', 'Metal has no pores.'),
      item('🏖️', 'good', 'Yashi mai ɗanshi tsakanin tukwane', 'Wet sand between the pots', 'Yana riƙe ruwa wanda zai ƙafe a hankali.', 'It holds water that evaporates slowly.')],
      { ask: L('Zaɓi mai kyau ne ga na’urar sanyaya?', 'Is it a good choice for the cooler?'),
        options: [{ kind: 'good', icon: '✅', label: L('Zaɓi mai kyau', 'Good choice') }, { kind: 'poor', icon: '❌', label: L('Ba shi da kyau', 'Poor choice') }] }), key: 'compare' },
    { ...sortC([
      item('🏜️', 'likely', 'Yashi ya bushe', 'The sand dried out', 'Ba ruwan da zai ƙafe, don haka babu sanyaya.', 'No water left to evaporate, so no cooling.'),
      item('☀️', 'likely', 'An ajiye ta a rana kai tsaye', 'It stands in direct sun', 'Rana tana ƙara zafi.', 'The sun adds heat.'),
      item('🌫️', 'likely', 'Rana mai ɗanshi sosai', 'A very humid day', 'Iska mai ɗanshi tana rage ƙafewa.', 'Humid air slows evaporation.'),
      item('🎨', 'unlikely', 'Launin rigar shuɗi ne', 'The cloth is blue', 'Launin riga ba shi da muhimmanci a nan.', 'The colour of the cloth does not matter here.'),
      item('🏷️', 'unlikely', 'An rubuta suna a kan tukunya', 'A name is written on the pot', 'Rubutu ba ya shafar ƙafewa.', 'Writing does not affect evaporation.')],
      { ask: L('Shin wannan zai iya sa na’urar ta kasa sanyaya?', 'Could this make the cooler fail?'),
        options: [{ kind: 'likely', icon: '⚠️', label: L('Eh, zai iya', 'Yes, likely') }, { kind: 'unlikely', icon: '✅', label: L('A’a, bai shafa ba', 'No, unlikely') }] }), key: 'faults' },
    planC('plan'),
    reflectC('present', L('Gabatar da ra’ayinka', 'Present your idea'), [
      L('Wace na’ura daga cikin uku ce za ta fi taimaka wa al’ummarka, kuma me ya sa?', 'Which of the three devices would help your community most, and why?'),
      L('Rubuta abubuwa uku da za su iya sa ta lalace, da gyara ɗaya.', 'Write three things that could make it fail, and one improvement.'),
      L('Nawa za ta ci, kuma wa zai saye ta?', 'What would it cost, and who would buy it?')]),
  ],

  quiz: [
    quest('Me ya sa yashi mai ɗanshi yake sanyaya cikin na’urar?', 'Why does the wet sand cool the inside of the cooler?',
      [['Ruwan da ke ƙafewa yana ɗaukar zafi', 'Water evaporating takes heat away'], ['Yashi yana da sanyi ta halitta', 'Sand is cold by nature'], ['Tukunya tana yin sanyi da kanta', 'The pot makes cold by itself']], 0,
      'Ƙafewar ruwa yana ɗaukar zafi daga kewaye.', 'Evaporation takes heat from the surroundings.'),
    quest('Me ya sa ake amfani da yumɓu ba filastik ba?', 'Why is clay used rather than plastic?',
      [['Yumɓu yana da ƙananan ramuka da ruwa ke ratsawa', 'Clay has tiny pores that water passes through'], ['Yumɓu ya fi nauyi', 'Clay is heavier'], ['Yumɓu ja ne', 'Clay is red']], 0,
      'Ruwa yana ratsa yumɓu kuma yana ƙafewa a waje.', 'Water passes through clay and evaporates outside.'),
    quest('A wace rana ce na’urar sanyaya za ta fi rashin aiki?', 'On which day will the cooler work least well?',
      [['Rana mai zafi da ɗanshi', 'A hot, humid day'], ['Rana mai zafi da bushewa', 'A hot, dry day'], ['Rana mai iska da bushewa', 'A windy, dry day']], 0,
      'Iska mai ɗanshi tana rage ƙafewa.', 'Humid air slows evaporation.'),
    quest('Me ya sa kwalbar ban ruwa take digowa a hankali?', 'Why does the drip bottle drip slowly?',
      [['Ramin ƙarami ne', 'The hole is tiny'], ['Kwalbar shuɗi ce', 'The bottle is blue'], ['Ruwan yana da sanyi', 'The water is cold']], 0,
      'Ƙaramin rami yana barin ruwa ya fita a hankali.', 'A tiny hole lets water out slowly.'),
    quest('Me ya sa feda ta ƙafa take da amfani a wurin wanke hannu?', 'Why is a foot pedal useful at a hand-washing station?',
      [['Ba ka taɓa famfo da hannu mai datti ba', 'You do not touch the tap with dirty hands'], ['Tana sa ruwa yayi sanyi', 'It makes the water cold'], ['Tana yin ƙara', 'It makes a noise']], 0,
      'Ba ka sake dasa datti a kan famfo ba.', 'You do not put dirt back on the tap.'),
  ],

  objectives: [
    L('Ka iya bayyana yadda kowace na’ura ta warware matsala.', 'You can explain how each device solves a problem.'),
    L('Ka iya kwatanta kayan aiki da dalilin zaɓe su.', 'You can compare materials and justify your choice.'),
    L('Ka iya hasashe, ka karanta teburin sakamako, ka bayyana shi.', 'You can predict, read a results table and explain it.'),
    L('Ka iya faɗar abubuwa uku da ke sa na’ura ta lalace da gyara ɗaya.', 'You can name three things that make a device fail and one improvement.'),
    L('Ka iya kimanta kuɗin gina na’ura da farashin sayarwa.', 'You can estimate the cost of a device and a selling price.'),
  ],
  rewards: { predict: 5, test: 10, compare: 5, faults: 5, plan: 10, present: 10 },
  competencies: ['materials', 'science', 'testing', 'problem-solving', 'business', 'presenting'],
}
