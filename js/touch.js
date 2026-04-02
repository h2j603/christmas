/* ═══════════════════════════════════
   Touch Gestures & Keyboard Shortcuts
   ═══════════════════════════════════ */

// ── Touch: Pinch-to-Zoom & Drag ──
let touchStartDist = 0;
let touchStartZoom = 1;
let lastTouchX = 0, lastTouchY = 0;
let isTouching = false;

function initTouchHandlers() {
    let area = document.getElementById('canvas-area');

    area.addEventListener('touchstart', (e) => {
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

    area.addEventListener('touchmove', (e) => {
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
            offset.x += (tx - lastTouchX) / zoom;
            offset.y += (ty - lastTouchY) / zoom;
            lastTouchX = tx;
            lastTouchY = ty;
        }
    }, { passive: false });

    area.addEventListener('touchend', () => { isTouching = false; });

    // Also handle touch in fullscreen
    let fsHolder = document.getElementById('fullscreen-canvas-holder');
    fsHolder.addEventListener('touchstart', (e) => {
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

    fsHolder.addEventListener('touchmove', (e) => {
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
            offset.x += (tx - lastTouchX) / zoom;
            offset.y += (ty - lastTouchY) / zoom;
            lastTouchX = tx;
            lastTouchY = ty;
        }
    }, { passive: false });

    fsHolder.addEventListener('touchend', () => { isTouching = false; });
}

// ── Keyboard Shortcuts ──

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger when typing in inputs
        let tag = e.target.tagName;
        let isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

        if (e.key === 'Escape') {
            // Close any modal
            let fsView = document.getElementById('fullscreen-view');
            if (!fsView.classList.contains('hidden')) { exitFullscreen(); return; }
            let sm = document.getElementById('shortcutModal');
            if (!sm.classList.contains('hidden')) { sm.classList.add('hidden'); return; }
        }

        if (isInput) return;

        // Ctrl+Enter → Convert
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            convertAll();
            return;
        }

        // Ctrl+S → Save
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveImage();
            return;
        }

        // F → Fullscreen
        if (e.key === 'f' || e.key === 'F') {
            let fsView = document.getElementById('fullscreen-view');
            if (fsView.classList.contains('hidden')) enterFullscreen();
            else exitFullscreen();
            return;
        }

        // V → Toggle visibility
        if (e.key === 'v' || e.key === 'V') {
            toggleLayerVisibility(activeLayerIdx);
            return;
        }

        // 1-9 → Select layer
        let num = parseInt(e.key);
        if (num >= 1 && num <= 9 && num <= layers.length) {
            selectLayer(num - 1);
            return;
        }
    });
}
