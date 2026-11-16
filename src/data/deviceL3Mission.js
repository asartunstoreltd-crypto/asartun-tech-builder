// HOME DEVICE — Level 3 (ages 14–17): "Design Your Own Solution". DRAFT: needs science + Hausa review before publishing.
// First release = teaching pages, a design-process demonstration, claim/safety sorting, the business sum and a calculation quiz.
// The design brief, experiment data table and presentation need the Phase 2 activity types.
// ALL NUMBERS ARE EXAMPLES, not measurements or real prices.
import { L, page, K, S, proc, item, sortC, safetyC, quest, mission, business } from './dsl.js'

const steps = {
  j1: K('🔍', 'Gano matsala', 'Identify the problem', 'Ka bayyana matsalar da wanda yake fama da ita.', 'State the problem and who has it.'),
  j2: K('🗣️', 'Tambayi masu amfani', 'Interview users', 'Ka tambayi aƙalla mutum uku, ka rubuta amsoshinsu.', 'Ask at least three people and write down their answers.'),
  j3: K('🧱', 'Zaɓi kayan aiki', 'Choose materials', 'Ka kwatanta kayan da ake da su, ka zaɓi mafi dacewa.', 'Compare the available materials and choose the most suitable.'),
  j4: K('🔬', 'Bayyana kimiyya', 'Explain the science', 'Ka bayyana dalilin da ya sa mafitarka za ta yi aiki.', 'Explain why your solution should work.'),
  j5: K('✏️', 'Zana tsari', 'Sketch the plan', 'Ka zana na’urar, ka rubuta sassanta da abin da za ka auna.', 'Draw the device, label the parts and say what you will measure.'),
  j6: S('🔨', 'Gina tare da babba', 'Build with an adult', 'Babba yana yin yanka da huda; kai kana taimakawa a sauran.', 'An adult does any cutting and drilling; you help with the rest.'),
  j7: K('🧪', 'Gwada ka rubuta', 'Test and record', 'Ka canza abu ɗaya kawai, ka ɗauki karatu fiye da ɗaya.', 'Change one thing only and take more than one reading.'),
  j8: K('🧮', 'Lissafa', 'Calculate', 'Ka nemo matsakaici da bambancin zafi.', 'Work out the averages and the temperature difference.'),
  j9: K('💰', 'Lissafa kuɗi da farashi', 'Work out cost and price', 'Ka nemo kuɗin raka’a, farashi, riba da matakin daidaito.', 'Work out unit cost, price, profit and break-even.'),
  j10: K('🔧', 'Gyara', 'Improve', 'Ka nemo rauni, ka gyara, ka kwatanta na farko da na yanzu.', 'Find the weak points, improve, and compare the first and improved designs.'),
  j11: K('🎤', 'Gabatar', 'Present', 'Ka bayyana matsala, mafita, abin da ka koya, da abin da za ka gyara.', 'Explain the problem, solution, what you learned and what you would change.'),
}
const keys = Object.keys(steps)

