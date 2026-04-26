const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ============================================================
//  CONFIGURATION — Sirf yeh 3 cheezein daalni hain
// ============================================================
const CONFIG = {
  GEMINI_API_KEY:     process.env.GEMINI_API_KEY     || 'YOUR_GEMINI_KEY',
  GREEN_INSTANCE_ID:  process.env.GREEN_INSTANCE_ID  || 'YOUR_INSTANCE_ID',
  GREEN_API_TOKEN:    process.env.GREEN_API_TOKEN     || 'YOUR_API_TOKEN',
};

// ============================================================
//  HR KNOWLEDGE BASE
//  Apni company ki real info yahan update karein
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
- Leave apply karne ke liye pehle supervisor ko batayein
- Leave form HR office se milta hai ya HR email pe request karein

OFFICE TIMING:
- Somvar se Juma: 9:00 AM se 6:00 PM
- Lunch Break: 1:00 PM se 2:00 PM
- Late arrival grace period: 15 minute
- Saturday aur Sunday: Band

SALARY:
- Salary har mahine ki 1 tarikh ko account mein aati hai
- Payslip email pe bheja jaata hai
- Salary issue ho to HR office se contact karein

HR CONTACTS:
- HR Head: [Yahan naam aur number likhein]
- Payroll Officer: [Yahan naam aur number likhein]  
- HR Email: hr@company.com
- HR Office: [Office room number ya location]

COMPANY HOLIDAYS:
- Public holidays sarkari calendar ke mutabiq
- Eid ul Fitr: 3 din
- Eid ul Adha: 3 din
- Independence Day: 14 August
- Complete list HR office se milegi

RULES:
- Agar sawaal HR se bilkul related nahi hai to politely batao ke sirf HR queries handle hoti hain
- Personal ya sensitive data share mat karo
- Complex mamle ke liye HR officer se milne ki salah do
- Agar jawab nahi pata to HR office se directly contact karne ki advice do
`;

// ============================================================
//  GEMINI AI — Jawab generate karta hai
// ============================================================
async function getAIReply(userMessage, senderName) {
  try {
    const prompt = `${HR_KNOWLEDGE}

Employee ka naam: ${senderName || 'Employee'}
Employee ka sawaal: ${userMessage}

Mukhtasar aur helpful jawab do (200 words se kam):`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.3 }
      }
    );

    return response.data.candidates[0].content.parts[0].text;

  } catch (err) {
    console.error('Gemini error:', err.response?.data || err.message);
    return 'Maafi chahta hoon, abhi system busy hai. براہ کرم thodi der baad dobara try karein ya HR office se seedha contact karein.';
  }
}

// ============================================================
//  GREEN API — WhatsApp pe reply bhejta hai
// ============================================================
async function sendReply(chatId, message) {
  try {
    const url = `https://api.green-api.com/waInstance${CONFIG.GREEN_INSTANCE_ID}/sendMessage/${CONFIG.GREEN_API_TOKEN}`;
    await axios.post(url, { chatId, message });
    console.log(`Reply sent to: ${chatId}`);
  } catch (err) {
    console.error('Green API send error:', err.response?.data || err.message);
  }
}

// ============================================================
//  WEBHOOK — Green API yahan messages deliver karta hai
// ============================================================
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Green API ko turant 200 chahiye

  try {
    const body = req.body;

    // Sirf incoming text messages handle karein
    if (body.typeWebhook !== 'incomingMessageReceived') return;
    if (body.messageData?.typeMessage !== 'textMessage') return;

    const chatId      = body.senderData?.chatId;      // e.g. 923001234567@c.us
    const senderName  = body.senderData?.senderName;  // sender ka naam
    const text        = body.messageData?.textMessageData?.textMessage;

    if (!chatId || !text) return;

    // Group messages ignore karein — sirf individual chat
    if (chatId.includes('@g.us')) return;

    console.log(`[${senderName}] ${text}`);

    // AI se jawab lo
    const reply = await getAIReply(text, senderName);

    // Reply bhejo
    await sendReply(chatId, reply);

  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

// ============================================================
//  STATUS PAGE — Khud check karo ke sab theek hai
// ============================================================
app.get('/', (req, res) => {
  const geminiOk  = CONFIG.GEMINI_API_KEY  !== 'YOUR_GEMINI_KEY';
  const instanceOk = CONFIG.GREEN_INSTANCE_ID !== 'YOUR_INSTANCE_ID';
  const tokenOk   = CONFIG.GREEN_API_TOKEN !== 'YOUR_API_TOKEN';
  const allOk     = geminiOk && instanceOk && tokenOk;

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>HR Bot Status</title>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 560px; margin: 60px auto; padding: 20px; }
    h1 { font-size: 22px; }
    .status { font-size: 18px; padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
    .ok  { background: #d4edda; color: #155724; }
    .bad { background: #f8d7da; color: #721c24; }
    .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>HR WhatsApp Bot</h1>
  <div class="status ${allOk ? 'ok' : 'bad'}">
    ${allOk ? '✓ Bot chal raha hai!' : '✗ Setup incomplete — neeche check karein'}
  </div>
  <div class="item"><span>Gemini API Key</span><span>${geminiOk ? '✓ Set hai' : '✗ Set karna baqi'}</span></div>
  <div class="item"><span>Green API Instance ID</span><span>${instanceOk ? '✓ Set hai' : '✗ Set karna baqi'}</span></div>
  <div class="item"><span>Green API Token</span><span>${tokenOk ? '✓ Set hai' : '✗ Set karna baqi'}</span></div>
  <div class="item"><span>Webhook URL</span><span><code>${req.protocol}://${req.get('host')}/webhook</code></span></div>
  <p style="color:#666;font-size:13px;margin-top:20px;">
    Webhook URL ko Green-API dashboard mein paste karo.<br>
    Gemini key: aistudio.google.com
  </p>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HR Bot running on port ${PORT}`));
