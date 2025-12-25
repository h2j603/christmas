let myFont;
let img;
let tiles1 = [];  // 시작 텍스트 포인트
let tiles2 = [];  // 끝 텍스트 포인트
let currentTiles = [];  // 현재 표시되는 포인트
let zoom = 1.0;
let offset;
let isFontLoaded = false;

// 효과 토글
let showWeb = false;
let showRotate = false;
let showPulse = false;
let showMorph = false;

// 모핑 관련
let morphProgress = 0;  // 0 ~ 1 사이값
let morphDirection = 1; // 1: 앞으로, -1: 뒤로
let morphDuration = 2;  // 초 단위

// 저장된 설정값
let currentFontSize = 50;
let currentTileSize = 5;
let currentScaleX = 100;
let currentLetterSpace = 0;
let currentLineHeight = 120;

// 텍스트 중심점
let textCenterX = 0;
let textCenterY = 0;

// 비디오 녹화
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];

function setup() {
    const w = parseInt(select('#canvasW').value());
    const h = parseInt(select('#canvasH').value());
    let canvas = createCanvas(w, h);
    canvas.parent('canvas-holder');
    
    offset = createVector(0, 0);
    textCenterX = w / 2;
    textCenterY = h / 2;
    
    // 폰트 로드
    const fontURL = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf';
    myFont = loadFont(fontURL, 
        () => { 
            isFontLoaded = true; 
            updateStatus("준비 완료");
        },
        () => { 
            updateStatus("폰트 로드 실패");
        }
    );
    
    // 버튼 이벤트
    select('#convertBtn').mousePressed(generateDisplay);
    select('#resizeBtn').mousePressed(updateCanvas);
    select('#saveBtn').mousePressed(saveImage);
    select('#saveVideoBtn').mousePressed(startRecording);
    select('#previewBtn').mousePressed(showPreview);
    select('#closeFullscreen').mousePressed(hidePreview);
    select('#imageInput').changed(handleImage);
    
    // 슬라이더 값 표시
    select('#fontSize').input(() => {
        select('#fontSizeVal').html(select('#fontSize').value());
    });
    select('#tileSize').input(() => {
        select('#tileSizeVal').html(select('#tileSize').value());
    });
    select('#scaleX').input(() => {
        select('#scaleXVal').html(select('#scaleX').value());
    });
    select('#letterSpace').input(() => {
        select('#letterSpaceVal').html(select('#letterSpace').value());
    });
    select('#lineHeight').input(() => {
        select('#lineHeightVal').html(select('#lineHeight').value());
    });
    select('#morphDuration').input(() => {
        select('#morphDurationVal').html(select('#morphDuration').value());
        morphDuration = parseFloat(select('#morphDuration').value());
    });
    
    // 토글 버튼
    select('#toggleLine').mousePressed(() => {
        showWeb = !showWeb;
        toggleClass('#toggleLine', showWeb);
    });
    
    select('#toggleRotate').mousePressed(() => {
        showRotate = !showRotate;
        toggleClass('#toggleRotate', showRotate);
    });
    
    select('#togglePulse').mousePressed(() => {
        showPulse = !showPulse;
        toggleClass('#togglePulse', showPulse);
    });
    
    select('#toggleMorph').mousePressed(() => {
        showMorph = !showMorph;
        toggleClass('#toggleMorph', showMorph);
        if (showMorph) {
            morphProgress = 0;
            morphDirection = 1;
        }
    });
}

function toggleClass(selector, isActive) {
    if (isActive) {
        select(selector).addClass('active');
    } else {
        select(selector).removeClass('active');
    }
}

function draw() {
    let bgColor = select('#bgColor').value();
    background(bgColor);
    
    if (!isFontLoaded) {
        fill(255);
        textAlign(CENTER, CENTER);
        textFont('sans-serif');
        text("LOADING FONT...", width/2, height/2);
        return;
    }

    // 모핑 업데이트 (시간 기반)
    if (showMorph && tiles1.length > 0 && tiles2.length > 0) {
        // 60fps 기준으로 시간 계산
        let progressPerFrame = 1 / (morphDuration * 60);
        morphProgress += morphDirection * progressPerFrame;
        
        if (morphProgress >= 1) {
            morphProgress = 1;
            morphDirection = -1;
        } else if (morphProgress <= 0) {
            morphProgress = 0;
            morphDirection = 1;
        }
        
        updateMorphedTiles();
    } else if (!showMorph && tiles1.length > 0) {
        // 모핑 OFF면 tiles1 원본 그대로 표시
        currentTiles = tiles1;
    }

    push();
    translate(width/2, height/2);
    scale(zoom);
    translate(-textCenterX + offset.x, -textCenterY + offset.y);

    if (!img) {
        fill(100);
        textAlign(CENTER, CENTER);
        textFont('sans-serif');
        text("1. SELECT PHOTO\n2. CLICK CONVERT", textCenterX, textCenterY);
    } else if (currentTiles.length > 0) {
        if (showWeb) {
            drawWebLines();
        }
        drawTiles();
    }
    
    pop();
}

