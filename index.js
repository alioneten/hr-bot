const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ============================================================
//  CONFIGURATION — Railway Variables se data uthayega
// ============================================================
const CONFIG = {
  GEMINI_API_KEY:     process.env.GEMINI_API_KEY,
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID,
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN,
};

// ============================================================
//  HR KNOWLEDGE BASE
// ============================================================
const HR_KNOWLEDGE = `
Aap ek HR assistant hain. Sirf HR se related sawaalon ka jawab dein.
Urdu aur English dono mein samajhte hain aur jawab dete hain.
Hamesha friendly aur professional rahein.

=== COMPANY HR POLICIES ===
LEAVE POLICY:
- Casual Leave: 10 din per saal
- Sick Leave: 8 din per saal
- Annual Leave: 14 din per saal
- Leave form HR office se milta hai.

OFFICE TIMING:
- Somvar se Juma: 9:00 AM se 6:00 PM
- Lunch Break: 1:00 PM se 2:00 PM
- Saturday aur Sunday: Off

SALARY:
- Salary har mahine ki 1 tarikh ko aati hai.
- Payslip email pe bheja jaata hai.

RULES:
- Agar sawaal HR se related nahi hai to politely mana kar dein.
- Complex mamle ke liye HR office bulayein.
`;

// ============================================================
//  GEMINI AI — Updated URL for better stability
// ============================================================
async function getAIReply(userMessage, senderName) {
  try {
    const prompt = `${HR_KNOWLEDGE}\n\nEmployee: ${senderName}\nSawaal: ${userMessage}\nJawab:`;

    // Maine URL ko v1beta se v1 aur model ko flash pe set kiya hai
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    return response.data.candidates[0].content.parts[0].text;

  } catch (err) {
    // Ye logs Railway mein poora error dikhayenge agar Gemini fail hua
    console.error('--- GEMINI ERROR START ---');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Message:', err.message);
    }
    console.error('--- GEMINI ERROR END ---');
    
    return 'Maafi chahta hoon, system se rabta nahi ho pa raha. Baraye meherbani thodi der baad koshish karein ya HR office se contact karein.';
  }
}

// ============================================================
//  GREEN API — Send Message
// ============================================================
async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
    console.log(`Reply sent to: ${chatId}`);
  } catch (err) {
    console.error('Green API Error:', err.message);
  }
}

// ============================================================
//  WEBHOOK — Incoming Messages
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.typeWebhook !== 'incomingMessageReceived') return;
    if (body.messageData?.typeMessage !== 'textMessage') return;

    const chatId = body.senderData?.chatId;
    const senderName = body.senderData?.senderName || 'Employee';
    const text = body.messageData?.textMessageData?.textMessage;

    if (!chatId || !text) return;
    if (chatId.includes('@g.us')) return; // Ignore groups

    console.log(`Received message from ${senderName}: ${text}`);

    const reply = await getAIReply(text, senderName);
    await sendReply(chatId, reply);

  } catch (err) {
    console.error('Webhook Processing Error:', err.message);
  }
});

// ============================================================
//  ROOT & PORT SETTINGS
// ============================================================
app.get('/', (req, res) => {
  res.send('<h1>HR Bot is Live!</h1><p>Webhook is ready at /webhook</p>');
});

// Railway hamesha PORT variable provide karta hai
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
