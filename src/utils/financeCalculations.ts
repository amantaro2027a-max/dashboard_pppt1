import {
  AdminUser,
  FasaPeruntukanRecord,
  JabatanAllocationRecord,
  JabatanPullbackRecord,
  OsAllocation,
  Pegawai,
  ProgramItem,
  SubwaranRecord,
} from '../types/program';
import { deduplicateProgramsByCode } from './programDedupe';
import { getFasaYear, getProgramYear, getSubwaranYear } from './financeYear';

export interface OsTotals {
  os21000: number;
  os24000: number;
  os27000: number;
  os29000: number;
  total: number;
}

export interface ProgramFinanceAggregate {
  diagihkan: OsTotals; // Peruntukan Kewangan Diluluskan (BK65)
  belanja: OsTotals;   // BELANJA SEBENAR (OS) - Status SELESAI & TANGGUNG
  penjimatan: OsTotals; // PENJIMATAN (OS) - Status SELESAI & TANGGUNG
}

const emptyOsTotals = (): OsTotals => ({
  os21000: 0,
  os24000: 0,
  os27000: 0,
  os29000: 0,
  total: 0,
});

const isValidOrgValue = (val?: string | null): val is string => {
  const norm = (val || '').trim().toUpperCase();
  return (
    norm !== '' &&
    norm !== '-' &&
    norm !== 'TIDAK BERKENAAN' &&
    norm !== 'SEMUA' &&
    norm !== 'SEMUA PUSAT' &&
    norm !== 'SEMUA KLUSTER' &&
    !norm.includes('SEMUA JABATAN')
  );
};

/**
 * Resolve a user's default Pusat (from AdminUser, matched Pegawai, or jabatanMap).
 */
export const resolveUserDefaultPusat = (
  currentUser: AdminUser | null,
  pegawaiList: Pegawai[],
  jabatanMap: Record<string, string[]>,
  authorizedPusats: string[] = []
): string => {
  if (!currentUser) return '';

  if (isValidOrgValue(currentUser.pusat)) {
    return currentUser.pusat!.trim();
  }

  const userNameNorm = (currentUser.name || '').trim().toUpperCase();
  const userIdNorm = (currentUser.id || '').trim().toUpperCase();

  const matchedPeg = pegawaiList.find(
    (pg) =>
      (userNameNorm && (pg.nama || '').trim().toUpperCase() === userNameNorm) ||
      (userIdNorm && (pg.id || '').trim().toUpperCase() === userIdNorm)
  );

  if (matchedPeg && isValidOrgValue(matchedPeg.pusat)) {
    return matchedPeg.pusat.trim();
  }

  const candidateJab =
    (matchedPeg && isValidOrgValue(matchedPeg.jabatan) && matchedPeg.jabatan.trim()) ||
    (isValidOrgValue(currentUser.jabatan) ? currentUser.jabatan!.split(',')[0].trim() : '');

  if (candidateJab) {
    const jabUpper = candidateJab.toUpperCase();
    for (const [pus, jabs] of Object.entries(jabatanMap || {})) {
      if ((jabs || []).some((j) => (j || '').trim().toUpperCase() === jabUpper)) {
        if (isValidOrgValue(pus)) return pus.trim();
      }
    }
  }

  const firstAuth = authorizedPusats.find((p) => isValidOrgValue(p));
  return firstAuth ? firstAuth.trim() : '';
};

/**
 * Given Kluster and Pusat filters ('SEMUA' or specific name), returns:
 * - `null` if no Pusat restriction applies (Semua Kluster & Semua Pusat)
 * - `string[]` of target Pusat names (exact list, possibly empty if Kluster has no Pusats)
 */
export const resolveTargetPusats = (
  selectedKluster: string,
  selectedPusat: string,
  klusterMap: Record<string, string[]>,
  pusatList: string[]
): string[] | null => {
  const klu = (selectedKluster || 'SEMUA').trim();
  const pus = (selectedPusat || 'SEMUA').trim();

  if (pus && pus !== 'SEMUA' && pus !== 'ALL') {
    return [pus];
  }

  if (klu && klu !== 'SEMUA' && klu !== 'ALL') {
    const kluKey = Object.keys(klusterMap || {}).find(
      (k) => k.trim().toUpperCase() === klu.toUpperCase()
    );
    const mapped = kluKey ? klusterMap[kluKey] || [] : [];
    return mapped.filter((p) => isValidOrgValue(p));
  }

  // Both SEMUA
  void pusatList;
  return null;
};

