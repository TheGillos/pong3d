import * as THREE from 'three';

const splash = document.getElementById('splash');
const gameUI = document.getElementById('gameUI');
const playLandscapeBtn = document.getElementById('playLandscape');
const playPortraitBtn = document.getElementById('playPortrait');
const touchControls = document.getElementById('touchControls');
const controlHint = document.getElementById('controlHint');
const hud = document.getElementById('hud');
const leftScoreEl = document.getElementById('leftScore');
const rightScoreEl = document.getElementById('rightScore');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060d);

const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const ambient = new THREE.AmbientLight(0x8ea4ff, 0.18);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 0.85);
directional.position.set(6, 12, 5);
directional.castShadow = true;
directional.shadow.mapSize.set(1024, 1024);
directional.shadow.camera.near = 1;
directional.shadow.camera.far = 35;
directional.shadow.camera.left = -10;
directional.shadow.camera.right = 10;
directional.shadow.camera.top = 8;
directional.shadow.camera.bottom = -8;
scene.add(directional);

let tableWidth = 12;
let tableDepth = 7;

const tableMaterial = new THREE.MeshPhongMaterial({
  color: 0x16335a,
  specular: 0x2f4f75,
  shininess: 45
});
const centerLineMaterial = new THREE.MeshPhongMaterial({
  color: 0x8fbaff,
  emissive: 0x07132b,
  specular: 0x9cc8ff,
  shininess: 120
});

const table = new THREE.Mesh(new THREE.BoxGeometry(tableWidth, 0.6, tableDepth), tableMaterial);
table.position.y = -0.6;
table.receiveShadow = true;
scene.add(table);

const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, tableDepth), centerLineMaterial);
centerLine.position.y = 0.01;
centerLine.receiveShadow = true;
scene.add(centerLine);

const paddleGeometry = new THREE.BoxGeometry(0.4, 0.8, 1.8);
const paddleMaterial = new THREE.MeshPhongMaterial({
  color: 0xeaf2ff,
  specular: 0xffffff,
  shininess: 180
});

const leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
leftPaddle.castShadow = true;
leftPaddle.receiveShadow = true;
scene.add(leftPaddle);

const rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
rightPaddle.castShadow = true;
rightPaddle.receiveShadow = true;
scene.add(rightPaddle);

const ballRadius = 0.27;
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(ballRadius, 20, 20),
  new THREE.MeshPhongMaterial({
    color: 0xffdd84,
    emissive: 0x2c1f07,
    specular: 0xffffff,
    shininess: 220
  })
);
ball.castShadow = true;
scene.add(ball);

const ballLight = new THREE.PointLight(0xffd37a, 1.2, 5.5, 2);
ballLight.castShadow = true;
ballLight.shadow.mapSize.set(512, 512);
ballLight.shadow.bias = -0.0008;
ball.add(ballLight);

const keyState = {};
window.addEventListener('keydown', (event) => {
  keyState[event.code] = true;
});
window.addEventListener('keyup', (event) => {
  keyState[event.code] = false;
});

const paddleSpeed = 8;
const ballBaseSpeed = 6;
const maxBounceAngle = Math.PI / 3;
let arenaLimit = tableDepth / 2 - 0.7;
let ballVelocity = new THREE.Vector3();
let leftScore = 0;
let rightScore = 0;
let gameMode = null;
let running = false;

function setScores() {
  const leftText = String(leftScore).padStart(2, '0');
  const rightText = String(rightScore).padStart(2, '0');
  leftScoreEl.textContent = leftText;
  rightScoreEl.textContent = rightText;
}

