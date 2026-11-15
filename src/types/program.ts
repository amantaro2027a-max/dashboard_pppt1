export type PusatType = 
  | 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI'
  | 'PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN'
  | string;

export type StatusProgram = 
  | 'SELESAI'
  | 'DALAM TINDAKAN'
  | 'TANGGUNG'
  | 'BELUM AMBIL TINDAKAN'
  | 'BATAL'
  | string;

export type SumberKewangan = 
  | 'IAB – LATIHAN'
  | 'IAB - PENGURUSAN'
  | 'BSTP'
  | 'BPG'
  | 'BPK'
  | string;

export interface Pegawai {
  id: string; // e.g. 'Pegawai 1'
  label: string; // e.g. 'Pegawai 1 (WAN AZROI BIN WAN JAMAL)'
  nama: string; // e.g. 'WAN AZROI BIN WAN JAMAL'
  pusat?: string;
  jabatan?: string;
  jawatan?: string;
  emel?: string;
  noHp?: string;
}

export interface ProgramItem {
  id: string;
  namaProgram: string;
  kodProgram: string;
  jenisProgram: string;
  tarikhMula: string; // YYYY-MM-DD
  tarikhTamat: string; // YYYY-MM-DD
  tempoh: string; // e.g. "2/6/2026 - 05/6/2026"
  jumlahHari: number; // e.g. 4
  tempat: string;
  negeri: string;
  bilanganPeserta: number;
  pengurusId: string; // e.g. 'Pegawai 1'
  pengurusNama: string; // e.g. 'WAN AZROI BIN WAN JAMAL'
  pengurusBersamaId: string; // e.g. 'Pegawai 2'
  pengurusBersamaNama: string; // e.g. 'SITI BINTI SAMAD'
  pusat: PusatType;
  jabatan: string;
  sumberKewangan: SumberKewangan;
  // Peruntukan Diterima
  os21000: number; // OS21 (RM)
  os24000: number; // OS24 (RM)
  os27000: number; // OS27 (RM)
  os29000: number; // OS29 (RM)
  jumlahRm: number; // Total Peruntukan Diterima RM
  // Peruntukan Dibelanjakan (Belanja Sebenar)
  os21000Belanja?: number;
  os24000Belanja?: number;
  os27000Belanja?: number;
  os29000Belanja?: number;
  jumlahBelanjaRm?: number;
  // Penjimatan (Peruntukan Diterima - Belanja Sebenar)
  os21000Penjimatan?: number;
  os24000Penjimatan?: number;
  os27000Penjimatan?: number;
  os29000Penjimatan?: number;
  jumlahPenjimatanRm?: number;
  statusProgram: StatusProgram;
  tahun: number;
  bulan: number; // 1-12
  catatan?: string;
  rekodPindaan?: RekodPindaanBK04[];
}

export interface ItemPerubahanBK04 {
  jenisPerubahan: string;
  maklumatAsal: string;
  maklumatTerkini: string;
}

export interface RekodPindaanBK04 {
  noPindaan: number;
  tarikhPindaan: string;
  dikemaskiniOleh: string;
  perubahan: ItemPerubahanBK04[];
}

export interface ProgramFilterState {
  pusat: string;
  jabatan: string;
  jenisProgram: string;
  pengurus: string; // Pegawai id or name
  pengurusBersama: string; // Pegawai id or name
  negeri: string;
  tahun: string;
  bulan: string;
  status: string;
  sumberKewangan: string;
  searchQuery: string;
}

export interface FinancialSectionStats {
  // PERUNTUKAN DITERIMA
  diterimaOs21: number;
  diterimaOs24: number;
  diterimaOs27: number;
  diterimaOs29: number;
  diterimaKeseluruhan: number;

  // PERUNTUKAN DIBELANJAKAN
  dibelanjaOs21: number;
  dibelanjaOs24: number;
  dibelanjaOs27: number;
  dibelanjaOs29: number;
  dibelanjaKeseluruhan: number;

