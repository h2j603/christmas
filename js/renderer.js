/* ═══════════════════════════════════
   Renderer: Background, Tiles, Effects
   ═══════════════════════════════════ */

let gradientBuffer = null;
let gradientDirty = true;

function drawBackground() {
    let c1 = color(document.getElementById('bgColor').value);
    let c2 = color(document.getElementById('bgColor2').value);

    if (gradientType === 'none') {
        background(c1);
    } else {
        // Cache gradient to offscreen buffer for performance
        if (gradientDirty || !gradientBuffer || gradientBuffer.width !== width) {
            gradientBuffer = createGraphics(width, height);
            if (gradientType === 'linear') renderLinearGradient(gradientBuffer, c1, c2);
            else renderRadialGradient(gradientBuffer, c1, c2);
            gradientDirty = false;
        }
        image(gradientBuffer, 0, 0);
    }

    if (noiseAmount > 0 && noiseBuffer) {
        push();
        blendMode(ADD);
        tint(255, noiseAmount * 2.55);
        image(noiseBuffer, 0, 0);
        pop();
    }
}

function renderLinearGradient(g, c1, c2) {
    g.push(); g.noFill();
    let ar = radians(gradAngle);
    let cx = g.width / 2, cy = g.height / 2;
    let diag = sqrt(g.width * g.width + g.height * g.height);
    let steps = ceil(diag);
    for (let i = 0; i <= steps; i++) {
        g.stroke(lerpColor(c1, c2, i / steps));
        let px = cos(ar + HALF_PI) * diag;
        let py = sin(ar + HALF_PI) * diag;
        let ox = cos(ar) * (i - diag / 2);
        let oy = sin(ar) * (i - diag / 2);
        g.line(cx + px + ox, cy + py + oy, cx - px + ox, cy - py + oy);
    }
    g.pop();
}

function renderRadialGradient(g, c1, c2) {
    g.push(); g.noStroke();
    let maxR = sqrt(g.width * g.width + g.height * g.height) / 2;
    for (let r = maxR; r > 0; r -= 2) {
        g.fill(lerpColor(c1, c2, 1 - r / maxR));
        g.ellipse(g.width / 2, g.height / 2, r * 2, r * 2);
    }
    g.pop();
}

function generateNoiseBuffer() {
    noiseBuffer = createGraphics(width, height);
    noiseBuffer.loadPixels();
    for (let i = 0; i < noiseBuffer.pixels.length; i += 4) {
        let v = random(255);
        noiseBuffer.pixels[i] = v;
        noiseBuffer.pixels[i + 1] = v;
        noiseBuffer.pixels[i + 2] = v;
        noiseBuffer.pixels[i + 3] = 255;
    }
    noiseBuffer.updatePixels();
}

function markGradientDirty() { gradientDirty = true; }

// ── Draw Layers ──

function drawLayers(frameNum) {
    for (let i = 0; i < layers.length; i++) {
        let L = layers[i];
        if (!L.visible || L.currentTiles.length === 0) continue;

        // Morph update
        if (L.effects.morph && L.tiles1.length > 0 && L.tiles2.length > 0) {
            let ppf = 1 / (L.morphDuration * 60);
            L.morphProgress += L.morphDirection * ppf;
            if (L.morphProgress >= 1) { L.morphProgress = 1; L.morphDirection = -1; }
            else if (L.morphProgress <= 0) { L.morphProgress = 0; L.morphDirection = 1; }
            updateMorphedTiles(L);
        } else if (!L.effects.morph && L.tiles1.length > 0) {
            L.currentTiles = L.tiles1;
        }

        push();
        drawingContext.globalAlpha = L.opacity / 100;
        drawingContext.globalCompositeOperation = L.blendMode;
        translate(L.offsetX, L.offsetY);
        if (L.effects.web) drawWebLines(L);
        drawTiles(L, frameNum);
        pop();
    }
}

