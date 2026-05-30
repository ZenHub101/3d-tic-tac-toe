import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

// dom elements
let coordsInfo = document.getElementById("coords");
let turnInfo = document.getElementById("turn-text");
const toast = document.getElementById("toast");

// game variables
let board = [ // 0 = empty, 1 = X, 2 = O
    [
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
    ],
    [
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
    ],
    [
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
    ],
    [
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
    ]
];
let currentPlayer = 1; // 1 = X; 2 = O
const size = 4;
const selected = {
    l: 0,
    r: 0,
    c: 0
}
const cells = [];

// scene
const scene = new THREE.Scene();

// camera
const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 5;

// renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.minDistance = 3;
controls.maxDistance = 10;
controls.update();

// ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);

scene.add(directionalLight);

// board cells
for (let lay = 0; lay < size; lay++) {
    cells[lay] = [];
    for (let row = 0; row < size; row++) {
        cells[lay][row] = [];
        for (let col = 0; col < size; col++) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const edges =  new THREE.EdgesGeometry(geometry);

            // materials
            const boxMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ffcc,
                transparent: true,
                opacity: 0.05
            });
            const wireMaterial = new THREE.LineBasicMaterial({
                color: 0x00ffcc
            });

            // meshes
            const box = new THREE.Mesh(
                geometry,
                boxMaterial
            );
            const wire = new THREE.LineSegments(
                edges,
                wireMaterial
            );

            // references
            const cell = new THREE.Group();
            cell.userData.box = box;
            cell.userData.wire = wire;
            cell.userData.row = row;
            cell.userData.col = col;
            cell.userData.lay = lay;
            if (!board[lay]) board[lay] = [];
            if (!board[lay][row]) board[lay][row] = [];
            cells[lay][row][col] = cell;

            // cell placement
            const spacing = 1.2;
            cell.position.x = (col - (size - 1) / 2) * spacing;
            cell.position.y = -(row - (size - 1) / 2) * spacing;
            cell.position.z = -(lay - (size - 1) / 2) * spacing;

            cell.add(box);
            cell.add(wire);
            box.userData.parentCell = cell;
            wire.userData.parentCell = cell;
            scene.add(cell);
        }
    }
}

// --- function definition ---

// functions to draw the X and O
function createX() {
    const finalObject = new THREE.Group();
    const geometryX = new THREE.CapsuleGeometry(0.10, 0.80, 32, 32);
    const materialX = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    // the 2 bars making the 'X'
    const bar1 = new THREE.Mesh(geometryX, materialX);
    bar1.rotation.z = Math.PI / 4; // i use pi/4 for 45 degrees because this thing takes radians
    const bar2 = new THREE.Mesh(geometryX, materialX);
    bar2.rotation.z = -Math.PI / 4; // same thing here
    // join the 2 bars to make a cross
    finalObject.add(bar1);
    finalObject.add(bar2);
    return finalObject;
}
function createO() {
    const geometryO = new THREE.TorusGeometry(0.30, 0.10, 32, 32);
    const materialO = new THREE.MeshStandardMaterial({ color: 0x00aaff });
    return new THREE.Mesh(geometryO, materialO);
}
// makes sure the cursor doesn't escape the board
function clampSelection() {
    selected.l = Math.max(0, Math.min(size - 1, selected.l));
    selected.r = Math.max(0, Math.min(size - 1, selected.r));
    selected.c = Math.max(0, Math.min(size - 1, selected.c));
}

// win/draw condition check
function checkWin(player) {
    const directions = [
        [1,0,0],
        [0,1,0],
        [0,0,1],

        [1,1,0],
        [1,-1,0],

        [1,0,1],
        [1,0,-1],

        [0,1,1],
        [0,1,-1],

        [1,1,1],
        [1,1,-1],
        [1,-1,1],
        [1,-1,-1]
    ];
    for (let l = 0; l < size; l++) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                for (const dir of directions) {
                    const dl = dir[0];
                    const dr = dir[1];
                    const dc = dir[2];
                    let count = 0;

                    for (let i = 0; i < size; i++) {
                        const nl = l + dl * i;
                        const nr = r + dr * i;
                        const nc = c + dc * i;
                        // if out of bounds
                        if (nl < 0 || nl >= size || nr < 0 || nr >= size || nc < 0 || nc >= size) {
                            break;
                        }
                        if (board[nl][nr][nc] === player) {
                            count++;
                        } else {
                            break;
                        }
                    }
                    if (count === size) {
                        return {
                            start: [l, r, c],
                            direction: [dl, dr, dc]
                        };
                    }
                }
            }
        }
    }
    return null;
}
function checkDraw() {
    for (let l = 0; l < size; l++) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[l][r][c] === 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

// reset the game
function resetGame() {
    for (let l = 0; l < size; l++) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                board[l][r][c] = 0;
                const cell = cells[l][r][c];
                for (let i = cell.children.length - 1; i >= 0; i--) {
                    const child = cell.children[i];
                    if (child.userData.isPiece) {
                        cell.remove(child);
                    }
                }
            }
        }
    }
    currentPlayer = 1;
    selected.l = 0;
    selected.r = 0;
    selected.c = 0;
    turnInfo.innerText = "Player X's turn"
}

