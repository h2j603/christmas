/* ═══════════════════════════════════
   IMAGE TEXT WARP v3 — Optimized Engine
   New effects, presets, zoom/pan, clipboard, WebM export
   ═══════════════════════════════════ */

// ── State ──
const S = {
    canvas: null, ctx: null,
    W: 800, H: 600,
    sourceImg: null,
    textMask: null,
    distField: null,
    insideMask: null,
    processed: null,
    mode: 'displace',
    text: 'WARP',
    font: "kozuka-mincho-pr6n, serif",
    fontWeight: '700',
    textSize: 50,
    textX: 50, textY: 50,
    letterSpace: 0,
    lineHeight: 120,
    textRotation: 0,
    intensity: 85,
    edgeSoftness: 40,
    detail: 50,
    seed: 0,
    invert: false,
    insideColor: 'original',
    outsideColor: 'original',
    bgColor: '#0a0a0c',
    bgOpacity: 0,
    anim: 'none',
    animSpeed: 1.0,
    exportScale: 1,
    isAnimating: false,
    needsRender: true,
    srcImageData: null,
    srcW: 0, srcH: 0,
    lastTextKey: '',
    // v3: zoom/pan
    zoom: 1, panX: 0, panY: 0,
    isPanning: false, panStartX: 0, panStartY: 0,
    // v3: before/after
    showOriginal: false,
    // v3: half-res preview
    previewScale: 1,
};

// ── Presets ──
const PRESETS = {
    'cinematic': { mode:'displace', intensity:80, edgeSoftness:55, detail:40, outsideColor:'original', insideColor:'original', bgOpacity:0, invert:false },
    'glitch-art': { mode:'glitch', intensity:90, edgeSoftness:30, detail:70, outsideColor:'original', insideColor:'original', bgOpacity:0, invert:false },
    'dream': { mode:'liquid', intensity:70, edgeSoftness:70, detail:60, outsideColor:'original', insideColor:'original', bgOpacity:0, invert:false },
    'split-rgb': { mode:'chromatic', intensity:85, edgeSoftness:45, detail:50, outsideColor:'original', insideColor:'original', bgOpacity:0, invert:false },
    'shattered': { mode:'shatter', intensity:90, edgeSoftness:20, detail:80, outsideColor:'original', insideColor:'original', bgOpacity:0, invert:false },
    'focus-pop': { mode:'focus', intensity:95, edgeSoftness:50, detail:50, outsideColor:'original', insideColor:'original', bgOpacity:0, invert:false },
    'inverted': { mode:'displace', intensity:80, edgeSoftness:40, detail:50, outsideColor:'original', insideColor:'original', bgOpacity:0, invert:true },
    'wave-pulse': { mode:'wave', intensity:75, edgeSoftness:50, detail:55, outsideColor:'original', insideColor:'original', bgOpacity:0, anim:'pulse-wave', animSpeed:1.2, invert:false },
};

function init() {
    S.canvas = document.createElement('canvas');
    S.canvas.width = S.W;
    S.canvas.height = S.H;
    S.ctx = S.canvas.getContext('2d', { willReadFrequently: true });
    document.getElementById('canvas-container').appendChild(S.canvas);
    S.textMask = document.createElement('canvas');
    S.processed = document.createElement('canvas');
    bindUI();
    initTheme();
    drawPlaceholder();
    fitCanvas();
}

function drawPlaceholder() {
    const ctx = S.ctx;
    ctx.fillStyle = '#18181e';
    ctx.fillRect(0, 0, S.W, S.H);
    ctx.fillStyle = '#404050';
    ctx.font = "700 18px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DROP IMAGE OR CLICK PHOTO', S.W / 2, S.H / 2);
}

