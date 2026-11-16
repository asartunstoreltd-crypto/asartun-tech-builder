// PAPER AND CARDBOARD — Level 2 (ages 11–13): "Paper Properties and Design". DRAFT: science, Hausa and safety need review.
// ALL NUMBERS in predictions/simulations are MODEL values (illustrative), never real measurements or prices.
import { L, page, K, S, proc, item, sortC, safetyC, quest, mission } from './dsl.js'
import { predictC, simC, planC, reflectC, opt, row } from './phase2dsl.js'
import { paperL1 } from './paperL1Mission.js'

export const paperL2 = mission({
  id: 'paper-l2',
  title: L('TAKARDA DA KWALI: KIMIYYA DA ƘIRA', 'PAPER AND CARDBOARD: SCIENCE AND DESIGN'),
  description: L('Ka bincika yadda takarda ke yin sabuwa, me ya sa siffa take ƙara ƙarfi, ka tsara kuma ka lissafa kuɗin mai riƙe fensir.', 'Explore how recycled paper forms, why shape adds strength, and design and cost a pencil holder.'),
  objectives: [
    L('Ka iya bayyana yadda zaren takarda ke haɗuwa idan an busar da shi.', 'You can explain how paper fibres tangle and bond when dried.'),
    L('Ka iya bayyana dalilin da ya sa siffa (bututu, naɗi) take ƙara ƙarfi.', 'You can explain why shape (a tube, a fold) adds strength.'),
    L('Ka iya aunawa, tsarawa, da lissafa kuɗin raka’a da riba.', 'You can measure, plan, and work out unit cost and profit.'),
    L('Ka iya gabatar da ƙirarka da bayyana abin da za ka gyara.', 'You can present your design and say what you would improve.'),
  ],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], predict: 5, strength: 10, choice: 5, safety: 5, plan: 10, present: 10, quiz: 5, finish: [10, 'Home Inventor'] },

  teach: [
    { emoji: '🗑️', title: L('Takardar da ake jefarwa', 'The paper we throw away'), lines: [
      { text: L('A makaranta da gida, ana jefar da takarda da kwali da yawa.', 'At school and at home, a lot of paper and cardboard is thrown away.') },
      { text: L('Za mu koyi dalilin da ya sa za a iya sake amfani da su, da yadda ake tsara abu mai amfani daga gare su.', 'We will learn why they can be reused, and how to design something useful from them.') }] },
    page('🧵', 'Kayan aiki da halayensu', 'Materials and their properties', [
      [null, 'Takarda an yi ta da ƙananan zaren tsirrai. Tana shan ruwa, kuma tana yin rauni idan ta jiƙe.', 'Paper is made of tiny plant fibres. It absorbs water and gets weaker when wet.'],
      [null, 'Kwali yana da yadudduka. Kwali mai raƙuman ruwa (corrugated) yana da layi mai lanƙwasa tsakanin lebur biyu.', 'Cardboard has layers. Corrugated cardboard has a wavy layer between two flat ones.']]),
    page('🔬', 'Kimiyya: yadda sabuwar takarda ke samuwa', 'Science: how recycled paper forms', [
      [null, 'A cikin ruwa, zaren takarda suna rabuwa da juna.', 'In water, the paper fibres separate from each other.'],
      [null, 'Idan aka shimfiɗa aka matse, ruwan yana fita, zaren suna haɗuwa da juna su manne, takarda kuma ta sake zama zane mai ƙarfi.', 'When the mixture is spread and pressed, the water leaves, the fibres tangle and stick together, and a sheet forms again.']]),
    page('🔬', 'Kimiyya: siffa tana ƙara ƙarfi', 'Science: shape adds strength', [
      [null, 'Takarda ɗaya lebur tana lankwasuwa da sauƙi. Idan ka naɗa ta zuwa bututu ko ka nade ta, tana riƙe nauyi sosai.', 'A single flat sheet bends easily. Rolled into a tube or folded, it holds much more weight.'],
      [null, 'Kwali mai raƙuman ruwa yana da ƙarfi saboda siffar layinsa mai lanƙwasa.', 'Corrugated cardboard is strong because of the shape of its wavy layer.'],
      [null, 'Siffa tana ƙara ƙarfi ba tare da ƙarin kayan aiki ba.', 'Shape adds strength without adding more material.']]),
    page('📏', 'Aunawa da tsara', 'Measure and plan', [
      [null, 'Ka auna da rula, ka zana tsari a takarda tukuna, ka yi alama kafin yanka.', 'Measure with a ruler, draw a plan on paper first and mark before cutting.'],
      [null, 'Yanka da kaifi na babba ne ko ana yi da taimakonsa.', 'Cutting with a sharp tool is for an adult, or done with one helping.']]),
    page('🧾', 'Kuɗi da ƙima', 'Cost and value', [
      [null, 'Takarda da kwali da aka sake amfani da su kusan kyauta ne, amma manne, lokaci da kayan aiki suna da farashi.', 'Reused paper and cardboard cost almost nothing, but glue, time and tools do have a cost.'],
      [null, 'Ka lissafa kuɗin raka’a, ka saita farashi, ka duba riba.', 'Work out the unit cost, set a price and check the profit.'],
      [null, 'Lambobin da ke wannan darasi misali ne. Yi amfani da farashin kasuwarka.', 'Numbers in this lesson are examples. Use your own market prices.']]),
    page('⚠️', 'Tsaro', 'Safety', [
      [null, 'Wuƙa, abin yanka mai kaifi da wuta na manya ne. Babba ne ke cire ƙusoshin ƙarfe (staples).', 'Knives, sharp cutters and fire are for adults. An adult removes staples.'],
      [null, 'Kada ka yi amfani da takardar da ta ɗauki maiko, magani ko sinadari. Takarda mai ɗanshi tana yin gyambo: ka busar da ita, ka yi amfani da ita da wuri.', 'Do not use paper that held grease, medicine or chemicals. Wet paper grows mould: dry it and use it soon.'],
      [null, 'Wannan wasa ne kawai.', 'This is a game only.']], true),
  ],

  steps: paperL1.steps,
  procedures: paperL1.procedures,

  challenges: [
    predictC('predict', L('Takarda iri ɗaya: wace siffa ce za ta riƙe littattafai mafi yawa a saman ta?', 'The same paper: which shape will hold the most books on top?'),
      [L('Lebur', 'Flat sheet'), L('Naɗaɗɗe zuwa bututu', 'Rolled into a tube'), L('Nade sau ɗaya', 'Folded once')], 1,
      [row('Lebur', 'Flat sheet', '1 littafi / book'), row('Nade sau ɗaya', 'Folded once', '3 littattafai / books'), row('Bututu', 'Tube', '7 littattafai / books')],
      L('Bututu yana raba nauyi a kewaye kuma yana da wuyar lankwasuwa. Wannan samfuri ne, ba ma’auni na gaske ba.', 'A tube spreads the load around and is hard to bend. This is a model, not a real measurement.')),
    simC('strength', {
      title: L('Gina ginshiƙin takarda', 'Build a paper column'),
      intro: L('Zaɓi siffa da yadudduka, ka ga littattafai nawa zai riƙe a samfurin.', 'Choose a shape and layers and see how many books it holds in the model.'),
      goal: L('Ka nemo ginshiƙi mafi ƙarfi.', 'Find the strongest column.'),
      unit: 'books', base: 1, better: 'high', minRuns: 3,
      vars: [
        { key: 'shape', label: L('Siffa', 'Shape'), options: [opt('flat', 'Lebur', 'Flat', 0), opt('fold', 'Nade', 'Folded', 2), opt('tube', 'Bututu', 'Tube', 6)] },
        { key: 'layers', label: L('Yadudduka', 'Layers'), options: [opt('one', 'Ɗaya', 'One', 0), opt('two', 'Biyu', 'Two', 2)] }],
      explain: L('Bututu mai yadudduka biyu ya fi ƙarfi: siffa da ƙarin yadudduka suna ƙara ƙarfi.', 'A tube with two layers is strongest: shape and extra layers both add strength.'),
    }),
    { ...sortC([
      item('📜', 'good', 'Bututun kwali mai kauri', 'A thick cardboard tube', 'Yana da ƙarfi kuma yana tsaye.', 'It is strong and stands up.'),
      item('📰', 'poor', 'Jarida mai sirara kaɗai', 'Thin newspaper alone', 'Tana lankwasuwa kuma ba ta riƙe siffa.', 'It bends and does not hold its shape.'),
      item('🍕', 'poor', 'Akwatin da ya ɗauki abinci mai maiko', 'A greasy food box', 'Ba shi da tsabta don riƙe abubuwa.', 'It is not hygienic.'),
      item('📦', 'good', 'Kwali mai raƙuman ruwa', 'Corrugated cardboard', 'Layinsa mai lanƙwasa yana ba shi ƙarfi.', 'Its wavy layer gives it strength.')],
      { ask: L('Zaɓi mai kyau ne don mai riƙe fensir?', 'Is it a good choice for a pencil holder?'),
        options: [{ kind: 'good', icon: '✅', label: L('Zaɓi mai kyau', 'Good choice') }, { kind: 'poor', icon: '❌', label: L('Ba shi da kyau', 'Poor choice') }] }), key: 'choice' },
    safetyC([
      item('📏', 'safe', 'Aunawa da zana tsari', 'Measuring and drawing a plan', 'Wannan lafiya ne.', 'This is safe.'),
      item('💧', 'safe', 'Jiƙa da dunƙule takarda', 'Soaking and mashing paper', 'Wannan lafiya ne.', 'This is safe.'),
      item('🔪', 'adult', 'Yanka kwali mai kauri da abin yanka mai kaifi', 'Cutting thick cardboard with a sharp cutter', 'Mai kaifi yana yanka hannu. Babba ne kawai.', 'Sharp tools cut skin. Only an adult.'),
      item('📎', 'adult', 'Cire ƙusoshin ƙarfe (staples)', 'Removing staples', 'Suna da kaifi. Babba ne kawai.', 'They are sharp. Only an adult.'),
      item('🔥', 'adult', 'Ƙona takarda', 'Burning paper', 'Wuta tana ƙonewa. Ba ma ƙona takarda.', 'Fire burns. We never burn paper.')]),
    planC('plan'),
    reflectC('present', L('Gabatar da mai riƙe fensirinka', 'Present your pencil holder'), [
      L('Wace matsala ce mai riƙe fensirinka yake warwarewa, kuma wa yake buƙatarsa?', 'What problem does your pencil holder solve, and who needs it?'),
      L('Wane kayan aiki ka yi amfani da su, kuma me ya sa ka zaɓe su?', 'Which materials did you use, and why did you choose them?'),
      L('Me za ka gyara a ƙirar ta biyu?', 'What would you improve in a second version?')]),
  ],

  quiz: [
    quest('Me ke faruwa da zaren takarda a cikin ruwa?', 'What happens to paper fibres in water?', [['Suna rabuwa da juna', 'They separate from each other'], ['Suna narkewa gaba ɗaya', 'They dissolve completely'], ['Suna zama ƙarfe', 'They turn to metal']], 0, 'Zaren suna rabuwa, daga baya su sake haɗuwa idan aka busar.', 'The fibres separate and then tangle together again when dried.'),
    quest('Me ya sa takarda mai ɗanshi take rauni?', 'Why is wet paper weak?', [['Zaren suna rabuwa da juna a cikin ruwa', 'The fibres separate from each other in water'], ['Tana yin nauyi sosai', 'It becomes very heavy'], ['Tana yin ja', 'It turns red']], 0, 'Ruwa yana raunana haɗin zaren.', 'Water weakens the hold between the fibres.'),
    quest('Me ya sa kwali mai raƙuman ruwa yake da ƙarfi?', 'Why is corrugated cardboard strong?', [['Layinsa mai lanƙwasa yana ƙara ƙarfi', 'Its wavy layer adds strength'], ['Yana da launi', 'It has a colour'], ['Yana da nauyi sosai', 'It is very heavy']], 0, 'Siffar lanƙwasa tana ƙara ƙarfi.', 'The wavy shape adds strength.'),
    quest('Wace siffa ce ta fi riƙe nauyi a samfurinmu?', 'Which shape held the most weight in our model?', [['Bututu', 'A tube'], ['Lebur', 'A flat sheet'], ['Duka iri ɗaya', 'All the same']], 0, 'Bututu yana raba nauyi.', 'A tube spreads the load.'),
    quest('Kuɗin raka’a ₦300, farashi ₦500, an sayar da 10, babu kuɗin sau ɗaya. Menene riba?', 'Unit cost ₦300, price ₦500, 10 sold, no one-off cost. What is the profit?', [['₦2,000', '₦2,000'], ['₦5,000', '₦5,000'], ['₦200', '₦200']], 0, 'Kuɗin shiga 5,000 − kuɗin da aka kashe 3,000 = ₦2,000.', 'Revenue 5,000 − cost 3,000 = ₦2,000.'),
    quest('Me ya kamata ka yi wa sabuwar takarda mai ɗanshi?', 'What should you do with damp recycled paper?', [['Busar da ita sosai ka yi amfani da ita da wuri', 'Dry it well and use it soon'], ['Ɓoye ta a jaka mai ɗumi', 'Hide it in a warm bag'], ['Ƙona ta', 'Burn it']], 0, 'Takarda mai ɗanshi tana yin gyambo.', 'Damp paper grows mould.'),
    quest('Wa ke cire ƙusoshin ƙarfe (staples) daga takarda?', 'Who removes staples from paper?', [['Babba', 'An adult'], ['Yaro shi kaɗai', 'A child alone'], ['Kowa', 'Anyone']], 0, 'Suna da kaifi. Babba ne kawai.', 'They are sharp. Only an adult.'),
  ],
})
