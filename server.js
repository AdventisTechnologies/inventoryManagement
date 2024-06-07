var express = require('express');
var server = express();
const cors = require('cors');
const path = require('path');



var mongoose = require('mongoose');
var bodyParser=require("body-parser");

server.use(bodyParser.urlencoded({extended:true}));

server.use(bodyParser.json());
server.use(cors());




const inventoryRouter = require('./Route/buy');

server.use('/api', inventoryRouter); // Ensure correct path

const inventoryRouters = require('./Route/stockbuy');
server.use('', express.static(path.join(__dirname, 'my-angular-project')));

server.use('/api', inventoryRouters); // Ensure correct path


server.use('/api/getinventorybuy', inventoryRouters);
server.use('/api/getinventory', inventoryRouter);

server.use('/api', inventoryRouters);
server.use('/api', inventoryRouters);

const login = require('./Route/User');
server.use('/api/login',login);
const url = 'mongodb+srv://admin123:Adventis2024@inventory.aegicmv.mongodb.net/InventoryStock'
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("DB started............");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });


server.use(express.json());


server.listen(3000, function check(error) {
    if (error) {
        console.log("error")
    }
    else {
        console.log("started............")
    }
});