function mulberry32(a) {
    return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            S.sourceImg = img;
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            const maxDim = 2400;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            S.W = w; S.H = h;
            S.canvas.width = w; S.canvas.height = h;
            S.processed.width = w; S.processed.height = h;
            const pCtx = S.processed.getContext('2d');
            pCtx.drawImage(img, 0, 0, w, h);
            S.srcImageData = pCtx.getImageData(0, 0, w, h);
            S.srcW = w; S.srcH = h;
            S.lastTextKey = '';
            document.getElementById('canvasInfoText').textContent = w + ' \u00d7 ' + h;
            updateExportInfo();
            fitCanvas();
            render(0);
            updateStatus(w + '\u00d7' + h + ' \ub85c\ub4dc \uc644\ub8cc', 'success');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function updateExportInfo() {
    const el = document.getElementById('exportInfo');
    if (!el) return;
    el.textContent = (S.W * S.exportScale) + ' \u00d7 ' + (S.H * S.exportScale) + 'px';
}

function getTextKey() {
    return [S.text, S.font, S.fontWeight, S.textSize, S.textX, S.textY,
            S.letterSpace, S.lineHeight, S.textRotation, S.W, S.H, S.invert].join('|');
}

function generateTextMask(w, h) {
    const key = getTextKey();
    if (key === S.lastTextKey && S.distField) return;
    S.lastTextKey = key;
    S.textMask.width = w; S.textMask.height = h;
    const ctx = S.textMask.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const fontSize = (S.textSize / 100) * Math.min(w, h);
    ctx.save();
    const cx = (S.textX / 100) * w;
    const cy = (S.textY / 100) * h;
    if (S.textRotation !== 0) {
        ctx.translate(cx, cy);
        ctx.rotate(S.textRotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
    }
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = S.fontWeight + ' ' + fontSize + 'px ' + S.font;
    const lines = S.text.split('\n');
    const lineH = fontSize * (S.lineHeight / 100);
    const totalH = lines.length * lineH;
    const startY = cy - totalH / 2 + lineH / 2;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (S.letterSpace !== 0 && line.length > 0) {
            const chars = [...line];
            const spacing = S.letterSpace * (fontSize / 50);
            const totalW = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
            let x = cx - totalW / 2;
            for (const ch of chars) {
                const cw = ctx.measureText(ch).width;
                ctx.fillText(ch, x + cw / 2, startY + i * lineH);
                x += cw + spacing;
            }
        } else {
            ctx.fillText(line, cx, startY + i * lineH);
        }
    }
    ctx.restore();
    buildDistanceField(w, h);
}

function buildDistanceField(w, h) {
    const maskData = S.textMask.getContext('2d').getImageData(0, 0, w, h).data;
    const inside = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        let isIn = maskData[i * 4 + 3] > 128 ? 1 : 0;
        if (S.invert) isIn = isIn ? 0 : 1;
        inside[i] = isIn;
    }
    const scale = 4;
    const sw = Math.ceil(w / scale), sh = Math.ceil(h / scale);
    const smallInside = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++)
        for (let x = 0; x < sw; x++)
            smallInside[y * sw + x] = inside[Math.min(y * scale, h - 1) * w + Math.min(x * scale, w - 1)];
    const dist = new Float32Array(sw * sh);
    const INF = 1e6;
    for (let i = 0; i < sw * sh; i++) dist[i] = smallInside[i] ? 0 : INF;
    for (let y = 1; y < sh - 1; y++)
        for (let x = 1; x < sw - 1; x++) {
            const i = y * sw + x;
            dist[i] = Math.min(dist[i], dist[(y-1)*sw+(x-1)]+1.414, dist[(y-1)*sw+x]+1, dist[(y-1)*sw+(x+1)]+1.414, dist[y*sw+(x-1)]+1);
        }
    for (let y = sh - 2; y >= 1; y--)
        for (let x = sw - 2; x >= 1; x--) {
            const i = y * sw + x;
            dist[i] = Math.min(dist[i], dist[(y+1)*sw+(x+1)]+1.414, dist[(y+1)*sw+x]+1, dist[(y+1)*sw+(x-1)]+1.414, dist[y*sw+(x+1)]+1);
        }
    S.distField = new Float32Array(w * h);
    S.insideMask = inside;
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            S.distField[y * w + x] = dist[Math.min(Math.floor(y / scale), sh - 1) * sw + Math.min(Math.floor(x / scale), sw - 1)] * scale;
}

function applyDisplace(src, out, w, h, time) {
    const strength = (S.intensity / 100) * 200;
    const softness = Math.max(1, (S.edgeSoftness / 100) * Math.min(w,h) * 0.3);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const d = S.distField[idx], isIn = S.insideMask[idx];
            let dx = 0, dy = 0;
            if (!isIn) {
                const t = Math.min(1, d / softness);
                const ramp = 0.3 + t * 0.7; // starts strong even near edge
                const f = ramp * strength;
                const tcx = (S.textX / 100) * w, tcy = (S.textY / 100) * h;
                const ax = x - tcx, ay = y - tcy;
                const len = Math.sqrt(ax*ax + ay*ay) || 1;
                dx = (ax/len)*f + Math.sin(y*0.04 + time*1.5)*f*0.4;
                dy = (ay/len)*f + Math.cos(x*0.04 + time*1.5)*f*0.4;
            }
            // inside: dx=0, dy=0 → original pixels untouched
            const sx = Math.max(0, Math.min(w-1, x+dx+0.5|0));
            const sy = Math.max(0, Math.min(h-1, y+dy+0.5|0));
            const si = (sy*w+sx)*4, di = idx*4;
            out[di]=src[si]; out[di+1]=src[si+1]; out[di+2]=src[si+2]; out[di+3]=src[si+3];
        }
    }
}

function applyFocus(src, out, w, h, time) {
    const blurR = Math.max(2, Math.round((S.intensity/100)*50));
    const soft = Math.max(1, (S.edgeSoftness/100)*Math.min(w,h)*0.25);
    const blurred = boxBlur(src, w, h, blurR);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y*w+x, di = idx*4;
            const isIn = S.insideMask[idx], d = S.distField[idx];
            let t = isIn ? 0 : Math.min(1, d/soft);
            t = 0.3 + t * 0.7; // strong blur even near edge
            if (isIn) t = 0; // inside perfectly sharp
            if (S.anim==='breathe') t *= 0.7 + 0.3*Math.sin(time*2);
            out[di]  = src[di]*(1-t)  + blurred[di]*t;
            out[di+1]= src[di+1]*(1-t)+ blurred[di+1]*t;
            out[di+2]= src[di+2]*(1-t)+ blurred[di+2]*t;
            out[di+3]= 255;
        }
    }
}

