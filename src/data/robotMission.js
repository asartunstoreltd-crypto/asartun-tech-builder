// MISSION 06 — Build a simple robot. Same engine shape as the other missions.
// S = step done by trained adults. K = step a child can help with (adult nearby).
const S = (emoji, ha, en, tha, ten) => ({ emoji, name: { ha, en }, text: { ha: tha, en: ten } })
const K = (...a) => ({ ...S(...a), kid: true })

export const robotMission = {
  id: 'robot',
  no: 6,
  mixed: true,
  title: { ha: 'GINA ƘARAMIN MUTUM-MUTUMI', en: 'BUILD A SIMPLE ROBOT' },
  stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'],
  rewards: { teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, 'Robot Builder'] },

  teach: [
    { emoji: '🧑🏾‍🏫', title: { ha: 'Sannu, ƙaramin mai ƙirƙira! 👋', en: 'Hello, young inventor! 👋' }, lines: [
      { text: { ha: 'Malamarmu tana son ƙaramin mutum-mutumi da zai taimaka a aji.', en: 'Our teacher wants a small robot to help in class.' } },
      { text: { ha: 'Za mu gina shi daga tsofaffin kayan da aka jefar. Za ka iya taimaka mana?', en: 'We will build it from old things people threw away. Can you help us?' } }] },
    { emoji: '♻️', title: { ha: 'Tsofaffin kaya abu na asali ne', en: 'Old things are resources' }, lines: [
      { text: { ha: 'Kwali, murfin kwalba da tsofaffin kayan wasa abubuwan asali ne.', en: 'Cardboard, bottle caps and old toys are resources.' } },
      { text: { ha: 'Idan an sarrafa su, sai su zama robot, sabon abu mai amfani.', en: 'When we process them, they become a robot, a useful new product.' } },
      { text: { ha: 'Abu na asali → Sarrafawa → Sabon abu → Amfani', en: 'Resource → Processing → New product → Value' } }] },
    { emoji: '🤖', title: { ha: 'Menene robot?', en: 'What is a robot?' }, lines: [
      { text: { ha: 'Robot na’ura ce da ke bin umarni don yin aiki.', en: 'A robot is a machine that follows instructions to do a job.' } },
      { text: { ha: 'Yawancin robot suna ganewa, suna tunani, sannan su yi aiki.', en: 'Most robots sense, think, and then act.' } },
      { text: { ha: 'Robot ba mai rai ba ne. Mutane ne ke gina shi da shirya shi.', en: 'A robot is not alive. People build it and program it.' } }] },
    { emoji: '🔩', title: { ha: 'Sassan robot', en: 'Parts of a robot' }, lines: [
      { text: { ha: 'Injin yana ba da motsi.', en: 'The motor gives movement.' } },
      { text: { ha: 'Baturi yana ba da wutar lantarki.', en: 'The battery gives electricity.' } },
      { text: { ha: 'Maɓalli yana kunnawa da kashewa, jiki kuma yana riƙe komai.', en: 'The switch turns it on and off, and the body holds everything together.' } }] },
    { emoji: '⚠️', warn: true, title: { ha: 'Tsaro', en: 'Safety' }, lines: [
      { text: { ha: 'Kada ka sa baturi a baki, musamman ƙaramin baturin maɓalli. Yana da haɗari sosai.', en: 'Never put a battery in your mouth, especially a small button battery. It is very dangerous.' } },
      { text: { ha: 'Kaifi, manne mai zafi da walda na manya ne kawai. Yaro yana taimako kawai a kusa da babba. Wannan wasa ne kawai.', en: 'Sharp tools, hot glue and soldering are for adults only. A child only helps with an adult nearby. This is a game only.' } }] },
    { emoji: '🧠', title: { ha: 'Robot yana bin umarni', en: 'A robot follows instructions' }, lines: [
      { text: { ha: 'Shirin robot jerin umarni ne mataki-mataki.', en: 'A robot’s program is a list of instructions, step by step.' } },
      { text: { ha: 'Idan umarni ya yi kuskure, robot ma ya yi kuskure.', en: 'If an instruction is wrong, the robot does the wrong thing.' } },
      { text: { ha: 'Gyara kuskuren shirin ana kiransa debugging.', en: 'Fixing a mistake in a program is called debugging.' } }] },
    { emoji: '👀', title: { ha: 'Na’urar ganewa', en: 'Sensors' }, lines: [
      { text: { ha: 'Na’urar ganewa (sensor) tana ba robot ji, kamar haske ko taɓawa.', en: 'A sensor gives a robot a sense, like light or touch.' } },
      { text: { ha: 'Robot mai na’urar haske zai iya bin haske, ya tsaya idan ya taɓa abu.', en: 'A robot with a light sensor can follow light, or stop when it touches something.' } },
      { text: { ha: 'A wannan aikin za mu koyi umarni da gina jiki da injin.', en: 'In this mission we learn instructions and building the body and motor.' } }] },
    { emoji: '🏭', title: { ha: 'Robot a rayuwa', en: 'Robots in real life' }, lines: [
      { text: { ha: 'Ana amfani da robot a masana’antu, gonaki da asibitoci.', en: 'Robots are used in factories, farms and hospitals.' } },
      { text: { ha: 'Suna taimakawa da aiki mai nauyi ko mai maimaitawa.', en: 'They help with heavy or repeating work.' } },
      { text: { ha: 'Mutane ne ke ƙera su, shirya su da gyara su.', en: 'People design, program and repair them.' } }] },
    { emoji: '💰', title: { ha: 'Sarrafawa yana ƙara ƙima', en: 'Processing adds value' }, lines: [
      { text: { ha: 'Tsofaffin kwali da murfi ba su da amfani, amma robot na wasa ko na koyarwa yana da ƙima.', en: 'Old cardboard and caps earn nothing, but a toy or teaching robot has value.' } },
      { text: { ha: 'Matashi mai fasaha zai iya koyar da yara ko gyara na’urori ya samu kuɗi.', en: 'A skilled young person can teach children or repair devices and earn money.' } },
      { text: { ha: 'Kowanne yana da hanyarsa. Za ka kalle su duka.', en: 'Each one has its own way of being made. You will watch them all.' } }] },
  ],

  steps: {
    sketch: K('✏️', 'A zana shirin', 'Draw the plan', 'A zana robot ɗin da kake so da sassansa.', 'Draw the robot you want and its parts.'),
    collectParts: K('📦', 'A tattara sassa', 'Collect parts', 'A tattara kwali, murfin kwalba da tsofaffin kayan da za a sake amfani da su.', 'Collect cardboard, bottle caps and old things to reuse.'),
    cutBody: S('✂️', 'A yanka jikin', 'Cut the body', 'Babba yana yanka kwali ko kofi don ya zama jikin robot.', 'An adult cuts cardboard or a cup to make the robot body.'),
    fixMotor: S('⚙️', 'A manne injin', 'Fix the motor', 'Babba yana manne ƙaramin injin a jikin robot.', 'An adult fixes a small motor to the robot body.'),
    addWheels: K('🛞', 'A saka ƙafafu', 'Add the wheels', 'A saka murfin kwalba a matsayin ƙafafu a kan ƙarfen injin, tare da babba.', 'Put bottle caps on the motor axle as wheels, with an adult.'),
    addWeight: K('⚖️', 'A saka ɗan nauyi', 'Add a small weight', 'A manne ƙaramin nauyi a gefe ɗaya na injin don ya girgiza.', 'Tape a small weight to one side of the motor so it shakes.'),
    wireSwitch: S('🔌', 'A haɗa waya da maɓalli', 'Wire the switch', 'Babba yana haɗa wayoyi da maɓalli.', 'An adult connects the wires and the switch.'),
    putBattery: S('🔋', 'A saka baturi', 'Insert the battery', 'Babba yana saka baturin AA a wurinsa. Ba a taɓa ƙaramin baturin maɓalli.', 'An adult inserts the AA battery. Small button batteries are never touched.'),
    testRun: K('▶️', 'A gwada', 'Test it', 'A kunna maɓallin a ƙasa mai santsi, babba yana kusa.', 'Press the switch on a smooth floor with an adult nearby.'),
    fixBug: K('🔎', 'A nemo matsalar', 'Find the problem', 'Idan bai yi aiki ba, a gaya wa babba ya duba wayoyi da baturi.', 'If it does not work, ask an adult to check the wires and the battery.'),
    cutStrips: S('📏', 'A yanka dogayen kwali', 'Cut cardboard strips', 'Babba yana yanka kwali ya zama dogayen sanduna.', 'An adult cuts cardboard into long strips.'),
    joinArm: K('📎', 'A haɗa hannu', 'Join the arm', 'A haɗa sandunan da ƙusoshin takarda don su motsa.', 'Join the strips with paper fasteners so they can move.'),
    attachSyringe: K('💉', 'A manne sirinji', 'Attach the syringes', 'A manne sirinji marasa allura da bututu a hannun. Ba a taɓa allura.', 'Attach needle-free syringes and tubing to the arm. Never touch a needle.'),
    fillWater: K('💧', 'A cika da ruwa', 'Fill with water', 'A cika sirinji da bututu da ruwa mai tsabta.', 'Fill the syringes and tubing with clean water.'),
    pressMove: K('👉', 'A matsa a ga hannu yana motsi', 'Press and watch it move', 'A matsa sirinji ɗaya don hannun ya ɗaga.', 'Press one syringe to make the arm lift.'),
    cardsGrid: K('🟦', 'A zana layuka a ƙasa', 'Draw a grid', 'A zana layuka a ƙasa ko takarda don ya zama taswira.', 'Draw a grid on the floor or paper to make a map.'),
    makeCards: K('🃏', 'A yi katunan umarni', 'Make command cards', 'A rubuta katunan: gaba, hagu, dama.', 'Write cards: forward, left, right.'),
    writeProgram: K('🧠', 'A rubuta shirin umarni', 'Write the program', 'A jera katunan don robot ya isa wurin da aka nufa.', 'Line up the cards so the robot reaches the goal.'),
    runProgram: K('🤖', 'Aboki ya zama robot', 'A friend acts as the robot', 'Aboki yana bin katunan daidai kamar robot.', 'A friend follows the cards exactly like a robot.'),
    debug: K('🔧', 'A gyara umarni', 'Fix the program', 'Idan robot ya yi kuskure, a canza katin da ya yi kuskure.', 'If the robot goes wrong, change the card that is wrong.'),
  },
  procedures: [
    { id: 'roller', emoji: '🛞', name: { ha: 'Robot mai ƙafafu', en: 'Rolling robot' }, steps: ['cutBody', 'fixMotor', 'addWheels', 'wireSwitch', 'putBattery', 'testRun', 'fixBug'], result: { emoji: '🤖', name: { ha: 'Robot mai tafiya', en: 'A robot that rolls' } },
      summary: { ha: 'Robot mai ƙafafu: jiki, injin, ƙafafu, waya da baturi, sannan gwaji.', en: 'Rolling robot: body, motor, wheels, wiring and battery, then a test.' } },
    { id: 'wobbler', emoji: '📳', name: { ha: 'Robot mai girgiza', en: 'Wobble robot' }, steps: ['collectParts', 'cutBody', 'fixMotor', 'addWeight', 'wireSwitch', 'putBattery', 'testRun'], result: { emoji: '📳', name: { ha: 'Robot mai girgiza', en: 'A robot that wobbles' } },
      summary: { ha: 'Robot mai girgiza: nauyi a gefe ɗaya na injin yana sa shi girgiza.', en: 'Wobble robot: a weight on one side of the motor makes it shake.' } },
    { id: 'arm', emoji: '🦾', name: { ha: 'Hannun robot na ruwa', en: 'Hydraulic robot arm' }, steps: ['sketch', 'cutStrips', 'joinArm', 'attachSyringe', 'fillWater', 'pressMove'], result: { emoji: '🦾', name: { ha: 'Hannu mai motsi', en: 'An arm that moves' } },
      summary: { ha: 'Hannun ruwa: matsa sirinji ɗaya, ruwa yana tura ɗayan, hannu yana ɗagawa. Ba ya amfani da wuta.', en: 'Hydraulic arm: press one syringe, water pushes the other, the arm lifts. It uses no electricity.' } },
    { id: 'program', emoji: '🧠', name: { ha: 'Shirya robot da katuna', en: 'Program a robot with cards' }, steps: ['cardsGrid', 'makeCards', 'writeProgram', 'runProgram', 'debug'], result: { emoji: '🎯', name: { ha: 'Robot ya isa wurin', en: 'The robot reaches the goal' } },
      summary: { ha: 'Shiri da katuna: a jera umarni, aboki ya bi su, a gyara kuskure.', en: 'Programming with cards: line up instructions, a friend follows them, fix mistakes.' } },
  ],

  challenges: [
    { type: 'sort', key: 'sort', items: [
      { emoji: '📦', kind: 'resource', name: { ha: 'Kwali', en: 'Cardboard box' }, why: { ha: 'Tsohon kwali abu na asali ne da za a sake amfani da shi.', en: 'Old cardboard is a resource that can be reused.' } },
      { emoji: '🤖', kind: 'product', name: { ha: 'Robot mai ƙafafu', en: 'Rolling robot' }, why: { ha: 'An gina shi daga sassa da yawa. Sabon abu ne.', en: 'It is built from many parts. It is a new product.' } },
      { emoji: '🧢', kind: 'resource', name: { ha: 'Murfin kwalba', en: 'Bottle caps' }, why: { ha: 'Ana iya amfani da su a matsayin ƙafafu. Abu na asali ne.', en: 'They can be used as wheels. They are a resource.' } },
      { emoji: '🦾', kind: 'product', name: { ha: 'Hannun robot na ruwa', en: 'Hydraulic arm' }, why: { ha: 'An yi shi da kwali da sirinji. Sabon abu ne.', en: 'It is made from cardboard and syringes. It is a new product.' } }] },
    { type: 'safety', key: 'safety', items: [
      { emoji: '✏️', kind: 'safe', name: { ha: 'Zana shirin robot', en: 'Draw a robot plan' }, why: { ha: 'Wannan lafiya ne.', en: 'This is safe.' } },
      { emoji: '▶️', kind: 'safe', name: { ha: 'Gwada robot a ƙasa, babba yana kusa', en: 'Test the robot on the floor with an adult nearby' }, why: { ha: 'Wannan lafiya ne tare da babba.', en: 'This is safe with an adult nearby.' } },
      { emoji: '🔋', kind: 'adult', name: { ha: 'Sa baturi ko ƙaramin baturin maɓalli a baki', en: 'Put a battery or button battery in your mouth' }, why: { ha: 'Kada ka yi. Yana da haɗari sosai. Ka gaya wa babba.', en: 'Never do it. It is very dangerous. Tell an adult.' } },
      { emoji: '🔪', kind: 'adult', name: { ha: 'Yanka kwali da wuƙa mai kaifi', en: 'Cut cardboard with a sharp blade' }, why: { ha: 'Kaifi na manya ne kawai.', en: 'Sharp tools are for adults only.' } },
      { emoji: '🔥', kind: 'adult', name: { ha: 'Amfani da manne mai zafi ko walda', en: 'Use a hot glue gun or solder' }, why: { ha: 'Zafi yana ƙone fata. Babba ne kawai.', en: 'Heat burns skin. Only an adult.' } }] },
    { type: 'business', key: 'business' },
  ],

  quiz: [
    { q: { ha: 'Menene robot?', en: 'What is a robot?' },
      a: [{ ha: 'Na’ura da ke bin umarni don yin aiki', en: 'A machine that follows instructions to do a job' }, { ha: 'Dabbar daji', en: 'A wild animal' }, { ha: 'Irin abinci', en: 'A kind of food' }], c: 0,
      e: { ha: 'Robot na’ura ce da mutane suka gina suka shirya ta.', en: 'A robot is a machine that people build and program.' } },
    { q: { ha: 'Me injin yake yi a robot?', en: 'What does the motor do in a robot?' },
      a: [{ ha: 'Yana ba da wuta', en: 'It gives power' }, { ha: 'Yana ba da motsi', en: 'It gives movement' }, { ha: 'Yana ba da haske', en: 'It gives light' }], c: 1,
      e: { ha: 'Injin yana juyawa ya motsa ƙafafu ko sassa.', en: 'The motor spins and moves the wheels or parts.' } },
    { q: { ha: 'Me baturi yake yi?', en: 'What does the battery do?' },
      a: [{ ha: 'Yana yanke kwali', en: 'It cuts cardboard' }, { ha: 'Yana ɗaure sassa', en: 'It holds parts together' }, { ha: 'Yana ba da wutar lantarki', en: 'It gives electricity' }], c: 2,
      e: { ha: 'Baturi yana ba injin wutar da yake buƙata.', en: 'The battery gives the motor the power it needs.' } },
    { q: { ha: 'Me za ka yi da ƙaramin baturin maɓalli?', en: 'What do you do with a small button battery?' },
      a: [{ ha: 'Na riƙe shi a baki', en: 'Hold it in my mouth' }, { ha: 'Na bar shi, na gaya wa babba', en: 'Leave it and tell an adult' }, { ha: 'Na jefa shi cikin abinci', en: 'Drop it in food' }], c: 1,
      e: { ha: 'Ƙaramin baturi yana da haɗari idan an haɗiye shi. Babba ne ke kula da shi.', en: 'A small battery is dangerous if swallowed. An adult handles it.' } },
    { q: { ha: 'Idan umarnin robot ya yi kuskure, me zai faru?', en: 'If a robot’s instruction is wrong, what happens?' },
      a: [{ ha: 'Zai yi kuskure', en: 'It will do the wrong thing' }, { ha: 'Zai gyara kansa', en: 'It fixes itself' }, { ha: 'Zai ɓace', en: 'It disappears' }], c: 0,
      e: { ha: 'Robot yana bin umarni daidai yadda aka rubuta su.', en: 'A robot follows instructions exactly as written.' } },
    { q: { ha: 'Menene ake kira gyara kuskuren shirin?', en: 'What do we call fixing a mistake in a program?' },
      a: [{ ha: 'Yanka kwali', en: 'Cutting cardboard' }, { ha: 'Ƙawata', en: 'Decorating' }, { ha: 'Debugging (gyaran kuskure)', en: 'Debugging' }], c: 2,
      e: { ha: 'Debugging yana nufin nemo da gyara kuskure a shiri.', en: 'Debugging means finding and fixing a mistake in a program.' } },
    { q: { ha: 'Wane aiki robot yake taimakawa da shi?', en: 'What work do robots help with?' },
      a: [{ ha: 'Aiki mai nauyi ko mai maimaitawa', en: 'Heavy or repeating work' }, { ha: 'Cin abinci', en: 'Eating food' }, { ha: 'Barci', en: 'Sleeping' }], c: 0,
      e: { ha: 'Robot yana taimaka wa mutane da aiki mai nauyi ko maimaituwa.', en: 'Robots help people with heavy or repeating jobs.' } },
  ],
}
