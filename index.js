const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const CONFIG = {
  GEMINI_API_KEY:     AIzaSyB9c5AaB3ETshtk-4yJ_8KtBqqP0PIJBKk,
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID,
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN,
};

const HR_KNOWLEDGE = `
Aap ek HR assistant hain. Sirf HR se related sawaalon ka jawab dein.
=== COMPANY HR POLICIES ===
LEAVE: Casual 10, Sick 8, Annual 14.
TIMING: 9:00 AM se 6:00 PM (Mon-Fri).
SALARY: Har mahine ki 1 tarikh ko aati hai.
`;

async function getAIReply(userMessage, senderName) {
  try {
    const prompt = `${HR_KNOWLEDGE}\n\nEmployee: ${senderName}\nSawaal: ${userMessage}\nJawab:`;

    // Sirf v1beta hi use karna hai
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    return response.data.candidates[0].content.parts[0].text;

  } catch (err) {
    console.error('--- GEMINI ERROR ---');
    console.error(err.response ? JSON.stringify(err.response.data) : err.message);
    return 'Maafi chahta hoon, system se rabta nahi ho pa raha. Baraye meherbani thodi der baad koshish karein.';
  }
}

async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
  } catch (err) {
    console.error('Green API Error:', err.message);
  }
}

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
    if (chatId.includes('@g.us')) return;

    const reply = await getAIReply(text, senderName);
    await sendReply(chatId, reply);
  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
});

app.get('/', (req, res) => res.send('HR Bot is Active!'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
