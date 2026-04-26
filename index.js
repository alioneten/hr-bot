const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ============================================================
//  CONFIGURATION
// ============================================================
const CONFIG = {
  GEMINI_API_KEY:     'AIzaSyB9c5AaB3ETshtk-4yJ_8KtBqqP0PIJBKk', 
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID,
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN,
};

const HR_KNOWLEDGE = "Aap ek professional HR assistant hain. Sirf HR policy se mutaliq short jawab dein.";

// ============================================================
//  GEMINI AI FUNCTION (Universal Version)
// ============================================================
async function getAIReply(userMessage, senderName) {
  // Hum teenon mashhoor models try karenge, jo bhi chal jaye
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  for (let model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}...`);
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: `${HR_KNOWLEDGE}\n\nUser: ${userMessage}` }] }]
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.error(`${model} failed:`, err.message);
      // Agar aakhri model bhi fail ho jaye to error return karein
      if (model === modelsToTry[modelsToTry.length - 1]) {
        const finalError = err.response ? JSON.stringify(err.response.data.error.message) : err.message;
        return `System Error: ${finalError}`;
      }
    }
  }
}

// ============================================================
//  GREEN API SEND FUNCTION
// ============================================================
async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
  } catch (err) {
    console.error('Green API Error:', err.message);
  }
}

// ============================================================
//  WEBHOOK ENDPOINT
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.typeWebhook !== 'incomingMessageReceived') return;
    
    const chatId = body.senderData?.chatId;
    const text = body.messageData?.textMessageData?.textMessage;

    if (chatId && text) {
      const reply = await getAIReply(text, body.senderData.senderName);
      await sendReply(chatId, reply);
    }
  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
});

app.get('/', (req, res) => res.send('HR Bot is Online!'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