function updateMorphedTiles() {
    // 적은 쪽 포인트 수 기준으로 모핑 (형태 유지)
    let count = min(tiles1.length, tiles2.length);
    currentTiles = [];
    
    // 이징 함수 (smoothstep)
    let t = morphProgress;
    let easedT = t * t * (3 - 2 * t);
    
    // 각 텍스트에서 사용할 포인트 (균등 분포)
    for (let i = 0; i < count; i++) {
        // 각 배열에서 균등하게 샘플링
        let idx1 = floor(map(i, 0, count, 0, tiles1.length));
        let idx2 = floor(map(i, 0, count, 0, tiles2.length));
        
        let t1 = tiles1[idx1];
        let t2 = tiles2[idx2];
        
        // 선형 보간 + 약간의 곡선 움직임
        let midX = lerp(t1.x, t2.x, easedT);
        let midY = lerp(t1.y, t2.y, easedT);
        
        // 부드러운 곡선 효과 추가
        let curveAmount = sin(easedT * PI) * 15;
        let angle = atan2(t2.y - t1.y, t2.x - t1.x) + HALF_PI;
        midX += cos(angle) * curveAmount * sin(i * 0.1);
        midY += sin(angle) * curveAmount * sin(i * 0.1);
        
        currentTiles.push({
            x: midX,
            y: midY,
            index: i
        });
    }
}

function drawWebLines() {
    strokeWeight(0.8);
    
    let maxDist = min(width, height) * 0.1;
    let tilesToDraw = currentTiles.length > 0 ? currentTiles : tiles1;
    
    for (let i = 0; i < tilesToDraw.length; i++) {
        let t1 = tilesToDraw[i];
        
        let connections = 0;
        for (let j = i + 1; j < tilesToDraw.length && connections < 4; j++) {
            let t2 = tilesToDraw[j];
            let d = dist(t1.x, t1.y, t2.x, t2.y);
            
            if (d < maxDist) {
                let midX = (t1.x + t2.x) / 2;
                let midY = (t1.y + t2.y) / 2;
                let lineClr = getImageColor(midX, midY);
                
                let alpha = map(d, 0, maxDist, 200, 30);
                stroke(red(lineClr), green(lineClr), blue(lineClr), alpha);
                line(t1.x, t1.y, t2.x, t2.y);
                connections++;
            }
        }
        
        randomSeed(i * 100);
        if (random(1) < 0.03) {
            let randomIdx = floor(random(tilesToDraw.length));
            let t2 = tilesToDraw[randomIdx];
            let lineClr = getImageColor(t1.x, t1.y);
            stroke(red(lineClr), green(lineClr), blue(lineClr), 40);
            line(t1.x, t1.y, t2.x, t2.y);
        }
    }
}

function getImageColor(x, y) {
    if (!img) return color(255);
    
    let imgX = floor(map(x, 0, width, 0, img.width));
    let imgY = floor(map(y, 0, height, 0, img.height));
    imgX = constrain(imgX, 0, img.width - 1);
    imgY = constrain(imgY, 0, img.height - 1);
    
    return img.get(imgX, imgY);
}

function drawTiles() {
    let baseTileSize = min(width, height) * (currentTileSize / 100);
    let tilesToDraw = currentTiles.length > 0 ? currentTiles : tiles1;
    
    for (let i = 0; i < tilesToDraw.length; i++) {
        let t = tilesToDraw[i];
        let tileSize = baseTileSize;
        
        // PULSE 효과 (크기 변화)
        if (showPulse) {
            let pulse = sin(frameCount * 0.05 + i * 0.3) * 0.3 + 1;
            tileSize *= pulse;
        }
        
        push();
        translate(t.x, t.y);
        
        if (showRotate) {
            randomSeed(i);
            rotate(random(-0.4, 0.4));
        }
        
        image(img, -tileSize/2, -tileSize/2, tileSize, tileSize);
        pop();
    }
}

