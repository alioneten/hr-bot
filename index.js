const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ============================================================
//  CONFIGURATION
// ============================================================
const CONFIG = {
  GEMINI_API_KEY:     process.env.GEMINI_API_KEY,
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID,
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN,
};

const HR_KNOWLEDGE = `
Aap M&P Express Logistics ke HR Assistant hain.
POLICIES: Casual 10, Sick 8, Annual 14 leaves. Timing 9AM-6PM.
Sirf HR se mutaliq sawaalon ke mukhtasir jawab Urdu/English mein dein.
`;

// ============================================================
//  GEMINI AI — Multi-Model Fallback
// ============================================================
async function getAIReply(userMessage, senderName) {
  // Hum pehle Flash try karenge, phir Pro
  const models = ['gemini-1.5-flash', 'gemini-pro'];
  
  for (let modelName of models) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: `${HR_KNOWLEDGE}\n\nEmployee: ${senderName}\nSawaal: ${userMessage}` }] }]
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.error(`Model ${modelName} failed, trying next...`);
    }
  }
  return "Maafi chahta hoon, system is waqt busy hai. Baraye meherbani thodi der baad koshish karein.";
}

// ============================================================
//  GREEN API SEND
// ============================================================
async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
  } catch (err) {
    console.error('Green API Send Error:', err.message);
  }
}

// ============================================================
//  WEBHOOK
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.typeWebhook !== 'incomingMessageReceived') return;

    const chatId = body.senderData?.chatId;
    const text = body.messageData?.textMessageData?.textMessage;
    const senderName = body.senderData?.senderName || 'Employee';

    if (chatId && text) {
      const reply = await getAIReply(text, senderName);
      await sendReply(chatId, reply);
    }
  } catch (err) {
    console.error('Webhook Main Error:', err.message);
  }
});

app.get('/', (req, res) => res.send('HR Bot is Online!'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
