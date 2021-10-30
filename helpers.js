const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, DocumentReference } = require('firebase-admin/firestore');
const serviceAccount = require('./snackpassproject-07e297e09fd2.json');

initializeApp({
 credential: cert(serviceAccount)
});

const db = getFirestore();
const HOUR_THREHOLD = 48; // in hours

class TrendingItem {
    constructor(name, numberPurchases, mostRecentBuy, trendingScore) {
        this.name = name;
        this.numberPurchases = numberPurchases;
        this.mostRecentBuy = mostRecentBuy;
        this.trendingScore = trendingScore;
    }
}

class Dish {
    constructor(name, price, quantity, picked, inventory) {
        this.name = name;
        this.price = price;
        this.quantity = quantity;
        this.picked = picked;
        this.inventory = inventory;
    }
}

class Restaurant {
    constructor(name, address, phone) {
        this.name = name;
        this.address = address;
        this.phone = phone;
    }
}

// Get restaurants 
async function getRestaurants() {
    const restArray = [];
    const restRef = db.collection("available_food");
    return new Promise((resolve, reject) => {
        restRef.get().then(data => {
            let counter = 0;
            data.forEach(rest => {
                restRef.doc(rest.id).collection("informationCollection").doc("information").get().then(info => {
                    restArray.push(new Restaurant(rest.id, info.data()["address"], info.data()["phone"]));
                    if (++counter == data.size) resolve(restArray);
                });
            });
        });
    });
}

// show all dishes from that restaurant
async function getAvailableFood(restaurant) {
    const dishesArray = [];
    const dishesRef = db.collection("available_food").doc(restaurant);
    return new Promise((resolve, reject) => {
        dishesRef.get().then(dishSnapshot => {
            const dishData = dishSnapshot.data();
            for (const dishName of Object.keys(dishData)) {
                if (dishData[dishName]["quantity"] > 0)
                    dishesArray.push(new Dish(dishName, dishData[dishName]["price"], 0, false, dishData[dishName]["inventory"]));
            }
            resolve(dishesArray);
        });
    });
};

// perform the order action where the quantity of the dish will decrease by 1 and removed if quantity is 0
async function order(restaurant, dishName, quantity) {
    const restRef = db.collection("available_food").doc(restaurant);
    return new Promise((resolve, reject) => {
        restRef.get().then(dishSnapshot => {
            let dish = dishSnapshot.data();
            const inventory = dishSnapshot.data()[dishName]["inventory"];
            if (inventory > 0) {
                // update with quantity - 1
                dish[dishName].inventory = dish[dishName].inventory - quantity;
                restRef.update(dish);
                
                // move to trending list
                moveToTrending(dishName);
                resolve(true);
            }
        });
    });
}

// move item to trending after it has been ordered
function moveToTrending(dishName) {
    // check if food exists in trending
    const trendingRef = db.collection("trending").doc(dishName);
    trendingRef.get().then(doc => {
        if (doc.exists) {
            trendingRef.update({
                "timestamps": FieldValue.arrayUnion(new Date().getTime() / 1000 | 0)
            })
        } else {
            trendingRef.set({
                "timestamps": [new Date().getTime()/1000 | 0]
            });
        }
    });
}


async function trending() {
    const trendingRef = db.collection("trending");
    return new Promise((resolve, reject) => {
        trendingRef.get().then(snapshot => {
            let trendingItems = []
            snapshot.forEach(trendingDishSnapshot => {
                const trendingDishData = trendingDishSnapshot.data();


                // cleanse trending items if their timestamp is greater than 48 hours ago
                let timestamps = trendingDishData["timestamps"];
                
                const filteredTimestamps = cleanse(trendingDishSnapshot.id, timestamps); // edits local array and edits array on firestore
                if (filteredTimestamps.length > 0) {
                    const [sortedTimestamps, trendingScore] = getTrendingScore(filteredTimestamps);
                    trendingItems.push(new TrendingItem(trendingDishSnapshot.id, sortedTimestamps.length, sortedTimestamps[0], trendingScore));
                }
            });

            resolve(trendingItems.sort((a, b) => b.trendingScore - a.trendingScore)); // return items with greatest trending score first
        });
    });
}

function cleanse(dishName, timestamps) {
    let thresholdTimeStamp = (new Date().getTime() / 1000 | 0) - (HOUR_THREHOLD * 60 * 60);
    const filteredTimestamps = timestamps.filter(t => t > thresholdTimeStamp);

    const dishRef = db.collection("trending").doc(dishName);
    dishRef.get().then(snapshot => {
        const timestampData = snapshot.data()["timestamps"];
        for (const timestamp of timestampData) {
            if (!filteredTimestamps.includes(timestamp)) {
                // remove from cloud
                dishRef.update({
                    "timestamps": FieldValue.arrayRemove(timestamp)
                });
            }
        }
    });
    return filteredTimestamps;
}

function getTrendingScore(timestamps) {
    timestamps.sort((a, b) => b - a); // descending order so the most recent is first

    /*
        Heuristic Calculation
        ---------------------
        4 items bought 14 to 16 hours ago
        2 items bought 1 to 2 hours ago

        Use a reference point in time - epoch
        Summation of (referenceTime - timeBought)
        So that 1 hour ago would be greater than 2 hours ago and 20 hours ago and so on... 
    */

    return [timestamps, timestamps.reduce((a, b) => a + b)];
}

module.exports = {
    getAvailableFood,
    getRestaurants,
    order,
    trending
};