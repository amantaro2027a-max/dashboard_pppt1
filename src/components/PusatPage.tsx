import React, { useState, useMemo, useEffect } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import {
  ProgramItem,
  Pegawai,
  PullbackSourceType,
  MessageTopik,
  JabatanAllocationRecord,
} from '../types/program';
import { formatRM, formatRMWithPrefix, formatNumber, getStatusConfig } from '../utils/formatters';
import { getCurrentFinanceYear, getFasaYear, getProgramYear } from '../utils/financeYear';
import { deduplicateProgramsByCode } from '../utils/programDedupe';
import {
  getPeruntukanDiluluskanStats,
  getProgramFinanceAggregate,
  computeJabatanFinanceSummary,
  computePusatPoolSummary,
  JabatanFinanceSummary,
} from '../utils/financeCalculations';
import * as XLSX from 'xlsx';
import {
  Building2,
  Landmark,
  Users,
  BarChart3,
  PieChart,
  Lock,
  ShieldAlert,
  ArrowRight,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  ArrowUpDown,
  X,
  Briefcase,
  Layers,
  TrendingUp,
  Wallet,
  Send,
  MessageSquare,
  RotateCcw,
  PlusCircle,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PusatJabatanChatSection } from './PusatJabatanChatSection';
import { DashboardPusatSection } from './DashboardPusatSection';

const OS_META: Array<{
  key: 'os21000' | 'os24000' | 'os27000' | 'os29000';
  label: string;
  shortLabel: string;
}> = [
  { key: 'os21000', label: 'OS21000', shortLabel: 'OS21' },
  { key: 'os24000', label: 'OS24000', shortLabel: 'OS24' },
  { key: 'os27000', label: 'OS27000', shortLabel: 'OS27' },
  { key: 'os29000', label: 'OS29000', shortLabel: 'OS29' },
];

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

interface JabatanMetrics {
  jabatan: string;
  pegawaiCount: number;
  pegawaiList: Pegawai[];
  programs: ProgramItem[];
  totalPrograms: number;
  selesai: number;
  dalamTindakan: number;
  tanggung: number;
  belum: number;
  batal: number;
  peserta: number;
  hari: number;
  peruntukan: number;
  belanja: number;
  penjimatan: number;
  successRate: number;
  utilRate: number;
  finSummary: JabatanFinanceSummary;
}

interface OsInputRow {
  os21000: number;
  os24000: number;
  os27000: number;
  os29000: number;
}

