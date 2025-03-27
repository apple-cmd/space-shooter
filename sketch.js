// Game state and core variables
let player;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let stars = [];
let particles = [];
let level = 1;
let score = 0;
let health = 3;
let gameState = "start";
let lastShot = 0;
let shootInterval = 30;
let touchX = null;
let isPaused = false;
let highScore = parseInt(getCookie('highScore')) || 0;

// UI Elements
const icons = {
  info: { x: 30, y: 30, size: 30 },
  pause: { x: width - 30, y: 30, size: 30 },
  share: { x: width - 30, y: height - 30, size: 30 }
};

// Enemy configurations for different levels
const enemyTypes = {
  1: {
    sprite: 'basic',
    color: [255, 100, 100],
    size: 30,
    points: 10,
    speed: 1,
    canShoot: false,
    pattern: 'linear'
  },
  2: {
    sprite: 'scout',
    color: [100, 255, 100],
    size: 35,
    points: 20,
    speed: 1.5,
    canShoot: false,
    pattern: 'zigzag'
  },
  3: {
    sprite: 'bomber',
    color: [100, 100, 255],
    size: 40,
    points: 30,
    speed: 1.2,
    canShoot: true,
    pattern: 'swoop'
  }
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  createStarfield();
  setupIcons();
}

function createStarfield() {
  // Create multiple layers of stars for parallax effect
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 50; j++) {
      stars.push({
        x: random(width),
        y: random(height),
        size: random(1, 3),
        speed: map(i, 0, 2, 0.5, 2),
        brightness: map(i, 0, 2, 100, 255)
      });
    }
  }
}

function draw() {
  if (isPaused && gameState === "play") return;
  
  background(0);
  drawStarfield();

  switch(gameState) {
    case "start":
      showStartScreen();
      break;
    case "levelAnnounce":
      showLevelAnnouncement();
      break;
    case "play":
      playGame();
      break;
    case "over":
      showGameOver();
      break;
  }

  // Always draw UI elements
  drawUI();
  handleParticles();
}

// Touch handling with improved right-side movement
function touchStarted() {
  handleUITouches();
  
  if (gameState === "play" && !isPaused) {
    touchX = touches[0]?.x || mouseX;
  }
  return false;
}

function touchMoved() {
  if (gameState === "play" && !isPaused) {
    touchX = touches[0]?.x || mouseX;
  }
  return false;
}

function touchEnded() {
  touchX = null;
  return false;
}

// UI and Game State functions
function showLevelAnnouncement() {
  push();
  textAlign(CENTER, CENTER);
  textSize(48);
  fill(255);
  text(`Level ${level}`, width/2, height/2);
  
  // Show level characteristics
  textSize(24);
  let levelDesc = `Enemy Type: ${enemyTypes[Math.min(level, Object.keys(enemyTypes).length)].sprite}`;
  text(levelDesc, width/2, height/2 + 50);
  pop();
  
  if (frameCount % 180 === 0) {
    gameState = "play";
    spawnEnemies();
  }
}

function startNewLevel() {
  level++;
  enemies = [];
  enemyBullets = [];
  gameState = "levelAnnounce";
}

// Cookie handling
function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName.trim() === name) return cookieValue;
  }
  return null;
}

// Update the Player class
class Player {
  constructor() {
    this.x = width / 2;
    this.y = height - 60;
    this.speed = 8;
    this.size = 40;
    this.autoShootInterval = 20;
  }

  update() {
    // Desktop controls
    if (keyIsDown(LEFT_ARROW)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.x += this.speed;

    // Touch controls
    if (touchX !== null) {
      const dx = touchX - this.x;
      this.x += dx * 0.1;
    }

    // Keep in bounds
    this.x = constrain(this.x, 0, width - this.size);

    // Auto shooting
    if (frameCount % this.autoShootInterval === 0) {
      bullets.push(new Bullet(this.x + this.size/2, this.y));
    }
  }

  show() {
    // Draw player ship (more detailed than before)
    push();
    noStroke();
    fill(0, 255, 200);
    // Ship body
    triangle(
      this.x + this.size/2, this.y,
      this.x, this.y + this.size,
      this.x + this.size, this.y + this.size
    );
    // Cockpit
    fill(100, 200, 255);
    ellipse(this.x + this.size/2, this.y + this.size/2, this.size/3);
    pop();
  }
}

// Enemy classes and bullet system
class Enemy {
  constructor(x, y, type, level) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = level;
    this.size = enemyTypes[level].size;
    this.color = enemyTypes[level].color;
    this.pattern = enemyTypes[level].pattern;
    this.canShoot = enemyTypes[level].canShoot;
    this.speed = enemyTypes[level].speed;
    this.angle = 0;
    this.lastShot = 0;
  }

  update() {
    // Movement patterns
    switch (this.pattern) {
      case 'linear':
        this.y += this.speed;
        break;
      case 'zigzag':
        this.x += Math.sin(this.angle) * 2 * this.speed;
        this.y += this.speed;
        this.angle += 0.1;
        break;
      case 'swoop':
        this.x += Math.sin(this.angle) * 3 * this.speed;
        this.y += Math.cos(this.angle) * 2 * this.speed + this.speed;
        this.angle += 0.05;
        break;
    }

    // Shooting logic
    if (this.canShoot && frameCount - this.lastShot > 120) {
      enemyBullets.push(new EnemyBullet(this.x + this.size/2, this.y + this.size));
      this.lastShot = frameCount;
    }
  }