export const deviceL3 = mission({
  id: 'device-l3',
  title: L('ƘIRƘIRI MAGANIN MATSALARKA', 'DESIGN YOUR OWN SOLUTION'),
  description: L('Ƙirƙira, gwada kuma ka kare mafita don adana abinci, har da lissafin kuɗi.', 'Design, test and defend a food-storage solution, including the cost sums.'),
  objectives: [
    L('Ka iya gano matsala ka bincika masu amfani da ita.', 'You can identify a problem and research the people who have it.'),
    L('Ka iya bayyana kimiyyar da ke bayan mafita.', 'You can explain the science behind a solution.'),
    L('Ka iya tsara gwaji mai adalci, ka lissafa sakamako.', 'You can plan a fair test and calculate the results.'),
    L('Ka iya lissafa kuɗin raka’a, riba da matakin daidaito.', 'You can work out unit cost, profit and break-even.'),
    L('Ka iya kare shawarwarinka da shaida.', 'You can defend your decisions with evidence.'),
  ],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], claims: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Home Inventor'] },

  teach: [
    { emoji: '🧑🏾‍🔬', title: L('Aikin ƙirƙira', 'The design brief'), lines: [
      { text: L('Aikinka: ƙirƙiri mafita mai sauƙin kuɗi da za ta taimaka wa gidaje su rage ɓarnar abinci ko su adana abinci.', 'Your brief: design a low-cost solution that helps households reduce food waste or improve food storage.') },
      { text: L('Za ka yi aiki kamar ƙwararren mai ƙirƙira: bincike, tsari, gwaji, lissafi, da gabatarwa.', 'You will work like a real designer: research, plan, test, calculate and present.') },
      { text: L('Na’urar sanyaya ta tukwane biyu misali ne, ba amsa ba. Ƙirƙiri naka.', 'The pot-in-pot cooler is an example, not the answer. Design your own.') }] },
    page('🔄', 'Tunanin mai ƙirƙira', 'Design thinking', [
      [null, 'Gano matsala → Bincika masu amfani → Tsara → Gina tare da babba → Gwada → Gyara → Gabatar', 'Find the problem → Research users → Plan → Build with an adult → Test → Improve → Present'],
      [null, 'Na farko ba ya zama cikakke. Kuskure yana nuna mana abin da za mu gyara.', 'The first design is rarely perfect. Mistakes show us what to improve.']]),
    page('🗣️', 'Ka fahimci matsalar da mai amfani', 'Understand the problem and the user', [
      [null, 'Tambayi aƙalla mutum uku yadda abinci yake lalacewa a gidansu ko a wurin sayarwarsu.', 'Ask at least three people how food spoils in their home or stall.'],
      [null, 'Tambayoyi: Wane abinci ke lalacewa? Cikin kwanaki nawa? Me suke yi yanzu? Nawa suke asara?', 'Ask: Which food spoils? How fast? What do they do now? How much do they lose?'],
      [null, 'Rubuta abin da suka faɗa, ba abin da kake tsammani ba.', 'Write what people say, not what you expect.']]),
    page('🧱', 'Kayan aiki da halayensu', 'Materials and their properties', [
      [null, 'Yumɓu yana da ƙananan ramuka, don haka ruwa yana iya ratsawa ta cikinsa. Filastik ba ya barin ruwa ya ratsa.', 'Clay has tiny pores, so water can pass through it. Plastic does not let water through.'],
      [null, 'Ka kwatanta kayan: farashi, samuwa a yankinka, ƙarfi, da iyakokinsu.', 'Compare materials: cost, availability near you, strength and limits.'],
      [null, 'Yumɓu na iya fashewa idan ya faɗi. Ka yi tunanin madadi, misali tukunyar da aka riga aka yi amfani da ita.', 'Clay can crack if dropped. Think of alternatives, such as a second-hand pot.']]),
    page('🔬', 'Kimiyya a bayan sa', 'The science behind it', [
      [null, 'Idan ruwa yana ƙafewa, yana buƙatar kuzari. Yana ɗaukar wannan kuzari ne daga zafin abin da ke kewaye da shi, don haka kewayen yana yin sanyi.', 'When water evaporates it needs energy. It takes that energy as heat from its surroundings, so the surroundings get cooler.'],
      [null, 'Zafi, bushewar iska da iska mai motsi suna sa ƙafewa ya yi sauri. Iska mai ɗanshi tana rage shi.', 'Heat, dry air and moving air make evaporation faster. Humid air slows it down.'],
      [null, 'Don haka na’urar tana aiki mafi kyau a yanayi mai zafi da bushewa.', 'So this kind of cooler works best in hot, dry weather.']]),
    page('📋', 'Shirya gwaji mai adalci', 'Plan a fair test', [
      [null, 'Canza abu ɗaya kawai a lokaci guda, misali yashi mai ɗanshi da yashi busasshe.', 'Change one thing at a time, for example wet sand against dry sand.'],
      [null, 'Ka ajiye sauran abubuwa iri ɗaya: tukunya, wuri, da lokaci.', 'Keep everything else the same: pot, place and time.'],
      [null, 'Ka ɗauki karatu fiye da ɗaya, ka rubuta su a tebur.', 'Take more than one reading and write them in a table.']]),
    page('🧮', 'Lissafin sakamako', 'Calculate the results', [
      [null, 'Bambancin zafi (ΔT) = zafin waje − zafin ciki.', 'Temperature difference (ΔT) = outside temperature − inside temperature.'],
      [null, 'Matsakaici = jimillar karatu ÷ adadin karatu.', 'Average = total of the readings ÷ number of readings.'],
      [null, 'Misali (lambobin misali ne): waje 34, 35, 33 → matsakaici 34. Ciki 24, 25, 23 → matsakaici 24. ΔT = 10 °C.', 'Example (example numbers): outside 34, 35, 33 → average 34. Inside 24, 25, 23 → average 24. ΔT = 10 °C.']]),
    page('💰', 'Kuɗi da ƙima', 'Cost and value', [
      [null, 'Akwai kuɗin da ake kashewa sau ɗaya (misali kayan aiki) da kuɗin kayan kowace na’ura (kuɗin raka’a).', 'There is a one-off cost (for example tools) and the material cost of each unit (unit cost).'],
      [null, 'Kuɗin shiga = farashi × adadin da aka sayar. Riba = kuɗin shiga − jimillar kuɗin da aka kashe.', 'Revenue = price × units sold. Profit = revenue − total cost.'],
      [null, 'Matakin daidaito (break-even) = kuɗin sau ɗaya ÷ (farashi − kuɗin raka’a).', 'Break-even = one-off cost ÷ (price − unit cost).'],
      [null, 'Lambobin da ke wannan darasi misali ne kawai. Yi amfani da farashin kasuwar yankinka.', 'The numbers in this lesson are examples only. Use prices from your local market.']]),
    page('✅', 'Kula da inganci', 'Quality control', [
      [null, 'Ka tabbatar kowace na’ura iri ɗaya ce: girman tukunya, yawan yashi, babu tsaga.', 'Make every unit the same: pot size, amount of sand, no cracks.'],
      [null, 'Ka rubuta yadda za ka bincika kowace na’ura kafin ka ba mai saye.', 'Write how you will check each unit before giving it to a customer.']]),
    page('🌍', 'Muhalli da gaskiya', 'Environment and honesty', [
      [null, 'Ba ta buƙatar wutar lantarki, kuma tana amfani da kayan da ake da su a yankin.', 'It needs no electricity and uses local materials.'],
      [null, 'Kada ka ce na’urarka tana yin abin da ba ka gwada ba, misali warkar da cuta.', 'Never claim your device does something you did not test, such as curing sickness.'],
      [null, 'Ruwa mai tsayuwa na iya jawo sauro. Ka rufe shi ko ka zubar.', 'Standing water can attract mosquitoes. Cover it or empty it.']]),
    page('⚠️', 'Tsaro', 'Safety', [
      [null, 'Manya ne kawai ke yanka, huda, amfani da wuta ko dafa ruwa.', 'Only adults cut, drill, use fire or boil water.'],
      [null, 'Kada ka yi amfani da kwalba ko jarka da aka sa sinadari, mai ko magani a ciki. Wannan wasa ne kawai.', 'Never use a bottle or jerrycan that held chemicals, fuel or medicine. This is a game only.'],
      [null, 'Kada ka ajiye nama ko dafaffen abinci a wannan na’ura. Na kayan lambu da ’ya’yan itace ne.', 'Do not store raw meat or cooked food in this cooler. It is for vegetables and fruit.']], true),
    page('🎤', 'Gabatar da ra’ayinka', 'Present your idea', [
      [null, 'Ka bayyana matsalar, mafitarka, kayan da ka yi amfani da su, yadda take aiki, abin da ka koya, da abin da za ka gyara.', 'Explain the problem, your solution, the materials, how it works, what you learned and what you would improve.'],
      [null, 'Ka kare shawarwarinka da shaida daga gwajinka.', 'Defend your choices with evidence from your own test.'],
      [null, 'Ka gabatar a gaban ajinka ko iyalinka.', 'Present to your class or your family.']]),
  ],

  steps,
  procedures: [proc('journey', '🧭', 'Hanyar mai ƙirƙira', 'The designer’s journey', keys,
    'Daga matsala zuwa mafita da aka gwada: bincike, tsari, gwaji, lissafi, gyara, gabatarwa.', 'From problem to tested solution: research, plan, test, calculate, improve, present.', ['💡', 'Mafita da aka gwada', 'A tested solution'])],

  challenges: [
    { ...sortC([
      item('🌡️', 'evidence', 'Na’urarmu ta yi sanyi da 10 °C fiye da waje a karatu uku.', 'Our cooler was 10 °C cooler than outside in three readings.', 'Akwai karatu da aka auna.', 'There are measured readings to support it.'),
      item('🩺', 'claim', 'Wannan na’urar za ta warkar da cuta.', 'This cooler will cure sickness.', 'Ba a gwada ba, kuma ba a iya faɗa ba tare da shaida ba.', 'It was not tested, and cannot be said without evidence.'),
      item('🔌', 'evidence', 'Na’urar ba ta amfani da wutar lantarki.', 'The cooler uses no electricity.', 'Wannan gaskiya ce game da yadda aka tsara ta.', 'This is a fact about how it is designed.'),
      item('🛒', 'claim', 'Kowa zai saya.', 'Everyone will buy it.', 'Ba a tambayi masu saye ba tukuna.', 'No customers have been asked yet.')],
      { ask: L('Shaida ce ko da’awa da ba a tabbatar ba?', 'Is it backed by evidence, or not proven yet?'),
        options: [{ kind: 'evidence', icon: '📊', label: L('Akwai shaida', 'Backed by evidence') }, { kind: 'claim', icon: '❓', label: L('Ba a tabbatar ba', 'Not proven yet') }] }), key: 'claims' },
    safetyC([
      item('🗣️', 'safe', 'Tambayar masu amfani da rubuta amsa', 'Interviewing users and writing answers', 'Wannan lafiya ne.', 'This is safe.'),
      item('🌡️', 'safe', 'Karanta ma’aunin zafi da rubutawa', 'Reading a thermometer and recording it', 'Wannan lafiya ne.', 'This is safe.'),
      item('🔪', 'adult', 'Yanka ko huda tukunya ko jarka', 'Cutting or drilling a pot or jerrycan', 'Kayan huda suna da kaifi. Babba ne kawai.', 'Drills and knives are sharp. Only an adult.'),
      item('♨️', 'adult', 'Dafa ruwa ko amfani da wuta', 'Boiling water or using fire', 'Zafi yana ƙonewa. Babba ne kawai.', 'Heat burns. Only an adult.'),
      item('🧪', 'adult', 'Amfani da sinadari don tsabtace na’urar', 'Using chemicals to clean the device', 'Kada ka taɓa sinadari. Ka gaya wa babba.', 'Do not touch chemicals. Tell an adult.')]),
    business,
  ],

  quiz: [
    quest('Ka kwatanta yashi mai ɗanshi da busasshe a tukwane iri ɗaya, a inuwa ɗaya. Wane abu ne kake canzawa?', 'You compare wet sand with dry sand in identical pots in the same shade. What is the one thing you change?',
      [['Ko yashin yana da ɗanshi', 'Whether the sand is wet'], ['Girman tukunya', 'The size of the pot'], ['Wurin da aka ajiye', 'The place']], 0, 'A gwaji mai adalci ana canza abu ɗaya kawai.', 'In a fair test you change only one thing.'),
    quest('Zafin waje 34 °C, zafin ciki 24 °C. Menene ΔT?', 'Outside 34 °C, inside 24 °C. What is ΔT?',
      [['10 °C', '10 °C'], ['58 °C', '58 °C'], ['24 °C', '24 °C']], 0, 'ΔT = 34 − 24 = 10 °C.', 'ΔT = 34 − 24 = 10 °C.'),
    quest('Tukwane biyu suna kan ₦900, yashi da rigar kuma ₦100. Menene kuɗin raka’a?', 'Two pots cost ₦900 and the sand and cloth cost ₦100. What is the unit cost?',
      [['₦1,000', '₦1,000'], ['₦900', '₦900'], ['₦100', '₦100']], 0, '900 + 100 = ₦1,000 ga kowace na’ura.', '900 + 100 = ₦1,000 per unit.'),
    quest('Farashin sayarwa ₦1,800, kuɗin raka’a ₦1,000, ka sayar da guda 10. Babu wani kuɗi. Menene riba?', 'Selling price ₦1,800, unit cost ₦1,000, you sell 10. There is no other cost. What is the profit?',
      [['₦8,000', '₦8,000'], ['₦18,000', '₦18,000'], ['₦800', '₦800']], 0, 'Kuɗin shiga 18,000 − kuɗin da aka kashe 10,000 = ₦8,000.', 'Revenue 18,000 − cost 10,000 = ₦8,000.'),
    quest('Kuɗin sau ɗaya ₦2,000, farashi ₦1,800, kuɗin raka’a ₦1,000. Guda nawa ake sayarwa kafin a rufe kuɗin?', 'One-off cost ₦2,000, price ₦1,800, unit cost ₦1,000. How many units must you sell to cover the cost?',
      [['3', '3'], ['2', '2'], ['10', '10']], 0, '2,000 ÷ (1,800 − 1,000) = 2.5, don haka guda 3.', '2,000 ÷ (1,800 − 1,000) = 2.5, so 3 units.'),
    quest('Wane ne da’awa mai rauni?', 'Which is a weak claim?',
      [['Wannan na’urar tana sa abinci ya zama lafiya har abada.', 'This cooler makes food safe forever.'], ['Na auna zafin ciki sau uku.', 'I measured the inside temperature three times.'], ['Ba ta amfani da wutar lantarki.', 'It uses no electricity.']], 0, 'Ba a gwada “har abada” ba, don haka da’awa ce mara shaida.', '“Forever” was never tested, so it is a claim with no evidence.'),
    quest('A rana mai ɗanshi na’urar ba ta yi sanyi sosai ba. Wane gyara ne mai ma’ana a gwada na gaba?', 'On a humid day the cooler was not very cool. Which is a sensible improvement to test next?',
      [['A ajiye ta a inuwa inda iska ke motsi, a sake gwadawa', 'Keep it in the shade where air moves, then test again'], ['A cire yashin', 'Remove the sand'], ['A daina gwaji', 'Stop testing']], 0, 'Iska mai motsi tana taimaka wa ƙafewa. Ka gwada, ka auna.', 'Moving air helps evaporation. Test it and measure.'),
    quest('Wane ne binciken inganci mai kyau?', 'Which is a good quality check?',
      [['A duba kowace tukunya don tsaga, a yi amfani da yashi iri ɗaya', 'Check each pot for cracks and use the same amount of sand'], ['A yi wa kowace tukunya fenti ja', 'Paint every pot red'], ['A sayar da duka da sauri', 'Sell them all quickly']], 0, 'Inganci yana nufin kowace na’ura ta yi daidai.', 'Quality means every unit performs the same.'),
  ],
})
