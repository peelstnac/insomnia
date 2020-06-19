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
    //enemies spawn in the middle of map
    x = WIDTH/2;
    y = HEIGHT/2;
    vel = 15;
    //random trajectory
    ang = Math.random() * PI * 2;
    dx = Math.cos(this.ang) * this.vel;
    dy = Math.sin(this.ang) * this.vel;
    //fixed size for now
    dim = 50;
    hp = 2;

    updatePosition() {
        //collision detection
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

//list of clients
var playerList = {};

//ammo cost of different weapons
const ammo_cost = [1];

class Player {
    //each player has unique ID
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
    //random spawn point
    x = Math.floor(Math.random() * WIDTH);
    y = Math.floor(Math.random() * HEIGHT);
    vel = 15;
    ang = 0; //mouse angle
    dx = 0;
    dy = 0;
    dim = 32;
    hp = 150;
    ammo = 300;
    weapon = 0; //type of weapon equipped

    updatePosition() {
        //collision detection
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
        /*
        if(this.x <= 0 || this.x + this.dim/2 >= WIDTH) {
            this.dx = -this.dx;
        }
        if(this.y <= 0 || this.y + this.dim/2 >= HEIGHT) {
            this.dy = -this.dy;
        }
        */
        this.x += this.dx;
        this.y += this.dy;
    }
}

var projectileList = [];
var cProjectileList = []; //lightweight client version

app.use(express.static(__dirname + '/public'));
server.listen(process.env.PORT || 3000);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

//list of sockets to send player specific information
var socketList = {};

io.on('connection', (socket) => {
    console.log('player connect.');
    var id = uuidv4(); //create unique ID for player
    socketList[id] = socket;
    playerList[id] = new Player(id, 'hope');

    socket.on('disconnect', () => {
        console.log('player disconnect.');
        delete socketList[id];
        delete playerList[id];
    });

    socket.on('cursorMove', (data) => {
        //calculate angle of cursor relative to player position
        var ang = Math.atan2(data.y - playerList[id].y, data.x - playerList[id].x);
        playerList[id].ang = ang;
    });

    socket.on('keyPress', (data) => {
        var keyArray = data.keyArray;
        playerList[id].dx = 0;
        playerList[id].dy = 0;
        if(keyArray[0]) {
            if(playerList[id].y >= 32/2) playerList[id].dy = -playerList[id].vel / Math.sqrt(2);
        }
        if(keyArray[1]) {
            if(playerList[id].x >= 32/2) playerList[id].dx = -playerList[id].vel / Math.sqrt(2);
        }
        if(keyArray[2]) {
            if(playerList[id].y <= HEIGHT - 32/2) playerList[id].dy = playerList[id].vel / Math.sqrt(2);
        }
        if(keyArray[3]) {
            if(playerList[id].x <= WIDTH - 32/2) playerList[id].dx = playerList[id].vel / Math.sqrt(2);
        }
        //shoot key
        if(keyArray[4]) {
            if(playerList[id].ammo >= ammo_cost[playerList[id].weapon]) {
                var proj = new Projectile(playerList[id].x, playerList[id].y, 30, playerList[id].ang, 6, 50, id, 10);
                //trying to reduce socket load
                projectileList.push(proj);
                //less information for client
                cProjectileList.push({
                    x: proj.x,
                    y: proj.y,
                    dx: proj.dx,
                    dy: proj.dy,
                    timer: proj.timer
                });
                //decrement ammo by ammo cost of weapon
                playerList[id].ammo -= ammo_cost[playerList[id].weapon];
            }
        }
    });
});

//controllable positions are updated at 30 FPS
setInterval(() => {
    var cPlayerList = []; //client version
    for(var player in playerList) {
        playerList[player].updatePosition(); 
        cPlayerList.push({
            x: playerList[player].x,
            y: playerList[player].y
        });
    }
    var packet = {
        cPlayerList: cPlayerList
    };
    io.emit('controllablePositions', packet);
}, 1000/30);

//everything else is updated at 15 FPS and interpolated to 30 FPS on client
setInterval(() => {
    //collision damage detection
    for(var enemy in enemyList) {
        for(var player in playerList) {
            var ex = enemyList[enemy].x;
            var ey = enemyList[enemy].y;
            var px = playerList[player].x;
            var py = playerList[player].y;

            if(Math.abs(ex - px) < 41 && Math.abs(ey - py) < 41) {
                playerList[player].hp -= enemyList[enemy].hp;
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
                if(playerList[player].hp <= 0) {
                    //transfer ammo to killer
                    playerList[projectileList[proj].parent].ammo[0] += playerList[player].ammo[0];
                }
            }
        }
        for(var enemy in enemyList) {
            var ex = enemyList[enemy].x;
            var ey = enemyList[enemy].y;
            if(Math.abs(bx - ex) < 25+projectileList[proj].dim/2 && Math.abs(by - ey) < 25+projectileList[proj].dim/2) {
                enemyList[enemy].hp -= projectileList[proj].dmg;
                console.log("HIT");
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
    while(enemyCount < 1) {
        enemyCount++;
        enemyList.push(new Enemy('test'));
    }
    //update projectile positions
    for(proj in projectileList) {
        projectileList[proj].updatePosition();
    }

    var cEnemyList = [];
    
    for(var enemy in enemyList) {
        cEnemyList.push({
            x: enemyList[enemy].x,
            y: enemyList[enemy].y,
            dx: enemyList[enemy].dx,
            dy: enemyList[enemy].dy
        });
    }

    packet.cEnemyList = cEnemyList;
    packet.cProjectileList = cProjectileList;
    io.emit('state', packet);
    cProjectileList = []; //clear the client list to reduce load 
}, 1000/15);