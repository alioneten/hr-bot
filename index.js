const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

// ============================================================
// PANEL HOSPITALS
// ============================================================
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
  'karachi': [
    'Dr. Ziauddin Hospital (Clifton) — Clifton, Karachi',
    'Dr. Ziauddin Hospital (N. Nazimabad) — North Nazimabad',
    'Dr. Ziauddin Hospital (Kemari) — Kemari, Karachi',
    'Dow University Hospital — KDA Scheme-33',
    'Boulevard Hospital — Korangi Road',
    'Aga Khan Hospital — M.A. Jinnah Road',
    'Al-Ain Eye Hospital — PECHS, Karachi',
    'Park Lane Hospital — Old Clifton',
    'Al Tamash Hospital — Clifton',
    'Dr. Halim Hospital — North Nazimabad',
    'Institute of Orthopaedics & Surgery — Gulshan-e-Iqbal',
    'Anklesaria Nursing Home — Garden Road',
    'Pakistan International Hospital — DHA Phase 1',
    'Bayview Hospital — DHA Phase VIII',
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
  ],
  'rawalpindi': [
    'Shifa Eye Trust Hospital — Jhelum Road',
    'Al Suffah Hospital — Satellite Town',
    'Citymed Hospital — Civil Lines',
    'Bahria International Hospital — Bahria Golf City',
    'Asghar Mall Hospital — Asghar Mall Road',
    'Holy Family Hospital — Satellite Town',
  ],
  'multan': [
    'Nishtar Hospital — Nishtar Road',
    'BUCH International Hospital — Bosan Road',
    'Mukhtar A. Sheikh Hospital — Multan',
    'Ibn-e-Sina Hospital — Khanewal Road',
    'Aziz Fatima Hospital — Multan',
  ],
  'peshawar': [
    'Hayatabad Medical Complex — Phase 5, Hayatabad',
    'Northwest General Hospital — Peshawar Cantt',
    'Lady Reading Hospital — Nishtar Road',
    'Khyber Teaching Hospital — Peshawar',
  ],
  'faisalabad': [
    'Allied Hospital — University Road',
    'Faisalabad Institute of Cardiology — Faisalabad',
    'National Hospital — Faisalabad',
    'Peoples Hospital — Faisalabad',
    'District Headquarters Hospital — Faisalabad',
  ],
  'hyderabad': [
    'Aga Khan Maternity — Jamshoro Road',
    'Bone Care Trauma Centre — Pathan Colony',
    'Red Crescent General Hospital — Latifabad',
    'Liaquat University Hospital — Hyderabad',
  ],
  'quetta': [
    'Heart & General Hospital — Model Town',
    'Sandeman Provincial Hospital — Quetta',
    'Bolan Medical College Hospital — Quetta',
  ],
  'sialkot': [
    'Allama Iqbal Memorial Hospital — Commissioner Road',
    'Sardar Trust Hospital — Islamia College Road',
    'District Headquarters Hospital — Sialkot',
  ],
  'gujranwala': [
    'Gujranwala Teaching Hospital — Satellite Town',
    'DHQ Hospital — Hospital Road',
    'Pakistan Kidney Center — Gujranwala',
  ],
  'abbottabad': [
    'Ayub Teaching Hospital — Link Road',
    'Abbottabad International Hospital — N-35',
    'DHQ Hospital — Main Mansehra Road',
  ],
};

const PAGE_SIZE = 6;

// ============================================================
// HR KNOWLEDGE BASE
// ============================================================
const HR_KNOWLEDGE = `Aap M&P Express Logistics ke HR Assistant hain.

SAKHT HIDAYAT:
- Sirf saf Urdu ya English mein jawab dein — Hindi words bilkul nahi
- Sirf neeche di gayi maloomat ke mutabiq jawab dein
- Agar sawaal knowledge base mein nahi hai to likhen:
  "Yeh maloomat mere paas maujood nahi. HRBP se rabta karein."
- Apni taraf se kuch bhi na banayein
- Mukhtasar aur wazeh jawab dein — 3 se 5 lines kafi hain
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
- Panel hospital mein sirf IGI Health Card dikhayein
- Emergency mein kisi bhi hospital ja sakte hain — baad mein claim karein
- Claim form HR office se milta hai — 30 din ke andar jama karwayein
- IGI Health Approvals: 042-345-03333 (24/7)

HR CONTACT:
- Email: hr@mp.com.pk
- Phone: 0311-1111111`;

// ============================================================
// SESSION STORAGE
// session = { state, hospitalCity, hospitalPage, lastActive }
// states: 'menu' | 'hospital_city' | 'hospital_list' | 'ai_chat'
// ============================================================
const sessions = {};
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minute

