const app = require('express')();
const express = require('express');
const server = require('http').Server(app);
const io = require('socket.io')(server);

const WIDTH = 1280;
const HEIGHT = 720;
const PI = 3.141582;

var enemyCount = 0;
var enemyList = [];

class Enemy {
    constructor(name) {
        this.name = name;
    }
    x = 750/2;
    y = 750/2;
    vel = Math.floor(Math.random() * 10) + 10;
    ang = Math.random() * PI;
    dx = Math.cos(this.ang) * this.vel;
    dy = Math.sin(this.ang) * this.vel;
    dim = 50;

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

    io.emit('state', packet);
}, 1000/30);