// Course C — Basic Digital Literacy (phone, calls, messages, chat apps, internet, searching, online safety and scams).
// The curriculum is DATA in this file so a native Hausa speaker can review ALL of its text in one place.
// STATUS: every Hausa sentence below is a DRAFT written for review. Check spelling and naturalness before learners use it.
//
// Marking: ONLY multiple-choice, "tap the right place" and "safe or scam?" steps exist, and all are marked automatically.
// Nothing is typed and no handwriting is involved. The screens are generic drawn phone screens: no real app logos or screenshots.
// Results are stored with the same fields as the other courses (pickRight / pickTotal), so no database change is needed to save progress.
//
// Texts: every string is registered by k(key, ha, en) into TEXT; strings.js merges TEXT, so both languages always exist together.
export const COURSE_SLUG = 'basic-digital'
export const TEXT = {}
const k = (key, ha, en) => {
  if (TEXT[key] && (TEXT[key][0] !== ha || TEXT[key][1] !== en)) throw new Error('digital.js: text key used twice with different words: ' + key)
  TEXT[key] = [ha, en]; return key
}
const q = (id) => id.replace(/-/g, '_')        // lesson id -> safe text-key part

// ---- common words
k('digitalTitle', 'Amfani da Waya da Intanet', 'Phone and Internet Skills')
k('dlSafe', 'Lafiya', 'Safe'); k('dlScam', 'Zamba ne', 'Scam')
k('dlScamAsk', 'Wannan saƙon lafiya ne, ko zamba ne?', 'Is this message safe, or is it a scam?')
k('dlFrom', 'Saƙo:', 'Message:'); k('dlWhy', 'Dalili:', 'Why:')
k('dlTapHint', 'Ka taɓa wurin da ya dace a kan allon.', 'Touch the right place on the screen.')
k('dlTapRight', 'Daidai ne!', 'Correct!'); k('dlTapWrong', 'Ba nan ba. Wurin da ya dace an nuna shi da kore.', 'Not there. The right place is shown in green.')
k('dlScreenLabel', 'Allon waya (hoto)', 'Phone screen (picture)')
k('dlPaidNote', 'Wannan darasi na biyan kuɗi ne.', 'This course is paid.')

