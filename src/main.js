import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { EntityManager } from './entities.js';
import { UIManager } from './ui.js';
import nipplejs from 'nipplejs';

// Setup Scene
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a20);
scene.fog = new THREE.FogExp2(0x1a1a20, 0.035); // Heavy fog

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.5;
masterGain.connect(audioCtx.destination);

// State
const gameState = {
    isEscorting: false,
    escortTarget: null,
    score: 0
};

// Modules
const ui = new UIManager();
const world = new World(scene);
const player = new Player(scene, camera);
const entities = new EntityManager(scene, player, world, audioCtx, masterGain);

// Input (Joystick)
const joystickManager = nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'white'
});

let moveVector = { x: 0, y: 0 };
joystickManager.on('move', (evt, data) => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (data && data.vector) {
        moveVector.x = data.vector.x;
        moveVector.y = -data.vector.y; // Invert Y for 3D Z mapping
    }
});
joystickManager.on('end', () => {
    moveVector = { x: 0, y: 0 };
});

// Keyboard Fallback
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404050, 0.8); // Dim blueish ambient
scene.add(ambientLight);

// Game Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const time = clock.getElapsedTime();

    // Input Handling (Keyboard overrides joystick if used)
    let inputX = moveVector.x;
    let inputY = moveVector.y;

    if (keys['KeyW']) inputY = 1;
    if (keys['KeyS']) inputY = -1;
    if (keys['KeyA']) inputX = -1;
    if (keys['KeyD']) inputX = 1;

    // Logic Updates
    if (!gameState.gameOver) {
        player.update(dt, inputX, inputY);
        world.update(player.position);
        entities.update(dt, time, gameState);
        ui.update(gameState, player);
    }

    // Camera Follow
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, player.position.z + 10, 0.1);
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}

// Start
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});