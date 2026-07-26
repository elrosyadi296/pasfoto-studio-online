/**
 * layout.js
 * Menghitung layout cetak otomatis: berapa banyak foto yang muat di kertas,
 * posisi tiap foto, dan sisa ruang — agar penggunaan kertas seefisien mungkin.
 * Semua perhitungan dalam pixel (hasil konversi mm -> px pada DPI cetak).
 */

const LayoutEngine = (() => {
  /**
   * @param {{w:number,h:number}} paperMM ukuran kertas dalam mm
   * @param {{w:number,h:number}} photoMM ukuran satu foto dalam mm
   * @param {number} marginMM margin tepi kertas dalam mm
   * @param {number} gapMM jarak antar foto dalam mm
   * @param {'portrait'|'landscape'} orientation
   * @param {boolean} border apakah setiap foto punya border tipis (mempengaruhi tampilan saja)
   */
  function computeLayout(paperMM, photoMM, marginMM, gapMM, orientation) {
    let paperW = paperMM.w;
    let paperH = paperMM.h;
    if (orientation === 'landscape' && paperW < paperH) {
      [paperW, paperH] = [paperH, paperW];
    }
    if (orientation === 'portrait' && paperW > paperH) {
      [paperW, paperH] = [paperH, paperW];
    }

    const usableW = paperW - marginMM * 2;
    const usableH = paperH - marginMM * 2;

    const cols = Math.max(0, Math.floor((usableW + gapMM) / (photoMM.w + gapMM)));
    const rows = Math.max(0, Math.floor((usableH + gapMM) / (photoMM.h + gapMM)));
    const count = cols * rows;

    const gridW = cols * photoMM.w + (cols - 1) * gapMM;
    const gridH = rows * photoMM.h + (rows - 1) * gapMM;
    // agar grid berada di tengah kertas (sisa ruang dibagi rata)
    const offsetX = marginMM + (usableW - gridW) / 2;
    const offsetY = marginMM + (usableH - gridH) / 2;

    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push({
          x: offsetX + c * (photoMM.w + gapMM),
          y: offsetY + r * (photoMM.h + gapMM),
          w: photoMM.w,
          h: photoMM.h,
          row: r,
          col: c,
        });
      }
    }

    const usedArea = count * photoMM.w * photoMM.h;
    const totalArea = paperW * paperH;
    const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;

    return {
      paperW,
      paperH,
      cols,
      rows,
      count,
      positions,
      remainingWmm: usableW - gridW,
      remainingHmm: usableH - gridH,
      efficiency,
    };
  }

  /**
   * Menghitung berapa halaman dibutuhkan untuk sejumlah foto (batch mode),
   * dan mengelompokkan slot per orang (photosPerPerson) ke halamannya sendiri.
   */
  function paginateBatch(totalPhotosPerPerson, slotsPerPage) {
    if (slotsPerPage <= 0) return 0;
    return Math.ceil(totalPhotosPerPerson / slotsPerPage);
  }

  return { computeLayout, paginateBatch };
})();
