/**
 * main.js
 * Orkestrasi utama aplikasi: state global, wiring UI, editor modal,
 * grid layout interaktif, panel pengaturan, dan proses export.
 */

const App = {
  photos: [],       // { id, name, originalSrc, thumbSrc, sizeKey, customSizeMM, bgColor,
                     //   filters, rotation, flipH, flipV, cropData, canvasZoom,
                     //   bakedCanvas, slotCount, removeBg }
  activePhotoId: null,
  previewPhotoId: null,
  settings: null,    // dari SettingsStore
  isCustomSize: false,
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  App.settings = SettingsStore.load();
  applyDarkMode(App.settings.darkMode);
  buildFilterSliders();
  populateSizeOptions();
  populatePaperOptions();
  populateTemplates();
  populateBackgroundPresets();
  restoreSettingsToUI();
  bindGlobalEvents();
  bindUploadZone();
  bindEditorControls();
  bindSettingsPanel();
  renderPhotoList();
  renderEmptyPreview();
}

/* ---------------------------------------------------------------------- */
/*  Filter sliders (dibangun secara dinamis dari template)                  */
/* ---------------------------------------------------------------------- */

const FILTER_CONFIG = {
  brightness: { label: 'Brightness', min: 0, max: 200, default: 100 },
  contrast: { label: 'Contrast', min: 0, max: 200, default: 100 },
  saturation: { label: 'Saturation', min: 0, max: 200, default: 100 },
  blur: { label: 'Blur', min: 0, max: 10, default: 0 },
  sharpen: { label: 'Sharpen', min: 0, max: 100, default: 0 },
};

function buildFilterSliders() {
  const template = document.getElementById('filterSliderTemplate');
  Object.entries(FILTER_CONFIG).forEach(([key, cfg]) => {
    const row = document.getElementById(`filterRow_${key}`);
    if (!row) return;
    const clone = template.content.cloneNode(true);
    clone.querySelector('span.capitalize').textContent = cfg.label;
    const valueLabel = clone.querySelector('span.font-semibold');
    valueLabel.id = `filter_${key}_val`;
    valueLabel.textContent = cfg.default;
    const slider = clone.querySelector('input[type="range"]');
    slider.id = `filter_${key}`;
    slider.min = cfg.min;
    slider.max = cfg.max;
    slider.value = cfg.default;
    row.appendChild(clone);
  });
}

/* ---------------------------------------------------------------------- */
/*  Dark Mode                                                              */
/* ---------------------------------------------------------------------- */

function applyDarkMode(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
}

function bindGlobalEvents() {
  const toggle = document.getElementById('darkModeToggle');
  toggle.checked = App.settings.darkMode;
  toggle.addEventListener('change', () => {
    App.settings.darkMode = toggle.checked;
    applyDarkMode(toggle.checked);
    persistSettings();
  });

  document.getElementById('resetSettingsBtn').addEventListener('click', () => {
    App.settings = SettingsStore.reset();
    applyDarkMode(App.settings.darkMode);
    restoreSettingsToUI();
    showToast('Pengaturan dikembalikan ke default.', 'success');
    if (App.previewPhotoId) renderLayoutPreview();
  });

  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.toggle('hidden');
  });
}

/* ---------------------------------------------------------------------- */
/*  Upload                                                                  */
/* ---------------------------------------------------------------------- */

function bindUploadZone() {
  const dropzone = document.getElementById('dropzone');
  const input = document.getElementById('fileInput');

  UploadModule.bindDropzone(dropzone, input, async (fileList) => {
    setLoading(true, 'Mengunggah foto...');
    const results = await UploadModule.processFiles(fileList);
    for (const r of results) {
      if (r.error) continue;
      await addPhoto(r.file, r.image);
    }
    setLoading(false);
    renderPhotoList();
    if (!App.activePhotoId && App.photos.length) {
      openEditor(App.photos[0].id);
    }
    showToast(`${results.filter((r) => !r.error).length} foto berhasil diunggah.`, 'success');
  });
}

