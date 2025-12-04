import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_CODE = (process.env.ADMIN_CODE || "admin").toLowerCase();
const SECRET_LINK = process.env.SECRET_LINK || "https://t.me/";
const RAW_CHANNELS = process.env.CHANNELS || "";

// CHANNELS massivini tayyorlaymiz:
// - Agar qiymat "@kanal" bo'lsa: tekshirish uchun "@kanal", url uchun https://t.me/kanal
// - Agar qiymat "https://t.me/..." bo'lsa: url aynan shu, tekshirish esa "@handle" bo'lmasa ishlamasligi mumkin (private bo'lsa ID kerak)
const CHANNELS = RAW_CHANNELS.split(",")
  .map(s => s.trim())
  .filter(Boolean)
  .map(item => {
    const isHandle = item.startsWith("@");
    const url = isHandle ? `https://t.me/${item.slice(1)}` : item;
    return { handle: isHandle ? item : null, url };
  });

const bot = new TelegramBot(TOKEN, { polling: true });

// ---------- UI helpers ----------
const channelsKeyboard = () => {
  const rows = CHANNELS.map(ch => ([
    { text: `➕ ${ch.handle ? ch.handle : "Kanal"}`, url: ch.url }
  ]));
  // Pastiga tekshirish tugmasi
  rows.push([{ text: "🔄 Tekshirish", callback_data: "check" }]);
  return { inline_keyboard: rows };
};

const startText = () => {
  const list = CHANNELS
    .map(ch => `👉 ${ch.handle ? ch.handle : ch.url}`)
    .join("\n");
  return (
`👋 *Assalomu alaykum!*
Quyidagi kanallarga obuna bo‘ling, so‘ng *Tekshirish* tugmasini bosing:
😎
`
  );
};

// ---------- Start ----------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, startText(), {
    parse_mode: "Markdown",
    reply_markup: channelsKeyboard()
  });
});

// ---------- Callback: check ----------
bot.on("callback_query", async (query) => {
  const chatId = query.from.id;
  if (query.data === "check") {
    await checkSubscriptions(chatId);
    return;
  }
});

// ---------- Admin code: typing message ----------
bot.on("message", async (msg) => {
  if (!msg.text) return;
  const txt = msg.text.trim().toLowerCase();

  // admin sirli so'z
  if (txt === ADMIN_CODE) {
    await bot.sendMessage(
      msg.chat.id,
      `🎉 *Admin tasdiqlandi!*\n\n👉 Maxfiy kanal: ${SECRET_LINK}`,
      { parse_mode: "Markdown" }
    );
    return;
  }
});

// ---------- Subscription checker ----------
async function checkSubscriptions(userId) {
  // Agar handle yo'q bo'lsa (faqat URL bo'lsa), getChatMember ishlamasligi mumkin.
  // Shunda foydalanuvchiga "kanallar tugmalaridan obuna bo'ling" deb qayta taklif qilamiz.
  const checkable = CHANNELS.filter(c => !!c.handle);
  if (checkable.length === 0) {
    await bot.sendMessage(
      userId,
      `⚠️ Tekshirish uchun public *@handle* kerak. Iltimos kanallarga obuna bo‘ling va qayta sinab ko‘ring.`,
      { parse_mode: "Markdown", reply_markup: channelsKeyboard() }
    );
    return;
  }

  try {
    const notJoined = [];
    for (const ch of checkable) {
      try {
        const m = await bot.getChatMember(ch.handle, userId);
        const ok = ["member", "administrator", "creator"].includes(m.status);
        if (!ok) notJoined.push(ch);
      } catch (e) {
        // Bot kanalga admin bo'lmasa yoki kanal topilmasa shu yerga tushadi
        notJoined.push(ch);
      }
    }

    if (notJoined.length === 0) {
      await bot.sendMessage(
        userId,
        `✅ *Tabriklaymiz!* Barcha kanallarga obuna bo‘lgansiz barcha kinolar shu kanalda.\n\n👉 Maxfiy kanal: ${SECRET_LINK}`,
        { parse_mode: "Markdown" }
      );
    } else {
      const list = notJoined.map(ch => `• ${ch.handle ?? ch.url}`).join("\n");
      await bot.sendMessage(
        userId,
        `❌ Quyidagi kanallarga obuna tasdiqlanmadi:\n\n\nIltimos, obuna bo‘lib qayta tekshiring.`,
        { reply_markup: channelsKeyboard() }
      );
    }
  } catch (err) {
    await bot.sendMessage(
      userId,
      `⚠️ Tekshirishda xatolik. Botni kanallarga *admin* qilib qo‘ying va qayta urinib ko‘ring.`,
      { parse_mode: "Markdown", reply_markup: channelsKeyboard() }
    );
  }
}

// ---------- Render HTTP server ----------
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.send("Telegram bot is running on Render 🚀");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
