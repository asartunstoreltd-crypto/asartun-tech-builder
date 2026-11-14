// MISSION 06 — Build a simple robot. Same engine shape as the other missions.
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })
const K = (...a) => ({ ...S(...a), kid: true })
const L = (ha, en) => ({ ha, en })

export const robotMission = {
  id: 'robot',
  no: 6,
  mixed: true,
  title: L('GINA ƘARAMIN MUTUM-MUTUMI', 'BUILD A SIMPLE ROBOT'),
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, quiz: 5, finish: [10, 'Robot Builder'] },

  teach: [
    { emoji: '🧑🏾‍🏫', title: L('Sannu, ƙaramin mai ƙirƙira! 👋', 'Hello, young inventor! 👋'), lines: [
      { text: L('A makaranta, malama tana son ƙaramin mutum-mutumi (robot) da zai taimaka a aji.', 'At school a teacher wants a small robot to help in class.') },
      { text: L('Za ka iya koyon yadda ake gina shi ka taimaka mata?', 'Can you learn how to build one and help her?') }] },
    { emoji: '🤖', title: L('Menene mutum-mutumi?', 'What is a robot?'), lines: [
      { text: L('Mutum-mutumi na’ura ce da ke gani ko ji, tunani, sannan ta yi aiki.', 'A robot is a machine that senses, thinks, and then acts.') },
      { text: L('Gani/Ji → Tunani → Aiki', 'Sense → Think → Act') }] },
    { emoji: '⚠️', warn: true, title: L('Tsaro', 'Safety'), lines: [
      { text: L('Yi amfani da ƙananan baturi kawai (kamar AA). Kada ka taɓa wutar gida (soket).', 'Use only small batteries (like AA). Never touch mains sockets.') },
      { text: L('Kada ka haɗa gefen baturi biyu da waya kai tsaye: zai yi zafi sosai. Manya ne kawai ke yanka, ko amfani da manne mai zafi ko solder. Wannan wasa ne kawai.', 'Never join both ends of a battery with a wire: it gets very hot. Only adults cut, or use hot glue or soldering. This is a game only.') }] },
    { emoji: '🔋', title: L('Baturi', 'Battery'), lines: [
      { k: 'whatIs', text: L('Ƙaramin akwati da ke adana wuta.', 'A small container that stores power.') },
      { k: 'whatDoes', text: L('Yana ba mutum-mutumi wutar da yake buƙata.', 'It gives the robot the power it needs.') },
      { k: 'whyNeeded', text: L('Ba tare da wuta ba, babu sashin da zai yi aiki.', 'Without power nothing can work.') }] },
    { emoji: '🔌', title: L('Waya da maɓalli', 'Wires and switch'), lines: [
      { k: 'whatIs', text: L('Waya hanya ce ta wuta. Maɓalli yana buɗewa ko rufe hanyar.', 'A wire is a path for power. A switch opens or closes the path.') },
      { k: 'whatDoes', text: L('Maɓalli yana kunnawa da kashewa.', 'The switch turns the robot on and off.') },
      { k: 'whyNeeded', text: L('Don mu iya sarrafa mutum-mutumi da tsaro.', 'So we can control the robot safely.') }] },
    { emoji: '⚙️', title: L('Injin', 'Motor'), lines: [
      { k: 'whatIs', text: L('Ƙaramar na’ura da ke juyawa idan ta samu wuta.', 'A small machine that spins when it gets power.') },
      { k: 'whatDoes', text: L('Yana juya ƙafafu.', 'It turns the wheels.') },
      { k: 'whyNeeded', text: L('Shi ne yake sa mutum-mutumi ya motsa.', 'It is what makes the robot move.') }] },
    { emoji: '🛞', title: L('Ƙafafu da jiki', 'Wheels and body'), lines: [
      { k: 'whatIs', text: L('Ƙafafu suna juyawa. Jiki yana ɗaukar dukkan sassa.', 'Wheels roll. The body holds all the parts.') },
      { k: 'whatDoes', text: L('Ƙafafu suna kai mutum-mutumi wuri.', 'Wheels carry the robot along.') },
      { k: 'whyNeeded', text: L('Jiki mai ƙarfi yana kare sassan.', 'A strong body protects the parts.') }] },
    { emoji: '👁️', title: L('Na’urar ji (sensor)', 'Sensor'), lines: [
      { k: 'whatIs', text: L('Na’ura ce da ke gane abu, kamar cikas ko haske.', 'A part that notices things, like an obstacle or light.') },
      { k: 'whatDoes', text: L('Tana gaya wa kwakwalwa abin da ta gani.', 'It tells the brain what it noticed.') },
      { k: 'whyNeeded', text: L('Don mutum-mutumi kada ya buga bango.', 'So the robot does not bump into walls.') }] },
    { emoji: '🧠', title: L('Kwakwalwa (controller)', 'Brain (controller)'), lines: [
      { k: 'whatIs', text: L('Ƙaramar kwamfuta ce a cikin mutum-mutumi.', 'A tiny computer inside the robot.') },
      { k: 'whatDoes', text: L('Tana yanke shawara bisa abin da na’urar ji ta gaya mata.', 'It decides using what the sensor tells it.') },
      { k: 'whyNeeded', text: L('Ita ce ke sa mutum-mutumi ya yi tunani.', 'It is what lets the robot “think”.') }] },
    { emoji: '💰', title: L('Fasaha tana ƙara ƙima', 'Skills add value'), lines: [
      { text: L('Mutum-mutumi na iya ɗaukar kaya, tsaftacewa ko koyar da yara.', 'Robots can carry things, clean, or teach children.') },
      { text: L('Mai gina su yana samun ilimi da aiki. Kowanne yana da hanyarsa. Wasu matakai na manya ne. Za ka kalle su duka.', 'People who build them gain skills and jobs. Each has its own way. Some steps are for adults. You will watch them all.') }] },
  ],

  steps: {
    pbat: K('🔋', 'Baturi', 'Battery', 'Baturi yana ba da wuta.', 'The battery gives power.'),
    pwire: K('🔌', 'Waya', 'Wires', 'Waya tana ɗaukar wutar daga baturi.', 'Wires carry the power from the battery.'),
    pswitch: K('🔘', 'Maɓalli', 'Switch', 'Idan an kunna maɓalli, hanyar wutar ta cika.', 'When the switch is on, the path for power is complete.'),
    pmotor: K('⚙️', 'Injin ya juya', 'The motor spins', 'Injin yana karɓar wuta ya fara juyawa.', 'The motor gets power and starts to spin.'),
    pwheel: K('🛞', 'Ƙafa ta juya', 'The wheel turns', 'Injin yana juya ƙafa, sai mutum-mutumi ya ci gaba.', 'The motor turns the wheel and the robot moves.'),
    bsense: K('👁️', 'Na’urar ji ta ga cikas', 'The sensor sees an obstacle', 'Na’urar ji ta ga akwai abu a gaba.', 'The sensor notices something in front.'),
    bthink: K('🧠', 'Kwakwalwa ta yanke shawara', 'The brain decides', 'Kwakwalwa tana cewa: a tsaya a juya.', 'The brain decides: stop and turn.'),
    bact: K('🔄', 'Injin ya juya hanya', 'The motor turns away', 'Injin yana juya mutum-mutumi zuwa wata hanya.', 'The motor turns the robot another way.'),
    bgo: K('➡️', 'Ya ci gaba', 'The robot goes on', 'Mutum-mutumi ya ci gaba ba tare da bugu ba.', 'The robot goes on without bumping.'),
    rplan: K('✏️', 'Zana tsari', 'Draw the plan', 'Ana zana yadda mutum-mutumi zai yi kama.', 'Draw what the robot will look like.'),
    rparts: K('🧰', 'Tara sassa', 'Collect the parts', 'Ana tara sassan kit: injin, ƙafafu, baturi, waya, maɓalli.', 'Collect the kit parts: motor, wheels, battery, wires, switch.'),
    rframe: S('🔧', 'Gyara injin a jiki', 'Fix the motor to the body', 'Babba yana gyara injin a jikin mutum-mutumi.', 'An adult fixes the motor to the robot body.'),
    rwheel: K('🛞', 'Saka ƙafafu', 'Attach the wheels', 'Ana saka ƙafafu a kan injin.', 'Attach the wheels to the motor.'),
    rbat: S('🔋', 'Haɗa baturi', 'Connect the battery', 'Babba yana haɗa baturi da maɓalli.', 'An adult connects the battery and the switch.'),
    rtest: K('✅', 'Gwada a ƙasa', 'Test on the floor', 'Ana kunna maɓalli a gwada a ƙasa mai tsabta.', 'Switch it on and test on a clean floor.'),
  },
  procedures: [
    { id: 'power', emoji: '🔋', name: L('Yadda wuta ke tafiya', 'How power travels'), steps: ['pbat', 'pwire', 'pswitch', 'pmotor', 'pwheel'], result: { emoji: '🚗', name: L('Mutum-mutumi yana tafiya', 'A moving robot') },
      summary: L('Wuta tana fita daga baturi ta waya da maɓalli zuwa injin.', 'Power goes from the battery through wires and the switch to the motor.') },
    { id: 'brain', emoji: '🧠', name: L('Yadda mutum-mutumi ke yanke shawara', 'How a robot decides'), steps: ['bsense', 'bthink', 'bact', 'bgo'], result: { emoji: '🤖', name: L('Mutum-mutumi mai hankali', 'A smart robot') },
      summary: L('Gani → Tunani → Aiki, ana maimaitawa.', 'Sense → Think → Act, again and again.') },
    { id: 'car', emoji: '🚗', name: L('Gina ƙaramar mota', 'Building a toy robot car'), steps: ['rplan', 'rparts', 'rframe', 'rwheel', 'rbat', 'rtest'], result: { emoji: '🚗', name: L('Ƙaramar motar mutum-mutumi', 'A toy robot car') },
      summary: L('Gina mota: zana, tara sassa, babba yana haɗa injin da baturi, sai a gwada.', 'Car build: plan, parts, an adult fits the motor and battery, then test.') },
  ],

  challenges: [
    { type: 'sort', key: 'sort',
      ask: L('Wane aiki wannan sashi yake yi?', 'What job does this part do?'),
      options: [{ kind: 'power', icon: '⚡', label: L('Wuta', 'Power') }, { kind: 'move', icon: '🏃', label: L('Motsi', 'Movement') }, { kind: 'brain', icon: '🧠', label: L('Ji da tunani', 'Sensing and thinking') }],
      items: [
        { emoji: '🔋', kind: 'power', name: L('Baturi', 'Battery'), why: L('Baturi yana ba da wuta.', 'The battery gives power.') },
        { emoji: '⚙️', kind: 'move', name: L('Injin', 'Motor'), why: L('Injin yana juyawa yana motsa mutum-mutumi.', 'The motor spins and moves the robot.') },
        { emoji: '🛞', kind: 'move', name: L('Ƙafafu', 'Wheels'), why: L('Ƙafafu suna kai mutum-mutumi wuri.', 'Wheels carry the robot along.') },
        { emoji: '👁️', kind: 'brain', name: L('Na’urar ji', 'Sensor'), why: L('Na’urar ji tana gane abubuwa.', 'The sensor notices things.') },
        { emoji: '🧠', kind: 'brain', name: L('Kwakwalwa', 'Controller'), why: L('Kwakwalwa tana yanke shawara.', 'The controller makes decisions.') },
        { emoji: '🔌', kind: 'power', name: L('Waya', 'Wires'), why: L('Waya tana ɗaukar wutar zuwa sassan.', 'Wires carry power to the parts.') }] },
    { type: 'safety', key: 'safety', items: [
      { emoji: '🔘', kind: 'safe', name: L('Danna maɓallin mutum-mutumin da aka gama', 'Pressing the switch of a finished robot'), why: L('Wannan lafiya ne.', 'This is safe.') },
      { emoji: '🎨', kind: 'safe', name: L('Yi wa jikin mutum-mutumi ado da lambobi', 'Decorating the robot body with stickers'), why: L('Wannan lafiya ne.', 'This is safe.') },
      { emoji: '✂️', kind: 'adult', name: L('Yanka filastik da wuƙa', 'Cutting plastic with a knife'), why: L('Wuƙa tana da kaifi. Babba ne kawai.', 'Knives are sharp. Only an adult.') },
      { emoji: '🔥', kind: 'adult', name: L('Amfani da manne mai zafi ko solder', 'Using hot glue or a soldering iron'), why: L('Suna ƙonewa. Babba ne kawai.', 'They burn. Only an adult.') },
      { emoji: '⚡', kind: 'adult', name: L('Haɗa gefen baturi biyu da waya', 'Joining both ends of a battery with a wire'), why: L('Waya za ta yi zafi sosai. Kada ka yi, ka gaya wa babba.', 'The wire gets very hot. Never do it; tell an adult.') }] },
  ],

  quiz: [
    { q: L('Wane sashi ne yake ba da wuta?', 'Which part gives power?'),
      a: [L('Baturi', 'Battery'), L('Ƙafa', 'Wheel'), L('Jiki', 'Body')], c: 0,
      e: L('Baturi yana ba da wuta ga sauran sassan.', 'The battery gives power to the other parts.') },
    { q: L('Menene injin yake yi?', 'What does the motor do?'),
      a: [L('Yana juyawa idan ya samu wuta', 'It spins when it gets power'), L('Yana adana wuta', 'It stores power'), L('Yana ganin abu', 'It sees things')], c: 0,
      e: L('Injin yana juya ƙafafu har mutum-mutumi ya motsa.', 'The motor turns the wheels so the robot moves.') },
    { q: L('Wane ne daidai tsarin mutum-mutumi?', 'What is the right order for a robot?'),
      a: [L('Aiki → Tunani → Gani', 'Act → Think → Sense'), L('Gani → Tunani → Aiki', 'Sense → Think → Act'), L('Tunani → Aiki → Gani', 'Think → Act → Sense')], c: 1,
      e: L('Mutum-mutumi yana gani, sannan yana tunani, sannan yana aiki.', 'A robot senses first, then thinks, then acts.') },
    { q: L('Wane sashi ne yake yanke shawara?', 'Which part makes decisions?'),
      a: [L('Kwakwalwa (controller)', 'The brain (controller)'), L('Waya', 'Wires'), L('Ƙafa', 'Wheel')], c: 0,
      e: L('Kwakwalwa tana amfani da abin da na’urar ji ta gaya mata.', 'The controller uses what the sensor tells it.') },
    { q: L('Wa ke yanka filastik da wuƙa?', 'Who cuts plastic with a knife?'),
      a: [L('Babba', 'An adult'), L('Yaro shi kaɗai', 'A child alone'), L('Kowa', 'Anyone')], c: 0,
      e: L('Wuƙa tana da kaifi. Babba ne kawai.', 'Knives are sharp. Only an adult.') },
    { q: L('Me yake faruwa idan an kashe maɓalli?', 'What happens when the switch is off?'),
      a: [L('Hanyar wuta ta katse', 'The path for power is broken'), L('Injin yana ƙara sauri', 'The motor speeds up'), L('Baturi ya cika', 'The battery fills up')], c: 0,
      e: L('Maɓalli a kashe yana katse hanyar wuta, sai injin ya tsaya.', 'An off switch breaks the path, so the motor stops.') },
    { q: L('Me ya sa ba ma haɗa gefen baturi biyu da waya?', 'Why do we never join both ends of a battery with a wire?'),
      a: [L('Waya za ta yi zafi sosai', 'The wire gets very hot'), L('Zai yi kyau', 'It looks nice'), L('Yana ƙara wuta', 'It adds power')], c: 0,
      e: L('Wutar tana gudu da yawa, waya ta ƙone. Ka gaya wa babba.', 'Too much power flows and the wire burns. Tell an adult.') },
  ],
}
