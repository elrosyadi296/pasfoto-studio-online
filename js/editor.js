/**
 * editor.js
 * Mengelola editor foto: crop (Cropper.js), rotate, flip, zoom,
 * dan filter (brightness/contrast/saturation/blur/sharpen) secara realtime
 * menggunakan Canvas 2D API.
 */

const PhotoEditor = (() => {
  let cropper = null;
  let currentPhoto = null; // referensi objek foto yang sedang diedit (dari state.photos)
  let imgEl = null;

  const defaultFilters = {
    brightness: 100, // %
    contrast: 100,   // %
    saturation: 100, // %
    blur: 0,         // px
    sharpen: 0,      // 0-100
  };

  function cssFilterString(filters) {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px)`;
  }

  /** Buka foto ke dalam editor (Cropper.js) */
  function openPhoto(photo) {
    currentPhoto = photo;
    if (!photo.filters) photo.filters = { ...defaultFilters };
    if (!photo.rotation) photo.rotation = 0;
    if (photo.flipH === undefined) photo.flipH = false;
    if (photo.flipV === undefined) photo.flipV = false;

    const stage = document.getElementById('cropStage');
    stage.innerHTML = '';
    imgEl = document.createElement('img');
    imgEl.src = photo.originalSrc;
    imgEl.style.maxWidth = '100%';
    imgEl.style.display = 'block';
    imgEl.style.filter = cssFilterString(photo.filters);
    stage.appendChild(imgEl);

    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    const size = findSizeByKey(photo.sizeKey) || { w: 30, h: 40 };
    imgEl.onload = () => {
      cropper = new Cropper(imgEl, {
        aspectRatio: size.w / size.h,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        background: false,
        responsive: true,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
          if (photo.cropData) {
            cropper.setData(photo.cropData);
          }
          if (photo.canvasZoom) {
            cropper.zoomTo(photo.canvasZoom);
          }
        },
      });
    };
  }

  /** Update aspect ratio crop-box saat ukuran pas foto diganti */
  function setAspectRatio(w, h) {
    if (cropper) cropper.setAspectRatio(w / h);
  }

  /** Set posisi & ukuran crop box secara terprogram (koordinat gambar asli) */
  function setCropBox(box) {
    if (!cropper) return;
    cropper.setData({ x: box.x, y: box.y, width: box.width, height: box.height });
  }

  function rotate(deg) {
    if (!cropper) return;
    cropper.rotate(deg);
    currentPhoto.rotation = (currentPhoto.rotation + deg) % 360;
  }

  function flipHorizontal() {
    if (!cropper) return;
    currentPhoto.flipH = !currentPhoto.flipH;
    cropper.scaleX(currentPhoto.flipH ? -1 : 1);
  }

  function flipVertical() {
    if (!cropper) return;
    currentPhoto.flipV = !currentPhoto.flipV;
    cropper.scaleY(currentPhoto.flipV ? -1 : 1);
  }

  function zoom(delta) {
    if (!cropper) return;
    cropper.zoom(delta);
  }

  function resetAll() {
    if (!cropper) return;
    cropper.reset();
    currentPhoto.filters = { ...defaultFilters };
    currentPhoto.rotation = 0;
    currentPhoto.flipH = false;
    currentPhoto.flipV = false;
    applyFilterPreview(currentPhoto.filters);
  }

  function applyFilterPreview(filters) {
    if (!imgEl) return;
    imgEl.style.filter = cssFilterString(filters);
    currentPhoto.filters = filters;
  }

  /**
   * Terapkan sharpen sederhana menggunakan convolution kernel.
   * amount: 0-100
   */
  function applySharpen(ctx, canvas, amount) {
    if (amount <= 0) return;
    const w = canvas.width, h = canvas.height;
    const src = ctx.getImageData(0, 0, w, h);
    const srcData = src.data;
    const output = ctx.createImageData(w, h);
    const outData = output.data;
    const strength = amount / 100;
    // kernel sharpen klasik dicampur dengan identity sesuai strength
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          for (let c = 0; c < 4; c++) outData[idx + c] = srcData[idx + c];
          continue;
        }
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let k = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const nIdx = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += srcData[nIdx] * kernel[k];
              k++;
            }
          }
          const original = srcData[idx + c];
          outData[idx + c] = clamp(original + (sum - original) * strength, 0, 255);
        }
        outData[idx + 3] = srcData[idx + 3];
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  /**
   * Hasilkan canvas final dari hasil crop + filter (tanpa background),
   * pada resolusi target dalam pixel (targetW x targetH, sesuai DPI cetak).
   */
  async function renderCroppedCanvas(photo, targetW, targetH) {
    if (!cropper || currentPhoto !== photo) {
      openPhoto(photo);
      await new Promise((r) => setTimeout(r, 50));
    }
    // simpan crop data supaya persist saat berpindah foto
    photo.cropData = cropper.getData();
    photo.canvasZoom = cropper.getImageData().width
      ? cropper.getImageData().width / cropper.getCanvasData().naturalWidth
      : 1;

    const croppedCanvas = cropper.getCroppedCanvas({
      width: targetW,
      height: targetH,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    const ctx = croppedCanvas.getContext('2d');
    // terapkan filter brightness/contrast/saturate/blur via canvas filter API
    const f = photo.filters || defaultFilters;
    const temp = document.createElement('canvas');
    temp.width = croppedCanvas.width;
    temp.height = croppedCanvas.height;
    const tctx = temp.getContext('2d');
    tctx.filter = cssFilterString(f);
    tctx.drawImage(croppedCanvas, 0, 0);

    if (f.sharpen > 0) applySharpen(tctx, temp, f.sharpen);

    return temp;
  }

  function getCurrentPhoto() {
    return currentPhoto;
  }

  function destroy() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    currentPhoto = null;
  }

  return {
    openPhoto,
    setAspectRatio,
    setCropBox,
    rotate,
    flipHorizontal,
    flipVertical,
    zoom,
    resetAll,
    applyFilterPreview,
    renderCroppedCanvas,
    getCurrentPhoto,
    destroy,
    defaultFilters,
  };
})();
