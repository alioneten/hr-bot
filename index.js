const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

const HOSPITALS = {
  'islamabad': [
    'Shifa International Hospital — H-8/4, Islamabad',
    'Kulsum International Hospital — Blue Area, Islamabad',
    'Maroof International Hospital — F-8 Markaz, Islamabad',
    'Quaid-e-Azam International Hospital — PWD, Islamabad',
    'PMC Hospital — F-8 Markaz, Islamabad',
    'Islamabad Clinic — G-10 Markaz, Islamabad',
    'Advance International Hospital — Police Foundation, Islamabad',
    'Shifa Eye Trust Hospital — Jhelum Road, Rawalpindi',
    'Al Suffah Hospital — Satellite Town, Rawalpindi',
    'Citymed Hospital — Civil Lines, Rawalpindi',
    'Bahria International Hospital — Bahria Golf City, Rawalpindi',
    'Asghar Mall Hospital — Asghar Mall Road, Rawalpindi',
  ],
  'rawalpindi': [
    'Shifa Eye Trust Hospital — Jhelum Road',
    'Al Suffah Hospital — Satellite Town',
    'Citymed Hospital — Civil Lines',
    'Bahria International Hospital — Bahria Golf City',
    'Asghar Mall Hospital — Asghar Mall Road',
    'Holy Family Hospital — Satellite Town',
  ],
  'karachi': [
    'Dr. Ziauddin Hospital (Clifton) — Clifton',
    'Dr. Ziauddin Hospital (N. Nazimabad) — North Nazimabad',
    'Dr. Ziauddin Hospital (Kemari) — Kemari',
    'Dow University Hospital — KDA Scheme-33',
    'Boulevard Hospital — Korangi Road',
    'Aga Khan Hospital — M.A. Jinnah Road',
    'Al-Ain Eye Hospital — PECHS',
    'Park Lane Hospital — Old Clifton',
    'Al Tamash Hospital — Clifton',
    'Dr. Halim Hospital — North Nazimabad',
    'Institute of Orthopaedics & Surgery — Gulshan-e-Iqbal',
    'Anklesaria Nursing Home — Garden Road',
    'Pakistan International Hospital — DHA Phase 1',
    'Bayview Hospital — DHA Phase VIII',
    'Ziauddin Hospital (North) — North Karachi',
    'Indus Hospital — Korangi',
  ],
  'lahore': [
    'Farooq Hospital — DHA, Lahore',
    'Doctors Hospital — Canal Bank Road',
    'Hameed Latif Hospital — Jail Road',
    'Omar Hospital — Model Town',
    'National Hospital — DHA',
    'Heart & Medical Centre — Zarar Shaheed Road',
    'Chughtai Lab Hospital — Jail Road',
    'Aadil Hospital — Gulberg',
    'Ittefaq Hospital — Model Town',
    'Akhtar Saeed Hospital — Barki Road',
    'Ghurki Trust Hospital — Jallo More',
    'Sharif Medical City — Raiwind Road',
    'Surgimed Hospital — Zafar Ali Road',
    'Saadan Hospital — Johar Town',
    'Ganga Ram Hospital — Mall Road',
    'Lahore General Hospital — Fatima Jinnah Road',
  ],
  'multan': [
    'Nishtar Hospital — Nishtar Road',
    'BUCH International Hospital — Bosan Road',
    'Mukhtar A. Sheikh Hospital — Multan',
    'Ibn-e-Sina Hospital — Khanewal Road',
    'Aziz Fatima Hospital — Multan',
    'Chaudhry Pervaiz Elahi Institute — Multan',
  ],
  'peshawar': [
    'Hayatabad Medical Complex — Phase 5, Hayatabad',
    'Northwest General Hospital — Peshawar Cantt',
    'Lady Reading Hospital — Nishtar Road',
    'Khyber Teaching Hospital — Peshawar',
    'Pakistan Railway Hospital — Peshawar Cantt',
    'Rehman Medical Institute — Phase 5, Hayatabad',
  ],
  'faisalabad': [
    'Allied Hospital — University Road',
    'Faisalabad Institute of Cardiology',
    'National Hospital — Faisalabad',
    'Peoples Hospital — Faisalabad',
    'District Headquarters Hospital',
    'Dar-ul-Shifa Hospital — Faisalabad',
    'Chenab Medical Complex — Faisalabad',
  ],
  'hyderabad': [
    'Aga Khan Maternity — Jamshoro Road',
    'Bone Care Trauma Centre — Pathan Colony',
    'Red Crescent General Hospital — Latifabad',
    'Liaquat University Hospital — Hyderabad',
    'Majee Hospital — Autobahn Road',
  ],
  'quetta': [
    'Heart & General Hospital — Model Town',
    'Sandeman Provincial Hospital — Quetta',
    'Bolan Medical College Hospital — Quetta',
    'Quetta Institute of Medical Sciences',
  ],
  'sialkot': [
    'Allama Iqbal Memorial Hospital — Commissioner Road',
    'Sardar Trust Hospital — Islamia College Road',
    'District Headquarters Hospital — Sialkot',
    'Ghurki Hospital — Sialkot',
  ],
  'gujranwala': [
    'Gujranwala Teaching Hospital — Satellite Town',
    'DHQ Hospital — Hospital Road',
    'Pakistan Kidney Center — Gujranwala',
    'Bismillah Hospital — Gujranwala',
  ],
  'abbottabad': [
    'Ayub Teaching Hospital — Link Road',
    'Abbottabad International Hospital — N-35',
    'DHQ Hospital — Main Mansehra Road',
  ],
  'sukkur': [
    'Ghulam Muhammad Mahar Medical College Hospital — Sukkur',
    'Civil Hospital — Sukkur',
    'Ibn-e-Siena Hospital — Sukkur',
  ],
  'bahawalpur': [
    'Bahawal Victoria Hospital — Bahawalpur',
    'Quaid-e-Azam Medical College Hospital',
    'Al-Sadiq Hospital — Bahawalpur',
  ],
  'sargodha': [
    'District Headquarters Hospital — Sargodha',
    'DHQ Teaching Hospital — Sargodha',
    'Sargodha Medical College Hospital',
  ],
  'gujrat': [
    'DHQ Hospital — Gujrat',
    'Aziz Bhatti Shaheed Hospital — Gujrat',
  ],
  'rahim yar khan': [
    'Sheikh Zayed Hospital — Rahim Yar Khan',
    'DHQ Hospital — Rahim Yar Khan',
  ],
  'mardan': [
    'Mardan Medical Complex — Mardan',
    'DHQ Hospital — Mardan',
  ],
  'mirpur': [
    'Mirpur Teaching Hospital — Mirpur AJK',
    'DHQ Hospital — Mirpur',
  ],
  'muzaffarabad': [
    'Shaukat Hayat Memorial Hospital — Muzaffarabad',
    'DHQ Hospital — Muzaffarabad',
  ],
};

