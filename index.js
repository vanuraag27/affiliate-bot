require("dotenv").config();

const express = require("express");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const { getAmazonDeals } = require("./amazonService");

const app = express();

// ===== CONFIG =====
const ADMIN_ID = 8217802982; // 🔴 replace with your Telegram ID

// ===== TEMP STORE =====
let productStore = {};

// ===== SERVER =====

// Home
app.get("/", (req, res) => {
  res.send("Affiliate Bot Server Running 🚀");
});

// Track clicks
app.get("/track/:id", (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.query.user;

    let clicks = [];

    if (fs.existsSync("clicks.json")) {
      const data = fs.readFileSync("clicks.json", "utf-8");
      clicks = data ? JSON.parse(data) : [];
    }

    clicks.push({
      productId,
      userId,
      time: new Date()
    });

    fs.writeFileSync("clicks.json", JSON.stringify(clicks, null, 2));

    const link = productStore[productId];

    if (!link) {
      return res.send("Invalid product");
    }

    res.redirect(link);

  } catch (err) {
    console.error("Track Error:", err);
    res.status(500).send("Tracking failed");
  }
});

// Stats API
app.get("/api/stats", (req, res) => {
  try {
    let clicks = [];
    let users = [];

    if (fs.existsSync("clicks.json")) {
      const data = fs.readFileSync("clicks.json", "utf-8");
      clicks = data ? JSON.parse(data) : [];
    }

    if (fs.existsSync("users.json")) {
      const data = fs.readFileSync("users.json", "utf-8");
      users = data ? JSON.parse(data) : [];
    }

    res.json({
      totalClicks: clicks.length,
      totalUsers: users.length,
      earnings: clicks.length * 5
    });

  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Error fetching stats" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

// ===== TELEGRAM BOT =====

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Save user
function saveUser(user) {
  try {
    let users = [];

    if (fs.existsSync("users.json")) {
      const data = fs.readFileSync("users.json", "utf-8");
      users = data ? JSON.parse(data) : [];
    }

    if (!users.find(u => u.id === user.id)) {
      users.push(user);
      fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
    }

  } catch (err) {
    console.error("User Save Error:", err);
  }
}

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

// ===== AUTO FETCH (OPTIONAL) =====
bot.on("callback_query", async (query) => {
  bot.answerCallbackQuery(query.id);

  const chatId = query.message.chat.id;

  try {
    const products = await getAmazonDeals();

    if (!products.length) {
      return bot.sendMessage(chatId, "No deals found 😔");
    }

    products.forEach((p) => {
      productStore[p.id] = p.link;

      const trackLink = `${process.env.BASE_URL}/track/${p.id}?user=${query.from.id}`;

      bot.sendPhoto(chatId, p.image, {
        caption: `🔥 ${p.name}\n💰 ${p.price}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Buy Now 🛒", url: trackLink }]
          ]
        }
      });
    });

  } catch (err) {
    console.error("Bot Error:", err);
    bot.sendMessage(chatId, "Error loading deals 😔");
  }
});

// ===== MANUAL POST (MAIN FEATURE) =====

bot.onText(/\/post (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ Not authorized");
  }

  const chatId = msg.chat.id;

  // Format: name | price | image | link
  const input = match[1].split("|");

  if (input.length < 4) {
    return bot.sendMessage(chatId,
      "❗ Format:\n/post name | price | image | link"
    );
  }

  const name = input[0].trim();
  const price = input[1].trim();
  const image = input[2].trim();
  const link = input[3].trim();

  bot.sendPhoto(chatId, image, {
    caption: `🔥 ${name}\n💰 ${price}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "Buy Now 🛒", url: link }]
      ]
    }
  });
});