function applyScatter(src, out, w, h, time) {
    const str = (S.intensity/100)*150;
    const soft = Math.max(1, (S.edgeSoftness/100)*Math.min(w,h)*0.3);
    const baseSeed = S.seed + Math.floor(time * 2);
    const frac = (time * 2) % 1;
    const rng1 = mulberry32(baseSeed), rng2 = mulberry32(baseSeed + 1);
    const rX1 = new Float32Array(w*h), rY1 = new Float32Array(w*h);
    const rX2 = new Float32Array(w*h), rY2 = new Float32Array(w*h);
    for (let i=0;i<w*h;i++) {
        rX1[i]=(rng1()-0.5)*2; rY1[i]=(rng1()-0.5)*2;
        rX2[i]=(rng2()-0.5)*2; rY2[i]=(rng2()-0.5)*2;
    }
    for (let y=0;y<h;y++) {
        for (let x=0;x<w;x++) {
            const idx=y*w+x, di=idx*4;
            const d=S.distField[idx], isIn=S.insideMask[idx];
            let scatter = isIn ? 0 : (0.3 + Math.min(1, d/soft)*0.7) * str;
            if (S.anim==='glitch') scatter *= 0.6 + 0.4*Math.abs(Math.sin(time*4 + y*0.008));
            const rx = rX1[idx]*(1-frac) + rX2[idx]*frac;
            const ry = rY1[idx]*(1-frac) + rY2[idx]*frac;
            const sx = Math.max(0, Math.min(w-1, x+rx*scatter+0.5|0));
            const sy = Math.max(0, Math.min(h-1, y+ry*scatter+0.5|0));
            const si=(sy*w+sx)*4;
            out[di]=src[si]; out[di+1]=src[si+1]; out[di+2]=src[si+2]; out[di+3]=src[si+3];
        }
    }
}

function applyDensity(src, out, w, h, time) {
    const gridBase = Math.max(2, Math.round(3 + (100-S.detail)/100*30));
    const soft = Math.max(1, (S.edgeSoftness/100)*Math.min(w,h)*0.2);
    const intF = S.intensity/100;
    for (let i=0;i<w*h*4;i+=4) { out[i]=out[i+1]=out[i+2]=0; out[i+3]=255; }
    for (let gy=0; gy<h; gy+=gridBase) {
        for (let gx=0; gx<w; gx+=gridBase) {
            const idx = Math.min(gy,h-1)*w + Math.min(gx,w-1);
            const d=S.distField[idx], isIn=S.insideMask[idx];
            let tileSize = isIn ? gridBase : Math.max(1, Math.round(gridBase * (1 - Math.min(1,d/soft) * intF)));
            if (S.anim==='breathe') {
                const pulse = 0.85 + 0.15 * Math.sin(time*2 + (gx+gy)*0.005);
                tileSize = Math.max(1, Math.round(tileSize * pulse));
            }
            const cx=Math.min(gx+Math.floor(gridBase/2),w-1);
            const cy=Math.min(gy+Math.floor(gridBase/2),h-1);
            const ci=(cy*w+cx)*4;
            const r=src[ci],g=src[ci+1],b=src[ci+2];
            const offX=gx+Math.floor((gridBase-tileSize)/2);
            const offY=gy+Math.floor((gridBase-tileSize)/2);
            for (let ty=0;ty<tileSize;ty++) {
                for (let tx=0;tx<tileSize;tx++) {
                    const px=offX+tx, py=offY+ty;
                    if (px>=0&&px<w&&py>=0&&py<h) {
                        const pi=(py*w+px)*4;
                        out[pi]=r; out[pi+1]=g; out[pi+2]=b; out[pi+3]=255;
                    }
                }
            }
        }
    }
}

function applyWave(src, out, w, h, time) {
    const str = (S.intensity/100)*160;
    const freq = 0.01 + (S.detail/100)*0.08;
    const soft = Math.max(1, (S.edgeSoftness/100)*Math.min(w,h)*0.3);
    for (let y=0;y<h;y++) {
        for (let x=0;x<w;x++) {
            const idx=y*w+x, di=idx*4;
            const d=S.distField[idx], isIn=S.insideMask[idx];
            const waveAmt = isIn ? 0 : (0.3 + Math.min(1, d/soft)*0.7);
            const wave = waveAmt * str;
            const dx = Math.sin(y*freq + d*0.04 + time*2) * wave;
            const dy = Math.cos(x*freq + d*0.04 + time*2) * wave;
            const sx = Math.max(0, Math.min(w-1, x+dx+0.5|0));
            const sy = Math.max(0, Math.min(h-1, y+dy+0.5|0));
            const si=(sy*w+sx)*4;
            out[di]=src[si]; out[di+1]=src[si+1]; out[di+2]=src[si+2]; out[di+3]=src[si+3];
        }
    }
}

