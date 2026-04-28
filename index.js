const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

// ============================================================
// TIME FUNCTIONS
// ============================================================
function getPKTHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })).getHours();
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

Emergency: IGI 042-345-03333 (24/7)`;
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
    console.log('Sent to: ' + chatId);
  } catch (err) {
    console.error('Send Error:', err.response?.data || err.message);
  }
}

// ============================================================
// WEBHOOK — Har message handle karo
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    console.log('Webhook received:', JSON.stringify(body).substring(0, 200));

    // Sirf incoming messages handle karo
    if (body.typeWebhook !== 'incomingMessageReceived') return;

    const chatId = body.senderData?.chatId;
    const senderName = body.senderData?.senderName || 'Employee';

    // chatId check
    if (!chatId) return;

    // Groups ignore karo
    if (chatId.includes('@g.us')) return;

    // Text nikalo — SWE001/SWE999 bhi handle karo
    let text = body.messageData?.textMessageData?.textMessage || '';

    // SWE errors — dobara message maango
    if (text.includes('{{SWE001}}') || text.includes('{{SWE999}}')) {
      await sendMsg(chatId, 'Maafi, aapka message nahi aaya. Meherbani kar ke dobara likhein.');
      return;
    }

    // Empty message — greeting bhejo
    if (!text || text.trim() === '') {
      await sendMsg(chatId, mainMenu(senderName));
      return;
    }

    console.log(`[${senderName}] ${chatId}: ${text}`);

    // Har message pe greeting + menu bhejo
    await sendMsg(chatId, mainMenu(senderName));

  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
});

app.get('/', (req, res) => {
  res.send('HR Bot Online! Instance: ' + (INSTANCE ? 'YES' : 'NO'));
});

app.listen(process.env.PORT || 8080, () => console.log('Bot started!'));