// ---- drawn phone screens: x, y, w, h in a 200 x 330 picture. kind: 'btn' (can be tapped) or 'decor' (just drawn)
// Every label is a translated text; every tappable element has a label so the picture also works with a screen reader.
const lab = (id, ha, en) => k('ds_' + id, ha, en)
const E = (id, kind, x, y, w, h, ha, en, icon = '', color = '') => ({ id, kind, x, y, w, h, labelKey: lab(id, ha, en), icon, color })
export const SCREENS = {
  side: [   // the phone seen from the front, with its side buttons shown as big labelled boxes
    E('body', 'decor', 56, 20, 88, 290, 'Allo', 'Screen', '', 'dark'),
    E('volup', 'btn', 2, 70, 50, 44, 'Ƙara sauti', 'Volume up', '＋'), E('voldown', 'btn', 2, 120, 50, 44, 'Rage sauti', 'Volume down', '－'),
    E('power', 'btn', 148, 70, 50, 44, 'Maɓallin wuta', 'Power', '⏻'),
  ],
  home: [
    E('signal', 'btn', 12, 24, 52, 28, 'Sigina', 'Signal', '▂▄▆'), E('battery', 'btn', 140, 24, 48, 28, 'Baturi', 'Battery', '🔋'),
    E('phone', 'btn', 14, 70, 50, 62, 'Kira', 'Phone', '📞'), E('messages', 'btn', 75, 70, 50, 62, 'Saƙo', 'Messages', '✉'), E('chat', 'btn', 136, 70, 50, 62, 'Hira', 'Chat', '💬'),
    E('browser', 'btn', 14, 150, 50, 62, 'Intanet', 'Browser', '🌐'), E('camera', 'btn', 75, 150, 50, 62, 'Kamara', 'Camera', '📷'), E('settings', 'btn', 136, 150, 50, 62, 'Saiti', 'Settings', '⚙'),
  ],
  dialer: [
    E('number', 'decor', 14, 26, 172, 36, 'Lamba', 'Number', '0803…'),
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '＊', '0', '＃'].map((d, i) => E('key' + i, 'btn', 14 + (i % 3) * 60, 72 + Math.floor(i / 3) * 44, 52, 38, d, d, d)),
    E('callbtn', 'btn', 60, 256, 80, 48, 'Kira', 'Call', '📞', 'green'),
  ],
  incoming: [
    E('caller', 'decor', 14, 40, 172, 70, 'Mama', 'Mama', '📱'),
    E('msgreply', 'btn', 14, 124, 82, 52, 'Amsa da saƙo', 'Reply by message', '✉'), E('silence', 'btn', 104, 124, 82, 52, 'Yi shiru', 'Silence', '🔇'),
    E('answer', 'btn', 20, 200, 70, 70, 'Ɗaga', 'Answer', '📞', 'green'), E('reject', 'btn', 110, 200, 70, 70, 'Ƙi', 'Decline', '✖', 'red'),
  ],
  incall: [
    E('caller', 'decor', 14, 30, 172, 50, 'Mama', 'Mama', '00:42'),
    E('speaker', 'btn', 14, 110, 80, 56, 'Lasifika', 'Speaker', '🔊'), E('mute', 'btn', 106, 110, 80, 56, 'Yi shiru', 'Mute', '🔇'),
    E('endcall', 'btn', 60, 240, 80, 56, 'Ƙare kira', 'End call', '✖', 'red'),
  ],
  contacts: [
    E('c1', 'btn', 14, 40, 172, 44, 'Mama', 'Mama', '👤'), E('c2', 'btn', 14, 92, 172, 44, 'Malam Musa', 'Mr Musa', '👤'),
    E('addcontact', 'btn', 120, 250, 66, 52, 'Ƙara lamba', 'Add contact', '＋', 'green'),
  ],
  messages: [
    E('t1', 'btn', 14, 40, 172, 52, 'Aisha', 'Aisha', '✉'), E('t2', 'btn', 14, 100, 172, 52, 'Lamba da ba a sani ba', 'Unknown number', '✉'),
    E('newmsg', 'btn', 110, 250, 76, 52, 'Sabon saƙo', 'New message', '＋', 'green'),
  ],
  compose: [
    E('to', 'decor', 14, 30, 172, 36, 'Zuwa', 'To', '＋234…'), E('text', 'decor', 14, 76, 172, 96, 'Rubuta saƙo', 'Write a message', ''),
    E('send', 'btn', 120, 190, 66, 52, 'Aika', 'Send', '➤', 'green'), E('discard', 'btn', 14, 190, 66, 52, 'Soke', 'Cancel', '✖'), E('attach', 'btn', 14, 250, 66, 52, 'Liƙa', 'Attach', '📎'),
  ],
  chatlist: [
    E('ch1', 'btn', 14, 40, 172, 48, 'Mama', 'Mama', '💬'), E('ch2', 'btn', 14, 96, 172, 48, 'Rukunin unguwa', 'Neighbourhood group', '👥'),
    E('newchat', 'btn', 110, 250, 76, 52, 'Sabuwar hira', 'New chat', '＋', 'green'),
  ],
  chat: [
    E('bubble1', 'decor', 14, 34, 120, 40, 'Sannu', 'Hello', ''), E('bubble2', 'decor', 66, 84, 120, 40, 'Sannu, lafiya?', 'Hello, fine?', ''),
    E('textbox', 'decor', 14, 250, 100, 44, 'Rubuta', 'Type', ''), E('camerabtn', 'btn', 118, 250, 34, 44, 'Kamara', 'Camera', '📷'),
    E('mic', 'btn', 154, 250, 32, 44, 'Makirufo', 'Microphone', '🎤'), E('send', 'btn', 118, 200, 68, 40, 'Aika', 'Send', '➤', 'green'),
  ],
  browser: [
    E('addressbar', 'btn', 14, 26, 172, 40, 'Adireshi', 'Address bar', 'www.…'), E('padlock', 'btn', 14, 72, 60, 34, 'Makulli', 'Padlock', '🔒'),
    E('searchbox', 'btn', 14, 120, 172, 44, 'Akwatin bincike', 'Search box', '🔎'),
  ],
  results: [
    E('ad1', 'btn', 14, 40, 172, 58, 'Talla: Ka ci kyauta!', 'Ad: You won a prize!', 'Ad'), E('official', 'btn', 14, 108, 172, 58, 'example.gov.ng', 'example.gov.ng', '🏛'),
    E('blog', 'btn', 14, 176, 172, 58, 'Shafin wani mutum', 'Someone’s blog', '📝'),
  ],
  settings: [
    E('wifi', 'btn', 14, 36, 172, 40, 'Wi-Fi', 'Wi-Fi', '📶'), E('mobiledata', 'btn', 14, 84, 172, 40, 'Data ta waya', 'Mobile data', '📡'),
    E('sound', 'btn', 14, 132, 172, 40, 'Sauti', 'Sound', '🔊'), E('batterysetting', 'btn', 14, 180, 172, 40, 'Baturi', 'Battery', '🔋'),
    E('screenlock', 'btn', 14, 228, 172, 40, 'Kulle allo', 'Screen lock', '🔒'),
  ],
}

