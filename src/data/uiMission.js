// New interface text for the TEACH → SHOW → PRACTICE → TEST → REWARD engine.
export const uiMission = {
  ha: {
    stageNames: ['Koyo', 'Kallo', 'Gwada', 'Ƙalubale', 'Tambayoyi', 'Kyauta'],
    whatIs: 'Menene shi?', whatDoes: 'Me yake yi?', whyNeeded: 'Me ya sa ake buƙata?', teachDone: 'Na gama koyo ➜', pageOf: '{n} / {m}',
    gShow: 'Kalli yadda ake yi. Za ka gwada da kanka nan gaba.', play: '▶ Kunna', pause: '⏸ Dakata', replay: '🔁 Sake kallo', prevStep: '⏮ Baya', nextStep: 'Gaba ⏭',
    stepN: 'Mataki na {n}', adultOnly: '👩🏾‍🏭 Manya masu horo ne kawai ke yin wannan', diffTitle: 'Abin da ya bambanta', watched: 'An kalla ✅',
    needShow: 'Ka kalli dukkan hanyoyin da farko.', gPractice: 'Yanzu ka gwada! Taɓa matakan bisa tsari. Za ka iya neman taimako.',
    practiceWrong: 'Ba wannan ba tukuna. Ka tuna abin da ka gani! 💪', hint: '💡 Taimako', practiceDone: 'Daidai! Ka yi shi duka! 🎉', needPractice: 'Ka kammala aƙalla ɗaya da farko.',
    gChallenge: 'Ga ƙalubale! Yi amfani da abin da ka koya.', continue: 'Ci gaba ➜', sortDone: 'Ka gama! ✅',
    formulaTitle: '📘 Koyi lissafin kasuwanci', formulaTotal: 'Jimillar kuɗi = kuɗin rogo + kuɗin sarrafawa + kuɗin ƙunshewa', formulaProfit: 'Riba = farashin sayarwa − jimillar kuɗi',
    formulaEx: 'Misali: 100 + 50 + 20 = ₦170. Idan ka sayar a ₦250, riba = ₦80.', needBiz: 'Yi lissafi da farko.',
    gQuiz: 'Yanzu zan tambaye ka abin da ka koya.', quizWrong: 'Ba daidai ba tukuna. Karanta bayani, sai ka sake gwadawa. Babu damuwa! 💛', explain: 'Bayani', tryAgain: 'Sake gwadawa',
    act_teach: 'Ya koyi abubuwan', act_show: 'Ya kalli hanyar sarrafawa', act_practice: 'Ya gwada sarrafawa (wasa)', act_challenge: 'Ya kammala ƙalubale', act_finish: 'Ya gama aikin',
  },
  en: {
    stageNames: ['Learn', 'Watch', 'Practice', 'Challenge', 'Quiz', 'Prize'],
    whatIs: 'What is it?', whatDoes: 'What does it do?', whyNeeded: 'Why do we need it?', teachDone: 'I finished learning ➜', pageOf: '{n} / {m}',
    gShow: 'Watch how it is done. You will try it yourself next.', play: '▶ Play', pause: '⏸ Pause', replay: '🔁 Watch again', prevStep: '⏮ Back', nextStep: 'Next ⏭',
    stepN: 'Step {n}', adultOnly: '👩🏾‍🏭 Only trained adults do this', diffTitle: 'What is different', watched: 'Watched ✅',
    needShow: 'Watch all the ways first.', gPractice: 'Now you try! Tap the steps in order. You can ask for help.',
    practiceWrong: 'Not this one yet. Remember what you saw! 💪', hint: '💡 Hint', practiceDone: 'Correct! You did it all! 🎉', needPractice: 'Finish at least one first.',
    gChallenge: 'Here is a challenge! Use what you learned.', continue: 'Continue ➜', sortDone: 'All done! ✅',
    formulaTitle: '📘 Learn the business sums', formulaTotal: 'Total money = cassava cost + processing cost + packaging cost', formulaProfit: 'Profit = selling price − total money',
    formulaEx: 'Example: 100 + 50 + 20 = ₦170. If you sell for ₦250, profit = ₦80.', needBiz: 'Do the sum first.',
    gQuiz: 'Now I will ask about what you learned.', quizWrong: 'Not right yet. Read the help, then try again. No worries! 💛', explain: 'Help', tryAgain: 'Try again',
    act_teach: 'Learned the basics', act_show: 'Watched a processing pathway', act_practice: 'Practised processing (game)', act_challenge: 'Finished a challenge', act_finish: 'Finished the mission',
  },
}

