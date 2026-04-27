const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

// ============================================================
// PANEL HOSPITALS — IGI Insurance
// ============================================================
const HOSPITALS = {
  islamabad: [
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
  rawalpindi: [
    'Shifa Eye Trust Hospital — Jhelum Road',
    'Al Suffah Hospital — Satellite Town',
    'Citymed Hospital — Civil Lines',
    'Bahria International Hospital — Bahria Golf City',
    'Asghar Mall Hospital — Asghar Mall Road',
    'Holy Family Hospital — Satellite Town',
  ],
  karachi: [
    'Dr. Ziauddin Hospital (Clifton)',
    'Dow University Hospital',
    'Aga Khan Hospital',
    'Indus Hospital'
  ],
  lahore: [
    'Doctors Hospital',
    'National Hospital',
    'Ittefaq Hospital',
    'Ganga Ram Hospital'
  ],
};

const PAGE_SIZE = 6;

// ============================================================
// HR KNOWLEDGE BASE
// ============================================================
const HR_KNOWLEDGE = `Aap M&P Express Logistics ke HR Assistant hain.

SAKHT HIDAYAT:
- Sirf saf Urdu ya English
- Mukhtasar jawab (3–5 lines)
- Agar maloomat na ho: "Yeh maloomat mere paas nahi. HRBP se rabta karein."
- Jawab ke aakhir mein: "0 — Main Menu"

LEAVES:
- Casual: 10
- Sick: 8
- Annual: 30

OFFICE TIMINGS:
- Mon–Fri: 9:00AM – 5:30PM
- Lunch: 1–2PM
- Weekend: Off

MEDICAL:
- Panel hospital: IGI Card
- Emergency allowed
- IGI: 042-345-03333`;

// ============================================================
// SESSION MANAGEMENT
// ============================================================
const sessions = {};
const SESSION_TIMEOUT = 30 * 60 * 1000;

// ✅ BUG FIX: HRBP active with timeout
// chatId => timestamp
const hrbpActive = new Map();

function getSession(chatId) {
  const now = Date.now();
  const s = sessions[chatId];
  if (!s || now - s.lastActive > SESSION_TIMEOUT) {
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
// TIME & GREETING
// ============================================================
function getPKTHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })).getHours();
}

function isOfficeHours() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  return d.getDay() >= 1 && d.getDay() <= 5 && d.getHours() >= 9 && d.getHours() < 18;
}

function getGreeting() {
  const h = getPKTHour();
  if (h >= 5 && h < 12) return 'Assalam o Alaikum! Subh Bakhair';
  if (h >= 12 && h < 17) return 'Assalam o Alaikum! Dopahar Bakhair';
  if (h >= 17 && h < 21) return 'Assalam o Alaikum! Shaam Bakhair';
  return 'Assalam o Alaikum! Shab Bakhair';
}

// ============================================================
// MAIN MENU
// ============================================================
function mainMenu(name) {
  return `${getGreeting()} ${name},

M&P Express HR Helpdesk:

1 — HR Policies & Benefits
2 — Office Timing & Attendance
3 — Medical Panel Hospitals
4 — Other HR Matters

Emergency:
IGI Helpline 042-345-03333 (24/7)`;
}

// ============================================================
// HOSPITAL FUNCTIONS
// ============================================================
function findCity(text) {
  return Object.keys(HOSPITALS).find(c => text.toLowerCase().includes(c)) || null;
}

function getHospitalPage(city, page) {
  const list = HOSPITALS[city];
  const start = page * PAGE_SIZE;
  const chunk = list.slice(start, start + PAGE_SIZE);
  if (!chunk.length) return null;

  let msg = `IGI Panel Hospitals — ${city.toUpperCase()}:\n\n`;
  chunk.forEach((h, i) => msg += `${start + i + 1}. ${h}\n`);
  msg += `\n"aur" — Mazeed\n"0" — Main Menu`;
  return msg;
}

