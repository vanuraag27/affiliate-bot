require("dotenv").config();

const express = require("express");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// ===== CONFIG =====
const ADMIN_ID = 1783057190; // 🔴 replace with your Telegram ID
const PORT = 3000;

// ===== TEMP PRODUCT STORE =====
let productStore = {};

// ===== SERVER =====

// Home
app.get("/", (req, res) => {
  res.send("Affiliate Bot Running 🚀");
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

    if (!link) return res.send("Invalid product");

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

  } catch (err) {
    res.status(500).json({ error: "Error fetching stats" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ===== TELEGRAM BOT =====

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ===== SAVE USER =====
function saveUser(user) {
  try {
    let users = [];

    if (fs.existsSync("users.json")) {
      users = JSON.parse(fs.readFileSync("users.json"));
    }

    if (!users.find(u => u.id === user.id)) {
      users.push(user);
      fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
    }

  } catch (err) {
    console.error("User Save Error:", err);
  }
}

// ===== START =====
bot.onText(/\/start/, (msg) => {
  saveUser({
    id: msg.from.id,
    name: msg.from.first_name
  });

  bot.sendMessage(msg.chat.id, "Welcome! Use /post or wait for deals 🚀");
});

// ===== /POST =====
bot.onText(/\/post (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ Not authorized");
  }

  const input = match[1].split("|");

  if (input.length < 4) {
    return bot.sendMessage(msg.chat.id,
      "❗ Format:\n/post name | price | image | link"
    );
  }

  const name = input[0].trim();
  const price = input[1].trim();
  const image = input[2].trim();
  const link = input[3].trim();

  bot.sendPhoto(msg.chat.id, image, {
    caption: `🔥 ${name}\n💰 ${price}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "Buy Now 🛒", url: link }]
      ]
    }
  });
});

// ===== /BROADCAST =====
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ Not authorized");
  }

  const input = match[1].split("|");

  if (input.length < 4) {
    return bot.sendMessage(msg.chat.id,
      "❗ Format:\n/broadcast name | price | image | link"
    );
  }

  const name = input[0].trim();
  const price = input[1].trim();
  const image = input[2].trim();
  const link = input[3].trim();

  let users = [];

  if (fs.existsSync("users.json")) {
    users = JSON.parse(fs.readFileSync("users.json"));
  }

  let success = 0;
  let failed = 0;

  for (let user of users) {
    try {
      await bot.sendPhoto(user.id, image, {
        caption: `🔥 ${name}\n💰 ${price}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Buy Now 🛒", url: link }]
          ]
        }
      });

      // delay to avoid Telegram limits
      await new Promise(r => setTimeout(r, 120));

      success++;

    } catch (err) {
      failed++;
    }
  }

  bot.sendMessage(msg.chat.id,
    `📢 Broadcast Done\n✅ Success: ${success}\n❌ Failed: ${failed}`
  );
});

// ===== /USERS =====
bot.onText(/\/users/, (msg) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "❌ Not authorized");
  }

  let users = [];

  if (fs.existsSync("users.json")) {
    users = JSON.parse(fs.readFileSync("users.json"));
  }

  bot.sendMessage(msg.chat.id, `👥 Total Users: ${users.length}`);
});
