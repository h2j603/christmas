/* ═══════════════════════════════════
   Text Point Extraction Engine
   3 modes: fill, outline, density
   ═══════════════════════════════════ */

function extractTextPoints(txt, L) {
    let lines = txt.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return [];

    let fontSize = min(width, height) * (L.fontSize / 100);
    let tilePx = max(2, min(width, height) * (L.tileSize / 100) * 0.55);

    // Offscreen canvas for text rendering
    let offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    let ctx = offCanvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);

    let fontStr = L.fontWeight + ' ' + fontSize + 'px ' + L.fontFamily;
    ctx.font = fontStr;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'alphabetic';

    let lineHeightPx = fontSize * (L.lineHeight / 100);
    let totalH = lines.length * lineHeightPx;
    let startY = (height - totalH) / 2 + fontSize * 0.8;
    let scaleXR = L.scaleX / 100;

    // Draw each line character by character
    for (let li = 0; li < lines.length; li++) {
        let lineTxt = lines[li];
        let y = startY + li * lineHeightPx;

        let totalW = 0;
        for (let c = 0; c < lineTxt.length; c++) {
            totalW += ctx.measureText(lineTxt[c]).width * scaleXR;
            if (c < lineTxt.length - 1) totalW += L.letterSpace;
        }

        let cx = (width - totalW) / 2;
        for (let c = 0; c < lineTxt.length; c++) {
            let ch = lineTxt[c];
            let charW = ctx.measureText(ch).width;
            ctx.save();
            ctx.translate(cx, y);
            ctx.scale(scaleXR, 1);
            ctx.fillText(ch, 0, 0);
            ctx.restore();
            cx += charW * scaleXR + L.letterSpace;
        }
    }

    // Read pixel data
    let imageData = ctx.getImageData(0, 0, width, height);
    let px = imageData.data;

    if (L.tileMode === 'outline') return extractOutlinePoints(px, width, height, tilePx);
    if (L.tileMode === 'density') return extractDensityPoints(px, width, height, tilePx);
    return extractFillPoints(px, width, height, tilePx);
}

// ── FILL mode: grid sampling with jitter ──
function extractFillPoints(px, w, h, tilePx) {
    let points = [];
    let step = tilePx;
    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            let sx = floor(x + step * 0.5);
            let sy = floor(y + step * 0.5);
            if (sx >= w || sy >= h) continue;
            let idx = (sy * w + sx) * 4;
            if (px[idx + 3] > 128) {
                points.push({
                    x: x + random(step * 0.1, step * 0.9),
                    y: y + random(step * 0.1, step * 0.9),
                    index: points.length
                });
            }
        }
    }
    return points;
}

// ── OUTLINE mode: edge detection via alpha gradient ──
function extractOutlinePoints(px, w, h, tilePx) {
    let points = [];
    let step = max(2, floor(tilePx * 0.7));
    let threshold = 80;

    for (let y = step; y < h - step; y += step) {
        for (let x = step; x < w - step; x += step) {
            let idx = (y * w + x) * 4;
            let a = px[idx + 3];

            // Check neighbors for edge
            let aL = px[(y * w + (x - step)) * 4 + 3] || 0;
            let aR = px[(y * w + (x + step)) * 4 + 3] || 0;
            let aU = px[((y - step) * w + x) * 4 + 3] || 0;
            let aD = px[((y + step) * w + x) * 4 + 3] || 0;

            let gradX = abs(aR - aL);
            let gradY = abs(aD - aU);
            let grad = gradX + gradY;

            if (grad > threshold) {
                points.push({
                    x: x + random(-step * 0.3, step * 0.3),
                    y: y + random(-step * 0.3, step * 0.3),
                    index: points.length
                });
            }
        }
    }
    return points;
}

// ── DENSITY mode: more tiles where image is brighter ──
function extractDensityPoints(px, w, h, tilePx) {
    let points = [];
    let step = tilePx;
    let maxStep = tilePx * 2.5;
    let minStep = tilePx * 0.4;

    for (let y = 0; y < h;) {
        let rowStep = step;
        for (let x = 0; x < w;) {
            let sx = floor(min(x + step * 0.5, w - 1));
            let sy = floor(min(y + step * 0.5, h - 1));
            let idx = (sy * w + sx) * 4;
            let a = px[idx + 3];

            if (a > 128) {
                // Use image brightness to vary density if image available
                let brightness = 1;
                if (img) {
                    let ix = constrain(floor(map(sx, 0, w, 0, img.width)), 0, img.width - 1);
                    let iy = constrain(floor(map(sy, 0, h, 0, img.height)), 0, img.height - 1);
                    let c = img.get(ix, iy);
                    brightness = (red(c) + green(c) + blue(c)) / (3 * 255);
                }

                // Brighter areas = smaller tiles = denser
                let localStep = lerp(minStep, maxStep, 1 - brightness);
                points.push({
                    x: x + random(localStep * 0.1, localStep * 0.9),
                    y: y + random(localStep * 0.1, localStep * 0.9),
                    index: points.length,
                    size: lerp(0.5, 1.5, brightness)
                });
                x += localStep;
                rowStep = localStep;
            } else {
                x += step;
            }
        }
        y += rowStep || step;
    }
    return points;
}

function normalizeToCenter(arr) {
    if (arr.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let t of arr) {
        if (t.x < minX) minX = t.x;
        if (t.x > maxX) maxX = t.x;
        if (t.y < minY) minY = t.y;
        if (t.y > maxY) maxY = t.y;
    }
    let ox = width / 2 - (minX + maxX) / 2;
    let oy = height / 2 - (minY + maxY) / 2;
    for (let t of arr) { t.x += ox; t.y += oy; }
}

function generateLayerTiles(L) {
    if (!fontReady) return;
    randomSeed(L.id * 1000 + 42);
    L.tiles1 = extractTextPoints(L.text, L);
    randomSeed(L.id * 1000 + 99);
    L.tiles2 = extractTextPoints(L.morphText, L);
    normalizeToCenter(L.tiles1);
    normalizeToCenter(L.tiles2);
    L.currentTiles = L.tiles1.map(t => ({ ...t }));
    L.morphProgress = 0;
    L.morphDirection = 1;
    randomSeed(millis());
}
