const express = require('express');
const helpers = require('./helpers.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Listening to port 3000");
});

app.get("/trending", (req, res) => {
    helpers.trending().then(data => {
        res.json(data);
    });
});

app.get("/order", (req, res) => {
    const restaurant = req.query.restaurant;
    const dish = req.query.dish;
    helpers.order(restaurant, dish).then(data => {
        res.json(data);
    })
});

app.get("/restaurants", (req, res) => {
    helpers.getRestaurants().then(data => {
        res.json(data);
    })
});

app.get("/availableFood", (req, res) => {
    const restaurant = req.query.restaurant;
    helpers.getAvailableFood(restaurant).then(data => {
        res.json(data);
    });
});