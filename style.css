/* ─── Reset ─── */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
}

:root {
    --bg-0: #0a0a0a;
    --bg-1: #111113;
    --bg-2: #1a1a1e;
    --bg-3: #242429;
    --border: #2a2a30;
    --border-hover: #3a3a42;
    --text-1: #f0f0f2;
    --text-2: #a0a0a8;
    --text-3: #606068;
    --accent: #e8e8ec;
    --accent-dim: #3a3a42;
    --danger: #ff4455;
    --rec: #ff3344;
    --active: #d0d0d8;
    --radius: 8px;
    --radius-sm: 6px;
    --font-mono: 'JetBrains Mono', monospace;
    --font-sans: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
}

body, html {
    height: 100dvh;
    background: var(--bg-0);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: 13px;
    overflow: hidden;
}

#app {
    height: 100dvh;
}

/* ─── Fullscreen Preview ─── */
#fullscreen-view {
    position: fixed;
    inset: 0;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
}

#fullscreen-view.hidden {
    display: none;
}

#canvas-holder {
    line-height: 0;
}

.close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: var(--text-2);
    border-radius: 50%;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.2s;
    backdrop-filter: blur(10px);
}

.close-btn:hover {
    background: rgba(255,255,255,0.12);
    color: #fff;
}

/* ─── Controls Panel ─── */
#controls {
    height: 100dvh;
    background: var(--bg-1);
    display: flex;
    flex-direction: column;
}

.scroll-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-3) transparent;
}

.scroll-container::-webkit-scrollbar {
    width: 4px;
}
.scroll-container::-webkit-scrollbar-track {
    background: transparent;
}
.scroll-container::-webkit-scrollbar-thumb {
    background: var(--bg-3);
    border-radius: 2px;
}

/* ─── Header ─── */
.header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-bottom: 14px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--border);
}

.logo {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: -0.5px;
    color: var(--text-1);
}

.version {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-3);
    letter-spacing: 1px;
}

/* ─── Sections ─── */
.section {
    background: var(--bg-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 8px;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.section-header h2 {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text-2);
}

/* ─── Layer List ─── */
.layer-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.layer-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--bg-3);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;
}

.layer-item:hover {
    border-color: var(--border-hover);
}

.layer-item.active {
    border-color: var(--text-3);
    background: rgba(255,255,255,0.06);
}

.layer-item .layer-color {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.layer-item .layer-name {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.layer-item .layer-text-preview {
    font-size: 10px;
    color: var(--text-3);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.layer-item .layer-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
}

.layer-item:hover .layer-actions {
    opacity: 1;
}

.layer-btn {
    width: 24px;
    height: 24px;
    background: none;
    border: 1px solid var(--border);
    color: var(--text-3);
    border-radius: 4px;
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: 12px;
    transition: all 0.15s;
    padding: 0;
}

.layer-btn:hover {
    color: var(--text-1);
    border-color: var(--border-hover);
}

.layer-btn.danger:hover {
    color: var(--danger);
    border-color: var(--danger);
}

.layer-vis-btn {
    width: 24px;
    height: 24px;
    background: none;
    border: none;
    color: var(--text-2);
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: 14px;
    padding: 0;
    flex-shrink: 0;
    opacity: 0.8;
}

.layer-vis-btn.hidden-layer {
    opacity: 0.3;
}

/* ─── Icon Button ─── */
.icon-btn {
    width: 28px;
    height: 28px;
    background: var(--bg-3);
    border: 1px solid var(--border);
    color: var(--text-2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.15s;
    padding: 0;
}

.icon-btn:hover {
    color: var(--text-1);
    border-color: var(--border-hover);
}

/* ─── Form Fields ─── */
.field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    min-width: 0;
}

.field label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-3);
    font-weight: 700;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.field label .val {
    color: var(--text-2);
    font-weight: 400;
}

.row-2 {
    display: flex;
    gap: 10px;
    align-items: flex-end;
}

.row-3 {
    display: flex;
    gap: 10px;
    align-items: flex-end;
}

input[type="text"],
input[type="number"],
textarea,
select {
    background: var(--bg-0);
    border: 1px solid var(--border);
    color: var(--text-1);
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-family: var(--font-sans);
    width: 100%;
    min-width: 0;
    outline: none;
    transition: border-color 0.15s;
}

select {
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23606068' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
}

textarea {
    resize: vertical;
    min-height: 44px;
    font-family: var(--font-sans);
    line-height: 1.4;
}

input:focus,
textarea:focus,
select:focus {
    border-color: var(--text-3);
}

/* ─── Range Slider ─── */
input[type="range"] {
    width: 100%;
    height: 28px;
    background: transparent;
    outline: none;
    -webkit-appearance: none;
    padding: 0;
}

input[type="range"]::-webkit-slider-runnable-track {
    height: 3px;
    background: var(--bg-3);
    border-radius: 2px;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: var(--text-1);
    border-radius: 50%;
    cursor: pointer;
    margin-top: -5.5px;
    transition: transform 0.1s;
}

input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
}

input[type="range"]::-moz-range-track {
    height: 3px;
    background: var(--bg-3);
    border-radius: 2px;
    border: none;
}

input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: var(--text-1);
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

/* ─── Toggle Group ─── */
.toggle-group {
    display: flex;
    gap: 6px;
}

.toggle-btn {
    flex: 1;
    padding: 8px 6px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    background: var(--bg-0);
    border: 1px solid var(--border);
    color: var(--text-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
}

.toggle-btn:hover {
    border-color: var(--border-hover);
    color: var(--text-2);
}

.toggle-btn.active {
    background: var(--accent-dim);
    color: var(--active);
    border-color: var(--text-3);
}

/* ─── Color Input ─── */
input[type="color"] {
    height: 36px;
    padding: 3px;
    background: var(--bg-0);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    width: 100%;
}

input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 2px;
}

input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 3px;
}

/* ─── Action Buttons ─── */
.btn-action {
    flex: 1;
    background: var(--bg-3);
    border: 1px solid var(--border);
    color: var(--text-1);
    padding: 11px 10px;
    text-align: center;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.15s;
}

.btn-action:hover {
    background: var(--border-hover);
    border-color: var(--border-hover);
}

.btn-action.primary {
    background: var(--text-1);
    color: var(--bg-0);
    border-color: var(--text-1);
    font-weight: 800;
    font-size: 12px;
}

.btn-action.primary:hover {
    background: #fff;
}

.rec-btn {
    color: var(--rec);
    border-color: rgba(255,51,68,0.3);
}

.rec-btn:hover {
    background: rgba(255,51,68,0.1);
    border-color: rgba(255,51,68,0.5);
}

.rec-btn.recording {
    animation: rec-pulse 1s ease infinite;
    background: rgba(255,51,68,0.15);
}

@keyframes rec-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

.btn-sm {
    flex: 0 0 60px;
    background: var(--bg-3);
    border: 1px solid var(--border);
    color: var(--text-1);
    padding: 10px 8px;
    text-align: center;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
}

.btn-sm:hover {
    border-color: var(--border-hover);
}

.unit-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-3);
    padding-bottom: 12px;
    flex-shrink: 0;
}

.upload-btn {
    text-decoration: none;
}

/* ─── Status ─── */
.status-msg {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-3);
    text-align: center;
    padding: 8px 0;
    letter-spacing: 0.3px;
}

.safe-bottom {
    height: env(safe-area-inset-bottom);
    min-height: 16px;
}

input[type="file"] {
    display: none;
}

/* ─── Animations ─── */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.layer-item {
    animation: fadeIn 0.15s ease;
}