function updateMorphedTiles(L) {
    let count = min(L.tiles1.length, L.tiles2.length);
    L.currentTiles = [];
    let t = L.morphProgress;
    let eased = t * t * (3 - 2 * t); // Hermite

    for (let i = 0; i < count; i++) {
        let idx1 = floor(map(i, 0, count, 0, L.tiles1.length));
        let idx2 = floor(map(i, 0, count, 0, L.tiles2.length));
        let t1 = L.tiles1[idx1];
        let t2 = L.tiles2[idx2];

        let mx = lerp(t1.x, t2.x, eased);
        let my = lerp(t1.y, t2.y, eased);
        let curve = sin(eased * PI) * 15;
        let angle = atan2(t2.y - t1.y, t2.x - t1.x) + HALF_PI;
        mx += cos(angle) * curve * sin(i * 0.1);
        my += sin(angle) * curve * sin(i * 0.1);

        L.currentTiles.push({
            x: mx, y: my, index: i,
            size: t1.size ? lerp(t1.size, t2.size || 1, eased) : undefined
        });
    }

    // Include extra tiles from whichever set is larger
    let bigger = L.tiles1.length > L.tiles2.length ? L.tiles1 : L.tiles2;
    for (let i = count; i < bigger.length; i++) {
        let fade = L.tiles1.length > L.tiles2.length ? (1 - eased) : eased;
        L.currentTiles.push({ x: bigger[i].x, y: bigger[i].y, index: i, size: bigger[i].size, alpha: fade });
    }
}

function drawWebLines(L) {
    strokeWeight(0.6);
    let maxDist = min(width, height) * 0.08;
    let tiles = L.currentTiles;

    for (let i = 0; i < tiles.length; i++) {
        let t1 = tiles[i];
        let conn = 0;
        for (let j = i + 1; j < tiles.length && conn < 3; j++) {
            let t2 = tiles[j];
            let dx = t1.x - t2.x, dy = t1.y - t2.y;
            let d = sqrt(dx * dx + dy * dy);
            if (d < maxDist) {
                let c = getImageColor((t1.x + t2.x) / 2, (t1.y + t2.y) / 2);
                let a = map(d, 0, maxDist, 180, 20);
                stroke(red(c), green(c), blue(c), a);
                line(t1.x, t1.y, t2.x, t2.y);
                conn++;
            }
        }
    }
}

function drawTiles(L, frameNum) {
    let baseSz = min(width, height) * (L.tileSize / 100);
    let tiles = L.currentTiles;
    let fn = frameNum || frameCount;

    noStroke();
    for (let i = 0; i < tiles.length; i++) {
        let t = tiles[i];
        let sz = baseSz * (t.size || 1);

        if (L.effects.pulse) {
            sz *= sin(fn * 0.05 + i * 0.3) * 0.3 + 1;
        }

        let tileAlpha = t.alpha !== undefined ? t.alpha : 1;

        push();
        translate(t.x, t.y);

        if (L.effects.wave) {
            let waveOff = sin(fn * 0.03 + t.x * 0.01) * 8 + cos(fn * 0.02 + t.y * 0.01) * 6;
            translate(0, waveOff);
        }

        if (L.effects.rotate) {
            randomSeed(i);
            rotate(random(-0.4, 0.4) + (L.effects.pulse ? sin(fn * 0.02 + i) * 0.1 : 0));
        }

        if (tileAlpha < 1) drawingContext.globalAlpha *= tileAlpha;

        if (img) {
            image(img, -sz / 2, -sz / 2, sz, sz);
        } else {
            let c = getImageColor(t.x, t.y);
            fill(c);
            rect(-sz / 2, -sz / 2, sz, sz);
        }
        pop();
    }
}

function getImageColor(x, y) {
    if (!img) return color(200);
    let ix = constrain(floor(map(x, 0, width, 0, img.width)), 0, img.width - 1);
    let iy = constrain(floor(map(y, 0, height, 0, img.height)), 0, img.height - 1);
    return img.get(ix, iy);
}