export const PusatPage: React.FC = () => {
  const {
    programs,
    pegawaiList,
    pusatList,
    jabatanMap,
    fasaPeruntukanList,
    sumberKewanganList,
    jabatanAllocations,
    jabatanPullbacks,
    pusatJabatanMessages,
    addJabatanAllocationsBatch,
    deleteJabatanAllocation,
    addJabatanPullback,
    sendPusatJabatanMessage,
    deletePusatJabatanMessage,
    showNotification,
    currentUser,
    isSuperAdmin,
    getPageAccessMode,
    getAuthorizedPusatList,
    viewProgramDetail,
    setActiveTab,
    logActivity,
  } = useProgramContext();

  const pageMode = getPageAccessMode('PUSAT');
  const canAccess = Boolean(currentUser) && pageMode !== 'none';
  const canManagePusatFinance = Boolean(
    currentUser && (isSuperAdmin || currentUser.levelId === 'KETUA_PUSAT')
  );
  const canUsePusatJabatanChat = Boolean(
    currentUser &&
      (isSuperAdmin ||
        currentUser.levelId === 'KETUA_PUSAT' ||
        currentUser.levelId === 'KETUA_JABATAN')
  );

  const authorizedPusatList = useMemo(() => {
    const base = getAuthorizedPusatList();
    if (isSuperAdmin) {
      const merged = new Set<string>([...pusatList, ...base]);
      programs.forEach((p) => {
        if (p.pusat && p.pusat !== 'TIDAK BERKENAAN') merged.add(p.pusat);
      });
      return Array.from(merged);
    }
    return base;
  }, [getAuthorizedPusatList, isSuperAdmin, pusatList, programs]);

  const [selectedPusat, setSelectedPusat] = useState<string>('');
  const [filterTahun, setFilterTahun] = useState<string>(() => String(getCurrentFinanceYear()));
  const [officerSearch, setOfficerSearch] = useState<string>('');
  const [officerSortKey, setOfficerSortKey] = useState<'id' | 'nama' | 'jabatan' | 'jawatan' | 'progCount'>('id');
  const [officerSortDir, setOfficerSortDir] = useState<'asc' | 'desc'>('asc');

  const [drillModal, setDrillModal] = useState<{
    title: string;
    subtitle?: string;
    items: ProgramItem[];
  } | null>(null);

  // State for Agihan kepada Jabatan
  const [agihanYear, setAgihanYear] = useState<number>(() => getCurrentFinanceYear());
  const [agihanTarikh, setAgihanTarikh] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [agihanCatatan, setAgihanCatatan] = useState<string>('');
  const [agihanInputs, setAgihanInputs] = useState<Record<string, OsInputRow>>({});

  // State for TARIK warning confirmation modal
  const [tarikModal, setTarikModal] = useState<{
    jabatan: string;
    sumberBaki: PullbackSourceType;
    tahun: number;
    maxOs: OsInputRow;
    os21000: number;
    os24000: number;
    os27000: number;
    os29000: number;
    tarikh: string;
    catatan: string;
  } | null>(null);

  // State for Delete Agihan confirmation modal
  const [deleteAgihanTarget, setDeleteAgihanTarget] = useState<JabatanAllocationRecord | null>(null);

  // Expandable pullback logs per Jabatan
  const [expandedPullbackJabs, setExpandedPullbackJabs] = useState<Record<string, boolean>>({});

  // Pusat-Jabatan private communication state
  const [chatJabatanFilter, setChatJabatanFilter] = useState<string>('SEMUA');
  const [chatTargetJabatan, setChatTargetJabatan] = useState<string>('');
  const [chatTopik, setChatTopik] = useState<MessageTopik>('BAKI');
  const [chatText, setChatText] = useState<string>('');

  // By default hide all sections except Section 1 (1. Nama Pusat) and Dashboard Pusat
  const [expandedSections, setExpandedSections] = useState<{
    dashboardPusat: boolean;
    peruntukanPusat: boolean;
    s2: boolean;
    s2b: boolean;
    s2c: boolean;
    chat: boolean;
    s3: boolean;
    s4: boolean;
    s5: boolean;
    s6: boolean;
  }>({
    dashboardPusat: true,
    peruntukanPusat: false,
    s2: false,
    s2b: false,
    s2c: false,
    chat: false,
    s3: false,
    s4: false,
    s5: false,
    s6: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (authorizedPusatList.length === 0) {
      setSelectedPusat('');
    } else if (!selectedPusat || !authorizedPusatList.includes(selectedPusat)) {
      setSelectedPusat(authorizedPusatList[0]);
    }
  }, [authorizedPusatList, selectedPusat]);

  useEffect(() => {
    if (filterTahun !== 'SEMUA') {
      const yrNum = Number(filterTahun);
      if (!isNaN(yrNum)) setAgihanYear(yrNum);
    }
  }, [filterTahun]);

  const availableYears = useMemo(() => {
    const set = new Set<string>([
      String(getCurrentFinanceYear()),
      ...programs.map((p) => String(getProgramYear(p))),
      ...(fasaPeruntukanList || []).map((f) => String(getFasaYear(f))),
      ...(jabatanAllocations || []).map((a) => String(a.tahun)),
      ...(jabatanPullbacks || []).map((pb) => String(pb.tahun)),
    ]);
    return Array.from(set).sort().reverse();
  }, [programs, fasaPeruntukanList, jabatanAllocations, jabatanPullbacks]);

  // Peruntukan Diluluskan dari Page Peruntukan bagi Pusat terpilih (lengkap pecahan OS & Sumber Kewangan)
  const peruntukanPusatStats = useMemo(() => {
    if (!selectedPusat) {
      return getPeruntukanDiluluskanStats([], sumberKewanganList, [], 'SEMUA');
    }
    return getPeruntukanDiluluskanStats(
      fasaPeruntukanList,
      sumberKewanganList,
      [selectedPusat],
      filterTahun === 'SEMUA' ? 'SEMUA' : filterTahun
    );
  }, [fasaPeruntukanList, sumberKewanganList, selectedPusat, filterTahun]);

  const peruntukanDiluluskan = peruntukanPusatStats.overall.total;

  // Autohide OS yang bernilai 0.00 daripada Page Peruntukan
  const activeOsList = useMemo(
    () => OS_META.filter((osItem) => (peruntukanPusatStats.overall[osItem.key] || 0) > 0),
    [peruntukanPusatStats]
  );

  const canDeleteAgihanRecord = (rec: JabatanAllocationRecord) => {
    if (isSuperAdmin) return { allowed: true, expired: false };
    if (currentUser?.levelId !== 'KETUA_PUSAT') return { allowed: false, expired: false };
    const createdMs = rec.createdAtMs ?? (rec.createdAt ? Date.parse(rec.createdAt) : NaN);
    if (!isNaN(createdMs) && Date.now() - createdMs <= THREE_DAYS_MS) {
      return { allowed: true, expired: false };
    }
    return { allowed: false, expired: true };
  };

  // Programs filtered to selectedPusat across all years (deduplicated by Kod Program)
  const allPusatPrograms = useMemo(() => {
    if (!selectedPusat) return [];
    return deduplicateProgramsByCode(programs.filter((p) => p.pusat === selectedPusat));
  }, [programs, selectedPusat]);

  // Programs filtered to selectedPusat and optional year (deduplicated by Kod Program)
  const pusatPrograms = useMemo(() => {
    if (!selectedPusat) return [];
    return deduplicateProgramsByCode(
      programs.filter((p) => {
        if (p.pusat !== selectedPusat) return false;
        if (filterTahun !== 'SEMUA' && String(getProgramYear(p)) !== filterTahun) return false;
        return true;
      })
    );
  }, [programs, selectedPusat, filterTahun]);

  // Jabatans under selectedPusat
  const jabatansUnderPusat = useMemo(() => {
    if (!selectedPusat) return [];
    const set = new Set<string>(jabatanMap[selectedPusat] || []);
    pusatPrograms.forEach((p) => {
      if (p.jabatan && p.jabatan !== 'TIDAK BERKENAAN') set.add(p.jabatan);
    });
    pegawaiList.forEach((pg) => {
      if (pg.pusat === selectedPusat && pg.jabatan && pg.jabatan !== 'TIDAK BERKENAAN') {
        set.add(pg.jabatan);
      }
    });
    return Array.from(set);
  }, [selectedPusat, jabatanMap, pusatPrograms, pegawaiList]);

  // Officers under selectedPusat (plus any officer assigned on pusatPrograms)
  const pusatOfficers = useMemo(() => {
    if (!selectedPusat) return [];
    const byId = new Map<string, Pegawai>();
    pegawaiList.forEach((pg) => {
      if (
        pg.pusat === selectedPusat ||
        (pg.jabatan && jabatansUnderPusat.includes(pg.jabatan))
      ) {
        byId.set(pg.id, pg);
      }
    });
    pusatPrograms.forEach((p) => {
      pegawaiList.forEach((pg) => {
        const idNorm = (pg.id || '').trim().toUpperCase();
        const nmNorm = (pg.nama || '').trim().toUpperCase();
        const match =
          (idNorm &&
            ((p.pengurusId || '').trim().toUpperCase() === idNorm ||
              (p.pengurusBersamaId || '').trim().toUpperCase() === idNorm ||
              (p.urusSetiaId || '').trim().toUpperCase() === idNorm)) ||
          (nmNorm &&
            ((p.pengurusNama || '').trim().toUpperCase() === nmNorm ||
              (p.pengurusBersamaNama || '').trim().toUpperCase() === nmNorm ||
              (p.urusSetiaNama || '').trim().toUpperCase() === nmNorm));
        if (match && !byId.has(pg.id)) {
          byId.set(pg.id, pg);
        }
      });
    });
    return Array.from(byId.values());
  }, [pegawaiList, selectedPusat, jabatansUnderPusat, pusatPrograms]);

  // Officer program stats under Pusat
  const officerProgramMap = useMemo(() => {
    const map: Record<string, { all: ProgramItem[]; peruntukan: number }> = {};
    pusatOfficers.forEach((pg) => {
      const idNorm = (pg.id || '').trim().toUpperCase();
      const namaNorm = (pg.nama || '').trim().toUpperCase();
      const matched = deduplicateProgramsByCode(
        pusatPrograms.filter((p) => {
          const pId = (p.pengurusId || '').trim().toUpperCase();
          const pNama = (p.pengurusNama || '').trim().toUpperCase();
          const pbId = (p.pengurusBersamaId || '').trim().toUpperCase();
          const pbNama = (p.pengurusBersamaNama || '').trim().toUpperCase();
          return (
            (idNorm && (pId === idNorm || pbId === idNorm)) ||
            (namaNorm && (pNama === namaNorm || pbNama === namaNorm))
          );
        })
      );
      const peruntukan = getProgramFinanceAggregate(matched, true).diagihkan.total;
      map[pg.id] = { all: matched, peruntukan };
    });
    return map;
  }, [pusatOfficers, pusatPrograms]);

  const filteredSortedOfficers = useMemo(() => {
    let list = [...pusatOfficers];
    if (officerSearch.trim()) {
      const q = officerSearch.toLowerCase();
      list = list.filter(
        (pg) =>
          (pg.id && pg.id.toLowerCase().includes(q)) ||
          (pg.nama && pg.nama.toLowerCase().includes(q)) ||
          (pg.jawatan && pg.jawatan.toLowerCase().includes(q)) ||
          (pg.jabatan && pg.jabatan.toLowerCase().includes(q)) ||
          (pg.emel && pg.emel.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (officerSortKey === 'progCount') {
        const cA = officerProgramMap[a.id]?.all.length || 0;
        const cB = officerProgramMap[b.id]?.all.length || 0;
        return officerSortDir === 'asc' ? cA - cB : cB - cA;
      }
      if (officerSortKey === 'id') {
        const nA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const nB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        return officerSortDir === 'asc' ? nA - nB : nB - nA;
      }
      const vA = (a[officerSortKey] || '').toString();
      const vB = (b[officerSortKey] || '').toString();
      const cmp = vA.localeCompare(vB, undefined, { numeric: true, sensitivity: 'base' });
      return officerSortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [pusatOfficers, officerSearch, officerSortKey, officerSortDir, officerProgramMap]);

  const toggleOfficerSort = (key: 'id' | 'nama' | 'jabatan' | 'jawatan' | 'progCount') => {
    if (officerSortKey === key) {
      setOfficerSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOfficerSortKey(key);
      setOfficerSortDir('asc');
    }
  };

  // Per-Jabatan aggregated metrics + OS Breakdown Summary
  const jabatanMetricsList: JabatanMetrics[] = useMemo(() => {
    return jabatansUnderPusat.map((jab) => {
      const progs = pusatPrograms.filter((p) => p.jabatan === jab);
      const offs = pusatOfficers.filter((pg) => pg.jabatan === jab);

      let selesai = 0;
      let dalamTindakan = 0;
      let tanggung = 0;
      let belum = 0;
      let batal = 0;
      let peserta = 0;
      let hari = 0;

      progs.forEach((p) => {
        const st = (p.statusProgram || '').trim().toUpperCase();
        if (st === 'SELESAI') selesai++;
        else if (st === 'DALAM TINDAKAN') dalamTindakan++;
        else if (st === 'TANGGUNG') tanggung++;
        else if (st === 'BATAL') batal++;
        else belum++;

        if (st !== 'BATAL') {
          peserta += Number(p.bilanganPeserta) || 0;
          hari += Number(p.jumlahHari) || 0;
        }
      });

      const fin = getProgramFinanceAggregate(progs, true);
      const peruntukan = fin.diagihkan.total;
      const belanja = fin.belanja.total;
      const penjimatan = fin.penjimatan.total;

      const finSummary = computeJabatanFinanceSummary(
        jab,
        filterTahun,
        programs,
        jabatanAllocations,
        jabatanPullbacks,
        selectedPusat
      );

      const active = progs.length - batal;
      const successRate = active > 0 ? Math.round((selesai / active) * 100) : 0;
      const utilRate = peruntukan > 0 ? Math.round((belanja / peruntukan) * 100) : 0;

      return {
        jabatan: jab,
        pegawaiCount: offs.length,
        pegawaiList: offs,
        programs: progs,
        totalPrograms: progs.length,
        selesai,
        dalamTindakan,
        tanggung,
        belum,
        batal,
        peserta,
        hari,
        peruntukan,
        belanja,
        penjimatan,
        successRate,
        utilRate,
        finSummary,
      };
    });
  }, [
    jabatansUnderPusat,
    pusatPrograms,
    pusatOfficers,
    filterTahun,
    programs,
    jabatanAllocations,
    jabatanPullbacks,
    selectedPusat,
  ]);

  // Pusat Pool Summary for Agihan kepada Jabatan (always targeted at agihanYear)
  const effectiveAgihanYear = filterTahun === 'SEMUA' ? agihanYear : Number(filterTahun) || agihanYear;

  const pusatPool = useMemo(() => {
    return computePusatPoolSummary(
      selectedPusat,
      effectiveAgihanYear,
      fasaPeruntukanList,
      sumberKewanganList,
      jabatanAllocations,
      jabatanPullbacks
    );
  }, [
    selectedPusat,
    effectiveAgihanYear,
    fasaPeruntukanList,
    sumberKewanganList,
    jabatanAllocations,
    jabatanPullbacks,
  ]);

  // Reset agihan inputs & default chat Jabatan when selectedPusat changes
  useEffect(() => {
    setAgihanInputs({});
    if (jabatansUnderPusat.length > 0 && !jabatansUnderPusat.includes(chatTargetJabatan)) {
      setChatTargetJabatan(
        currentUser?.levelId === 'KETUA_JABATAN' && currentUser?.jabatan
          ? currentUser.jabatan
          : jabatansUnderPusat[0]
      );
    }
  }, [selectedPusat, jabatansUnderPusat, chatTargetJabatan, currentUser]);

  // Planned Agihan totals across all Jabatans in current form
  const plannedAgihanTotals = useMemo(() => {
    let os21000 = 0;
    let os24000 = 0;
    let os27000 = 0;
    let os29000 = 0;
    jabatansUnderPusat.forEach((jab) => {
      const row = agihanInputs[jab];
      if (!row) return;
      os21000 += Math.max(0, Number(row.os21000) || 0);
      os24000 += Math.max(0, Number(row.os24000) || 0);
      os27000 += Math.max(0, Number(row.os27000) || 0);
      os29000 += Math.max(0, Number(row.os29000) || 0);
    });
    return {
      os21000,
      os24000,
      os27000,
      os29000,
      total: os21000 + os24000 + os27000 + os29000,
    };
  }, [jabatansUnderPusat, agihanInputs]);

  const bakiPusatSelepasAgihan = useMemo(
    () => ({
      os21000: pusatPool.bakiPusatUntukAgihan.os21000 - plannedAgihanTotals.os21000,
      os24000: pusatPool.bakiPusatUntukAgihan.os24000 - plannedAgihanTotals.os24000,
      os27000: pusatPool.bakiPusatUntukAgihan.os27000 - plannedAgihanTotals.os27000,
      os29000: pusatPool.bakiPusatUntukAgihan.os29000 - plannedAgihanTotals.os29000,
      total: pusatPool.bakiPusatUntukAgihan.total - plannedAgihanTotals.total,
    }),
    [pusatPool, plannedAgihanTotals]
  );

  // Rekod Agihan per Jabatan matrix (ordered chronologically)
  const agihanMatrix = useMemo(() => {
    const byJab: Record<string, JabatanAllocationRecord[]> = {};
    jabatansUnderPusat.forEach((jab) => {
      byJab[jab] = (jabatanAllocations || [])
        .filter((rec) => {
          if ((rec.pusat || '').trim().toUpperCase() !== (selectedPusat || '').trim().toUpperCase())
            return false;
          if ((rec.jabatan || '').trim().toUpperCase() !== jab.trim().toUpperCase()) return false;
          if (filterTahun !== 'SEMUA' && String(rec.tahun) !== filterTahun) return false;
          return true;
        })
        .sort((a, b) => (a.tarikh || a.createdAt || '').localeCompare(b.tarikh || b.createdAt || ''));
    });

    const maxRows = Math.max(
      1,
      ...jabatansUnderPusat.map((j) => (byJab[j] ? byJab[j].length : 0))
    );

    const totalsByJab: Record<
      string,
      { os21000: number; os24000: number; os27000: number; os29000: number; total: number }
    > = {};
    jabatansUnderPusat.forEach((jab) => {
      const list = byJab[jab] || [];
      totalsByJab[jab] = list.reduce(
        (acc, r) => ({
          os21000: acc.os21000 + (Number(r.os21000) || 0),
          os24000: acc.os24000 + (Number(r.os24000) || 0),
          os27000: acc.os27000 + (Number(r.os27000) || 0),
          os29000: acc.os29000 + (Number(r.os29000) || 0),
          total: acc.total + (Number(r.jumlah) || 0),
        }),
        { os21000: 0, os24000: 0, os27000: 0, os29000: 0, total: 0 }
      );
    });

    return { byJab, maxRows, totalsByJab };
  }, [jabatansUnderPusat, jabatanAllocations, selectedPusat, filterTahun]);

  // Filtered Pusat-Jabatan Messages
  const filteredPusatMessages = useMemo(() => {
    if (!canUsePusatJabatanChat || !selectedPusat) return [];
    const pusUpper = selectedPusat.trim().toUpperCase();
    return (pusatJabatanMessages || [])
      .filter((m) => {
        if ((m.pusat || '').trim().toUpperCase() !== pusUpper) return false;
        if (filterTahun !== 'SEMUA' && String(m.tahun) !== filterTahun) return false;
        if (
          chatJabatanFilter !== 'SEMUA' &&
          (m.jabatan || '').trim().toUpperCase() !== chatJabatanFilter.trim().toUpperCase()
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }, [canUsePusatJabatanChat, selectedPusat, pusatJabatanMessages, filterTahun, chatJabatanFilter]);

  const handleAgihanInputChange = (
    jabatan: string,
    field: keyof OsInputRow,
    val: string
  ) => {
    const num = val === '' ? 0 : Math.max(0, Number(val) || 0);
    setAgihanInputs((prev) => ({
      ...prev,
      [jabatan]: {
        os21000: prev[jabatan]?.os21000 ?? 0,
        os24000: prev[jabatan]?.os24000 ?? 0,
        os27000: prev[jabatan]?.os27000 ?? 0,
        os29000: prev[jabatan]?.os29000 ?? 0,
        [field]: num,
      },
    }));
  };

  const handleSubmitAgihanBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPusat) return;

    const entries = jabatansUnderPusat
      .map((jab) => {
        const row = agihanInputs[jab] || { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
        return {
          pusat: selectedPusat,
          jabatan: jab,
          tahun: effectiveAgihanYear,
          tarikh: agihanTarikh || new Date().toISOString().slice(0, 10),
          os21000: Number(row.os21000) || 0,
          os24000: Number(row.os24000) || 0,
          os27000: Number(row.os27000) || 0,
          os29000: Number(row.os29000) || 0,
          catatan: agihanCatatan.trim(),
        };
      })
      .filter((en) => en.os21000 + en.os24000 + en.os27000 + en.os29000 > 0);

    if (entries.length === 0) {
      showNotification({
        type: 'error',
        title: 'Tiada Amaun Agihan',
        message: 'Sila masukkan sekurang-kurangnya satu amaun pecahan OS untuk diagihkan kepada Jabatan.',
      });
      return;
    }

    const res = addJabatanAllocationsBatch(entries);
    if (!res.success) {
      showNotification({
        type: 'error',
        title: 'Gagal Mengagihkan Peruntukan',
        message: res.message || 'Agihan peruntukan kepada Jabatan tidak dapat disimpan.',
      });
      return;
    }

    setAgihanInputs({});
    setAgihanCatatan('');
    showNotification({
      type: 'success',
      title: 'Agihan Kepada Jabatan Berjaya',
      message: res.message || 'Agihan peruntukan kepada Jabatan telah berjaya direkodkan.',
    });
  };

  const openTarikModal = (jabatan: string, sumberBaki: PullbackSourceType) => {
    const targetYr = filterTahun === 'SEMUA' ? effectiveAgihanYear : Number(filterTahun) || effectiveAgihanYear;
    const yrSummary = computeJabatanFinanceSummary(
      jabatan,
      targetYr,
      programs,
      jabatanAllocations,
      jabatanPullbacks,
      selectedPusat
    );
    const maxSource =
      sumberBaki === 'ASAL' ? yrSummary.availableTarikAsal : yrSummary.availableTarikPenjimatan;

    setTarikModal({
      jabatan,
      sumberBaki,
      tahun: targetYr,
      maxOs: {
        os21000: maxSource.os21000,
        os24000: maxSource.os24000,
        os27000: maxSource.os27000,
        os29000: maxSource.os29000,
      },
      os21000: maxSource.os21000,
      os24000: maxSource.os24000,
      os27000: maxSource.os27000,
      os29000: maxSource.os29000,
      tarikh: new Date().toISOString().slice(0, 10),
      catatan: '',
    });
  };

  const handleConfirmTarik = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarikModal || !selectedPusat) return;

    const res = addJabatanPullback({
      pusat: selectedPusat,
      jabatan: tarikModal.jabatan,
      tahun: tarikModal.tahun,
      jenisTindakan: 'TARIK',
      sumberBaki: tarikModal.sumberBaki,
      tarikh: tarikModal.tarikh || new Date().toISOString().slice(0, 10),
      os21000: Number(tarikModal.os21000) || 0,
      os24000: Number(tarikModal.os24000) || 0,
      os27000: Number(tarikModal.os27000) || 0,
      os29000: Number(tarikModal.os29000) || 0,
      catatan: tarikModal.catatan.trim(),
    });

    if (!res.success) {
      showNotification({
        type: 'error',
        title: 'Gagal Menarik Baki Jabatan',
        message: res.message || 'Penarikan baki tidak berjaya.',
      });
      return;
    }

    setTarikModal(null);
    showNotification({
      type: 'success',
      title: 'Penarikan Baki Berjaya',
      message: res.message || 'Baki jabatan telah ditarik dan digabungkan semula ke Baki Pusat.',
    });
  };

  const handleConfirmDeleteAgihan = () => {
    if (!deleteAgihanTarget) return;
    const res = deleteJabatanAllocation(deleteAgihanTarget.id);
    setDeleteAgihanTarget(null);
    showNotification({
      type: res.success ? 'success' : 'error',
      title: res.success ? 'Rekod Agihan Dipadam' : 'Gagal Memadam Rekod',
      message: res.message || (res.success ? 'Rekod agihan telah dipadam dan baki Pusat dikembalikan.' : 'Tidak berjaya.'),
    });
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPusat) return;
    const targetJab =
      chatTargetJabatan ||
      (currentUser?.levelId === 'KETUA_JABATAN' ? currentUser.jabatan || '' : jabatansUnderPusat[0] || '');
    if (!targetJab) {
      showNotification({
        type: 'error',
        title: 'Tiada Jabatan Dipilih',
        message: 'Sila pilih Jabatan untuk menghantar mesej.',
      });
      return;
    }
    const res = sendPusatJabatanMessage({
      pusat: selectedPusat,
      jabatan: targetJab,
      tahun: effectiveAgihanYear,
      mesej: chatText,
      topik: chatTopik,
    });
    if (!res.success) {
      showNotification({
        type: 'error',
        title: 'Gagal Menghantar Mesej',
        message: res.message || 'Sila cuba lagi.',
      });
      return;
    }
    setChatText('');
  };

  // Pusat Grand Totals
  const pusatTotals = useMemo(() => {
    return jabatanMetricsList.reduce(
      (acc, j) => ({
        totalPrograms: acc.totalPrograms + j.totalPrograms,
        selesai: acc.selesai + j.selesai,
        dalamTindakan: acc.dalamTindakan + j.dalamTindakan,
        tanggung: acc.tanggung + j.tanggung,
        belum: acc.belum + j.belum,
        batal: acc.batal + j.batal,
        peserta: acc.peserta + j.peserta,
        hari: acc.hari + j.hari,
        peruntukan: acc.peruntukan + j.peruntukan,
        belanja: acc.belanja + j.belanja,
        penjimatan: acc.penjimatan + j.penjimatan,
      }),
      {
        totalPrograms: 0,
        selesai: 0,
        dalamTindakan: 0,
        tanggung: 0,
        belum: 0,
        batal: 0,
        peserta: 0,
        hari: 0,
        peruntukan: 0,
        belanja: 0,
        penjimatan: 0,
      }
    );
  }, [jabatanMetricsList]);

  const maxJabProg = useMemo(
    () => Math.max(1, ...jabatanMetricsList.map((j) => j.totalPrograms)),
    [jabatanMetricsList]
  );
  const maxJabBudget = useMemo(
    () => Math.max(1, ...jabatanMetricsList.map((j) => Math.max(j.peruntukan, j.belanja))),
    [jabatanMetricsList]
  );
  const maxJabPeserta = useMemo(
    () => Math.max(1, ...jabatanMetricsList.map((j) => j.peserta)),
    [jabatanMetricsList]
  );

  const handleExportRumusanPusat = () => {
    const rows = jabatanMetricsList.map((j, idx) => ({
      Bil: idx + 1,
      'Nama Jabatan': j.jabatan,
      'Bil. Pegawai': j.pegawaiCount,
      'Jumlah Program': j.totalPrograms,
      Selesai: j.selesai,
      'Dalam Tindakan': j.dalamTindakan,
      Tanggung: j.tanggung,
      'Belum Tindakan': j.belum,
      Batal: j.batal,
      'Jumlah Peserta': j.peserta,
      'Jumlah Hari': j.hari,
      'Peruntukan Diagihkan (RM)': j.peruntukan,
      'Belanja Sebenar (RM)': j.belanja,
      'Penjimatan (RM)': j.penjimatan,
      'Kadar Selesai (%)': `${j.successRate}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rumusan Jabatan');
    XLSX.writeFile(
      wb,
      `RUMUSAN_PUSAT_${(selectedPusat || 'IAB').replace(/[^A-Z0-9]/gi, '_').slice(0, 30)}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
    logActivity({
      action_type: 'EXPORT',
      module_name: 'Page Pusat',
      activity_description: `Exported Pusat "${selectedPusat || 'IAB'}" summary to Excel`,
      record_id: selectedPusat || 'IAB',
      status: 'SUCCESS',
    });
  };

  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-rose-50">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Akses Dihadkan · Kebenaran Halaman Diperlukan
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-4 tracking-tight">
            Halaman Pusat (IAB)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            {currentUser
              ? 'Akaun anda tidak mempunyai kebenaran untuk memaparkan Halaman Pusat. Sila hubungi Super Admin untuk menetapkan kebenaran dalam KEBENARAN VIEW/PAPAR PAGE.'
              : 'Halaman ini memerlukan log masuk pengguna. Sila log masuk melalui Portal Admin untuk melihat maklumat Pusat anda.'}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!currentUser && (
              <button
                onClick={() => setActiveTab('admin')}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Log Masuk Portal Admin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Kembali ke Dashboard Program
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ================================================================= */}
      {/* 1. NAMA PUSAT & KAWALAN TAPISAN                                    */}
      {/* ================================================================= */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-600/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                  1. Nama Pusat
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">
                  {isSuperAdmin
                    ? 'Akses Penuh Super Admin'
                    : pageMode === 'edit'
                    ? 'Akses Pusat Pengguna (Edit)'
                    : 'Mod Paparan Sahaja (View Only)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 uppercase">
                {selectedPusat || 'Tiada Pusat Ditugaskan'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {isSuperAdmin
                  ? 'Paparan analitik lengkap mengikut Pusat dan perbandingan jabatan di bawahnya.'
                  : 'Paparan ditapis secara automatik mengikut Pusat yang berdaftar di bawah profil akaun anda.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tahun */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tahun Program
              </label>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="SEMUA">SEMUA TAHUN</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Pusat Selector (Super Admin or multiple authorized) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pilih Pusat {isSuperAdmin ? '(Super Admin)' : '(Terkunci Mengikut Akaun)'}
              </label>
              <select
                value={selectedPusat}
                disabled={!isSuperAdmin && authorizedPusatList.length <= 1}
                onChange={(e) => setSelectedPusat(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-xs disabled:opacity-75"
              >
                {authorizedPusatList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Ringkas Pusat */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Jabatan</span>
            <span className="text-lg font-black text-white tabular-nums mt-0.5 block">
              {jabatansUnderPusat.length}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Pegawai</span>
            <span className="text-lg font-black text-cyan-300 tabular-nums mt-0.5 block">
              {pusatOfficers.length}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Jumlah Program</span>
            <span className="text-lg font-black text-blue-300 tabular-nums mt-0.5 block">
              {pusatTotals.totalPrograms}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-blue-300 block">Peruntukan Diluluskan</span>
            <span className="text-sm font-black text-blue-200 tabular-nums mt-1 block">
              {formatRMWithPrefix(peruntukanDiluluskan)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Peruntukan Diagihkan</span>
            <span className="text-sm font-black text-amber-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(pusatTotals.peruntukan)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Belanja</span>
            <span className="text-sm font-black text-emerald-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(pusatTotals.belanja)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Penjimatan</span>
            <span className="text-sm font-black text-teal-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(pusatTotals.penjimatan)}
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* DASHBOARD PUSAT (DEFAULT PAPAR)                                   */}
      {/* ================================================================= */}
      <DashboardPusatSection
        selectedPusat={selectedPusat}
        filterTahun={filterTahun}
        jabatansUnderPusat={jabatansUnderPusat}
        pusatPrograms={pusatPrograms}
        allPusatPrograms={allPusatPrograms}
        pusatOfficers={pusatOfficers}
        allPegawaiList={pegawaiList}
        isExpanded={expandedSections.dashboardPusat}
        onToggleExpand={() => toggleSection('dashboardPusat')}
        onViewProgram={viewProgramDetail}
        onDrillDown={(title, subtitle, items) => setDrillModal({ title, subtitle, items })}
        onLogExport={(description) =>
          logActivity({
            action_type: 'EXPORT',
            module_name: 'Page Pusat · Dashboard Pusat',
            activity_description: description,
            record_id: selectedPusat || 'IAB',
            status: 'SUCCESS',
          })
        }
        onNotify={showNotification}
      />

      {/* ================================================================= */}
      {/* 1B. PERUNTUKAN DILULUSKAN MENGIKUT PECAHAN OS (DARI PAGE PERUNTUKAN) */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('peruntukanPusat')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Peruntukan Diluluskan Pusat · Pecahan OS (Page Peruntukan)
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Peruntukan Diluluskan Mengikut Pecahan OS ({selectedPusat || '-'})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hanya pecahan OS yang menerima peruntukan (&gt; RM 0.00) daripada Page Peruntukan dipaparkan.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span className="text-sm font-black text-blue-800 font-mono tabular-nums">
              {formatRMWithPrefix(peruntukanDiluluskan)}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap">
              <span>{expandedSections.peruntukanPusat ? 'Sembunyi' : 'Papar'}</span>
              {expandedSections.peruntukanPusat ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          </div>
        </button>

        {expandedSections.peruntukanPusat && (
          <div className="px-6 pb-6 pt-3 border-t border-slate-100">
            {activeOsList.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Tiada pecahan OS menerima peruntukan (RM 0.00) daripada Page Peruntukan bagi Pusat dan tahun yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 text-left min-w-[200px]">SUMBER KEWANGAN</th>
                      {activeOsList.map((osItem) => (
                        <th key={osItem.key} className="py-2.5 px-3 text-right">
                          {osItem.label} (RM)
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right bg-slate-800">JUMLAH DILULUSKAN (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(peruntukanPusatStats.bySumber)
                      .filter(([, tot]) => tot.total > 0)
                      .map(([sk, tot]) => (
                        <tr key={sk} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{sk}</td>
                          {activeOsList.map((osItem) => (
                            <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                              {formatRM(tot[osItem.key])}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-900 bg-blue-50/40">
                            {formatRM(tot.total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="py-3 px-3 uppercase">JUMLAH PERUNTUKAN DILULUSKAN</td>
                      {activeOsList.map((osItem) => (
                        <td key={osItem.key} className="py-3 px-3 text-right font-mono tabular-nums">
                          {formatRM(peruntukanPusatStats.overall[osItem.key])}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-900 bg-blue-100/60">
                        {formatRMWithPrefix(peruntukanPusatStats.overall.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 2. NAMA-NAMA JABATAN DI BAWAH PUSAT (DENGAN PECAHAN OS & TARIK)   */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s2')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              2. Senarai Jabatan &amp; Pecahan OS Kewangan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Nama-Nama Jabatan di Bawah {selectedPusat}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Perbelanjaan Sebenar mengambil nilai Belanja Sebenar bagi status SELESAI / TANGGUNG dan nilai BK65 bagi status aktif lain.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-600 tabular-nums">
              {jabatansUnderPusat.length} Jabatan Aktif
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap">
              <span>{expandedSections.s2 ? 'Sembunyi' : 'Papar'}</span>
              {expandedSections.s2 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
        </button>

        {expandedSections.s2 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100">
            {jabatanMetricsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Tiada jabatan direkodkan di bawah pusat ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {jabatanMetricsList.map((jm, idx) => {
                  const fs = jm.finSummary;
                  const isPullbackExpanded = Boolean(expandedPullbackJabs[jm.jabatan]);
                  return (
                    <div
                      key={jm.jabatan}
                      className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col justify-between gap-4"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                            <span className="font-mono text-slate-500">JABATAN #{idx + 1}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-emerald-700 tabular-nums">{jm.successRate}% Selesai</span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mt-1.5 uppercase leading-snug">
                            {jm.jabatan}
                          </h4>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs shrink-0">
                          <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 block">Pegawai</span>
                            <strong className="text-slate-900 tabular-nums">{jm.pegawaiCount}</strong>
                          </div>
                          <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 block">Program</span>
                            <strong className="text-blue-700 tabular-nums">{jm.totalPrograms}</strong>
                          </div>
                          <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                            <span className="text-[9px] uppercase text-slate-500 block">Peserta</span>
                            <strong className="text-slate-900 tabular-nums">{formatNumber(jm.peserta)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Pecahan OS Table (autohide 0.00 OS from Page Peruntukan) */}
                      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                        <table className="w-full text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                              <th className="py-2 px-2.5 text-left min-w-[175px]">BUTIRAN KEWANGAN JABATAN</th>
                              {activeOsList.map((osItem) => (
                                <th key={osItem.key} className="py-2 px-2 text-right">
                                  {osItem.label}
                                </th>
                              ))}
                              <th className="py-2 px-2.5 text-right bg-slate-800">JUMLAH (RM)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr className="bg-blue-50/40">
                              <td className="py-2 px-2.5 font-bold text-slate-900">
                                Peruntukan Diluluskan
                                <span className="block text-[10px] font-medium text-blue-700">
                                  ({fs.agihanCount} kali agihan)
                                </span>
                              </td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.diluluskan[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums font-black text-blue-900 bg-blue-50/60">
                                {formatRM(fs.diluluskan.total)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2 px-2.5 font-semibold text-slate-800">
                                Peruntukan Diagihkan
                                <span className="block text-[10px] text-slate-500">
                                  ({fs.programCount} program · BK65)
                                </span>
                              </td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.diagihkan[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50">
                                {formatRM(fs.diagihkan.total)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2 px-2.5 font-semibold text-slate-800">
                                Perbelanjaan Sebenar
                                <span className="block text-[10px] text-slate-500">
                                  ({fs.programCount} program)
                                </span>
                              </td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.belanjaSebenar[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-emerald-700 bg-emerald-50/40">
                                {formatRM(fs.belanjaSebenar.total)}
                              </td>
                            </tr>

                            <tr className="bg-amber-50/30">
                              <td className="py-2 px-2.5 font-semibold text-slate-900">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div>
                                    <span>Baki (asal)</span>
                                    <span className="block text-[9px] text-slate-500 font-normal">
                                      Diluluskan - Diagihkan
                                    </span>
                                  </div>
                                  {canManagePusatFinance && (
                                    <button
                                      type="button"
                                      disabled={fs.availableTarikAsal.total <= 0}
                                      onClick={() => openTarikModal(jm.jabatan, 'ASAL')}
                                      className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                                    >
                                      TARIK
                                    </button>
                                  )}
                                </div>
                              </td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.bakiAsal[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-amber-800 bg-amber-50/60">
                                {formatRM(fs.bakiAsal.total)}
                              </td>
                            </tr>

                            <tr className="bg-teal-50/30">
                              <td className="py-2 px-2.5 font-semibold text-slate-900">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div>
                                    <span>Baki (Penjimatan)</span>
                                    <span className="block text-[9px] text-slate-500 font-normal">
                                      Diagihkan - Belanja Sebenar
                                    </span>
                                  </div>
                                  {canManagePusatFinance && (
                                    <button
                                      type="button"
                                      disabled={fs.availableTarikPenjimatan.total <= 0}
                                      onClick={() => openTarikModal(jm.jabatan, 'PENJIMATAN')}
                                      className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                                    >
                                      TARIK
                                    </button>
                                  )}
                                </div>
                              </td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.bakiPenjimatan[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-teal-800 bg-teal-50/60">
                                {formatRM(fs.bakiPenjimatan.total)}
                              </td>
                            </tr>

                            <tr className="bg-slate-100 font-bold">
                              <td className="py-2 px-2.5 text-slate-900 uppercase">JUMLAH BAKI</td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.jumlahBaki[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums font-black text-slate-900">
                                {formatRM(fs.jumlahBaki.total)}
                              </td>
                            </tr>

                            <tr className="text-rose-800">
                              <td className="py-2 px-2.5 font-semibold">
                                Peruntukan Ditarik
                                <span className="block text-[10px] font-normal text-rose-600">
                                  ({fs.pullbackCount} rekod)
                                </span>
                              </td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.ditarik[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold bg-rose-50/50">
                                {formatRM(fs.ditarik.total)}
                              </td>
                            </tr>

                            <tr className="bg-slate-900 text-white font-black">
                              <td className="py-2.5 px-2.5 uppercase tracking-wide">
                                JUMLAH BAKI TERKINI
                              </td>
                              {activeOsList.map((osItem) => (
                                <td key={osItem.key} className="py-2.5 px-2 text-right font-mono tabular-nums">
                                  {formatRM(fs.jumlahBakiTerkini[osItem.key])}
                                </td>
                              ))}
                              <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-amber-300 bg-slate-800">
                                {formatRM(fs.jumlahBakiTerkini.total)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Card Footer & Optional Pullback History */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          {fs.pullbackCount > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPullbackJabs((prev) => ({
                                  ...prev,
                                  [jm.jabatan]: !prev[jm.jabatan],
                                }))
                              }
                              className="inline-flex items-center gap-1 font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Rekod Penarikan / Pemulangan ({fs.pullbackCount})</span>
                              {isPullbackExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400">Tiada rekod penarikan / pemulangan baki.</span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setDrillModal({
                                title: jm.jabatan,
                                subtitle: `${jm.totalPrograms} Program di bawah ${selectedPusat}`,
                                items: jm.programs,
                              })
                            }
                            className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Papar Program ({jm.totalPrograms})</span>
                          </button>
                        </div>

                        {isPullbackExpanded && fs.pullbackRecords.length > 0 && (
                          <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                            {fs.pullbackRecords.map((pb) => (
                              <div
                                key={pb.id}
                                className="flex flex-wrap items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded border border-rose-100"
                              >
                                <div>
                                  <span
                                    className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded mr-1.5 ${
                                      pb.jenisTindakan === 'TARIK'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {pb.jenisTindakan} · {pb.sumberBaki === 'ASAL' ? 'Baki (asal)' : 'Baki (Penjimatan)'}
                                  </span>
                                  <span className="text-slate-600 font-mono">{pb.tarikh}</span>
                                  {pb.catatan && (
                                    <span className="block text-[10px] text-slate-500 mt-0.5">
                                      Catatan: {pb.catatan} ({pb.dilakukanOlehNama || pb.dilakukanOlehId})
                                    </span>
                                  )}
                                </div>
                                <div className="text-right font-mono font-bold text-rose-800">
                                  {formatRMWithPrefix(pb.jumlah)}
                                  {activeOsList.length > 0 && (
                                    <span className="block text-[9px] font-normal text-slate-500">
                                      {activeOsList.map((o) => `${o.shortLabel}:${formatRM(pb[o.key])}`).join(' | ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 2B. AGIHAN KEPADA JABATAN MENGIKUT PECAHAN OS                     */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s2b')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              2B. Agihan Kepada Jabatan Mengikut OS
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Pengurusan Agihan Peruntukan Pusat ke Jabatan ({effectiveAgihanYear})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Baki Pusat merangkumi Peruntukan Diluluskan Pusat ditolak agihan terdahulu serta ditambah semula peruntukan yang ditarik/dipulangkan.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span className="text-xs font-bold text-indigo-800 font-mono tabular-nums">
              Baki: {formatRMWithPrefix(pusatPool.bakiPusatUntukAgihan.total)}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap">
              <span>{expandedSections.s2b ? 'Sembunyi' : 'Papar'}</span>
              {expandedSections.s2b ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
        </button>

        {expandedSections.s2b && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-5">
            {filterTahun === 'SEMUA' && (
              <div className="flex items-center justify-end gap-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Tahun Agihan:</label>
                <select
                  value={agihanYear}
                  onChange={(e) => setAgihanYear(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ringkasan Pool Baki Pusat */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 text-left">KEDUDUKAN BAKI PUSAT ({effectiveAgihanYear})</th>
                    {activeOsList.map((osItem) => (
                      <th key={osItem.key} className="py-2.5 px-3 text-right">
                        {osItem.label} (RM)
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right bg-slate-800">JUMLAH (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-blue-50/40">
                    <td className="py-2 px-3 font-bold text-slate-900">Peruntukan Diluluskan Pusat</td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2 px-3 text-right font-mono tabular-nums">
                        {formatRM(pusatPool.peruntukanDiluluskanPusat[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-blue-900">
                      {formatRM(pusatPool.peruntukanDiluluskanPusat.total)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-700">(-) Telah Diagihkan ke Jabatan</td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatRM(pusatPool.jumlahDiagihkanKeJabatan[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatRM(pusatPool.jumlahDiagihkanKeJabatan.total)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/40">
                    <td className="py-2 px-3 font-semibold text-emerald-800">(+) Ditarik / Dipulangkan dari Jabatan</td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2 px-3 text-right font-mono tabular-nums text-emerald-800">
                        {formatRM(pusatPool.jumlahDitarikDariJabatan[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-900">
                      {formatRM(pusatPool.jumlahDitarikDariJabatan.total)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2.5 px-3 text-slate-900 uppercase">Baki Pusat Tersedia Untuk Agihan</td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(pusatPool.bakiPusatUntukAgihan[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-indigo-800 bg-indigo-50">
                      {formatRM(pusatPool.bakiPusatUntukAgihan.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Borang Agihan Baharu (Ketua Pusat & Super Admin) */}
            {canManagePusatFinance && jabatansUnderPusat.length > 0 && (
              <form onSubmit={handleSubmitAgihanBatch} className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-indigo-600" />
                      <span>Agihan Baharu Kepada Jabatan Mengikut OS</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ketua Pusat boleh membuat agihan kepada semua jabatan di bawah pusat selagi baki masih mencukupi.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Tarikh Agihan</label>
                      <input
                        type="date"
                        required
                        value={agihanTarikh}
                        onChange={(e) => setAgihanTarikh(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Catatan (Pilihan)</label>
                      <input
                        type="text"
                        value={agihanCatatan}
                        onChange={(e) => setAgihanCatatan(e.target.value)}
                        placeholder="cth: Agihan Fasa 1"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 w-48"
                      />
                    </div>
                  </div>
                </div>

                {pusatPool.bakiPusatUntukAgihan.total <= 0 || activeOsList.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-semibold">
                    Tiada Baki Pusat tersedia untuk diagihkan bagi tahun {effectiveAgihanYear}. Tarik semula baki jabatan atau semak peruntukan diluluskan Pusat terlebih dahulu.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="py-2 px-3 text-left min-w-[230px]">NAMA JABATAN</th>
                            {activeOsList.map((osItem) => (
                              <th key={osItem.key} className="py-2 px-2 text-right">
                                {osItem.label} (RM)
                              </th>
                            ))}
                            <th className="py-2 px-3 text-right">JUMLAH AGIHAN (RM)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jabatansUnderPusat.map((jab, idx) => {
                            const row = agihanInputs[jab] || {
                              os21000: 0,
                              os24000: 0,
                              os27000: 0,
                              os29000: 0,
                            };
                            const rowTot = activeOsList.reduce(
                              (sum, osItem) => sum + (Number(row[osItem.key]) || 0),
                              0
                            );
                            return (
                              <tr key={jab} className="hover:bg-slate-50/70">
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  <span className="text-[10px] font-mono text-slate-400 mr-1.5">
                                    J{idx + 1}.
                                  </span>
                                  {jab}
                                </td>
                                {activeOsList.map((osItem) => (
                                  <td key={osItem.key} className="py-1.5 px-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={row[osItem.key] === 0 ? '' : row[osItem.key]}
                                      onChange={(e) => handleAgihanInputChange(jab, osItem.key, e.target.value)}
                                      className="w-full min-w-[95px] py-1.5 px-2 text-right font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                                    />
                                  </td>
                                ))}
                                <td className="py-2 px-3 text-right font-mono font-bold text-indigo-800">
                                  {formatRM(rowTot)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-300">
                            <td className="py-2 px-3 text-right uppercase text-[11px]">Jumlah Agihan Semasa:</td>
                            {activeOsList.map((osItem) => (
                              <td key={osItem.key} className="py-2 px-2 text-right font-mono tabular-nums">
                                {formatRM(plannedAgihanTotals[osItem.key])}
                              </td>
                            ))}
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-indigo-900">
                              {formatRM(plannedAgihanTotals.total)}
                            </td>
                          </tr>
                          <tr
                            className={`font-black border-t border-slate-300 ${
                              bakiPusatSelepasAgihan.os21000 < -0.001 ||
                              bakiPusatSelepasAgihan.os24000 < -0.001 ||
                              bakiPusatSelepasAgihan.os27000 < -0.001 ||
                              bakiPusatSelepasAgihan.os29000 < -0.001 ||
                              bakiPusatSelepasAgihan.total < -0.001
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-slate-900 text-white'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-right uppercase text-[11px]">
                              Baki Pusat (Auto Selepas Agihan):
                            </td>
                            {activeOsList.map((osItem) => (
                              <td key={osItem.key} className="py-2.5 px-2 text-right font-mono tabular-nums">
                                {formatRM(bakiPusatSelepasAgihan[osItem.key])}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-300">
                              {formatRM(bakiPusatSelepasAgihan.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500">
                        * Pastikan nilai Baki Pusat (Auto) bagi setiap OS dan Jumlah tidak bernilai negatif.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAgihanInputs({})}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Set Semula</span>
                        </button>
                        <button
                          type="submit"
                          disabled={
                            plannedAgihanTotals.total <= 0 ||
                            bakiPusatSelepasAgihan.os21000 < -0.001 ||
                            bakiPusatSelepasAgihan.os24000 < -0.001 ||
                            bakiPusatSelepasAgihan.os27000 < -0.001 ||
                            bakiPusatSelepasAgihan.os29000 < -0.001 ||
                            bakiPusatSelepasAgihan.total < -0.001
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs cursor-pointer transition-colors"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Sahkan &amp; Agih Peruntukan</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 2C. REKOD AGIHAN KEPADA SETIAP JABATAN OLEH KETUA PUSAT           */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s2c')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              2C. Rekod Agihan Kepada Jabatan Mengikut Pecahan OS
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Rekod Agihan Kepada Setiap Jabatan Oleh Ketua Pusat ({filterTahun === 'SEMUA' ? 'Semua Tahun' : filterTahun})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Butang padam bagi Ketua Pusat hanya aktif selama 3 hari selepas agihan direkodkan; selepas itu hanya Super Admin boleh memadam.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap">
              <span>{expandedSections.s2c ? 'Sembunyi' : 'Papar'}</span>
              {expandedSections.s2c ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
        </button>

        {expandedSections.s2c && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100">
            {jabatansUnderPusat.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tiada jabatan di bawah Pusat ini.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 text-left w-28 border-r border-slate-700">SIRI AGIHAN</th>
                      {jabatansUnderPusat.map((jab, idx) => (
                        <th key={jab} className="py-3 px-3 text-left min-w-[210px] border-r border-slate-700 last:border-r-0">
                          <span className="text-[9px] text-amber-300 block font-mono">JABATAN {idx + 1}</span>
                          <span className="uppercase">{jab}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.from({ length: agihanMatrix.maxRows }).map((_, rowIdx) => (
                      <tr key={rowIdx} className="align-top hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-black text-slate-800 bg-slate-50 border-r border-slate-200">
                          Agihan {rowIdx + 1}
                        </td>
                        {jabatansUnderPusat.map((jab) => {
                          const rec = agihanMatrix.byJab[jab]?.[rowIdx];
                          if (!rec) {
                            return (
                              <td
                                key={jab}
                                className="py-3 px-3 text-slate-400 italic border-r border-slate-200 last:border-r-0"
                              >
                                Tiada
                              </td>
                            );
                          }
                          const delEligibility = canDeleteAgihanRecord(rec);
                          return (
                            <td
                              key={jab}
                              className="py-3 px-3 border-r border-slate-200 last:border-r-0 space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-mono font-black text-slate-900 block">
                                    Agihan {rowIdx + 1}: {formatRMWithPrefix(rec.jumlah)}
                                  </span>
                                  <span className="text-[11px] text-slate-600 block">
                                    Tarikh: <strong className="font-mono">{rec.tarikh}</strong>
                                  </span>
                                </div>
                                {canManagePusatFinance && (
                                  delEligibility.allowed ? (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteAgihanTarget(rec)}
                                      title={
                                        isSuperAdmin
                                          ? 'Padam rekod agihan (Akses Super Admin)'
                                          : 'Padam rekod agihan (Aktif dalam tempoh 3 hari)'
                                      }
                                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      title="Tempoh 3 hari untuk memadam rekod telah tamat. Hanya Super Admin dibenarkan memadam rekod ini."
                                      className="p-1 text-slate-300 bg-slate-100 rounded cursor-not-allowed"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                              {activeOsList.length > 0 && (
                                <div className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1 grid grid-cols-2 gap-x-2">
                                  {activeOsList.map((osItem) => (
                                    <span key={osItem.key}>
                                      {osItem.shortLabel}: {formatRM(rec[osItem.key])}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {rec.catatan && (
                                <p className="text-[10px] text-slate-500 italic">{rec.catatan}</p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="py-3 px-3 uppercase border-r border-slate-300">JUMLAH AGIHAN</td>
                      {jabatansUnderPusat.map((jab) => {
                        const tot = agihanMatrix.totalsByJab[jab] || {
                          os21000: 0,
                          os24000: 0,
                          os27000: 0,
                          os29000: 0,
                          total: 0,
                        };
                        return (
                          <td
                            key={jab}
                            className="py-3 px-3 border-r border-slate-300 last:border-r-0 space-y-1"
                          >
                            <span className="font-mono text-sm text-indigo-900 block">
                              {formatRMWithPrefix(tot.total)}
                            </span>
                            {activeOsList.length > 0 && (
                              <div className="text-[10px] font-mono font-semibold text-slate-600 grid grid-cols-2 gap-x-2">
                                {activeOsList.map((osItem) => (
                                  <span key={osItem.key}>
                                    {osItem.shortLabel}: {formatRM(tot[osItem.key])}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* KOMUNIKASI EKSLUSIF KETUA PUSAT & KETUA JABATAN                   */}
      {/* ================================================================= */}
      {canUsePusatJabatanChat && (
        <PusatJabatanChatSection
          mode="pusat"
          isExpanded={expandedSections.chat}
          onToggleExpand={() => toggleSection('chat')}
          title="Komunikasi Baki, Penarikan & Pemulangan Peruntukan"
          subtitle={`Saluran perbincangan antara Ketua Pusat (${selectedPusat || '-'}) dan Ketua Jabatan`}
          messages={filteredPusatMessages}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          jabatansUnderPusat={jabatansUnderPusat}
          chatJabatanFilter={chatJabatanFilter}
          onChangeChatJabatanFilter={setChatJabatanFilter}
          chatTargetJabatan={chatTargetJabatan}
          onChangeChatTargetJabatan={setChatTargetJabatan}
          chatTopik={chatTopik}
          onChangeChatTopik={setChatTopik}
          chatText={chatText}
          onChangeChatText={setChatText}
          onSendMessage={handleSendChatMessage}
          onDeleteMessage={deletePusatJabatanMessage}
          onNotify={showNotification}
        />
      )}

      {/* ================================================================= */}
      {/* 3. PEGAWAI-PEGAWAI DI BAWAH PUSAT                                 */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s3')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
              3. Direktori Pegawai Pusat
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Pegawai-Pegawai di Bawah {selectedPusat} ({filteredSortedOfficers.length} Orang)
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap shrink-0 self-end sm:self-center">
            <span>{expandedSections.s3 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s3 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s3 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-end">
              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={officerSearch}
                  onChange={(e) => setOfficerSearch(e.target.value)}
                  placeholder="Cari ID, nama, jawatan, jabatan..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10 text-center">BIL</th>
                    <th
                      onClick={() => toggleOfficerSort('id')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>ID</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleOfficerSort('nama')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>NAMA PEGAWAI</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleOfficerSort('jawatan')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>JAWATAN</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleOfficerSort('jabatan')}
                      className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>JABATAN</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">EMEL &amp; NO. HP</th>
                    <th
                      onClick={() => toggleOfficerSort('progCount')}
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/70 select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>PROGRAM</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right">PERUNTUKAN DIAGIHKAN (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSortedOfficers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tiada pegawai ditemui di bawah pusat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSortedOfficers.map((pg, idx) => {
                      const info = officerProgramMap[pg.id] || { all: [], peruntukan: 0 };
                      return (
                        <tr key={pg.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}.</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {pg.id}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 uppercase">{pg.nama}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{pg.jawatan || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{pg.jabatan || '-'}</td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            <div>{pg.emel || '-'}</div>
                            <div className="text-slate-400 font-mono">{pg.noHp || '-'}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setDrillModal({
                                  title: pg.nama,
                                  subtitle: `${info.all.length} Program Diurus (${pg.jabatan || selectedPusat})`,
                                  items: info.all,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold tabular-nums cursor-pointer"
                            >
                              <span>{info.all.length}</span>
                              <Eye className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatRM(info.peruntukan)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 4. VISUALISASI DAN INFOGRAFIK SETIAP JABATAN                      */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s4')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              4. Visualisasi &amp; Infografik Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Kad Infografik Prestasi &amp; Kewangan Setiap Jabatan
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap shrink-0 self-end sm:self-center">
            <span>{expandedSections.s4 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s4 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s4 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {jabatanMetricsList.map((jm) => {
            const tot = Math.max(1, jm.totalPrograms);
            const pctSelesai = (jm.selesai / tot) * 100;
            const pctDalam = (jm.dalamTindakan / tot) * 100;
            const pctTanggung = (jm.tanggung / tot) * 100;
            const pctBelum = (jm.belum / tot) * 100;
            const pctBatal = (jm.batal / tot) * 100;

            return (
              <div
                key={jm.jabatan}
                className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase">{jm.jabatan}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {jm.pegawaiCount} Pegawai · {jm.totalPrograms} Program · {formatNumber(jm.peserta)} Peserta · {formatNumber(jm.hari)} Hari
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Kadar Selesai
                    </span>
                    <span className="text-base font-black text-emerald-700 tabular-nums">
                      {jm.successRate}%
                    </span>
                  </div>
                </div>

                {/* Stacked Bar Status Program */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Taburan Status Pelaksanaan Program</span>
                    <span className="font-mono">{jm.totalPrograms} Program</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    {jm.selesai > 0 && (
                      <div style={{ width: `${pctSelesai}%` }} className="bg-emerald-500" title={`Selesai: ${jm.selesai}`} />
                    )}
                    {jm.dalamTindakan > 0 && (
                      <div style={{ width: `${pctDalam}%` }} className="bg-blue-500" title={`Dalam Tindakan: ${jm.dalamTindakan}`} />
                    )}
                    {jm.tanggung > 0 && (
                      <div style={{ width: `${pctTanggung}%` }} className="bg-amber-500" title={`Tanggung: ${jm.tanggung}`} />
                    )}
                    {jm.belum > 0 && (
                      <div style={{ width: `${pctBelum}%` }} className="bg-slate-400" title={`Belum Tindakan: ${jm.belum}`} />
                    )}
                    {jm.batal > 0 && (
                      <div style={{ width: `${pctBatal}%` }} className="bg-rose-500" title={`Batal: ${jm.batal}`} />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600 pt-0.5">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Selesai: {jm.selesai}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Dalam Tindakan: {jm.dalamTindakan}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Tanggung: {jm.tanggung}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />Belum: {jm.belum}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />Batal: {jm.batal}</span>
                  </div>
                </div>

                {/* Financial Utilization Infographic */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Penggunaan Peruntukan Kewangan</span>
                    <span className="text-blue-700 font-mono">{jm.utilRate}% Dibelanjakan</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, jm.utilRate)}%` }}
                      className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Peruntukan Diagihkan</span>
                      <strong className="font-mono text-slate-900">{formatRMWithPrefix(jm.peruntukan)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Belanja</span>
                      <strong className="font-mono text-emerald-700">{formatRMWithPrefix(jm.belanja)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Penjimatan</span>
                      <strong className="font-mono text-amber-700">{formatRMWithPrefix(jm.penjimatan)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 5. VISUALISASI COMPARISON SETIAP JABATAN                          */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s5')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              5. Visualisasi Perbandingan Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Perbandingan Prestasi, Kewangan &amp; Impak Antara Jabatan
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap shrink-0 self-end sm:self-center">
            <span>{expandedSections.s5 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s5 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s5 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart A: Program Count Comparison */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Perbandingan Bilangan Program Mengikut Jabatan</span>
            </h4>
            <div className="space-y-3 pt-1">
              {jabatanMetricsList.map((jm) => {
                const widthPct = (jm.totalPrograms / maxJabProg) * 100;
                const sPct = jm.totalPrograms > 0 ? (jm.selesai / jm.totalPrograms) * 100 : 0;
                return (
                  <div key={jm.jabatan} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 truncate pr-2">{jm.jabatan}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {jm.totalPrograms} ({jm.selesai} Selesai)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-md overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-blue-500 rounded-md flex overflow-hidden"
                      >
                        <div style={{ width: `${sPct}%` }} className="h-full bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-200">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> Selesai</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-xs" /> Status Lain</span>
            </div>
          </div>

          {/* Chart B: Financial Comparison (Peruntukan vs Belanja) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Perbandingan Peruntukan Diagihkan vs Belanja (RM)</span>
            </h4>
            <div className="space-y-3 pt-1">
              {jabatanMetricsList.map((jm) => {
                const pW = (jm.peruntukan / maxJabBudget) * 100;
                const bW = (jm.belanja / maxJabBudget) * 100;
                return (
                  <div key={jm.jabatan} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 truncate pr-2">{jm.jabatan}</span>
                      <span className="font-mono text-[10px] text-slate-700 shrink-0">
                        {formatRMWithPrefix(jm.peruntukan)} / <strong className="text-emerald-700">{formatRMWithPrefix(jm.belanja)}</strong>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
                        <div style={{ width: `${pW}%` }} className="h-full bg-amber-500 rounded" title="Peruntukan" />
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
                        <div style={{ width: `${bW}%` }} className="h-full bg-emerald-600 rounded" title="Belanja Sebenar" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-200">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-xs" /> Peruntukan Diagihkan (BK65)</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs" /> Belanja</span>
            </div>
          </div>
        </div>

        {/* Chart C: Participants & Success Rate Comparison */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-600" />
            <span>Perbandingan Bilangan Peserta &amp; Kadar Selesai Mengikut Jabatan</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jabatanMetricsList.map((jm) => (
              <div key={jm.jabatan} className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 truncate pr-2">{jm.jabatan}</span>
                  <span className="font-mono font-bold text-purple-700 shrink-0">
                    {formatNumber(jm.peserta)} Peserta · {jm.successRate}% Selesai
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(jm.peserta / maxJabPeserta) * 100}%` }}
                    className="h-full bg-purple-600 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 6. RUMUSAN SETIAP JABATAN MENGIKUT STATUS PROGRAM & PERUNTUKAN    */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s6')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              6. Rumusan Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Rumusan Setiap Jabatan Mengikut Status Program, Peruntukan &amp; Sebagainya
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap shrink-0 self-end sm:self-center">
            <span>{expandedSections.s6 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s6 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s6 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExportRumusanPusat}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport Rumusan Excel</span>
              </button>
            </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 text-center">BIL</th>
                <th className="py-3 px-3 min-w-[200px]">NAMA JABATAN</th>
                <th className="py-3 px-2 text-center">PEGAWAI</th>
                <th className="py-3 px-2 text-center">PROGRAM</th>
                <th className="py-3 px-2 text-center text-emerald-300">SELESAI</th>
                <th className="py-3 px-2 text-center text-blue-300">TINDAKAN</th>
                <th className="py-3 px-2 text-center text-amber-300">TANGGUNG</th>
                <th className="py-3 px-2 text-center text-slate-300">BELUM</th>
                <th className="py-3 px-2 text-center text-rose-300">BATAL</th>
                <th className="py-3 px-2 text-right">PESERTA</th>
                <th className="py-3 px-2 text-right">HARI</th>
                <th className="py-3 px-3 text-right">PERUNTUKAN DIAGIHKAN (RM)</th>
                <th className="py-3 px-3 text-right">BELANJA (RM)</th>
                <th className="py-3 px-3 text-right">PENJIMATAN (RM)</th>
                <th className="py-3 px-3 text-center">% SELESAI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jabatanMetricsList.map((jm, idx) => (
                <tr key={jm.jabatan} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}.</td>
                  <td className="py-3 px-3 font-bold text-slate-900 uppercase">
                    <button
                      type="button"
                      onClick={() =>
                        setDrillModal({
                          title: jm.jabatan,
                          subtitle: `${jm.totalPrograms} Program`,
                          items: jm.programs,
                        })
                      }
                      className="text-left hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {jm.jabatan}
                    </button>
                  </td>
                  <td className="py-3 px-2 text-center font-mono">{jm.pegawaiCount}</td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-slate-900">{jm.totalPrograms}</td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-emerald-700">{jm.selesai}</td>
                  <td className="py-3 px-2 text-center font-mono text-blue-700">{jm.dalamTindakan}</td>
                  <td className="py-3 px-2 text-center font-mono text-amber-700">{jm.tanggung}</td>
                  <td className="py-3 px-2 text-center font-mono text-slate-600">{jm.belum}</td>
                  <td className="py-3 px-2 text-center font-mono text-rose-700">{jm.batal}</td>
                  <td className="py-3 px-2 text-right font-mono">{formatNumber(jm.peserta)}</td>
                  <td className="py-3 px-2 text-right font-mono">{formatNumber(jm.hari)}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">{formatRM(jm.peruntukan)}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">{formatRM(jm.belanja)}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700">{formatRM(jm.penjimatan)}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{jm.successRate}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                <td colSpan={2} className="py-3.5 px-3 text-right uppercase">
                  JUMLAH KESELURUHAN PUSAT:
                </td>
                <td className="py-3.5 px-2 text-center font-mono">{pusatOfficers.length}</td>
                <td className="py-3.5 px-2 text-center font-mono">{pusatTotals.totalPrograms}</td>
                <td className="py-3.5 px-2 text-center font-mono text-emerald-700">{pusatTotals.selesai}</td>
                <td className="py-3.5 px-2 text-center font-mono text-blue-700">{pusatTotals.dalamTindakan}</td>
                <td className="py-3.5 px-2 text-center font-mono text-amber-700">{pusatTotals.tanggung}</td>
                <td className="py-3.5 px-2 text-center font-mono">{pusatTotals.belum}</td>
                <td className="py-3.5 px-2 text-center font-mono text-rose-700">{pusatTotals.batal}</td>
                <td className="py-3.5 px-2 text-right font-mono">{formatNumber(pusatTotals.peserta)}</td>
                <td className="py-3.5 px-2 text-right font-mono">{formatNumber(pusatTotals.hari)}</td>
                <td className="py-3.5 px-3 text-right font-mono">{formatRMWithPrefix(pusatTotals.peruntukan)}</td>
                <td className="py-3.5 px-3 text-right font-mono text-emerald-800">{formatRMWithPrefix(pusatTotals.belanja)}</td>
                <td className="py-3.5 px-3 text-right font-mono text-amber-800">{formatRMWithPrefix(pusatTotals.penjimatan)}</td>
                <td className="py-3.5 px-3 text-center font-mono">
                  {pusatTotals.totalPrograms - pusatTotals.batal > 0
                    ? Math.round((pusatTotals.selesai / (pusatTotals.totalPrograms - pusatTotals.batal)) * 100)
                    : 0}
                  %
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
          </div>
        )}
      </section>

      {/* Drill-down Programs Modal */}
      {drillModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wide">{drillModal.title}</h4>
                {drillModal.subtitle && (
                  <p className="text-xs text-slate-300 mt-0.5">{drillModal.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDrillModal(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2.5">
              {drillModal.items.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Tiada program direkodkan.
                </div>
              ) : (
                drillModal.items.map((p) => {
                  const cfg = getStatusConfig(p.statusProgram);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setDrillModal(null);
                        viewProgramDetail(p);
                      }}
                      className="p-3.5 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-500">{p.kodProgram}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 uppercase mt-1">{p.namaProgram}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {p.tempoh} · Pengurus: {p.pengurusNama} · {p.jabatan}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-900 block">
                          {formatRMWithPrefix(p.jumlahRm)}
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold">Klik untuk perincian →</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TARIK BAKI JABATAN WARNING CONFIRMATION MODAL                     */}
      {/* ================================================================= */}
      {tarikModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmTarik}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-200 block">
                  Peringatan &amp; Pengesahan Penarikan Baki
                </span>
                <h4 className="text-sm font-black uppercase tracking-wide mt-0.5">
                  TARIK {tarikModal.sumberBaki === 'ASAL' ? 'Baki (asal)' : 'Baki (Penjimatan)'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setTarikModal(null)}
                className="p-1.5 text-rose-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Amaran Sebelum Pengesahan:
                  </p>
                  <p className="leading-relaxed">
                    Anda bakal menarik semula{' '}
                    <strong>{tarikModal.sumberBaki === 'ASAL' ? 'Baki (asal)' : 'Baki (Penjimatan)'}</strong>{' '}
                    daripada <strong>{tarikModal.jabatan}</strong> (Tahun {tarikModal.tahun}). Peruntukan yang ditarik akan mengurangkan <strong>JUMLAH BAKI TERKINI</strong> jabatan dan digabungkan semula ke dalam <strong>Baki Pusat</strong> untuk agihan baharu.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">Tahun</label>
                  <input
                    type="number"
                    value={tarikModal.tahun}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">Tarikh Penarikan</label>
                  <input
                    type="date"
                    required
                    value={tarikModal.tarikh}
                    onChange={(e) => setTarikModal({ ...tarikModal, tarikh: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(activeOsList.length > 0
                  ? activeOsList
                  : OS_META.filter((o) => tarikModal.maxOs[o.key] > 0)
                ).map((osItem) => (
                  <div key={osItem.key}>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1 uppercase">
                      {osItem.label} (Maks: RM {formatRM(tarikModal.maxOs[osItem.key])})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={tarikModal.maxOs[osItem.key]}
                      step="0.01"
                      value={tarikModal[osItem.key]}
                      onChange={(e) =>
                        setTarikModal({
                          ...tarikModal,
                          [osItem.key]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-2 font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600 text-slate-900"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-lg">
                <span className="font-bold uppercase text-[11px]">Jumlah Bakal Ditarik</span>
                <span className="text-sm font-black font-mono text-amber-300">
                  {formatRMWithPrefix(
                    tarikModal.os21000 +
                      tarikModal.os24000 +
                      tarikModal.os27000 +
                      tarikModal.os29000
                  )}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 text-[11px] mb-1">Catatan (Pilihan)</label>
                <input
                  type="text"
                  value={tarikModal.catatan}
                  onChange={(e) => setTarikModal({ ...tarikModal, catatan: e.target.value })}
                  placeholder="cth: Penarikan baki tidak digunakan untuk agihan semula"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTarikModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Sahkan Penarikan (TARIK)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* DELETE AGIHAN CONFIRMATION MODAL                                  */}
      {/* ================================================================= */}
      {deleteAgihanTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-black uppercase">Sahkan Pemadaman Rekod Agihan</h4>
              <button
                type="button"
                onClick={() => setDeleteAgihanTarget(null)}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-700 space-y-2">
              <p>
                Adakah anda pasti ingin memadam rekod agihan kepada{' '}
                <strong>{deleteAgihanTarget.jabatan}</strong> bertarikh{' '}
                <strong className="font-mono">{deleteAgihanTarget.tarikh}</strong> berjumlah{' '}
                <strong className="font-mono text-rose-700">
                  {formatRMWithPrefix(deleteAgihanTarget.jumlah)}
                </strong>
                ?
              </p>
              <p className="text-[11px] text-slate-500">
                Amaun agihan ini akan dipulangkan semula ke dalam Baki Pusat.
              </p>
            </div>
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAgihanTarget(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAgihan}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Padam Rekod
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
