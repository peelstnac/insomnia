class Level {
  constructor (
    level,
    time,
    enemyStrengthIndex,
    hasBoss = false,
    bossType = null,
    effects = []
  ) {
    this.level = level;
    this.time = time;
    this.enemyStrengthIndex = enemyStrengthIndex;
    this.enemyCount = hasBoss
      ? Math.floor(this.enemyStrengthIndex * 65 / 200)
      : Math.floor(this.enemyStrengthIndex * 65 / 100);
    this.enemyCount = this.enemyCount + 10;
    // this.enemyHp = 19 + this.enemyStrengthIndex;
    this.hasBoss = hasBoss;
    this.bossType = bossType;
    this.effects = effects;
  }
}

module.exports = Level;