function setViewportForMode() {
  if (!gameMode) return;
  const targetAspect = gameMode === 'portrait' ? 9 / 16 : 16 / 9;
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width / height > targetAspect) {
    width = Math.floor(height * targetAspect);
  } else {
    height = Math.floor(width / targetAspect);
  }

  renderer.setSize(width, height);
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.left = '50%';
  renderer.domElement.style.top = '50%';
  renderer.domElement.style.transform = 'translate(-50%, -50%)';

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function setTableLayout(mode) {
  const portrait = mode === 'portrait';
  tableWidth = portrait ? 7 : 12;
  tableDepth = portrait ? 12 : 7;
  arenaLimit = portrait ? tableWidth / 2 - 0.9 : tableDepth / 2 - 0.7;

  table.geometry.dispose();
  table.geometry = new THREE.BoxGeometry(tableWidth, 0.6, tableDepth);

  centerLine.geometry.dispose();
  centerLine.geometry = portrait
    ? new THREE.BoxGeometry(tableWidth, 0.05, 0.2)
    : new THREE.BoxGeometry(0.2, 0.05, tableDepth);

  if (portrait) {
    leftPaddle.position.set(0, 0.4, -tableDepth / 2 + 0.7);
    rightPaddle.position.set(0, 0.4, tableDepth / 2 - 0.7);
    leftPaddle.rotation.y = Math.PI / 4;
    rightPaddle.rotation.y = -Math.PI / 4;
    camera.position.set(0, 10, 11);
    controlHint.textContent = 'Tap/click arrows: top player (blue), bottom player (red)';
    hud.classList.add('portrait');
    touchControls.classList.remove('hidden');
  } else {
    leftPaddle.position.set(-tableWidth / 2 + 0.7, 0.4, 0);
    rightPaddle.position.set(tableWidth / 2 - 0.7, 0.4, 0);
    leftPaddle.rotation.y = 0;
    rightPaddle.rotation.y = 0;
    camera.position.set(0, 8, 12);
    controlHint.textContent = 'W/S = Left Paddle · ↑/↓ = Right Paddle';
    hud.classList.remove('portrait');
    touchControls.classList.add('hidden');
  }

  camera.lookAt(0, 0, 0);
}

function resetBall(direction = 1) {
  ball.position.set(0, ballRadius + 0.1, 0);

  if (gameMode === 'portrait') {
    const randomX = (Math.random() - 0.5) * 0.8;
    ballVelocity
      .set(randomX * ballBaseSpeed, 0, direction * ballBaseSpeed)
      .normalize()
      .multiplyScalar(ballBaseSpeed);
  } else {
    const randomZ = (Math.random() - 0.5) * 0.8;
    ballVelocity
      .set(direction * ballBaseSpeed, 0, randomZ * ballBaseSpeed)
      .normalize()
      .multiplyScalar(ballBaseSpeed);
  }
}

function updatePaddles(delta) {
  if (gameMode === 'portrait') {
    const topDir = (keyState.p1Right ? 1 : 0) - (keyState.p1Left ? 1 : 0);
    const bottomDir = (keyState.p2Right ? 1 : 0) - (keyState.p2Left ? 1 : 0);

    leftPaddle.position.x += topDir * paddleSpeed * delta;
    rightPaddle.position.x += bottomDir * paddleSpeed * delta;

    leftPaddle.position.x = THREE.MathUtils.clamp(leftPaddle.position.x, -arenaLimit, arenaLimit);
    rightPaddle.position.x = THREE.MathUtils.clamp(rightPaddle.position.x, -arenaLimit, arenaLimit);
  } else {
    const leftDir = (keyState.KeyS ? 1 : 0) - (keyState.KeyW ? 1 : 0);
    const rightDir = (keyState.ArrowDown ? 1 : 0) - (keyState.ArrowUp ? 1 : 0);

    leftPaddle.position.z += leftDir * paddleSpeed * delta;
    rightPaddle.position.z += rightDir * paddleSpeed * delta;

    leftPaddle.position.z = THREE.MathUtils.clamp(leftPaddle.position.z, -arenaLimit, arenaLimit);
    rightPaddle.position.z = THREE.MathUtils.clamp(rightPaddle.position.z, -arenaLimit, arenaLimit);
  }
}

function bounceFromPaddleLandscape(paddle, direction) {
  const paddleHalfDepth = 0.9;
  const diff = ball.position.z - paddle.position.z;
  if (Math.abs(diff) > paddleHalfDepth + ballRadius) return false;

  const hitNorm = THREE.MathUtils.clamp(diff / paddleHalfDepth, -1, 1);
  const angle = hitNorm * maxBounceAngle;
  const speed = Math.min(ballVelocity.length() + 0.45, 12);

  ballVelocity.x = Math.cos(angle) * speed * direction;
  ballVelocity.z = Math.sin(angle) * speed;
  return true;
}

function bounceFromPaddlePortrait(paddle, direction) {
  const paddleHalfWidth = 0.9;
  const diff = ball.position.x - paddle.position.x;
  if (Math.abs(diff) > paddleHalfWidth + ballRadius) return false;

  const hitNorm = THREE.MathUtils.clamp(diff / paddleHalfWidth, -1, 1);
  const angle = hitNorm * maxBounceAngle;
  const speed = Math.min(ballVelocity.length() + 0.45, 12);

  ballVelocity.z = Math.cos(angle) * speed * direction;
  ballVelocity.x = Math.sin(angle) * speed;
  return true;
}

