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
//  HR KNOWLEDGE BASE — Aapki Company ki Policies
// ============================================================
const HR_KNOWLEDGE = `
Aap ek professional HR assistant hain jo M&P Express Logistics ke liye kaam karte hain.
=== COMPANY HR POLICIES ===
1. LEAVE: Casual 10, Sick 8, Annual 14 (Total 32 per year).
2. TIMING: 9:00 AM se 6:00 PM (Monday to Friday).
3. SALARY: Har mahine ki 1 tarikh ko transfer hoti hai.
4. LOCATION: Office Islamabad mein hai.

Hidayat: Sirf HR se related sawaalon ke jawab mukhtasir Urdu ya English mein dein.
`;

// ============================================================
//  GEMINI AI — Nayi API Key ke saath
// ============================================================
async function getAIReply(userMessage, senderName) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{ 
          parts: [{ text: `${HR_KNOWLEDGE}\n\nEmployee: ${senderName}\nSawaal: ${userMessage}\nJawab:` }] 
        }]
      }
    );

    if (response.data && response.data.candidates) {
      return response.data.candidates[0].content.parts[0].text;
    }
    return "Maafi chahta hoon, main is waqt jawab nahi de pa raha.";

  } catch (err) {
    console.error('Gemini Error:', err.response ? err.response.data : err.message);
    // WhatsApp par asli error dikhane ke liye taake debug ho sake
    const errorMsg = err.response ? err.response.data.error.message : err.message;
    return `System Alert: ${errorMsg}`;
  }
}

// ============================================================
//  GREEN API — WhatsApp par reply bhejne ke liye
// ============================================================
async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
    console.log(`Reply sent successfully to ${chatId}`);
  } catch (err) {
    console.error('Green API Send Error:', err.message);
  }
}

// ============================================================
//  WEBHOOK — Incoming Message handle karne ke liye
// ============================================================
app.post('/webhook', async (req, res) => {
  // Green API ko foran 200 OK bhej dena chahiye
  res.sendStatus(200);

  try {
    const body = req.body;
    
    // Check karein ke kya ye naya text message hai?
    if (body.typeWebhook !== 'incomingMessageReceived') return;
    if (body.messageData?.typeMessage !== 'textMessage') return;

    const chatId = body.senderData?.chatId;
    const senderName = body.senderData?.senderName || 'Employee';
    const text = body.messageData?.textMessageData?.textMessage;

    if (!chatId || !text) return;
    if (chatId.includes('@g.us')) return; // Groups ko ignore karein

    console.log(`Message received from ${senderName}: ${text}`);

    // Gemini se jawab lein
    const reply = await getAIReply(text, senderName);
    
    // WhatsApp par reply bhej dein
    await sendReply(chatId, reply);

  } catch (err) {
    console.error('Webhook Main Error:', err.message);
  }
});

// Bot status check karne ke liye
app.get('/', (req, res) => res.send('HR Bot Status: Online & Active!'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