const PAGE_SIZE = 6;

const HR_KNOWLEDGE = `Aap M&P Express Logistics ke HR Assistant hain.

SAKHT HIDAYAT:
- Sirf saf Urdu ya English mein jawab dein — Hindi words bilkul nahi
- Sirf neeche di gayi maloomat ke mutabiq jawab dein
- Agar sawaal knowledge base mein nahi hai: "Yeh maloomat mere paas nahi. HRBP se rabta karein."
- Mukhtasar jawab dein — 3 se 5 lines
- Jawab ke aakhir mein hamesha likhen: "0 — Main Menu"

LEAVES POLICY:
- Casual Leave: 10 din/saal
- Sick Leave: 8 din/saal
- Annual Leave: 30 din/saal
- Leave apply ke liye pehle supervisor ko batayein

OFFICE TIMING:
- Somvar se Juma: 9:00 AM - 5:30 PM (PKT)
- Lunch Break: 1:00 PM - 2:00 PM
- Late arrival grace period: 15 minute
- Saturday aur Sunday: Band

MEDICAL POLICY:
- Panel hospital mein IGI Health Card dikhayein — koi payment nahi
- Emergency mein kisi bhi hospital — baad mein claim karein
- Claim form HR office se — 30 din ke andar jama karwayein
- IGI Health Approvals: 042-345-03333 (24/7)

HR CONTACT:
- Email: hr@mp.com.pk | Phone: 0311-1111111`;