function updateBall(delta) {
  ball.position.addScaledVector(ballVelocity, delta);

  if (gameMode === 'portrait') {
    if (ball.position.x + ballRadius > tableWidth / 2 || ball.position.x - ballRadius < -tableWidth / 2) {
      ballVelocity.x *= -1;
      ball.position.x = THREE.MathUtils.clamp(ball.position.x, -tableWidth / 2 + ballRadius, tableWidth / 2 - ballRadius);
    }

    const topCollisionZ = leftPaddle.position.z + 0.2 + ballRadius;
    const bottomCollisionZ = rightPaddle.position.z - 0.2 - ballRadius;

    if (ballVelocity.z < 0 && ball.position.z <= topCollisionZ && bounceFromPaddlePortrait(leftPaddle, 1)) {
      ball.position.z = topCollisionZ;
    }

    if (ballVelocity.z > 0 && ball.position.z >= bottomCollisionZ && bounceFromPaddlePortrait(rightPaddle, -1)) {
      ball.position.z = bottomCollisionZ;
    }

    if (ball.position.z < -tableDepth / 2 - 1.2) {
      rightScore += 1;
      setScores();
      resetBall(1);
    } else if (ball.position.z > tableDepth / 2 + 1.2) {
      leftScore += 1;
      setScores();
      resetBall(-1);
    }
  } else {
    if (ball.position.z + ballRadius > tableDepth / 2 || ball.position.z - ballRadius < -tableDepth / 2) {
      ballVelocity.z *= -1;
      ball.position.z = THREE.MathUtils.clamp(ball.position.z, -tableDepth / 2 + ballRadius, tableDepth / 2 - ballRadius);
    }

    const leftCollisionX = leftPaddle.position.x + 0.2 + ballRadius;
    const rightCollisionX = rightPaddle.position.x - 0.2 - ballRadius;

    if (ballVelocity.x < 0 && ball.position.x <= leftCollisionX && bounceFromPaddleLandscape(leftPaddle, 1)) {
      ball.position.x = leftCollisionX;
    }

    if (ballVelocity.x > 0 && ball.position.x >= rightCollisionX && bounceFromPaddleLandscape(rightPaddle, -1)) {
      ball.position.x = rightCollisionX;
    }

    if (ball.position.x < -tableWidth / 2 - 1.2) {
      rightScore += 1;
      setScores();
      resetBall(1);
    } else if (ball.position.x > tableWidth / 2 + 1.2) {
      leftScore += 1;
      setScores();
      resetBall(-1);
    }
  }
}

function animate() {
  if (!running) return;
  const delta = Math.min(clock.getDelta(), 0.032);
  updatePaddles(delta);
  updateBall(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const clock = new THREE.Clock();

function bindTouchControl(buttonId, keyName) {
  const btn = document.getElementById(buttonId);
  const down = (event) => {
    event.preventDefault();
    keyState[keyName] = true;
  };
  const up = (event) => {
    event.preventDefault();
    keyState[keyName] = false;
  };

  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('mousedown', down);
  btn.addEventListener('mouseup', up);
  btn.addEventListener('mouseleave', up);
  btn.addEventListener('touchstart', down, { passive: false });
  btn.addEventListener('touchend', up, { passive: false });
  btn.addEventListener('touchcancel', up, { passive: false });
}

bindTouchControl('p1Left', 'p1Left');
bindTouchControl('p1Right', 'p1Right');
bindTouchControl('p2Left', 'p2Left');
bindTouchControl('p2Right', 'p2Right');

function startGame(mode) {
  gameMode = mode;
  leftScore = 0;
  rightScore = 0;
  setScores();

  splash.classList.add('hidden');
  gameUI.classList.remove('hidden');
  setTableLayout(mode);
  setViewportForMode();
  resetBall(Math.random() > 0.5 ? 1 : -1);

  if (!running) {
    running = true;
    animate();
  }
}

playLandscapeBtn.addEventListener('click', () => startGame('landscape'));
playPortraitBtn.addEventListener('click', () => startGame('portrait'));

window.addEventListener('resize', setViewportForMode);
