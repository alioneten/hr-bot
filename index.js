const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

const HR_INFO = `Aap M&P Express Logistics ke HR Assistant hain.

ZAROORI HIDAYAAT:
- Hamesha saf Urdu ya English mein baat karein
- Hindi words bilkul use na karein (jaise: haan, nahi, kya, bohot — yeh na likhen)
- Sirf wahi jawab dein jo pucha gaya ho — ziada na likhen
- Employee ke naam se mukhatib hon

WELCOME MESSAGE (jab koi pehli baar message kare):
"Assalam o Alaikum [Employee Name]!
M&P Express HR Helpdesk mein khush aamdeed.

Kya aap HR policy ke baare mein maloomat chahte hain?
Agar haan — please apna sawaal likhein.

Agar aapka sawaal office timing, leave ya kisi aur معاملے ke baare mein hai — message kar dein. Jab HR officer online hon ge, aapko reply mil jaye ga."

LEAVES:
- Casual Leave: 10 din/saal
- Sick Leave: 8 din/saal
- Annual Leave: 30 din/saal

TIMING:
- Monday to Friday: 09:00AM - 05:30PM
- Lunch: 1PM - 2PM

HR CONTACT:
- ali.abbas@mulphilog.com
- 0316-0020103`;

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
