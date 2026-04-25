require("dotenv").config();
process.env.NTBA_FIX_350 = true;

const express = require("express");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_ID = 1783057190;
const CHANNEL_ID = -1003968191044;
const BASE_URL = process.env.BASE_URL || "";

// ================= BOT (SAFE SINGLE INSTANCE) =================
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});

console.log("🤖 Bot started");

// ================= FILE HELPERS (SAFE) =================
function readJSON(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================= FILES =================
const USERS_FILE = "users.json";
const CLICKS_FILE = "clicks.json";
const PRODUCTS_FILE = "products.json";

// ================= SAVE USER =================
function saveUser(user) {
  const users = readJSON(USERS_FILE);

  if (!users.some(u => u.id === user.id)) {
    users.push(user);
    writeJSON(USERS_FILE, users);
  }
}

// ================= START COMMAND =================
bot.onText(/\/start/, (msg) => {
  saveUser({
    id: msg.from.id,
    name: msg.from.first_name
  });

  bot.sendMessage(
    msg.chat.id,
    "🔥 Welcome! Daily deals coming soon. Stay tuned!"
  );
});

// ================= TRACK CLICK =================
app.get("/track/:id", (req, res) => {
  const productId = req.params.id;

  const clicks = readJSON(CLICKS_FILE);

  clicks.push({
    productId,
    userId: req.query.user || "unknown",
    time: new Date().toISOString()
  });

  writeJSON(CLICKS_FILE, clicks);

  const products = readJSON(PRODUCTS_FILE);
  const product = products.find(p => p.id == productId);

  res.redirect(product ? product.link : "https://amazon.in");
});

// ================= STATS =================
app.get("/api/stats", (req, res) => {
  const clicks = readJSON(CLICKS_FILE);
  const users = readJSON(USERS_FILE);

  res.json({
    totalClicks: clicks.length,
    totalUsers: users.length,
    earnings: clicks.length * 5
  });
});

// ================= DASHBOARD =================
app.get("/dashboard", (req, res) => {
  res.send(`
    <html>
    <body style="font-family:Arial;text-align:center">
       <h1>🚀 Affiliate Bot Running</h1>
    <p>✅ Server is live</p>
    <p><a href="/dashboard">📊 View Dashboard</a></p>
  `);
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

// ================= AUTO POST (OPTIMIZED) =================
async function autoPost() {
  try {
    const users = readJSON(USERS_FILE);
    const products = readJSON(PRODUCTS_FILE);

    if (!products.length) return;

    const product = products[Math.floor(Math.random() * products.length)];

    const text =
      `🔥 ${product.name}\n` +
      `💰 ${product.price}\n` +
      `⚡ Limited Time Deal`;

    // Channel post
    await bot.sendPhoto(CHANNEL_ID, product.image, {
      caption: text,
      reply_markup: {
        inline_keyboard: [[
          { text: "🛒 Buy Now", url: product.link }
        ]]
      }
    });

    // Send only to FIRST 50 users (prevents crash)
    const batch = users.slice(0, 50);

    for (const user of batch) {
      try {
        await bot.sendPhoto(user.id, product.image, {
          caption: text
        });

        await new Promise(r => setTimeout(r, 120));
      } catch {}
    }

    console.log("✅ Auto post sent");
  } catch (err) {
    console.log("Auto post error:", err.message);
  }
}

// ================= SCHEDULE =================
cron.schedule("0 10 * * *", autoPost);
cron.schedule("0 20 * * *", autoPost);

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