function generateTextPoints(txt, targetArray) {
    let lines = txt.split('\n');
    
    let fontSize = min(width, height) * (currentFontSize / 100);
    let density = map(currentTileSize, 1, 20, 0.5, 0.03);
    
    targetArray.length = 0;
    
    let lineHeightPx = fontSize * (currentLineHeight / 100);
    let totalHeight = lines.length * lineHeightPx;
    let startY = (height - totalHeight) / 2 + fontSize * 0.8;
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        let lineTxt = lines[lineIdx];
        if (lineTxt.trim() === '') continue;
        
        let chars = lineTxt.split('');
        let totalWidth = 0;
        
        for (let c = 0; c < chars.length; c++) {
            if (chars[c] === ' ') {
                totalWidth += fontSize * 0.3 * (currentScaleX / 100);
            } else {
                let charBounds = myFont.textBounds(chars[c], 0, 0, fontSize);
                totalWidth += charBounds.w * (currentScaleX / 100);
            }
            if (c < chars.length - 1) {
                totalWidth += currentLetterSpace;
            }
        }
        
        let startX = (width - totalWidth) / 2;
        let y = startY + lineIdx * lineHeightPx;
        let currentX = startX;
        
        for (let c = 0; c < chars.length; c++) {
            let char = chars[c];
            if (char === ' ') {
                currentX += fontSize * 0.3 * (currentScaleX / 100) + currentLetterSpace;
                continue;
            }
            
            let charBounds = myFont.textBounds(char, 0, 0, fontSize);
            
            let outlinePoints = myFont.textToPoints(char, 0, 0, fontSize, {
                sampleFactor: density,
                simplifyThreshold: 0
            });
            
            for (let p of outlinePoints) {
                let scaledX = p.x * (currentScaleX / 100);
                let finalX = currentX + scaledX;
                let finalY = y + p.y;
                
                targetArray.push({
                    x: finalX,
                    y: finalY,
                    index: targetArray.length,
                    isOriginal: true  // 원본 포인트
                });
            }
            
            currentX += charBounds.w * (currentScaleX / 100) + currentLetterSpace;
        }
    }
    
    return targetArray;
}

function generateDisplay() {
    if (!isFontLoaded || !myFont) {
        updateStatus("폰트 로딩 중...");
        return;
    }
    
    if (!img) {
        updateStatus("이미지를 먼저 선택하세요!");
        return;
    }
    
    let txt1 = document.getElementById('textInput').value || "A";
    let txt2 = document.getElementById('textInput2').value || "B";
    
    currentFontSize = parseInt(select('#fontSize').value());
    currentTileSize = parseInt(select('#tileSize').value());
    currentScaleX = parseInt(select('#scaleX').value());
    currentLetterSpace = parseInt(select('#letterSpace').value());
    currentLineHeight = parseInt(select('#lineHeight').value());
    
    // 두 텍스트의 포인트 생성
    generateTextPoints(txt1, tiles1);
    generateTextPoints(txt2, tiles2);
    
    if (tiles1.length === 0 || tiles2.length === 0) {
        updateStatus("에러: 포인트 추출 실패");
        return;
    }
    
    // 포인트 수 맞추기 - 각 텍스트 형태 내에서 복제
    balancePointsWithinShape(tiles1, tiles2);
    
    // 중심점은 캔버스 중앙으로 고정
    textCenterX = width / 2;
    textCenterY = height / 2;
    
    // 초기 상태 설정 - tiles1 원본 복사 (복제 없이)
    currentTiles = tiles1.map(t => ({...t}));
    morphProgress = 0;
    morphDirection = 1;
    
    offset = createVector(0, 0);
    zoom = 1.0;
    
    updateStatus("타일 " + tiles1.length + "개 생성됨 (모핑 준비 완료)");
}

function balancePointsWithinShape(arr1, arr2) {
    // 포인트 복제 없이 각 텍스트의 중심만 캔버스 중앙으로 이동
    normalizeToCenter(arr1);
    normalizeToCenter(arr2);
}

