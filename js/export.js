/* ═══════════════════════════════════
   Export: Image & Frame-by-Frame Video
   ═══════════════════════════════════ */

let isExporting = false;

function saveImage() {
    let so = offset.copy(), sz = zoom;
    offset = createVector(0, 0);
    zoom = 1.0;
    drawFrame(frameCount);
    saveCanvas('TEXT_MOSAIC', 'png');
    offset = so; zoom = sz;
    updateStatus('이미지 저장됨!', 'success');
}

// ── High-Quality Frame-by-Frame Video Export ──
// Uses captureStream(0) + requestFrame() for perfect frame capture
// No dropped frames, full resolution, high bitrate

async function exportVideo() {
    if (isExporting) return;

    let hasAnim = layers.some(L => L.effects.pulse || L.effects.morph || L.effects.wave);
    if (!hasAnim) { updateStatus('PULSE, MORPH, 또는 WAVE를 켜세요', 'error'); return; }

    let dur = constrain(parseInt(document.getElementById('videoDuration').value) || 3, 1, 30);
    let fps = 60;
    let totalFrames = fps * dur;

    isExporting = true;
    let btn = document.getElementById('exportVideoBtn');
    btn.classList.add('exporting');
    btn.textContent = 'EXPORTING...';

    let progBar = document.getElementById('exportProgress');
    let progFill = document.getElementById('exportProgressFill');
    progBar.classList.remove('hidden');

    // Save state
    let savedOffset = offset.copy();
    let savedZoom = zoom;
    offset = createVector(0, 0);
    zoom = 1.0;

    // Reset animations
    for (let L of layers) {
        L.morphProgress = 0;
        L.morphDirection = 1;
    }

    // Get canvas element
    let cnv = document.querySelector('#canvas-wrap canvas');
    if (!cnv) { finishExport(savedOffset, savedZoom, btn, progBar); return; }

    // Setup high-quality recording
    let stream = cnv.captureStream(0);
    let track = stream.getVideoTracks()[0];
    let chunks = [];

    // Try highest quality codec
    let opts = { videoBitsPerSecond: 40000000 }; // 40 Mbps
    for (let mime of [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
    ]) {
        if (MediaRecorder.isTypeSupported(mime)) {
            opts.mimeType = mime;
            break;
        }
    }

    let recorder = new MediaRecorder(stream, opts);
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
        let blob = new Blob(chunks, { type: opts.mimeType || 'video/webm' });
        let a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'TEXT_MOSAIC_HQ.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        finishExport(savedOffset, savedZoom, btn, progBar);
        updateStatus(dur + '초 영상 내보내기 완료!', 'success');
    };

    recorder.start();

    // Render frame by frame
    let frame = 0;

    function renderNext() {
        if (frame >= totalFrames) {
            recorder.stop();
            return;
        }

        // Update morph/animation for this frame
        for (let L of layers) {
            if (L.effects.morph && L.tiles1.length > 0 && L.tiles2.length > 0) {
                let ppf = 1 / (L.morphDuration * fps);
                L.morphProgress += L.morphDirection * ppf;
                if (L.morphProgress >= 1) { L.morphProgress = 1; L.morphDirection = -1; }
                else if (L.morphProgress <= 0) { L.morphProgress = 0; L.morphDirection = 1; }
                updateMorphedTiles(L);
            }
        }

        // Render this frame
        drawFrame(frame);

        // Signal frame to recorder
        if (track && track.requestFrame) {
            track.requestFrame();
        }

        frame++;
        let pct = Math.round((frame / totalFrames) * 100);
        progFill.style.width = pct + '%';
        updateStatus('내보내기 ' + pct + '%...');

        // Use rAF for smooth progress UI updates
        requestAnimationFrame(renderNext);
    }

    // Small delay to ensure recorder is ready
    setTimeout(() => requestAnimationFrame(renderNext), 100);
}

function finishExport(savedOffset, savedZoom, btn, progBar) {
    isExporting = false;
    offset = savedOffset;
    zoom = savedZoom;
    btn.classList.remove('exporting');
    btn.textContent = 'EXPORT VIDEO';
    progBar.classList.add('hidden');
}

// ── Draw a single frame (used by both live draw and export) ──
function drawFrame(frameNum) {
    drawBackground();
    if (!fontReady) return;

    push();
    translate(width / 2, height / 2);
    scale(zoom);
    translate(-width / 2 + offset.x, -height / 2 + offset.y);
    drawLayers(frameNum);
    pop();
}

function generateDemoImage() {
    img = createGraphics(width, height);
    img.background(30);
    img.noStroke();
    // Rich gradient demo
    for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
            let r = map(x, 0, width, 60, 220);
            let g = map(y, 0, height, 80, 200);
            let b = map(x + y, 0, width + height, 120, 255);
            img.fill(r, g, b);
            img.rect(x, y, 4, 4);
        }
    }
    // Add some circles for variation
    for (let i = 0; i < 30; i++) {
        img.fill(random(150, 255), random(100, 255), random(180, 255), 120);
        img.ellipse(random(width), random(height), random(30, 100));
    }
}
