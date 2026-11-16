// PAPER AND CARDBOARD — Level 1 (ages 5–10): "Old Paper Gets a New Life". DRAFT: needs Hausa + safety review before publishing.
// Safe by design: children tear, soak, mash by hand, press and dry. Cutting tools, blenders and anything hot are adult-only.
import { L, page, K, S, proc, item, sortC, safetyC, quest, mission, hello } from './dsl.js'

const steps = {
  ptear: K('📄', 'Yaga takarda', 'Tear the paper', 'Yaga tsohuwar takarda zuwa ƙananan guntuka.', 'Tear old clean paper into small pieces.'),
  psoak: K('💧', 'Jiƙa a ruwa', 'Soak in water', 'Sa guntukan a cikin kwano da ruwa mai tsabta, ka bar su na wani lokaci.', 'Put the pieces in a bowl of clean water and leave them for a while.'),
  pmash: K('🥣', 'Dunƙule da hannu', 'Mash with your hands', 'Ka matse ka dunƙule takardar da ta jiƙe har ta zama kamar kwaɓa.', 'Squeeze and mash the soaked paper until it is like soft mush.'),
  pspread: K('🧺', 'Shimfiɗa a kan raga', 'Spread on a screen', 'Shimfiɗa kwaɓar a kan raga mai tsabta ko yadi, siriri.', 'Spread the mush thinly on a clean screen or cloth.'),
  ppress: K('🫳', 'Matse ruwa', 'Press out the water', 'Ka matse a hankali don ruwa ya fita.', 'Press gently so the water comes out.'),
  pdry: K('☀️', 'Busar da shi sosai', 'Dry it completely', 'Ka bar shi ya bushe sosai a inuwa mai iska. Takarda mai ɗanshi tana iya yin gyambo.', 'Let it dry completely in an airy place. Damp paper can grow mould.'),
  ptube: S('✂️', 'Yanka ɗan tsiri', 'Cut a strip', 'Babba ne ke yanka takarda da almakashi.', 'An adult cuts the paper strip with scissors.'),
  proll: K('🥫', 'Naɗa a kan gwangwani', 'Roll around a can', 'Ka naɗa tsiri a kan gwangwani mara komai da santsi.', 'Roll the strip around a smooth empty can.'),
  pfold: K('🪺', 'Nade ƙasa', 'Fold the bottom', 'Ka nade ƙasan tukunyar takardar ka matse.', 'Fold the bottom of the paper pot and press it flat.'),
  psoil: K('🌱', 'Saka ƙasa da iri', 'Add soil and a seed', 'Ka saka ƙasa da iri, ka zuba ruwa kaɗan. Ka wanke hannunka bayan haka.', 'Add soil and a seed, and water a little. Wash your hands afterwards.'),
}

