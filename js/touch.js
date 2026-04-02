/* ═══════════════════════════════════
   Touch Gestures & Keyboard Shortcuts v3.2
   Proper canvas-local coordinate mapping
   ═══════════════════════════════════ */

let touchStartDist = 0;
let touchStartZoom = 1;
let lastTouchX = 0, lastTouchY = 0;
let isTouching = false;

// Convert page coordinates to canvas-local delta
// Accounts for canvas position on screen and CSS scaling
function canvasDelta(dx, dy, element) {
    let rect = element.getBoundingClientRect();
    let cnv = element.querySelector('canvas');
    if (!cnv) return { dx: dx / zoom, dy: dy / zoom };

    // CSS display size vs actual canvas size
    let scaleX = width / cnv.clientWidth;
    let scaleY = height / cnv.clientHeight;

    return {
        dx: (dx * scaleX) / zoom,
        dy: (dy * scaleY) / zoom
    };
}

function initTouchHandlers() {
    setupTouchForElement(document.getElementById('canvas-area'));
    setupTouchForElement(document.getElementById('fullscreen-canvas-holder'));
}

function setupTouchForElement(el) {
    if (!el) return;

    el.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDist = Math.sqrt(dx * dx + dy * dy);
            touchStartZoom = zoom;
        } else if (e.touches.length === 1) {
            isTouching = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            let dist = Math.sqrt(dx * dx + dy * dy);
            zoom = constrain(touchStartZoom * (dist / touchStartDist), 0.1, 5);
        } else if (e.touches.length === 1 && isTouching) {
            e.preventDefault();
            let tx = e.touches[0].clientX;
            let ty = e.touches[0].clientY;
            let rawDx = tx - lastTouchX;
            let rawDy = ty - lastTouchY;

            // Convert to canvas-local coordinates
            let d = canvasDelta(rawDx, rawDy, el);
            offset.x += d.dx;
            offset.y += d.dy;

            lastTouchX = tx;
            lastTouchY = ty;
        }
    }, { passive: false });

    el.addEventListener('touchend', () => { isTouching = false; });
}

// ── Keyboard Shortcuts ──

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        let tag = e.target.tagName;
        let isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

        if (e.key === 'Escape') {
            let fsView = document.getElementById('fullscreen-view');
            if (!fsView.classList.contains('hidden')) { exitFullscreen(); return; }
            let sm = document.getElementById('shortcutModal');
            if (!sm.classList.contains('hidden')) { sm.classList.add('hidden'); return; }
        }

        if (isInput) return;

        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); convertAll(); return;
        }
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); saveImage(); return;
        }
        if (e.key === 'f' || e.key === 'F') {
            let fsView = document.getElementById('fullscreen-view');
            if (fsView.classList.contains('hidden')) enterFullscreen();
            else exitFullscreen();
            return;
        }
        if (e.key === 'v' || e.key === 'V') {
            toggleLayerVisibility(activeLayerIdx); return;
        }

        let num = parseInt(e.key);
        if (num >= 1 && num <= 9 && num <= layers.length) {
            selectLayer(num - 1); return;
        }
    });
}
