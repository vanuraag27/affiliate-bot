require("dotenv").config();

const express = require("express");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const { getAmazonDeals } = require("./amazonService");

const app = express();

// ===== TEMP PRODUCT STORE =====
let productStore = {};

// ===== SERVER =====

// Home route
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

    const productLink = productStore[productId];

    if (!productLink) {
      return res.send("Invalid product link");
    }

    res.redirect(productLink);

  } catch (error) {
    console.error("Track Error:", error);
    res.status(500).send("Error tracking click");
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

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Start server
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
  } catch (error) {
    console.error("User Save Error:", error);
  }
}

// Start command
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

// Handle category click
bot.on("callback_query", async (query) => {
  bot.answerCallbackQuery(query.id);

  const chatId = query.message.chat.id;

  try {
    const products = await getAmazonDeals();

    if (!products.length) {
      return bot.sendMessage(chatId, "No deals found 😔");
    }

    products.forEach((p) => {
      // Store link for tracking
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

  } catch (error) {
    console.error("Bot Error:", error);
    bot.sendMessage(chatId, "Error loading deals 😔");
  }
});
