/**
 * HR WhatsApp Bot — GreenAPI + OpenRouter
 * FIXED VERSION (Multi-user, no self-mute bug)
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ================= ENV =================
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

// ================= CONSTANTS =================
const PAGE_SIZE = 6;
const SESSION_TIMEOUT = 30 * 60 * 1000;

// ================= HRBP TAKEOVER =================
// chatId -> timestamp
const hrbpActive = new Map();

// ================= SESSIONS =================
const sessions = {};

// ================= HOSPITAL DATA =================
const HOSPITALS = {
  islamabad: [
    'Shifa International Hospital — H-8/4',
    'Kulsum International Hospital — Blue Area',
    'Maroof International Hospital — F-8',
    'Quaid-e-Azam International Hospital — PWD',
    'PMC Hospital — F-8',
    'Islamabad Clinic — G-10',
    'Advance International Hospital — Police Foundation',
    'Bahria International Hospital — Rawalpindi'
  ],
  karachi: [
    'Aga Khan Hospital',
    'Ziauddin Hospital',
    'Indus Hospital',
    'Dow University Hospital'
  ],
  lahore: [
    'Doctors Hospital',
    'National Hospital',
    'Ittefaq Hospital',
    'Ganga Ram Hospital'
  ]
};

// ================= HR KNOWLEDGE =================
const HR_KNOWLEDGE = `
Aap M&P Express Logistics ke HR Assistant hain.

Rules:
- Sirf Urdu ya English
- Agar info na ho: "Yeh maloomat mere paas nahi. HRBP se rabta karein."
- Mukhtasar jawab (3–5 lines)
- Last line: "0 — Main Menu"

Leaves:
- Casual: 10
- Sick: 8
- Annual: 30

Office:
- Mon–Fri: 9:00–5:30
- Lunch: 1–2
- Weekend: Off

Medical:
- Panel hospital: IGI Card
- Emergency: claim allowed
- IGI Helpline: 042-345-03333
`;

// ================= TIME =================
function getPKTHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })).getHours();
}

function isOfficeHours() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  return d.getDay() >= 1 && d.getDay() <= 5 && d.getHours() >= 9 && d.getHours() < 18;
}

// ================= SESSION =================
function getSession(chatId) {
  const now = Date.now();
  if (!sessions[chatId] || now - sessions[chatId].last > SESSION_TIMEOUT) {
    sessions[chatId] = { state: 'new', last: now };
  }
  sessions[chatId].last = now;
  return sessions[chatId];
}

function setSession(chatId, data) {
  sessions[chatId] = { ...sessions[chatId], ...data, last: Date.now() };
}

// ================= MENU =================
function mainMenu(name) {
  return `Assalam o Alaikum ${name},

M&P Express HR Helpdesk:

1 — HR Policies
2 — Office Timing
3 — Medical Panel Hospitals
4 — Other HR Matters

Emergency:
IGI 042-345-03333 (24/7)`;
}

// ================= HOSPITAL =================
function getHospitalPage(city, page) {
  const list = HOSPITALS[city];
  if (!list) return null;
  const start = page * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);
  if (!slice.length) return null;

  let msg = `IGI Panel Hospitals — ${city}\n\n`;
  slice.forEach((h, i) => {
    msg += `${start + i + 1}. ${h}\n`;
  });

  return msg + `\n"aur" — More\n"0" — Menu`;
}

function wantsMenu(text) {
  return ['0', 'menu', 'back', 'wapas'].includes(text.trim().toLowerCase());
}

function wantsMore(text) {
  return ['aur', 'more', 'next'].includes(text.trim().toLowerCase());
}

// ================= SEND =================
async function sendMsg(chatId, message) {
  await axios.post(
    `https://api.green-api.com/waInstance${INSTANCE}/sendMessage/${TOKEN}`,
    { chatId, message }
  );
}

// ================= AI =================
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
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return res.data.choices[0].message.content;
}

// ================= WEBHOOK =================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    const type = body.typeWebhook;

    // ✅ HRBP manual reply ONLY (not bot)
    if (type === 'outgoingMessageReceived' && body.senderData?.fromMe === true) {
      const chatId = body.chatData?.chatId;
      if (chatId) {
        hrbpActive.set(chatId, Date.now());
        console.log('HRBP active in:', chatId);
      }
      return;
    }

    if (type !== 'incomingMessageReceived') return;

    const chatId = body.senderData?.chatId;
    const text = body.messageData?.textMessageData?.textMessage;
    const name = body.senderData?.senderName || 'Employee';

    if (!chatId || !text || chatId.includes('@g.us')) return;

    // ✅ HRBP mute for 15 minutes
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
      setSession(chatId, { state: 'ai' });
      await sendMsg(chatId, 'HR policy ka sawaal likhein.\n\n0 — Menu');
      return;
    }

    if (text === '2') {
      await sendMsg(chatId, 'Office Timing: Mon–Fri 9:00–5:30\n\n0 — Menu');
      return;
    }

    if (text === '3') {
      setSession(chatId, { state: 'hospital', page: 0, city: 'islamabad' });
      await sendMsg(chatId, getHospitalPage('islamabad', 0));
      return;
    }

    if (session.state === 'hospital' && wantsMore(text)) {
      const next = (session.page || 0) + 1;
      const msg = getHospitalPage(session.city, next);
      if (msg) {
        setSession(chatId, { page: next });
        await sendMsg(chatId, msg);
      } else {
        setSession(chatId, { state: 'menu' });
        await sendMsg(chatId, mainMenu(name));
      }
      return;
    }

    if (session.state === 'ai') {
      const reply = await getAIReply(text, name);
      await sendMsg(chatId, reply);
      return;
    }

    await sendMsg(chatId, mainMenu(name));

  } catch (e) {
    console.error('Webhook error:', e.message);
  }
});

// ================= ROOT =================
app.get('/', (_, res) => res.send('HR Bot Running ✅'));

app.listen(process.env.PORT || 8080, () =>
  console.log('✅ HR Bot started successfully')
);
