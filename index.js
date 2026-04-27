const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

const HR_INFO = `
Aap M&P Express Logistics ke HR Assistant hain.
Sirf HR sawaalon ka jawab dein. Urdu ya English mein.

LEAVES:
- Casual Leave: 10 din/saal
- Sick Leave: 8 din/saal
- Annual Leave: 14 din/saal

TIMING:
- Somvar se Juma: 9AM - 6PM
- Lunch: 1PM - 2PM

HR CONTACT:
- HR Email: hr@mp.com.pk
- HR Number: 0311-1111111
`;

async function getReply(text, name) {
  try {
    const res = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY,
      {
        contents: [{
          parts: [{
            text: HR_INFO + '\n\nEmployee: ' + name + '\nSawaal: ' + text + '\n\nMukhtasar jawab do:'
          }]
        }]
      }
    );
    return res.data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error('Gemini Error:', err.response?.data || err.message);
    return 'Maafi, abhi system busy hai. HR office se rabta karein.';
  }
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
    const reply = await getReply(text, name);
    await sendMsg(chatId, reply);
  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
});

app.get('/', (req, res) => {
  res.send('HR Bot Online! Key set: ' + (GEMINI_KEY ? 'YES' : 'NO') + ' | Instance: ' + (INSTANCE ? 'YES' : 'NO'));
});

app.listen(process.env.PORT || 8080, () => console.log('Bot started!'));
