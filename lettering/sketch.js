/* ═══════════════════════════════════════════
   Lettering Tool v4 — Point-to-Shape Editor
   Tap to place points → auto smooth outline → filled shape
   Illustrator/Glyphs-style path editing with handles
   ═══════════════════════════════════════════ */

(() => {
    // ─── State ───
    const state = {
        canvasW: 1080, canvasH: 1080,
        bgColor: '#0c0c0e',
        fillColor: '#e8e8ec',
        fillOpacity: 1.0,
        showFill: true,
        showStroke: true,
        tool: 'pen', // 'pen' | 'select'
        // Paths: array of { anchors: [{x,y,hix,hiy,hox,hoy}], closed, color, opacity }
        paths: [],
        activePath: -1,    // index of path being drawn/edited
        redoStack: [],
        zoom: 1, panX: 0, panY: 0,
        showGrid: false, gridSize: 50, snapGrid: false,
        refImage: null, refOpacity: 0.3,
        // Drag state
        dragTarget: null, // { pathIdx, anchorIdx, type:'anchor'|'handleIn'|'handleOut' }
        isDragging: false,
        // For pen tool: did user drag on place? → set handles
        penDragStart: null,
        penDragAnchorIdx: -1,
    };

    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    const canvasArea = document.getElementById('canvas-area');
    let activePointers = new Map();
    let pinchStartDist = 0, pinchStartZoom = 1;

    // Hit test radius (screen px), scaled for mobile
    const HIT_R = 18;

    // ══════════════════════
    // INIT
    // ══════════════════════
    function init() {
        fitView();
        bindPointerEvents();
        bindUI();
        bindKeyboard();
        newPath();
        render();
    }

    function fitView() {
        const aw = canvasArea.clientWidth - 20, ah = canvasArea.clientHeight - 20;
        state.zoom = Math.min(aw / state.canvasW, ah / state.canvasH, 1);
        state.panX = (canvasArea.clientWidth - state.canvasW * state.zoom) / 2;
        state.panY = (canvasArea.clientHeight - state.canvasH * state.zoom) / 2;
        applyTransform(); updateInfo();
    }

    function applyTransform() {
        canvas.width = state.canvasW;
        canvas.height = state.canvasH;
        canvas.style.width = (state.canvasW * state.zoom) + 'px';
        canvas.style.height = (state.canvasH * state.zoom) + 'px';
        canvas.style.left = state.panX + 'px';
        canvas.style.top = state.panY + 'px';
    }

    function canvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        let x = (e.clientX - rect.left) / state.zoom;
        let y = (e.clientY - rect.top) / state.zoom;
        if (state.snapGrid) {
            x = Math.round(x / state.gridSize) * state.gridSize;
            y = Math.round(y / state.gridSize) * state.gridSize;
        }
        return { x, y };
    }

    // ══════════════════════
    // PATH MANAGEMENT
    // ══════════════════════
    function newPath() {
        state.paths.push({
            anchors: [],
            closed: false,
            color: state.fillColor,
            opacity: state.fillOpacity,
        });
        state.activePath = state.paths.length - 1;
        renderPathList();
        updateInfo();
    }

    function getActivePath() {
        return state.paths[state.activePath] || null;
    }

    function closePath() {
        const p = getActivePath();
        if (!p || p.anchors.length < 3) return;
        p.closed = true;
        // Auto-smooth all anchors
        autoSmoothAnchors(p);
        saveState();
        render();
        renderPathList();
    }

    // ══════════════════════
    // AUTO-SMOOTH: make the outline curve smoothly through all points
    // ══════════════════════
    function autoSmoothAnchors(path) {
        const a = path.anchors;
        const n = a.length;
        if (n < 2) return;

        for (let i = 0; i < n; i++) {
            const prev = a[(i - 1 + n) % n];
            const curr = a[i];
            const next = a[(i + 1) % n];

            if (!path.closed && i === 0) {
                // First point of open path: handle out toward next
                const dx = next.x - curr.x, dy = next.y - curr.y;
                const len = Math.hypot(dx, dy) || 1;
                curr.hox = dx * 0.3; curr.hoy = dy * 0.3;
                curr.hix = 0; curr.hiy = 0;
            } else if (!path.closed && i === n - 1) {
                // Last point of open path: handle in from prev
                const dx = prev.x - curr.x, dy = prev.y - curr.y;
                const len = Math.hypot(dx, dy) || 1;
                curr.hix = dx * 0.3; curr.hiy = dy * 0.3;
                curr.hox = 0; curr.hoy = 0;
            } else {
                // Middle points (or any point in closed path):
                // Smooth handle = direction from prev to next, length proportional to distance
                const dx = next.x - prev.x, dy = next.y - prev.y;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;
                const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);
                curr.hix = -ux * dPrev * 0.3;
                curr.hiy = -uy * dPrev * 0.3;
                curr.hox = ux * dNext * 0.3;
                curr.hoy = uy * dNext * 0.3;
            }
        }
    }

    // ══════════════════════
    // POINTER EVENTS
    // ══════════════════════
    function bindPointerEvents() {
        canvasArea.addEventListener('pointerdown', onDown, { passive: false });
        canvasArea.addEventListener('pointermove', onMove, { passive: false });
        canvasArea.addEventListener('pointerup', onUp);
        canvasArea.addEventListener('pointercancel', onUp);
        canvasArea.addEventListener('wheel', onWheel, { passive: false });
    }

    function onDown(e) {
        e.preventDefault();
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Two-finger → pinch
        if (activePointers.size === 2) {
            const pts = [...activePointers.values()];
            pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            pinchStartZoom = state.zoom;
            return;
        }
        if (activePointers.size > 2) return;

        const pt = canvasCoords(e);

        if (state.tool === 'select') {
            // Try to hit-test anchors/handles
            const hit = hitTestAll(pt);
            if (hit) {
                state.dragTarget = hit;
                state.isDragging = true;
                state.activePath = hit.pathIdx;
                canvasArea.setPointerCapture(e.pointerId);
                renderPathList();
                render();
                return;
            }
            // Try to select a path by clicking on its fill
            const pathIdx = hitTestPath(pt);
            if (pathIdx >= 0) {
                state.activePath = pathIdx;
                renderPathList();
                render();
            }
            return;
        }

        if (state.tool === 'pen') {
            canvasArea.setPointerCapture(e.pointerId);
            const path = getActivePath();
            if (!path) return;

            // Check if clicking on first anchor → close path
            if (path.anchors.length >= 3) {
                const first = path.anchors[0];
                const r = HIT_R / state.zoom;
                if (Math.hypot(pt.x - first.x, pt.y - first.y) < r) {
                    closePath();
                    newPath();
                    return;
                }
            }

            // If path is closed, start new path
            if (path.closed) {
                newPath();
            }

            // Place anchor
            const anchor = { x: pt.x, y: pt.y, hix: 0, hiy: 0, hox: 0, hoy: 0 };
            getActivePath().anchors.push(anchor);
            state.penDragStart = pt;
            state.penDragAnchorIdx = getActivePath().anchors.length - 1;

            // Auto-smooth previous anchors
            autoSmoothAnchors(getActivePath());

            render();
            updateInfo();
        }
    }

    function onMove(e) {
        e.preventDefault();
        const prev = activePointers.get(e.pointerId);
        if (!prev) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Pinch
        if (activePointers.size === 2) {
            const pts = [...activePointers.values()];
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const newZoom = Math.max(0.1, Math.min(10, pinchStartZoom * (dist / pinchStartDist)));
            const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
            state.panX += dx / 2; state.panY += dy / 2;
            const ar = canvasArea.getBoundingClientRect();
            const midX = (pts[0].x + pts[1].x) / 2 - ar.left;
            const midY = (pts[0].y + pts[1].y) / 2 - ar.top;
            const cxB = (midX - state.panX) / state.zoom;
            const cyB = (midY - state.panY) / state.zoom;
            state.zoom = newZoom;
            state.panX = midX - cxB * state.zoom;
            state.panY = midY - cyB * state.zoom;
            applyTransform(); render(); updateInfo();
            return;
        }

        const pt = canvasCoords(e);

        // Pen tool drag → set handles
        if (state.tool === 'pen' && state.penDragStart) {
            const path = getActivePath();
            if (!path) return;
            const a = path.anchors[state.penDragAnchorIdx];
            if (!a) return;
            const dx = pt.x - a.x, dy = pt.y - a.y;
            if (Math.hypot(dx, dy) > 3) {
                a.hox = dx; a.hoy = dy;
                a.hix = -dx; a.hiy = -dy;
                render();
            }
            return;
        }

        // Select tool drag
        if (state.tool === 'select' && state.isDragging && state.dragTarget) {
            const path = state.paths[state.dragTarget.pathIdx];
            if (!path) return;
            const a = path.anchors[state.dragTarget.anchorIdx];
            if (!a) return;
            if (state.dragTarget.type === 'anchor') {
                a.x = pt.x; a.y = pt.y;
            } else if (state.dragTarget.type === 'handleOut') {
                a.hox = pt.x - a.x; a.hoy = pt.y - a.y;
            } else if (state.dragTarget.type === 'handleIn') {
                a.hix = pt.x - a.x; a.hiy = pt.y - a.y;
            }
            render();
        }
    }

    function onUp(e) {
        activePointers.delete(e.pointerId);
        if (state.tool === 'pen' && state.penDragStart) {
            state.penDragStart = null;
            state.penDragAnchorIdx = -1;
            saveState();
        }
        if (state.tool === 'select' && state.isDragging) {
            state.isDragging = false;
            state.dragTarget = null;
            saveState();
        }
    }

    function onWheel(e) {
        e.preventDefault();
        const ar = canvasArea.getBoundingClientRect();
        const mx = e.clientX - ar.left, my = e.clientY - ar.top;
        const cxB = (mx - state.panX) / state.zoom;
        const cyB = (my - state.panY) / state.zoom;
        state.zoom = Math.max(0.1, Math.min(10, state.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        state.panX = mx - cxB * state.zoom;
        state.panY = my - cyB * state.zoom;
        applyTransform(); render(); updateInfo();
    }


    // ══════════════════════
    // HIT TESTING
    // ══════════════════════
    function hitTestAll(pt) {
        const r = HIT_R / state.zoom;
        // Test active path first, then others
        const order = [state.activePath, ...state.paths.map((_,i)=>i).filter(i=>i!==state.activePath)];
        for (const pi of order) {
            const path = state.paths[pi];
            if (!path) continue;
            for (let ai = 0; ai < path.anchors.length; ai++) {
                const a = path.anchors[ai];
                if (Math.hypot(pt.x-(a.x+a.hox), pt.y-(a.y+a.hoy)) < r)
                    return { pathIdx:pi, anchorIdx:ai, type:'handleOut' };
                if (Math.hypot(pt.x-(a.x+a.hix), pt.y-(a.y+a.hiy)) < r)
                    return { pathIdx:pi, anchorIdx:ai, type:'handleIn' };
                if (Math.hypot(pt.x-a.x, pt.y-a.y) < r)
                    return { pathIdx:pi, anchorIdx:ai, type:'anchor' };
            }
        }
        return null;
    }

    function hitTestPath(pt) {
        // Simple: check if point is near any segment of any path
        for (let i = state.paths.length-1; i >= 0; i--) {
            const p = state.paths[i];
            if (p.anchors.length < 2) continue;
            const pts = bezierPoints(p);
            for (const bp of pts) {
                if (Math.hypot(pt.x-bp.x, pt.y-bp.y) < 15/state.zoom) return i;
            }
        }
        return -1;
    }

    // ══════════════════════
    // UNDO / REDO
    // ══════════════════════
    let history = [];
    function saveState() {
        history.push(JSON.stringify(state.paths));
        if (history.length > 50) history.shift();
        state.redoStack = [];
    }
    function undo() {
        if (history.length === 0) return;
        state.redoStack.push(JSON.stringify(state.paths));
        state.paths = JSON.parse(history.pop());
        state.activePath = Math.min(state.activePath, state.paths.length-1);
        render(); renderPathList(); updateInfo();
    }
    function redo() {
        if (state.redoStack.length === 0) return;
        history.push(JSON.stringify(state.paths));
        state.paths = JSON.parse(state.redoStack.pop());
        state.activePath = Math.min(state.activePath, state.paths.length-1);
        render(); renderPathList(); updateInfo();
    }

    // ══════════════════════
    // BEZIER EVALUATION — path → dense points for rendering
    // ══════════════════════
    function bezierPoints(path) {
        const a = path.anchors;
        if (a.length < 2) return a.map(p => ({ x:p.x, y:p.y }));
        const pts = [];
        const count = path.closed ? a.length : a.length - 1;
        for (let i = 0; i < count; i++) {
            const a0 = a[i], a1 = a[(i+1) % a.length];
            const cp1x = a0.x + a0.hox, cp1y = a0.y + a0.hoy;
            const cp2x = a1.x + a1.hix, cp2y = a1.y + a1.hiy;
            const segLen = Math.hypot(a1.x-a0.x, a1.y-a0.y);
            const steps = Math.max(12, Math.round(segLen / 4));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps, it = 1-t;
                pts.push({
                    x: it*it*it*a0.x + 3*it*it*t*cp1x + 3*it*t*t*cp2x + t*t*t*a1.x,
                    y: it*it*it*a0.y + 3*it*it*t*cp1y + 3*it*t*t*cp2y + t*t*t*a1.y,
                });
            }
        }
        return pts;
    }

    // ══════════════════════
    // BASIC SHAPES — rectangle, ellipse
    // ══════════════════════
    function addRect(cx, cy, w, h) {
        const hw = w/2, hh = h/2;
        const path = {
            anchors: [
                { x:cx-hw, y:cy-hh, hix:0,hiy:0, hox:0,hoy:0 },
                { x:cx+hw, y:cy-hh, hix:0,hiy:0, hox:0,hoy:0 },
                { x:cx+hw, y:cy+hh, hix:0,hiy:0, hox:0,hoy:0 },
                { x:cx-hw, y:cy+hh, hix:0,hiy:0, hox:0,hoy:0 },
            ],
            closed: true,
            color: state.fillColor,
            opacity: state.fillOpacity,
        };
        saveState();
        state.paths.push(path);
        state.activePath = state.paths.length - 1;
        render(); renderPathList(); updateInfo();
    }

    function addEllipse(cx, cy, rx, ry) {
        // Approximate circle with 4 cubic beziers (kappa = 0.5522847498)
        const k = 0.5522847498;
        const path = {
            anchors: [
                { x:cx, y:cy-ry, hix:-rx*k,hiy:0, hox:rx*k,hoy:0 },
                { x:cx+rx, y:cy, hix:0,hiy:-ry*k, hox:0,hoy:ry*k },
                { x:cx, y:cy+ry, hix:rx*k,hiy:0, hox:-rx*k,hoy:0 },
                { x:cx-rx, y:cy, hix:0,hiy:ry*k, hox:0,hoy:-ry*k },
            ],
            closed: true,
            color: state.fillColor,
            opacity: state.fillOpacity,
        };
        saveState();
        state.paths.push(path);
        state.activePath = state.paths.length - 1;
        render(); renderPathList(); updateInfo();
    }

    // ══════════════════════
    // PATHFINDER — union & subtract (simplified polygon boolean)
    // Uses even-odd fill to combine/subtract closed paths
    // ══════════════════════
    function pathUnion() {
        // Merge all selected (active) + another path into compound path
        // Simple approach: just combine as compound (multi-contour) path in SVG
        // For a proper boolean we'd need a clipper library, but for lettering
        // compound paths with even-odd fill rule works for most cases
        if (state.paths.length < 2) return;
        // Combine all closed paths into one compound
        const compound = {
            anchors: [],
            contours: [], // array of anchor arrays
            closed: true,
            color: state.fillColor,
            opacity: state.fillOpacity,
            compound: true,
        };
        const closedPaths = state.paths.filter(p => p.closed);
        if (closedPaths.length < 2) return;
        compound.contours = closedPaths.map(p => JSON.parse(JSON.stringify(p.anchors)));
        compound.anchors = compound.contours[0]; // primary for editing
        saveState();
        // Remove closed paths, add compound
        state.paths = state.paths.filter(p => !p.closed);
        state.paths.push(compound);
        state.activePath = state.paths.length - 1;
        render(); renderPathList(); updateInfo();
    }

    // ══════════════════════
    // RENDER
    // ══════════════════════
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = state.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Reference image
        if (state.refImage) {
            ctx.save(); ctx.globalAlpha = state.refOpacity;
            ctx.drawImage(state.refImage, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // Grid
        if (state.showGrid) drawGrid(ctx);

        // Draw all paths
        for (let i = 0; i < state.paths.length; i++) {
            drawPath(ctx, state.paths[i], i === state.activePath);
        }

        // Draw handles for active path (in select or pen mode)
        if (state.activePath >= 0 && state.paths[state.activePath]) {
            drawAnchorsAndHandles(ctx, state.paths[state.activePath]);
        }
    }

    function drawPath(c, path, isActive) {
        if (path.compound && path.contours) {
            drawCompoundPath(c, path, isActive);
            return;
        }
        const a = path.anchors;
        if (a.length === 0) return;

        // Build bezier path
        c.save();
        c.beginPath();
        if (a.length === 1) {
            // Single point → draw dot
            c.arc(a[0].x, a[0].y, 4, 0, Math.PI*2);
            c.fillStyle = path.color;
            c.globalAlpha = path.opacity;
            c.fill();
            c.restore();
            return;
        }

        c.moveTo(a[0].x, a[0].y);
        const count = path.closed ? a.length : a.length - 1;
        for (let i = 0; i < count; i++) {
            const a0 = a[i], a1 = a[(i+1) % a.length];
            c.bezierCurveTo(
                a0.x + a0.hox, a0.y + a0.hoy,
                a1.x + a1.hix, a1.y + a1.hiy,
                a1.x, a1.y
            );
        }
        if (path.closed) c.closePath();

        c.globalAlpha = path.opacity;
        if (state.showFill && path.closed) {
            c.fillStyle = path.color;
            c.fill('evenodd');
        }
        if (state.showStroke || !path.closed) {
            c.strokeStyle = path.color;
            c.lineWidth = 2;
            c.globalAlpha = isActive ? 1 : 0.5;
            c.stroke();
        }
        c.restore();
    }

    function drawCompoundPath(c, path, isActive) {
        c.save();
        c.beginPath();
        for (const contour of path.contours) {
            if (contour.length < 2) continue;
            c.moveTo(contour[0].x, contour[0].y);
            for (let i = 0; i < contour.length; i++) {
                const a0 = contour[i], a1 = contour[(i+1) % contour.length];
                c.bezierCurveTo(
                    a0.x+a0.hox, a0.y+a0.hoy,
                    a1.x+a1.hix, a1.y+a1.hiy,
                    a1.x, a1.y
                );
            }
            c.closePath();
        }
        c.globalAlpha = path.opacity;
        if (state.showFill) { c.fillStyle = path.color; c.fill('evenodd'); }
        if (state.showStroke) { c.strokeStyle = path.color; c.lineWidth = 2; c.stroke(); }
        c.restore();
    }

    function drawAnchorsAndHandles(c, path) {
        const a = path.anchors;
        c.save();
        for (let i = 0; i < a.length; i++) {
            const p = a[i];
            const hix = p.x+p.hix, hiy = p.y+p.hiy;
            const hox = p.x+p.hox, hoy = p.y+p.hoy;

            // Handle lines
            c.strokeStyle = 'rgba(108,138,255,0.7)';
            c.lineWidth = 1.5;
            c.setLineDash([]);
            c.beginPath();
            c.moveTo(hix, hiy); c.lineTo(p.x, p.y); c.lineTo(hox, hoy);
            c.stroke();

            // Handle dots (circles)
            c.fillStyle = '#6c8aff';
            [{ x:hix, y:hiy }, { x:hox, y:hoy }].forEach(h => {
                c.beginPath();
                c.arc(h.x, h.y, 5, 0, Math.PI*2);
                c.fill();
            });

            // Anchor (square, bigger for mobile)
            const sz = 7;
            c.fillStyle = '#fff';
            c.strokeStyle = '#6c8aff';
            c.lineWidth = 2;
            c.fillRect(p.x-sz, p.y-sz, sz*2, sz*2);
            c.strokeRect(p.x-sz, p.y-sz, sz*2, sz*2);

            // First anchor marker (for close-path hint)
            if (i === 0 && !path.closed && a.length >= 3) {
                c.strokeStyle = 'rgba(68,204,136,0.8)';
                c.lineWidth = 2;
                c.beginPath();
                c.arc(p.x, p.y, 12, 0, Math.PI*2);
                c.stroke();
            }
        }
        c.restore();
    }

    function drawGrid(c) {
        const g = state.gridSize;
        c.save();
        c.strokeStyle = 'rgba(108,138,255,0.12)';
        c.lineWidth = 1;
        for (let x = g; x < state.canvasW; x += g) {
            c.beginPath(); c.moveTo(x,0); c.lineTo(x,state.canvasH); c.stroke();
        }
        for (let y = g; y < state.canvasH; y += g) {
            c.beginPath(); c.moveTo(0,y); c.lineTo(state.canvasW,y); c.stroke();
        }
        // Center lines stronger
        c.strokeStyle = 'rgba(108,138,255,0.25)';
        c.beginPath(); c.moveTo(state.canvasW/2,0); c.lineTo(state.canvasW/2,state.canvasH); c.stroke();
        c.beginPath(); c.moveTo(0,state.canvasH/2); c.lineTo(state.canvasW,state.canvasH/2); c.stroke();
        c.restore();
    }


    // ══════════════════════
    // EXPORT — SVG
    // ══════════════════════
    function exportSVG() {
        const svgPaths = [];
        for (const path of state.paths) {
            if (path.compound && path.contours) {
                let d = '';
                for (const contour of path.contours) {
                    d += contourToSVGPath(contour, true) + ' ';
                }
                svgPaths.push(`  <path d="${d.trim()}" fill="${path.color}" fill-rule="evenodd" opacity="${path.opacity}"/>`);
                continue;
            }
            const a = path.anchors;
            if (a.length < 2) continue;
            const d = contourToSVGPath(a, path.closed);
            const fill = path.closed ? path.color : 'none';
            const stroke = path.closed ? 'none' : path.color;
            const sw = path.closed ? '' : ' stroke-width="2"';
            svgPaths.push(`  <path d="${d}" fill="${fill}" stroke="${stroke}"${sw} opacity="${path.opacity}"/>`);
        }
        const svg = [
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${state.canvasW} ${state.canvasH}" width="${state.canvasW}" height="${state.canvasH}">`,
            ...svgPaths,
            `</svg>`
        ].join('\n');
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const a = document.createElement('a');
        a.download = `lettering_${Date.now()}.svg`;
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function contourToSVGPath(anchors, closed) {
        if (anchors.length < 2) return '';
        const r = n => Math.round(n * 100) / 100;
        let d = `M ${r(anchors[0].x)} ${r(anchors[0].y)}`;
        const count = closed ? anchors.length : anchors.length - 1;
        for (let i = 0; i < count; i++) {
            const a0 = anchors[i], a1 = anchors[(i+1) % anchors.length];
            d += ` C ${r(a0.x+a0.hox)} ${r(a0.y+a0.hoy)}, ${r(a1.x+a1.hix)} ${r(a1.y+a1.hiy)}, ${r(a1.x)} ${r(a1.y)}`;
        }
        if (closed) d += ' Z';
        return d;
    }

    // ══════════════════════
    // EXPORT — PNG
    // ══════════════════════
    function exportPNG() {
        const ec = document.createElement('canvas');
        ec.width = state.canvasW; ec.height = state.canvasH;
        const ex = ec.getContext('2d');
        ex.fillStyle = state.bgColor;
        ex.fillRect(0,0,state.canvasW,state.canvasH);
        const origShowStroke = state.showStroke;
        state.showStroke = false;
        for (const p of state.paths) drawPath(ex, p, false);
        state.showStroke = origShowStroke;
        const a = document.createElement('a');
        a.download = `lettering_${Date.now()}.png`;
        a.href = ec.toDataURL('image/png'); a.click();
    }

    function showFullscreen() {
        const v = document.getElementById('fullscreen-view');
        const fc = document.getElementById('fullscreenCanvas');
        v.classList.remove('hidden');
        fc.width = state.canvasW; fc.height = state.canvasH;
        const fctx = fc.getContext('2d');
        fctx.fillStyle = state.bgColor;
        fctx.fillRect(0,0,state.canvasW,state.canvasH);
        for (const p of state.paths) drawPath(fctx, p, false);
    }

    // ══════════════════════
    // PATH LIST UI
    // ══════════════════════
    function renderPathList() {
        const el = document.getElementById('pathList');
        el.innerHTML = '';
        state.paths.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'path-item' + (i === state.activePath ? ' active' : '');
            const label = p.closed ? `Path ${i+1} (closed, ${p.anchors.length} pts)` :
                          p.compound ? `Compound (${p.contours.length} contours)` :
                          `Path ${i+1} (${p.anchors.length} pts)`;
            item.innerHTML = `
                <span class="path-color" style="background:${p.color}"></span>
                <span class="path-name">${label}</span>
                <button class="path-del-btn" data-idx="${i}">×</button>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('path-del-btn')) {
                    saveState();
                    state.paths.splice(i, 1);
                    if (state.activePath >= state.paths.length) state.activePath = state.paths.length - 1;
                    if (state.paths.length === 0) newPath();
                    render(); renderPathList(); updateInfo();
                    return;
                }
                state.activePath = i;
                renderPathList();
                render();
            });
            el.appendChild(item);
        });
    }

    // ══════════════════════
    // UI BINDING
    // ══════════════════════
    function bindUI() {
        const $ = id => document.getElementById(id);

        $('fillColor').addEventListener('input', e => {
            state.fillColor = e.target.value;
            const p = getActivePath();
            if (p) { p.color = e.target.value; render(); }
        });
        $('fillOpacity').addEventListener('input', e => {
            state.fillOpacity = +e.target.value / 100;
            $('fillOpacityVal').textContent = state.fillOpacity.toFixed(1);
            const p = getActivePath();
            if (p) { p.opacity = state.fillOpacity; render(); }
        });
        $('showFill').addEventListener('change', e => { state.showFill = e.target.checked; render(); });
        $('showStroke').addEventListener('change', e => { state.showStroke = e.target.checked; render(); });

        $('undoBtn').addEventListener('click', undo);
        $('redoBtn').addEventListener('click', redo);
        $('clearBtn').addEventListener('click', () => {
            saveState(); state.paths = []; state.activePath = -1;
            newPath(); render(); renderPathList(); updateInfo();
        });
        $('exportSvgBtn').addEventListener('click', exportSVG);
        $('exportPngBtn').addEventListener('click', exportPNG);
        $('fullscreenBtn').addEventListener('click', showFullscreen);
        $('closeFullscreen').addEventListener('click', () => $('fullscreen-view').classList.add('hidden'));
        $('closePathBtn').addEventListener('click', () => { closePath(); newPath(); });
        $('fitBtn').addEventListener('click', fitView);
        $('newPathBtn').addEventListener('click', () => { newPath(); render(); });

        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
            b.addEventListener('click', () => {
                state.tool = b.dataset.tool;
                document.querySelectorAll('.tool-btn[data-tool]').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                canvasArea.classList.toggle('select-mode', state.tool === 'select');
            });
        });

        // Canvas settings
        $('bgColor').addEventListener('input', e => { state.bgColor = e.target.value; render(); });
        $('resizeBtn').addEventListener('click', () => {
            state.canvasW = Math.max(100, Math.min(4096, +$('canvasW').value));
            state.canvasH = Math.max(100, Math.min(4096, +$('canvasH').value));
            fitView(); render();
        });
        document.querySelectorAll('.size-preset-btn').forEach(b => {
            b.addEventListener('click', () => {
                $('canvasW').value = b.dataset.w; $('canvasH').value = b.dataset.h;
                state.canvasW = +b.dataset.w; state.canvasH = +b.dataset.h;
                fitView(); render();
            });
        });

        // Grid
        $('showGrid').addEventListener('change', e => { state.showGrid = e.target.checked; render(); });
        $('gridSize').addEventListener('input', e => { state.gridSize = +e.target.value; $('gridSizeVal').textContent = state.gridSize; render(); });
        $('snapGrid').addEventListener('change', e => { state.snapGrid = e.target.checked; });

        // Reference image
        $('refImageInput').addEventListener('change', e => {
            const f = e.target.files[0]; if (!f) return;
            const img = new Image();
            img.onload = () => { state.refImage = img; render(); };
            img.src = URL.createObjectURL(f);
        });
        $('refOpacity').addEventListener('input', e => {
            state.refOpacity = +e.target.value / 100;
            $('refOpacityVal').textContent = state.refOpacity.toFixed(2); render();
        });
        $('removeRefBtn').addEventListener('click', () => { state.refImage = null; render(); });

        window.addEventListener('resize', () => fitView());
    }

    function updateInfo() {
        document.getElementById('canvasInfoText').textContent = `${state.canvasW} \u00d7 ${state.canvasH}`;
        document.getElementById('zoomLevel').textContent = `${Math.round(state.zoom * 100)}%`;
        document.getElementById('pathCount').textContent = `paths: ${state.paths.length}`;
    }

    // ══════════════════════
    // KEYBOARD SHORTCUTS
    // ══════════════════════
    function bindKeyboard() {
        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
            if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); }
            if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); exportSVG(); }
            if (e.key === 'p' || e.key === 'P') {
                document.querySelector('.tool-btn[data-tool="pen"]').click();
            }
            if (e.key === 'v' || e.key === 'V') {
                document.querySelector('.tool-btn[data-tool="select"]').click();
            }
            if (e.key === 'Enter') { closePath(); newPath(); }
            if (e.key === 'n' || e.key === 'N') { newPath(); render(); }
            if (e.key === '0' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); fitView(); }
            if (e.key === 'Escape') {
                document.getElementById('fullscreen-view').classList.add('hidden');
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Delete selected anchor or path
                if (state.tool === 'select' && state.activePath >= 0) {
                    const p = getActivePath();
                    if (p && p.anchors.length > 0) {
                        saveState();
                        p.anchors.pop();
                        if (p.anchors.length === 0) {
                            state.paths.splice(state.activePath, 1);
                            if (state.paths.length === 0) newPath();
                            else state.activePath = Math.min(state.activePath, state.paths.length-1);
                        }
                        render(); renderPathList(); updateInfo();
                    }
                }
            }
            // Basic shapes
            if (e.key === 'r' || e.key === 'R') {
                addRect(state.canvasW/2, state.canvasH/2, 200, 200);
            }
            if (e.key === 'o' || e.key === 'O') {
                addEllipse(state.canvasW/2, state.canvasH/2, 100, 100);
            }
        });
    }

    // ── Expose shape functions for buttons if needed ──
    window._letteringAddRect = () => addRect(state.canvasW/2, state.canvasH/2, 200, 200);
    window._letteringAddEllipse = () => addEllipse(state.canvasW/2, state.canvasH/2, 100, 100);
    window._letteringUnion = pathUnion;

    init();
})();