function applyShatter(src, out, w, h, time) {
    const str = (S.intensity/100)*140;
    const soft = Math.max(1, (S.edgeSoftness/100)*Math.min(w,h)*0.2);
    const rng = mulberry32(S.seed);
    const numCells = 30 + Math.round((S.detail/100)*150);
    const cells = [];
    for (let i=0;i<numCells;i++) cells.push({ x:rng()*w, y:rng()*h, dx:(rng()-0.5)*str, dy:(rng()-0.5)*str });
    for (let y=0;y<h;y++) {
        for (let x=0;x<w;x++) {
            const idx=y*w+x, di=idx*4;
            const d=S.distField[idx], isIn=S.insideMask[idx];
            let minD=Infinity, nearest=0;
            for (let c=0;c<numCells;c++) {
                const cd=(x-cells[c].x)**2+(y-cells[c].y)**2;
                if (cd<minD){minD=cd;nearest=c;}
            }
            let amt = isIn ? 0 : (0.3 + Math.min(1, d/soft)*0.7);
            if (S.anim==='pulse-wave') amt *= 0.5 + 0.5*Math.sin(time*1.5 + d*0.015);
            const cell=cells[nearest];
            const sx = Math.max(0, Math.min(w-1, x+cell.dx*amt+0.5|0));
            const sy = Math.max(0, Math.min(h-1, y+cell.dy*amt+0.5|0));
            const si=(sy*w+sx)*4;
            out[di]=src[si]; out[di+1]=src[si+1]; out[di+2]=src[si+2]; out[di+3]=src[si+3];
        }
    }
}

// ── NEW EFFECT: Chromatic Aberration ──
function applyChromatic(src, out, w, h, time) {
    const str = (S.intensity / 100) * 80;
    const soft = Math.max(1, (S.edgeSoftness / 100) * Math.min(w, h) * 0.3);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x, di = idx * 4;
            const d = S.distField[idx], isIn = S.insideMask[idx];
            let amt = isIn ? 0 : (0.3 + Math.min(1, d / soft) * 0.7) * str;
            if (S.anim !== 'none') amt *= 0.7 + 0.3 * Math.sin(time * 2 + d * 0.01);
            const angle = Math.atan2(y - (S.textY / 100) * h, x - (S.textX / 100) * w);
            const rOx = Math.round(Math.cos(angle) * amt);
            const rOy = Math.round(Math.sin(angle) * amt);
            const bOx = Math.round(Math.cos(angle + Math.PI) * amt);
            const bOy = Math.round(Math.sin(angle + Math.PI) * amt);
            const rsx = Math.max(0, Math.min(w - 1, x + rOx));
            const rsy = Math.max(0, Math.min(h - 1, y + rOy));
            const bsx = Math.max(0, Math.min(w - 1, x + bOx));
            const bsy = Math.max(0, Math.min(h - 1, y + bOy));
            out[di]     = src[(rsy * w + rsx) * 4];
            out[di + 1] = src[di + 1];
            out[di + 2] = src[(bsy * w + bsx) * 4 + 2];
            out[di + 3] = 255;
        }
    }
}

// ── NEW EFFECT: Liquid Warp (Perlin-like noise displacement) ──
function applyLiquid(src, out, w, h, time) {
    const str = (S.intensity / 100) * 180;
    const soft = Math.max(1, (S.edgeSoftness / 100) * Math.min(w, h) * 0.3);
    const freq = 0.003 + (S.detail / 100) * 0.015;
    const rng = mulberry32(S.seed);
    const phaseX = rng() * 1000, phaseY = rng() * 1000;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x, di = idx * 4;
            const d = S.distField[idx], isIn = S.insideMask[idx];
            let amt = isIn ? 0 : (0.3 + Math.min(1, d / soft) * 0.7);
            amt *= str;
            if (S.anim !== 'none') {
                amt *= 0.6 + 0.4 * Math.sin(time * 1.5 + x * 0.003 + y * 0.002);
            }
            const n1x = Math.sin(x * freq + phaseX + time * 0.8) * Math.cos(y * freq * 0.7 + time * 0.6);
            const n1y = Math.cos(y * freq + phaseY + time * 0.8) * Math.sin(x * freq * 0.7 + time * 0.6);
            const n2x = Math.sin(x * freq * 2.1 + y * freq * 0.5 + time * 1.2) * 0.5;
            const n2y = Math.cos(y * freq * 2.1 + x * freq * 0.5 + time * 1.2) * 0.5;
            const dx = (n1x + n2x) * amt;
            const dy = (n1y + n2y) * amt;
            const sx = Math.max(0, Math.min(w - 1, x + dx + 0.5 | 0));
            const sy = Math.max(0, Math.min(h - 1, y + dy + 0.5 | 0));
            const si = (sy * w + sx) * 4;
            out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
        }
    }
}

