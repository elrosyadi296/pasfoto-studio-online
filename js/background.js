/**
 * background.js
 * Menangani warna latar belakang pas foto:
 * - Mengisi latar dengan warna solid / transparan
 * - Auto Remove Background sederhana berbasis kemiripan warna di sudut foto
 *   (chroma-distance based). Ini adalah pendekatan ringan client-side yang
 *   bekerja baik untuk foto studio dengan latar polos, tanpa memerlukan
 *   model AI besar.
 */

const BackgroundTool = (() => {
  /** Ambil warna sampel dari 4 sudut gambar sebagai estimasi warna latar */
  function sampleCornerColor(imageData) {
    const { data, width, height } = imageData;
    const points = [
      [2, 2],
      [width - 3, 2],
      [2, height - 3],
      [width - 3, height - 3],
    ];
    let r = 0, g = 0, b = 0;
    points.forEach(([x, y]) => {
      const i = (y * width + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    });
    return { r: r / 4, g: g / 4, b: b / 4 };
  }

  function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  /**
   * Menghapus latar belakang berbasis kemiripan warna terhadap sudut gambar.
   * threshold: 0-255, makin tinggi makin agresif.
   * Mengembalikan canvas baru dengan alpha channel transparan di area background.
   */
  function autoRemoveBackground(sourceCanvas, threshold = 45) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d');
    octx.drawImage(sourceCanvas, 0, 0);

    const imageData = octx.getImageData(0, 0, w, h);
    const bg = sampleCornerColor(imageData);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const dist = colorDistance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
      if (dist < threshold) {
        // semakin dekat ke warna bg, semakin transparan (soft edge)
        const alpha = clamp((dist / threshold) * 255, 0, 255);
        data[i + 3] = alpha;
      }
    }
    octx.putImageData(imageData, 0, 0);
    return out;
  }

  /**
   * Gabungkan foto (dengan/ tanpa alpha) di atas latar warna solid.
   * bgColor: hex string, atau null/'transparent' untuk transparan.
   */
  function compositeOnBackground(photoCanvas, bgColor) {
    const w = photoCanvas.width;
    const h = photoCanvas.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');

    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(photoCanvas, 0, 0);
    return out;
  }

  return { autoRemoveBackground, compositeOnBackground, sampleCornerColor };
})();
