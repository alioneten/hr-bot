const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const CONFIG = {
  // Aapki key yahan quotes mein hai
  GEMINI_API_KEY:     'AIzaSyB9c5AaB3ETshtk-4yJ_8KtBqqP0PIJBKk', 
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID,
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN,
};

const HR_KNOWLEDGE = "Aap ek professional HR assistant hain. Employee ke sawaalon ka mukhtasir jawab dein.";

async function getAIReply(userMessage, senderName) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: `${HR_KNOWLEDGE}\n\nUser: ${userMessage}` }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      }
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    }
    return "Gemini ne koi jawab nahi diya (Empty Response).";

  } catch (err) {
    // Ye line aapko WhatsApp par asli error batayegi taake humein pata chale masla kya hai
    const errorMsg = err.response ? JSON.stringify(err.response.data.error.message) : err.message;
    return `System Error: ${errorMsg}`; 
  }
}

async function sendReply(chatId, message) {
  try {
    await axios.post(`https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`, {
      chatId, message
    });
  } catch (err) { console.error('GreenAPI Error'); }
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.typeWebhook === 'incomingMessageReceived') {
    const chatId = body.senderData.chatId;
    const text = body.messageData.textMessageData.textMessage;
    const reply = await getAIReply(text, body.senderData.senderName);
    await sendReply(chatId, reply);
  }
});

app.get('/', (req, res) => res.send('Bot is Running'));
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Server Live'));
