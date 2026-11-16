// HOME DEVICE — Level 1 (ages 5–10): "The Cooler Helper". Pot-in-pot cooler only. DRAFT: needs science + Hausa review before publishing.
// Written with the same shape as the other missions (see dsl.js). The real build (cutting, drilling, fire) is never asked of a child.
import { L, page, K, S, proc, item, sortC, safetyC, quest, mission, hello } from './dsl.js'
import { deviceMission } from './deviceMission.js'

const pick = (keys) => Object.fromEntries(keys.map((k) => [k, deviceMission.steps[k]]))
const coolerSteps = ['cpots', 'csand', 'cinner', 'cwet', 'cfood', 'ccover']

export const deviceL1 = mission({
  id: 'device-l1',
  title: L('MAI TAIMAKON SANYAYA ABINCI', 'THE COOLER HELPER'),
  description: L('Ka koyi yadda tukwane biyu masu yashi mai ɗanshi ke sanyaya abinci.', 'Learn how two clay pots with wet sand keep food cool.'),
  objectives: [
    L('Ka iya faɗar sassan na’urar sanyaya: tukwane biyu, yashi, ruwa da rigar da aka jiƙa.', 'You can name the parts of the cooler: two pots, sand, water and a damp cloth.'),
    L('Ka san cewa zafi yana lalata abinci, kuma na’urar sanyaya tana taimakawa.', 'You know hot weather can spoil food, and a cooler helps.'),
    L('Ka iya bambance matsala da mafita.', 'You can tell a problem from a solution.'),
    L('Ka san ayyukan da manya kaɗai ke yi.', 'You know which jobs are only for adults.'),
  ],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, who: 5, quiz: 5, finish: [10, 'Home Inventor'] },

  teach: [
    { emoji: '🍅', title: hello, lines: [
      { text: L('Mama tana da tumatur. A cikin zafi, tumatur yana laushi yana lalacewa da sauri.', 'Mama has tomatoes. In the heat, tomatoes go soft and spoil fast.') },
      { text: L('Wannan matsala ce. Za ka iya taimaka mata?', 'This is a problem. Can you help her?') }] },
    page('🔍', 'Matsala da mafita', 'Problem and solution', [
      [null, 'Matsala ita ce abin da ke damun mutane.', 'A problem is something that bothers people.'],
      [null, 'Mafita ita ce abin da ke warware matsalar.', 'A solution is something that fixes the problem.'],
      [null, 'Tumatur yana lalacewa matsala ce. Na’urar sanyaya mafita ce.', 'Spoiling tomatoes is a problem. A cooler is a solution.']]),
    page('🏺', 'Sassan na’urar sanyaya', 'The parts of the cooler', [
      [null, 'Tukwane biyu na yumɓu, ɗaya a cikin ɗaya.', 'Two clay pots, one inside the other.'],
      [null, 'Yashi mai ɗanshi a tsakanin su.', 'Wet sand between them.'],
      [null, 'Ruwa don jiƙa yashin.', 'Water to wet the sand.'],
      [null, 'Rigar da aka jiƙa a saman. Ana ajiye ta a inuwa.', 'A damp cloth on top. Keep it in the shade.']]),
    page('💨', 'Me ya sa abu mai ɗanshi yake sanyi?', 'Why does a wet thing feel cool?', [
      [null, 'Idan rigar da ta jiƙe ta bushe a iska, hannunka yana jin sanyi.', 'When a wet cloth dries in the wind, your arm feels cool.'],
      [null, 'Na’urar sanyaya tana amfani da wannan abu: yashi mai ɗanshi yana bushewa, abinci kuma yana yin sanyi.', 'The cooler uses the same idea: the wet sand dries and the food stays cool.']]),
    page('⚠️', 'Tsaro', 'Safety', [
      [null, 'Manya ne kawai ke yanka, huda, amfani da wuta ko dafa ruwa.', 'Only adults cut, drill, use fire or boil water.'],
      [null, 'Yi amfani da ruwa mai tsabta. Kada ka yi amfani da kwalba da aka sa sinadari ko magani a ciki. Wannan wasa ne kawai.', 'Use clean water. Never use a bottle that held chemicals or medicine. This is a game only.']], true),
    page('💰', 'Na’urar sanyaya tana da amfani', 'A cooler is useful', [
      [null, 'Na’urar sanyaya tana taimaka wa iyali su adana abinci.', 'A cooler helps a family keep food longer.'],
      [null, 'Wani zai iya yin ta ya sayar. Za ka kalli yadda ake yi.', 'Someone could make it and sell it. You will watch how it is made.']]),
  ],

  steps: pick(coolerSteps),
  procedures: [proc('cooler', '🏺', 'Tukwane biyu masu sanyaya abinci', 'Pot-in-pot cooler', coolerSteps,
    'Sanyaya: yashi mai ɗanshi da rigar da aka jiƙa. Babu wuta, babu yanka.', 'Cooling: wet sand and a damp cloth. No electricity and no cutting.', ['🏺', 'Na’urar sanyaya abinci', 'A food cooler'])],

  challenges: [
    sortC([
      item('🏺', 'yes', 'Tukunyar yumɓu', 'Clay pot', 'Ita ce babban sashen na’urar.', 'It is the main part of the cooler.'),
      item('🏖️', 'yes', 'Yashi mai ɗanshi', 'Wet sand', 'Yana tsakanin tukwanen kuma yana sanyaya.', 'It sits between the pots and keeps things cool.'),
      item('🧺', 'yes', 'Rigar da aka jiƙa', 'Damp cloth', 'Tana rufe saman na’urar.', 'It covers the top of the cooler.'),
      item('🛍️', 'no', 'Leda', 'Plastic bag', 'Ba a amfani da ita a wannan na’ura.', 'It is not used in this cooler.'),
      item('🔥', 'no', 'Gawayi mai zafi', 'Hot charcoal', 'Gawayi mai zafi yana ƙonewa kuma ba ya sanyaya.', 'Hot charcoal burns and does not cool.'),
      item('🍬', 'no', 'Sukari', 'Sugar', 'Sukari ba shi da aiki a na’urar sanyaya.', 'Sugar has no job in a cooler.')],
      { ask: L('Yana cikin na’urar sanyaya ko a’a?', 'Does it go in the cooler?'),
        options: [{ kind: 'yes', icon: '✅', label: L('Eh, yana ciki', 'Yes, it goes in') }, { kind: 'no', icon: '❌', label: L('A’a', 'No') }] }),
    safetyC([
      item('🍅', 'safe', 'Saka tumatur a ƙaramar tukunya', 'Putting tomatoes in the small pot', 'Wannan lafiya ne.', 'This is safe.'),
      item('💦', 'safe', 'Zuba ruwa mai tsabta a kan yashi', 'Pouring clean water on the sand', 'Wannan lafiya ne, babba yana kusa.', 'This is safe, with an adult nearby.'),
      item('🔪', 'adult', 'Yanka ko huda tukunya', 'Cutting or drilling a pot', 'Kayan huda suna da kaifi. Babba ne kawai.', 'Drills and knives are sharp. Only an adult.'),
      item('♨️', 'adult', 'Dafa ruwa ko amfani da wuta', 'Boiling water or using fire', 'Zafi yana ƙonewa. Babba ne kawai.', 'Heat burns. Only an adult.'),
      item('🧪', 'adult', 'Amfani da tsohuwar kwalbar sinadari', 'Using an old chemical bottle', 'Kada ka taɓa ta. Ka gaya wa babba.', 'Do not touch it. Tell an adult.')]),
    { ...sortC([
      item('🍅', 'needs', 'Mai sayar da tumatur a kasuwa', 'A tomato seller at the market', 'Tumatur ɗinsa yana lalacewa a rana.', 'His tomatoes spoil in the sun.'),
      item('🏠', 'needs', 'Iyali da ba su da firji', 'A family with no fridge', 'Suna buƙatar hanyar adana abinci.', 'They need a way to keep food.'),
      item('🍊', 'needs', 'Manomi mai ’ya’yan itace', 'A farmer with fruit to keep', '’Ya’yan itace suna lalacewa idan ba a adana su ba.', 'Fruit spoils if it is not kept well.'),
      item('🧊', 'notneed', 'Wanda ke da firji da wuta', 'Someone with a working fridge and electricity', 'Yana da wata hanyar sanyaya.', 'They already have a way to keep food cool.'),
      item('🍽️', 'notneed', 'Wanda ke ci abinci nan take', 'Someone who eats the food at once', 'Abincin ba ya jira ya lalace.', 'The food does not wait long enough to spoil.')],
      { ask: L('Wa ke buƙatar na’urar sanyaya?', 'Who needs a cooler?'),
        options: [{ kind: 'needs', icon: '✅', label: L('Yana buƙata', 'Needs one') }, { kind: 'notneed', icon: '❌', label: L('Bai buƙata sosai', 'Does not need one much') }] }), key: 'who' },
  ],

  quiz: [
    quest('Daga ina mai ƙirƙira yake farawa?', 'Where does an inventor start?', [['Daga matsala', 'With a problem'], ['Daga na’ura mai tsada', 'With an expensive machine'], ['Daga hutu', 'With a rest']], 0, 'Mai ƙirƙira yana farawa da gano matsala.', 'An inventor starts by finding a problem.'),
    quest('Me ke tsakanin tukwanen biyu?', 'What goes between the two pots?', [['Yashi mai ɗanshi', 'Wet sand'], ['Gawayi mai zafi', 'Hot charcoal'], ['Sukari', 'Sugar']], 0, 'Yashi mai ɗanshi yana tsakanin tukwanen.', 'Wet sand goes between the pots.'),
    quest('Me ake sa a saman na’urar?', 'What goes on top of the cooler?', [['Rigar da aka jiƙa', 'A damp cloth'], ['Dutse mai zafi', 'A hot stone'], ['Leda', 'A plastic bag']], 0, 'Ana rufe na’urar da rigar da aka jiƙa.', 'The cooler is covered with a damp cloth.'),
    quest('Wa ke huda ko yanka tukunya?', 'Who cuts or drills a pot?', [['Babba', 'An adult'], ['Yaro shi kaɗai', 'A child alone'], ['Kowa', 'Anyone']], 0, 'Kayan huda suna da kaifi. Babba ne kawai.', 'Drills and knives are sharp. Only an adult.'),
    quest('Wane ne mafita ga tumatur da ke lalacewa?', 'Which is a solution to spoiling tomatoes?', [['Na’urar sanyaya', 'A cooler'], ['Barin su a rana', 'Leaving them in the sun'], ['Jefar da su', 'Throwing them away']], 0, 'Mafita tana warware matsala. Na’urar sanyaya tana taimakawa.', 'A solution fixes a problem. A cooler helps.'),
    quest('A ina ya kamata a ajiye na’urar sanyaya?', 'Where should the cooler stand?', [['A inuwa', 'In the shade'], ['A cikin rana mai zafi', 'In the hot sun'], ['Kusa da wuta', 'Near a fire']], 0, 'Inuwa tana taimaka wa na’urar ta yi sanyi.', 'Shade helps the cooler stay cool.'),
  ],
})
