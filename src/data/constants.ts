import { Pegawai, PusatType, StatusProgram, SumberKewangan } from '../types/program';

export const PUSAT_LIST: PusatType[] = [
  'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI',
  'PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN',
];

export const JABATAN_MAP: Record<PusatType, string[]> = {
  'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI': [
    'JABATAN KECERDASAN BUATAN DAN INOVASI DIGITAL',
    'JABATAN PENGURUSAN SISTEM MAKLUMAT',
    'JABATAN PERANCANGAN DAN SENGGARAAN ICT',
  ],
  'PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN': [
    'JABATAN PEMBANGUNAN DAN KELESTARIAN INSTITUSI CEMERLANG',
    'JABATAN MEMPERKASA INSTITUSI PENDIDIKAN',
    'JABATAN KONSULTANSI DAN RUNDING CARA',
    'JABATAN LATIHAN KEPIMPINAN TEKNOLOGI DAN DIGITAL',
  ],
};

export const ALL_JABATAN_LIST: string[] = [
  ...JABATAN_MAP['PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI'],
  ...JABATAN_MAP['PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN'],
];

export const JENIS_PROGRAM_LIST: string[] = [
  'Kursus CPD IAB',
  'Kursus CPD PPPM',
  'NPQEL',
  'Bengkel',
  'Bengkel Kerja',
  'Mesyuarat',
  'Majlis',
  'Komensmen',
  'Taklimat',
  'Penyelidikan',
  'KKPP/KKKPP',
  'Konsultasi',
  'Taksiran',
  'Seminar',
  'Kolokium',
  'Audit',
  'Lawatan',
  'Luar (KPM)',
  'Pasukan Pemikir',
  'ePembelajaran NPQEL',
  'ePembelajaran (Tanpa Sijil)',
  'ePembelajaran (Sijil)',
];

export const PEGAWAI_LIST: Pegawai[] = [
  {
    id: 'Pegawai 1',
    nama: 'WAN AZROI BIN WAN JAMAL',
    label: 'Pegawai 1 (WAN AZROI BIN WAN JAMAL)',
    pusat: 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI',
    jabatan: 'JABATAN PENGURUSAN SISTEM MAKLUMAT',
    jawatan: 'KETUA JABATAN',
    emel: 'wanazroi@iab.moe.edu.my',
    noHp: '019-3456781',
  },
  {
    id: 'Pegawai 2',
    nama: 'SITI BINTI SAMAD',
    label: 'Pegawai 2 (SITI BINTI SAMAD)',
    pusat: 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI',
    jabatan: 'JABATAN KECERDASAN BUATAN DAN INOVASI DIGITAL',
    jawatan: 'PENSYARAH CEMERLANG',
    emel: 'siti.samad@iab.moe.edu.my',
    noHp: '012-9876543',
  },
  {
    id: 'Pegawai 3',
    nama: 'DR. AHMAD FAIZAL BIN MOHD',
    label: 'Pegawai 3 (DR. AHMAD FAIZAL BIN MOHD)',
    pusat: 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI',
    jabatan: 'JABATAN PERANCANGAN DAN SENGGARAAN ICT',
    jawatan: 'PENSYARAH KANAN',
    emel: 'ahmad.faizal@iab.moe.edu.my',
    noHp: '013-4567890',
  },
  {
    id: 'Pegawai 4',
    nama: 'NORLIZA BINTI HASSAN',
    label: 'Pegawai 4 (NORLIZA BINTI HASSAN)',
    pusat: 'PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN',
    jabatan: 'JABATAN PEMBANGUNAN DAN KELESTARIAN INSTITUSI CEMERLANG',
    jawatan: 'PENSYARAH KANAN',
    emel: 'norliza.hassan@iab.moe.edu.my',
    noHp: '017-2345678',
  },
  {
    id: 'Pegawai 5',
    nama: 'MOHD RADZI BIN ISMAIL',
    label: 'Pegawai 5 (MOHD RADZI BIN ISMAIL)',
    pusat: 'PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN',
    jabatan: 'JABATAN MEMPERKASA INSTITUSI PENDIDIKAN',
    jawatan: 'PENSYARAH',
    emel: 'radzi.ismail@iab.moe.edu.my',
    noHp: '018-7654321',
  },
  {
    id: 'Pegawai 6',
    nama: 'ZURAINI BINTI ABDULLAH',
    label: 'Pegawai 6 (ZURAINI BINTI ABDULLAH)',
    pusat: 'PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN',
    jabatan: 'JABATAN KONSULTANSI DAN RUNDING CARA',
    jawatan: 'KETUA PUSAT',
    emel: 'zuraini@iab.moe.edu.my',
    noHp: '019-8765432',
  },
];

export const DEFAULT_JAWATAN_LIST: string[] = [
  'PENGARAH',
  'TIMBALAN PENGARAH KANAN',
  'KETUA PUSAT',
  'KETUA JABATAN',
  'PENSYARAH CEMERLANG',
  'PENSYARAH KANAN',
  'PENSYARAH',
  'LAIN-LAIN',
];

export const NEGERI_LIST: string[] = [
  'JOHOR',
  'KEDAH',
  'KELANTAN',
  'MELAKA',
  'NEGERI SEMBILAN',
  'PAHANG',
  'PERAK',
  'PERLIS',
  'PULAU PINANG',
  'SABAH',
  'SARAWAK',
  'SELANGOR',
  'TERENGGANU',
  'W.P. KUALA LUMPUR',
  'W.P. LABUAN',
  'W.P. PUTRAJAYA',
];

export const SUMBER_KEWANGAN_LIST: SumberKewangan[] = [
  'IAB – LATIHAN',
  'IAB - PENGURUSAN',
  'BSTP',
  'BPG',
  'BPK',
];

export const STATUS_PROGRAM_LIST: StatusProgram[] = [
  'SELESAI',
  'DALAM TINDAKAN',
  'TANGGUNG',
  'BELUM AMBIL TINDAKAN',
  'BATAL',
];

export const BULAN_LIST = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Mac' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Julai' },
  { value: 8, label: 'Ogos' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Disember' },
];

export const TAHUN_LIST = [2025, 2026, 2027];