Object.assign(uiMission.ha, { stopAudio: 'Dakata', scriptTitle: 'Rubutun yin murya', scriptHelp: 'Kowane layi yana da suna. Ka yi rikodin sautin ka sa masa wannan sunan.' })
Object.assign(uiMission.en, { stopAudio: 'Stop', scriptTitle: 'Voice recording script', scriptHelp: 'Each line has an ID. Record it and name the file with that ID.' })

// Generic wording so the business challenge works for any mission
Object.assign(uiMission.ha, {
  raw: 'Kuɗin kayan da aka saya (₦)', objectivesTitle: 'Abin da za ka koya:', unknownChallenge: 'Ba za a iya buɗe wannan wasa a wannan sigar app ba.', predictPick: 'Ka zaɓi hasashenka tukuna.', predictCheck: 'Duba sakamako', modelNote: 'Wannan samfuri ne da lambobin misali, ba ma’aunin gaske ba.', predictRight: 'Hasashenka daidai ne!', predictWrong: 'Ba daidai ba, amma ka koya! Duba sakamakon.', simRun: 'Gwada', simReading: 'Karatu', simRuns: 'Gwaje-gwajenka', simNeed: 'Yi gwaje-gwaje daban-daban aƙalla {n}.', simWhich: 'Wane gwaji ne ya fi kyau?', simCorrect: 'Daidai! Ka karanta teburinka da kyau.', simWrong: 'Duba teburinka sake.', planTitle: '📊 Tsarin kasuwanci', planMat: 'Kayan aiki na na’ura ɗaya', planName: 'Suna', planCost: 'Kuɗi (₦)', planFixed: 'Kuɗin sau ɗaya, misali kayan aiki (₦)', planPrice: 'Farashin sayarwa (₦)', planUnits: 'Adadin da za ka sayar', planAdd: '+ Ƙara kayan aiki', planUnitCost: 'Kuɗin raka’a', planTotal: 'Jimillar kuɗin da aka kashe', planRevenue: 'Kuɗin shiga', planProfit: 'Riba', planBreak: 'Matakin daidaito (break-even)', planBreakUnits: 'raka’a', planBelow: 'Farashinka bai kai kuɗin raka’a ba. Za ka yi asara.', planNeed: 'Ka rubuta aƙalla kayan aiki ɗaya mai kuɗi, farashin sayarwa da adadin da za ka sayar.', reflectSave: 'Ajiye a fayil ɗina', reflectNeed: 'Ka rubuta ƙarin bayani a kowane akwati.', reflectSaved: 'An ajiye a fayil ɗinka. Malamin makarantarka zai iya gani idan ka shiga makaranta.', reflectPrivacy: 'Kada ka rubuta ainihin sunanka, lambar waya ko adireshinka.', portfolioBtn: '📁 Ayyukana', portfolioTitle: 'Ayyukana', portfolioEmpty: 'Ba ka ajiye aiki ba tukuna.', teacherFeedback: 'Ra’ayin malami', portfolioLocal: 'Ana nuna aikin da ke wannan na’ura kawai.', sc1: 'Yana buƙatar taimako sosai', sc2: 'Yana iya da ɗan taimako', sc3: 'Yana iya shi kaɗai', sc4: 'Yana iya shi kaɗai kuma yana bayyanawa ko gyarawa', bizNeed: 'Ka rubuta aƙalla kuɗi ɗaya da aka kashe da kuma farashin sayarwa, sai ka sake gwadawa.', gBusiness: 'Kayan da ba a sarrafa ba suna da arha. Sabon abu zai iya kawo riba. Rubuta lambobi!',
  formulaTotal: 'Jimillar kuɗi = kuɗin kaya + kuɗin sarrafawa + kuɗin ƙunshewa',
})
Object.assign(uiMission.en, {
  raw: 'Cost of the raw material (₦)', objectivesTitle: 'What you will learn:', unknownChallenge: 'This activity cannot be opened in this version of the app.', predictPick: 'Pick your prediction first.', predictCheck: 'See the result', modelNote: 'This is a model with example numbers, not a real measurement.', predictRight: 'Your prediction was right!', predictWrong: 'Not quite, but you learned something! Look at the result.', simRun: 'Run the test', simReading: 'Reading', simRuns: 'Your tests', simNeed: 'Run at least {n} different tests.', simWhich: 'Which test was best?', simCorrect: 'Correct! You read your table well.', simWrong: 'Look at your table again.', planTitle: '📊 Business plan', planMat: 'Materials for one unit', planName: 'Name', planCost: 'Cost (₦)', planFixed: 'One-off cost, for example tools (₦)', planPrice: 'Selling price (₦)', planUnits: 'Units you plan to sell', planAdd: '+ Add a material', planUnitCost: 'Unit cost', planTotal: 'Total cost', planRevenue: 'Revenue', planProfit: 'Profit', planBreak: 'Break-even', planBreakUnits: 'units', planBelow: 'Your price is below your unit cost. You would lose money.', planNeed: 'Enter at least one material with a cost, a selling price and the number of units.', reflectSave: 'Save to my portfolio', reflectNeed: 'Please write a little more in every box.', reflectSaved: 'Saved to your portfolio. Your school teacher can see it if you joined a school.', reflectPrivacy: 'Do not write your real name, phone number or address.', portfolioBtn: '📁 My projects', portfolioTitle: 'My projects', portfolioEmpty: 'You have not saved any work yet.', teacherFeedback: 'Teacher feedback', portfolioLocal: 'Showing only the work saved on this device.', sc1: 'Needs a lot of help', sc2: 'Can do it with some help', sc3: 'Can do it alone', sc4: 'Can do it alone and explain or improve it', bizNeed: 'Enter at least one cost and a selling price, then try again.', gBusiness: 'Raw materials are cheap. A new product can earn profit. Type some numbers!',
  formulaTotal: 'Total money = material cost + processing cost + packaging cost',
})

