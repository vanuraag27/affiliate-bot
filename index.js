require("dotenv").config();
process.env.NTBA_FIX_350 = true;

const express = require("express");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");

const app = express();
const PORT = 3000;

const ADMIN_ID = 1783057190; // 🔴 replace
const CHANNEL_ID = -1003968191044; // 🔴 replace
const BASE_URL = process.env.BASE_URL;

// ===== BOT =====
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});

// ===== DATA FILES =====
const USERS_FILE = "users.json";
const CLICKS_FILE = "clicks.json";
const PRODUCTS_FILE = "products.json";

// ===== SAVE USER =====
function saveUser(user) {
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
  }

  if (!users.find(u => u.id === user.id)) {
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

// ===== START =====
bot.onText(/\/start/, (msg) => {
  saveUser({
    id: msg.from.id,
    name: msg.from.first_name
  });

  bot.sendMessage(msg.chat.id, "🔥 Welcome! Daily deals coming...");
});

// ===== TRACK =====
app.get("/track/:id", (req, res) => {
  const productId = req.params.id;
  const userId = req.query.user;

  let clicks = [];
  if (fs.existsSync(CLICKS_FILE)) {
    clicks = JSON.parse(fs.readFileSync(CLICKS_FILE));
  }

  clicks.push({
    productId,
    userId,
    time: new Date()
  });

  fs.writeFileSync(CLICKS_FILE, JSON.stringify(clicks, null, 2));

  const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
  const product = products.find(p => p.id == productId);

  res.redirect(product ? product.link : "https://amazon.in");
});

// ===== STATS API =====
app.get("/api/stats", (req, res) => {
  let clicks = fs.existsSync(CLICKS_FILE)
    ? JSON.parse(fs.readFileSync(CLICKS_FILE))
    : [];

  let users = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];

  res.json({
    totalClicks: clicks.length,
    totalUsers: users.length,
    earnings: clicks.length * 5
  });
});

// ===== DASHBOARD UI =====
app.get("/dashboard", (req, res) => {
  res.send(`
    <html>
    <body style="font-family:Arial;text-align:center">
      <h1>📊 Affiliate Dashboard</h1>
      <div id="data">Loading...</div>

      <script>
        fetch('/api/stats')
          .then(res => res.json())
          .then(d => {
            document.getElementById('data').innerHTML =
              '<h2>Users: ' + d.totalUsers + '</h2>' +
              '<h2>Clicks: ' + d.totalClicks + '</h2>' +
              '<h2>Earnings: ₹' + d.earnings + '</h2>';
          });
      </script>
    </body>
    </html>
  `);
});

// ===== SMART CATEGORY =====
function getTopCategory() {
  if (!fs.existsSync(CLICKS_FILE)) return null;

  const clicks = JSON.parse(fs.readFileSync(CLICKS_FILE));
  let count = {};

  clicks.forEach(c => {
    if (!c.category) return;
    count[c.category] = (count[c.category] || 0) + 1;
  });

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

// ===== AUTO POST =====
async function autoPost() {
  let users = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];

  let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));

  const topCategory = getTopCategory();

  let filtered = topCategory
    ? products.filter(p => p.category === topCategory)
    : products;

  const product = filtered[Math.floor(Math.random() * filtered.length)];

  const productId = Date.now().toString();

  const trackLink = `${BASE_URL}/track/${productId}?user=0`;

  const text = `🔥 ${product.name}\n\n💰 ${product.price}\n\n⚡ Limited Time Deal`;

  // Send to channel
  try {
    await bot.sendPhoto(CHANNEL_ID, product.image, {
      caption: text,
      reply_markup: {
        inline_keyboard: [[{ text: "Buy Now 🛒", url: product.link }]]
      }
    });
  } catch (err) {}

  // Send to users
  for (let user of users) {
    try {
      await bot.sendPhoto(user.id, product.image, {
        caption: text,
        reply_markup: {
          inline_keyboard: [[{ text: "Buy Now 🛒", url: product.link }]]
        }
      });

      await new Promise(r => setTimeout(r, 120));

    } catch (err) {}
  }

  console.log("Auto post sent");
}

// ===== SCHEDULE =====
cron.schedule("0 10 * * *", autoPost);
cron.schedule("0 20 * * *", autoPost);

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
