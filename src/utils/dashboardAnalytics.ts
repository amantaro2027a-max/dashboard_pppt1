import { Pegawai, ProgramItem } from '../types/program';
import { getProgramYear } from './financeYear';
import { deduplicateProgramsByCode, getProgramDedupeKey } from './programDedupe';
import { getProgramFinanceAggregate } from './financeCalculations';

export type OfficerRoleType = 'PENGURUS' | 'PENGURUS BERSAMA' | 'URUS SETIA';

export const ROLE_LABELS: Record<OfficerRoleType, string> = {
  PENGURUS: 'Pengurus',
  'PENGURUS BERSAMA': 'Pengurus Bersama',
  'URUS SETIA': 'Urus Setia',
};

export const ROLE_COLORS: Record<OfficerRoleType, string> = {
  PENGURUS: '#1e3a8a',
  'PENGURUS BERSAMA': '#0f766e',
  'URUS SETIA': '#b45309',
};

export const MONTH_NAMES_MY = [
  'Januari',
  'Februari',
  'Mac',
  'April',
  'Mei',
  'Jun',
  'Julai',
  'Ogos',
  'September',
  'Oktober',
  'November',
  'Disember',
];

export const MONTH_SHORT_MY = [
  'Jan',
  'Feb',
  'Mac',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Ogo',
  'Sep',
  'Okt',
  'Nov',
  'Dis',
];

export const WEEKDAY_SHORT_MY = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Aha'];

