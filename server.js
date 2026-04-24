require("dotenv").config();
const express = require("express");
const fs = require("fs");
const products = require("./products");

const app = express();

// Track Click
app.get("/track/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const product = products.find(p => p.id === id);

  if (!product) return res.send("Invalid product");

  // Save click
  let clicks = [];
  if (fs.existsSync("clicks.json")) {
    clicks = JSON.parse(fs.readFileSync("clicks.json"));
  }

  clicks.push({
    productId: id,
    time: new Date()
  });

  fs.writeFileSync("clicks.json", JSON.stringify(clicks, null, 2));

  // Redirect to affiliate link
  res.redirect(product.link);
});

app.listen(3000, () => console.log("Server running"));