export const paperL1 = mission({
  id: 'paper-l1',
  title: L('TSOHUWAR TAKARDA TA SAMI SABUWAR RAYUWA', 'OLD PAPER GETS A NEW LIFE'),
  description: L('Ka koyi yadda tsohuwar takarda da kwali za su zama abubuwa masu amfani.', 'Learn how old paper and cardboard become useful things.'),
  objectives: [
    L('Ka iya faɗar abubuwan takarda da kwali da za a iya sake amfani da su.', 'You can name paper and cardboard things we can reuse.'),
    L('Ka san matakan yin takarda ta sake amfani: yaga, jiƙa, dunƙule, shimfiɗa, busar.', 'You know the steps of making recycled paper: tear, soak, mash, spread, dry.'),
    L('Ka san ayyukan da manya kaɗai ke yi, kamar yanka da kaifi.', 'You know the jobs only adults do, like sharp cutting.'),
  ],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], reuse: 5, safety: 5, holder: 5, quiz: 5, finish: [10, 'Home Inventor'] },

  teach: [
    { emoji: '📦', title: hello, lines: [
      { text: L('Baba yana da tarin tsohuwar takarda da akwatuna. Za a jefar da su?', 'Baba has a pile of old paper and boxes. Should they be thrown away?') },
      { text: L('A’a! Za mu koyi yadda za su zama abubuwa masu amfani.', 'No! We will learn how they can become useful things.') }] },
    page('📄', 'Menene takarda da kwali?', 'What are paper and cardboard?', [
      [null, 'An yi takarda ne da ƙananan zaren tsirrai (fibres).', 'Paper is made of tiny plant fibres.'],
      [null, 'Kwali ya fi takarda kauri, wani lokaci yana da yadudduka da yawa.', 'Cardboard is thicker than paper and often has several layers.']]),
    page('🛠️', 'Abubuwan da za mu iya yi', 'Things we can make', [
      [null, 'Sabuwar takarda daga tsohuwa, mai riƙe fensir, akwatin ajiya, tukunyar iri, da mai tsara kayan rubutu.', 'New paper from old paper, a pencil holder, a storage box, a seedling pot and a desk organiser.'],
      [null, 'Muna amfani da abin da muke da shi, ba ma jefar da shi.', 'We use what we already have instead of throwing it away.']]),
    page('🌍', 'Me ya sa sake amfani yake da amfani?', 'Why is reuse useful?', [
      [null, 'Sake amfani yana rage shara.', 'Reusing cuts down waste.'],
      [null, 'Wani zai iya yin abubuwa daga tsohuwar takarda ya sayar.', 'Someone could make things from old paper and sell them.']]),
    page('⚠️', 'Tsaro', 'Safety', [
      [null, 'Manya ne kawai ke amfani da wuƙa, abin yanka mai kaifi, ko wuta. Kada ka ƙona takarda.', 'Only adults use knives, sharp cutters or fire. Never burn paper.'],
      [null, 'Kada ka yi amfani da takardar da ta ɗauki mai, abinci mai maiko, magani ko sinadari. Takarda mai ɗanshi tana yin gyambo, don haka a busar da ita. Ka wanke hannunka.', 'Do not use paper that held grease, medicine or chemicals. Damp paper can grow mould, so dry it well. Wash your hands.'],
      [null, 'Wannan wasa ne kawai.', 'This is a game only.']], true),
  ],

  steps,
  procedures: [
    proc('recycle', '♻️', 'Yin sabuwar takarda', 'Making recycled paper', ['ptear', 'psoak', 'pmash', 'pspread', 'ppress', 'pdry'],
      'Yaga, jiƙa, dunƙule, shimfiɗa, matse, busar.', 'Tear, soak, mash, spread, press, dry.', ['📄', 'Sabuwar takarda', 'Recycled paper']),
    proc('pot', '🌱', 'Tukunyar iri ta takarda', 'Paper seedling pot', ['ptube', 'proll', 'pfold', 'psoil'],
      'Yanka (babba), naɗa, nade, saka ƙasa.', 'Cut (adult), roll, fold, add soil.', ['🌱', 'Tukunyar iri', 'A seedling pot']),
  ],

  challenges: [
    { ...sortC([
      item('📦', 'yes', 'Akwatin kwali mai tsabta', 'A clean cardboard box', 'Za a iya sake amfani da shi.', 'It can be reused.'),
      item('📓', 'yes', 'Tsohon littafin rubutu', 'An old notebook', 'Takarda ce mai tsabta.', 'It is clean paper.'),
      item('📰', 'yes', 'Jarida', 'Newspaper', 'Ana amfani da ita wajen tukunyar iri.', 'It works for seedling pots.'),
      item('🍕', 'no', 'Akwatin da ya ɗauki abinci mai maiko', 'A box with greasy food on it', 'Maiko da abinci ba su da kyau a sake amfani.', 'Grease and food scraps are not good for reuse.'),
      item('🦠', 'no', 'Takarda mai gyambo', 'Mouldy paper', 'Gyambo yana da haɗari. Ka jefar.', 'Mould is harmful. Throw it away.')],
      { ask: L('Za a iya sake amfani da shi?', 'Can we reuse it?'),
        options: [{ kind: 'yes', icon: '♻️', label: L('Eh, za a iya', 'Yes, reuse it') }, { kind: 'no', icon: '🚫', label: L('A’a', 'No') }] }), key: 'reuse' },
    safetyC([
      item('📄', 'safe', 'Yaga takarda', 'Tearing paper', 'Wannan lafiya ne.', 'This is safe.'),
      item('💧', 'safe', 'Matse takarda da ta jiƙe', 'Squeezing soaked paper', 'Wannan lafiya ne.', 'This is safe.'),
      item('🔪', 'adult', 'Yanka da wuƙa ko abin yanka mai kaifi', 'Cutting with a knife or sharp cutter', 'Mai kaifi yana yanka hannu. Babba ne kawai.', 'Sharp tools cut skin. Only an adult.'),
      item('🔥', 'adult', 'Ƙona takarda', 'Burning paper', 'Wuta tana ƙonewa. Babba ne kawai, kuma ba mu ƙona ba.', 'Fire burns. We never burn paper in this lesson.'),
      item('🧪', 'adult', 'Amfani da takardar da ta ɗauki sinadari', 'Using paper that held chemicals', 'Kada ka taɓa ta. Ka gaya wa babba.', 'Do not touch it. Tell an adult.')]),
    { ...sortC([
      item('📜', 'yes', 'Bututun kwali', 'A cardboard tube', 'Yana tsaye kuma yana riƙe fensir.', 'It stands up and holds pencils.'),
      item('🥣', 'yes', 'Akwatin hatsi mara komai da tsabta', 'A clean empty cereal box', 'Ana iya yanka shi da taimakon babba.', 'An adult can help cut it.'),
      item('📔', 'yes', 'Murfin tsohon littafi', 'An old notebook cover', 'Yana da ƙarfi kaɗan.', 'It is a little stiff.'),
      item('🪟', 'no', 'Gilashi mai tsage', 'Broken glass', 'Mai haɗari. Kada ka taɓa.', 'Dangerous. Do not touch it.'),
      item('🫧', 'no', 'Takarda mai ɗanshi ƙwarai', 'Very wet paper', 'Ba ta riƙe siffa kuma tana iya yin gyambo.', 'It will not hold its shape and can grow mould.')],
      { ask: L('Za a iya yin mai riƙe fensir da shi?', 'Can we make a pencil holder with it?'),
        options: [{ kind: 'yes', icon: '✏️', label: L('Eh', 'Yes') }, { kind: 'no', icon: '❌', label: L('A’a', 'No') }] }), key: 'holder' },
  ],

  quiz: [
    quest('Daga me ake yin takarda?', 'What is paper made from?', [['Ƙananan zaren tsirrai', 'Tiny plant fibres'], ['Yashi', 'Sand'], ['Ƙarfe', 'Metal']], 0, 'An yi takarda daga zaren tsirrai (fibres).', 'Paper is made of plant fibres.'),
    quest('Menene mataki na farko na yin sabuwar takarda?', 'What is the first step in making recycled paper?', [['Yaga takarda', 'Tear the paper'], ['Ƙona takarda', 'Burn the paper'], ['Fenti', 'Paint it']], 0, 'Muna farawa da yaga takarda.', 'We start by tearing the paper.'),
    quest('Me ya kamata ka yi wa sabuwar takarda kafin amfani?', 'What must you do to new paper before using it?', [['Busar da ita sosai', 'Dry it completely'], ['Barin ta ta jiƙe', 'Leave it wet'], ['Ƙona ta', 'Burn it']], 0, 'Takarda mai ɗanshi tana iya yin gyambo.', 'Damp paper can grow mould.'),
    quest('Wa ke yanka da abin yanka mai kaifi?', 'Who uses a sharp cutter?', [['Babba', 'An adult'], ['Yaro shi kaɗai', 'A child alone'], ['Kowa', 'Anyone']], 0, 'Abin yanka mai kaifi yana cutarwa. Babba ne kawai.', 'Sharp cutters can hurt. Only an adult.'),
    quest('Za mu ƙona takarda a wannan darasi?', 'Do we burn paper in this lesson?', [['A’a, ba mu ƙonawa', 'No, never'], ['Eh', 'Yes'], ['Wani lokaci', 'Sometimes']], 0, 'Wuta tana da haɗari, ba ma ƙona takarda.', 'Fire is dangerous. We never burn paper.'),
    quest('Me ya sa sake amfani da takarda yake da kyau?', 'Why is reusing paper good?', [['Yana rage shara', 'It cuts down waste'], ['Yana ƙara shara', 'It makes more waste'], ['Babu amfani', 'It has no use']], 0, 'Sake amfani yana rage shara.', 'Reusing reduces waste.'),
  ],
})
