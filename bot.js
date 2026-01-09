import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on("new_chat_members", (ctx) => {
  const addedBy = ctx.message.from;
  const members = ctx.message.new_chat_members;

  members.forEach(user => {
    ctx.reply(
      `👤 Kim qo‘shildi: ${user.first_name}\n` +
      `➕ Kim qo‘shdi: ${addedBy.first_name}`
    );
  });
});

bot.launch();
