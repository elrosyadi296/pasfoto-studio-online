/**
 * storage.js
 * Menyimpan & memuat pengaturan terakhir pengguna dari localStorage,
 * sehingga saat halaman dibuka kembali konfigurasi masih tersedia.
 * NOTE: gambar (data foto) TIDAK disimpan di localStorage karena
 * ukurannya bisa besar & berpotensi melebihi kuota browser.
 */

const STORAGE_KEY = 'pasfoto_studio_settings_v1';

const defaultSettings = {
  darkMode: false,
  sizeKey: '3x4',
  customSizeMM: { w: 30, h: 40 },
  bgColor: '#DC2626',
  paperKey: 'A4',
  customPaperMM: { w: 210, h: 297 },
  orientation: 'portrait',
  marginMM: 5,
  gapMM: 2,
  cropMarks: true,
  border: false,
  photoNumber: false,
};

const SettingsStore = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultSettings };
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch (err) {
      console.warn('Gagal memuat pengaturan tersimpan:', err);
      return { ...defaultSettings };
    }
  },

  save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Gagal menyimpan pengaturan:', err);
    }
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return { ...defaultSettings };
  },
};