// ── NEW EFFECT: Glitch Slice ──
function applyGlitch(src, out, w, h, time) {
    const str = (S.intensity / 100) * 160;
    const soft = Math.max(1, (S.edgeSoftness / 100) * Math.min(w, h) * 0.3);
    const numSlices = 5 + Math.round((S.detail / 100) * 40);
    const sliceH = Math.ceil(h / numSlices);
    const baseSeed = S.seed + (S.anim !== 'none' ? Math.floor(time * 3) : 0);
    const rng = mulberry32(baseSeed);
    const sliceOffsets = [];
    for (let i = 0; i < numSlices; i++) {
        sliceOffsets.push({ dx: (rng() - 0.5) * 2 * str, channel: Math.floor(rng() * 3) });
    }
    for (let y = 0; y < h; y++) {
        const sliceIdx = Math.min(Math.floor(y / sliceH), numSlices - 1);
        const slice = sliceOffsets[sliceIdx];
        for (let x = 0; x < w; x++) {
            const idx = y * w + x, di = idx * 4;
            const d = S.distField[idx], isIn = S.insideMask[idx];
            if (isIn) {
                out[di] = src[di]; out[di+1] = src[di+1]; out[di+2] = src[di+2]; out[di+3] = 255;
                continue;
            }
            let amt = 0.3 + Math.min(1, d / soft) * 0.7;
            const dx = Math.round(slice.dx * amt);
            const sx = Math.max(0, Math.min(w - 1, x + dx));
            const si = (y * w + sx) * 4;
            // Shift only one channel for RGB split glitch look
            if (slice.channel === 0) {
                out[di] = src[(y * w + Math.max(0, Math.min(w - 1, x + dx * 1.5))) * 4];
                out[di + 1] = src[di + 1];
                out[di + 2] = src[si + 2];
            } else if (slice.channel === 1) {
                out[di] = src[si];
                out[di + 1] = src[(y * w + Math.max(0, Math.min(w - 1, x - dx))) * 4 + 1];
                out[di + 2] = src[si + 2];
            } else {
                out[di] = src[si];
                out[di + 1] = src[si + 1];
                out[di + 2] = src[(y * w + Math.max(0, Math.min(w - 1, x + dx * 1.3))) * 4 + 2];
            }
            out[di + 3] = 255;
        }
    }
}

function boxBlur(data, w, h, radius) {
    const out = new Uint8ClampedArray(data.length);
    const tmp = new Uint8ClampedArray(data.length);
    for (let y=0;y<h;y++) {
        for (let x=0;x<w;x++) {
            let r=0,g=0,b=0,c=0;
            for (let kx=-radius;kx<=radius;kx++) {
                const si=(y*w+Math.max(0,Math.min(w-1,x+kx)))*4;
                r+=data[si]; g+=data[si+1]; b+=data[si+2]; c++;
            }
            const di=(y*w+x)*4;
            tmp[di]=r/c; tmp[di+1]=g/c; tmp[di+2]=b/c; tmp[di+3]=255;
        }
    }
    for (let y=0;y<h;y++) {
        for (let x=0;x<w;x++) {
            let r=0,g=0,b=0,c=0;
            for (let ky=-radius;ky<=radius;ky++) {
                const si=(Math.max(0,Math.min(h-1,y+ky))*w+x)*4;
                r+=tmp[si]; g+=tmp[si+1]; b+=tmp[si+2]; c++;
            }
            const di=(y*w+x)*4;
            out[di]=r/c; out[di+1]=g/c; out[di+2]=b/c; out[di+3]=255;
        }
    }
    return out;
}

function applyColorEffects(out, w, h) {
    const soft = Math.max(1, (S.edgeSoftness/100)*Math.min(w,h)*0.2);
    const bgR=parseInt(S.bgColor.slice(1,3),16);
    const bgG=parseInt(S.bgColor.slice(3,5),16);
    const bgB=parseInt(S.bgColor.slice(5,7),16);
    for (let y=0;y<h;y++) {
        for (let x=0;x<w;x++) {
            const idx=y*w+x, di=idx*4;
            const d=S.distField[idx], isIn=S.insideMask[idx];
            let r=out[di], g=out[di+1], b=out[di+2];
            if (isIn) {
                if (S.insideColor==='bright') { r=Math.min(255,r*1.3); g=Math.min(255,g*1.3); b=Math.min(255,b*1.3); }
                else if (S.insideColor==='saturate') {
                    const gray=0.299*r+0.587*g+0.114*b;
                    r=Math.min(255,Math.max(0,gray+(r-gray)*1.6));
                    g=Math.min(255,Math.max(0,gray+(g-gray)*1.6));
                    b=Math.min(255,Math.max(0,gray+(b-gray)*1.6));
                }
            } else {
                const t = Math.min(1, d/soft);
                if (S.outsideColor==='grayscale') {
                    const gray=0.299*r+0.587*g+0.114*b;
                    r=r*(1-t)+gray*t; g=g*(1-t)+gray*t; b=b*(1-t)+gray*t;
                } else if (S.outsideColor==='dark') {
                    const f=1-t*0.85; r*=f; g*=f; b*=f;
                } else if (S.outsideColor==='sepia') {
                    const gray=0.299*r+0.587*g+0.114*b;
                    const sr=Math.min(255,gray*1.2), sg=gray*0.95, sb=gray*0.7;
                    r=r*(1-t)+sr*t; g=g*(1-t)+sg*t; b=b*(1-t)+sb*t;
                }
                if (S.bgOpacity > 0) {
                    const bt = t * (S.bgOpacity/100);
                    r=r*(1-bt)+bgR*bt; g=g*(1-bt)+bgG*bt; b=b*(1-bt)+bgB*bt;
                }
            }
            out[di]=Math.round(r); out[di+1]=Math.round(g); out[di+2]=Math.round(b);
        }
    }
}

