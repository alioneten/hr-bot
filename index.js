const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  // Aapki active API key quotes ke andar
  GEMINI_API_KEY:     'AIzaSyB9c5AaB3ETshtk-4yJ_8KtBqqP0PIJBKk', 
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID,
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN,
};

const HR_KNOWLEDGE = `
Aap ek professional HR assistant hain.
LEAVE POLICY: Casual 10, Sick 8, Annual 14.
TIMING: 9:00 AM se 6:00 PM (Monday-Friday).
SALARY: Har mahine ki 1 tarikh ko aati hai.
Sirf HR se mutaliq sawaalon ke jawab mukhtasir Urdu ya English mein dein.
`;

// ============================================================
// GEMINI AI FUNCTION (Updated with Latest Model & Fallback)
// ============================================================
async function getAIReply(userMessage, senderName) {
  try {
    // Model name changed to gemini-1.5-flash-latest for v1beta compatibility
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: `${HR_KNOWLEDGE}\n\nEmployee Name: ${senderName}\nSawaal: ${userMessage}` }] }],
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
    return "Maafi chahta hoon, main is waqt jawab nahi de pa raha.";

  } catch (err) {
    console.error('--- GEMINI ERROR ---');
    const errorDetail = err.response ? JSON.stringify(err.response.data.error.message) : err.message;
    console.error(errorDetail);
    
    // Fallback if Flash fails
    try {
      const fallback = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: userMessage }] }] }
      );
      return fallback.data.candidates[0].content.parts[0].text;
    } catch (fErr) {
      return `System Error: ${errorDetail}`;
    }
  }
}

// ============================================================
// GREEN API SEND FUNCTION
// ============================================================
async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.CONFIG_GREEN_INSTANCE_ID || CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
    console.log(`Reply sent to ${chatId}`);
  } catch (err) {
    console.error('Green API Send Error:', err.message);
  }
}

// ============================================================
// WEBHOOK ENDPOINT
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
    if (chatId.includes('@g.us')) return; // Ignore Groups

    console.log(`Processing message from ${senderName}: ${text}`);

    const reply = await getAIReply(text, senderName);
    await sendReply(chatId, reply);

  } catch (err) {
    console.error('Webhook Main Error:', err.message);
  }
});

// Root Route
app.get('/', (req, res) => res.send('HR Bot Status: Online & Active!'));

// Port Settings
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
