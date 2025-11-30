const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN; // Renderga oson bo‘lishi uchun

// Renderda yoki lokalda ekanini aniqlaymiz
const isRender = !!process.env.RENDER_EXTERNAL_URL;

let bot;

if (isRender) {
  // Render server uchun WEBHOOK
  bot = new TelegramBot(TOKEN, { webHook: true });
  const WEBHOOK_URL = `${process.env.RENDER_EXTERNAL_URL}/bot${TOKEN}`;
  bot.setWebHook(WEBHOOK_URL);
  console.log("Webhook mode:", WEBHOOK_URL);
} else {
  // Lokal — polling
  bot = new TelegramBot(TOKEN, { polling: true });
  console.log("Polling mode: LOCAL");
}

// Xabar kelganda javob
bot.on("message", (msg) => {
  bot.sendMessage(msg.chat.id, "Salom! Bot Render’da ishlayapti! 🚀");
});

// Render bo‘lsa serverni ishga tushiramiz
if (isRender) {
  const app = express();
  app.use(express.json());

  app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  const PORT = process.env.PORT || 3000; // ❗ MUHIM!
  app.listen(PORT, () => console.log("Server running on PORT:", PORT));
}