function render(time) {
    if (!S.sourceImg || !S.srcImageData) return;
    const w = S.W, h = S.H;
    generateTextMask(w, h);
    const src = S.srcImageData.data;
    const outImageData = S.ctx.createImageData(w, h);
    const out = outImageData.data;
    const t = (time || 0) * S.animSpeed;
    switch (S.mode) {
        case 'displace':  applyDisplace(src,out,w,h,t); break;
        case 'focus':     applyFocus(src,out,w,h,t); break;
        case 'scatter':   applyScatter(src,out,w,h,t); break;
        case 'density':   applyDensity(src,out,w,h,t); break;
        case 'wave':      applyWave(src,out,w,h,t); break;
        case 'shatter':   applyShatter(src,out,w,h,t); break;
        case 'chromatic': applyChromatic(src,out,w,h,t); break;
        case 'liquid':    applyLiquid(src,out,w,h,t); break;
        case 'glitch':    applyGlitch(src,out,w,h,t); break;
        default:          applyDisplace(src,out,w,h,t);
    }
    applyColorEffects(out, w, h);
    S.ctx.putImageData(outImageData, 0, 0);
}

let animRAF = null, animStartTime = 0;
function startAnim() {
    if (S.anim === 'none') { stopAnim(); return; }
    S.isAnimating = true;
    animStartTime = performance.now();
    function tick(now) {
        if (!S.isAnimating) return;
        render((now - animStartTime) / 1000);
        animRAF = requestAnimationFrame(tick);
    }
    animRAF = requestAnimationFrame(tick);
}
function stopAnim() {
    S.isAnimating = false;
    if (animRAF) { cancelAnimationFrame(animRAF); animRAF = null; }
}

function fitCanvas(resetView) {
    if (!S.canvas) return;
    const area = document.getElementById('canvas-area');
    const aW = area.clientWidth, aH = area.clientHeight;
    if (aW <= 0 || aH <= 0) return;
    const baseScale = Math.min(aW / S.W, aH / S.H) * 0.92;
    if (resetView) { S.zoom = 1; S.panX = 0; S.panY = 0; }
    const s = baseScale * S.zoom;
    S.canvas.style.width = Math.floor(S.W * s) + 'px';
    S.canvas.style.height = Math.floor(S.H * s) + 'px';
    S.canvas.style.transform = 'translate(' + S.panX + 'px,' + S.panY + 'px)';
}

function updateStatus(msg, type) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = 'status-msg' + (type ? ' '+type : '');
}

function initTheme() {
    const saved = localStorage.getItem('warp-theme');
    if (saved==='light') document.documentElement.classList.add('light');
    updateThemeIcon();
}
function toggleTheme() {
    document.documentElement.classList.toggle('light');
    localStorage.setItem('warp-theme', document.documentElement.classList.contains('light')?'light':'dark');
    updateThemeIcon();
}
function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = document.documentElement.classList.contains('light') ? '\u263d' : '\u2600';
}

function bindToggleGroup(selector, callback) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            callback(btn);
        });
    });
}

