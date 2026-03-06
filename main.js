import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d1a);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const ambient = new THREE.AmbientLight(0x8ea4ff, 0.55);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.15);
directional.position.set(5, 10, 7);
scene.add(directional);

const tableWidth = 12;
const tableDepth = 7;

const table = new THREE.Mesh(
  new THREE.BoxGeometry(tableWidth, 0.6, tableDepth),
  new THREE.MeshPhongMaterial({ color: 0x1d3b5f, shininess: 70 })
);
table.position.y = -0.6;
scene.add(table);

const centerLine = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.05, tableDepth),
  new THREE.MeshPhongMaterial({ color: 0x9cc8ff })
);
centerLine.position.y = 0.01;
scene.add(centerLine);

const paddleGeometry = new THREE.BoxGeometry(0.4, 0.8, 1.8);
const paddleMaterial = new THREE.MeshPhongMaterial({ color: 0xf0f5ff, shininess: 90 });

const leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
leftPaddle.position.set(-tableWidth / 2 + 0.7, 0.4, 0);
scene.add(leftPaddle);

const rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
rightPaddle.position.set(tableWidth / 2 - 0.7, 0.4, 0);
scene.add(rightPaddle);

const ballRadius = 0.27;
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(ballRadius, 20, 20),
  new THREE.MeshPhongMaterial({ color: 0xffe28e, emissive: 0x332200, shininess: 120 })
);
ball.position.set(0, ballRadius + 0.1, 0);
scene.add(ball);

const keyState = {};
window.addEventListener('keydown', (event) => {
  keyState[event.code] = true;
});
window.addEventListener('keyup', (event) => {
  keyState[event.code] = false;
});

const leftScoreEl = document.getElementById('leftScore');
const rightScoreEl = document.getElementById('rightScore');
let leftScore = 0;
let rightScore = 0;

const paddleSpeed = 8;
const ballBaseSpeed = 6;
const maxBounceAngle = Math.PI / 3;
const arenaLimit = tableDepth / 2 - 0.7;
let ballVelocity = new THREE.Vector3();

function resetBall(direction = 1) {
  ball.position.set(0, ballRadius + 0.1, 0);
  const randomZ = (Math.random() - 0.5) * 0.8;
  ballVelocity.set(direction * ballBaseSpeed, 0, randomZ * ballBaseSpeed).normalize().multiplyScalar(ballBaseSpeed);
}

function setScores() {
  leftScoreEl.textContent = String(leftScore);
  rightScoreEl.textContent = String(rightScore);
}

resetBall(Math.random() > 0.5 ? 1 : -1);
setScores();

const clock = new THREE.Clock();

function updatePaddles(delta) {
  const leftDir = (keyState['KeyW'] ? 1 : 0) - (keyState['KeyS'] ? 1 : 0);
  const rightDir = (keyState['ArrowUp'] ? 1 : 0) - (keyState['ArrowDown'] ? 1 : 0);

  leftPaddle.position.z += leftDir * paddleSpeed * delta;
  rightPaddle.position.z += rightDir * paddleSpeed * delta;

  leftPaddle.position.z = THREE.MathUtils.clamp(leftPaddle.position.z, -arenaLimit, arenaLimit);
  rightPaddle.position.z = THREE.MathUtils.clamp(rightPaddle.position.z, -arenaLimit, arenaLimit);
}

function bounceFromPaddle(paddle, direction) {
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

function updateBall(delta) {
  ball.position.addScaledVector(ballVelocity, delta);

  if (ball.position.z + ballRadius > tableDepth / 2 || ball.position.z - ballRadius < -tableDepth / 2) {
    ballVelocity.z *= -1;
    ball.position.z = THREE.MathUtils.clamp(ball.position.z, -tableDepth / 2 + ballRadius, tableDepth / 2 - ballRadius);
  }

  const leftCollisionX = leftPaddle.position.x + 0.2 + ballRadius;
  const rightCollisionX = rightPaddle.position.x - 0.2 - ballRadius;

  if (ballVelocity.x < 0 && ball.position.x <= leftCollisionX && bounceFromPaddle(leftPaddle, 1)) {
    ball.position.x = leftCollisionX;
  }

  if (ballVelocity.x > 0 && ball.position.x >= rightCollisionX && bounceFromPaddle(rightPaddle, -1)) {
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

function animate() {
  const delta = Math.min(clock.getDelta(), 0.032);
  updatePaddles(delta);
  updateBall(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