async function addPhoto(file, image) {
  const id = uid();
  const photo = {
    id,
    name: file.name,
    originalSrc: image.src,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    sizeKey: App.settings.sizeKey,
    customSizeMM: { ...App.settings.customSizeMM },
    bgColor: App.settings.bgColor,
    filters: { ...PhotoEditor.defaultFilters },
    rotation: 0,
    flipH: false,
    flipV: false,
    cropData: null,
    bakedCanvas: null,
    slotCount: null, // null = auto (isi penuh halaman)
    removeBg: false,
  };
  App.photos.push(photo);

  // Coba deteksi wajah di background agar crop awal lebih tepat (best-effort)
  FaceDetection.detectFace(image).then((face) => {
    if (face) photo.detectedFace = face;
  });

  return photo;
}

/* ---------------------------------------------------------------------- */
/*  Daftar foto (sidebar)                                                   */
/* ---------------------------------------------------------------------- */

function renderPhotoList() {
  const list = document.getElementById('photoList');
  const emptyState = document.getElementById('photoListEmpty');
  const countBadge = document.getElementById('photoCount');
  if (countBadge) countBadge.textContent = App.photos.length;
  list.innerHTML = '';

  if (!App.photos.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  App.photos.forEach((photo) => {
    const card = document.createElement('div');
    card.className = `group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
      photo.id === App.previewPhotoId
        ? 'border-blue-600 shadow-lg shadow-blue-600/20'
        : 'border-transparent hover:border-blue-300'
    }`;
    card.innerHTML = `
      <img src="${photo.bakedCanvas ? photo.bakedCanvas.toDataURL() : photo.originalSrc}" class="w-full h-24 object-cover bg-gray-100 dark:bg-slate-800" />
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        <p class="text-[11px] text-white truncate font-medium">${photo.name}</p>
      </div>
      ${photo.bakedCanvas ? '<span class="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">Siap</span>' : ''}
      <button data-action="delete" class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'delete') {
        deletePhoto(photo.id);
        return;
      }
      openEditor(photo.id);
    });
    list.appendChild(card);
  });
}

function deletePhoto(id) {
  App.photos = App.photos.filter((p) => p.id !== id);
  if (App.activePhotoId === id) App.activePhotoId = null;
  if (App.previewPhotoId === id) App.previewPhotoId = null;
  renderPhotoList();
  if (!App.photos.length) renderEmptyPreview();
  showToast('Foto dihapus.', 'info');
}

/* ---------------------------------------------------------------------- */
/*  Editor Modal                                                            */
/* ---------------------------------------------------------------------- */

function openEditor(photoId) {
  const photo = App.photos.find((p) => p.id === photoId);
  if (!photo) return;
  App.activePhotoId = photoId;

  document.getElementById('editorModal').classList.remove('hidden');
  document.getElementById('editorModal').classList.add('flex');

  PhotoEditor.openPhoto(photo);
  syncFilterSlidersFromPhoto(photo);
  syncSizeSelectFromPhoto(photo);
  syncBgFromPhoto(photo);

  // Jika wajah sudah terdeteksi lebih dulu, tawarkan auto-center
  const autoBtn = document.getElementById('autoFaceBtn');
  autoBtn.disabled = false;
}

function closeEditor() {
  document.getElementById('editorModal').classList.add('hidden');
  document.getElementById('editorModal').classList.remove('flex');
  PhotoEditor.destroy();
}

function bindEditorControls() {
  document.getElementById('closeEditorBtn').addEventListener('click', closeEditor);

  document.getElementById('rotateLeftBtn').addEventListener('click', () => PhotoEditor.rotate(-90));
  document.getElementById('rotateRightBtn').addEventListener('click', () => PhotoEditor.rotate(90));
  document.getElementById('flipHBtn').addEventListener('click', () => PhotoEditor.flipHorizontal());
  document.getElementById('flipVBtn').addEventListener('click', () => PhotoEditor.flipVertical());
  document.getElementById('zoomInBtn').addEventListener('click', () => PhotoEditor.zoom(0.1));
  document.getElementById('zoomOutBtn').addEventListener('click', () => PhotoEditor.zoom(-0.1));
  document.getElementById('resetEditBtn').addEventListener('click', () => {
    PhotoEditor.resetAll();
    const photo = PhotoEditor.getCurrentPhoto();
    syncFilterSlidersFromPhoto(photo);
    showToast('Perubahan direset.', 'info');
  });

  ['brightness', 'contrast', 'saturation', 'blur', 'sharpen'].forEach((key) => {
    const slider = document.getElementById(`filter_${key}`);
    const valueLabel = document.getElementById(`filter_${key}_val`);
    slider.addEventListener('input', () => {
      valueLabel.textContent = slider.value;
      const photo = PhotoEditor.getCurrentPhoto();
      if (!photo) return;
      const filters = { ...photo.filters, [key]: Number(slider.value) };
      PhotoEditor.applyFilterPreview(filters);
    });
  });

  document.getElementById('autoFaceBtn').addEventListener('click', handleAutoFaceCenter);
  document.getElementById('removeBgToggle').addEventListener('change', (e) => {
    const photo = PhotoEditor.getCurrentPhoto();
    if (photo) photo.removeBg = e.target.checked;
  });

  document.getElementById('applyEditBtn').addEventListener('click', applyCurrentEdit);
}

async function handleAutoFaceCenter() {
  const photo = PhotoEditor.getCurrentPhoto();
  if (!photo) return;
  setLoading(true, 'Mendeteksi wajah...');
  const img = document.querySelector('#cropStage img');
  const face = await FaceDetection.detectFace(img);
  setLoading(false);
  if (!face) {
    showToast('Wajah tidak terdeteksi. Silakan atur posisi crop secara manual.', 'error');
    return;
  }
  const size = getEffectiveSizeMM(photo);
  const box = FaceDetection.computeIdealCropBox(face, img.naturalWidth, img.naturalHeight, size.w / size.h);
  PhotoEditor.setAspectRatio(size.w, size.h);
  PhotoEditor.setCropBox(box);
  showToast('Kepala berhasil diposisikan otomatis.', 'success');
}

function syncFilterSlidersFromPhoto(photo) {
  const f = photo.filters || PhotoEditor.defaultFilters;
  Object.entries(f).forEach(([key, val]) => {
    const slider = document.getElementById(`filter_${key}`);
    const label = document.getElementById(`filter_${key}_val`);
    if (slider) {
      slider.value = val;
      label.textContent = val;
    }
  });
  document.getElementById('removeBgToggle').checked = !!photo.removeBg;
}

function syncSizeSelectFromPhoto(photo) {
  const select = document.getElementById('sizeSelectEditor');
  select.value = photo.sizeKey || App.settings.sizeKey;
  toggleCustomSizeInputs(select.value === 'custom');
  if (photo.customSizeMM) {
    document.getElementById('customSizeW').value = photo.customSizeMM.w;
    document.getElementById('customSizeH').value = photo.customSizeMM.h;
  }
  const size = getEffectiveSizeMM(photo);
  PhotoEditor.setAspectRatio(size.w, size.h);
}

function syncBgFromPhoto(photo) {
  document.getElementById('customBgColor').value = photo.bgColor || '#DC2626';
  highlightActiveBgSwatch(photo.bgColor);
}

function getEffectiveSizeMM(photo) {
  if (photo.sizeKey === 'custom') return photo.customSizeMM;
  const s = findSizeByKey(photo.sizeKey);
  return s ? { w: s.w, h: s.h } : { w: 30, h: 40 };
}

async function applyCurrentEdit() {
  const photo = PhotoEditor.getCurrentPhoto();
  if (!photo) return;
  setLoading(true, 'Menerapkan perubahan...');

  const size = getEffectiveSizeMM(photo);
  const targetW = mmToPx(size.w);
  const targetH = mmToPx(size.h);

  try {
    let canvas = await PhotoEditor.renderCroppedCanvas(photo, targetW, targetH);
    if (photo.removeBg) {
      canvas = BackgroundTool.autoRemoveBackground(canvas);
    }
    canvas = BackgroundTool.compositeOnBackground(canvas, photo.bgColor);
    photo.bakedCanvas = canvas;
    photo.slotCount = null; // reset supaya auto-fill dihitung ulang dgn ukuran baru
  } catch (err) {
    console.error(err);
    showToast('Gagal memproses foto. Coba lagi.', 'error');
    setLoading(false);
    return;
  }

  setLoading(false);
  renderPhotoList();
  App.previewPhotoId = photo.id;
  closeEditor();
  renderLayoutPreview();
  showToast('Foto berhasil diperbarui.', 'success');
}

/* ---------------------------------------------------------------------- */
/*  Size / Background / Template pickers (shared UI populate)               */
/* ---------------------------------------------------------------------- */

function populateSizeOptions() {
  const select = document.getElementById('sizeSelectEditor');
  const groups = [
    { label: 'Ukuran Indonesia', items: PHotoSizesIndonesia },
    { label: 'Ukuran Internasional', items: PhotoSizesInternational },
  ];
  select.innerHTML = '';
  groups.forEach((g) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = g.label;
    g.items.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.key;
      opt.textContent = `${s.label}`;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Ukuran Kustom...';
  select.appendChild(customOpt);

  select.addEventListener('change', () => {
    const isCustom = select.value === 'custom';
    toggleCustomSizeInputs(isCustom);
    const photo = PhotoEditor.getCurrentPhoto();
    if (!photo) return;
    photo.sizeKey = select.value;
    const size = getEffectiveSizeMM(photo);
    PhotoEditor.setAspectRatio(size.w, size.h);
  });

  ['customSizeW', 'customSizeH', 'customSizeUnit'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      const photo = PhotoEditor.getCurrentPhoto();
      if (!photo) return;
      const unit = document.getElementById('customSizeUnit').value;
      let w = Number(document.getElementById('customSizeW').value) || 0;
      let h = Number(document.getElementById('customSizeH').value) || 0;
      if (unit === 'cm') { w = cmToMm(w); h = cmToMm(h); }
      photo.customSizeMM = { w, h };
      if (photo.sizeKey === 'custom' && w > 0 && h > 0) {
        PhotoEditor.setAspectRatio(w, h);
      }
    });
  });
}

function toggleCustomSizeInputs(show) {
  document.getElementById('customSizeInputs').classList.toggle('hidden', !show);
}

function populateBackgroundPresets() {
  const container = document.getElementById('bgPresets');
  container.innerHTML = '';
  BackgroundPresets.forEach((bg) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.color = bg.color;
    btn.title = bg.label;
    btn.className = 'w-9 h-9 rounded-full border-2 border-white dark:border-slate-700 shadow ring-1 ring-black/10 hover:scale-110 transition-transform';
    btn.style.backgroundColor = bg.color;
    btn.addEventListener('click', () => setBgColor(bg.color));
    container.appendChild(btn);
  });

  // tombol transparan
  const transparentBtn = document.createElement('button');
  transparentBtn.type = 'button';
  transparentBtn.title = 'Transparan';
  transparentBtn.className = 'w-9 h-9 rounded-full border-2 border-dashed border-gray-400 checkerboard hover:scale-110 transition-transform';
  transparentBtn.addEventListener('click', () => setBgColor('transparent'));
  container.appendChild(transparentBtn);

  document.getElementById('customBgColor').addEventListener('input', (e) => setBgColor(e.target.value));
}

function setBgColor(color) {
  const photo = PhotoEditor.getCurrentPhoto();
  if (!photo) return;
  photo.bgColor = color;
  highlightActiveBgSwatch(color);
}

function highlightActiveBgSwatch(color) {
  document.querySelectorAll('#bgPresets button[data-color]').forEach((btn) => {
    btn.classList.toggle('ring-4', btn.dataset.color === color);
    btn.classList.toggle('ring-blue-400', btn.dataset.color === color);
  });
}

function populateTemplates() {
  const container = document.getElementById('templateList');
  container.innerHTML = '';
  QuickTemplates.forEach((tpl) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-colors';
    btn.textContent = tpl.label;
    btn.addEventListener('click', () => applyTemplate(tpl));
    container.appendChild(btn);
  });
}

function applyTemplate(tpl) {
  const photo = PhotoEditor.getCurrentPhoto();
  const select = document.getElementById('sizeSelectEditor');
  select.value = tpl.size;
  toggleCustomSizeInputs(false);
  setBgColor(tpl.bg);
  document.getElementById('customBgColor').value = tpl.bg;
  if (photo) {
    photo.sizeKey = tpl.size;
    photo.bgColor = tpl.bg;
    const size = getEffectiveSizeMM(photo);
    PhotoEditor.setAspectRatio(size.w, size.h);
  }
  showToast(`Template "${tpl.label}" diterapkan.`, 'success');
}

/* ---------------------------------------------------------------------- */
/*  Panel Pengaturan (kertas & layout)                                      */
/* ---------------------------------------------------------------------- */

function populatePaperOptions() {
  const select = document.getElementById('paperSelect');
  select.innerHTML = '';
  PaperSizes.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.key;
    opt.textContent = `${p.label} (${p.w}×${p.h} mm)`;
    select.appendChild(opt);
  });
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Custom Paper...';
  select.appendChild(customOpt);
}

function restoreSettingsToUI() {
  const s = App.settings;
  document.getElementById('paperSelect').value = s.paperKey;
  document.getElementById('customPaperInputs').classList.toggle('hidden', s.paperKey !== 'custom');
  document.getElementById('customPaperW').value = s.customPaperMM.w;
  document.getElementById('customPaperH').value = s.customPaperMM.h;
  document.getElementById('marginInput').value = s.marginMM;
  document.getElementById('gapInput').value = s.gapMM;
  document.getElementById('cropMarksToggle').checked = s.cropMarks;
  document.getElementById('borderToggle').checked = s.border;
  document.getElementById('photoNumberToggle').checked = s.photoNumber;
  document.querySelectorAll('input[name="orientation"]').forEach((r) => {
    r.checked = r.value === s.orientation;
  });
}

function bindSettingsPanel() {
  document.getElementById('paperSelect').addEventListener('change', (e) => {
    App.settings.paperKey = e.target.value;
    document.getElementById('customPaperInputs').classList.toggle('hidden', e.target.value !== 'custom');
    persistSettings();
    renderLayoutPreview();
  });

  ['customPaperW', 'customPaperH'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      App.settings.customPaperMM = {
        w: Number(document.getElementById('customPaperW').value) || 0,
        h: Number(document.getElementById('customPaperH').value) || 0,
      };
      persistSettings();
      renderLayoutPreview();
    });
  });

  document.querySelectorAll('input[name="orientation"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (r.checked) {
        App.settings.orientation = r.value;
        persistSettings();
        renderLayoutPreview();
      }
    });
  });

  document.getElementById('marginInput').addEventListener('input', (e) => {
    App.settings.marginMM = Number(e.target.value) || 0;
    persistSettings();
    renderLayoutPreview();
  });

  document.getElementById('gapInput').addEventListener('input', (e) => {
    App.settings.gapMM = Number(e.target.value) || 0;
    persistSettings();
    renderLayoutPreview();
  });

  ['cropMarksToggle', 'borderToggle', 'photoNumberToggle'].forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      const map = { cropMarksToggle: 'cropMarks', borderToggle: 'border', photoNumberToggle: 'photoNumber' };
      App.settings[map[id]] = e.target.checked;
      persistSettings();
      renderLayoutPreview();
    });
  });

  document.getElementById('previewZoom').addEventListener('input', (e) => {
    const stage = document.getElementById('layoutStage');
    if (stage) stage.style.transform = `scale(${e.target.value})`;
  });

  document.getElementById('toggleGridBtn').addEventListener('click', () => {
    document.getElementById('layoutStage')?.classList.toggle('show-grid');
  });
  document.getElementById('toggleRulerBtn').addEventListener('click', () => {
    document.getElementById('rulerOverlay')?.classList.toggle('hidden');
  });

  document.getElementById('slotCountInput').addEventListener('change', (e) => {
    const photo = App.photos.find((p) => p.id === App.previewPhotoId);
    if (!photo) return;
    const val = Number(e.target.value);
    photo.slotCount = val > 0 ? val : null;
    renderLayoutPreview();
  });

  document.getElementById('fillFullBtn').addEventListener('click', () => {
    const photo = App.photos.find((p) => p.id === App.previewPhotoId);
    if (!photo) return;
    photo.slotCount = null;
    renderLayoutPreview();
  });
}

function persistSettings() {
  SettingsStore.save(App.settings);
}

function getPaperMM() {
  if (App.settings.paperKey === 'custom') return App.settings.customPaperMM;
  const p = findPaperByKey(App.settings.paperKey);
  return p ? { w: p.w, h: p.h } : { w: 210, h: 297 };
}

/* ---------------------------------------------------------------------- */
/*  Layout Preview (grid interaktif)                                        */
/* ---------------------------------------------------------------------- */

function renderEmptyPreview() {
  const stage = document.getElementById('layoutStage');
  stage.innerHTML = `
    <div class="w-full h-full min-h-[320px] flex flex-col items-center justify-center text-gray-400 dark:text-slate-600 gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V5.25A1.5 1.5 0 0021 3.75H3A1.5 1.5 0 001.5 5.25v13.5A1.5 1.5 0 003 20.25z" /></svg>
      <p class="text-sm">Unggah & edit foto untuk melihat hasil layout cetak</p>
    </div>`;
  document.getElementById('layoutInfo').textContent = '—';
}

function renderLayoutPreview() {
  const photo = App.photos.find((p) => p.id === App.previewPhotoId);
  const stage = document.getElementById('layoutStage');
  if (!photo || !photo.bakedCanvas) {
    renderEmptyPreview();
    return;
  }

  const size = getEffectiveSizeMM(photo);
  const paperMM = getPaperMM();
  const layout = LayoutEngine.computeLayout(
    paperMM,
    size,
    App.settings.marginMM,
    App.settings.gapMM,
    App.settings.orientation
  );

  const maxCount = layout.count;
  const requestedCount = photo.slotCount || maxCount;
  const finalCount = clamp(requestedCount, 0, maxCount);

  document.getElementById('slotCountInput').max = maxCount;
  document.getElementById('slotCountInput').value = finalCount;

  // render kertas sebagai kotak berskala (1mm = 3px agar pas di layar)
  const SCALE = 2.5;
  stage.style.width = `${layout.paperW * SCALE}px`;
  stage.style.height = `${layout.paperH * SCALE}px`;
  stage.style.position = 'relative';
  stage.className = 'relative bg-white shadow-2xl shadow-black/20 border border-gray-200 mx-auto transition-transform origin-top';
  stage.innerHTML = '';

  photo.slots = photo.slots || [];
  // sinkronkan jumlah slot array dengan finalCount
  while (photo.slots.length < finalCount) photo.slots.push(true);
  photo.slots.length = finalCount;

  layout.positions.slice(0, finalCount).forEach((pos, i) => {
    const cell = document.createElement('div');
    cell.className = 'group absolute overflow-hidden border border-dashed border-gray-300 hover:border-blue-500 cursor-grab';
    cell.style.left = `${pos.x * SCALE}px`;
    cell.style.top = `${pos.y * SCALE}px`;
    cell.style.width = `${pos.w * SCALE}px`;
    cell.style.height = `${pos.h * SCALE}px`;
    cell.draggable = true;
    cell.dataset.index = i;

    const img = document.createElement('img');
    img.src = photo.bakedCanvas.toDataURL();
    img.className = 'w-full h-full object-cover pointer-events-none';
    if (photo.bgColor === 'transparent') img.classList.add('checkerboard');
    cell.appendChild(img);

    if (App.settings.border) cell.classList.add('ring-1', 'ring-gray-400');

    if (App.settings.photoNumber) {
      const badge = document.createElement('span');
      badge.className = 'absolute bottom-0.5 left-1 text-[9px] bg-black/60 text-white px-1 rounded';
      badge.textContent = i + 1;
      cell.appendChild(badge);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center leading-none';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      photo.slots.splice(i, 1);
      photo.slotCount = photo.slots.length;
      renderLayoutPreview();
    });
    cell.appendChild(removeBtn);

    const dupBtn = document.createElement('button');
    dupBtn.className = 'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center leading-none';
    dupBtn.textContent = '+';
    dupBtn.title = 'Gandakan';
    dupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (photo.slots.length >= maxCount) {
        showToast('Halaman sudah penuh.', 'info');
        return;
      }
      photo.slots.splice(i, 0, true);
      photo.slotCount = photo.slots.length;
      renderLayoutPreview();
    });
    cell.appendChild(dupBtn);

    // drag reorder sederhana antar slot
    cell.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', i);
    });
    cell.addEventListener('dragover', (e) => e.preventDefault());
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('text/plain'));
      const to = i;
      const [moved] = photo.slots.splice(from, 1);
      photo.slots.splice(to, 0, moved);
      renderLayoutPreview();
    });

    stage.appendChild(cell);
  });

  document.getElementById('layoutInfo').innerHTML = `
    Kertas <b>${App.settings.paperKey === 'custom' ? 'Custom' : App.settings.paperKey}</b> (${layout.paperW}×${layout.paperH} mm) ·
    Foto <b>${size.w}×${size.h} mm</b> ·
    <b>${finalCount}/${maxCount}</b> foto muat ·
    Efisiensi ${layout.efficiency.toFixed(0)}%
  `;
}

/* ---------------------------------------------------------------------- */
/*  Export                                                                  */
/* ---------------------------------------------------------------------- */

function buildSlotsForExport(photo) {
  const size = getEffectiveSizeMM(photo);
  const paperMM = getPaperMM();
  const layout = LayoutEngine.computeLayout(
    paperMM, size, App.settings.marginMM, App.settings.gapMM, App.settings.orientation
  );
  const count = clamp(photo.slotCount || layout.count, 0, layout.count);
  const slots = layout.positions.slice(0, count).map((pos) => ({
    photoCanvas: photo.bakedCanvas,
    position: pos,
  }));
  return { slots, layout };
}

function bindExportButtons() {
  document.getElementById('downloadPngBtn').addEventListener('click', () => exportCurrent('png'));
  document.getElementById('downloadJpgBtn').addEventListener('click', () => exportCurrent('jpg'));
  document.getElementById('downloadPdfBtn').addEventListener('click', () => exportAllPdf());
  document.getElementById('printBtn').addEventListener('click', () => printAll());
}

async function exportCurrent(type) {
  const photo = App.photos.find((p) => p.id === App.previewPhotoId);
  if (!photo || !photo.bakedCanvas) {
    showToast('Belum ada foto yang siap dicetak.', 'error');
    return;
  }
  setLoading(true, 'Menyiapkan file...');
  const { slots, layout } = buildSlotsForExport(photo);
  const canvas = ExportModule.renderPageCanvas(slots, layout, App.settings);
  if (type === 'png') await ExportModule.exportPNG(canvas, `pasfoto-${photo.name}.png`);
  else await ExportModule.exportJPG(canvas, `pasfoto-${photo.name}.jpg`);
  setLoading(false);
  showToast('File berhasil diunduh.', 'success');
}

function getAllReadyPhotos() {
  return App.photos.filter((p) => p.bakedCanvas);
}

async function exportAllPdf() {
  const ready = getAllReadyPhotos();
  if (!ready.length) {
    showToast('Belum ada foto yang siap dicetak.', 'error');
    return;
  }
  setLoading(true, 'Membuat PDF...');
  const paperMM = getPaperMM();
  const canvases = ready.map((photo) => {
    const { slots, layout } = buildSlotsForExport(photo);
    return ExportModule.renderPageCanvas(slots, layout, App.settings);
  });
  ExportModule.exportPDF(canvases, paperMM, 'pasfoto-layout.pdf');
  setLoading(false);
  showToast(`PDF berisi ${canvases.length} halaman berhasil dibuat.`, 'success');
}

function printAll() {
  const ready = getAllReadyPhotos();
  if (!ready.length) {
    showToast('Belum ada foto yang siap dicetak.', 'error');
    return;
  }
  const canvases = ready.map((photo) => {
    const { slots, layout } = buildSlotsForExport(photo);
    return ExportModule.renderPageCanvas(slots, layout, App.settings);
  });
  ExportModule.printCanvases(canvases);
}

document.addEventListener('DOMContentLoaded', bindExportButtons);
