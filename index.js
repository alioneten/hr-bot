const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const INSTANCE = process.env.GREEN_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

const HR_KNOWLEDGE = `Aap M&P Express Logistics ke HR Assistant hain.

SAKHT HIDAYAT:
- Sirf saf Urdu ya English mein jawab dein — Hindi words bilkul nahi
- Sirf neeche di gayi maloomat ke mutabiq jawab dein
- Agar sawaal knowledge base mein nahi hai to likhen:
  "Yeh maloomat mere paas maujood nahi. Apna sawaal HRBP ko bhej dein — online hone par jawab mil jaye ga."
- Apni taraf se kuch bhi na banayein
- Employee ke naam se mukhatib hon
- Mukhtasar aur wazeh jawab dein

LEAVES POLICY:
- Casual Leave: 10 din/saal
- Sick Leave: 8 din/saal
- Annual Leave: 30 din/saal
- Leave apply karne ke liye pehle supervisor ko batayein

OFFICE TIMING:
- Monday to Saturday: 9:00 AM - 5:30 PM (PKT)
- Lunch Break: 1:00 PM - 2:00 PM
- Late arrival grace period: 15 minutes
- Sunday: Band

HR CONTACT:
- Email: hr@mp.com.pk
- Phone: 0311-1111111`;

function getPakistanHour() {
  const now = new Date();
  const pkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  return pkTime.getHours();
}

function getWelcomeMessage(name) {
  const hour = getPakistanHour();
  const employeeName = name || 'Valued Employee';

  if (hour >= 9 && hour < 12) {
    return `Assalam o Alaikum ${employeeName},

Subh Bakhair! M&P Express HR Helpdesk mein khush aamdeed.
Umeed hai din ki achi shuruat ho.

Yeh service exclusively HR-related queries ke liye hai.
Apni inquiry ki nوعیت muntakhib farmaein:

1 — HR Policies & Benefits
2 — Office Timing & Attendance
3 — Other HR Matters

Option 1 ya 2 ka jawab fehri mil jaye ga.
Option 3 ke liye HRBP ki dastiyabi ke mutabiq jawab diya jaye ga.`;

  } else if (hour >= 12 && hour < 17) {
    return `Assalam o Alaikum ${employeeName},

Dopahar Bakhair! M&P Express HR Helpdesk mein khush aamdeed.

Yeh service exclusively HR-related queries ke liye hai.
Apni inquiry ki nوعیت muntakhib farmaein:

1 — HR Policies & Benefits
2 — Office Timing & Attendance
3 — Other HR Matters

Option 1 ya 2 ka jawab fehri mil jaye ga.
Option 3 ke liye HRBP ki dastiyabi ke mutabiq jawab diya jaye ga.`;

  } else if (hour >= 17 && hour < 19) {
    return `Assalam o Alaikum ${employeeName},

Shaam Bakhair! M&P Express HR Helpdesk mein khush aamdeed.

Aap ka message موصول ho gaya hai.
Office hours (9:00 AM - 5:30 PM) ختم hone wali hain.

Agar aap ka sawaal urgent hai to abhi likhein — warna aglay working day mein jawab diya jaye ga.

1 — HR Policies & Benefits
2 — Office Timing & Attendance
3 — Other HR Matters (aglay din jawab mile ga)`;

  } else {
    return `Assalam o Alaikum ${employeeName},

M&P Express HR Helpdesk mein khush aamdeed.

Aap ka message موصول ho gaya hai.
Filhal office hours (9:00 AM - 5:30 PM, PKT) khatam ho chuki hain.

Aap ka sawaal record kar liya gaya hai.
Aglay working day mein HRBP online hone par jawab diya jaye ga.

Shukriya — M&P Express HR Helpdesk`;
  }
}

function isOfficeHours() {
  const hour = getPakistanHour();
  const now = new Date();
  const pkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const day = pkTime.getDay();
  const isWeekday = day >= 1 && day <= 5;
  return isWeekday && hour >= 9 && hour < 17;
}

const seenUsers = new Set();

async function getAIReply(text, name) {
  if (!isOfficeHours()) {
    return `Assalam o Alaikum ${name},

Aap ka message موصول ho gaya hai.
Office hours (9:00 AM - 5:30 PM, Monday to Saturday) khatam ho chuki hain.

Aglay working day mein HRBP online hone par jawab diya jaye ga.

Shukriya — M&P Express HR Helpdesk`;
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
          model: model,
          messages: [
            { role: 'system', content: HR_KNOWLEDGE },
            { role: 'user', content: `Employee "${name}" ka sawaal: ${text}` }
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
        console.log('Model used: ' + model);
        return reply;
      }
    } catch (err) {
      console.log('Model failed: ' + model);
    }
  }
  return `Maafi ${name}, system abhi busy hai. Meherbani kar ke thodi dair baad dobara koshish karein ya ali.abbas@mulphilog.com pe email karein.`;
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
    const name = body.senderData?.senderName || 'Valued Employee';
    if (!chatId || !text) return;
    if (chatId.includes('@g.us')) return;

    // Pehli baar message karne par welcome bhejo
    if (!seenUsers.has(chatId)) {
      seenUsers.add(chatId);
      const welcome = getWelcomeMessage(name);
      await sendMsg(chatId, welcome);
      return;
    }

    // Baad ke messages AI se handle hon
    const reply = await getAIReply(text, name);
    await sendMsg(chatId, reply);

  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
});

app.get('/', (req, res) => {
  const hour = getPakistanHour();
  res.send(`HR Bot Online! OpenRouter: ${OPENROUTER_KEY ? 'YES' : 'NO'} | Instance: ${INSTANCE ? 'YES' : 'NO'} | PKT Hour: ${hour} | Office Hours: ${isOfficeHours() ? 'YES' : 'NO'}`);
});

app.listen(process.env.PORT || 8080, () => console.log('Bot started!'));
