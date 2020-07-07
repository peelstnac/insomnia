'use strict';

var c = document.getElementById('ctx');
var ctx = c.getContext('2d');
const socket = io();
const WIDTH = 1280;
const HEIGHT = 720;

var cEnemyList = [];
var cProjectileList = [];
var cPlayerList = [];
var cStatList = [];
var projectiles = [];

var id;
socket.on('id', data => {
  id = data.id;
});

// handle cursor
var mx = 0;
var my = 0;
// handle keys
var keyArray = [0, 0, 0, 0, 0]; // w, a, s, d, space
socket.on('controllablePositions', data => {
  cPlayerList = data.cPlayerList;
});
socket.on('state', data => {
  // console.log(data)
  // parse data
  cEnemyList = data.cEnemyList;
  cStatList = data.cStatList;
  /*
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = 'red'
    for(var enemy in enemyList) {
        ctx.fillText('enemy', enemyList[enemy].x-25, enemyList[enemy].y-30)
        ctx.fillRect(enemyList[enemy].x-25, enemyList[enemy].y-25, 50, 50)
        //console.log(enemy.x)
    }
    */
  // parse data
  /*
    ctx.fillStyle = 'green'
    for(var player in playerList) {
        ctx.fillRect(playerList[player].x-16, playerList[player].y-16, 32, 32)
    }
    */
  // parse data

  /*
    var projectileList = data.projectileList
    //console.log(projectileList)
    for(var proj in projectileList) {
        ctx.fillRect(projectileList[proj].x - projectileList[proj].dim/2, 
        projectileList[proj].y - projectileList[proj].dim/2, projectileList[proj].dim, projectileList[proj].dim)
    }
    */

  cProjectileList = data.cProjectileList;

  // display ammo
/*
  $('#ammo').empty()
  $('#ammo').append(playerList[id].ammo)
  */
});
// handle mouse
c.addEventListener('mousemove', event => {
  var rect = c.getBoundingClientRect();
  mx = event.clientX - rect.left;
  my = event.clientY - rect.top;
});
// handle keys
document.onkeydown = event => {
  if (event.keyCode === 87) {
    keyArray[0] = 1;
  }
  if (event.keyCode === 65) {
    keyArray[1] = 1;
  }
  if (event.keyCode === 83) {
    keyArray[2] = 1;
  }
  if (event.keyCode === 68) {
    keyArray[3] = 1;
  }
  if (event.keyCode === 32) {
    keyArray[4] = 1;
  }
};
document.onkeyup = event => {
  if (event.keyCode === 87) {
    keyArray[0] = 0;
  }
  if (event.keyCode === 65) {
    keyArray[1] = 0;
  }
  if (event.keyCode === 83) {
    keyArray[2] = 0;
  }
  if (event.keyCode === 68) {
    keyArray[3] = 0;
  }
  if (event.keyCode === 32) {
    keyArray[4] = 0;
  }
};
// interpolate data
setInterval(() => {
  // send key data
  var packet = {};
  packet.keyArray = keyArray;
  // TODO: merge the two emits to improve efficiency
  socket.emit('keyPress', packet);
  // send mouse data
  packet = {
    x: mx,
    y: my
  };
  socket.emit('cursorMove', packet);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  // handle enemies
  ctx.fillStyle = 'red';
  for (var enemy in cEnemyList) {
    // update position
    cEnemyList[enemy].x += cEnemyList[enemy].dx / 2;
    cEnemyList[enemy].y += cEnemyList[enemy].dy / 2;
    // draw
    ctx.fillText('enemy', cEnemyList[enemy].x - 25, cEnemyList[enemy].y - 30);
    ctx.fillRect(cEnemyList[enemy].x - 25, cEnemyList[enemy].y - 25, 50, 50);
  // console.log(enemy.x)
  }
  // handle players
  ctx.fillStyle = 'green';
  for (var player in cPlayerList) {
    // draw
    ctx.fillRect(
      cPlayerList[player].x - 16,
      cPlayerList[player].y - 16,
      32,
      32
    );
  }
  // handle projectiles
  ctx.fillStyle = 'blue';
  for (let proj in cProjectileList) {
    projectiles.push(cProjectileList[proj]);
  }
  cProjectileList = [];
  for (let proj = projectiles.length - 1; proj >= 0; proj--) {
    // update position
    if (projectiles[proj].timer <= 0) {
      projectiles.splice(proj, 1);
      continue;
    }
    projectiles[proj].x += projectiles[proj].dx / 2;
    projectiles[proj].y += projectiles[proj].dy / 2;
    projectiles[proj].timer -= 0.5;
    // draw
    ctx.fillRect(projectiles[proj].x - 3, projectiles[proj].y - 3, 6, 6);
  }
}, 1000 / 30); // 30 FPS simulated
