// MISSION 04 — Organic waste and compost. Same engine shape as the other missions.
// S = step done by trained adults. K = step a child can help with (adult nearby).
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })
const K = (...a) => ({ ...S(...a), kid: true })

export const compostMission = {
  id: 'compost',
  no: 4,
  mixed: true,
  title: { ha: 'SHARA TA HALITTA DA TAKI', en: 'ORGANIC WASTE AND COMPOST' },
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Compost Champion'] },

  teach: [
    { emoji: '🧑🏾‍🌾', title: { ha: 'Sannu, ƙaramin mai ƙirƙira! 👋', en: 'Hello, young inventor! 👋' }, lines: [
      { text: { ha: 'A makarantarmu akwai lambu. Ganye da bawon kayan lambu sun taru da yawa.', en: 'Our school has a garden. Lots of leaves and vegetable peels have piled up.' } },
      { text: { ha: 'Mai lambu yana son ya ciyar da shuke-shuke. Za ka iya taimaka masa?', en: 'The gardener wants to feed the plants. Can you help him?' } }] },
    { emoji: '🌍', title: { ha: 'Shara ta halitta abu na asali ce', en: 'Organic waste is a resource' }, lines: [
      { text: { ha: 'Ganye da bawon ’ya’yan itace suna fitowa daga tsirrai. Abu na asali ne.', en: 'Leaves and fruit peels come from plants. They are a resource.' } },
      { text: { ha: 'Idan an sarrafa su, sai su zama taki, sabon abu mai amfani.', en: 'When we process them, they become compost, a useful new product.' } },
      { text: { ha: 'Abu na asali → Sarrafawa → Sabon abu → Amfani', en: 'Resource → Processing → New product → Value' } }] },
    { emoji: '🍌', title: { ha: 'Shara ta halitta', en: 'Organic waste' }, lines: [
      { text: { ha: 'Shara ta halitta tana fitowa daga tsirrai da abinci, kamar ganye, bawon ayaba da ciyawa.', en: 'Organic waste comes from plants and food, like leaves, banana peels and grass.' } },
      { text: { ha: 'Tana ruɓewa a hankali ta koma ƙasa. Wannan abu ne na halitta.', en: 'It slowly rots and turns back into soil. That is natural.' } },
      { text: { ha: 'Kwalba da gwangwani ba sa ruɓewa. Ba shara ta halitta ba ce.', en: 'Bottles and cans do not rot. They are not organic waste.' } }] },
    { emoji: '⚠️', warn: true, title: { ha: 'Tsaro', en: 'Safety' }, lines: [
      { text: { ha: 'Kada ka ci taki ko kayan da suka ruɓe. Ka wanke hannu da sabulu bayan ka taɓa su.', en: 'Never eat compost or rotten food. Wash your hands with soap after touching them.' } },
      { text: { ha: 'Kada ka taɓa kashin dabbobi ko ƙaya. Babba ne kawai ke haƙa ko juya tarin. Wannan wasa ne kawai.', en: 'Do not touch animal droppings or thorns. Only an adult digs or turns the pile. This is a game only.' } }] },
    { emoji: '🍂', title: { ha: 'Tarin taki', en: 'Compost heap' }, lines: [
      { k: 'whatIs', text: { ha: 'Tarin ganye da ragowar kayan lambu da ake bari su ruɓe.', en: 'A pile of leaves and plant scraps left to rot.' } },
      { k: 'whatDoes', text: { ha: 'Yana juyewa ya zama taki mai duhu da laushi.', en: 'It turns into dark, crumbly compost.' } },
      { k: 'whyNeeded', text: { ha: 'Taki yana ciyar da ƙasa don shuke-shuke su girma.', en: 'Compost feeds the soil so plants can grow.' } }] },
    { emoji: '🥬', title: { ha: 'Danye da busasshe', en: 'Greens and browns' }, lines: [
      { text: { ha: 'Danye: kayan da suke da ɗanshi, kamar bawon kayan lambu da sabuwar ciyawa.', en: 'Greens: wet material like vegetable peels and fresh grass.' } },
      { text: { ha: 'Busasshe: kayan busassu, kamar busasshen ganye da takarda.', en: 'Browns: dry material like dry leaves and paper.' } },
      { text: { ha: 'A haɗa su duka a layi-layi don taki ya yi kyau.', en: 'Mix both in layers to make good compost.' } }] },
    { emoji: '🪱', title: { ha: 'Ƙananan masu taimako', en: 'Tiny helpers' }, lines: [
      { text: { ha: 'Tsutsotsi da ƙananan halittu suna cin ragowar su mayar da su taki.', en: 'Worms and tiny living things eat the scraps and turn them into compost.' } },
      { text: { ha: 'Suna buƙatar iska da ɗanshi kaɗan, kamar soso da aka matse.', en: 'They need air and a little moisture, like a squeezed sponge.' } },
      { text: { ha: 'Shi ya sa ake juya tarin da yayyafa ruwa kaɗan.', en: 'That is why we turn the pile and sprinkle a little water.' } }] },
    { emoji: '🚫', title: { ha: 'Abin da ba a saka wa ba', en: 'What not to add' }, lines: [
      { text: { ha: 'Kada a saka filastik, gilashi, gwangwani ko batir. Ba sa ruɓewa.', en: 'Do not add plastic, glass, cans or batteries. They do not rot.' } },
      { text: { ha: 'Kada a saka nama, ƙashi ko mai. Suna jawo ƙudaje da beraye kuma suna wari.', en: 'Do not add meat, bones or oil. They attract flies and rats and smell bad.' } }] },
    { emoji: '💰', title: { ha: 'Sarrafawa yana ƙara ƙima', en: 'Processing adds value' }, lines: [
      { text: { ha: 'Ganye da bawon da aka jefar ba su da amfani, amma taki yana taimaka wa amfanin gona.', en: 'Thrown-away leaves and peels earn nothing, but compost helps crops grow.' } },
      { text: { ha: 'Manomi zai iya adana kuɗin taki ko ya sayar da takin.', en: 'A farmer can save money on fertiliser or sell the compost.' } },
      { text: { ha: 'Kowanne yana da hanyarsa ta sarrafawa. Za ka kalle su duka.', en: 'Each one has its own way of being made. You will watch them all.' } }] },
  ],

  steps: {
    collectLeaves: K('🍂', 'Tattara busasshen ganye', 'Collect dry leaves', 'A tattara busasshen ganye daga farfajiya.', 'Gather dry leaves from the yard.'),
    sortScraps: K('🗂️', 'Raba kayan', 'Sort the scraps', 'A raba kayan da suka ruɓe da waɗanda ba sa ruɓewa.', 'Separate what rots from what does not.'),
    digBase: S('⛏️', 'Shirya wuri', 'Prepare a spot', 'Babba yana share wuri a gefen lambu ya yi ƙasa mai laushi.', 'An adult clears a spot at the edge of the garden and loosens the soil.'),
    layer: K('🥬', 'A jera layi-layi', 'Build in layers', 'A shimfiɗa danye da busasshe layi-layi.', 'Spread greens and browns in layers.'),
    water: K('💧', 'A yayyafa ruwa', 'Sprinkle water', 'A yayyafa ruwa kaɗan har ya yi ɗanshi kamar soso da aka matse.', 'Sprinkle water until it feels like a squeezed sponge.'),
    turn: S('🔄', 'A juya tarin', 'Turn the pile', 'Babba yana juya tarin da farfaru don iska ta shiga.', 'An adult turns the pile with a fork so air can get in.'),
    wait: K('⏳', 'A jira ya ruɓe', 'Wait for it to rot', 'Kayan suna ruɓewa a hankali cikin makonni. Taki yana yin duhu kuma yana ƙamshin ƙasa.', 'The scraps slowly break down over weeks. The compost turns dark and smells like soil.'),
    useCompost: K('🌱', 'A yi amfani da shi', 'Use it', 'A shimfiɗa takin a gona don shuke-shuke su girma.', 'Spread the compost on the garden so plants grow well.'),
    binHoles: S('🪣', 'A huda akwati', 'Drill air holes', 'Babba yana huda ƙananan ramuka a akwati don iska ta shiga.', 'An adult drills small air holes in a bin.'),
    fillBin: K('🗑️', 'A cika akwatin', 'Fill the bin', 'A saka danye da busasshe a cikin akwatin layi-layi.', 'Add greens and browns to the bin in layers.'),
    cover: K('🧺', 'A rufe akwatin', 'Cover the bin', 'A rufe akwatin don kada ruwan sama ya yi masa yawa.', 'Cover the bin so rain does not soak it.'),
    spreadMulch: K('🌿', 'A shimfiɗa a kewayen shuka', 'Spread around plants', 'A shimfiɗa ganyen a kusa da shuka don ƙasa ta riƙe ɗanshi.', 'Spread the leaves around plants so the soil keeps its moisture.'),
    waterPlant: K('🚿', 'A shayar da shuka', 'Water the plants', 'A shayar da shuka da ruwa mai tsabta.', 'Water the plants with clean water.'),
    sieveCompost: K('🧺', 'A tace taki', 'Sieve the compost', 'A tace taki da ya nuna don a cire manyan guda.', 'Sieve the ripe compost to remove big pieces.'),
    mixSoil: K('🥄', 'A gauraya da ƙasa', 'Mix with soil', 'A gauraya taki da ƙasa a tukunya ko gona.', 'Mix the compost with soil in a pot or the garden.'),
    plant: K('🌱', 'A dasa shuka', 'Plant a seedling', 'A dasa ƙaramar shuka a ƙasar da aka gauraya.', 'Plant a small seedling in the mixed soil.'),
    washHands: K('🧼', 'A wanke hannu', 'Wash your hands', 'A wanke hannu da sabulu da ruwa mai tsabta bayan an taɓa shara.', 'Wash hands with soap and clean water after touching waste.'),
  },
  procedures: [
    { id: 'heap', emoji: '🍂', name: { ha: 'Tarin taki', en: 'Compost heap' }, steps: ['sortScraps', 'digBase', 'layer', 'water', 'turn', 'wait', 'useCompost'], result: { emoji: '🍂', name: { ha: 'Taki', en: 'Compost' } },
      summary: { ha: 'Tarin taki: ana jera danye da busasshe, a yayyafa ruwa, babba yana juyawa, sai a jira.', en: 'Compost heap: layer greens and browns, sprinkle water, an adult turns it, then wait.' } },
    { id: 'bin', emoji: '🪣', name: { ha: 'Akwatin taki', en: 'Compost bin' }, steps: ['sortScraps', 'binHoles', 'fillBin', 'water', 'cover', 'wait'], result: { emoji: '🪣', name: { ha: 'Taki daga akwati', en: 'Bin compost' } },
      summary: { ha: 'Akwatin taki: babba yana huda ramuka, sai a cika, a rufe, a jira.', en: 'Compost bin: an adult drills holes, then fill, cover and wait.' } },
    { id: 'mulch', emoji: '🌿', name: { ha: 'Ganyen rufe ƙasa', en: 'Leaf mulch' }, steps: ['collectLeaves', 'spreadMulch', 'waterPlant', 'washHands'], result: { emoji: '🌿', name: { ha: 'Ganyen rufe ƙasa', en: 'Leaf mulch' } },
      summary: { ha: 'Ganyen rufe ƙasa: ana tattara busasshen ganye a shimfiɗa a kusa da shuka.', en: 'Leaf mulch: gather dry leaves and spread them around plants.' } },
    { id: 'garden', emoji: '🪴', name: { ha: 'Amfani da taki', en: 'Using compost' }, steps: ['sieveCompost', 'mixSoil', 'plant', 'waterPlant', 'washHands'], result: { emoji: '🪴', name: { ha: 'Shuka mai ƙoshin lafiya', en: 'A healthy plant' } },
      summary: { ha: 'Amfani da taki: a tace, a gauraya da ƙasa, a dasa shuka, a shayar.', en: 'Using compost: sieve it, mix with soil, plant a seedling and water it.' } },
  ],

  challenges: [
    { type: 'sort', key: 'sort', items: [
      { emoji: '🍌', kind: 'resource', name: { ha: 'Bawon ayaba', en: 'Banana peels' }, why: { ha: 'Bawon ayaba yana fitowa daga tsiro. Abu na asali ne.', en: 'Banana peels come from a plant. They are a resource.' } },
      { emoji: '🍂', kind: 'product', name: { ha: 'Taki', en: 'Compost' }, why: { ha: 'Ana yin taki daga ragowar tsirrai. Sabon abu ne.', en: 'Compost is made from plant scraps. It is a new product.' } },
      { emoji: '🥬', kind: 'resource', name: { ha: 'Ragowar kayan lambu', en: 'Vegetable scraps' }, why: { ha: 'Ragowar kayan lambu za a iya sake amfani da su. Abu na asali ne.', en: 'Vegetable scraps can be used again. They are a resource.' } },
      { emoji: '🌿', kind: 'product', name: { ha: 'Ganyen rufe ƙasa', en: 'Leaf mulch' }, why: { ha: 'An yi shi daga busasshen ganye don kare ƙasa. Sabon abu ne.', en: 'It is made from dry leaves to protect soil. It is a new product.' } }] },
    { type: 'safety', key: 'safety', items: [
      { emoji: '🧼', kind: 'safe', name: { ha: 'Wanke hannu bayan taɓa shara', en: 'Wash hands after touching waste' }, why: { ha: 'Wannan lafiya ne kuma yana da muhimmanci.', en: 'This is safe and important.' } },
      { emoji: '💧', kind: 'safe', name: { ha: 'Yayyafa ruwa a tarin taki', en: 'Sprinkle water on the heap' }, why: { ha: 'Yayyafa ruwa lafiya ne.', en: 'Sprinkling water is safe.' } },
      { emoji: '⛏️', kind: 'adult', name: { ha: 'Haƙa ƙasa da fartanya', en: 'Dig the ground with a spade' }, why: { ha: 'Fartanya tana da nauyi da kaifi. Babba ne kawai.', en: 'A spade is heavy and sharp. Only an adult.' } },
      { emoji: '🐕', kind: 'adult', name: { ha: 'Kashin dabba a cikin ganye', en: 'Animal droppings among the leaves' }, why: { ha: 'Kada ka taɓa shi. Ka gaya wa babba.', en: 'Do not touch it. Tell an adult.' } },
      { emoji: '🌵', kind: 'adult', name: { ha: 'Ƙaya ko ciyawa mai kaifi', en: 'Thorns or sharp grass' }, why: { ha: 'Za su iya yanka hannu. Ka kira babba.', en: 'They can cut your hand. Call an adult.' } }] },
    { type: 'business', key: 'business' },
  ],

  quiz: [
    { q: { ha: 'Menene shara ta halitta?', en: 'What is organic waste?' },
      a: [{ ha: 'Ragowar tsirrai da abinci da ke ruɓewa', en: 'Plant and food scraps that rot naturally' }, { ha: 'Kwalbar filastik', en: 'A plastic bottle' }, { ha: 'Gilashin da ya karye', en: 'Broken glass' }], c: 0,
      e: { ha: 'Shara ta halitta tana fitowa daga tsirrai da abinci kuma tana ruɓewa.', en: 'Organic waste comes from plants and food, and it rots.' } },
    { q: { ha: 'Wane ne za a iya saka a cikin taki?', en: 'Which one can go into compost?' },
      a: [{ ha: 'Jakar filastik', en: 'A plastic bag' }, { ha: 'Bawon ayaba', en: 'Banana peel' }, { ha: 'Batir', en: 'A battery' }], c: 1,
      e: { ha: 'Bawon ayaba yana ruɓewa. Filastik da batir ba sa ruɓewa.', en: 'Banana peel rots. Plastic and batteries do not.' } },
    { q: { ha: 'Me ya sa ake juya tarin taki?', en: 'Why do we turn the compost pile?' },
      a: [{ ha: 'Don ya yi nauyi', en: 'To make it heavy' }, { ha: 'Don ƙudaje su zo', en: 'To bring flies' }, { ha: 'Don iska ta shiga', en: 'So air can get in' }], c: 2,
      e: { ha: 'Ƙananan masu taimako suna buƙatar iska don su mayar da ragowar taki.', en: 'The tiny helpers need air to turn the scraps into compost.' } },
    { q: { ha: 'Wane ne busasshe a cikin kayan taki?', en: 'Which one is a dry “brown” material?' },
      a: [{ ha: 'Sabon bawon kayan lambu', en: 'Fresh vegetable peels' }, { ha: 'Busasshen ganye', en: 'Dry leaves' }, { ha: 'Sabuwar ciyawa', en: 'Fresh grass' }], c: 1,
      e: { ha: 'Busasshen ganye busasshe ne. Bawo da sabuwar ciyawa kuma danye ne.', en: 'Dry leaves are brown. Peels and fresh grass are green.' } },
    { q: { ha: 'Me ya sa ba a saka nama da mai a taki?', en: 'Why do we not add meat and oil to compost?' },
      a: [{ ha: 'Suna jawo ƙudaje da beraye kuma suna wari', en: 'They attract flies and rats and smell bad' }, { ha: 'Suna sa taki ya fi kyau', en: 'They make it better' }, { ha: 'Suna ƙara iska', en: 'They add air' }], c: 0,
      e: { ha: 'Nama da mai ba su dace da tarin taki ba.', en: 'Meat and oil do not belong in a compost pile.' } },
    { q: { ha: 'Wa ke haƙa ko juya tarin taki da farfaru?', en: 'Who digs or turns the pile with a fork?' },
      a: [{ ha: 'Yaro shi kaɗai', en: 'A child alone' }, { ha: 'Babu kowa', en: 'Nobody' }, { ha: 'Babba', en: 'An adult' }], c: 2,
      e: { ha: 'Kayan aiki suna da nauyi da kaifi. Babba ne kawai ke yi.', en: 'Tools are heavy and sharp. Only an adult does it.' } },
    { q: { ha: 'Yaya ɗanshin tarin taki ya kamata ya kasance?', en: 'How wet should a compost pile feel?' },
      a: [{ ha: 'Ya jiƙe sosai kamar tafki', en: 'Soaking wet like a pond' }, { ha: 'Kamar soso da aka matse', en: 'Like a squeezed sponge' }, { ha: 'Ya bushe ƙwarai', en: 'Completely dry' }], c: 1,
      e: { ha: 'Ɗanshi kaɗan yana taimaka wa ƙananan halittu aiki.', en: 'A little moisture helps the tiny helpers work.' } },
  ],
}
