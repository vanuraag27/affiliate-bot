const axios = require("axios");

async function getTrendingProducts(category) {
  // Replace later with Amazon API
  const demoProducts = [
    {
      id: 101,
      name: "Samsung Galaxy M14",
      price: "₹12,999",
      image: "https://via.placeholder.com/300",
      link: "https://amzn.to/demo1",
      category: "mobiles"
    },
    {
      id: 102,
      name: "Noise Smartwatch",
      price: "₹1,499",
      image: "https://via.placeholder.com/300",
      link: "https://amzn.to/demo2",
      category: "electronics"
    }
  ];

  return demoProducts.filter(p => p.category === category);
}

module.exports = { getTrendingProducts };
