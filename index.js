const express = require('express');
const helpers = require('./helpers.js');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Listening to port 3000");
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));  // allows any type of value in body (we pass in an array of objects)

app.get("/trending", (req, res) => {
    helpers.trending().then(data => {
        res.json(data);
    });
});

app.post("/order", (req, res) => {
    const restName = req.body.restName;
    const dishes = req.body.dishes;
    helpers.order(restName, dishes).then(data => {
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