function bindUI() {
    document.getElementById('imageInput').addEventListener('change', (e) => {
        if (e.target.files[0]) loadImage(e.target.files[0]);
    });
    const area = document.getElementById('canvas-area');
    area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', (e) => {
        e.preventDefault(); area.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) loadImage(file);
    });
    document.getElementById('applyBtn').addEventListener('click', () => {
        if (!S.sourceImg) { updateStatus('\uc774\ubbf8\uc9c0\ub97c \uba3c\uc800 \uc62c\ub824\uc8fc\uc138\uc694', 'error'); return; }
        updateStatus('\ucc98\ub9ac \uc911...');
        setTimeout(() => { S.lastTextKey = ''; render(0); if (S.anim !== 'none') startAnim(); updateStatus('\uc644\ub8cc!', 'success'); }, 16);
    });
    document.getElementById('resetViewBtn').addEventListener('click', () => { fitCanvas(true); if (S.sourceImg) render(0); });
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // ── Zoom / Pan ──
    area.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        S.zoom = Math.max(0.1, Math.min(10, S.zoom * delta));
        fitCanvas();
    }, { passive: false });
    area.addEventListener('mousedown', (e) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            S.isPanning = true; S.panStartX = e.clientX - S.panX; S.panStartY = e.clientY - S.panY;
            area.style.cursor = 'grabbing';
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (!S.isPanning) return;
        S.panX = e.clientX - S.panStartX; S.panY = e.clientY - S.panStartY;
        fitCanvas();
    });
    window.addEventListener('mouseup', () => {
        if (S.isPanning) { S.isPanning = false; area.style.cursor = ''; }
    });
    // Touch pinch zoom
    let lastTouchDist = 0;
    area.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        }
    }, { passive: true });
    area.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastTouchDist > 0) {
                S.zoom = Math.max(0.1, Math.min(10, S.zoom * (dist / lastTouchDist)));
                fitCanvas();
            }
            lastTouchDist = dist;
        }
    }, { passive: false });

    // ── Before/After (hold Space) ──
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            S.showOriginal = true;
            if (S.sourceImg) {
                const ctx = S.ctx;
                ctx.drawImage(S.sourceImg, 0, 0, S.W, S.H);
            }
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            S.showOriginal = false;
            if (S.sourceImg) render(0);
        }
    });

    // ── Randomize ──
    const randBtn = document.getElementById('randomizeBtn');
    if (randBtn) randBtn.addEventListener('click', randomizeParams);

    // ── Presets ──
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = PRESETS[btn.dataset.preset];
            if (!p) return;
            applyPreset(p);
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ── Clipboard copy ──
    const clipBtn = document.getElementById('clipboardBtn');
    if (clipBtn) clipBtn.addEventListener('click', copyToClipboard);

    // ── WebM export ──
    const webmBtn = document.getElementById('saveWebmBtn');
    if (webmBtn) webmBtn.addEventListener('click', exportWebM);
    document.getElementById('warpText').addEventListener('input', (e) => { S.text = e.target.value || 'A'; scheduleRender(); });
    document.getElementById('fontSelect').addEventListener('change', (e) => { S.font = e.target.value; scheduleRender(); });
    bindToggleGroup('.weight-btn', (btn) => { S.fontWeight = btn.dataset.weight; scheduleRender(); });
    const sliders = [
        ['textSize','textSize','textSizeVal'], ['textLetterSpace','letterSpace','textLetterSpaceVal'],
        ['textLineHeight','lineHeight','textLineHeightVal'], ['textX','textX','textXVal'],
        ['textY','textY','textYVal'], ['textRotation','textRotation','textRotationVal'],
        ['intensity','intensity','intensityVal'], ['edgeSoftness','edgeSoftness','edgeSoftnessVal'],
        ['detail','detail','detailVal'], ['seed','seed','seedVal'],
        ['bgOpacity','bgOpacity','bgOpacityVal'], ['animSpeed','animSpeed','animSpeedVal'],
    ];
    sliders.forEach(([id, key, valId]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            S[key] = parseFloat(el.value);
            document.getElementById(valId).textContent = el.value;
            scheduleRender();
        });
    });
    bindToggleGroup('.mode-btn', (btn) => { S.mode = btn.dataset.mode; scheduleRender(); });
    bindToggleGroup('.invert-btn', (btn) => { S.invert = btn.dataset.invert === 'true'; scheduleRender(); });
    bindToggleGroup('.inside-color-btn', (btn) => { S.insideColor = btn.dataset.color; scheduleRender(); });
    bindToggleGroup('.outside-color-btn', (btn) => { S.outsideColor = btn.dataset.color; scheduleRender(); });
    document.getElementById('bgColor').addEventListener('input', (e) => { S.bgColor = e.target.value; scheduleRender(); });
    bindToggleGroup('.anim-btn', (btn) => {
        S.anim = btn.dataset.anim;
        if (S.anim !== 'none') startAnim(); else { stopAnim(); if(S.sourceImg) render(0); }
    });
    bindToggleGroup('.scale-btn', (btn) => { S.exportScale = parseInt(btn.dataset.scale); updateExportInfo(); });
    document.getElementById('savePngBtn').addEventListener('click', () => savePNG(false));
    document.getElementById('saveTransBtn').addEventListener('click', () => savePNG(true));
    window.addEventListener('resize', fitCanvas);
}

let renderTimeout = null, renderFullTimeout = null;
function scheduleRender() {
    if (!S.sourceImg) return;
    clearTimeout(renderTimeout);
    clearTimeout(renderFullTimeout);
    // Quick preview (immediate feel)
    renderTimeout = setTimeout(() => {
        S.lastTextKey = ''; // force text mask regeneration
        render(0);
        if (S.anim !== 'none') startAnim();
    }, 30);
}

function randomizeParams() {
    const modes = ['displace','focus','scatter','density','wave','shatter','chromatic','liquid','glitch'];
    S.mode = modes[Math.floor(Math.random() * modes.length)];
    S.intensity = 20 + Math.floor(Math.random() * 80);
    S.edgeSoftness = 10 + Math.floor(Math.random() * 80);
    S.detail = 10 + Math.floor(Math.random() * 90);
    S.seed = Math.floor(Math.random() * 999);
    S.invert = Math.random() > 0.7;
    S.insideColor = 'original';
    S.outsideColor = 'original';
    S.bgOpacity = 0;
    syncUIFromState();
    scheduleRender();
    updateStatus('랜덤 적용!', 'success');
}

