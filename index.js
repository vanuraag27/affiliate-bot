require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const app = express();

// ================= SERVER =================

app.get("/", (req, res) => {
  res.send("Affiliate Bot Server Running 🚀");
});

// Track clicks
app.get("/track/:id", (req, res) => {
  const productId = req.params.id;
  const userId = req.query.user;

  let clicks = [];
  if (fs.existsSync("clicks.json")) {
    clicks = JSON.parse(fs.readFileSync("clicks.json"));
  }

  clicks.push({
    productId,
    userId,
    time: new Date()
  });

  fs.writeFileSync("clicks.json", JSON.stringify(clicks, null, 2));

  const productLinks = {
    101: "https://amzn.to/demo1",
    102: "https://amzn.to/demo2"
  };

  res.redirect(productLinks[productId] || "https://amazon.in");
});

// API stats
app.get("/api/stats", (req, res) => {
  let clicks = [];
  let users = [];

  if (fs.existsSync("clicks.json")) {
    clicks = JSON.parse(fs.readFileSync("clicks.json"));
  }

  if (fs.existsSync("users.json")) {
    users = JSON.parse(fs.readFileSync("users.json"));
  }

  res.json({
    totalClicks: clicks.length,
    totalUsers: users.length,
    earnings: clicks.length * 5
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));

// ================= BOT =================

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Save user
function saveUser(user) {
  let users = [];

  if (fs.existsSync("users.json")) {
    users = JSON.parse(fs.readFileSync("users.json"));
  }

  if (!users.find(u => u.id === user.id)) {
    users.push(user);
    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
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

// Category click
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  const products = [
    {
      id: 101,
      name: "Samsung Galaxy M14",
      price: "₹12,999",
      image: "https://via.placeholder.com/300"
    },
    {
      id: 102,
      name: "Noise Smartwatch",
      price: "₹1,499",
      image: "https://via.placeholder.com/300"
    }
  ];

  products.forEach(p => {
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
});
