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

        const sortedColors = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 9);

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

                // 1. Process Base Skin
                ctx.drawImage(baseImg, 0, 0);
                if (selectedFillColor) {
                    const [r, g, b] = selectedFillColor;
                    const is64x64 = canvas.height === 64;

                    // Wipe everything below the head (y >= 16)
                    ctx.clearRect(0, 16, canvas.width, canvas.height - 16);
                    ctx.fillStyle = `rgb(${r},${g},${b})`;

                    if (is64x64) {
                        // 64x64 Format: Draw standard base body part rectangles
                        ctx.fillRect(0, 16, 16, 16);   // Right Leg
                        ctx.fillRect(16, 16, 24, 16);  // Body
                        ctx.fillRect(40, 16, 16, 16);  // Right Arm
                        ctx.fillRect(16, 48, 16, 16);  // Left Leg
                        ctx.fillRect(32, 48, 16, 16);  // Left Arm
                    } else {
                        // 64x32 Format: Draw standard base body part rectangles
                        ctx.fillRect(0, 16, 16, 16);   // Leg
                        ctx.fillRect(16, 16, 24, 16);  // Body
                        ctx.fillRect(40, 16, 16, 16);  // Arm
                    }
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