Object.assign(uiMission.ha, {
  kidOk: '👧🏾 Za ka iya taimakawa, babba yana kusa', mixedNote: 'Wasu matakai na manya ne kawai (👩🏾‍🏭). A wasu kuma za ka iya taimakawa (👧🏾) tare da babba.',
  safetyAsk: 'Zan iya yin wannan, ko sai babba?', canDo: 'Zan iya', askAdult: 'Sai babba',
})
Object.assign(uiMission.en, {
  kidOk: '👧🏾 You can help, with an adult nearby', mixedNote: 'Some steps are for adults only (👩🏾‍🏭). For others you can help (👧🏾) with an adult nearby.',
  safetyAsk: 'Can I do this, or does an adult need to?', canDo: 'I can', askAdult: 'Ask an adult',
})

// Accounts, schools/companies, premium
Object.assign(uiMission.ha, {
  ageLabel: 'Shekarunka (ba dole ba)', orgCodeLabel: 'Lambar makaranta ko kamfani (idan akwai)',
  orgCodeHelp: 'Idan malaminka ya ba ka lamba, rubuta ta. Malaminka zai iya ganin sunan wasanka da sakamakonka.',
  joinOk: 'An haɗa ka da {org}! ✅', joinBad: 'Lambar ba ta aiki, ko makarantar ta cika.', joinBtn: 'Shiga',
  mySchool: 'Makaranta ko kamfani', noSchool: 'Ba ka cikin wata makaranta ko kamfani.', leave: 'Fita',
  canSee: '{org} na iya ganin sunan wasanka da sakamakonka.', leaveConfirm: 'Ka fita daga wannan ƙungiya?',
  premiumLock: '⭐ Premium', premiumMsg: 'Wannan darasin na premium ne. Ka tambayi iyayenka ko malaminka.',
  deleteOnline: 'Share bayanaina na kan layi', deleteConfirm: 'Share dukkan bayananka, har na kan layi?',
  ageBands: { '': '—', '5-7': '5–7', '8-10': '8–10', '11-13': '11–13', '14-17': '14–17' },
})
Object.assign(uiMission.en, {
  ageLabel: 'Your age (optional)', orgCodeLabel: 'School or company code (if you have one)',
  orgCodeHelp: 'If your teacher gave you a code, type it. Your teacher can see your game name and your results.',
  joinOk: 'You joined {org}! ✅', joinBad: 'The code does not work, or the group is full.', joinBtn: 'Join',
  mySchool: 'School or company', noSchool: 'You are not in a school or company.', leave: 'Leave',
  canSee: '{org} can see your game name and your results.', leaveConfirm: 'Leave this group?',
  premiumLock: '⭐ Premium', premiumMsg: 'This lesson is premium. Ask your parent or teacher.',
  deleteOnline: 'Delete my online record', deleteConfirm: 'Delete all your data, including online?',
  ageBands: { '': '—', '5-7': '5–7', '8-10': '8–10', '11-13': '11–13', '14-17': '14–17' },
})

