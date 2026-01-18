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

    let selectedFile = null;
    let baseImageData = null; // Store base image data URL here since preview DOM is removed

    // Handle file selection
    if (skinInput) {
        skinInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
    }

    // Drag and drop handling
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

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
                // Minecraft skin size validation (64x64 or 64x32)
                const isCorrectSize = (img.width === 64 && (img.height === 64 || img.height === 32));
                if (!isCorrectSize) {
                    showStatus(`Incorrect size (${img.width}x${img.height}). Please select a Minecraft skin (64x64 or 64x32).`, 'error');
                }

                selectedFile = file;
                baseImageData = e.target.result; // Store for compositing
                downloadBtn.disabled = false;

                if (isCorrectSize) {
                    showStatus('Skin selected and ready for compositing.', 'success');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Download functionality
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            if (!selectedFile || !baseImageData) return;

            try {
                showStatus('Compositing images...', 'success');

                // 1. Load Base Image (Uploaded Skin)
                const baseImg = new Image();
                const basePromise = new Promise((resolve) => baseImg.onload = resolve);
                baseImg.src = baseImageData;
                await basePromise;

                // 2. Load Overlay Image (assets/black_brief.png)
                const overlayImg = new Image();
                overlayImg.crossOrigin = 'anonymous'; // Help with CORS
                const overlayPromise = new Promise((resolve, reject) => {
                    overlayImg.onload = resolve;
                    overlayImg.onerror = (e) => {
                        console.error('Failed to load overlay:', e);
                        reject('Failed to load assets/black_brief.png. Please check if the file exists.');
                    };
                });
                overlayImg.src = 'assets/black_brief.png?t=' + Date.now(); // Cache busting
                await overlayPromise;

                // 3. Composite on Canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = baseImg.width;
                canvas.height = baseImg.height;

                // Draw Base
                ctx.drawImage(baseImg, 0, 0);
                // Draw Overlay on top
                ctx.drawImage(overlayImg, 0, 0, baseImg.width, baseImg.height);

                // 4. Export
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'composited_skin.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    showStatus('Layers composited! Save it as black_brief.png in your assets folder.', 'success');
                }, 'image/png');

            } catch (err) {
                console.error(err);
                showStatus(err, 'error');
            }
        });
    }

    function showStatus(msg, type) {
        if (!status) return;
        status.textContent = msg;
        status.className = `status-msg ${type}`;
        status.classList.remove('hidden');

        setTimeout(() => {
            status.classList.add('hidden');
        }, 5000);
    }
});