export const parseIsoDate = (raw?: string): Date | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dmyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (dmyMatch) {
    const dt = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const toIsoDay = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDisplayDate = (raw?: string): string => {
  const dt = parseIsoDate(raw);
  if (!dt) return raw || '-';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(
    2,
    '0'
  )}/${dt.getFullYear()}`;
};

export const getProgramMonthIndex = (p: ProgramItem): number => {
  const dt = parseIsoDate(p.tarikhMula);
  if (dt) return dt.getMonth() + 1;
  const m = Number(p.bulan);
  if (m >= 1 && m <= 12) return m;
  return 0;
};

export const doesProgramOverlapDay = (p: ProgramItem, day: Date): boolean => {
  const sDt = parseIsoDate(p.tarikhMula);
  if (!sDt) return false;
  const eDt = parseIsoDate(p.tarikhTamat) || sDt;
  const target = startOfDay(day).getTime();
  return target >= startOfDay(sDt).getTime() && target <= startOfDay(eDt).getTime();
};

export const matchesPegawaiOnField = (
  pg: Pegawai,
  idVal?: string,
  nameVal?: string
): boolean => {
  const pgIdNorm = (pg.id || '').trim().toUpperCase();
  const pgNameNorm = (pg.nama || '').trim().toUpperCase();
  const idNorm = (idVal || '').trim().toUpperCase();
  const nmNorm = (nameVal || '').trim().toUpperCase();
  if (pgIdNorm && idNorm && pgIdNorm === idNorm) return true;
  if (pgNameNorm && nmNorm && pgNameNorm === nmNorm) return true;
  return false;
};

export const getOfficerRolesInProgram = (pg: Pegawai, p: ProgramItem): OfficerRoleType[] => {
  const roles: OfficerRoleType[] = [];
  if (matchesPegawaiOnField(pg, p.pengurusId, p.pengurusNama)) roles.push('PENGURUS');
  if (matchesPegawaiOnField(pg, p.pengurusBersamaId, p.pengurusBersamaNama))
    roles.push('PENGURUS BERSAMA');
  if (matchesPegawaiOnField(pg, p.urusSetiaId, p.urusSetiaNama)) roles.push('URUS SETIA');
  return roles;
};

export interface OfficerRoleMetrics {
  pegawai: Pegawai;
  pengurusCount: number;
  pengurusBersamaCount: number;
  urusSetiaCount: number;
  totalUniquePrograms: number;
  selesaiCount: number;
  peruntukan: number;
  belanja: number;
  programs: ProgramItem[];
}

/**
 * Computes each officer's involvement across deduplicated programmes.
 * Note: An officer can hold Pengurus, Pengurus Bersama, and/or Urus Setia in the same program;
 * `totalUniquePrograms` counts unique `kodProgram` entries only once per officer.
 */
export const computeOfficerInvolvementList = (
  scopedPrograms: ProgramItem[],
  candidateOfficers: Pegawai[],
  allPegawaiList: Pegawai[]
): OfficerRoleMetrics[] => {
  const uniquePrograms = deduplicateProgramsByCode(scopedPrograms);
  const officerMap = new Map<string, Pegawai>();

  candidateOfficers.forEach((pg) => {
    if (pg?.id) officerMap.set(pg.id, pg);
  });

  // Ensure officers assigned on any scoped programme (e.g. Pengurus/Bersama/Urus Setia) are included
  uniquePrograms.forEach((p) => {
    allPegawaiList.forEach((pg) => {
      if (!officerMap.has(pg.id) && getOfficerRolesInProgram(pg, p).length > 0) {
        officerMap.set(pg.id, pg);
      }
    });
  });

  const results: OfficerRoleMetrics[] = [];

  officerMap.forEach((pg) => {
    const matchedProgs: ProgramItem[] = [];
    const seenKeys = new Set<string>();
    let pengurusCount = 0;
    let pengurusBersamaCount = 0;
    let urusSetiaCount = 0;
    let selesaiCount = 0;

    uniquePrograms.forEach((p) => {
      const roles = getOfficerRolesInProgram(pg, p);
      if (roles.length === 0) return;
      if (roles.includes('PENGURUS')) pengurusCount++;
      if (roles.includes('PENGURUS BERSAMA')) pengurusBersamaCount++;
      if (roles.includes('URUS SETIA')) urusSetiaCount++;

      const key = getProgramDedupeKey(p);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        matchedProgs.push(p);
        if ((p.statusProgram || '').trim().toUpperCase() === 'SELESAI') {
          selesaiCount++;
        }
      }
    });

    if (matchedProgs.length === 0 && !candidateOfficers.some((c) => c.id === pg.id)) {
      return;
    }

    const fin = getProgramFinanceAggregate(matchedProgs, true);

    results.push({
      pegawai: pg,
      pengurusCount,
      pengurusBersamaCount,
      urusSetiaCount,
      totalUniquePrograms: matchedProgs.length,
      selesaiCount,
      peruntukan: fin.diagihkan.total,
      belanja: fin.belanja.total,
      programs: matchedProgs,
    });
  });

  return results.sort((a, b) => {
    if (b.totalUniquePrograms !== a.totalUniquePrograms) {
      return b.totalUniquePrograms - a.totalUniquePrograms;
    }
    return a.pegawai.nama.localeCompare(b.pegawai.nama);
  });
};

export interface NearOrOverdueItem {
  program: ProgramItem;
  kind: 'MELEPASI' | 'HAMPIR';
  daysDiff: number;
}

export const computeNearOrOverduePrograms = (
  scopedPrograms: ProgramItem[]
): NearOrOverdueItem[] => {
  const uniquePrograms = deduplicateProgramsByCode(scopedPrograms);
  const today = startOfDay(new Date());
  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);

  const list: NearOrOverdueItem[] = [];

  uniquePrograms.forEach((p) => {
    const st = (p.statusProgram || '').trim().toUpperCase();
    if (st === 'SELESAI' || st === 'BATAL') return;

    const startDt = parseIsoDate(p.tarikhMula);
    const endDt = parseIsoDate(p.tarikhTamat) || startDt;
    if (!startDt || !endDt) return;

    if (endDt < today) {
      const diffDays = Math.ceil((today.getTime() - endDt.getTime()) / 86400000);
      list.push({ program: p, kind: 'MELEPASI', daysDiff: diffDays });
    } else if (startDt >= today && startDt <= in14Days) {
      const diffDays = Math.ceil((startDt.getTime() - today.getTime()) / 86400000);
      list.push({ program: p, kind: 'HAMPIR', daysDiff: diffDays });
    }
  });

  return list.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'MELEPASI' ? -1 : 1;
    return b.daysDiff - a.daysDiff;
  });
};

export interface ProgramKpiSummary {
  total: number;
  selesai: number;
  tanggung: number;
  dalamTindakan: number;
  belum: number;
  batal: number;
}

export const computeProgramStatusKpis = (scopedPrograms: ProgramItem[]): ProgramKpiSummary => {
  const unique = deduplicateProgramsByCode(scopedPrograms);
  let selesai = 0;
  let tanggung = 0;
  let dalamTindakan = 0;
  let belum = 0;
  let batal = 0;

  unique.forEach((p) => {
    const st = (p.statusProgram || '').trim().toUpperCase();
    if (st === 'SELESAI') selesai++;
    else if (st === 'TANGGUNG') tanggung++;
    else if (st === 'DALAM TINDAKAN') dalamTindakan++;
    else if (st === 'BATAL') batal++;
    else belum++;
  });

  return {
    total: unique.length,
    selesai,
    tanggung,
    dalamTindakan,
    belum,
    batal,
  };
};

export interface RoleInvolvementSummary {
  pengurus: { count: number; programs: ProgramItem[] };
  pengurusBersama: { count: number; programs: ProgramItem[] };
  urusSetia: { count: number; programs: ProgramItem[] };
}

export const computeRoleInvolvementSummary = (
  scopedPrograms: ProgramItem[]
): RoleInvolvementSummary => {
  const unique = deduplicateProgramsByCode(scopedPrograms);
  const pengurusProgs: ProgramItem[] = [];
  const bersamaProgs: ProgramItem[] = [];
  const urusProgs: ProgramItem[] = [];

  unique.forEach((p) => {
    if ((p.pengurusNama || '').trim() || (p.pengurusId || '').trim()) {
      pengurusProgs.push(p);
    }
    if (
      ((p.pengurusBersamaNama || '').trim() && (p.pengurusBersamaNama || '').trim() !== '-') ||
      ((p.pengurusBersamaId || '').trim() && (p.pengurusBersamaId || '').trim() !== '-')
    ) {
      bersamaProgs.push(p);
    }
    if (
      ((p.urusSetiaNama || '').trim() && (p.urusSetiaNama || '').trim() !== '-') ||
      ((p.urusSetiaId || '').trim() && (p.urusSetiaId || '').trim() !== '-')
    ) {
      urusProgs.push(p);
    }
  });

  return {
    pengurus: { count: pengurusProgs.length, programs: pengurusProgs },
    pengurusBersama: { count: bersamaProgs.length, programs: bersamaProgs },
    urusSetia: { count: urusProgs.length, programs: urusProgs },
  };
};

export const groupProgramsByField = (
  scopedPrograms: ProgramItem[],
  extractor: (p: ProgramItem) => string
): Array<{ label: string; count: number; programs: ProgramItem[]; peruntukan: number }> => {
  const unique = deduplicateProgramsByCode(scopedPrograms);
  const map = new Map<string, ProgramItem[]>();
  unique.forEach((p) => {
    const label = extractor(p) || 'TIDAK DINYATAKAN';
    const arr = map.get(label) || [];
    arr.push(p);
    map.set(label, arr);
  });
  return Array.from(map.entries())
    .map(([label, items]) => ({
      label,
      count: items.length,
      programs: items,
      peruntukan: getProgramFinanceAggregate(items, true).diagihkan.total,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export const groupProgramsByYear = (
  allOrgPrograms: ProgramItem[]
): Array<{ tahun: number; count: number; selesai: number; peruntukan: number; belanja: number; programs: ProgramItem[] }> => {
  const unique = deduplicateProgramsByCode(allOrgPrograms);
  const map = new Map<number, ProgramItem[]>();
  unique.forEach((p) => {
    const yr = getProgramYear(p);
    const arr = map.get(yr) || [];
    arr.push(p);
    map.set(yr, arr);
  });
  return Array.from(map.entries())
    .map(([tahun, items]) => {
      const fin = getProgramFinanceAggregate(items, true);
      const selesai = items.filter((i) => (i.statusProgram || '').trim().toUpperCase() === 'SELESAI').length;
      return {
        tahun,
        count: items.length,
        selesai,
        peruntukan: fin.diagihkan.total,
        belanja: fin.belanja.total,
        programs: items,
      };
    })
    .sort((a, b) => b.tahun - a.tahun);
};

export const groupProgramsByMonth = (
  scopedPrograms: ProgramItem[]
): Array<{ month: number; name: string; shortName: string; count: number; programs: ProgramItem[] }> => {
  const unique = deduplicateProgramsByCode(scopedPrograms);
  const buckets: ProgramItem[][] = Array.from({ length: 12 }, () => []);
  unique.forEach((p) => {
    const m = getProgramMonthIndex(p);
    if (m >= 1 && m <= 12) {
      buckets[m - 1].push(p);
    }
  });
  return buckets.map((items, idx) => ({
    month: idx + 1,
    name: MONTH_NAMES_MY[idx],
    shortName: MONTH_SHORT_MY[idx],
    count: items.length,
    programs: items,
  }));
};
