require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { getTrendingProducts } = require("./amazonService");
const { saveUser } = require("./db");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// START
bot.onText(/\/start/, (msg) => {
  saveUser({
    id: msg.from.id,
    name: msg.from.first_name
  });

  bot.sendMessage(msg.chat.id, "Choose category:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📱 Mobiles", callback_data: "mobiles" }],
        [{ text: "🎧 Electronics", callback_data: "electronics" }]
      ]
    }
  });
});

// CATEGORY CLICK
bot.on("callback_query", async (query) => {
  const category = query.data;
  const chatId = query.message.chat.id;

  const products = await getTrendingProducts(category);

  if (!products.length) {
    return bot.sendMessage(chatId, "No products found.");
  }

  products.forEach(p => {
    const trackLink = `${process.env.BASE_URL}/track/${p.id}`;

    bot.sendPhoto(chatId, p.image, {
      caption: `🔥 ${p.name}\n💰 ${p.price}`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "Buy Now 🛒", url: trackLink }]
        ]
      }
    });
  });
});