// Premium unlock screen
Object.assign(uiMission.ha, {
  unlockTitle: '⭐ Buɗe Premium', unlockIntro: 'Wasu darussa na premium ne. Iyaye ko babba ne ke biya, ba yaro ba.',
  activeUntil: 'Premium yana aiki har zuwa {date}.', activeNoEnd: 'Premium yana aiki.', premiumNow: 'An buɗe premium! 🎉',
  choosePlan: 'Zaɓi tsari', planDays: 'kwana {n}', payHow: 'Yadda ake biya', whatsappBtn: '💬 Tuntuɓi ta WhatsApp',
  noPlans: 'Ba a saka tsarin biyan kuɗi ba tukuna. Ka tuntuɓi mai kula da app.', iPaid: 'Na biya',
  refLabel: 'Lambar biyan kuɗi ko bayani (misali sunan wanda ya tura kuɗi)', contactLabel: 'Sunan ko lambar waya ta iyaye (ba dole ba)',
  sendPaid: 'Aika', sentOk: 'An aika! Za a duba, a buɗe maka da zarar an tabbatar. ✅', sendBad: 'Ba a iya aikawa. Ka duba ka sake gwadawa.',
  yourRequests: 'Buƙatunka', st_pending: 'Ana jira ⏳', st_approved: 'An amince ✅', st_rejected: 'An ƙi ❌',
  haveCode: 'Kana da lambar buɗewa?', codeLabel: 'Lambar buɗewa', redeemBtn: 'Buɗe', codeOk: 'An buɗe premium! 🎉',
  codeBad: 'Lambar ba ta aiki, ko an riga an yi amfani da ita.', lockBanner: '⭐ Wasu darussa na premium ne. Danna don buɗewa.',
  neverCard: 'Kada ka rubuta lambar katin banki, PIN ko kalmar sirri a nan. Ka tambayi iyayenka.',
})
Object.assign(uiMission.en, {
  unlockTitle: '⭐ Unlock Premium', unlockIntro: 'Some lessons are premium. A parent or adult pays, not the child.',
  activeUntil: 'Premium is active until {date}.', activeNoEnd: 'Premium is active.', premiumNow: 'Premium unlocked! 🎉',
  choosePlan: 'Choose a plan', planDays: '{n} days', payHow: 'How to pay', whatsappBtn: '💬 Contact on WhatsApp',
  noPlans: 'No payment plan has been set up yet. Please contact the app owner.', iPaid: 'I have paid',
  refLabel: 'Payment reference or note (for example the name of the sender)', contactLabel: 'Parent name or phone (optional)',
  sendPaid: 'Send', sentOk: 'Sent! We will check it and unlock for you as soon as it is confirmed. ✅', sendBad: 'Could not send. Check and try again.',
  yourRequests: 'Your requests', st_pending: 'Waiting ⏳', st_approved: 'Approved ✅', st_rejected: 'Not approved ❌',
  haveCode: 'Have an activation code?', codeLabel: 'Activation code', redeemBtn: 'Unlock', codeOk: 'Premium unlocked! 🎉',
  codeBad: 'The code does not work, or it was already used.', lockBanner: '⭐ Some lessons are premium. Tap to unlock.',
  neverCard: 'Never type a bank card number, PIN or password here. Ask your parent.',
})

Object.assign(uiMission.ha, { needInternet: 'Ana buƙatar intanet don saukar da darussa a karon farko. Ka haɗa intanet ka sake buɗe app ɗin.' })
Object.assign(uiMission.en, { needInternet: 'Internet is needed the first time to download the lessons. Connect and open the app again.' })

// Levels (age groups) and age
Object.assign(uiMission.ha, {
  ageLabel: 'Zaɓi shekarunka', ages: 'shekaru {a}–{b}', ageLocked: 'Wannan darasin na yara masu shekaru {n} zuwa sama ne. Idan ka kai wannan shekarun, ka zaɓi shekarunka a Saituna.',
  ageLockedShort: '🔒 Shekaru {n}+', withAdult: '⚠️ Tare da babba', ageBySchool: 'Makarantarka ko kamfaninka ne ke saita shekarunka.', ageSaved: 'An ajiye shekaru. ✅',
})
Object.assign(uiMission.en, {
  ageLabel: 'Choose your age', ages: 'ages {a}–{b}', ageLocked: 'This lesson is for children aged {n} and over. If you are, choose your age in Settings.',
  ageLockedShort: '🔒 Ages {n}+', withAdult: '⚠️ With an adult', ageBySchool: 'Your school or company sets your age.', ageSaved: 'Age saved. ✅',
})
