/**
 * faceDetection.js
 * Deteksi wajah otomatis menggunakan face-api.js (TinyFaceDetector).
 * Jika library / model gagal dimuat (mis. tidak ada koneksi internet),
 * fitur ini akan gagal secara elegan dan pengguna tetap bisa memposisikan
 * crop secara manual — fitur inti aplikasi tidak bergantung pada ini.
 */

const FaceDetection = (() => {
  const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
  let modelsLoaded = false;
  let loadingPromise = null;

  async function ensureModelsLoaded() {
    if (modelsLoaded) return true;
    if (typeof faceapi === 'undefined') return false;

    if (!loadingPromise) {
      loadingPromise = faceapi.nets.tinyFaceDetector
        .loadFromUri(MODEL_URL)
        .then(() => {
          modelsLoaded = true;
          return true;
        })
        .catch((err) => {
          console.warn('Gagal memuat model deteksi wajah:', err);
          return false;
        });
    }
    return loadingPromise;
  }

  /**
   * Deteksi wajah pada elemen <img>. Mengembalikan bounding box wajah
   * relatif terhadap ukuran asli gambar, atau null jika tidak terdeteksi.
   */
  async function detectFace(imgEl) {
    const ok = await ensureModelsLoaded();
    if (!ok) return null;
    try {
      const detection = await faceapi.detectSingleFace(
        imgEl,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      );
      if (!detection) return null;
      const box = detection.box;
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        centerX: box.x + box.width / 2,
        centerY: box.y + box.height / 2,
      };
    } catch (err) {
      console.warn('Deteksi wajah gagal:', err);
      return null;
    }
  }

  /**
   * Hitung crop box ideal (posisi & ukuran) agar kepala berada di tengah
   * dengan proporsi standar pas foto (wajah mengisi ~70-75% tinggi crop,
   * dengan ruang di atas kepala secukupnya).
   */
  function computeIdealCropBox(face, imgWidth, imgHeight, aspectRatio) {
    // Perkiraan tinggi kepala penuh (dari dagu ke atas rambut) ~1.6x tinggi bbox wajah
    const headHeight = face.height * 1.7;
    const cropHeight = headHeight / 0.7; // wajah+kepala mengisi 70% tinggi frame
    const cropWidth = cropHeight * aspectRatio;

    let cropX = face.centerX - cropWidth / 2;
    // beri ruang lebih di atas kepala dibanding di bawah dagu
    let cropY = face.y - headHeight * 0.35 - (cropHeight - headHeight) * 0.15;

    cropX = clamp(cropX, 0, Math.max(0, imgWidth - cropWidth));
    cropY = clamp(cropY, 0, Math.max(0, imgHeight - cropHeight));

    return {
      x: cropX,
      y: cropY,
      width: Math.min(cropWidth, imgWidth),
      height: Math.min(cropHeight, imgHeight),
    };
  }

  return { ensureModelsLoaded, detectFace, computeIdealCropBox };
})();
