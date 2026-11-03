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
  switch (status) {
    case 'SELESAI':
      return {
        label: 'SELESAI',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotBg: 'bg-emerald-600',
        textColor: 'text-emerald-700',
        description: 'Telah disempurnakan sepenuhnya',
      };
    case 'DALAM TINDAKAN':
      return {
        label: 'DALAM TINDAKAN',
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
        dotBg: 'bg-sky-600',
        textColor: 'text-sky-700',
        description: 'Sedang giat dilaksanakan',
      };
    case 'TANGGUNG':
      return {
        label: 'TANGGUNG',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        dotBg: 'bg-amber-600',
        textColor: 'text-amber-700',
        description: 'Ditangguhkan ke tarikh baharu',
      };
    case 'BELUM AMBIL TINDAKAN':
      return {
        label: 'BELUM AMBIL TINDAKAN',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
        dotBg: 'bg-slate-500',
        textColor: 'text-slate-700',
        description: 'Dalam perancangan awal',
      };
    case 'BATAL':
      return {
        label: 'BATAL',
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
        dotBg: 'bg-rose-600',
        textColor: 'text-rose-700',
        description: 'Dibatalkan atas keperluan semasa',
      };
    default:
      return {
        label: status,
        badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
        dotBg: 'bg-slate-400',
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
