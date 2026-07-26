/**
 * upload.js
 * Menangani drag & drop upload, klik untuk pilih file, serta validasi
 * tipe & ukuran file. Mendukung upload banyak foto sekaligus (batch mode).
 */

const UploadModule = (() => {
  const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  function validateFile(file) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Format "${file.type || 'tidak dikenal'}" tidak didukung. Gunakan JPG, PNG, atau WEBP.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File "${file.name}" (${formatBytes(file.size)}) melebihi batas maksimal 20 MB.`;
    }
    return null;
  }

  /**
   * Proses FileList -> array of { file, image, error }
   */
  async function processFiles(fileList) {
    const files = Array.from(fileList);
    const results = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        results.push({ file, error });
        showToast(error, 'error');
        continue;
      }
      try {
        const image = await readFileAsImage(file);
        results.push({ file, image, error: null });
      } catch (err) {
        results.push({ file, error: 'Gagal membaca file gambar.' });
        showToast(`Gagal membaca "${file.name}".`, 'error');
      }
    }
    return results;
  }

  /** Pasang listener drag & drop pada elemen dropzone */
  function bindDropzone(dropzoneEl, inputEl, onFiles) {
    ['dragenter', 'dragover'].forEach((evt) => {
      dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-950/30');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-950/30');
      });
    });

    dropzoneEl.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) onFiles(files);
    });

    dropzoneEl.addEventListener('click', () => inputEl.click());

    inputEl.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) onFiles(e.target.files);
      inputEl.value = ''; // reset supaya file yang sama bisa diupload lagi
    });
  }

  return { validateFile, processFiles, bindDropzone, MAX_SIZE_BYTES, ACCEPTED_TYPES };
})();
