/**
 * exportModule.js
 * Merender layout cetak final ke satu <canvas> beresolusi tinggi (300 DPI),
 * lalu mengekspornya sebagai PNG, JPG, PDF, atau mengirim langsung ke Print.
 */

const ExportModule = (() => {
  /**
   * Render satu halaman layout cetak ke canvas.
   * slots: array of { photoCanvas, position (mm), sizeMM, index }
   * settings: { paperMM, cropMarks, border, photoNumber }
   */
  function renderPageCanvas(slots, layoutResult, settings) {
    const paperWpx = mmToPx(layoutResult.paperW);
    const paperHpx = mmToPx(layoutResult.paperH);

    const canvas = document.createElement('canvas');
    canvas.width = paperWpx;
    canvas.height = paperHpx;
    const ctx = canvas.getContext('2d');

    // latar kertas putih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, paperWpx, paperHpx);

    slots.forEach((slot, i) => {
      if (!slot.photoCanvas) return;
      const x = mmToPx(slot.position.x);
      const y = mmToPx(slot.position.y);
      const w = mmToPx(slot.position.w);
      const h = mmToPx(slot.position.h);

      ctx.drawImage(slot.photoCanvas, x, y, w, h);

      if (settings.border) {
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }

      if (settings.cropMarks) {
        drawCropMarks(ctx, x, y, w, h);
      }

      if (settings.photoNumber) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = `${mmToPx(2.6)}px Poppins, sans-serif`;
        ctx.fillText(String(i + 1), x + 3, y + h - 4);
      }
    });

    return canvas;
  }

  function drawCropMarks(ctx, x, y, w, h, len = 8) {
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    const corners = [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + len * dx, cy);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + len * dy);
      ctx.stroke();
    });
  }

  async function exportPNG(canvas, filename = 'pasfoto-layout.png') {
    const blob = await canvasToBlob(canvas, 'image/png', 1);
    downloadBlob(blob, filename);
  }

  async function exportJPG(canvas, filename = 'pasfoto-layout.jpg') {
    // JPG tidak mendukung transparansi -> pastikan latar putih
    const flat = document.createElement('canvas');
    flat.width = canvas.width;
    flat.height = canvas.height;
    const ctx = flat.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    const blob = await canvasToBlob(flat, 'image/jpeg', 0.95);
    downloadBlob(blob, filename);
  }

  /** Export satu atau banyak halaman (canvas[]) ke satu file PDF kualitas tinggi */
  function exportPDF(canvases, paperMM, filename = 'pasfoto-layout.pdf') {
    const { jsPDF } = window.jspdf;
    const orientation = paperMM.w > paperMM.h ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [paperMM.w, paperMM.h],
      compress: true,
    });

    canvases.forEach((canvas, i) => {
      if (i > 0) pdf.addPage([paperMM.w, paperMM.h], orientation);
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, paperMM.w, paperMM.h, undefined, 'FAST');
    });

    pdf.save(filename);
  }

  /** Kirim halaman langsung ke dialog print browser */
  function printCanvases(canvases) {
    const printWindow = window.open('', '_blank');
    const imgsHtml = canvases
      .map((c) => `<img src="${c.toDataURL('image/png')}" style="width:100%;display:block;page-break-after:always;" />`)
      .join('');
    printWindow.document.write(`
      <html>
        <head><title>Cetak Pas Foto</title>
        <style>
          @page { margin: 0; }
          body { margin: 0; }
          img:last-child { page-break-after: auto; }
        </style>
        </head>
        <body>${imgsHtml}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return { renderPageCanvas, exportPNG, exportJPG, exportPDF, printCanvases };
})();
