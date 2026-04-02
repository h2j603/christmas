/* ═══════════════════════════════════
   TEXT MOSAIC v3.0 — Main Entry
   p5.js setup() / draw() + globals
   ═══════════════════════════════════ */

// ── Global State ──
let img;
let fontReady = false;
let layers = [];
let activeLayerIdx = 0;
let gradientType = 'none';
let gradAngle = 0;
let noiseAmount = 0;
let noiseBuffer;
let zoom = 1.0;
let offset;

// ── p5.js Setup ──
function setup() {
    const w = parseInt(document.getElementById('canvasW').value) || 360;
    const h = parseInt(document.getElementById('canvasH').value) || 400;
    let canvas = createCanvas(w, h);
    canvas.parent('canvas-wrap');
    offset = createVector(0, 0);

    pixelDensity(1); // Consistent rendering across devices

    checkFontAndInit();
    bindGlobalEvents();
    bindLayerSettingsEvents();
    generateNoiseBuffer();
    initTouchHandlers();
    initKeyboardShortcuts();
    updateCanvasInfoUI();
}

function checkFontAndInit() {
    let checkCount = 0;
    let checker = setInterval(() => {
        checkCount++;
        let tc = document.createElement('canvas');
        let ctx = tc.getContext('2d');
        ctx.font = '40px "kozuka-mincho-pr6n", serif';
        let w1 = ctx.measureText('\u3042').width;
        ctx.font = '40px serif';
        let w2 = ctx.measureText('\u3042').width;

        if (w1 !== w2 || checkCount > 50) {
            clearInterval(checker);
            fontReady = true;
            updateStatus('준비 완료');
            addLayer();
            generateDemoImage();
            generateLayerTiles(layers[0]);
            updateTileCountUI();
        }
    }, 100);
}

// ── p5.js Draw Loop ──
function draw() {
    if (isExporting) return; // Don't interfere with export
    drawFrame(frameCount);
}

// ── Mouse Interaction (Desktop) ──
function mouseWheel(event) {
    // Zoom on canvas area or fullscreen
    let fsView = document.getElementById('fullscreen-view');
    let canvasArea = document.getElementById('canvas-area');
    let target = event.target;

    let inCanvas = canvasArea.contains(target) || !fsView.classList.contains('hidden');
    if (inCanvas) {
        zoom -= event.delta * 0.001;
        zoom = constrain(zoom, 0.1, 5);
        return false;
    }
}

function mouseDragged() {
    let fsView = document.getElementById('fullscreen-view');
    let canvasArea = document.getElementById('canvas-area');

    let inFS = !fsView.classList.contains('hidden');
    let inCanvas = canvasArea && canvasArea.matches(':hover');

    if (inFS || inCanvas) {
        offset.x += (mouseX - pmouseX) / zoom;
        offset.y += (mouseY - pmouseY) / zoom;
    }
}
