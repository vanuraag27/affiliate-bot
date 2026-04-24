require("dotenv").config();
const express = require("express");
const { saveClick } = require("./db");

const app = express();

// DYNAMIC PRODUCT LINKS
const productLinks = {
  101: "https://amzn.to/demo1",
  102: "https://amzn.to/demo2"
};

app.get("/track/:id", (req, res) => {
  const id = req.params.id;

  saveClick({
    productId: id,
    time: new Date()
  });

  res.redirect(productLinks[id]);
});

app.listen(3000, () => console.log("Server running"));
