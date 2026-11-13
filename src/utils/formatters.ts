import { StatusProgram } from '../types/program';

export const formatRM = (amount: number | undefined | null): string => {
  const val = Number(amount) || 0;
  return val.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatRMWithPrefix = (amount: number | undefined | null): string => {
  return `RM ${formatRM(amount)}`;
};

export const formatNumber = (num: number | undefined | null): string => {
  const val = Number(num) || 0;
  return val.toLocaleString('en-MY');
};

export const getStatusConfig = (status: StatusProgram | string) => {
  const normalized = (status || '').toUpperCase().trim();
  switch (normalized) {
    case 'SELESAI':
      return {
        label: 'SELESAI',
        colorName: 'GREEN',
        cardBg: 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500',
        accentBar: 'bg-emerald-500',
        badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dotBg: 'bg-emerald-600',
        textColor: 'text-emerald-800',
        description: 'Telah disempurnakan sepenuhnya',
      };
    case 'DALAM TINDAKAN':
      return {
        label: 'DALAM TINDAKAN',
        colorName: 'YELLOW',
        cardBg: 'bg-yellow-50/50 border-yellow-300 hover:border-yellow-500',
        accentBar: 'bg-yellow-400',
        badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
        dotBg: 'bg-yellow-500',
        textColor: 'text-yellow-800',
        description: 'Sedang giat dilaksanakan',
      };
    case 'TANGGUNG':
      return {
        label: 'TANGGUNG',
        colorName: 'ORANGE',
        cardBg: 'bg-orange-50/40 border-orange-300 hover:border-orange-500',
        accentBar: 'bg-orange-500',
        badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
        dotBg: 'bg-orange-500',
        textColor: 'text-orange-800',
        description: 'Ditangguhkan ke tarikh baharu',
      };
    case 'BELUM AMBIL TINDAKAN':
      return {
        label: 'BELUM AMBIL TINDAKAN',
        colorName: 'LIGHT RED',
        cardBg: 'bg-rose-50/40 border-rose-300 hover:border-rose-400',
        accentBar: 'bg-rose-400',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        dotBg: 'bg-rose-500',
        textColor: 'text-rose-800',
        description: 'Dalam perancangan awal',
      };
    case 'BATAL':
      return {
        label: 'BATAL',
        colorName: 'LIGHT BLACK',
        cardBg: 'bg-zinc-100/70 border-zinc-400 hover:border-zinc-600',
        accentBar: 'bg-zinc-700',
        badgeBg: 'bg-zinc-200 text-zinc-900 border-zinc-400',
        dotBg: 'bg-zinc-700',
        textColor: 'text-zinc-800',
        description: 'Dibatalkan atas keperluan semasa',
      };
    default:
      return {
        label: status || 'TIADA',
        colorName: 'DEFAULT',
        cardBg: 'bg-white border-slate-200 hover:border-slate-300',
        accentBar: 'bg-slate-400',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        dotBg: 'bg-slate-500',
        textColor: 'text-slate-600',
        description: '',
      };
  }
};

/**
 * Calculates number of days inclusive between 2 date strings (YYYY-MM-DD)
 */
export const calculateDaysBetween = (startStr: string, endStr: string): number => {
  if (!startStr) return 1;
  if (!endStr) return 1;
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = end.getTime() - start.getTime();
  if (isNaN(diffTime) || diffTime < 0) return 1;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

/**
 * Formats YYYY-MM-DD to D/M/YYYY
 */
export const formatDateToMY = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export interface UserBannerInfo {
  instansi: string;
  penggunaJawatan: string;
  pusatJabatan: string;
  nama: string;
  jawatan: string;
  pusat: string;
  jabatan: string;
  pusatDanJabatan: string;
  isPelawat: boolean;
}

/**
 * Generates user identity banner structured info according to login status:
 * Logged In:
 * - instansi: "Institut Aminuddin Baki · Kementerian Pendidikan"
 * - penggunaJawatan: "Pengguna: NAMA PEGAWAI | Jawatan: JAWATAN PEGAWAI"
 * - pusatJabatan: "PUSAT & JABATAN: PUSAT dan JABATAN"
 *
 * Not Logged In:
 * - instansi: "Institut Aminuddin Baki · Kementerian Pendidikan"
 * - penggunaJawatan: "Pengguna: PELAWAT (VIEW SAHAJA) | Jawatan: PELAWAT (VIEW SAHAJA)"
 * - pusatJabatan: "PUSAT & JABATAN: PELAWAT (VIEW SAHAJA)"
 */
export const getUserBannerInfo = (
  currentUser?: { id: string; name: string; role: string; pusat?: string; jabatan?: string; allowedJabatans?: string[] } | null,
  pegawaiList?: Array<{ id: string; nama: string; jawatan?: string; pusat?: string; jabatan?: string }>
): UserBannerInfo => {
  const instansi = 'Institut Aminuddin Baki · Kementerian Pendidikan';

  if (!currentUser) {
    return {
      instansi,
      penggunaJawatan: 'Pengguna: PELAWAT (VIEW SAHAJA) | Jawatan: PELAWAT (VIEW SAHAJA)',
      pusatJabatan: 'PUSAT: PELAWAT (VIEW SAHAJA) | JABATAN: PELAWAT (VIEW SAHAJA)',
      nama: 'PELAWAT (VIEW SAHAJA)',
      jawatan: 'PELAWAT (VIEW SAHAJA)',
      pusat: 'PELAWAT (VIEW SAHAJA)',
      jabatan: 'PELAWAT (VIEW SAHAJA)',
      pusatDanJabatan: 'PELAWAT (VIEW SAHAJA)',
      isPelawat: true,
    };
  }

  const matched = (pegawaiList || []).find(
    (p) =>
      (currentUser.name && p.nama.trim().toUpperCase() === currentUser.name.trim().toUpperCase()) ||
      (currentUser.id && p.id.trim().toUpperCase() === currentUser.id.trim().toUpperCase())
  );

  const isSuper = currentUser.role === 'SUPER_ADMIN';
  const rawName = (matched?.nama || currentUser.name || currentUser.id || 'PENGGUNA').toUpperCase();
  const nama = isSuper && (rawName === 'SUPER ADMIN AMAN' || currentUser.id.toUpperCase() === 'AMAN')
    ? 'SUPER ADMIN'
    : rawName;
  const jawatan = (
    matched?.jawatan ||
    (isSuper ? 'SUPER ADMIN' : 'ADMIN JABATAN')
  ).toUpperCase();

  const pusat = isSuper
    ? (matched?.pusat || currentUser.pusat || '').toUpperCase()
    : (matched?.pusat || currentUser.pusat || '').toUpperCase();

  const jabatan = isSuper
    ? (matched?.jabatan || currentUser.jabatan || '').toUpperCase()
    : (
        matched?.jabatan ||
        currentUser.jabatan ||
        (currentUser.allowedJabatans && currentUser.allowedJabatans.length > 0
          ? currentUser.allowedJabatans.join(', ')
          : 'SEMUA JABATAN')
      ).toUpperCase();

  const pusatDanJabatan = [pusat, jabatan].filter(Boolean).join(' dan ');

  return {
    instansi,
    penggunaJawatan: `Pengguna: ${nama} | Jawatan: ${jawatan}`,
    pusatJabatan: `PUSAT: ${pusat} | JABATAN: ${jabatan}`,
    nama,
    jawatan,
    pusat,
    jabatan,
    pusatDanJabatan,
    isPelawat: false,
  };
};

export const getUserBannerText = (
  currentUser?: { id: string; name: string; role: string; pusat?: string; jabatan?: string; allowedJabatans?: string[] } | null,
  pegawaiList?: Array<{ id: string; nama: string; jawatan?: string; pusat?: string; jabatan?: string }>
): string => {
  const info = getUserBannerInfo(currentUser, pegawaiList);
  return `${info.instansi} · [${info.penggunaJawatan} | ${info.pusatJabatan}]`;
};
