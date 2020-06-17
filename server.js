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
    vel = 20;
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

const ammo_cost = [1];

class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
    x = Math.floor(Math.random() * WIDTH);
    y = Math.floor(Math.random() * HEIGHT);
    vel = 15;
    ang = 0;
    dx = 0;
    dy = 0;
    dim = 32;
    hp = 150;
    ammo = [100];
    weapon = 0;

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

class Projectile {
    constructor(x, y, vel, ang, dim, timer, parent, dmg) {
        this.x = x;
        this.y = y;
        this.vel = vel;
        this.ang = ang;
        this.dim = dim;
        this.timer = timer;
        this.parent = parent;
        this.dmg = dmg;
        this.dx = Math.cos(this.ang) * this.vel;
        this.dy = Math.sin(this.ang) * this.vel;
    }

    updatePosition() {
        this.timer--;
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

var projectileList = [];

app.use(express.static(__dirname + '/public'));
server.listen(process.env.PORT || 3000);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    console.log('player connect.');
    var id = uuidv4();
    socket.emit('id', {
        id: id
    });
    socketList[id] = socket;
    playerList[id] = new Player(id, 'hope');

    socket.on('disconnect', () => {
        console.log('player disconnect.');
        delete socketList[id];
        delete playerList[id];
    });

    socket.on('cursorMove', (data) => {
        var ang = Math.atan2(data.y - playerList[id].y, data.x - playerList[id].x);
        playerList[id].ang = ang;
    });

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
        if(keyArray[4]) {
            if(playerList[id].ammo >= ammo_cost[playerList[id].weapon]) {
                var proj = new Projectile(playerList[id].x, playerList[id].y, 30, playerList[id].ang, 6, 15, id, 10);
                projectileList.push(proj);
                playerList[id].ammo[playerList[id].weapon] -= ammo_cost[playerList[id].weapon];
            }
        }
    });
});

setInterval(() => {
    //collision damage detection
    for(var enemy in enemyList) {
        for(var player in playerList) {
            var ex = enemyList[enemy].x;
            var ey = enemyList[enemy].y;
            var px = playerList[player].x;
            var py = playerList[player].y;
            if(Math.abs(ex - px) < 41 && Math.abs(ey - py) < 41) {
                var temp = playerList[player].hp;
                playerList[player].hp -= enemyList[enemy].hp;
                enemyList[enemy].hp -= temp;
            }
        }
    }
    for(var proj in projectileList) {
        var bx = projectileList[proj].x;
        var by = projectileList[proj].y;
        for(var player in playerList) {
            if(player == projectileList[proj].parent) continue;
            var px = playerList[player].x;
            var py = playerList[player].y;
            if(Math.abs(bx - px) < 16+projectileList[proj].dim/2 && Math.abs(by - py) < 16+projectileList[proj].dim/2) {
                playerList[player].hp -= projectileList[proj].dmg;
                projectileList[proj].timer = 0;
                if(playerList[player].hp <= 0) {
                    //transfer ammo to killer
                    playerList[projectileList[proj].parent].ammo[0] += playerList[player].ammo[0];
                }
            }
        }
        for(var enemy in enemyList) {
            var ex = enemyList[enemy].x;
            var ey = enemyList[enemy].y;
            if(Math.abs(bx - ex) < 25+projectileList[proj].dim/2 && Math.abs(ey - py) < 25+projectileList[proj].dim/2) {
                enemyList[enemy].hp -= projectileList[proj].dmg;
                projectileList[proj].timer = 0;
                if(enemyList[enemy].hp <= 0) {
                    //give killer 30 ammo
                    playerList[projectileList[proj].parent].ammo[0] += 15;
                }
            }
        }
    }
    //check if player is alive
    for(var player in playerList) {
        if(playerList[player].hp <= 0) {
            playerList[player] = new Player(player, playerList[player].name);
        }
    }
    //check if enemy is alive
    for(var enemy in enemyList) {
        if(enemyList[enemy].hp <= 0) {
            enemyList[enemy] = new Enemy('enemy');
        }
    }
    //check if projectile is alive
    for(var i = projectileList.length-1; i >= 0; i--) {
        if(projectileList[i].timer <= 0) {
            projectileList.splice(i, 1); //if not, remove
        }
    }

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
    //update projectile positions
    for(proj in projectileList) {
        projectileList[proj].updatePosition();
    }
    //packet.enemyList = enemyList;
    //add players to state
    packet.playerList = playerList;
    //add projectiles to state
    //packet.projectileList = projectileList;
    io.emit('state', packet);
}, 1000/15);