const sessions = {};
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(chatId) {
  const now = Date.now();
  const s = sessions[chatId];
  if (!s || (now - s.lastActive) > SESSION_TIMEOUT) {
    sessions[chatId] = { state: 'new', lastActive: now };
  } else {
    sessions[chatId].lastActive = now;
  }
  return sessions[chatId];
}

function setSession(chatId, data) {
  sessions[chatId] = { ...sessions[chatId], ...data, lastActive: Date.now() };
}

function getPKTHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })).getHours();
}

function isOfficeHours() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  return now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() >= 9 && now.getHours() < 18;
}

function getGreeting() {
  const h = getPKTHour();
  if (h >= 5  && h < 12) return 'Assalam o Alaikum! Subh Bakhair';
  if (h >= 12 && h < 17) return 'Assalam o Alaikum! Dopahar Bakhair';
  if (h >= 17 && h < 21) return 'Assalam o Alaikum! Shaam Bakhair';
  return 'Assalam o Alaikum! Shab Bakhair';
}

function mainMenu(name) {
  return `${getGreeting()} ${name},

M&P Express HR Helpdesk mein khush aamdeed.
Apni inquiry muntakhib farmaein:

1 — HR Policies & Benefits
2 — Office Timing & Attendance
3 — Medical Panel Hospitals
4 — Other HR Matters

Emergency medical:
IGI Helpline: 042-345-03333 (24/7)`;
}

function getHospitalPage(city, page) {
  const list = HOSPITALS[city];
  if (!list) return null;
  const start = page * PAGE_SIZE;
  const chunk = list.slice(start, start + PAGE_SIZE);
  if (chunk.length === 0) return null;
  const total = list.length;
  const shown = Math.min(start + PAGE_SIZE, total);
  const hasMore = shown < total;
  let msg = `IGI Panel Hospitals — ${city.charAt(0).toUpperCase() + city.slice(1)}:\n(${start + 1}–${shown} / ${total})\n\n`;
  chunk.forEach((h, i) => { msg += `${start + i + 1}. ${h}\n`; });
  msg += `\nIGI Approvals: 042-345-03333 (24/7)`;
  msg += hasMore
    ? `\n\n"aur" likhein — mazeed hospitals\n"0" — Main Menu`
    : `\n\n--- Poori list mukammal ---\n"0" — Main Menu`;
  return msg;
}

function findCity(text) {
  const lower = text.toLowerCase();
  for (const city of Object.keys(HOSPITALS)) {
    if (lower.includes(city)) return city;
  }
  return null;
}

function wantsMore(text) {
  return ['aur', 'more', 'mazeed', 'next', 'agla'].some(w => text.toLowerCase().includes(w));
}

function wantsMenu(text) {
  const t = text.trim().toLowerCase();
  return t === '0' || t === 'menu' || t === 'wapas' || t === 'back';
}

async function sendMsg(chatId, message) {
  try {
    await axios.post(
      'https://api.green-api.com/waInstance' + INSTANCE + '/sendMessage/' + TOKEN,
      { chatId, message }
    );
  } catch (err) {
    console.error('Send Error:', err.message);
  }
}

async function getAIReply(text, name) {
  if (!isOfficeHours()) {
    return `Assalam o Alaikum ${name},\n\nOffice hours (9AM–5:30PM) khatam ho chuki hain.\nAglay working day mein jawab diya jaye ga.\n\nEmergency: IGI 042-345-03333 (24/7)\n\n0 — Main Menu`;
  }
  const MODELS = [
    'nvidia/nemotron-3-super-120b-a12b:free',
    'tencent/hy3-preview:free',
    'nvidia/nemotron-nano-12b-v2-vl:free'
  ];
  for (const model of MODELS) {
    try {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: HR_KNOWLEDGE },
            { role: 'user', content: `"${name}" ka sawaal: ${text}` }
          ]
        },
        { headers: { 'Authorization': 'Bearer ' + OPENROUTER_KEY, 'Content-Type': 'application/json' } }
      );
      const reply = res.data.choices[0].message.content;
      if (reply) return reply;
    } catch (err) {
      console.log('Failed: ' + model);
    }
  }
  return `Maafi, system busy hai. Rabta karein: hr@mp.com.pk | 0311-1111111\n\n0 — Main Menu`;
}