// ---- lesson builders. Each lesson: one teaching page (spoken with the phone's own voice if there is one), 2-3 questions, review.
let rot = 0
const tap = (id, n, ha, en, screen, target) => ({ type: 'tap', askKey: k(`dq_${q(id)}_${n}`, ha, en), screen, target })
// options: [[ha,en],...]; the FIRST option is the right one; the order shown is rotated so the right answer is not always first
const choice = (id, n, ask, opts, why) => {
  const keys = opts.map((o, i) => k(`do_${q(id)}_${n}_${i}`, o[0], o[1]))
  const shift = rot++ % keys.length
  const shown = [...keys.slice(shift), ...keys.slice(0, shift)]
  return { type: 'dchoice', promptKey: k(`dq_${q(id)}_${n}`, ask[0], ask[1]), optionKeys: shown, targetKey: keys[0], whyKey: why ? k(`dw_${q(id)}_${n}`, why[0], why[1]) : null }
}
const scam = (id, n, text, isScam, why) => ({ type: 'dchoice', cardKey: k(`dm_${q(id)}_${n}`, text[0], text[1]), promptKey: 'dlScamAsk', optionKeys: rot++ % 2 ? ['dlScam', 'dlSafe'] : ['dlSafe', 'dlScam'], targetKey: isScam ? 'dlScam' : 'dlSafe', whyKey: k(`dw_${q(id)}_${n}`, why[0], why[1]) })
const L = (id, unit, title, concept, steps) => ({ key: id, unit, title: { key: k('dt_' + q(id), title[0], title[1]), vars: {} }, steps: [{ type: 'teach', kind: 'concept', conceptKey: k('dc_' + q(id), concept[0], concept[1]) }, ...steps, { type: 'review' }] })
const U = (id, ha, en, lessons) => ({ id, titleKey: k('du_' + id, ha, en), start: 'digital', lessons })

