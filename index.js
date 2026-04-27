const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const HR_KNOWLEDGE = require('./knowledge');

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
    'Dr. Ziauddin Hospital Clifton — Clifton, Karachi',
    'Dr. Ziauddin Hospital N.Nazimabad — North Nazimabad',
    'Dr. Ziauddin Hospital Kemari — Kemari, Karachi',
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
    'DHQ Hospital — Faisalabad',
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
    'DHQ Hospital — Sialkot',
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
const sessions = {}; // chatId => { seen, waitingCity, city, page }

// ============================================================
// TIME
// ============================================================
function getPKT() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
}

function isOfficeHours() {
  const t = getPKT();
  return t.getDay() >= 1 && t.getDay() <= 5 && t.getHours() >= 9 && t.getHours() < 18;
}

function getGreeting() {
  const h = getPKT().getHours();
  if (h >= 5 && h < 12) return 'Assalam o Alaikum! Subh Bakhair';
  if (h >= 12 && h < 17) return 'Assalam o Alaikum! Dopahar Bakhair';
  if (h >= 17 && h < 21) return 'Assalam o Alaikum! Shaam Bakhair';
  return 'Assalam o Alaikum! Shab Bakhair';
}

// ============================================================
// HOSPITAL HELPERS
// ============================================================
function getHospitalPage(city, page) {
  const list = HOSPITALS[city];
  if (!list) return null;
  const start = page * PAGE_SIZE;
  const chunk = list.slice(start, start + PAGE_SIZE);
  if (!chunk.length) return null;
  const total = list.length;
  const shown = Math.min(start + PAGE_SIZE, total);
  let msg = `IGI Panel Hospitals — ${city.charAt(0).toUpperCase() + city.slice(1)}\n`;
  msg += `(${start + 1}–${shown} / ${total})\n\n`;
  chunk.forEach((h, i) => { msg += `${start + i + 1}. ${h}\n`; });
  msg += `\nIGI Helpline: 042-345-03333 (24/7)`;
  if (start + PAGE_SIZE < total) {
    msg += `\n\nMazeed dekhne ke liye "aur" likhein`;
  } else {
    msg += `\n\n${city} ki poori list mukammal ho gayi`;
  }
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
  const t = text.toLowerCase().trim();
  return ['aur', 'more', 'mazeed', 'next', 'agla'].some(w => t.includes(w));
}

// ============================================================
// SEND
// ============================================================
async function sendMsg(chatId, msg) {
  try {
    await axios.post(
      `https://api.green-api.com/waInstance${INSTANCE}/sendMessage/${TOKEN}`,
      { chatId, message: msg }
    );
  } catch (e) { console.error('Send error:', e.message); }
}

// ============================================================
// AI
// ============================================================
async function askAI(text, name) {
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
            { role: 'user', content: `${name} ka sawaal: ${text}` }
          ]
        },
        { headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' } }
      );
      const reply = res.data?.choices?.[0]?.message?.content;
      if (reply) { console.log('Model OK:', model); return reply; }
    } catch (e) { console.log('Model fail:', model); }
  }
  return `Maafi, system busy hai. Rabta karein: hr@mp.com.pk | 0311-1111111`;
}

// ============================================================
// WELCOME MESSAGE
// ============================================================
function welcomeMsg(name) {
  return `${getGreeting()} ${name},

M&P Express HR Helpdesk mein khush aamdeed.

Apni inquiry muntakhib farmaein:

1 — HR Policies & Benefits
2 — Office Timing & Attendance
3 — Medical Panel Hospitals
4 — Other HR Matters

Option 4 ke liye HRBP online hone par jawab diya jaye ga.
Emergency: IGI Helpline 042-345-03333 (24/7)`;
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
    const text = body.messageData?.textMessageData?.textMessage?.trim();
    const name = body.senderData?.senderName || 'Employee';

    if (!chatId || !text) return;
    if (chatId.includes('@g.us')) return;

    // Session initialize
    if (!sessions[chatId]) sessions[chatId] = { seen: false, waitingCity: false, city: null, page: 0 };
    const s = sessions[chatId];

    // Pehla message — welcome
    if (!s.seen) {
      s.seen = true;
      await sendMsg(chatId, welcomeMsg(name));
      return;
    }

    // Option 3 — hospital
    if (text === '3') {
      s.waitingCity = true;
      await sendMsg(chatId,
`Aap kis city ke panel hospitals ki maloomat chahte hain?

Dastiyab cities:
Islamabad, Rawalpindi, Karachi, Lahore,
Multan, Peshawar, Faisalabad, Hyderabad,
Quetta, Sialkot, Gujranwala, Abbottabad

City ka naam likhein:`);
      return;
    }

    // City wait
    if (s.waitingCity) {
      const city = findCity(text);
      if (city) {
        s.waitingCity = false;
        s.city = city;
        s.page = 0;
        await sendMsg(chatId, getHospitalPage(city, 0));
      } else {
        await sendMsg(chatId, `Yeh city database mein nahi hai. Dobara likhein:\nIslamabad, Rawalpindi, Karachi, Lahore, Multan, Peshawar, Faisalabad, Hyderabad, Quetta, Sialkot, Gujranwala, Abbottabad`);
      }
      return;
    }

    // Mazeed hospitals
    if (wantsMore(text) && s.city) {
      s.page += 1;
      const result = getHospitalPage(s.city, s.page);
      if (result) {
        await sendMsg(chatId, result);
      } else {
        s.city = null;
        s.page = 0;
        await sendMsg(chatId, `${s.city} ki poori list bhej di gayi.\nIGI Helpline: 042-345-03333 (24/7)`);
      }
      return;
    }

    // After office hours
    if (!isOfficeHours()) {
      await sendMsg(chatId,
`Assalam o Alaikum ${name},

Office hours (9AM - 5:30PM, Somvar se Juma) khatam ho chuki hain.

Aap ka message record ho gaya — aglay working day jawab diya jaye ga.

Emergency medical:
IGI Helpline: 042-345-03333 (24/7)

Shukriya — M&P Express HR Helpdesk`);
      return;
    }

    // AI jawab
    const reply = await askAI(text, name);
    await sendMsg(chatId, reply);

  } catch (e) {
    console.error('Webhook error:', e.message);
  }
});

app.get('/', (req, res) => {
  const t = getPKT();
  res.send(`HR Bot OK | Office: ${isOfficeHours() ? 'OPEN' : 'CLOSED'} | PKT: ${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`);
});

app.listen(process.env.PORT || 8080, () => console.log('Bot started!'));
