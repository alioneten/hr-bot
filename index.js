const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ============================================================
//  CONFIGURATION
// ============================================================
const CONFIG = {
  // Aapki API Key
  GEMINI_API_KEY:     'AIzaSyB9c5AaB3ETshtk-4yJ_8KtBqqP0PIJBKk', 
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID,
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN,
};

const HR_KNOWLEDGE = `
Aap ek professional HR assistant hain.
LEAVE POLICY: Casual 10, Sick 8, Annual 14.
TIMING: 9:00 AM se 6:00 PM (Monday-Friday).
SALARY: Har mahine ki 1 tarikh ko aati hai.
Sirf HR se mutaliq sawaalon ke jawab Urdu ya English mein dein.
`;

// ============================================================
//  GEMINI AI FUNCTION (Stable v1 Version)
// ============================================================
async function getAIReply(userMessage, senderName) {
  try {
    // Stable v1 URL aur basic model name istemal kar rahe hain
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: `${HR_KNOWLEDGE}\n\nEmployee: ${senderName}\nSawaal: ${userMessage}` }] }]
      }
    );

    if (response.data && response.data.candidates && response.data.candidates[0].content) {
      return response.data.candidates[0].content.parts[0].text;
    }
    return "Maafi chahta hoon, main is waqt jawab nahi de pa raha.";

  } catch (err) {
    console.error('--- GEMINI ERROR ---');
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error(errorMsg);
    
    // Agar Flash fail ho to seedha error message bhej dein taake debug ho sake
    return `System Error: ${errorMsg}`;
  }
}

// ============================================================
//  GREEN API SEND FUNCTION
// ============================================================
async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
    console.log(`Reply sent to ${chatId}`);
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

app.get('/', (req, res) => res.send('HR Bot is Live!'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
