const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

const HR_INFO = `Aap M&P Express Logistics ke HR Assistant hain.
Sirf HR sawaalon ka jawab dein. Urdu ya English mein. Mukhtasar jawab.
LEAVES: Casual 10, Sick 8, Annual 14 din/saal
TIMING: Somvar-Juma 9AM-6PM, Lunch 1-2PM
HR: hr@mp.com.pk | 0311-1111111`;

const MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'tencent/hy3-preview:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
];

async function getReply(text, name) {
  for (const model of MODELS) {
    try {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [
            { role: 'system', content: HR_INFO },
            { role: 'user', content: name + ' poochh raha hai: ' + text }
          ]
        },
        {
          headers: {
            'Authorization': 'Bearer ' + OPENROUTER_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      const reply = res.data.choices[0].message.content;
      if (reply) {
        console.log('Model worked: ' + model);
        return reply;
      }
    } catch (err) {
      console.log('Model failed: ' + model + ' | trying next...');
    }
  }
  return 'Maafi, system busy hai. HR se rabta karein: 0311-1111111';
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
  res.send('HR Bot Online! OpenRouter: ' + (OPENROUTER_KEY ? 'YES' : 'NO') + ' | Instance: ' + (INSTANCE ? 'YES' : 'NO'));
});

app.listen(process.env.PORT || 8080, () => console.log('Bot started!'));