// ============================================================
// WEBHOOK — Outgoing block hata diya, ab sab numbers reply karenge
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    const type = body.typeWebhook;

    if (type !== 'incomingMessageReceived') return;

    const chatId = body.senderData?.chatId;
    const text = body.messageData?.textMessageData?.textMessage;
    const name = body.senderData?.senderName || 'Employee';
    if (!chatId || !text) return;
    if (chatId.includes('@g.us')) return;

    const session = getSession(chatId);

    if (wantsMenu(text)) {
      setSession(chatId, { state: 'menu' });
      await sendMsg(chatId, mainMenu(name));
      return;
    }

    if (session.state === 'new') {
      setSession(chatId, { state: 'menu' });
      await sendMsg(chatId, mainMenu(name));
      return;
    }

    if (text.trim() === '1') {
      setSession(chatId, { state: 'ai_chat' });
      await sendMsg(chatId, `HR Policies ke baare mein apna sawaal likhein:\n(Leaves, Medical, ya koi aur policy)\n\n0 — Main Menu`);
      return;
    }

    if (text.trim() === '2') {
      setSession(chatId, { state: 'menu' });
      await sendMsg(chatId,
`Office Timing — M&P Express:

Somvar se Juma: 9:00 AM – 5:30 PM
Lunch Break: 1:00 PM – 2:00 PM
Late Grace: 15 minute
Saturday & Sunday: Band

0 — Main Menu`);
      return;
    }

    if (text.trim() === '3') {
      setSession(chatId, { state: 'hospital_city' });
      await sendMsg(chatId,
`City ka naam likhein — us city ke IGI panel hospitals ki detail share kar di jaye gi.

0 — Main Menu`);
      return;
    }

    if (text.trim() === '4') {
      setSession(chatId, { state: 'ai_chat' });
      await sendMsg(chatId, `Apna sawaal likhein — HRBP online hone par jawab diya jaye ga.\n\n0 — Main Menu`);
      return;
    }

    if (session.state === 'hospital_city') {
      const city = findCity(text);
      if (city) {
        setSession(chatId, { state: 'hospital_list', hospitalCity: city, hospitalPage: 0 });
        await sendMsg(chatId, getHospitalPage(city, 0));
      } else {
        await sendMsg(chatId, `Maafi, yeh city database mein nahi hai.\n\nDobara city ka naam likhein ya:\n0 — Main Menu`);
      }
      return;
    }

    if (session.state === 'hospital_list' && wantsMore(text)) {
      const nextPage = (session.hospitalPage || 0) + 1;
      const result = getHospitalPage(session.hospitalCity, nextPage);
      if (result) {
        setSession(chatId, { hospitalPage: nextPage });
        await sendMsg(chatId, result);
      } else {
        setSession(chatId, { state: 'menu' });
        await sendMsg(chatId, `${session.hospitalCity} ki poori list bhej di gayi.\n\nIGI: 042-345-03333 (24/7)\n\n0 — Main Menu`);
      }
      return;
    }

    if (session.state === 'ai_chat') {
      const reply = await getAIReply(text, name);
      await sendMsg(chatId, reply);
      return;
    }

    setSession(chatId, { state: 'menu' });
    await sendMsg(chatId, mainMenu(name));

  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
});

app.get('/', (req, res) => {
  res.send(`HR Bot | OpenRouter: ${OPENROUTER_KEY ? 'YES' : 'NO'} | Instance: ${INSTANCE ? 'YES' : 'NO'} | PKT: ${getPKTHour()}:00 | Office: ${isOfficeHours() ? 'OPEN' : 'CLOSED'}`);
});

app.listen(process.env.PORT || 8080, () => console.log('Bot started!'));
