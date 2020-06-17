const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {});

app.use(express.static(__dirname + '/public'));
app.on('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
})
app.listen(3000);

class Player {
    constructor(x, y, vel, hp) {
        x = Math.floor(Math.random() * 500);
        y = Math.floor(Math.random() * 500);
        vel = 10;
        hp = 100;
    }
}

players = {};

io.on('connection', (socket) => {

});