const axios = require("axios");
const cheerio = require("cheerio");

async function getAmazonDeals() {
  try {
    const url = "https://www.amazon.in/s?k=mobiles&sort=price-desc-rank";

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const $ = cheerio.load(data);
    let products = [];

    $(".s-result-item").each((i, el) => {
      const title = $(el).find("h2 span").text();
      const price = $(el).find(".a-price-whole").first().text();
      const image = $(el).find("img").attr("src");
      const link = "https://www.amazon.in" + $(el).find("a").attr("href");

      if (title && price && image && link) {
        products.push({
          id: i + 1,
          name: title,
          price: "₹" + price,
          image,
          link
        });
      }
    });

    return products.slice(0, 5); // limit results

  } catch (error) {
    console.error("Amazon fetch error:", error);
    return [];
  }
}

module.exports = { getAmazonDeals };