function getSession(chatId) {
  const now = Date.now();
  const s = sessions[chatId];
  // Session expired ya nahi hai — fresh start
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

// ============================================================
// TIME FUNCTIONS
// ============================================================
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

// ============================================================
// MAIN MENU
// ============================================================
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

// ============================================================
// HOSPITAL PAGINATION
// ============================================================
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
    ? `\n\n"aur" — mazeed hospitals\n"0" — Main Menu`
    : `\n\n--- Poori list mukammal ---\n\n"0" — Main Menu`;
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
  return text.trim() === '0' || text.toLowerCase().includes('menu') || text.toLowerCase().includes('wapas');
}

// ============================================================
// SEND MESSAGE
// ============================================================
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

// ============================================================
// AI REPLY
// ============================================================
async function getAIReply(text, name) {
  if (!isOfficeHours()) {
    return `Assalam o Alaikum ${name},\n\nOffice hours (9AM–5:30PM, Somvar–Juma) khatam ho chuki hain.\nAglay working day mein jawab diya jaye ga.\n\nEmergency: IGI Helpline 042-345-03333 (24/7)\n\n0 — Main Menu`;
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
  return `Maafi, system busy hai. HR rabta: hr@mp.com.pk | 0311-1111111\n\n0 — Main Menu`;
}

// ============================================================
// WEBHOOK
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.typeWebhook !== 'incomingMessageReceived') return;
    const chatId = body.senderData?.chatId;
    const text = body.messageData?.textMessageData?.textMessage;
    const name = body.senderData?.senderName || 'Employee';
    if (!chatId || !text) return;
    if (chatId.includes('@g.us')) return;

    const session = getSession(chatId);

    // 0 — Hamesha main menu
    if (wantsMenu(text)) {
      setSession(chatId, { state: 'menu' });
      await sendMsg(chatId, mainMenu(name));
      return;
    }

    // Naya session ya pehla message
    if (session.state === 'new') {
      setSession(chatId, { state: 'menu' });
      await sendMsg(chatId, mainMenu(name));
      return;
    }

    // Option 1 — HR Policies
    if (text.trim() === '1') {
      setSession(chatId, { state: 'ai_chat' });
      await sendMsg(chatId, `HR Policies ke baare mein apna sawaal likhein:\n\n(Leaves, Medical, ya koi aur policy)\n\n0 — Main Menu`);
      return;
    }

    // Option 2 — Office Timing
    if (text.trim() === '2') {
      setSession(chatId, { state: 'menu' });
      await sendMsg(chatId,
`Office Timing — M&P Express:

Somvar se Juma: 9:00 AM – 5:30 PM
Lunch Break: 1:00 PM – 2:00 PM
Late Arrival Grace: 15 minute
Saturday & Sunday: Band

0 — Main Menu`);
      return;
    }

    // Option 3 — Hospitals
    if (text.trim() === '3') {
      setSession(chatId, { state: 'hospital_city' });
      await sendMsg(chatId,
`Aap kis city ke panel hospitals ki maloomat chahte hain?

Dastiyab cities:
Islamabad, Rawalpindi, Karachi, Lahore,
Multan, Peshawar, Faisalabad, Hyderabad,
Quetta, Sialkot, Gujranwala, Abbottabad

City ka naam likhein:
0 — Main Menu`);
      return;
    }

    // Option 4 — Other
    if (text.trim() === '4') {
      setSession(chatId, { state: 'ai_chat' });
      await sendMsg(chatId, `Apna sawaal likhein — HRBP online hone par jawab diya jaye ga.\n\n0 — Main Menu`);
      return;
    }

    // Hospital city wait
    if (session.state === 'hospital_city') {
      const city = findCity(text);
      if (city) {
        setSession(chatId, { state: 'hospital_list', hospitalCity: city, hospitalPage: 0 });
        await sendMsg(chatId, getHospitalPage(city, 0));
      } else {
        await sendMsg(chatId,
`Maafi, yeh city database mein nahi hai.

Dobara likhein:
Islamabad, Rawalpindi, Karachi, Lahore,
Multan, Peshawar, Faisalabad, Hyderabad,
Quetta, Sialkot, Gujranwala, Abbottabad

0 — Main Menu`);
      }
      return;
    }

    // Hospital list — aur
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

    // AI chat
    if (session.state === 'ai_chat') {
      const reply = await getAIReply(text, name);
      await sendMsg(chatId, reply);
      return;
    }

    // Default — menu dikhao
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
