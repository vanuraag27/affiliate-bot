const fs = require("fs");

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

function saveClick(data) {
  let clicks = [];
  if (fs.existsSync("clicks.json")) {
    clicks = JSON.parse(fs.readFileSync("clicks.json"));
  }

  clicks.push(data);
  fs.writeFileSync("clicks.json", JSON.stringify(clicks, null, 2));
}

module.exports = { saveUser, saveClick };
