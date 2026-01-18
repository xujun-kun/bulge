document.addEventListener('DOMContentLoaded', () => {
    // 1. Content Warning Dialog Logic
    const warningOverlay = document.getElementById('warning-overlay');
    const btnProceed = document.getElementById('btn-proceed');
    const btnLeave = document.getElementById('btn-leave');

    if (warningOverlay && !sessionStorage.getItem('content-consent')) {
        warningOverlay.classList.remove('hidden');
    }

    if (btnProceed) {
        btnProceed.addEventListener('click', () => {
            sessionStorage.setItem('content-consent', 'true');
            warningOverlay.classList.add('hidden');
        });
    }

    if (btnLeave) {
        btnLeave.addEventListener('click', () => {
            window.location.href = 'https://www.google.com';
        });
    }

    // 2. Main Tool Logic
    const skinInput = document.getElementById('skin-input');
    const dropZone = document.getElementById('drop-zone');
    const downloadBtn = document.getElementById('download-btn');
    const status = document.getElementById('status');
    const colorSection = document.getElementById('color-section');
    const colorList = document.getElementById('color-list');

    let selectedFile = null;
    let baseImageData = null;
    let selectedFillColor = null;

    // Handle manual hex input
    const manualHex = document.getElementById('manual-hex');
    if (manualHex) {
        manualHex.addEventListener('input', (e) => {
            const hex = e.target.value;
            // Validate Hex code (e.g. #FFFFFF or #FFF)
            if (/^#([0-9A-F]{3}){1,2}$/i.test(hex)) {
                let r, g, b;
                if (hex.length === 4) {
                    r = parseInt(hex[1] + hex[1], 16);
                    g = parseInt(hex[2] + hex[2], 16);
                    b = parseInt(hex[3] + hex[3], 16);
                } else {
                    r = parseInt(hex.slice(1, 3), 16);
                    g = parseInt(hex.slice(3, 5), 16);
                    b = parseInt(hex.slice(5, 7), 16);
                }
                selectedFillColor = [r, g, b];
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                showStatus('Custom color selected!', 'success');
            }
        });
    }

    // Handle file selection
    if (skinInput) {
        skinInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
    }

    // Drag and drop handling
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('Please select an image file.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const isCorrectSize = (img.width === 64 && (img.height === 64 || img.height === 32));
                if (!isCorrectSize) {
                    showStatus(`Incorrect size (${img.width}x${img.height}). Please select a Minecraft skin.`, 'error');
                }

                selectedFile = file;
                baseImageData = e.target.result;
                downloadBtn.disabled = false;
                selectedFillColor = null; // Reset selection

                analyzeColors(img);

                if (isCorrectSize) {
                    showStatus('Skin loaded. Pick a color to fill parts.', 'success');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function analyzeColors(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const counts = {};

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue; // Skip clusters of transparency
            const rgb = `${data[i]},${data[i + 1]},${data[i + 2]}`;
            counts[rgb] = (counts[rgb] || 0) + 1;
        }

        const sortedColors = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

        colorList.innerHTML = '';
        sortedColors.forEach(([rgb]) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = `rgb(${rgb})`;
            swatch.addEventListener('click', () => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                selectedFillColor = rgb.split(',').map(Number);
                showStatus('Color selected for filling.', 'success');
            });
            colorList.appendChild(swatch);
        });

        colorSection.classList.remove('hidden');
    }

    // Download functionality
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            if (!selectedFile || !baseImageData) return;

            try {
                showStatus('Processing skin...', 'success');

                const baseImg = new Image();
                await new Promise(r => baseImg.onload = r).then(baseImg.src = baseImageData);

                const overlayImg = new Image();
                overlayImg.crossOrigin = 'anonymous';
                await new Promise((res, rej) => {
                    overlayImg.onload = res;
                    overlayImg.onerror = rej;
                    overlayImg.src = 'assets/black_brief.png?t=' + Date.now();
                });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = baseImg.width;
                canvas.height = baseImg.height;

                // 1. Draw modified base (Fill parts except head)
                ctx.drawImage(baseImg, 0, 0);
                if (selectedFillColor) {
                    const [r, g, b] = selectedFillColor;
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imgData.data;
                    const is64x64 = canvas.height === 64;

                    for (let y = 16; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                            const i = (y * canvas.width + x) * 4;

                            // Check if this (x,y) is a Base Layer or Overlay Layer for the body
                            let isBase = false;
                            let isOverlay = false;

                            if (is64x64) {
                                // 64x64 Base Zones (excluding head)
                                if ((y >= 16 && y <= 31 && x >= 0 && x <= 55) || // R-Leg, Body, R-Arm
                                    (y >= 48 && y <= 63 && x >= 16 && x <= 47)) { // L-Leg, L-Arm
                                    isBase = true;
                                }
                                // 64x64 Overlay Zones (excluding head)
                                if ((y >= 32 && y <= 47 && x >= 0 && x <= 55) || // R-Leg-Ov, Body-Ov, R-Arm-Ov
                                    (y >= 48 && y <= 63 && x >= 0 && x <= 15) || // L-Leg-Ov
                                    (y >= 48 && y <= 63 && x >= 48 && x <= 63)) { // L-Arm-Ov
                                    isOverlay = true;
                                }
                            } else {
                                // 64x32 Base Zones (excluding head)
                                if (y >= 16 && y <= 31 && x >= 0 && x <= 55) {
                                    isBase = true;
                                }
                                // 64x32 has no body overlays
                            }

                            if (isBase) {
                                // Fill base layers (only if they weren't fully transparent before, or just always?)
                                // Most users want to overwrite previous clothing shape. 
                                // We check alpha > 0 to maintain the character's unique shape if any.
                                if (pixels[i + 3] > 0) {
                                    pixels[i] = r;
                                    pixels[i + 1] = g;
                                    pixels[i + 2] = b;
                                }
                            } else if (isOverlay) {
                                // WIPE body overlays
                                pixels[i + 3] = 0;
                            }
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                }

                // 2. Draw black_brief overlay
                ctx.drawImage(overlayImg, 0, 0, baseImg.width, baseImg.height);

                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'composited_skin.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showStatus('Skin processed and saved!', 'success');
                }, 'image/png');

            } catch (err) {
                console.error(err);
                showStatus('Error processing skin.', 'error');
            }
        });
    }

    function showStatus(msg, type) {
        if (!status) return;
        status.textContent = msg;
        status.className = `status-msg ${type}`;
        status.classList.remove('hidden');
        setTimeout(() => { status.classList.add('hidden'); }, 5000);
    }
});
