/**
 * data.js
 * Data statis: ukuran pas foto, ukuran kertas, dan template cepat.
 * Semua ukuran disimpan dalam milimeter (mm) lalu dikonversi ke pixel
 * saat dibutuhkan (lihat utils.js -> mmToPx).
 */

const PHotoSizesIndonesia = [
  { key: '2x3',  label: '2 × 3 cm',  w: 20, h: 30 },
  { key: '3x4',  label: '3 × 4 cm',  w: 30, h: 40 },
  { key: '4x6',  label: '4 × 6 cm',  w: 40, h: 60 },
  { key: '4x4',  label: '4 × 4 cm',  w: 40, h: 40 },
  { key: '6x9',  label: '6 × 9 cm',  w: 60, h: 90 },
];

const PhotoSizesInternational = [
  { key: 'passport-id',  label: 'Passport Indonesia', w: 35, h: 45 },
  { key: 'passport-usa', label: 'Passport USA',        w: 51, h: 51 },
  { key: 'visa-schengen',label: 'Visa Schengen',       w: 35, h: 45 },
  { key: 'visa-jepang',  label: 'Visa Jepang',         w: 45, h: 45 },
  { key: 'visa-korea',   label: 'Visa Korea',          w: 35, h: 45 },
  { key: 'visa-australia',label:'Visa Australia',      w: 35, h: 45 },
  { key: 'visa-china',   label: 'Visa China',          w: 33, h: 48 },
  { key: 'passport-2x2', label: 'Passport 2×2 inch',   w: 51, h: 51 },
];

const PaperSizes = [
  { key: 'A4',     label: 'A4',     w: 210,   h: 297   },
  { key: 'A5',     label: 'A5',     w: 148,   h: 210   },
  { key: 'Letter', label: 'Letter', w: 215.9, h: 279.4 },
  { key: 'Legal',  label: 'Legal',  w: 215.9, h: 355.6 },
  { key: '4R',     label: '4R',     w: 101.6, h: 152.4 },
  { key: '5R',     label: '5R',     w: 127,   h: 177.8 },
  { key: '6R',     label: '6R',     w: 152.4, h: 203.2 },
];

// Template cepat -> otomatis set ukuran foto + warna latar
const QuickTemplates = [
  { key: 'cpns',    label: 'CPNS',      size: '4x6',         bg: '#DC2626' },
  { key: 'pppk',    label: 'PPPK',      size: '4x6',         bg: '#DC2626' },
  { key: 'sekolah', label: 'Sekolah',   size: '3x4',         bg: '#2563EB' },
  { key: 'kuliah',  label: 'Kuliah',    size: '3x4',         bg: '#DC2626' },
  { key: 'ktp',     label: 'KTP',       size: '3x4',         bg: '#DC2626' },
  { key: 'sim',     label: 'SIM',       size: '2x3',         bg: '#2563EB' },
  { key: 'bpjs',    label: 'BPJS',      size: '3x4',         bg: '#2563EB' },
  { key: 'passport',label: 'Passport',  size: 'passport-id', bg: '#FFFFFF' },
  { key: 'visa',    label: 'Visa',      size: 'visa-schengen',bg: '#FFFFFF' },
  { key: 'nikah',   label: 'Nikah',     size: '4x6',         bg: '#FFFFFF' },
  { key: 'kua',     label: 'KUA',       size: '3x4',         bg: '#2563EB' },
];

const BackgroundPresets = [
  { key: 'red',   label: 'Merah',    color: '#DC2626' },
  { key: 'blue',  label: 'Biru',     color: '#2563EB' },
  { key: 'white', label: 'Putih',    color: '#FFFFFF' },
  { key: 'gray',  label: 'Abu-Abu',  color: '#9CA3AF' },
  { key: 'black', label: 'Hitam',    color: '#111827' },
];

// Gabungan semua ukuran foto agar mudah dicari berdasarkan key
const AllPhotoSizes = [...PHotoSizesIndonesia, ...PhotoSizesInternational];

function findSizeByKey(key) {
  return AllPhotoSizes.find((s) => s.key === key) || null;
}

function findPaperByKey(key) {
  return PaperSizes.find((p) => p.key === key) || null;
}
