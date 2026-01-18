document.addEventListener('DOMContentLoaded', () => {
    const warningOverlay = document.getElementById('warning-overlay');
    const btnProceed = document.getElementById('btn-proceed');
    const btnLeave = document.getElementById('btn-leave');

    // Check for consent
    if (!sessionStorage.getItem('content-consent')) {
        warningOverlay.classList.remove('hidden');
    }

    btnProceed.addEventListener('click', () => {
        sessionStorage.setItem('content-consent', 'true');
        warningOverlay.classList.add('hidden');
    });

    btnLeave.addEventListener('click', () => {
        window.location.href = 'https://www.google.com';
    });

    const skinInput = document.getElementById('skin-input');
    // ... remaining variables
    const dropZone = document.getElementById('drop-zone');
    const newPreview = document.getElementById('new-skin-preview');
    const noPreview = document.getElementById('no-preview');
    const downloadBtn = document.getElementById('download-btn');
    const status = document.getElementById('status');
    let selectedFile = null;

    // Handle file selection
    skinInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    // Drag and drop handling
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
                newPreview.src = e.target.result;
                newPreview.classList.remove('hidden');
                noPreview.classList.add('hidden');
                downloadBtn.disabled = false;

                if (isCorrectSize) {
                    showStatus('Skin preview updated.', 'success');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Download functionality
    downloadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        try {
            showStatus('Compositing images...', 'success');

            // 1. Load Base Image (Uploaded Skin)
            const baseImg = new Image();
            const basePromise = new Promise((resolve) => baseImg.onload = resolve);
            baseImg.src = newPreview.src;
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

                showStatus('Layers composited and saved! Rename it to black_brief.png and overwrite the original.', 'success');
            }, 'image/png');

        } catch (err) {
            console.error(err);
            showStatus(err, 'error');
        }
    });

    function showStatus(msg, type) {
        status.textContent = msg;
        status.className = `status-msg ${type}`;
        status.classList.remove('hidden');

        setTimeout(() => {
            status.classList.add('hidden');
        }, 5000);
    }
});
