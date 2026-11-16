import { FasaPeruntukanRecord, ProgramItem, SubwaranRecord } from '../types/program';
import { TAHUN_LIST } from '../data/constants';

export const getCurrentFinanceYear = (): number => {
  return new Date().getFullYear();
};

export const getFasaYear = (fasa: Partial<FasaPeruntukanRecord> | null | undefined): number => {
  if (!fasa) return getCurrentFinanceYear();
  if (typeof fasa.tahun === 'number' && Number.isFinite(fasa.tahun) && fasa.tahun >= 2000) {
    return fasa.tahun;
  }
  if (fasa.updatedAt && /^\d{4}/.test(fasa.updatedAt)) {
    const parsed = Number(fasa.updatedAt.slice(0, 4));
    if (Number.isFinite(parsed) && parsed >= 2000) return parsed;
  }
  // Seeded initial phases (fasa_1, fasa_2) without explicit year belong to 2026
  return 2026;
};

export const getSubwaranYear = (sub: Partial<SubwaranRecord> | null | undefined): number => {
  if (!sub) return getCurrentFinanceYear();
  if (typeof sub.tahun === 'number' && Number.isFinite(sub.tahun) && sub.tahun >= 2000) {
    return sub.tahun;
  }
  if (sub.tarikhSubWaran && /^\d{4}/.test(sub.tarikhSubWaran)) {
    const parsed = Number(sub.tarikhSubWaran.slice(0, 4));
    if (Number.isFinite(parsed) && parsed >= 2000) return parsed;
  }
  if (sub.createdAt && /^\d{4}/.test(sub.createdAt)) {
    const parsed = Number(sub.createdAt.slice(0, 4));
    if (Number.isFinite(parsed) && parsed >= 2000) return parsed;
  }
  return 2026;
};

export const getProgramYear = (prog: Partial<ProgramItem> | null | undefined): number => {
  if (!prog) return getCurrentFinanceYear();
  if (typeof prog.tahun === 'number' && Number.isFinite(prog.tahun) && prog.tahun >= 2000) {
    return prog.tahun;
  }
  if (prog.tarikhMula && /^\d{4}/.test(prog.tarikhMula)) {
    const parsed = Number(prog.tarikhMula.slice(0, 4));
    if (Number.isFinite(parsed) && parsed >= 2000) return parsed;
  }
  return 2026;
};

export const computeAvailableFinanceYears = (
  programs: ProgramItem[] = [],
  fasaList: FasaPeruntukanRecord[] = [],
  subwaranList: SubwaranRecord[] = []
): number[] => {
  const currentYear = getCurrentFinanceYear();
  const yearSet = new Set<number>([
    ...TAHUN_LIST,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ]);

  programs.forEach((p) => {
    const yr = getProgramYear(p);
    if (yr >= 2000 && yr <= 2100) yearSet.add(yr);
  });

  fasaList.forEach((f) => {
    const yr = getFasaYear(f);
    if (yr >= 2000 && yr <= 2100) yearSet.add(yr);
  });

  subwaranList.forEach((s) => {
    const yr = getSubwaranYear(s);
    if (yr >= 2000 && yr <= 2100) yearSet.add(yr);
  });

  return Array.from(yearSet).sort((a, b) => a - b);
};
