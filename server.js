const app = require('express')();
const express = require('express');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidv4 } = require('uuid');
const WIDTH = 1280;
const HEIGHT = 720;
const PI = 3.141582;

var enemyCount = 0;
var enemyList = [];

class Enemy {
    constructor(name) {
        this.name = name;
    }
    x = WIDTH/2;
    y = HEIGHT/2;
    vel = Math.floor(Math.random() * 5) + 10;
    ang = Math.random() * PI;
    dx = Math.cos(this.ang) * this.vel;
    dy = Math.sin(this.ang) * this.vel;
    dim = 50;
    hp = 30;

    updatePosition() {
        if(this.x <= this.dim/2 || this.x + this.dim/2 >= WIDTH) {
            this.dx = -this.dx;
        }
        if(this.y <= this.dim/2 || this.y + this.dim/2 >= HEIGHT) {
            this.dy = -this.dy;
        }
        this.x += this.dx;
        this.y += this.dy;
    }
}

var socketList = {};
var playerList = {};

class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
    x = Math.floor(Math.random() * WIDTH);
    y = Math.floor(Math.random() * HEIGHT);
    vel = 10;
    dx = 0;
    dy = 0;
    dim = 32;
    hp = 150;

    updatePosition() {
        if(this.x <= 0 || this.x + this.dim/2 >= WIDTH) {
            this.dx = -this.dx;
        }
        if(this.y <= 0 || this.y + this.dim/2 >= HEIGHT) {
            this.dy = -this.dy;
        }
        this.x += this.dx;
        this.y += this.dy;
    }
}

app.use(express.static(__dirname + '/public'));
server.listen(3000);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('player connect.');
    var id = uuidv4();
    socketList[id] = socket;
    playerList[id] = new Player(id, 'hope');

    socket.on('keyPress', (data) => {
        var keyArray = data.keyArray;
        if(keyArray[0]) {
            if(playerList[id].y >= 32/2) playerList[id].y -= playerList[id].vel / Math.sqrt(2);
        }
        if(keyArray[1]) {
            if(playerList[id].x >= 32/2) playerList[id].x -= playerList[id].vel / Math.sqrt(2);
        }
        if(keyArray[2]) {
            if(playerList[id].y <= HEIGHT - 32/2) playerList[id].y += playerList[id].vel / Math.sqrt(2);
        }
        if(keyArray[3]) {
            if(playerList[id].x <= WIDTH - 32/2) playerList[id].x += playerList[id].vel / Math.sqrt(2);
        }
    });

    socket.on('disconnect', () => {
        console.log('player disconnect.');
        delete socketList[id];
        delete playerList[id];
    });
});

setInterval(() => {
    var packet = {};
    //update enemy positions
    for(enemy in enemyList) {
        enemyList[enemy].updatePosition();
    }
    //generate enemies if there are less than 10
    while(enemyCount < 10) {
        enemyCount++;
        enemyList.push(new Enemy('test'));
    }
    packet.enemyList = enemyList;
    //add players to state
    packet.playerList = playerList;
    io.emit('state', packet);
}, 1000/30);