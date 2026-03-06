import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060d);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
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

const tableWidth = 12;
const tableDepth = 7;

const table = new THREE.Mesh(
  new THREE.BoxGeometry(tableWidth, 0.6, tableDepth),
  new THREE.MeshPhongMaterial({
    color: 0x16335a,
    specular: 0x2f4f75,
    shininess: 45
  })
);
table.position.y = -0.6;
table.receiveShadow = true;
scene.add(table);

const centerLine = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.05, tableDepth),
  new THREE.MeshPhongMaterial({
    color: 0x8fbaff,
    emissive: 0x07132b,
    specular: 0x9cc8ff,
    shininess: 120
  })
);
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
leftPaddle.position.set(-tableWidth / 2 + 0.7, 0.4, 0);
leftPaddle.castShadow = true;
leftPaddle.receiveShadow = true;
scene.add(leftPaddle);

const rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
rightPaddle.position.set(tableWidth / 2 - 0.7, 0.4, 0);
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
ball.position.set(0, ballRadius + 0.1, 0);
ball.castShadow = true;
ball.receiveShadow = false;
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