function normalizeToCenter(arr) {
    if (arr.length === 0) return;
    
    // 현재 중심점 계산
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let t of arr) {
        minX = min(minX, t.x);
        maxX = max(maxX, t.x);
        minY = min(minY, t.y);
        maxY = max(maxY, t.y);
    }
    
    let centerX = (minX + maxX) / 2;
    let centerY = (minY + maxY) / 2;
    
    // 캔버스 중앙으로 이동
    let offsetX = width / 2 - centerX;
    let offsetY = height / 2 - centerY;
    
    for (let t of arr) {
        t.x += offsetX;
        t.y += offsetY;
    }
}

function sortByProximity(arr1, arr2) {
    // arr2의 각 포인트를 arr1의 가장 가까운 포인트 순서로 재배열
    let used = new Set();
    let newArr2 = [];
    
    for (let i = 0; i < arr1.length; i++) {
        let minDist = Infinity;
        let minIdx = -1;
        
        for (let j = 0; j < arr2.length; j++) {
            if (used.has(j)) continue;
            let d = dist(arr1[i].x, arr1[i].y, arr2[j].x, arr2[j].y);
            if (d < minDist) {
                minDist = d;
                minIdx = j;
            }
        }
        
        if (minIdx >= 0) {
            used.add(minIdx);
            newArr2.push(arr2[minIdx]);
        }
    }
    
    // arr2 업데이트
    for (let i = 0; i < newArr2.length; i++) {
        arr2[i] = newArr2[i];
        arr2[i].index = i;
    }
}

function showPreview() {
    select('#fullscreen-view').removeClass('hidden');
}

function hidePreview() {
    select('#fullscreen-view').addClass('hidden');
}

function saveImage() {
    let savedOffset = offset.copy();
    let savedZoom = zoom;
    offset = createVector(0, 0);
    zoom = 1.0;
    
    draw();
    saveCanvas('TEXT_MOSAIC', 'png');
    
    offset = savedOffset;
    zoom = savedZoom;
    
    updateStatus("이미지 저장됨!");
}

function startRecording() {
    if (isRecording) {
        updateStatus("이미 녹화 중입니다");
        return;
    }
    
    if (!showPulse && !showMorph) {
        updateStatus("PULSE 또는 MORPH 모드를 켜야 비디오 저장 가능!");
        return;
    }
    
    let duration = parseInt(document.getElementById('videoDuration').value) || 3;
    duration = constrain(duration, 1, 30);
    
    let canvas = document.querySelector('#canvas-holder canvas');
    let stream = canvas.captureStream(60);
    
    recordedChunks = [];
    
    // 고화질 설정
    let options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 20000000  // 20 Mbps
    };
    
    // vp9 지원 안되면 vp8로 폴백
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        let blob = new Blob(recordedChunks, { type: 'video/webm' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'TEXT_MOSAIC.webm';
        a.click();
        URL.revokeObjectURL(url);
        isRecording = false;
        select('#saveVideoBtn').html('REC');
        updateStatus("비디오 저장됨!");
    };
    
    // 모핑 초기화
    morphProgress = 0;
    morphDirection = 1;
    offset = createVector(0, 0);
    zoom = 1.0;
    
    mediaRecorder.start();
    isRecording = true;
    select('#saveVideoBtn').html('...');
    updateStatus(duration + "초 녹화 중...");
    
    setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }, duration * 1000);
}

function updateStatus(msg) {
    select('#info-text').html(msg);
}

function handleImage(e) {
    if (e.target.files.length > 0) {
        let file = e.target.files[0];
        let url = URL.createObjectURL(file);
        
        updateStatus("이미지 로딩중...");
        
        img = loadImage(url, () => {
            updateStatus("이미지 준비 완료! CONVERT 클릭");
        }, () => {
            updateStatus("이미지 로드 실패");
        });
    }
}

function updateCanvas() {
    resizeCanvas(parseInt(select('#canvasW').value()), parseInt(select('#canvasH').value()));
    tiles1 = [];
    tiles2 = [];
    currentTiles = [];
    offset = createVector(0, 0);
    zoom = 1.0;
    textCenterX = width / 2;
    textCenterY = height / 2;
    updateStatus("캔버스: " + width + "x" + height);
}

function mouseWheel(event) {
    if (!select('#fullscreen-view').hasClass('hidden')) {
        zoom -= event.delta * 0.001;
        zoom = constrain(zoom, 0.1, 5);
        return false;
    }
}

function mouseDragged() {
    if (!select('#fullscreen-view').hasClass('hidden')) {
        offset.x += (mouseX - pmouseX) / zoom;
        offset.y += (mouseY - pmouseY) / zoom;
    }
}