function applyPreset(p) {
    Object.keys(p).forEach(k => { S[k] = p[k]; });
    syncUIFromState();
    scheduleRender();
    updateStatus('프리셋 적용!', 'success');
}

function syncUIFromState() {
    // Sync sliders
    const sliderMap = {
        'intensity':'intensity', 'edgeSoftness':'edgeSoftness', 'detail':'detail',
        'seed':'seed', 'bgOpacity':'bgOpacity', 'animSpeed':'animSpeed',
        'textSize':'textSize', 'textLetterSpace':'letterSpace', 'textLineHeight':'lineHeight',
        'textX':'textX', 'textY':'textY', 'textRotation':'textRotation'
    };
    const valMap = {
        'intensity':'intensityVal', 'edgeSoftness':'edgeSoftnessVal', 'detail':'detailVal',
        'seed':'seedVal', 'bgOpacity':'bgOpacityVal', 'animSpeed':'animSpeedVal',
        'textSize':'textSizeVal', 'textLetterSpace':'textLetterSpaceVal', 'textLineHeight':'textLineHeightVal',
        'textX':'textXVal', 'textY':'textYVal', 'textRotation':'textRotationVal'
    };
    Object.keys(sliderMap).forEach(elId => {
        const el = document.getElementById(elId);
        if (el) { el.value = S[sliderMap[elId]]; }
        const valEl = document.getElementById(valMap[elId]);
        if (valEl) { valEl.textContent = S[sliderMap[elId]]; }
    });
    // Sync toggle groups
    document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === S.mode);
    });
    document.querySelectorAll('.invert-btn').forEach(b => {
        b.classList.toggle('active', (b.dataset.invert === 'true') === S.invert);
    });
    document.querySelectorAll('.inside-color-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.color === S.insideColor);
    });
    document.querySelectorAll('.outside-color-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.color === S.outsideColor);
    });
    if (S.anim) {
        document.querySelectorAll('.anim-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.anim === S.anim);
        });
    }
}

async function copyToClipboard() {
    if (!S.sourceImg) { updateStatus('이미지를 먼저 올려주세요', 'error'); return; }
    try {
        const blob = await new Promise(resolve => S.canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        updateStatus('클립보드에 복사 완료!', 'success');
    } catch (e) {
        updateStatus('클립보드 복사 실패: ' + e.message, 'error');
    }
}

function exportWebM() {
    if (!S.sourceImg) { updateStatus('이미지를 먼저 올려주세요', 'error'); return; }
    const duration = 4000; // 4 seconds
    const fps = 30;
    const stream = S.canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: 5000000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const link = document.createElement('a');
        link.download = 'warp-' + Date.now() + '.webm';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        updateStatus('WebM 저장 완료!', 'success');
    };
    // Ensure animation is running
    const prevAnim = S.anim;
    if (S.anim === 'none') S.anim = 'breathe';
    startAnim();
    recorder.start();
    updateStatus('녹화 중... ' + (duration / 1000) + '초', '');
    setTimeout(() => {
        recorder.stop();
        stopAnim();
        S.anim = prevAnim;
        if (prevAnim === 'none') render(0);
        syncUIFromState();
    }, duration);
}

function savePNG(transparent) {
    if (!S.sourceImg) { updateStatus('\uc774\ubbf8\uc9c0\ub97c \uba3c\uc800 \uc62c\ub824\uc8fc\uc138\uc694', 'error'); return; }
    const scale = S.exportScale;
    const expW = S.W * scale, expH = S.H * scale;
    const c = document.createElement('canvas');
    c.width = expW; c.height = expH;
    const ctx = c.getContext('2d');
    if (scale > 1) {
        const origW = S.W, origH = S.H;
        S.W = expW; S.H = expH;
        S.canvas.width = expW; S.canvas.height = expH;
        S.processed.width = expW; S.processed.height = expH;
        S.processed.getContext('2d').drawImage(S.sourceImg, 0, 0, expW, expH);
        S.srcImageData = S.processed.getContext('2d').getImageData(0, 0, expW, expH);
        S.lastTextKey = '';
        render(0);
        ctx.drawImage(S.canvas, 0, 0);
        S.W = origW; S.H = origH;
        S.canvas.width = origW; S.canvas.height = origH;
        S.processed.width = origW; S.processed.height = origH;
        S.processed.getContext('2d').drawImage(S.sourceImg, 0, 0, origW, origH);
        S.srcImageData = S.processed.getContext('2d').getImageData(0, 0, origW, origH);
        S.lastTextKey = '';
        render(0);
        fitCanvas();
    } else {
        ctx.drawImage(S.canvas, 0, 0);
    }
    const link = document.createElement('a');
    link.download = 'warp-' + Date.now() + '.png';
    link.href = c.toDataURL('image/png');
    link.click();
    updateStatus(expW + '\u00d7' + expH + ' PNG \uc800\uc7a5 \uc644\ub8cc!', 'success');
}

document.addEventListener('DOMContentLoaded', init);