const app = require('express')();
const express = require('express');
const server = require('http').Server(app);
const io = require('socket.io')(server);

const WIDTH = 750;
const HEIGHT = 750;
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
    dx = Math.cos(ang) * vel;
    dy = Math.sin(ang) * vel;
}

function updateEnemies(enemyList) {
    for(var enemy in enemyList) {

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
    updateEnemies(enemyList);
    //generate enemies if there are less than 10
    while(enemyCount < 10) {
        enemyCount++;
        enemyList.push(new Enemy('test'));
    }
    packet.enemyList = enemyList;

    io.emit('state', packet);
}, 1000/30);