export const UNITS = [
  U('phone', 'Waya', 'The phone', [
    L('d-power', 'phone', ['Kunna da kashe waya', 'Switching the phone on and off'], ['Maɓallin wuta yana gefen waya. Ka danna ka riƙe shi na ɗan lokaci don kunna ko kashe wayar.', 'The power button is on the side of the phone. Press and hold it for a moment to switch the phone on or off.'], [
      tap('d-power', 1, 'Ka taɓa maɓallin wuta.', 'Touch the power button.', 'side', 'power'),
      choice('d-power', 2, ['Yaya ake kunna waya?', 'How do you switch a phone on?'], [['Ka riƙe maɓallin wuta na ɗan lokaci', 'Hold the power button for a moment'], ['Ka girgiza wayar da ƙarfi', 'Shake the phone hard'], ['Ka danna maɓallin ƙara sauti sau ɗaya', 'Press the volume button once']]),
    ]),
    L('d-touch', 'phone', ['Taɓawa da zazzagawa', 'Touching and swiping'], ['Allon waya yana jin taɓawa. Ka taɓa da yatsa ɗaya don buɗe abu, ka zazzaga don motsa shafi.', 'The screen feels your touch. Tap with one finger to open something, and swipe to move the page.'], [
      tap('d-touch', 1, 'Ka taɓa manhajar Saiti.', 'Touch the Settings app.', 'home', 'settings'),
      choice('d-touch', 2, ['Yaya ake motsa shafi zuwa ƙasa?', 'How do you move a page down?'], [['Ka zazzaga da yatsa ɗaya', 'Swipe with one finger'], ['Ka buga allon da ƙarfi', 'Hit the screen hard'], ['Ka riƙe wayar sama', 'Hold the phone up high']]),
    ]),
    L('d-home', 'phone', ['Shafin gida da manhajoji', 'The home screen and apps'], ['Shafin gida yana nuna manhajoji. Kowace manhaja tana da hoto da suna, misali Kira, Saƙo da Kamara.', 'The home screen shows the apps. Each app has a picture and a name, for example Phone, Messages and Camera.'], [
      tap('d-home', 1, 'Ka nemo manhajar kira.', 'Find the phone-call app.', 'home', 'phone'),
      tap('d-home', 2, 'Ka nemo kamara.', 'Find the camera.', 'home', 'camera'),
    ]),
    L('d-volume', 'phone', ['Sauti', 'Sound and volume'], ['Maɓallan sauti suna gefen waya. Ɗaya yana ƙara sauti, ɗaya yana rage shi. Ana iya gyara sauti a Saiti ma.', 'The volume buttons are on the side of the phone. One makes the sound louder, the other quieter. You can also set the sound in Settings.'], [
      tap('d-volume', 1, 'Ka taɓa maɓallin ƙara sauti.', 'Touch the volume-up button.', 'side', 'volup'),
      tap('d-volume', 2, 'A ina ake gyara sauti a Saiti?', 'Where do you change the sound in Settings?', 'settings', 'sound'),
    ]),
    L('d-charge', 'phone', ['Baturi da caji', 'Battery and charging'], ['Waya tana buƙatar caji. Ka duba alamar baturi a saman allon. Ka nisanta caja daga ruwa.', 'A phone needs charging. Look at the battery sign at the top of the screen. Keep the charger away from water.'], [
      tap('d-charge', 1, 'Ka nuna alamar baturi.', 'Show the battery sign.', 'home', 'battery'),
      choice('d-charge', 2, ['Baturi ya yi ƙasa. Me za ka yi?', 'The battery is low. What do you do?'], [['Ka sa wayar a caji', 'Put the phone on the charger'], ['Ka sa wayar a ruwa', 'Put the phone in water'], ['Ka ci gaba da amfani na sa’o’i', 'Keep using it for hours']]),
    ]),
  ]),
  U('calls', 'Kira', 'Calls', [
    L('d-call-make', 'calls', ['Yin kira', 'Making a call'], ['Don yin kira, ka buɗe manhajar Kira, ka rubuta lambar, sannan ka taɓa maɓallin kore.', 'To make a call, open the Phone app, type the number, then touch the green button.'], [
      tap('d-call-make', 1, 'Ka buɗe manhajar Kira.', 'Open the Phone app.', 'home', 'phone'),
      tap('d-call-make', 2, 'Ka taɓa maɓallin kira (kore).', 'Touch the call button (green).', 'dialer', 'callbtn'),
    ]),
    L('d-call-answer', 'calls', ['Ɗaga kira ko ƙi', 'Answering or declining'], ['Idan wani ya kira, za ka ga sunansa ko lambarsa. Kore yana ɗagawa, ja yana ƙi.', 'When someone calls you will see their name or number. Green answers, red declines.'], [
      tap('d-call-answer', 1, 'Ka ɗaga kiran.', 'Answer the call.', 'incoming', 'answer'),
      tap('d-call-answer', 2, 'Ba ka son yin magana yanzu. Ka ƙi kiran.', 'You do not want to talk now. Decline the call.', 'incoming', 'reject'),
    ]),
    L('d-call-end', 'calls', ['Ƙare kira da lasifika', 'Ending a call, speaker'], ['Idan an gama magana, ka taɓa maɓallin ja don ƙare kira. Ana iya kunna lasifika don kowa ya ji.', 'When you have finished, touch the red button to end the call. You can turn on the speaker so others can hear.'], [
      tap('d-call-end', 1, 'Ka ƙare kiran.', 'End the call.', 'incall', 'endcall'),
      tap('d-call-end', 2, 'Ka kunna lasifika.', 'Turn on the speaker.', 'incall', 'speaker'),
    ]),
    L('d-contact', 'calls', ['Adana lamba', 'Saving a contact'], ['Za ka iya adana suna da lamba don ka samu mutum cikin sauƙi.', 'You can save a name and number so you can find a person easily.'], [
      tap('d-contact', 1, 'Ka ƙara sabuwar lamba.', 'Add a new contact.', 'contacts', 'addcontact'),
      choice('d-contact', 2, ['Me ya kamata ka adana a lamba?', 'What should you save in a contact?'], [['Suna da lambar waya', 'The name and phone number'], ['PIN ɗin bankinka kusa da lambar', 'Your bank PIN next to the number'], ['Kalmar sirrin wayarka', 'Your phone’s password']], ['PIN da kalmar sirri ba a adana su a lamba.', 'A PIN or password is never saved in a contact.']),
    ]),
  ]),
  U('texts', 'Saƙon rubutu', 'Text messages', [
    L('d-text-send', 'texts', ['Aika saƙon rubutu', 'Sending a text message'], ['Ka buɗe Saƙo, ka fara sabon saƙo, ka zaɓi mutum, ka rubuta, sannan ka taɓa Aika.', 'Open Messages, start a new message, choose the person, write, then touch Send.'], [
      tap('d-text-send', 1, 'Ka fara sabon saƙo.', 'Start a new message.', 'messages', 'newmsg'),
      tap('d-text-send', 2, 'Ka aika saƙon.', 'Send the message.', 'compose', 'send'),
    ]),
    L('d-text-read', 'texts', ['Karanta saƙo da hankali', 'Reading a message carefully'], ['Ka duba wanda ya aiko saƙon. Idan lamba ba ka sani ba, ka yi hankali kafin ka amsa.', 'Look at who sent the message. If you do not know the number, be careful before you answer.'], [
      tap('d-text-read', 1, 'Ka nuna saƙon daga lambar da ba a sani ba.', 'Show the message from the unknown number.', 'messages', 't2'),
      choice('d-text-read', 2, ['Saƙo daga lambar da ba ka sani ba ya nemi kuɗi. Me za ka yi?', 'A message from an unknown number asks for money. What do you do?'], [['Ka yi hankali, kada ka aika kuɗi', 'Be careful and do not send money'], ['Ka aika kuɗi da sauri', 'Send the money quickly'], ['Ka ba shi PIN ɗinka', 'Give him your PIN']]),
    ]),
    L('d-text-bank', 'texts', ['Saƙon banki', 'Bank messages'], ['Banki ba ya neman PIN ko lambar OTP ɗinka ta saƙo ko kira. Kada ka ba kowa su.', 'A bank never asks for your PIN or OTP code by message or call. Never give them to anyone.'], [
      scam('d-text-bank', 1, ['Banki: Muna buƙatar PIN da OTP ɗinka don kare asusunka. Ka amsa yanzu.', 'Bank: We need your PIN and OTP to protect your account. Reply now.'], true, ['Banki ba ya neman PIN ko OTP.', 'A bank never asks for a PIN or OTP.']),
      scam('d-text-bank', 2, ['Aisha: An canza taron zuwa ƙarfe 4 na yamma.', 'Aisha: The meeting has moved to 4 pm.'], false, ['Daga wanda ka sani, babu kuɗi ko sirri da aka nema.', 'From someone you know, and it asks for no money or secrets.']),
    ]),
  ]),
  U('chat', 'Manhajar hira', 'Chat apps', [
    L('d-chat-open', 'chat', ['Buɗe hira', 'Opening a chat'], ['Manhajar hira (kamar WhatsApp) tana ba ka damar yin hira da aika hotuna da murya ta intanet.', 'A chat app (like WhatsApp) lets you chat and send pictures and voice over the internet.'], [
      tap('d-chat-open', 1, 'Ka buɗe manhajar hira.', 'Open the chat app.', 'home', 'chat'),
      tap('d-chat-open', 2, 'Ka buɗe hirar Mama.', 'Open the chat with Mama.', 'chatlist', 'ch1'),
    ]),
    L('d-chat-send', 'chat', ['Aika saƙo a hira', 'Sending a chat message'], ['Ka rubuta a akwatin rubutu, sannan ka taɓa Aika. Alama ɗaya tana nufin an aika, biyu na nufin ya isa wayar mutumin.', 'Write in the text box, then touch Send. One tick means sent, two ticks mean it reached the other phone.'], [
      tap('d-chat-send', 1, 'Ka taɓa maɓallin aika.', 'Touch the send button.', 'chat', 'send'),
      choice('d-chat-send', 2, ['Alama biyu ✓✓ tana nufin me?', 'What do two ticks ✓✓ mean?'], [['Saƙon ya isa wayar mutumin', 'The message reached the other phone'], ['Ba a aika saƙon ba', 'The message was not sent'], ['Mutumin ya amince da saƙon', 'The person agreed with the message']]),
    ]),
    L('d-chat-voice', 'chat', ['Saƙon murya', 'Voice messages'], ['Ka riƙe alamar makirufo ka yi magana, ka saki don aikawa. Ka tabbata ga wanda kake aika wa.', 'Hold the microphone sign and speak, then let go to send. Make sure who you are sending it to.'], [
      tap('d-chat-voice', 1, 'Ka nuna makirufo.', 'Show the microphone.', 'chat', 'mic'),
      choice('d-chat-voice', 2, ['Kafin ka aika murya, me ya kamata?', 'Before you send a voice message, what should you do?'], [['Ka duba wanda kake aika wa', 'Check who you are sending it to'], ['Ka aika wa hira ta farko da ka gani', 'Send it to the first chat you see'], ['Ka yi ihu yayin da kake magana', 'Shout while you speak']]),
    ]),
    L('d-chat-photo', 'chat', ['Aika hoto', 'Sending a photo'], ['Ka taɓa alamar kamara don aika hoto. Kada ka aika hoton katinka na banki ko takardunka na sirri.', 'Touch the camera sign to send a photo. Never send a photo of your bank card or your private papers.'], [
      tap('d-chat-photo', 1, 'Ka taɓa maɓallin kamara.', 'Touch the camera button.', 'chat', 'camerabtn'),
      choice('d-chat-photo', 2, ['Wani ya nemi hoton katin bankinka. Me za ka yi?', 'Someone asks for a photo of your bank card. What do you do?'], [['Ka ƙi, ka gaya wa wanda ka amince da shi', 'Refuse and tell someone you trust'], ['Ka aika da sauri', 'Send it quickly'], ['Ka aika bangarori biyu na katin', 'Send both sides of the card']]),
    ]),
    L('d-chat-group', 'chat', ['Rukuni', 'Groups'], ['A rukuni, duk mutanen da ke ciki suna ganin abin da ka rubuta. Kada ka rubuta sirri a rukuni.', 'In a group, everyone in it sees what you write. Never write secrets in a group.'], [
      choice('d-chat-group', 1, ['Wa ke ganin saƙo a rukuni?', 'Who sees a message in a group?'], [['Duk mutanen rukunin', 'Everyone in the group'], ['Kai kaɗai', 'Only you'], ['Ba kowa', 'No one']]),
      choice('d-chat-group', 2, ['A ina ya dace ka rubuta lambar asusunka?', 'Where is it right to write your account number?'], [['Ba a rukuni ba', 'Not in a group'], ['A kowane rukuni', 'In every group'], ['A rukunin baƙi', 'In a group of strangers']]),
    ]),
  ]),
  U('web', 'Intanet', 'The internet', [
    L('d-data', 'web', ['Data da Wi-Fi', 'Data and Wi-Fi'], ['Intanet na zuwa ta data ko Wi-Fi. Data tana ƙarewa kuma tana da kuɗi. Wi-Fi ba ta cin datar wayarka.', 'The internet comes by mobile data or Wi-Fi. Data runs out and costs money. Wi-Fi does not use your phone’s data.'], [
      tap('d-data', 1, 'Ka nuna inda ake kunna data ta waya.', 'Show where mobile data is switched on.', 'settings', 'mobiledata'),
      choice('d-data', 2, ['Bidiyo yana cin data sosai. Me za ka iya yi?', 'Videos use a lot of data. What can you do?'], [['Ka yi amfani da Wi-Fi idan akwai', 'Use Wi-Fi when there is some'], ['Ka kalli ƙarin bidiyo da data', 'Watch more videos on data'], ['Ka kashe wayar', 'Switch the phone off']]),
    ]),
    L('d-browser', 'web', ['Buɗe shafin intanet', 'Opening a website'], ['Mai bincike (browser) yana buɗe shafukan intanet. Adireshin shafi yana sama.', 'A browser opens web pages. The address of the page is at the top.'], [
      tap('d-browser', 1, 'Ka buɗe manhajar Intanet.', 'Open the browser app.', 'home', 'browser'),
      tap('d-browser', 2, 'Ka nuna sandar adireshi.', 'Show the address bar.', 'browser', 'addressbar'),
    ]),
    L('d-address', 'web', ['Adireshin shafi da makulli', 'Web addresses and the padlock'], ['Kowane shafi yana da adireshi. Shafukan gwamnatin Najeriya galibi suna ƙarewa da .gov.ng. Makulli yana nuna haɗi mai tsaro, amma ba ya tabbatar da cewa shafin amintacce ne.', 'Every page has an address. Nigerian government sites usually end in .gov.ng. A padlock shows a secure connection, but does not prove the site can be trusted.'], [
      choice('d-address', 1, ['Wane adireshi ne zai iya zama na gwamnatin Najeriya?', 'Which address could belong to the Nigerian government?'], [['example.gov.ng', 'example.gov.ng'], ['ka-ci-kyauta-yanzu.xyz', 'win-free-prize-now.xyz'], ['kudi-kyauta.net', 'free-money.net']]),
      choice('d-address', 2, ['Shafi yana da makulli. Me hakan ke nufi?', 'A page has a padlock. What does it mean?'], [['Haɗin yana da tsaro, amma sai ka duba shafin ma', 'The connection is secure, but you still check the site'], ['Shafin tabbas amintacce ne', 'The site is surely trustworthy'], ['Babu zamba a shafin', 'There is no scam on the page']]),
    ]),
  ]),
  U('search', 'Bincike', 'Searching', [
    L('d-search', 'search', ['Yin bincike', 'Searching'], ['Ka rubuta tambayarka a akwatin bincike, sannan ka taɓa bincike. Ka rubuta kalmomi masu bayyanawa.', 'Write your question in the search box, then touch search. Use clear words.'], [
      tap('d-search', 1, 'Ka taɓa akwatin bincike.', 'Touch the search box.', 'browser', 'searchbox'),
      choice('d-search', 2, ['Ka so sanin farashin buhun shinkafa. Me za ka rubuta?', 'You want the price of a bag of rice. What do you write?'], [['Farashin buhun shinkafa', 'Price of a bag of rice'], ['Asdfgh', 'Asdfgh'], ['Shi', 'It']]),
    ]),
    L('d-results', 'search', ['Fahimtar sakamako', 'Understanding results'], ['Sakamakon farko wani lokaci tallace-tallace ne. Nemi alamar “Talla” (Ad) kafin ka taɓa.', 'The first results are sometimes advertisements. Look for the “Ad” sign before you tap.'], [
      tap('d-results', 1, 'Ka nuna tallan.', 'Show the advertisement.', 'results', 'ad1'),
      tap('d-results', 2, 'Ka nuna shafin gwamnati.', 'Show the government page.', 'results', 'official'),
    ]),
    L('d-trust', 'search', ['Wa za a amince da shi', 'What to trust'], ['Ka amince da shafukan da aka sani: gwamnati, bankinka da makaranta. Idan ba ka da tabbaci, ka tambayi wanda ka amince da shi.', 'Trust sites you know: the government, your own bank, a school. If you are not sure, ask someone you trust.'], [
      scam('d-trust', 1, ['Ka yi nasara! Aiko ₦3,000 don karɓar kyautarka.', 'You won! Send ₦3,000 to receive your prize.'], true, ['Ana neman kuɗi kafin kyauta.', 'It asks for money before a prize.']),
      tap('d-trust', 2, 'Wane sakamako ne na gwamnati?', 'Which result is from the government?', 'results', 'official'),
    ]),
  ]),
  U('safety', 'Kariya da zamba', 'Staying safe and scams', [
    L('d-pin', 'safety', ['PIN da OTP naka ne', 'Your PIN and OTP are yours'], ['PIN, OTP da kalmomin sirri naka ne kai kaɗai. Banki ko wani ba zai nemi su ba.', 'Your PIN, OTP and passwords are for you alone. A bank or anyone else will not ask for them.'], [
      choice('d-pin', 1, ['Wani ya kira, ya ce ma’aikacin banki ne, ya nemi OTP naka. Me za ka yi?', 'Someone calls, says he is a bank worker and asks for your OTP. What do you do?'], [['Ka kashe wayar, kada ka ba shi', 'Hang up and do not give it'], ['Ka ba shi, ya ce daga banki ne', 'Give it, he says he is from the bank'], ['Ka ba shi rabin lambar', 'Give him half of the number']]),
      scam('d-pin', 2, ['Aiko mini PIN ɗinka in gyara maka asusu.', 'Send me your PIN so I can fix your account.'], true, ['Ba a ba kowa PIN.', 'You never give anyone your PIN.']),
    ]),
    L('d-scam-prize', 'safety', ['Zambar kyauta', 'Prize scams'], ['Saƙon da ya ce ka ci kyauta amma sai ka biya kuɗi tukuna zamba ne.', 'A message that says you won a prize but asks you to pay first is a scam.'], [
      scam('d-scam-prize', 1, ['Taya murna! Ka ci ₦500,000. Aiko ₦5,000 don karɓa.', 'Congratulations! You won ₦500,000. Send ₦5,000 to claim it.'], true, ['Kyauta ta gaske ba ta neman kuɗi kafin ka karɓa.', 'A real prize does not ask for money first.']),
      scam('d-scam-prize', 2, ['Mama: Na isa lafiya. Ka kira ni da dare.', 'Mama: I have arrived safely. Call me tonight.'], false, ['Daga wanda ka sani, babu kuɗi da aka nema.', 'From someone you know, and no money is asked.']),
    ]),
    L('d-scam-bank', 'safety', ['Zambar banki da link', 'Bank and link scams'], ['Zamba tana zuwa kamar saƙon banki mai link, ko neman a mayar da kuɗin “kuskure”. Kada ka taɓa link da ba ka tabbatar ba.', 'Scams look like bank messages with a link, or ask you to return “mistaken” money. Never tap a link you are not sure about.'], [
      scam('d-scam-bank', 1, ['Banki: An kulle asusunka. Taɓa wannan link ka rubuta PIN.', 'Bank: Your account is blocked. Tap this link and enter your PIN.'], true, ['Banki ba ya neman PIN ta link.', 'A bank does not ask for a PIN by link.']),
      scam('d-scam-bank', 2, ['Na yi maka tura ₦20,000 bisa kuskure. Ka mayar mini yanzu.', 'I sent you ₦20,000 by mistake. Send it back to me now.'], true, ['Ka tuntuɓi bankinka kafin ka mayar da kowane kuɗi.', 'Contact your own bank before you send any money back.']),
    ]),
    L('d-scam-job', 'safety', ['Zambar aiki da rance', 'Job and loan scams'], ['Aiki ko rance da ke neman ka biya kuɗi tukuna zamba ne. Aiki na gaske ba ya karɓar kuɗi kafin ka fara.', 'A job or loan that asks you to pay first is a scam. A real job does not take money before you start.'], [
      scam('d-scam-job', 1, ['Aiki: Biya ₦10,000 na rajista, sai ka fara mako mai zuwa.', 'Job offer: Pay ₦10,000 registration, then start next week.'], true, ['Ana karɓar kuɗi kafin aiki.', 'It takes money before any work.']),
      scam('d-scam-job', 2, ['An amince da rance! Aiko BVN ɗinka da ₦3,000 na inshora tukuna.', 'Loan approved! Send your BVN and ₦3,000 insurance first.'], true, ['Ba a ba da BVN ko kuɗi kafin rance.', 'You do not give your BVN or money before a loan.']),
    ]),
    L('d-scam-call', 'safety', ['Kiran zamba', 'Scam calls'], ['Mai kira zai iya cewa shi ɗan’uwanka ne ko banki. Ka kashe, ka kira lambar da ka sani.', 'A caller may say he is your brother or the bank. Hang up and call a number you already know.'], [
      choice('d-scam-call', 1, ['Wani ya kira ya ce: “Ni ɗan’uwanka ne, na canza lamba, aiko kuɗi yanzu.” Me za ka yi?', 'Someone calls: “I am your brother, I changed my number, send money now.” What do you do?'], [['Ka kashe, ka kira ɗan’uwanka a tsohuwar lambarsa', 'Hang up and call your brother on his old number'], ['Ka aika kuɗin nan take', 'Send the money at once'], ['Ka ba shi PIN ɗinka', 'Give him your PIN']]),
      choice('d-scam-call', 2, ['Mai kira ya ce: “Kada ka gaya wa kowa.” Menene wannan alamar?', 'The caller says: “Do not tell anyone.” What does this suggest?'], [['Wataƙila zamba ce; ka gaya wa wanda ka amince da shi', 'It may be a scam; tell someone you trust'], ['Sirri ne da dole a kiyaye', 'It is a secret you must keep'], ['Kyauta ce', 'It is a gift']]),
    ]),
    L('d-report', 'safety', ['Idan an yi maka zamba', 'If you are scammed'], ['Idan an yi maka zamba: ka kira bankinka nan take, ka daina magana da mai zambar, ka gaya wa wanda ka amince da shi ko malaminka.', 'If you are scammed: call your bank straight away, stop talking to the scammer, and tell someone you trust or your facilitator.'], [
      choice('d-report', 1, ['An cire maka kuɗi ta zamba. Menene abu na farko?', 'Money was taken from you by a scam. What is the first thing to do?'], [['Ka kira bankinka nan take', 'Call your bank straight away'], ['Ka jira mako guda', 'Wait a week'], ['Ka aika ƙarin kuɗi don a dawo da su', 'Send more money to get it back']]),
      choice('d-report', 2, ['Wa za ka gaya?', 'Who should you tell?'], [['Wanda ka amince da shi ko malaminka', 'A person you trust or your facilitator'], ['Ba kowa, ka ɓoye', 'No one, hide it'], ['Mai zambar', 'The scammer']]),
    ]),
    L('d-lock', 'safety', ['Kulle waya', 'Locking your phone'], ['Ka kulle wayarka da lambar sirri ko hoton yatsa don wani ba zai buɗe ta ba. Kada ka faɗa wa kowa lambar kulle.', 'Lock your phone with a code or fingerprint so no one else can open it. Never tell anyone your lock code.'], [
      tap('d-lock', 1, 'Ka nuna kulle allo.', 'Show the screen lock.', 'settings', 'screenlock'),
      choice('d-lock', 2, ['Wace lambar kulle ce ta fi kyau?', 'Which lock code is best?'], [['Wadda kai kaɗai ka sani, ba 000000 ba', 'One only you know, not 000000'], ['1234', '1234'], ['Lambar wayarka', 'Your own phone number']]),
    ]),
  ]),
]
export const LESSONS = UNITS.flatMap((u) => u.lessons)
export const lessonByKey = (key) => LESSONS.find((l) => l.key === key) || null
// Units that measure online safety separately from phone skills (used by reports)
export const SAFETY_UNIT = 'safety'