  // BAKI PERUNTUKAN
  bakiOs21: number;
  bakiOs24: number;
  bakiOs27: number;
  bakiOs29: number;
  bakiKeseluruhan: number;
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export type AdminLevelId =
  | 'SUPER_ADMIN'
  | 'KETUA_PUSAT'
  | 'KETUA_JABATAN'
  | 'PENGARAH'
  | 'TPP_TPL'
  | 'P_PB'
  | 'URUS_SETIA';

export type AccessMode = 'view' | 'edit';

export const ADMIN_LEVEL_OPTIONS: Array<{
  value: AdminLevelId;
  label: string;
  desc: string;
}> = [
  {
    value: 'SUPER_ADMIN',
    label: '1. Super Admin',
    desc: 'Boleh view dan edit semua termasuk ubah kata laluan sendiri dan reset kata laluan pengguna lain',
  },
  {
    value: 'KETUA_PUSAT',
    label: '2. Ketua Pusat',
    desc: 'View only secara lalai (default); tertakluk kepada Jabatan & Page Diberi Akses',
  },
  {
    value: 'KETUA_JABATAN',
    label: '3. Ketua Jabatan',
    desc: 'View only secara lalai (default); tertakluk kepada Jabatan & Page Diberi Akses',
  },
  {
    value: 'PENGARAH',
    label: '4. Pengarah',
    desc: 'View only secara lalai (default); tertakluk kepada Jabatan & Page Diberi Akses',
  },
  {
    value: 'TPP_TPL',
    label: '5. TPP/TPL',
    desc: 'View only secara lalai (default); tertakluk kepada Jabatan & Page Diberi Akses',
  },
  {
    value: 'P_PB',
    label: '6. P/PB',
    desc: 'View only secara lalai (default); tertakluk kepada Jabatan & Page Diberi Akses',
  },
  {
    value: 'URUS_SETIA',
    label: '7. Urus setia',
    desc: 'View only secara lalai (default); tertakluk kepada Jabatan & Page Diberi Akses',
  },
];

export const getAdminLevelLabel = (levelId?: AdminLevelId | string, role?: AdminRole): string => {
  if (role === 'SUPER_ADMIN' || levelId === 'SUPER_ADMIN') return 'Super Admin';
  switch (levelId) {
    case 'KETUA_PUSAT':
      return 'Ketua Pusat';
    case 'KETUA_JABATAN':
      return 'Ketua Jabatan';
    case 'PENGARAH':
      return 'Pengarah';
    case 'TPP_TPL':
      return 'TPP/TPL';
    case 'P_PB':
      return 'P/PB';
    case 'URUS_SETIA':
      return 'Urus setia';
    default:
      return 'Admin Jabatan';
  }
};

export interface AdminUser {
  id: string; // Login ID, e.g. 'AMAN'
  password: string; // Default '123' when created or reset
  name: string; // Display name
  role: AdminRole;
  levelId?: AdminLevelId; // Level ID 1..7
  pusat?: string;
  jabatan?: string; // Authorized primary department for non-super user
  allowedJabatans?: string[]; // Legacy & convenience list of authorized departments
  jabatanAccess?: Record<string, AccessMode>; // Per-department 'view' | 'edit' permission
  allowedPages?: string[]; // Legacy & convenience list of authorized pages
  pageAccess?: Record<string, AccessMode>; // Per-page 'view' | 'edit' permission
  createdAt: string;
}

export interface OsAllocation {
  os21000: number;
  os24000: number;
  os27000: number;
  os29000: number;
}

export interface FasaPeruntukanRecord {
  id: string; // e.g. 'fasa_1', 'fasa_2'
  nama: string; // e.g. 'PERUNTUKAN FASA 1'
  allocations: Record<string, OsAllocation>;
  updatedAt?: string;
}

export type PtjOption =
  | 'IABCGH'
  | 'IABCU'
  | 'IABCSWK'
  | 'IABCSBH'
  | 'JPN'
  | 'PPD'
  | 'IPG'
  | 'KV'
  | 'LAIN-LAIN'
  | string;

export interface SubwaranRecord {
  id: string;
  sumberKewangan: string;
  namaPtj: PtjOption;
  ptjLain?: string;
  tarikhSubWaran: string; // YYYY-MM-DD
  os21000: number;
  os24000: number;
  os27000: number;
  os29000: number;
  jumlah: number;
  namaProgram: string;
  objektif?: string;
  pegawaiPic: string;
  createdAt?: string;
}

export interface BudgetRatesConfig {
  makanMinum: {
    sarapan: number;
    minumPagi: number;
    lunch: number;
    minumPetang: number;
    dinner: number;
  };
  dobi: {
    inapanIabi: number;
    bestari: number;
    eksekutif: number;
    iabcu: number;
    iabcswk: number;
    iabcsbh: number;
  };
  updatedAt?: string;
  updatedBy?: string;
}