/**
 * Determine whether a Fasa has any non-zero per-Pusat breakdown stored.
 */
export const hasPerPusatAllocations = (fasa: FasaPeruntukanRecord): boolean => {
  if (!fasa.pusatAllocations) return false;
  return Object.values(fasa.pusatAllocations).some((skMap) =>
    Object.values(skMap || {}).some(
      (alloc) =>
        (Number(alloc?.os21000) || 0) > 0 ||
        (Number(alloc?.os24000) || 0) > 0 ||
        (Number(alloc?.os27000) || 0) > 0 ||
        (Number(alloc?.os29000) || 0) > 0
    )
  );
};

/**
 * Compute allocations per Sumber Kewangan for a single Fasa within a Pusat scope.
 * - If `targetPusats === null` (Semua Kluster & Semua Pusat): returns sum of `pusatAllocations`
 *   if any per-Pusat entries exist, otherwise falls back to legacy `fasa.allocations`.
 * - If `targetPusats !== null`: sums `fasa.pusatAllocations?.[matchingPusat]?.[sk]`.
 */
export const getFasaAllocationsForScope = (
  fasa: FasaPeruntukanRecord,
  sumberKewanganList: string[],
  targetPusats: string[] | null
): Record<string, OsAllocation> => {
  const result: Record<string, OsAllocation> = {};
  const allSkKeys = new Set<string>(sumberKewanganList || []);
  Object.keys(fasa.allocations || {}).forEach((k) => allSkKeys.add(k));
  if (fasa.pusatAllocations) {
    Object.values(fasa.pusatAllocations).forEach((skMap) => {
      Object.keys(skMap || {}).forEach((k) => allSkKeys.add(k));
    });
  }

  allSkKeys.forEach((sk) => {
    result[sk] = { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
  });

  if (targetPusats === null) {
    if (hasPerPusatAllocations(fasa) && fasa.pusatAllocations) {
      Object.values(fasa.pusatAllocations).forEach((skMap) => {
        Object.entries(skMap || {}).forEach(([sk, alloc]) => {
          if (!result[sk]) result[sk] = { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
          result[sk].os21000 += Number(alloc?.os21000) || 0;
          result[sk].os24000 += Number(alloc?.os24000) || 0;
          result[sk].os27000 += Number(alloc?.os27000) || 0;
          result[sk].os29000 += Number(alloc?.os29000) || 0;
        });
      });
    } else if (fasa.allocations) {
      Object.entries(fasa.allocations).forEach(([sk, alloc]) => {
        result[sk] = {
          os21000: Number(alloc?.os21000) || 0,
          os24000: Number(alloc?.os24000) || 0,
          os27000: Number(alloc?.os27000) || 0,
          os29000: Number(alloc?.os29000) || 0,
        };
      });
    }
    return result;
  }

  if (!fasa.pusatAllocations || targetPusats.length === 0) {
    return result;
  }

  const targetUpperSet = new Set(targetPusats.map((p) => p.trim().toUpperCase()));
  Object.entries(fasa.pusatAllocations).forEach(([pusName, skMap]) => {
    if (!targetUpperSet.has(pusName.trim().toUpperCase())) return;
    Object.entries(skMap || {}).forEach(([sk, alloc]) => {
      if (!result[sk]) result[sk] = { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
      result[sk].os21000 += Number(alloc?.os21000) || 0;
      result[sk].os24000 += Number(alloc?.os24000) || 0;
      result[sk].os27000 += Number(alloc?.os27000) || 0;
      result[sk].os29000 += Number(alloc?.os29000) || 0;
    });
  });

  return result;
};

/**
 * Aggregate Peruntukan Diluluskan across Fasa records filtered by year (or 'SEMUA') and targetPusats.
 */
export const getPeruntukanDiluluskanStats = (
  fasaList: FasaPeruntukanRecord[],
  sumberKewanganList: string[],
  targetPusats: string[] | null,
  tahunFilter?: string | number,
  sumberKewanganFilter?: string
): { bySumber: Record<string, OsTotals>; overall: OsTotals } => {
  const bySumber: Record<string, OsTotals> = {};
  const overall = emptyOsTotals();

  (sumberKewanganList || []).forEach((sk) => {
    bySumber[sk] = emptyOsTotals();
  });

  const tahunStr = tahunFilter !== undefined ? String(tahunFilter).trim().toUpperCase() : 'SEMUA';

  (fasaList || []).forEach((fasa) => {
    if (tahunStr && tahunStr !== 'SEMUA' && tahunStr !== 'ALL') {
      if (String(getFasaYear(fasa)) !== tahunStr) return;
    }

    const scopedAlloc = getFasaAllocationsForScope(fasa, sumberKewanganList, targetPusats);
    Object.entries(scopedAlloc).forEach(([sk, alloc]) => {
      if (
        sumberKewanganFilter &&
        sumberKewanganFilter !== 'SEMUA' &&
        sumberKewanganFilter !== 'ALL' &&
        sk !== sumberKewanganFilter
      ) {
        return;
      }
      if (!bySumber[sk]) bySumber[sk] = emptyOsTotals();
      const v21 = Number(alloc?.os21000) || 0;
      const v24 = Number(alloc?.os24000) || 0;
      const v27 = Number(alloc?.os27000) || 0;
      const v29 = Number(alloc?.os29000) || 0;
      const vTot = v21 + v24 + v27 + v29;

      bySumber[sk].os21000 += v21;
      bySumber[sk].os24000 += v24;
      bySumber[sk].os27000 += v27;
      bySumber[sk].os29000 += v29;
      bySumber[sk].total += vTot;

      overall.os21000 += v21;
      overall.os24000 += v24;
      overall.os27000 += v27;
      overall.os29000 += v29;
      overall.total += vTot;
    });
  });

  return { bySumber, overall };
};

/**
 * Filter Subwaran records by year, Kluster, and targetPusats.
 */
export const filterSubwaranByScope = (
  subwaranList: SubwaranRecord[],
  targetPusats: string[] | null,
  tahunFilter?: string | number,
  selectedKluster?: string,
  getKlusterForPusat?: (pusat: string) => string
): SubwaranRecord[] => {
  const tahunStr = tahunFilter !== undefined ? String(tahunFilter).trim().toUpperCase() : 'SEMUA';
  const kluUpper = (selectedKluster || 'SEMUA').trim().toUpperCase();
  const targetUpperSet = targetPusats
    ? new Set(targetPusats.map((p) => p.trim().toUpperCase()))
    : null;

  return (subwaranList || []).filter((sub) => {
    if (tahunStr && tahunStr !== 'SEMUA' && tahunStr !== 'ALL') {
      if (String(getSubwaranYear(sub)) !== tahunStr) return false;
    }

    if (targetUpperSet !== null) {
      const subPusatUpper = (sub.pusat || '').trim().toUpperCase();
      if (subPusatUpper) {
        return targetUpperSet.has(subPusatUpper);
      }
      // If sub.pusat is empty, fallback to sub.kluster only when Kluster filter is active (without single Pusat filter)
      const subKlusterUpper = (sub.kluster || '').trim().toUpperCase();
      if (kluUpper && kluUpper !== 'SEMUA' && kluUpper !== 'ALL' && subKlusterUpper) {
        if (targetUpperSet.size !== 1 && subKlusterUpper === kluUpper) return true;
      }
      return false;
    }

    if (kluUpper && kluUpper !== 'SEMUA' && kluUpper !== 'ALL') {
      const subKlu =
        (sub.kluster || '').trim().toUpperCase() ||
        (sub.pusat && getKlusterForPusat ? getKlusterForPusat(sub.pusat).trim().toUpperCase() : '');
      return subKlu === kluUpper;
    }

    return true;
  });
};

/**
 * Filter Programs by year, Kluster, and Pusat scope, deduplicated by Kod Program.
 */
export const filterProgramsByOrgScope = (
  programs: ProgramItem[],
  targetPusats: string[] | null,
  tahunFilter?: string | number,
  selectedKluster?: string,
  getKlusterForPusat?: (pusat: string) => string
): ProgramItem[] => {
  const tahunStr = tahunFilter !== undefined ? String(tahunFilter).trim().toUpperCase() : 'SEMUA';
  const kluUpper = (selectedKluster || 'SEMUA').trim().toUpperCase();
  const targetUpperSet = targetPusats
    ? new Set(targetPusats.map((p) => p.trim().toUpperCase()))
    : null;

  const filtered = (programs || []).filter((p) => {
    if (tahunStr && tahunStr !== 'SEMUA' && tahunStr !== 'ALL') {
      if (String(getProgramYear(p)) !== tahunStr) return false;
    }

    if (targetUpperSet !== null) {
      const pusUpper = (p.pusat || '').trim().toUpperCase();
      if (pusUpper && targetUpperSet.has(pusUpper)) return true;
      // Fallback: check program's explicit kluster if Pusat filter wasn't single
      if (!pusUpper && kluUpper && kluUpper !== 'SEMUA' && targetUpperSet.size !== 1) {
        return (p.kluster || '').trim().toUpperCase() === kluUpper;
      }
      return false;
    }

    if (kluUpper && kluUpper !== 'SEMUA' && kluUpper !== 'ALL') {
      const progKlu =
        (p.kluster || '').trim().toUpperCase() ||
        (p.pusat && getKlusterForPusat ? getKlusterForPusat(p.pusat).trim().toUpperCase() : '');
      return progKlu === kluUpper;
    }

    return true;
  });

  return deduplicateProgramsByCode(filtered);
};

/**
 * Compute consistent Peruntukan Diagihkan (BK65), Belanja Sebenar (OS), and Penjimatan (OS)
 * for any list of programs (automatically deduplicated by Kod Program).
 *
 * Rules:
 * - Peruntukan Diagihkan: jumlahRm / OS21+24+27+29 (BK65) across all programs in scope.
 * - Belanja: BELANJA SEBENAR (OS) strictly for status SELESAI & TANGGUNG.
 * - Penjimatan: PENJIMATAN (OS) strictly for status SELESAI & TANGGUNG.
 */
export const getProgramFinanceAggregate = (
  programs: ProgramItem[],
  alreadyDeduplicated = false
): ProgramFinanceAggregate => {
  const list = alreadyDeduplicated ? programs : deduplicateProgramsByCode(programs || []);

  const diagihkan = emptyOsTotals();
  const belanja = emptyOsTotals();
  const penjimatan = emptyOsTotals();

  list.forEach((p) => {
    const a21 = Number(p.os21000) || 0;
    const a24 = Number(p.os24000) || 0;
    const a27 = Number(p.os27000) || 0;
    const a29 = Number(p.os29000) || 0;
    const aTot = p.jumlahRm !== undefined && p.jumlahRm !== null ? Number(p.jumlahRm) || 0 : a21 + a24 + a27 + a29;

    diagihkan.os21000 += a21;
    diagihkan.os24000 += a24;
    diagihkan.os27000 += a27;
    diagihkan.os29000 += a29;
    diagihkan.total += aTot;

    const status = (p.statusProgram || '').trim().toUpperCase();
    if (status === 'SELESAI' || status === 'TANGGUNG') {
      const b21 = Number(p.os21000Belanja) || 0;
      const b24 = Number(p.os24000Belanja) || 0;
      const b27 = Number(p.os27000Belanja) || 0;
      const b29 = Number(p.os29000Belanja) || 0;
      const bTot =
        p.jumlahBelanjaRm !== undefined && p.jumlahBelanjaRm !== null
          ? Number(p.jumlahBelanjaRm) || 0
          : b21 + b24 + b27 + b29;

      belanja.os21000 += b21;
      belanja.os24000 += b24;
      belanja.os27000 += b27;
      belanja.os29000 += b29;
      belanja.total += bTot;

      const s21 =
        p.os21000Penjimatan !== undefined && p.os21000Penjimatan !== null
          ? Number(p.os21000Penjimatan) || 0
          : Math.max(0, a21 - b21);
      const s24 =
        p.os24000Penjimatan !== undefined && p.os24000Penjimatan !== null
          ? Number(p.os24000Penjimatan) || 0
          : Math.max(0, a24 - b24);
      const s27 =
        p.os27000Penjimatan !== undefined && p.os27000Penjimatan !== null
          ? Number(p.os27000Penjimatan) || 0
          : Math.max(0, a27 - b27);
      const s29 =
        p.os29000Penjimatan !== undefined && p.os29000Penjimatan !== null
          ? Number(p.os29000Penjimatan) || 0
          : Math.max(0, a29 - b29);
      const sTot =
        p.jumlahPenjimatanRm !== undefined && p.jumlahPenjimatanRm !== null
          ? Number(p.jumlahPenjimatanRm) || 0
          : Math.max(0, aTot - bTot);

      penjimatan.os21000 += s21;
      penjimatan.os24000 += s24;
      penjimatan.os27000 += s27;
      penjimatan.os29000 += s29;
      penjimatan.total += sTot;
    }
  });

  return { diagihkan, belanja, penjimatan };
};

export interface JabatanFinanceSummary {
  diluluskan: OsTotals;
  agihanCount: number;
  agihanRecords: JabatanAllocationRecord[];
  diagihkan: OsTotals;
  programCount: number;
  belanjaSebenar: OsTotals; // Selesai & Tanggung => belanja; lain-lain => BK65 diagihkan; Batal => 0
  bakiAsal: OsTotals; // diluluskan - diagihkan
  bakiPenjimatan: OsTotals; // diagihkan - belanjaSebenar
  jumlahBaki: OsTotals; // bakiAsal + bakiPenjimatan
  ditarik: OsTotals; // jumlah tarik + pulangkan
  ditarikAsal: OsTotals;
  ditarikPenjimatan: OsTotals;
  pullbackCount: number;
  pullbackRecords: JabatanPullbackRecord[];
  jumlahBakiTerkini: OsTotals; // jumlahBaki - ditarik
  availableTarikAsal: OsTotals; // max boleh tarik/pulangkan daripada Baki (asal)
  availableTarikPenjimatan: OsTotals; // max boleh tarik/pulangkan daripada Baki (Penjimatan)
}

const addIntoOsTotals = (
  target: OsTotals,
  o21: number,
  o24: number,
  o27: number,
  o29: number,
  totOverride?: number
) => {
  const v21 = Number(o21) || 0;
  const v24 = Number(o24) || 0;
  const v27 = Number(o27) || 0;
  const v29 = Number(o29) || 0;
  const vTot = totOverride !== undefined && totOverride !== null ? Number(totOverride) || 0 : v21 + v24 + v27 + v29;
  target.os21000 += v21;
  target.os24000 += v24;
  target.os27000 += v27;
  target.os29000 += v29;
  target.total += vTot;
};

const subtractOsTotals = (a: OsTotals, b: OsTotals): OsTotals => ({
  os21000: a.os21000 - b.os21000,
  os24000: a.os24000 - b.os24000,
  os27000: a.os27000 - b.os27000,
  os29000: a.os29000 - b.os29000,
  total: a.total - b.total,
});

const addOsTotals = (a: OsTotals, b: OsTotals): OsTotals => ({
  os21000: a.os21000 + b.os21000,
  os24000: a.os24000 + b.os24000,
  os27000: a.os27000 + b.os27000,
  os29000: a.os29000 + b.os29000,
  total: a.total + b.total,
});

/**
 * Computes full Kewangan Jabatan breakdown by OS (21/24/27/29 & Total):
 * - Peruntukan Diluluskan: sum of JabatanAllocationRecord (N kali agihan)
 * - Peruntukan Diagihkan: sum of BK65 (jumlahRm / OS) across deduplicated non-BATAL programs (M program)
 * - Perbelanjaan Sebenar: if status is SELESAI or TANGGUNG -> belanja sebenar; else (except BATAL) -> BK65 diagihkan
 * - Baki (asal): Peruntukan Diluluskan - Peruntukan Diagihkan
 * - Baki (Penjimatan): Peruntukan Diagihkan - Perbelanjaan Sebenar
 * - JUMLAH BAKI: Baki (asal) + Baki (Penjimatan)
 * - Peruntukan Ditarik: sum of JabatanPullbackRecord (K rekod)
 * - JUMLAH BAKI TERKINI: JUMLAH BAKI - Peruntukan Ditarik
 */
export const computeJabatanFinanceSummary = (
  jabatanName: string,
  tahunFilter: string | number,
  programs: ProgramItem[],
  jabatanAllocations: JabatanAllocationRecord[],
  jabatanPullbacks: JabatanPullbackRecord[],
  pusatName?: string
): JabatanFinanceSummary => {
  const jabUpper = (jabatanName || '').trim().toUpperCase();
  const pusUpper = (pusatName || '').trim().toUpperCase();
  const tahunStr = String(tahunFilter ?? 'SEMUA').trim().toUpperCase();
  const matchYear = (yr: number | string | undefined) =>
    tahunStr === 'SEMUA' || tahunStr === 'ALL' || String(yr ?? '') === tahunStr;

  const diluluskan = emptyOsTotals();
  const agihanRecords = (jabatanAllocations || [])
    .filter((rec) => {
      if ((rec.jabatan || '').trim().toUpperCase() !== jabUpper) return false;
      if (pusUpper && (rec.pusat || '').trim().toUpperCase() !== pusUpper) return false;
      return matchYear(rec.tahun);
    })
    .sort((a, b) => (a.tarikh || a.createdAt || '').localeCompare(b.tarikh || b.createdAt || ''));

  agihanRecords.forEach((rec) => {
    addIntoOsTotals(diluluskan, rec.os21000, rec.os24000, rec.os27000, rec.os29000, rec.jumlah);
  });

  const matchingPrograms = deduplicateProgramsByCode(
    (programs || []).filter((p) => {
      if ((p.jabatan || '').trim().toUpperCase() !== jabUpper) return false;
      if (pusUpper && p.pusat && (p.pusat || '').trim().toUpperCase() !== pusUpper) return false;
      return matchYear(getProgramYear(p));
    })
  );

  const diagihkan = emptyOsTotals();
  const belanjaSebenar = emptyOsTotals();
  let programCount = 0;

  matchingPrograms.forEach((p) => {
    const st = (p.statusProgram || '').trim().toUpperCase();
    if (st === 'BATAL') return;

    programCount++;
    const a21 = Number(p.os21000) || 0;
    const a24 = Number(p.os24000) || 0;
    const a27 = Number(p.os27000) || 0;
    const a29 = Number(p.os29000) || 0;
    const aTot = p.jumlahRm !== undefined && p.jumlahRm !== null ? Number(p.jumlahRm) || 0 : a21 + a24 + a27 + a29;

    addIntoOsTotals(diagihkan, a21, a24, a27, a29, aTot);

    if (st === 'SELESAI' || st === 'TANGGUNG') {
      const b21 = Number(p.os21000Belanja) || 0;
      const b24 = Number(p.os24000Belanja) || 0;
      const b27 = Number(p.os27000Belanja) || 0;
      const b29 = Number(p.os29000Belanja) || 0;
      const bTot =
        p.jumlahBelanjaRm !== undefined && p.jumlahBelanjaRm !== null
          ? Number(p.jumlahBelanjaRm) || 0
          : b21 + b24 + b27 + b29;
      addIntoOsTotals(belanjaSebenar, b21, b24, b27, b29, bTot);
    } else {
      addIntoOsTotals(belanjaSebenar, a21, a24, a27, a29, aTot);
    }
  });

  const bakiAsal = subtractOsTotals(diluluskan, diagihkan);
  const bakiPenjimatan = subtractOsTotals(diagihkan, belanjaSebenar);
  const jumlahBaki = addOsTotals(bakiAsal, bakiPenjimatan);

  const ditarik = emptyOsTotals();
  const ditarikAsal = emptyOsTotals();
  const ditarikPenjimatan = emptyOsTotals();

  const pullbackRecords = (jabatanPullbacks || [])
    .filter((rec) => {
      if ((rec.jabatan || '').trim().toUpperCase() !== jabUpper) return false;
      if (pusUpper && (rec.pusat || '').trim().toUpperCase() !== pusUpper) return false;
      return matchYear(rec.tahun);
    })
    .sort((a, b) => (b.tarikh || b.createdAt || '').localeCompare(a.tarikh || a.createdAt || ''));

  pullbackRecords.forEach((rec) => {
    addIntoOsTotals(ditarik, rec.os21000, rec.os24000, rec.os27000, rec.os29000, rec.jumlah);
    if (rec.sumberBaki === 'PENJIMATAN') {
      addIntoOsTotals(ditarikPenjimatan, rec.os21000, rec.os24000, rec.os27000, rec.os29000, rec.jumlah);
    } else {
      addIntoOsTotals(ditarikAsal, rec.os21000, rec.os24000, rec.os27000, rec.os29000, rec.jumlah);
    }
  });

  const jumlahBakiTerkini = subtractOsTotals(jumlahBaki, ditarik);

  const calcAvail = (source: OsTotals, alreadyPulled: OsTotals): OsTotals => {
    const os21 = Math.max(0, Math.min(source.os21000 - alreadyPulled.os21000, jumlahBakiTerkini.os21000));
    const os24 = Math.max(0, Math.min(source.os24000 - alreadyPulled.os24000, jumlahBakiTerkini.os24000));
    const os27 = Math.max(0, Math.min(source.os27000 - alreadyPulled.os27000, jumlahBakiTerkini.os27000));
    const os29 = Math.max(0, Math.min(source.os29000 - alreadyPulled.os29000, jumlahBakiTerkini.os29000));
    return {
      os21000: os21,
      os24000: os24,
      os27000: os27,
      os29000: os29,
      total: os21 + os24 + os27 + os29,
    };
  };

  const availableTarikAsal = calcAvail(bakiAsal, ditarikAsal);
  const availableTarikPenjimatan = calcAvail(bakiPenjimatan, ditarikPenjimatan);

  return {
    diluluskan,
    agihanCount: agihanRecords.length,
    agihanRecords,
    diagihkan,
    programCount,
    belanjaSebenar,
    bakiAsal,
    bakiPenjimatan,
    jumlahBaki,
    ditarik,
    ditarikAsal,
    ditarikPenjimatan,
    pullbackCount: pullbackRecords.length,
    pullbackRecords,
    jumlahBakiTerkini,
    availableTarikAsal,
    availableTarikPenjimatan,
  };
};

export interface PusatPoolSummary {
  peruntukanDiluluskanPusat: OsTotals;
  jumlahDiagihkanKeJabatan: OsTotals;
  jumlahDitarikDariJabatan: OsTotals;
  bakiPusatUntukAgihan: OsTotals;
}

/**
 * Computes Pusat's remaining allocatable pool for Jabatan distribution by OS:
 * Baki Pusat = Peruntukan Diluluskan Pusat - Jumlah Agihan kepada Jabatan + Jumlah Ditarik/Dipulangkan
 */
export const computePusatPoolSummary = (
  pusatName: string,
  tahunFilter: string | number,
  fasaPeruntukanList: FasaPeruntukanRecord[],
  sumberKewanganList: string[],
  jabatanAllocations: JabatanAllocationRecord[],
  jabatanPullbacks: JabatanPullbackRecord[]
): PusatPoolSummary => {
  const pusUpper = (pusatName || '').trim().toUpperCase();
  const tahunStr = String(tahunFilter ?? 'SEMUA').trim().toUpperCase();
  const matchYear = (yr: number | string | undefined) =>
    tahunStr === 'SEMUA' || tahunStr === 'ALL' || String(yr ?? '') === tahunStr;

  const peruntukanDiluluskanPusat = pusUpper
    ? getPeruntukanDiluluskanStats(
        fasaPeruntukanList,
        sumberKewanganList,
        [pusatName],
        tahunStr === 'SEMUA' ? 'SEMUA' : tahunStr
      ).overall
    : emptyOsTotals();

  const jumlahDiagihkanKeJabatan = emptyOsTotals();
  (jabatanAllocations || []).forEach((rec) => {
    if ((rec.pusat || '').trim().toUpperCase() !== pusUpper) return;
    if (!matchYear(rec.tahun)) return;
    addIntoOsTotals(
      jumlahDiagihkanKeJabatan,
      rec.os21000,
      rec.os24000,
      rec.os27000,
      rec.os29000,
      rec.jumlah
    );
  });

  const jumlahDitarikDariJabatan = emptyOsTotals();
  (jabatanPullbacks || []).forEach((rec) => {
    if ((rec.pusat || '').trim().toUpperCase() !== pusUpper) return;
    if (!matchYear(rec.tahun)) return;
    addIntoOsTotals(
      jumlahDitarikDariJabatan,
      rec.os21000,
      rec.os24000,
      rec.os27000,
      rec.os29000,
      rec.jumlah
    );
  });

  const bakiPusatUntukAgihan = addOsTotals(
    subtractOsTotals(peruntukanDiluluskanPusat, jumlahDiagihkanKeJabatan),
    jumlahDitarikDariJabatan
  );

  return {
    peruntukanDiluluskanPusat,
    jumlahDiagihkanKeJabatan,
    jumlahDitarikDariJabatan,
    bakiPusatUntukAgihan,
  };
};

