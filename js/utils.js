/**
 * utils.js
 * Fungsi bantu umum: konversi satuan, id generator, file helper, toast, dsb.
 */

const DPI = 300; // dot per inch untuk kualitas cetak

function mmToPx(mm, dpi = DPI) {
  return Math.round((mm / 25.4) * dpi);
}

function pxToMm(px, dpi = DPI) {
  return (px / dpi) * 25.4;
}

function cmToMm(cm) {
  return cm * 10;
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Menampilkan notifikasi toast singkat di pojok layar.
 * type: 'success' | 'error' | 'info'
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-600',
  };

  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg shadow-black/10 flex items-center gap-2 animate-toast-in`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-toast-out');
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

/** Tampilkan / sembunyikan overlay loading elegan */
function setLoading(show, text = 'Memproses...') {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  const label = document.getElementById('loadingText');
  if (label) label.textContent = text;
  overlay.classList.toggle('hidden', !show);
  overlay.classList.toggle('flex', show);
}

function debounce(fn, delay = 150) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