// change board cell coords to world coords
function boardToWorld(l, r, c) {
    const spacing = 1.2;
    return new THREE.Vector3(
        (c - (size - 1) / 2) * spacing,
        -(r - (size - 1) / 2) * spacing,
        -(l - (size - 1) / 2) * spacing
    );
}

// draw a "beam" to indicate which 4-in-a-row pieces caused the win
function drawWinBeam(winLine) {
    const [l, r, c] = winLine.start;
    const [dl, dr, dc] = winLine.direction;
    const startPos = boardToWorld(l, r, c);
    const endPos = boardToWorld(
        l + dl * (size - 1),
        r + dr * (size - 1),
        c + dc * (size - 1)
    );
    const geometry = new THREE.CylinderGeometry(
        0.05,
        0.05,
        startPos.distanceTo(endPos),
        16
    );
    const material = new THREE.MeshStandardMaterial({
        color: 0xd3af37,
        emissive: 0xd3af37,
        emissiveIntensity: 1
    });
    const beam = new THREE.Mesh(
        geometry,
        material
    );
    beam.position.copy(
        startPos.clone().add(endPos).multiplyScalar(0.5)
    );
    beam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        endPos.clone().sub(startPos).normalize()
    );
    return beam;
}

// movement functions
function moveUp() {
    selected.r--;
    clampSelection();
}
function moveDown() {
    selected.r++;
    clampSelection();
}
function moveRight() {
    selected.c++;
    clampSelection();
}
function moveLeft() {
    selected.c--;
    clampSelection();
}
function moveFront() {
    selected.l--;
    clampSelection();
}
function moveBack() {
    selected.l++;
    clampSelection();
}

// finish the game and resets it
function finishGame(message, cssClass) {
    toast.classList.add(cssClass);
    showToast(message, 3000);
    setTimeout(() => {
        toast.classList.remove(cssClass);
        resetGame();
    }, 3000);
}

// showing toast notifications
function showToast(message, msDuration) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {toast.classList.remove("show");}, msDuration);
}

// delay function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// function to place pieces
function placePiece() {
    console.log("place START");
    if (board[selected.l][selected.r][selected.c] !== 0) {
        return;
    }
    console.log("place PIECE")
    board[selected.l][selected.r][selected.c] = currentPlayer;
    let piece;
    const placedPlayer = currentPlayer;0,0,0
    if (currentPlayer === 1) {
        piece = createX();
        piece.userData.isPiece = true;
        currentPlayer = 2;
    } else {
        piece = createO();
        piece.userData.isPiece = true;
        currentPlayer = 1;
    }
    console.log("placing");
    console.log(piece);
    console.log(cells[selected.l][selected.r][selected.c]);
    cells[selected.l][selected.r][selected.c].add(piece);
    // check if win/draw
    const winLine = checkWin(placedPlayer);
    if (winLine) {
        const beam = drawWinBeam(winLine);
        scene.add(beam);
        if (placedPlayer === 1) {
            finishGame("X wins!", "toast-x");
        } else {
            finishGame("O wins!", "toast-o");
        }
        setTimeout(() => {scene.remove(beam);}, 3000);
    } else if (checkDraw()) {
        showToast("It's a Draw!", 3000);
        setTimeout(resetGame, 3000);
    }
}
// event listener for keyboard input
window.addEventListener('keydown', (event) => {
    const blockedKeys = [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'KeyQ',
        'KeyE',
        'Enter'
    ];
    if (blockedKeys.includes(event.code)) {
        event.preventDefault();
    }
    console.log(event.code);
    switch(event.code) {
        case 'KeyW':
            moveUp();
            break;
        case 'KeyA':
            moveLeft();
            break;
        case 'KeyS':
            moveDown();
            break;
        case 'KeyD':
            moveRight();
            break;
        case 'KeyQ':
            moveFront();
            break;
        case 'KeyE':
            moveBack();
            break;
        case 'Enter':
            console.log("enter detected");
            placePiece();
            console.log(typeof placePiece);
            break;
    }
    console.log(
        selected.l,
        selected.r,
        selected.c
    );
    let currentPlayerPiece;
    if (currentPlayer === 1) {
        currentPlayerPiece = 'X';
    } else {
        currentPlayerPiece = 'O';
    }
    coordsInfo.textContent = `L:${selected.l} R:${selected.r} C:${selected.c}`;
    turnInfo.textContent = "Player " + currentPlayerPiece + "'s turn";
});

// on-screen buttons input handling
document.getElementById("up").addEventListener('click', moveUp);
document.getElementById("down").addEventListener('click', moveDown);
document.getElementById("left").addEventListener('click', moveLeft);
document.getElementById("right").addEventListener('click', moveRight);
document.getElementById("front").addEventListener('click', moveFront);
document.getElementById("back").addEventListener('click', moveBack);
document.getElementById("place").addEventListener('click', placePiece);

// animation loop
function animate() {
    requestAnimationFrame(animate);
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;
    controls.update();

    // reset opacity and color
    for (let l = 0; l < size; l++) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                cells[l][r][c].userData.box.material.opacity = 0.05;
                cells[l][r][c].userData.wire.material.color.set(0x00ffcc);
            }
        }
    }

    // highlight selected cell
    const selectedCell = cells[selected.l][selected.r][selected.c];
    selectedCell.userData.box.material.opacity = 0.5;
    selectedCell.userData.wire.material.color.set(0xffffff);
    renderer.render(scene, camera);
}

// --- run everything ---
animate();
