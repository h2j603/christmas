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
let morphProgress = 0;
let morphDirection = 1;
let morphDuration = 2;

// 저장된 설정값
let currentFontSize = 50;
let currentTileSize = 5;
let currentScaleX = 100;
let currentLetterSpace = 0;
let currentLineHeight = 120;

// 텍스트 위치 오프셋
let textOffsetX = 0;
let textOffsetY = 0;

// 배경 설정
let gradientType = 'none';
let gradAngle = 0;
let noiseAmount = 0;
let noiseBuffer;

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
    
    // 텍스트 위치 조절
    select('#textOffsetX').input(() => {
        select('#textOffsetXVal').html(select('#textOffsetX').value());
        textOffsetX = parseInt(select('#textOffsetX').value());
    });
    select('#textOffsetY').input(() => {
        select('#textOffsetYVal').html(select('#textOffsetY').value());
        textOffsetY = parseInt(select('#textOffsetY').value());
    });
    
    // 그라디언트 각도
    select('#gradAngle').input(() => {
        select('#gradAngleVal').html(select('#gradAngle').value());
        gradAngle = parseInt(select('#gradAngle').value());
    });
    
    // 노이즈
    select('#noiseAmount').input(() => {
        select('#noiseAmountVal').html(select('#noiseAmount').value());
        noiseAmount = parseInt(select('#noiseAmount').value());
        generateNoiseBuffer();
    });
    
    // 그라디언트 타입 버튼
    select('#gradNone').mousePressed(() => {
        gradientType = 'none';
        updateGradientButtons();
    });
    select('#gradLinear').mousePressed(() => {
        gradientType = 'linear';
        updateGradientButtons();
    });
    select('#gradRadial').mousePressed(() => {
        gradientType = 'radial';
        updateGradientButtons();
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
    
    generateNoiseBuffer();
}

function toggleClass(selector, isActive) {
    if (isActive) {
        select(selector).addClass('active');
    } else {
        select(selector).removeClass('active');
    }
}

function draw() {
    drawBackground();
    
    if (!isFontLoaded) {
        fill(255);
        textAlign(CENTER, CENTER);
        textFont('sans-serif');
        text("LOADING FONT...", width/2, height/2);
        return;
    }

    // 모핑 업데이트
    if (showMorph && tiles1.length > 0 && tiles2.length > 0) {
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
        currentTiles = tiles1;
    }

    push();
    translate(width/2, height/2);
    scale(zoom);
    translate(-textCenterX + offset.x + textOffsetX, -textCenterY + offset.y + textOffsetY);

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

function drawBackground() {
    let c1 = color(select('#bgColor').value());
    let c2 = color(select('#bgColor2').value());
    
    if (gradientType === 'none') {
        background(c1);
    } else if (gradientType === 'linear') {
        drawLinearGradient(c1, c2);
    } else if (gradientType === 'radial') {
        drawRadialGradient(c1, c2);
    }
    
    if (noiseAmount > 0 && noiseBuffer) {
        push();
        blendMode(ADD);
        tint(255, noiseAmount * 2.55);
        image(noiseBuffer, 0, 0);
        pop();
    }
}

function drawLinearGradient(c1, c2) {
    push();
    noFill();
    let angleRad = radians(gradAngle);
    let cx = width / 2;
    let cy = height / 2;
    let diagonal = sqrt(width * width + height * height);
    
    for (let i = 0; i <= diagonal; i++) {
        let t = i / diagonal;
        let c = lerpColor(c1, c2, t);
        stroke(c);
        
        let x1 = cx + cos(angleRad + HALF_PI) * diagonal;
        let y1 = cy + sin(angleRad + HALF_PI) * diagonal;
        let x2 = cx - cos(angleRad + HALF_PI) * diagonal;
        let y2 = cy - sin(angleRad + HALF_PI) * diagonal;
        
        let offsetX = cos(angleRad) * (i - diagonal/2);
        let offsetY = sin(angleRad) * (i - diagonal/2);
        
        line(x1 + offsetX, y1 + offsetY, x2 + offsetX, y2 + offsetY);
    }
    pop();
}

function drawRadialGradient(c1, c2) {
    push();
    noStroke();
    let maxR = sqrt(width * width + height * height) / 2;
    
    for (let r = maxR; r > 0; r -= 2) {
        let t = 1 - (r / maxR);
        let c = lerpColor(c1, c2, t);
        fill(c);
        ellipse(width/2, height/2, r * 2, r * 2);
    }
    pop();
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

function updateGradientButtons() {
    select('#gradNone').removeClass('active');
    select('#gradLinear').removeClass('active');
    select('#gradRadial').removeClass('active');
    
    if (gradientType === 'none') select('#gradNone').addClass('active');
    else if (gradientType === 'linear') select('#gradLinear').addClass('active');
    else if (gradientType === 'radial') select('#gradRadial').addClass('active');
}

function updateMorphedTiles() {
    let count = min(tiles1.length, tiles2.length);
    currentTiles = [];
    
    let t = morphProgress;
    let easedT = t * t * (3 - 2 * t);
    
    for (let i = 0; i < count; i++) {
        let idx1 = floor(map(i, 0, count, 0, tiles1.length));
        let idx2 = floor(map(i, 0, count, 0, tiles2.length));
        
        let t1 = tiles1[idx1];
        let t2 = tiles2[idx2];
        
        let midX = lerp(t1.x, t2.x, easedT);
        let midY = lerp(t1.y, t2.y, easedT);
        
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
    
    for (let i = 0; i < currentTiles.length; i++) {
        let t1 = currentTiles[i];
        
        let connections = 0;
        for (let j = i + 1; j < currentTiles.length && connections < 4; j++) {
            let t2 = currentTiles[j];
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
            let randomIdx = floor(random(currentTiles.length));
            let t2 = currentTiles[randomIdx];
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
    
    for (let i = 0; i < currentTiles.length; i++) {
        let t = currentTiles[i];
        let tileSize = baseTileSize;
        
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
                    index: targetArray.length
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
    
    generateTextPoints(txt1, tiles1);
    generateTextPoints(txt2, tiles2);
    
    if (tiles1.length === 0 || tiles2.length === 0) {
        updateStatus("에러: 포인트 추출 실패");
        return;
    }
    
    // 각 텍스트를 캔버스 중앙으로 정규화
    normalizeToCenter(tiles1);
    normalizeToCenter(tiles2);
    
    textCenterX = width / 2;
    textCenterY = height / 2;
    
    currentTiles = tiles1.map(t => ({...t}));
    morphProgress = 0;
    morphDirection = 1;
    
    offset = createVector(0, 0);
    zoom = 1.0;
    
    updateStatus("타일 " + tiles1.length + "개 생성됨");
}

function normalizeToCenter(arr) {
    if (arr.length === 0) return;
    
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
    
    let offsetX = width / 2 - centerX;
    let offsetY = height / 2 - centerY;
    
    for (let t of arr) {
        t.x += offsetX;
        t.y += offsetY;
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
    
    let options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 20000000
    };
    
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
    generateNoiseBuffer();
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