function wantsMenu(txt) {
  return ['0', 'menu', 'back', 'wapas'].includes(txt.trim().toLowerCase());
}
function wantsMore(txt) {
  return ['aur', 'more', 'next', 'mazeed'].includes(txt.trim().toLowerCase());
}

// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMsg(chatId, message) {
  await axios.post(
    `https://api.green-api.com/waInstance${INSTANCE}/sendMessage/${TOKEN}`,
    { chatId, message }
  );
}

// ============================================================
// AI REPLY
// ============================================================
async function getAIReply(text, name) {
  if (!isOfficeHours()) {
    return `Office hours khatam ho chuki hain.\nNext working day reply mile ga.\n\n0 — Main Menu`;
  }

  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'tencent/hy3-preview:free',
      messages: [
        { role: 'system', content: HR_KNOWLEDGE },
        { role: 'user', content: `"${name}" ka sawaal: ${text}` }
      ]
    },
    { headers: { Authorization: `Bearer ${OPENROUTER_KEY}` } }
  );

  return res.data.choices[0].message.content;
}

// ============================================================
// WEBHOOK
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const b = req.body;
    const type = b.typeWebhook;

    // ✅ BUG FIX: sirf human HRBP manual reply
    if (type === 'outgoingMessageReceived' && b.senderData?.fromMe === true) {
      const chatId = b.chatData?.chatId;
      if (chatId) hrbpActive.set(chatId, Date.now());
      return;
    }

    if (type !== 'incomingMessageReceived') return;

    const chatId = b.senderData?.chatId;
    const text = b.messageData?.textMessageData?.textMessage;
    const name = b.senderData?.senderName || 'Employee';

    if (!chatId || !text || chatId.includes('@g.us')) return;

    // ✅ HRBP mute 15 minutes
    if (hrbpActive.has(chatId)) {
      if (Date.now() - hrbpActive.get(chatId) < 15 * 60 * 1000) {
        if (wantsMenu(text)) {
          hrbpActive.delete(chatId);
          setSession(chatId, { state: 'menu' });
          await sendMsg(chatId, mainMenu(name));
        }
        return;
      }
      hrbpActive.delete(chatId);
    }

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

    if (text === '1') {
      setSession(chatId, { state: 'ai_chat' });
      await sendMsg(chatId, 'HR policy ka sawaal likhein.\n\n0 — Menu');
      return;
    }

    if (text === '2') {
      await sendMsg(chatId, `Office Timing:\nMon–Fri 9:00–5:30\n\n0 — Menu`);
      return;
    }

    if (text === '3') {
      setSession(chatId, { state: 'hospital_city' });
      await sendMsg(chatId, 'City ka naam likhein.\n\n0 — Menu');
      return;
    }

    if (session.state === 'hospital_city') {
      const city = findCity(text);
      if (!city) {
        await sendMsg(chatId, 'Yeh city list mein nahi.\nDobara likhein.\n\n0 — Menu');
        return;
      }
      setSession(chatId, { state: 'hospital_list', hospitalCity: city, hospitalPage: 0 });
      await sendMsg(chatId, getHospitalPage(city, 0));
      return;
    }

    if (session.state === 'hospital_list' && wantsMore(text)) {
      const next = session.hospitalPage + 1;
      const msg = getHospitalPage(session.hospitalCity, next);
      if (msg) {
        setSession(chatId, { hospitalPage: next });
        await sendMsg(chatId, msg);
      } else {
        setSession(chatId, { state: 'menu' });
        await sendMsg(chatId, mainMenu(name));
      }
      return;
    }

    if (session.state === 'ai_chat') {
      const reply = await getAIReply(text, name);
      await sendMsg(chatId, reply);
      return;
    }

    await sendMsg(chatId, mainMenu(name));

  } catch (e) {
    console.error('Webhook error:', e.message);
  }
});

// ============================================================
app.get('/', (_, res) => res.send('✅ HR Bot Running'));
app.listen(process.env.PORT || 8080, () => console.log('✅ Bot started'));
``
