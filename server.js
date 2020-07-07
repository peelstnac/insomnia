'use strict';
//networking
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
//uuid
const { v4: uuidv4 } = require('uuid');
//game constants
const WIDTH = 1280;
const HEIGHT = 720;
const PI = Math.PI;
//game levels
const LEVELS = require('./level.js');

(() => {
    //handle day and night cycle
    var time = 1; //day 1, night 0
    setInterval(() => {
        time = ~time&1;
    }, 15000);
    //handle player respawns
    function playerRespawn(player) {
        //15 second respawn wait
        player.respawn();
        setTimeout(() => {
            playerList[player.id] = player;
            aliveCount++;
        }, 5000);
    }
    //begin game
    function startGame() {

    }
    function endGame() {
        
    }
    //number of players alive
    var aliveCount = 0;

    var enemyCount = 0;
    var enemyList = [];

    class Enemy {
        constructor(name, enemyStrengthIndex) {
            this.name = name;
            this.enemyStrengthIndex = enemyStrengthIndex;
            //this.hp = 19 + this.enemyStrengthIndex;
            this.hp = 20;
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
        kills = 0;
        deaths = 0;
        ammo = 300;
        weapon = 0; //type of weapon equipped
        canTakeDamage = false; //default false

        updatePosition() {
            this.x += this.dx;
            this.y += this.dy;
        }

        respawn() {
            this.hp = 150;
            this.ammo = 300;
            this.x = Math.floor(Math.random() * WIDTH);
            this.y = Math.floor(Math.random() * HEIGHT);
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
        aliveCount++;

        socket.on('disconnect', () => {
            console.log('player disconnect.');
            delete socketList[id];
            delete playerList[id];
        });

        socket.on('cursorMove', (data) => {
            if(!(id in playerList)) return;
            //calculate angle of cursor relative to player position
            var ang = Math.atan2(data.y - playerList[id].y, data.x - playerList[id].x);
            playerList[id].ang = ang;
        });

        socket.on('keyPress', (data) => {
            var keyArray = data.keyArray;
            if(!(id in playerList)) return;
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
                    var proj = new Projectile(playerList[id].x, playerList[id].y, 45, playerList[id].ang, 6, 15, id, 5);
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
                        playerList[projectileList[proj].parent].ammo += playerList[player].ammo;
                    }
                }
            }
            for(var enemy in enemyList) {
                var ex = enemyList[enemy].x;
                var ey = enemyList[enemy].y;
                if(Math.abs(bx - ex) < 25+projectileList[proj].dim/2 && Math.abs(by - ey) < 25+projectileList[proj].dim/2) {
                    enemyList[enemy].hp -= projectileList[proj].dmg;
                    if(enemyList[enemy].hp <= 0) {
                        //give killer 30 ammo
                        playerList[projectileList[proj].parent].ammo += 15;
                    }
                }
            }
        }
        //check if player is alive
        /*
        for(var player in playerList) {
            if(playerList[player].hp <= 0) {
                playerList[player] = new Player(player, playerList[player].name);
            }
        }
        */
        for(let id in playerList) {
            if(playerList[id].hp <= 0) {
                playerRespawn(playerList[id]);
                delete playerList[id];
                aliveCount--;
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

        var cEnemyList = [];
        
        for(var enemy in enemyList) {
            cEnemyList.push({
                x: enemyList[enemy].x,
                y: enemyList[enemy].y,
                dx: enemyList[enemy].dx,
                dy: enemyList[enemy].dy
            });
        }

        var cStatList = [];
        for(let player in playerList) {
            cStatList.push({
                hp: playerList[player].hp,
                ammo: playerList[player].ammo,
                weapon: playerList[player].weapon,
                kills: playerList[player].kills,
                deaths: playerList[player].deaths
            });
        }

        packet.cEnemyList = cEnemyList;
        packet.cProjectileList = cProjectileList;
        packet.cStatList = cStatList;
        
        io.emit('state', packet);
        cProjectileList = []; //clear the client list to reduce load 
    }, 1000/15);
})();