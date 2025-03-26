let player;
let bullets = [];
let aliens = [];
let stars = [];
let asteroids = [];
let particles = [];
let level = 1;
let score = 0;
let health = 3;
let gameState = "start";
let alienSpeed = 1;
let asteroidSpeed = 2;
let lastShot = 0;
let shootInterval = 10; // Frames between shots
let tilt = 0; // Stores the accelerometer tilt value

const alienTypes = [
  { color: [255, 0, 0], size: 20, points: 10, move: "straight" },
  { color: [0, 255, 0], size: 25, points: 20, move: "zigzag" },
  { color: [0, 0, 255], size: 30, points: 30, move: "straight" }
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1); // Retro pixelated look
  createStarfield();

  // Request permission for motion/orientation on iOS
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      })
      .catch(console.error);
  } else {
    // Non-iOS devices (e.g., Android) don’t need permission
    window.addEventListener('deviceorientation', handleOrientation);
  }
}

function draw() {
  background(0);
  drawStars();

  if (gameState === "start") {
    showStartScreen();
  } else if (gameState === "instructions") {
    showInstructions();
  } else if (gameState === "play") {
    playGame();
  } else if (gameState === "over") {
    showGameOver();
  }

  handleParticles();
}

function touchStarted() {
  if (gameState === "play") {
    // Shoot on tap
    if (frameCount - lastShot > shootInterval) {
      bullets.push(new Bullet(player.x + 10, player.y));
      lastShot = frameCount;
    }
  } else if (gameState === "start" || gameState === "over") {
    // Start or restart on tap
    startGame();
  }
  return false; // Prevent default behavior
}

function keyPressed() {
  if (keyCode === ENTER && (gameState === "start" || gameState === "over")) {
    startGame();
  }
  if (key === " " && gameState === "play") {
    if (frameCount - lastShot > shootInterval) {
      bullets.push(new Bullet(player.x + 10, player.y));
      lastShot = frameCount;
    }
  }
}

// Handle device tilt
function handleOrientation(event) {
  tilt = event.gamma; // Left-right tilt (-90 to 90 degrees)
}

// --- Game State Functions ---
function startGame() {
  player = new Player();
  bullets = [];
  aliens = [];
  asteroids = [];
  particles = [];
  level = 1;
  score = 0;
  health = 3;
  alienSpeed = 1;
  asteroidSpeed = 2;
  spawnAliens(level);
  gameState = "play";
}

function playGame() {
  player.update();
  player.show();
  handleBullets();
  handleAliens();
  handleAsteroids();
  checkLevelCompletion();
  displayUI();
}

function showStartScreen() {
  fill(255);
  textAlign(CENTER);
  textSize(32);
  text("Space Shooter", width / 2, height / 2 - 50);
  textSize(16);
  text("Tap to Start", width / 2, height / 2 + 20);
  text("Tap for Info", width / 2, height / 2 + 50);
  
  // Check touches for info
  for (let touch of touches) {
    if (touch.y > height / 2 + 30 && touch.y < height / 2 + 70) {
      gameState = "instructions";
    }
  }
}

function showInstructions() {
  fill(255);
  textAlign(CENTER);
  textSize(24);
  text("Instructions", width / 2, height / 2 - 100);
  textSize(16);
  text("Tilt phone left to move left", width / 2, height / 2 - 50);
  text("Tilt phone right to move right", width / 2, height / 2 - 20);
  text("Tap anywhere to shoot", width / 2, height / 2 + 10);
  text("Avoid aliens and asteroids", width / 2, height / 2 + 40);
  text("Tap to go back", width / 2, height / 2 + 100);
  
  // Check touches to go back
  for (let touch of touches) {
    if (touch.y > height / 2 + 80 && touch.y < height / 2 + 120) {
      gameState = "start";
    }
  }
}

function showGameOver() {
  fill(255, 0, 0);
  textAlign(CENTER);
  textSize(32);
  text("GAME OVER", width / 2, height / 2 - 50);
  fill(255);
  textSize(16);
  text(`Score: ${score}`, width / 2, height / 2 - 20);
  text("Tap to Restart", width / 2, height / 2 + 20);
  text("Tap to Share", width / 2, height / 2 + 50);
  
  // Check touches for share
  for (let touch of touches) {
    if (touch.y > height / 2 + 30 && touch.y < height / 2 + 70) {
      shareScore();
    }
  }
}

function shareScore() {
  if (navigator.share) {
    navigator.share({
      title: 'Space Shooter',
      text: `I scored ${score} points in Space Shooter! Can you beat me?`,
      url: window.location.href
    });
  } else {
    alert(`My score: ${score}`);
  }
}

// --- Starfield ---
function createStarfield() {
  for (let i = 0; i < 150; i++) {
    stars.push(new Star(random(width), random(height), random(1, 3)));
  }
}

function drawStars() {
  for (let star of stars) {
    star.update();
    star.show();
  }
}

// --- Spawning & Handling ---
function spawnAliens(level) {
  let alienCount = 5 + level * 3;
  for (let i = 0; i < alienCount; i++) {
    let type = Math.floor(random(Math.min(level, alienTypes.length)));
    let alienData = alienTypes[type];
    aliens.push(new Alien(random(width), random(-100, 0), alienData));
  }
}

function handleBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].show();
    if (bullets[i].offscreen()) {
      bullets.splice(i, 1);
      continue;
    }
    for (let j = aliens.length - 1; j >= 0; j--) {
      if (bullets[i] && bullets[i].hits(aliens[j])) {
        spawnParticles(aliens[j].x + aliens[j].size / 2, aliens[j].y + aliens[j].size / 2);
        score += aliens[j].points;
        aliens.splice(j, 1);
        bullets.splice(i, 1);
        break;
      }
    }
    for (let j = asteroids.length - 1; j >= 0; j--) {
      if (bullets[i] && bullets[i].hitsAsteroid(asteroids[j])) {
        spawnParticles(asteroids[j].x, asteroids[j].y);
        score += 5;
        asteroids.splice(j, 1);
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

function handleAliens() {
  for (let i = aliens.length - 1; i >= 0; i--) {
    aliens[i].update();
    aliens[i].show();
    if (aliens[i].offscreen() || aliens[i].hits(player)) {
      health--;
      aliens.splice(i, 1);
      if (health <= 0) {
        gameState = "over";
      }
    }
  }
}

function handleAsteroids() {
  if (frameCount % 90 === 0) {
    asteroids.push(new Asteroid(random(width), -20));
  }
  for (let i = asteroids.length - 1; i >= 0; i--) {
    asteroids[i].update();
    asteroids[i].show();
    if (asteroids[i].hits(player)) {
      health--;
      asteroids.splice(i, 1);
      if (health <= 0) {
        gameState = "over";
      }
    }
    if (asteroids[i].offscreen()) {
      asteroids.splice(i, 1);
    }
  }
}

function checkLevelCompletion() {
  if (aliens.length === 0) {
    level++;
    spawnAliens(level);
    alienSpeed += 0.5;
    asteroidSpeed += 0.5;
  }
}

function displayUI() {
  fill(255);
  textSize(16);
  textAlign(LEFT);
  text(`Score: ${score}`, 10, 20);
  text(`Level: ${level}`, 10, 40);
  text(`Health: ${health}`, 10, 60);
}

// --- Particle Effects ---
function spawnParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push(new Particle(x, y));
  }
}

function handleParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].lifespan <= 0) {
      particles.splice(i, 1);
    }
  }
}

// --- Classes ---
class Player {
  constructor() {
    this.x = width / 2;
    this.y = height - 40;
    this.speed = 6;
  }

  update() {
    // Use accelerometer tilt for movement
    this.x += tilt * 0.2; // Scale tilt for smooth control
    // Add keyboard controls for desktop
    if (keyIsDown(LEFT_ARROW)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.x += this.speed;
    // Keep player within bounds
    if (this.x < 0) this.x = 0;
    if (this.x > width - 20) this.x = width - 20;
  }

  show() {
    fill(0, 255, 0);
    noStroke();
    rect(this.x, this.y, 20, 10); // Base
    rect(this.x + 5, this.y - 10, 10, 10); // Cockpit
    fill(255, 150, 0);
    rect(this.x + 8, this.y + 10, 4, 4); // Thruster
  }
}

class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = -10;
  }

  update() {
    this.y += this.speed;
  }

  show() {
    fill(255, 255, 0);
    rect(this.x, this.y, 4, 8);
  }

  offscreen() {
    return this.y < 0;
  }

  hits(alien) {
    return (
      this.x > alien.x &&
      this.x < alien.x + alien.size &&
      this.y > alien.y &&
      this.y < alien.y + alien.size
    );
  }

  hitsAsteroid(asteroid) {
    let d = dist(this.x, this.y, asteroid.x, asteroid.y);
    return d < asteroid.size / 2;
  }
}

class Alien {
  constructor(x, y, data) {
    this.x = x;
    this.y = y;
    this.size = data.size;
    this.color = data.color;
    this.points = data.points;
    this.moveType = data.move;
    this.angle = 0;
  }

  update() {
    if (this.moveType === "zigzag") {
      this.x += Math.sin(this.angle) * 2;
      this.angle += 0.1;
    }
    this.y += alienSpeed;
  }

  show() {
    fill(this.color);
    noStroke();
    rect(this.x, this.y, this.size, this.size);
  }

  offscreen() {
    return this.y > height;
  }

  hits(player) {
    return (
      player.x < this.x + this.size &&
      player.x + 20 > this.x &&
      player.y < this.y + this.size &&
      player.y + 20 > this.y
    );
  }
}

class Star {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
  }

  update() {
    this.y += this.speed;
    if (this.y > height) {
      this.y = 0;
      this.x = random(width);
    }
  }

  show() {
    fill(255);
    noStroke();
    rect(this.x, this.y, 2, 2);
  }
}

class Asteroid {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(15, 35);
    this.xSpeed = random(-1, 1);
  }

  update() {
    this.y += asteroidSpeed;
    this.x += this.xSpeed;
  }

  show() {
    fill(150);
    noStroke();
    ellipse(this.x, this.y, this.size);
  }

  hits(player) {
    let d = dist(this.x, this.y, player.x + 10, player.y);
    return d < this.size / 2 + 10;
  }

  offscreen() {
    return this.y > height;
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.xSpeed = random(-2, 2);
    this.ySpeed = random(-2, 2);
    this.lifespan = 255;
  }

  update() {
    this.x += this.xSpeed;
    this.y += this.ySpeed;
    this.lifespan -= 10;
  }

  show() {
    fill(255, this.lifespan);
    noStroke();
    rect(this.x, this.y, 3, 3);
  }
}