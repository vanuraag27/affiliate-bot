require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const products = require("./products");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// START COMMAND
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome! Choose category:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📱 Mobiles", callback_data: "mobiles" }],
        [{ text: "🎧 Electronics", callback_data: "electronics" }]
      ]
    }
  });
});

// HANDLE CATEGORY CLICK
bot.on("callback_query", (query) => {
  const category = query.data;
  const chatId = query.message.chat.id;

  const filtered = products.filter(p => p.category === category);

  if (filtered.length === 0) {
    return bot.sendMessage(chatId, "No products found.");
  }

  filtered.forEach(product => {
    const trackLink = `${process.env.BASE_URL}/track/${product.id}`;

    bot.sendMessage(chatId,
      `🔥 ${product.name}\n💰 ${product.price}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Buy Now 🛒", url: trackLink }]
          ]
        }
      }
    );
  });
});