  show() {
    push();
    noStroke();
    
    // Enemy ship body
    fill(this.color[0], this.color[1], this.color[2]);
    beginShape();
    vertex(this.x + this.size/2, this.y);
    vertex(this.x, this.y + this.size);
    vertex(this.x + this.size, this.y + this.size);
    endShape(CLOSE);

    // Enemy face details
    fill(255);
    // Eyes
    ellipse(this.x + this.size/3, this.y + this.size/2, 8);
    ellipse(this.x + this.size*2/3, this.y + this.size/2, 8);
    // Angry eyebrows
    stroke(255);
    strokeWeight(2);
    line(this.x + this.size/4, this.y + this.size/3, 
         this.x + this.size/2, this.y + this.size/2);
    line(this.x + this.size*3/4, this.y + this.size/3, 
         this.x + this.size/2, this.y + this.size/2);
    pop();
  }

  offscreen() {
    return this.y > height + this.size;
  }

  hits(player) {
    return collideRectRect(
      this.x, this.y, this.size, this.size,
      player.x, player.y, player.size, player.size
    );
  }
}

class EnemyBullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 5;
    this.size = 8;
  }

  update() {
    this.y += this.speed;
  }

  show() {
    push();
    fill(255, 0, 0);
    noStroke();
    beginShape();
    vertex(this.x, this.y);
    vertex(this.x - this.size/2, this.y + this.size);
    vertex(this.x + this.size/2, this.y + this.size);
    endShape(CLOSE);
    pop();
  }

  hits(player) {
    return collideRectRect(
      this.x - this.size/2, this.y, this.size, this.size,
      player.x, player.y, player.size, player.size
    );
  }

  offscreen() {
    return this.y > height;
  }
}

// Particle system for improved explosions
class Particle {
  constructor(x, y, color) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 5));
    this.acc = createVector(0, 0.1);
    this.lifespan = 255;
    this.color = color || [255, 255, 255];
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 6;
  }

  show() {
    push();
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], this.lifespan);
    ellipse(this.pos.x, this.pos.y, 4);
    pop();
  }

  isDead() {
    return this.lifespan <= 0;
  }
}

// Modern starfield with parallax effect
class Star {
  constructor(layer) {
    this.x = random(width);
    this.y = random(height);
    this.size = map(layer, 1, 3, 1, 3);
    this.speed = map(layer, 1, 3, 1, 3);
    this.brightness = map(layer, 1, 3, 100, 255);
    this.layer = layer;
  }

  update() {
    this.y += this.speed;
    if (this.y > height) {
      this.y = 0;
      this.x = random(width);
    }
  }

  show() {
    push();
    noStroke();
    fill(255, this.brightness);
    ellipse(this.x, this.y, this.size);
    // Add glow effect for larger stars
    if (this.layer > 2) {
      drawingContext.shadowBlur = 5;
      drawingContext.shadowColor = color(255);
      ellipse(this.x, this.y, this.size);
      drawingContext.shadowBlur = 0;
    }
    pop();
  }
}

// UI Icons class
class Icon {
  constructor(x, y, size, type) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
    this.isHovered = false;
  }

  show() {
    push();
    noFill();
    stroke(255);
    strokeWeight(2);
    
    switch(this.type) {
      case 'info':
        circle(this.x, this.y, this.size);
        textSize(20);
        textAlign(CENTER, CENTER);
        text('i', this.x, this.y - 2);
        break;
      case 'pause':
        if (isPaused) {
          triangle(this.x - 5, this.y - 10, 
                  this.x - 5, this.y + 10, 
                  this.x + 10, this.y);
        } else {
          rect(this.x - 8, this.y - 10, 6, 20);
          rect(this.x + 2, this.y - 10, 6, 20);
        }
        break;
      case 'share':
        // Simple share icon
        circle(this.x, this.y - 5, 8);
        line(this.x, this.y - 1, this.x, this.y + 10);
        line(this.x - 8, this.y + 5, this.x + 8, this.y + 5);
        break;
    }
    pop();
  }

  isClicked(px, py) {
    return dist(px, py, this.x, this.y) < this.size/2;
  }
}

function handleEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].update();
    enemyBullets[i].show();
    
    if (enemyBullets[i].offscreen()) {
      enemyBullets.splice(i, 1);
      continue;
    }
    
    if (enemyBullets[i].hits(player)) {
      health--;
      spawnParticles(player.x + player.size/2, player.y + player.size/2, [255, 0, 0]);
      enemyBullets.splice(i, 1);
      if (health <= 0) {
        gameState = "over";
        if (score > highScore) {
          highScore = score;
          setCookie('highScore', highScore);
        }
      }
    }
  }
}

function spawnEnemies() {
  const currentLevel = Math.min(level, Object.keys(enemyTypes).length);
  const enemyCount = 5 + Math.floor(level * 1.5);
  
  for (let i = 0; i < enemyCount; i++) {
    enemies.push(new Enemy(
      random(width * 0.1, width * 0.9),
      random(-100, -20),
      enemyTypes[currentLevel],
      currentLevel
    ));
  }
}

function handleIcons() {
  // Update icon positions based on window size
  icons.info.x = 30;
  icons.info.y = height - 30;
  icons.pause.x = width - 30;
  icons.pause.y = 30;
  icons.share.x = width - 30;
  icons.share.y = height - 30;
  
  // Draw icons
  Object.values(icons).forEach(icon => icon.show());
}
