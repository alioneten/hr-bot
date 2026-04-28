const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ================= ENV VARIABLES =================
const INSTANCE = process.env.GREEN_INSTANCE_ID; // e.g. 7107600645
const TOKEN = process.env.GREEN_API_TOKEN;      // full token

// ================= SEND MESSAGE =================
async function sendMsg(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${INSTANCE}/sendg.us')) return; // groups ignore    const url = `https://api.green-api.com/waInstance${INSTANCE}/sendMessage/${TOKEN}`;

    console.log('📩 Incoming message from:', chatId);

    // ✅ UNIVERSAL REPLY
    await sendMsg(chatId, 'Assalam o Alaikum');

  } catch (err) {
    console.error('❌ Webhook Error:', err.message);
  }
});

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send('✅ Simple Greeting Bot Running');
});

// ================= START SERVER =================
app.listen(process.env.PORT || 8080, () => {
  console.log('✅ Bot started successfully');
});

    console.log('➡️ Sending to:', chatId);
    console.log('➡️ Message:', message);

    const res = await axios.post(url, {
      chatId: chatId,
      message: message
    });

    console.log('✅ Sent:', res.data);
  } catch (err) {
    console.error(
      '❌ Send Error:',
      err.response?.data || err.message
    );
  }
}

// ================= WEBHOOK =================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;

    // ✅ Sirf incoming messages
    if (body.typeWebhook !== 'incomingMessageReceived') return;

    const chatId = body.senderData?.chatId;

    // ✅ Safety checks (common GreenAPI issues)
    if (!chatId) return;
