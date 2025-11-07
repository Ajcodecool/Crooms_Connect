const overlay = document.getElementById("loadingOverlay");
const canvas = document.getElementById("loadingCanvas");
const ctx = canvas.getContext("2d");

// --- Responsive Canvas ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Config ---
const BG_COLOR = "#0b0f1a";
const MAIN_COLOR = "#1793d1";
const SHADOW_COLOR = "#6C7CFF";
const HIGHLIGHT = "#E8F8FF";
const SPACING = 2;
const FONT = {
  "a": ["01110","10001","11111","10001","10001"],
  "s": ["01111","10000","01110","00001","11110"],
  "h": ["10001","10001","11111","10001","10001"],
  "w": ["10001","10001","10101","11011","10001"],
  "r": ["11110","10001","11110","10100","10010"],
  "e": ["11111","10000","11110","10000","11111"],
  ".": ["00000","00000","00000","00000","00100"]
};
const EMPTY = ["00000","00000","00000","00000","00000"];
const message = "ash.ware";

// --- Drawing helpers ---
function drawPixel(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
}
function drawChar(char, ox, oy, size, fg, shadow, highlight) {
    const pat = FONT[char] || EMPTY;
    if (shadow) {
        const sx = ox + size * 0.35;
        const sy = oy + size * 0.35;
        pat.forEach((row, r) => row.split("").forEach((bit, c) => {
            if (bit === "1") drawPixel(sx + c*(size+SPACING), sy + r*(size+SPACING), size, shadow);
        }));
    }
    pat.forEach((row, r) => row.split("").forEach((bit, c) => {
        if (bit === "1") drawPixel(ox + c*(size+SPACING), oy + r*(size+SPACING), size, fg);
    }));
    if (highlight) {
        const hsize = size * 0.38;
        pat.forEach((row, r) => row.split("").forEach((bit, c) => {
            if (bit === "1" && (r + c) % 2 === 0)
                drawPixel(ox + c*(size+SPACING) + size*0.1, oy + r*(size+SPACING) + size*0.1, hsize, highlight);
        }));
    }
}
function drawText(text, startX, startY, size, fg, shadow, highlight) {
    let x = startX;
    for (const ch of text) {
        drawChar(ch, x, startY, size, fg, shadow, highlight);
        const charW = 5 * (size + SPACING) - SPACING;
        x += charW + size * 0.7;
    }
}

// --- Extras (grid + glitch) ---
function drawExtras(w, h, textWidth, startX, startY, size) {
    ctx.strokeStyle = "#08131a";
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    ctx.strokeStyle = "#00ffd8";
    ctx.lineWidth = 2;
    const ys = [startY - size * 4, startY + size * 5, startY + size * 2];
    ys.forEach((y, i) => {
        ctx.beginPath();
        ctx.moveTo(startX - 10, y + (i % 2) * 2);
        ctx.lineTo(startX + textWidth + 20, y + (i % 2) * 2);
        ctx.stroke();
    });
}

// --- Animation Loop ---
let glow = 0;
let animationRunning = false;
let animationFrameId;

function drawLoadingFrame() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    const PIXEL_SIZE = Math.min(w / 90, h / 12);
    const charW = 5 * (PIXEL_SIZE + SPACING) - SPACING;
    const totalW = message.length * (charW + PIXEL_SIZE * 0.7);
    const startX = w / 2 - totalW / 2;
    const startY = h / 2 - (2.5 * (PIXEL_SIZE + SPACING));

    const glowVal = Math.floor(150 + 80 * Math.sin(glow / 10));
    const glowColor = `rgb(${glowVal/2}, ${glowVal}, 255)`;

    drawText(message, startX, startY, PIXEL_SIZE, glowColor, SHADOW_COLOR, HIGHLIGHT);
    drawExtras(w, h, totalW, startX, startY, PIXEL_SIZE);

    glow += 1;
    animationFrameId = requestAnimationFrame(drawLoadingFrame);
}

// --- Start/Stop Animation ---
function startLoading() {
    cancelAnimationFrame(animationFrameId);
    glow = 0;
    animationRunning = true;
    overlay.classList.remove("hidden");
    drawLoadingFrame();

    // Hide overlay after a short delay (fake refresh)
    setTimeout(stopLoading, 2500);
}
function stopLoading() {
    animationRunning = false;
    overlay.classList.add("hidden");
    cancelAnimationFrame(animationFrameId);
}

// --- Visibility detection (refresh animation on return) ---
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        // User returned to page
        startLoading();
    }
});

// --- Initial page load ---
window.addEventListener("load", () => {
    startLoading(); // Show on first load
});
