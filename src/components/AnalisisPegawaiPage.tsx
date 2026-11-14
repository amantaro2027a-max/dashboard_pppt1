import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem, Pegawai } from '../types/program';
import { formatRM, formatNumber, getStatusConfig } from '../utils/formatters';
import {
  Filter,
  RotateCcw,
  Search,
  Users,
  BarChart3,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ArrowUpDown,
  Download,
  ShieldAlert,
  X,
  Briefcase,
  Layers,
  Award,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface OfficerAnalyticsRow {
  id: string;
  nama: string;
  jawatan: string;
  pusat: string;
  jabatan: string;
  emel?: string;
  noHp?: string;
  utamaPrograms: ProgramItem[];
  bersamaPrograms: ProgramItem[];
  allPrograms: ProgramItem[];
  totalCount: number;
  utamaCount: number;
  bersamaCount: number;
  selesaiCount: number;
  dalamTindakanCount: number;
  tanggungCount: number;
  belumCount: number;
  batalCount: number;
  activeCount: number;
  successRate: number;
  totalPeruntukan: number;
  totalBelanja: number;
  totalPenjimatan: number;
  utilRate: number;
  totalHari: number;
  totalPeserta: number;
  pindaanCount: number;
  sumberMap: Record<string, number>;
  jenisMap: Record<string, number>;
}

type SortKey =
  | 'id'
  | 'nama'
  | 'jawatan'
  | 'jabatan'
  | 'totalCount'
  | 'utamaCount'
  | 'bersamaCount'
  | 'selesaiCount'
  | 'successRate'
  | 'totalPeruntukan'
  | 'totalBelanja'
  | 'totalPeserta';

export const AnalisisPegawaiPage: React.FC = () => {
  const {
    programs,
    pegawaiList,
    pusatList,
    jabatanMap,
    jawatanList,
    statusProgramList,
    currentUser,
    viewProgramDetail,
  } = useProgramContext();

  // Access check: Super Admin or Admin with ANALISIS PEGAWAI permission
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canAccess =
    isSuperAdmin ||
    (currentUser?.role === 'ADMIN' &&
      (currentUser.allowedPages?.includes('ANALISIS PEGAWAI') ||
        !currentUser.allowedPages ||
        currentUser.allowedPages.length === 0));

  // 6 Slicer States + Search + Display Mode
  const [slicerPusat, setSlicerPusat] = useState<string>('');
  const [slicerJabatan, setSlicerJabatan] = useState<string>('');
  const [slicerJawatan, setSlicerJawatan] = useState<string>('');
  const [slicerStatus, setSlicerStatus] = useState<string>('');
  const [slicerPengurus, setSlicerPengurus] = useState<string>('');
  const [slicerPengurusBersama, setSlicerPengurusBersama] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyWithPrograms, setOnlyWithPrograms] = useState<boolean>(false);

  // Sorting & Pagination
  const [sortKey, setSortKey] = useState<SortKey>('totalCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [displayLimit, setDisplayLimit] = useState<number>(15);

  // Drill-down Modal
  const [selectedOfficerModal, setSelectedOfficerModal] = useState<{
    title: string;
    subtitle?: string;
    officer?: OfficerAnalyticsRow;
    items: ProgramItem[];
  } | null>(null);

  // Available options for slicers
  const availablePusat = useMemo(() => {
    const set = new Set<string>(pusatList);
    pegawaiList.forEach((pg) => pg.pusat && set.add(pg.pusat));
    programs.forEach((p) => p.pusat && set.add(p.pusat));
    return Array.from(set).filter(Boolean).sort();
  }, [pusatList, pegawaiList, programs]);

  const availableJabatan = useMemo(() => {
    if (slicerPusat && jabatanMap[slicerPusat]) {
      const fromMap = jabatanMap[slicerPusat] || [];
      const fromData = new Set<string>(fromMap);
      pegawaiList
        .filter((pg) => pg.pusat === slicerPusat && pg.jabatan)
        .forEach((pg) => fromData.add(pg.jabatan!));
      programs
        .filter((p) => p.pusat === slicerPusat && p.jabatan)
        .forEach((p) => fromData.add(p.jabatan));
      return Array.from(fromData).filter(Boolean).sort();
    }
    const set = new Set<string>();
    Object.values(jabatanMap || {}).forEach((list) => list.forEach((j) => set.add(j)));
    pegawaiList.forEach((pg) => pg.jabatan && set.add(pg.jabatan));
    programs.forEach((p) => p.jabatan && set.add(p.jabatan));
    return Array.from(set).filter(Boolean).sort();
  }, [slicerPusat, jabatanMap, pegawaiList, programs]);

  const availableJawatan = useMemo(() => {
    const set = new Set<string>(jawatanList);
    pegawaiList.forEach((pg) => pg.jawatan && set.add(pg.jawatan.toUpperCase()));
    return Array.from(set).filter(Boolean).sort();
  }, [jawatanList, pegawaiList]);

  const availablePengurusOptions = useMemo(() => {
    const map = new Map<string, string>();
    pegawaiList.forEach((pg) => {
      if (pg.nama) map.set(pg.nama.trim().toUpperCase(), pg.nama.trim().toUpperCase());
    });
    programs.forEach((p) => {
      if (p.pengurusNama) map.set(p.pengurusNama.trim().toUpperCase(), p.pengurusNama.trim().toUpperCase());
    });
    return Array.from(map.values()).sort();
  }, [pegawaiList, programs]);

  const availablePengurusBersamaOptions = useMemo(() => {
    const map = new Map<string, string>();
    pegawaiList.forEach((pg) => {
      if (pg.nama) map.set(pg.nama.trim().toUpperCase(), pg.nama.trim().toUpperCase());
    });
    programs.forEach((p) => {
      if (p.pengurusBersamaNama) {
        map.set(p.pengurusBersamaNama.trim().toUpperCase(), p.pengurusBersamaNama.trim().toUpperCase());
      }
    });
    return Array.from(map.values()).sort();
  }, [pegawaiList, programs]);

  // Lookup maps for officer resolution
  const officerLookup = useMemo(() => {
    const byId = new Map<string, Pegawai>();
    const byName = new Map<string, Pegawai>();
    pegawaiList.forEach((pg) => {
      if (pg.id) byId.set(pg.id.trim().toUpperCase(), pg);
      if (pg.nama) byName.set(pg.nama.trim().toUpperCase(), pg);
    });
    return { byId, byName };
  }, [pegawaiList]);

  const resolveOfficerProfile = (rawId?: string, rawName?: string): Pegawai | undefined => {
    const cleanId = (rawId || '').trim().toUpperCase();
    const cleanName = (rawName || '').trim().toUpperCase();
    return (cleanId && officerLookup.byId.get(cleanId)) || (cleanName ? officerLookup.byName.get(cleanName) : undefined);
  };

  // Helper to check if a program matches a specific officer
  const matchesOfficerRef = (officer: { id: string; nama: string }, rawId?: string, rawName?: string) => {
    const cId = (rawId || '').trim().toUpperCase();
    const cName = (rawName || '').trim().toUpperCase();
    const oId = officer.id.trim().toUpperCase();
    const oName = officer.nama.trim().toUpperCase();
    return (cId !== '' && cId === oId) || (cName !== '' && cName === oName);
  };

  // Step 1: Filter Programs using the Program-related slicers (Pusat, Jabatan, Status, Pengurus, Pengurus Bersama, Jawatan)
  const filteredProgramsBySlicers = useMemo(() => {
    return programs.filter((p) => {
      if (slicerPusat && (p.pusat || '').trim().toUpperCase() !== slicerPusat.toUpperCase()) {
        return false;
      }
      if (slicerJabatan && (p.jabatan || '').trim().toUpperCase() !== slicerJabatan.toUpperCase()) {
        return false;
      }
      if (
        slicerStatus &&
        (p.statusProgram || '').trim().toUpperCase() !== slicerStatus.trim().toUpperCase()
      ) {
        return false;
      }
      if (slicerPengurus) {
        const target = slicerPengurus.trim().toUpperCase();
        const matchId = (p.pengurusId || '').trim().toUpperCase() === target;
        const matchName = (p.pengurusNama || '').trim().toUpperCase() === target;
        if (!matchId && !matchName) return false;
      }
      if (slicerPengurusBersama) {
        const target = slicerPengurusBersama.trim().toUpperCase();
        const matchId = (p.pengurusBersamaId || '').trim().toUpperCase() === target;
        const matchName = (p.pengurusBersamaNama || '').trim().toUpperCase() === target;
        if (!matchId && !matchName) return false;
      }
      if (slicerJawatan) {
        const targetJaw = slicerJawatan.trim().toUpperCase();
        const mainOff = resolveOfficerProfile(p.pengurusId, p.pengurusNama);
        const coOff = resolveOfficerProfile(p.pengurusBersamaId, p.pengurusBersamaNama);
        const mainMatch = (mainOff?.jawatan || '').trim().toUpperCase() === targetJaw;
        const coMatch = (coOff?.jawatan || '').trim().toUpperCase() === targetJaw;
        if (!mainMatch && !coMatch) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const pool = [
          p.namaProgram,
          p.kodProgram,
          p.pengurusNama,
          p.pengurusId,
          p.pengurusBersamaNama,
          p.pengurusBersamaId,
          p.jabatan,
          p.pusat,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!pool.includes(q)) return false;
      }
      return true;
    });
  }, [
    programs,
    slicerPusat,
    slicerJabatan,
    slicerStatus,
    slicerPengurus,
    slicerPengurusBersama,
    slicerJawatan,
    searchQuery,
    officerLookup,
  ]);

  // Step 2: Build complete Officer Analytics rows based on filtered officers + filtered programs
  const officerAnalytics = useMemo<OfficerAnalyticsRow[]>(() => {
    interface SeedOfficer {
      id: string;
      nama: string;
      jawatan: string;
      pusat: string;
      jabatan: string;
      emel?: string;
      noHp?: string;
    }

    const poolMap = new Map<string, SeedOfficer>();

    // Seed all registered officers
    pegawaiList.forEach((pg) => {
      const key = (pg.nama || pg.id).trim().toUpperCase();
      if (!key) return;
      poolMap.set(key, {
        id: pg.id || key,
        nama: (pg.nama || '').trim().toUpperCase(),
        jawatan: (pg.jawatan || 'PEGAWAI').trim().toUpperCase(),
        pusat: (pg.pusat || 'TIDAK DINYATAKAN').trim().toUpperCase(),
        jabatan: (pg.jabatan || 'TIDAK DINYATAKAN').trim().toUpperCase(),
        emel: pg.emel,
        noHp: pg.noHp,
      });
    });

    // Include any officers mentioned in programs even if not in pegawaiList
    programs.forEach((p) => {
      const addIfMissing = (rawId?: string, rawName?: string, roleFallback?: string) => {
        const cleanName = (rawName || rawId || '').trim().toUpperCase();
        if (!cleanName) return;
        const resolved = resolveOfficerProfile(rawId, rawName);
        if (resolved) return;
        if (!poolMap.has(cleanName)) {
          poolMap.set(cleanName, {
            id: (rawId || cleanName).trim().toUpperCase(),
            nama: cleanName,
            jawatan: roleFallback || 'PEGAWAI',
            pusat: (p.pusat || 'TIDAK DINYATAKAN').trim().toUpperCase(),
            jabatan: (p.jabatan || 'TIDAK DINYATAKAN').trim().toUpperCase(),
          });
        }
      };
      addIfMissing(p.pengurusId, p.pengurusNama, 'PENGURUS PROGRAM');
      addIfMissing(p.pengurusBersamaId, p.pengurusBersamaNama, 'PENGURUS BERSAMA');
    });

    const rows: OfficerAnalyticsRow[] = [];

    poolMap.forEach((off) => {
      // Apply officer-attribute slicers (Pusat, Jabatan, Jawatan, Search, Pengurus/Pengurus Bersama)
      if (slicerJawatan && off.jawatan !== slicerJawatan.trim().toUpperCase()) return;

      // Collect officer's programs from filteredProgramsBySlicers
      const utamaPrograms = filteredProgramsBySlicers.filter((p) =>
        matchesOfficerRef(off, p.pengurusId, p.pengurusNama)
      );
      const bersamaPrograms = filteredProgramsBySlicers.filter(
        (p) =>
          matchesOfficerRef(off, p.pengurusBersamaId, p.pengurusBersamaNama) &&
          !matchesOfficerRef(off, p.pengurusId, p.pengurusNama)
      );

      const allProgsMap = new Map<string, ProgramItem>();
      utamaPrograms.forEach((p) => allProgsMap.set(p.id, p));
      bersamaPrograms.forEach((p) => allProgsMap.set(p.id, p));
      const allProgs = Array.from(allProgsMap.values());

      // Check Pusat & Jabatan slicer against officer profile OR matched programs
      if (slicerPusat) {
        const targetP = slicerPusat.trim().toUpperCase();
        if (off.pusat !== targetP && allProgs.length === 0) return;
      }
      if (slicerJabatan) {
        const targetJ = slicerJabatan.trim().toUpperCase();
        if (off.jabatan !== targetJ && allProgs.length === 0) return;
      }

      // Check Pengurus / Pengurus Bersama slicer
      if (slicerPengurus) {
        const targetPeng = slicerPengurus.trim().toUpperCase();
        const isSelf = off.nama === targetPeng || off.id === targetPeng;
        if (!isSelf && allProgs.length === 0) return;
      }
      if (slicerPengurusBersama) {
        const targetCo = slicerPengurusBersama.trim().toUpperCase();
        const isSelf = off.nama === targetCo || off.id === targetCo;
        if (!isSelf && allProgs.length === 0) return;
      }

      // If status slicer is active and officer has 0 matching programs, hide if onlyWithPrograms or status filter active
      if (slicerStatus && allProgs.length === 0) return;
      if (onlyWithPrograms && allProgs.length === 0) return;

      // Search query on officer profile or matched programs
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchOff =
          off.nama.toLowerCase().includes(q) ||
          off.id.toLowerCase().includes(q) ||
          off.jawatan.toLowerCase().includes(q) ||
          off.jabatan.toLowerCase().includes(q);
        if (!matchOff && allProgs.length === 0) return;
      }

      const selesaiCount = allProgs.filter(
        (p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI'
      ).length;
      const dalamTindakanCount = allProgs.filter(
        (p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN'
      ).length;
      const tanggungCount = allProgs.filter(
        (p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG'
      ).length;
      const belumCount = allProgs.filter(
        (p) => (p.statusProgram || '').trim().toUpperCase() === 'BELUM AMBIL TINDAKAN'
      ).length;
      const batalCount = allProgs.filter(
        (p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL'
      ).length;
      const activeCount = Math.max(allProgs.length - batalCount, 0);
      const successRate = activeCount > 0 ? Math.round((selesaiCount / activeCount) * 100) : 0;

      const totalPeruntukan = allProgs.reduce((s, p) => s + (Number(p.jumlahRm) || 0), 0);
      const totalBelanja = allProgs.reduce((s, p) => s + (Number(p.jumlahBelanjaRm) || 0), 0);
      const totalPenjimatan = Math.max(0, totalPeruntukan - totalBelanja);
      const utilRate = totalPeruntukan > 0 ? Math.round((totalBelanja / totalPeruntukan) * 100) : 0;

      const totalHari = allProgs.reduce((s, p) => s + (Number(p.jumlahHari) || 0), 0);
      const totalPeserta = allProgs.reduce((s, p) => s + (Number(p.bilanganPeserta) || 0), 0);
      const pindaanCount = allProgs.filter((p) => p.rekodPindaan && p.rekodPindaan.length > 0).length;

      const sumberMap: Record<string, number> = {};
      const jenisMap: Record<string, number> = {};
      allProgs.forEach((p) => {
        const sk = p.sumberKewangan || 'LAIN-LAIN';
        sumberMap[sk] = (sumberMap[sk] || 0) + 1;
        const jn = p.jenisProgram || 'LAIN-LAIN';
        jenisMap[jn] = (jenisMap[jn] || 0) + 1;
      });

      rows.push({
        ...off,
        utamaPrograms,
        bersamaPrograms,
        allPrograms: allProgs,
        totalCount: allProgs.length,
        utamaCount: utamaPrograms.length,
        bersamaCount: bersamaPrograms.length,
        selesaiCount,
        dalamTindakanCount,
        tanggungCount,
        belumCount,
        batalCount,
        activeCount,
        successRate,
        totalPeruntukan,
        totalBelanja,
        totalPenjimatan,
        utilRate,
        totalHari,
        totalPeserta,
        pindaanCount,
        sumberMap,
        jenisMap,
      });
    });

    return rows;
  }, [
    pegawaiList,
    programs,
    filteredProgramsBySlicers,
    slicerPusat,
    slicerJabatan,
    slicerJawatan,
    slicerStatus,
    slicerPengurus,
    slicerPengurusBersama,
    onlyWithPrograms,
    searchQuery,
    officerLookup,
  ]);

  // Sorted Officers
  const sortedOfficers = useMemo(() => {
    return [...officerAnalytics].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id' || sortKey === 'nama' || sortKey === 'jawatan' || sortKey === 'jabatan') {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      if (cmp === 0) {
        cmp = b.totalCount - a.totalCount || a.nama.localeCompare(b.nama);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [officerAnalytics, sortKey, sortDir]);

  const visibleOfficers = useMemo(() => {
    if (displayLimit === -1) return sortedOfficers;
    return sortedOfficers.slice(0, displayLimit);
  }, [sortedOfficers, displayLimit]);

  // Overall Summary KPIs based on filtered programs & officers
  const summaryStats = useMemo(() => {
    const officersActive = officerAnalytics.filter((o) => o.totalCount > 0).length;
    const totalProgs = filteredProgramsBySlicers.length;
    const selesai = filteredProgramsBySlicers.filter(
      (p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI'
    ).length;
    const dalamTindakan = filteredProgramsBySlicers.filter(
      (p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN'
    ).length;
    const tanggung = filteredProgramsBySlicers.filter(
      (p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG'
    ).length;
    const belum = filteredProgramsBySlicers.filter(
      (p) => (p.statusProgram || '').trim().toUpperCase() === 'BELUM AMBIL TINDAKAN'
    ).length;
    const batal = filteredProgramsBySlicers.filter(
      (p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL'
    ).length;
    const activeProgs = Math.max(totalProgs - batal, 0);
    const completionPct = activeProgs > 0 ? Math.round((selesai / activeProgs) * 100) : 0;

    const totalPeruntukan = filteredProgramsBySlicers.reduce((s, p) => s + (Number(p.jumlahRm) || 0), 0);
    const totalBelanja = filteredProgramsBySlicers.reduce((s, p) => s + (Number(p.jumlahBelanjaRm) || 0), 0);
    const totalPeserta = filteredProgramsBySlicers.reduce((s, p) => s + (Number(p.bilanganPeserta) || 0), 0);
    const totalHari = filteredProgramsBySlicers.reduce((s, p) => s + (Number(p.jumlahHari) || 0), 0);

    return {
      totalOfficers: officerAnalytics.length,
      officersActive,
      totalProgs,
      selesai,
      dalamTindakan,
      tanggung,
      belum,
      batal,
      completionPct,
      totalPeruntukan,
      totalBelanja,
      totalPeserta,
      totalHari,
    };
  }, [officerAnalytics, filteredProgramsBySlicers]);

  // Visualisation Aggregations
  const topOfficersByPrograms = useMemo(
    () =>
      [...officerAnalytics]
        .filter((o) => o.totalCount > 0)
        .sort((a, b) => b.totalCount - a.totalCount || b.selesaiCount - a.selesaiCount)
        .slice(0, 12),
    [officerAnalytics]
  );

  const maxOfficerProgCount = Math.max(...topOfficersByPrograms.map((o) => o.totalCount), 1);

  const topOfficersByBudget = useMemo(
    () =>
      [...officerAnalytics]
        .filter((o) => o.totalPeruntukan > 0 || o.totalBelanja > 0)
        .sort((a, b) => b.totalPeruntukan - a.totalPeruntukan)
        .slice(0, 10),
    [officerAnalytics]
  );

  const maxOfficerBudget = Math.max(
    ...topOfficersByBudget.map((o) => Math.max(o.totalPeruntukan, o.totalBelanja)),
    1
  );

  const jawatanBreakdown = useMemo(() => {
    const map: Record<string, { officers: number; progs: number; selesai: number; alloc: number }> = {};
    officerAnalytics.forEach((o) => {
      const j = o.jawatan || 'LAIN-LAIN';
      if (!map[j]) map[j] = { officers: 0, progs: 0, selesai: 0, alloc: 0 };
      map[j].officers += 1;
      map[j].progs += o.totalCount;
      map[j].selesai += o.selesaiCount;
      map[j].alloc += o.totalPeruntukan;
    });
    return Object.entries(map)
      .map(([jawatan, v]) => ({ jawatan, ...v }))
      .sort((a, b) => b.progs - a.progs || b.officers - a.officers);
  }, [officerAnalytics]);

  const jabatanBreakdown = useMemo(() => {
    const map: Record<string, { officers: number; progs: number; alloc: number; belanja: number }> = {};
    officerAnalytics.forEach((o) => {
      const j = o.jabatan || 'TIDAK DINYATAKAN';
      if (!map[j]) map[j] = { officers: 0, progs: 0, alloc: 0, belanja: 0 };
      map[j].officers += 1;
      map[j].progs += o.totalCount;
      map[j].alloc += o.totalPeruntukan;
      map[j].belanja += o.totalBelanja;
    });
    return Object.entries(map)
      .map(([jabatan, v]) => ({ jabatan, ...v }))
      .sort((a, b) => b.progs - a.progs || b.officers - a.officers);
  }, [officerAnalytics]);

  // Analysis 3: Sumber Kewangan across Officer Programs & Risk/BK04 Attention List
  const sumberAcrossPrograms = useMemo(() => {
    const map: Record<string, { count: number; alloc: number; belanja: number }> = {};
    filteredProgramsBySlicers.forEach((p) => {
      const sk = p.sumberKewangan || 'TIDAK DINYATAKAN';
      if (!map[sk]) map[sk] = { count: 0, alloc: 0, belanja: 0 };
      map[sk].count += 1;
      map[sk].alloc += Number(p.jumlahRm) || 0;
      map[sk].belanja += Number(p.jumlahBelanjaRm) || 0;
    });
    const maxCount = Math.max(...Object.values(map).map((x) => x.count), 1);
    return Object.entries(map)
      .map(([sumber, v]) => ({ sumber, ...v, pct: Math.round((v.count / maxCount) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredProgramsBySlicers]);

  const officersNeedingAttention = useMemo(
    () =>
      officerAnalytics
        .filter((o) => o.belumCount > 0 || o.tanggungCount > 0 || o.pindaanCount > 0)
        .sort((a, b) => b.belumCount + b.tanggungCount - (a.belumCount + a.tanggungCount)),
    [officerAnalytics]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'id' || key === 'nama' || key === 'jawatan' || key === 'jabatan' ? 'asc' : 'desc');
    }
  };

  const handleResetSlicers = () => {
    setSlicerPusat('');
    setSlicerJabatan('');
    setSlicerJawatan('');
    setSlicerStatus('');
    setSlicerPengurus('');
    setSlicerPengurusBersama('');
    setSearchQuery('');
    setOnlyWithPrograms(false);
  };

  const handleExportExcel = () => {
    const rows = sortedOfficers.map((o, idx) => ({
      Bil: idx + 1,
      'ID Pegawai': o.id,
      'Nama Pegawai': o.nama,
      Jawatan: o.jawatan,
      Pusat: o.pusat,
      Jabatan: o.jabatan,
      'Jumlah Program': o.totalCount,
      'Pengurus Utama': o.utamaCount,
      'Pengurus Bersama': o.bersamaCount,
      Selesai: o.selesaiCount,
      'Dalam Tindakan': o.dalamTindakanCount,
      Tanggung: o.tanggungCount,
      'Belum Ambil Tindakan': o.belumCount,
      Batal: o.batalCount,
      'Kadar Kejayaan (%)': o.successRate,
      'Jumlah Hari': o.totalHari,
      'Jumlah Peserta': o.totalPeserta,
      'Peruntukan Diurus (RM)': Number(o.totalPeruntukan.toFixed(2)),
      'Belanja Sebenar (RM)': Number(o.totalBelanja.toFixed(2)),
      'Baki / Penjimatan (RM)': Number(o.totalPenjimatan.toFixed(2)),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 24 }, { wch: 34 }, { wch: 32 },
      { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
      { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analisis Pegawai');
    XLSX.writeFile(wb, `Analisis_Pegawai_Program_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!canAccess) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          Akses Terhad: Analisis Pegawai Mengikut Program
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Akaun anda tidak mempunyai kebenaran untuk melihat halaman ini. Sila hubungi Super Admin untuk mengaktifkan pilihan{' '}
          <strong>ANALISIS PEGAWAI MENGIKUT PROGRAM</strong> dalam <strong>KEBENARAN VIEW/PAPAR PAGE</strong> di Portal Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-14 tabular-nums">
      {/* ============================================================== */}
      {/* SLICER PANEL (6 SLICERS + SEARCH + ACTIONS)                    */}
      {/* ============================================================== */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Slicer Analisis Pegawai Mengikut Program
            </h2>
            <span className="text-xs text-slate-500">
              · {summaryStats.totalOfficers} pegawai · {summaryStats.totalProgs} rekod program
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pegawai / kod / program..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 sm:w-60"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyWithPrograms((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                onlyWithPrograms
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {onlyWithPrograms ? 'Pegawai Ada Program Sahaja' : 'Semua Pegawai Berdaftar'}
            </button>

            <button
              type="button"
              onClick={handleResetSlicers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Set Semula</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Eksport Excel</span>
            </button>
          </div>
        </div>

        {/* 6 Slicers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-3.5">
          {/* 1. Pusat */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">1. Pusat</label>
            <select
              value={slicerPusat}
              onChange={(e) => {
                setSlicerPusat(e.target.value);
                setSlicerJabatan('');
              }}
              className="w-full text-xs font-medium py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Pusat</option>
              {availablePusat.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Jabatan */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">2. Jabatan</label>
            <select
              value={slicerJabatan}
              onChange={(e) => setSlicerJabatan(e.target.value)}
              className="w-full text-xs font-medium py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Jabatan</option>
              {availableJabatan.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Jawatan */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">3. Jawatan</label>
            <select
              value={slicerJawatan}
              onChange={(e) => setSlicerJawatan(e.target.value)}
              className="w-full text-xs font-medium py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Jawatan</option>
              {availableJawatan.map((jw) => (
                <option key={jw} value={jw}>
                  {jw}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status Program */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">4. Status Program</label>
            <select
              value={slicerStatus}
              onChange={(e) => setSlicerStatus(e.target.value)}
              className="w-full text-xs font-medium py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              {statusProgramList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Pengurus */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">5. Pengurus</label>
            <select
              value={slicerPengurus}
              onChange={(e) => setSlicerPengurus(e.target.value)}
              className="w-full text-xs font-medium py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Pengurus</option>
              {availablePengurusOptions.map((pg) => (
                <option key={pg} value={pg}>
                  {pg}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Pengurus Bersama */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">6. Pengurus Bersama</label>
            <select
              value={slicerPengurusBersama}
              onChange={(e) => setSlicerPengurusBersama(e.target.value)}
              className="w-full text-xs font-medium py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Pengurus Bersama</option>
              {availablePengurusBersamaOptions.map((pg) => (
                <option key={pg} value={pg}>
                  {pg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* KPI RINGKASAN BERDASARKAN SLICER                               */}
      {/* ============================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">Pegawai Dipaparkan</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatNumber(summaryStats.totalOfficers)}</div>
          <div className="text-xs text-slate-500 mt-1">
            {formatNumber(summaryStats.officersActive)} pegawai aktif mengurus program
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">Program Dalam Tapisan</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{formatNumber(summaryStats.totalProgs)}</div>
          <div className="text-xs text-slate-500 mt-1">
            {summaryStats.selesai} selesai · {summaryStats.dalamTindakan} dalam tindakan
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">Kadar Kejayaan Pelaksanaan</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summaryStats.completionPct}%</div>
          <div className="text-xs text-slate-500 mt-1">
            {summaryStats.tanggung} tanggung · {summaryStats.belum} belum tindakan
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">Peruntukan &amp; Belanja</div>
          <div className="text-lg font-black text-slate-900 mt-1">RM {formatRM(summaryStats.totalPeruntukan)}</div>
          <div className="text-xs text-amber-700 font-semibold mt-1">
            Belanja: RM {formatRM(summaryStats.totalBelanja)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500">Impak Peserta &amp; Tempoh</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatNumber(summaryStats.totalPeserta)}</div>
          <div className="text-xs text-slate-500 mt-1">
            Jumlah peserta · {formatNumber(summaryStats.totalHari)} hari program
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 1. SENARAI NAMA PEGAWAI & PRESTASI PROGRAM                     */}
      {/* ============================================================== */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              1. Senarai Nama Pegawai Mengikut Perincian Program
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik tajuk lajur untuk susun semula atau klik Lihat Program untuk menyemak senarai penuh program pegawai
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">Papar:</span>
            {[10, 15, 25, 50, -1].map((lim) => (
              <button
                key={lim}
                type="button"
                onClick={() => setDisplayLimit(lim)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  displayLimit === lim
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lim === -1 ? 'Semua' : lim}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mt-4 border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10">Bil</th>
                <th
                  onClick={() => handleSort('id')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    ID <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('nama')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Nama Pegawai <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('jawatan')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Jawatan &amp; Jabatan <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('totalCount')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Program <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('utamaCount')}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  Utama
                </th>
                <th
                  onClick={() => handleSort('bersamaCount')}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  Bersama
                </th>
                <th
                  onClick={() => handleSort('selesaiCount')}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  Pecahan Status
                </th>
                <th
                  onClick={() => handleSort('successRate')}
                  className="py-2.5 px-2.5 text-center cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  Kejayaan
                </th>
                <th
                  onClick={() => handleSort('totalPeruntukan')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  Peruntukan (RM)
                </th>
                <th
                  onClick={() => handleSort('totalBelanja')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 whitespace-nowrap"
                >
                  Belanja (RM)
                </th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleOfficers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-500">
                    Tiada pegawai sepadan dengan pilihan slicer semasa. Cuba set semula penapis.
                  </td>
                </tr>
              ) : (
                visibleOfficers.map((o, idx) => (
                  <tr key={`${o.id}-${o.nama}`} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">{o.id}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 min-w-[180px]">{o.nama}</td>
                    <td className="py-2.5 px-3 max-w-[240px]">
                      <div className="font-semibold text-blue-700 truncate">{o.jawatan}</div>
                      <div className="text-[11px] text-slate-500 truncate" title={`${o.pusat} · ${o.jabatan}`}>
                        {o.jabatan}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-900 text-sm">
                      {o.totalCount}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-semibold text-blue-700">
                      {o.utamaCount}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-semibold text-indigo-700">
                      {o.bersamaCount}
                    </td>
                    <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                      <span className="text-[11px] text-slate-700 font-medium">
                        <span className="text-emerald-700 font-bold">S:{o.selesaiCount}</span>
                        {' · '}
                        <span className="text-sky-700 font-bold">DT:{o.dalamTindakanCount}</span>
                        {' · '}
                        <span className="text-purple-700 font-bold">T:{o.tanggungCount}</span>
                        {' · '}
                        <span className="text-amber-700 font-bold">BAT:{o.belumCount}</span>
                        {o.batalCount > 0 && (
                          <>
                            {' · '}
                            <span className="text-zinc-600 font-bold">B:{o.batalCount}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-bold">
                      <span
                        className={
                          o.successRate >= 80
                            ? 'text-emerald-700'
                            : o.successRate >= 50
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }
                      >
                        {o.successRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatRM(o.totalPeruntukan)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700 whitespace-nowrap">
                      {formatRM(o.totalBelanja)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedOfficerModal({
                            title: `Profil & Senarai Program: ${o.nama}`,
                            subtitle: `${o.id} · ${o.jawatan} · ${o.jabatan}`,
                            officer: o,
                            items: o.allPrograms,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat ({o.totalCount})</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. PELBAGAI VISUALISASI DATA BERDASARKAN SLICER DIPILIH        */}
      {/* ============================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              2. Visualisasi Data Pegawai Berdasarkan Slicer Dipilih
            </h3>
            <p className="text-xs text-slate-500">
              Paparan graf perbandingan beban tugas, status pelaksanaan, penggunaan kewangan, serta agihan jawatan dan jabatan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visualisasi 1: Beban Program Pengurus Utama vs Pengurus Bersama */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  2.1 Kedudukan Pegawai Mengikut Bilangan Program
                </h4>
                <p className="text-[11px] text-slate-500">
                  Perbandingan peranan Pengurus Utama (biru) dan Pengurus Bersama (indigo)
                </p>
              </div>
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>

            {topOfficersByPrograms.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Tiada rekod program bagi pegawai dalam tapisan ini.
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {topOfficersByPrograms.map((o) => {
                  const utamaPct = Math.round((o.utamaCount / maxOfficerProgCount) * 100);
                  const bersamaPct = Math.round((o.bersamaCount / maxOfficerProgCount) * 100);
                  return (
                    <div
                      key={o.id + o.nama}
                      onClick={() =>
                        setSelectedOfficerModal({
                          title: `Program Diurus: ${o.nama}`,
                          subtitle: `${o.utamaCount} Pengurus Utama · ${o.bersamaCount} Pengurus Bersama`,
                          officer: o,
                          items: o.allPrograms,
                        })
                      }
                      className="cursor-pointer group"
                    >
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-800 truncate max-w-[230px] group-hover:text-blue-700">
                          {o.nama}
                        </span>
                        <span className="font-bold text-slate-900">
                          {o.totalCount} program ({o.utamaCount}U / {o.bersamaCount}B)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                        {o.utamaCount > 0 && (
                          <div
                            style={{ width: `${Math.max(4, utamaPct)}%` }}
                            className="bg-blue-600 h-full"
                            title={`Pengurus Utama: ${o.utamaCount}`}
                          />
                        )}
                        {o.bersamaCount > 0 && (
                          <div
                            style={{ width: `${Math.max(4, bersamaPct)}%` }}
                            className="bg-indigo-400 h-full"
                            title={`Pengurus Bersama: ${o.bersamaCount}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visualisasi 2: Agihan Status Program dalam Tapisan */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  2.2 Agihan Status Program Mengikut Slicer
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pecahan kemajuan pelaksanaan kesemua program pegawai terpilih
                </p>
              </div>
              <PieChart className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-3">
              {[
                { label: 'SELESAI', count: summaryStats.selesai, color: 'bg-emerald-500' },
                { label: 'DALAM TINDAKAN', count: summaryStats.dalamTindakan, color: 'bg-sky-500' },
                { label: 'TANGGUNG', count: summaryStats.tanggung, color: 'bg-purple-500' },
                { label: 'BELUM AMBIL TINDAKAN', count: summaryStats.belum, color: 'bg-amber-500' },
                { label: 'BATAL', count: summaryStats.batal, color: 'bg-zinc-500' },
              ].map((st) => {
                const pct =
                  summaryStats.totalProgs > 0
                    ? Math.round((st.count / summaryStats.totalProgs) * 100)
                    : 0;
                const matching = filteredProgramsBySlicers.filter(
                  (p) => (p.statusProgram || '').trim().toUpperCase() === st.label
                );
                return (
                  <div
                    key={st.label}
                    onClick={() =>
                      setSelectedOfficerModal({
                        title: `Program Status: ${st.label}`,
                        subtitle: `${st.count} program dalam tapisan semasa`,
                        items: matching,
                      })
                    }
                    className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-800">{st.label}</span>
                      <span className="font-bold text-slate-900">
                        {st.count} program ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${st.color}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visualisasi 3: Peruntukan vs Belanja Sebenar Mengikut Pegawai */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  2.3 Perbandingan Peruntukan berbanding Belanja Pegawai (RM)
                </h4>
                <p className="text-[11px] text-slate-500">
                  10 pegawai tertinggi mengikut jumlah peruntukan program diuruskan
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>

            {topOfficersByBudget.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Tiada rekod kewangan dalam tapisan ini.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {topOfficersByBudget.map((o) => {
                  const allocW = Math.round((o.totalPeruntukan / maxOfficerBudget) * 100);
                  const actualW = Math.round((o.totalBelanja / maxOfficerBudget) * 100);
                  return (
                    <div key={o.id + o.nama} className="text-xs">
                      <div className="flex justify-between items-center font-semibold text-slate-800 mb-1">
                        <span className="truncate max-w-[220px]">{o.nama}</span>
                        <span className="text-slate-600 font-bold">{o.utilRate}% belanja</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex flex-col gap-0.5">
                        <div style={{ width: `${allocW}%` }} className="bg-blue-600 h-1.5 rounded-full" />
                        <div style={{ width: `${actualW}%` }} className="bg-amber-500 h-1 rounded-full" />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                        <span>Peruntukan: RM {formatRM(o.totalPeruntukan)}</span>
                        <span className="text-amber-700 font-semibold">
                          Belanja: RM {formatRM(o.totalBelanja)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visualisasi 4: Taburan Mengikut Jawatan & Jabatan */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  2.4 Taburan Pegawai &amp; Program Mengikut Jawatan dan Jabatan
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pecahan bilangan pegawai serta beban program mengikut struktur organisasi
                </p>
              </div>
              <Layers className="w-4 h-4 text-teal-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
              <div>
                <h5 className="text-[11px] font-bold text-slate-600 uppercase mb-2">
                  Mengikut Jawatan ({jawatanBreakdown.length})
                </h5>
                <div className="space-y-2">
                  {jawatanBreakdown.map((jw) => (
                    <div key={jw.jawatan} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="font-bold text-slate-900 truncate" title={jw.jawatan}>
                        {jw.jawatan}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                        <span>{jw.officers} pegawai</span>
                        <span className="font-bold text-blue-700">
                          {jw.progs} program ({jw.selesai} selesai)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-[11px] font-bold text-slate-600 uppercase mb-2">
                  Mengikut Jabatan ({jabatanBreakdown.length})
                </h5>
                <div className="space-y-2">
                  {jabatanBreakdown.map((jb) => (
                    <div key={jb.jabatan} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="font-bold text-slate-900 truncate" title={jb.jabatan}>
                        {jb.jabatan}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                        <span>{jb.officers} pegawai · {jb.progs} program</span>
                        <span className="font-bold text-slate-800">RM {formatRM(jb.alloc)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. PELBAGAI ANALISIS BERKAITAN PEGAWAI BERDASARKAN PROGRAM     */}
      {/* ============================================================== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            3. Analisis Lanjutan Pegawai Berdasarkan Perincian Program
          </h3>
          <p className="text-xs text-slate-500">
            Penilaian keberhasilan penyempurnaan, sumber kewangan, impak peserta serta pemantauan tindakan susulan pegawai
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3A: Analisis Keberhasilan & Penyempurnaan Pegawai */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h4 className="text-sm font-bold text-slate-900">
                  3.1 Keberhasilan Pelaksanaan Pegawai
                </h4>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {officerAnalytics.filter((o) => o.totalCount > 0).length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">Tiada program aktif dalam tapisan.</p>
                ) : (
                  [...officerAnalytics]
                    .filter((o) => o.totalCount > 0)
                    .sort((a, b) => b.selesaiCount - a.selesaiCount || b.successRate - a.successRate)
                    .map((o) => (
                      <div
                        key={o.id + o.nama}
                        onClick={() =>
                          setSelectedOfficerModal({
                            title: `Keberhasilan Pegawai: ${o.nama}`,
                            subtitle: `${o.selesaiCount} program selesai daripada ${o.activeCount} program aktif`,
                            officer: o,
                            items: o.allPrograms,
                          })
                        }
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-400 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {o.nama} berjaya melaksanakan{' '}
                            <span className="text-emerald-700">{o.selesaiCount} program</span>
                          </p>
                          <span className="text-xs font-bold text-emerald-700 shrink-0">{o.successRate}%</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {o.totalCount} program diurus · {formatNumber(o.totalPeserta)} peserta · {o.totalHari} hari
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* 3B: Analisis Sumber Kewangan & Impak Latihan */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h4 className="text-sm font-bold text-slate-900">
                  3.2 Sumber Kewangan &amp; Impak Peserta
                </h4>
                <Briefcase className="w-4 h-4 text-blue-600" />
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {sumberAcrossPrograms.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">Tiada rekod sumber kewangan.</p>
                ) : (
                  sumberAcrossPrograms.map((sk) => (
                    <div
                      key={sk.sumber}
                      onClick={() =>
                        setSelectedOfficerModal({
                          title: `Program Sumber Kewangan: ${sk.sumber}`,
                          subtitle: `${sk.count} program diuruskan pegawai dalam tapisan`,
                          items: filteredProgramsBySlicers.filter(
                            (p) => (p.sumberKewangan || 'TIDAK DINYATAKAN') === sk.sumber
                          ),
                        })
                      }
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>{sk.sumber}</span>
                        <span>{sk.count} program</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden my-1.5">
                        <div style={{ width: `${sk.pct}%` }} className="bg-blue-600 h-full rounded-full" />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Peruntukan: RM {formatRM(sk.alloc)}</span>
                        <span>Belanja: RM {formatRM(sk.belanja)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3C: Analisis Pemantauan Tindakan & Pindaan BK04 Pegawai */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h4 className="text-sm font-bold text-slate-900">
                  3.3 Pemantauan Tunggakan &amp; Pindaan BK04
                </h4>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {officersNeedingAttention.length === 0 ? (
                  <div className="py-8 text-center text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                    Tiada tunggakan atau pindaan BK04 bagi pegawai dalam tapisan semasa.
                  </div>
                ) : (
                  officersNeedingAttention.map((o) => (
                    <div
                      key={o.id + o.nama}
                      onClick={() =>
                        setSelectedOfficerModal({
                          title: `Pemantauan Program: ${o.nama}`,
                          subtitle: `Belum Tindakan: ${o.belumCount} · Tanggung: ${o.tanggungCount} · Pindaan BK04: ${o.pindaanCount}`,
                          officer: o,
                          items: o.allPrograms,
                        })
                      }
                      className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-bold text-slate-900">{o.nama}</div>
                      <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {o.belumCount > 0 && (
                          <span className="text-rose-700 font-semibold">
                            Belum Tindakan: {o.belumCount}
                          </span>
                        )}
                        {o.tanggungCount > 0 && (
                          <span className="text-purple-700 font-semibold">
                            Tanggung: {o.tanggungCount}
                          </span>
                        )}
                        {o.pindaanCount > 0 && (
                          <span className="text-amber-800 font-semibold">
                            Pindaan BK04: {o.pindaanCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* MODAL PERINCIAN PROGRAM PEGAWAI                                */}
      {/* ============================================================== */}
      {selectedOfficerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedOfficerModal.title}
                </h3>
                {selectedOfficerModal.subtitle && (
                  <p className="text-xs text-slate-600 mt-0.5">{selectedOfficerModal.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfficerModal(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {selectedOfficerModal.items.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400">
                  Tiada program direkodkan untuk pegawai ini dalam tapisan semasa.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Bil</th>
                        <th className="py-2.5 px-3">Kod &amp; Nama Program</th>
                        <th className="py-2.5 px-3">Peranan</th>
                        <th className="py-2.5 px-3">Tarikh</th>
                        <th className="py-2.5 px-3 text-right">Peruntukan (RM)</th>
                        <th className="py-2.5 px-3 text-right">Belanja (RM)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOfficerModal.items.map((p, idx) => {
                        const cfg = getStatusConfig(p.statusProgram);
                        const isMain =
                          selectedOfficerModal.officer &&
                          matchesOfficerRef(selectedOfficerModal.officer, p.pengurusId, p.pengurusNama);
                        return (
                          <tr key={p.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-400 font-semibold">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{p.namaProgram}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {p.kodProgram} · {p.jabatan}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">
                              {selectedOfficerModal.officer
                                ? isMain
                                  ? 'Pengurus Utama'
                                  : 'Pengurus Bersama'
                                : p.pengurusNama || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{p.tempoh || p.tarikhMula}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatRM(p.jumlahRm)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                              {formatRM(p.jumlahBelanjaRm ?? 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${cfg.badgeBg}`}>
                                {p.statusProgram}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOfficerModal(null);
                                  viewProgramDetail(p);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Perincian</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOfficerModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
