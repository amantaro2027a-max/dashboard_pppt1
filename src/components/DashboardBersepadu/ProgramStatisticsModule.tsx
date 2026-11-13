import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Wallet,
  Coins,
  Eye,
  Search,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  PieChart,
  BarChart3,
  SlidersHorizontal,
  Briefcase,
  FileText,
} from 'lucide-react';
import { ProgramItem, Pegawai } from '../../types/program';
import { formatNumber, formatRM, getStatusConfig } from '../../utils/formatters';

interface ProgramStatisticsModuleProps {
  programs: ProgramItem[];
  allPrograms: ProgramItem[];
  pegawaiList: Pegawai[];
  pusatList: string[];
  jabatanMap: Record<string, string[]>;
  onOpenDrillDown: (title: string, filteredList: ProgramItem[]) => void;
  onViewProgramDetail: (prog: ProgramItem) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

type StatTab = 'pusat' | 'jabatan' | 'pegawai' | 'program' | 'status';

export const ProgramStatisticsModule: React.FC<ProgramStatisticsModuleProps> = ({
  programs,
  allPrograms,
  pegawaiList,
  pusatList,
  jabatanMap,
  onOpenDrillDown,
  onViewProgramDetail,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [activeTab, setActiveTab] = useState<StatTab>('pusat');
  const [searchQuery, setSearchQuery] = useState('');

  // -------------------------------------------------------------
  // 1. STATISTIK PUSAT
  // Pusat by jabatan, bilangan pegawai, bilangan program, RM, Status Program
  // -------------------------------------------------------------
  const statsPusat = useMemo(() => {
    // Unique list of pusat from pusatList and programs
    const uniquePusat = Array.from(
      new Set([
        ...pusatList,
        ...programs.map((p) => p.pusat).filter(Boolean),
        ...pegawaiList.map((pg) => pg.pusat).filter(Boolean),
      ])
    ).filter(Boolean) as string[];

    return uniquePusat.map((pusat) => {
      // Jabatan under this pusat
      const deptsFromMap = jabatanMap[pusat] || [];
      const deptsFromProg = programs
        .filter((p) => p.pusat === pusat && p.jabatan)
        .map((p) => p.jabatan);
      const allDepts = Array.from(new Set([...deptsFromMap, ...deptsFromProg]));

      // Pegawai under this pusat
      const pegawaiCount = pegawaiList.filter((pg) => pg.pusat === pusat).length;

      // Programs under this pusat
      const progs = programs.filter((p) => {
        if (p.pusat && p.pusat === pusat) return true;
        if (p.jabatan && allDepts.includes(p.jabatan)) return true;
        return false;
      });

      const allocRm = progs.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
      const actualRm = progs.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
      const balanceRm = allocRm - actualRm;

      // Status breakdown
      const selesai = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI').length;
      const dalamTindakan = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN').length;
      const tanggung = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG').length;
      const belumAmbil = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BELUM AMBIL TINDAKAN').length;
      const batal = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL').length;

      return {
        pusat,
        depts: allDepts,
        deptCount: allDepts.length,
        pegawaiCount,
        programCount: progs.length,
        allocRm,
        actualRm,
        balanceRm,
        utilRate: allocRm > 0 ? Math.round((actualRm / allocRm) * 100) : 0,
        status: { selesai, dalamTindakan, tanggung, belumAmbil, batal },
        programs: progs,
      };
    });
  }, [pusatList, programs, pegawaiList, jabatanMap]);

  // -------------------------------------------------------------
  // 2. STATISTIK JABATAN
  // Jabatan by bilangan pegawai, bilangan program, RM, Status Program
  // -------------------------------------------------------------
  const statsJabatan = useMemo(() => {
    // Collect all departments from jabatanMap & programs
    const allDeptSet = new Set<string>();
    Object.values(jabatanMap || {}).forEach((jList) => jList.forEach((j) => allDeptSet.add(j)));
    programs.forEach((p) => {
      if (p.jabatan) allDeptSet.add(p.jabatan);
    });
    pegawaiList.forEach((pg) => {
      if (pg.jabatan) allDeptSet.add(pg.jabatan);
    });

    const depts = Array.from(allDeptSet).sort();

    return depts.map((jabatan) => {
      // Find parent Pusat
      let parentPusat = 'TIDAK BERKENAAN';
      for (const [pusatKey, jList] of Object.entries(jabatanMap || {})) {
        if (jList.includes(jabatan)) {
          parentPusat = pusatKey;
          break;
        }
      }

      // Pegawai count
      const pegawaiCount = pegawaiList.filter((pg) => pg.jabatan === jabatan).length;

      // Programs
      const progs = programs.filter((p) => p.jabatan === jabatan);
      const allocRm = progs.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
      const actualRm = progs.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
      const balanceRm = allocRm - actualRm;

      // Status breakdown
      const selesai = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI').length;
      const dalamTindakan = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN').length;
      const tanggung = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG').length;
      const belumAmbil = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BELUM AMBIL TINDAKAN').length;
      const batal = progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL').length;

      return {
        jabatan,
        parentPusat,
        pegawaiCount,
        programCount: progs.length,
        allocRm,
        actualRm,
        balanceRm,
        utilRate: allocRm > 0 ? Math.round((actualRm / allocRm) * 100) : 0,
        status: { selesai, dalamTindakan, tanggung, belumAmbil, batal },
        programs: progs,
      };
    });
  }, [jabatanMap, programs, pegawaiList]);

  // -------------------------------------------------------------
  // 3. STATISTIK PEGAWAI
  // Pegawai by bilangan program, RM, Status Program
  // -------------------------------------------------------------
  const statsPegawai = useMemo(() => {
    // Map across registered pegawai and distinct program managers
    const pegawaiMap = new Map<
      string,
      {
        id: string;
        nama: string;
        jawatan: string;
        pusat: string;
        jabatan: string;
        progs: ProgramItem[];
      }
    >();

    // Seed with registered pegawai
    pegawaiList.forEach((pg) => {
      pegawaiMap.set(pg.nama.trim().toUpperCase(), {
        id: pg.id,
        nama: pg.nama,
        jawatan: pg.jawatan || 'PEGAWAI',
        pusat: pg.pusat || 'TIDAK DINYATAKAN',
        jabatan: pg.jabatan || 'UMUM',
        progs: [],
      });
    });

    // Match programs by pengurusNama or pengurusId or pengurusBersama
    programs.forEach((p) => {
      const pNama = (p.pengurusNama || p.pengurusId || '').trim().toUpperCase();
      if (pNama) {
        if (!pegawaiMap.has(pNama)) {
          pegawaiMap.set(pNama, {
            id: p.pengurusId || pNama,
            nama: p.pengurusNama || p.pengurusId || pNama,
            jawatan: 'PENGURUS PROGRAM',
            pusat: p.pusat || '',
            jabatan: p.jabatan || '',
            progs: [],
          });
        }
        pegawaiMap.get(pNama)!.progs.push(p);
      }

      // Check pengurus bersama
      const coNama = (p.pengurusBersamaNama || p.pengurusBersamaId || '').trim().toUpperCase();
      if (coNama && coNama !== pNama) {
        if (!pegawaiMap.has(coNama)) {
          pegawaiMap.set(coNama, {
            id: p.pengurusBersamaId || coNama,
            nama: p.pengurusBersamaNama || p.pengurusBersamaId || coNama,
            jawatan: 'PENGURUS BERSAMA',
            pusat: p.pusat || '',
            jabatan: p.jabatan || '',
            progs: [],
          });
        }
        const existing = pegawaiMap.get(coNama)!;
        if (!existing.progs.includes(p)) {
          existing.progs.push(p);
        }
      }
    });

    return Array.from(pegawaiMap.values()).map((entry) => {
      const allocRm = entry.progs.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
      const actualRm = entry.progs.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
      const balanceRm = allocRm - actualRm;

      const selesai = entry.progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI').length;
      const dalamTindakan = entry.progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN').length;
      const tanggung = entry.progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG').length;
      const belumAmbil = entry.progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BELUM AMBIL TINDAKAN').length;
      const batal = entry.progs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL').length;

      return {
        id: entry.id,
        nama: entry.nama,
        jawatan: entry.jawatan,
        pusat: entry.pusat,
        jabatan: entry.jabatan,
        programCount: entry.progs.length,
        allocRm,
        actualRm,
        balanceRm,
        status: { selesai, dalamTindakan, tanggung, belumAmbil, batal },
        programs: entry.progs,
      };
    }).sort((a, b) => b.programCount - a.programCount);
  }, [pegawaiList, programs]);

  // -------------------------------------------------------------
  // 4. STATISTIK PROGRAM
  // Program by bilangan pusat, bilangan jabatan, RM, Status Program
  // -------------------------------------------------------------
  const statsProgram = useMemo(() => {
    const totalPusat = new Set(programs.map((p) => p.pusat).filter(Boolean)).size;
    const totalJabatan = new Set(programs.map((p) => p.jabatan).filter(Boolean)).size;
    const totalAlloc = programs.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
    const totalActual = programs.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
    const totalBalance = totalAlloc - totalActual;

    const selesai = programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI').length;
    const dalamTindakan = programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN').length;
    const tanggung = programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG').length;
    const belumAmbil = programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BELUM AMBIL TINDAKAN').length;
    const batal = programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL').length;

    return {
      totalPrograms: programs.length,
      totalPusat,
      totalJabatan,
      totalAlloc,
      totalActual,
      totalBalance,
      status: { selesai, dalamTindakan, tanggung, belumAmbil, batal },
    };
  }, [programs]);

  // -------------------------------------------------------------
  // 5. STATISTIK STATUS
  // Status by bilangan pusat, bilangan jabatan, bilangan pegawai, bilangan program, RM
  // -------------------------------------------------------------
  const statsStatus = useMemo(() => {
    const statusKeys = ['SELESAI', 'DALAM TINDAKAN', 'TANGGUNG', 'BELUM AMBIL TINDAKAN', 'BATAL'];

    return statusKeys.map((st) => {
      const progs = programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === st);

      const pusatSet = new Set(progs.map((p) => p.pusat).filter(Boolean));
      const jabatanSet = new Set(progs.map((p) => p.jabatan).filter(Boolean));
      const pegawaiSet = new Set(
        progs
          .map((p) => p.pengurusNama || p.pengurusId)
          .concat(progs.map((p) => p.pengurusBersamaNama || p.pengurusBersamaId))
          .filter(Boolean)
      );

      const allocRm = progs.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
      const actualRm = progs.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
      const balanceRm = allocRm - actualRm;

      return {
        status: st,
        config: getStatusConfig(st),
        programCount: progs.length,
        pusatCount: pusatSet.size,
        jabatanCount: jabatanSet.size,
        pegawaiCount: pegawaiSet.size,
        allocRm,
        actualRm,
        balanceRm,
        programs: progs,
      };
    });
  }, [programs]);

  // Filtered lists for table search
  const filteredPusat = useMemo(() => {
    if (!searchQuery.trim()) return statsPusat;
    const q = searchQuery.toLowerCase();
    return statsPusat.filter((p) => p.pusat.toLowerCase().includes(q));
  }, [statsPusat, searchQuery]);

  const filteredJabatan = useMemo(() => {
    if (!searchQuery.trim()) return statsJabatan;
    const q = searchQuery.toLowerCase();
    return statsJabatan.filter(
      (j) => j.jabatan.toLowerCase().includes(q) || j.parentPusat.toLowerCase().includes(q)
    );
  }, [statsJabatan, searchQuery]);

  const filteredPegawai = useMemo(() => {
    if (!searchQuery.trim()) return statsPegawai;
    const q = searchQuery.toLowerCase();
    return statsPegawai.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        p.jawatan.toLowerCase().includes(q) ||
        p.jabatan.toLowerCase().includes(q)
    );
  }, [statsPegawai, searchQuery]);

  const filteredProgramList = useMemo(() => {
    if (!searchQuery.trim()) return programs;
    const q = searchQuery.toLowerCase();
    return programs.filter(
      (p) =>
        (p.namaProgram || '').toLowerCase().includes(q) ||
        (p.kodProgram || '').toLowerCase().includes(q) ||
        (p.jabatan || '').toLowerCase().includes(q) ||
        (p.pengurusNama || '').toLowerCase().includes(q)
    );
  }, [programs, searchQuery]);

  return (
    <div className="space-y-8 mb-12">
      {/* SECTION HEADER - KAD HEADER GELAP (MENGIKUT CONTOH IMAGE) */}
      <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shadow-sm border border-slate-800 transition-all hover:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-600/30 border border-blue-400/40 text-blue-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                MODUL 5
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                STATISTIK KESELURUHAN PUSAT, JABATAN, PEGAWAI, PROGRAM &amp; STATUS
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Kategori:</span>
              <strong className="text-amber-400 font-bold uppercase">
                STATISTIK PROGRAM
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Dimensi Analitik
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
              5 Dimensi
            </span>
          </div>

          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isExpanded ? 'Sembunyi Modul Ini' : 'Papar Modul Ini'}
          >
            <span>{isExpanded ? 'Sembunyi' : 'Papar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* SUB-TABS NAVIGATION & SEARCH BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab('pusat')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'pusat'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>1. Statistik Pusat</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'pusat' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'}`}>
                  {statsPusat.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('jabatan')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'jabatan'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2. Statistik Jabatan</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'jabatan' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'}`}>
                  {statsJabatan.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('pegawai')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'pegawai'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>3. Statistik Pegawai</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'pegawai' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'}`}>
                  {statsPegawai.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('program')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'program'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>4. Statistik Program</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'program' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'}`}>
                  {programs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('status')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'status'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>5. Statistik Status</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'status' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'}`}>
                  5
                </span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari dalam statistik..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-56"
              />
            </div>
          </div>

          {/* TAB 1: STATISTIK PUSAT */}
          {activeTab === 'pusat' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      1. Statistik Pusat Mengikut Jabatan, Pegawai, Program, RM &amp; Status
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Analisis menyeluruh setiap Pusat di Institut Aminuddin Baki (IAB)
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-100 text-teal-800">
                    {filteredPusat.length} Pusat Aktif
                  </span>
                </div>

                <div className="space-y-4">
                  {filteredPusat.map((p) => (
                    <div
                      key={p.pusat}
                      className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-teal-400 transition-all bg-gradient-to-b from-white to-slate-50/40"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                            <h4 className="text-base font-black text-slate-900">{p.pusat}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                            <span>
                              <strong>{p.deptCount}</strong> Jabatan
                            </span>
                            <span>&bull;</span>
                            <span>
                              <strong>{p.pegawaiCount}</strong> Pegawai
                            </span>
                            <span>&bull;</span>
                            <span>
                              <strong>{p.programCount}</strong> Program Dijalankan
                            </span>
                          </p>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-right">
                            <span className="text-[10px] text-blue-700 font-bold uppercase block">Peruntukan (RM)</span>
                            <span className="text-sm font-black text-blue-950">{formatRM(p.allocRm)}</span>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-right">
                            <span className="text-[10px] text-amber-700 font-bold uppercase block">Belanja Sebenar</span>
                            <span className="text-sm font-black text-amber-950">{formatRM(p.actualRm)}</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-right">
                            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Baki Bersih</span>
                            <span className="text-sm font-black text-emerald-950">{formatRM(p.balanceRm)}</span>
                          </div>
                          <button
                            onClick={() => onOpenDrillDown(`Program Pusat: ${p.pusat}`, p.programs)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Program ({p.programCount})</span>
                          </button>
                        </div>
                      </div>

                      {/* Status Badges & Jabatan list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-1">
                        {/* Status Breakdown Badges */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Pecahan Status Program
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              SELESAI: {p.status.selesai}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              DALAM TINDAKAN: {p.status.dalamTindakan}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              TANGGUNG: {p.status.tanggung}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              BELUM AMBIL TINDAKAN: {p.status.belumAmbil}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                              BATAL: {p.status.batal}
                            </span>
                          </div>
                        </div>

                        {/* List of Jabatan under this Pusat */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Senarai Jabatan ({p.depts.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {p.depts.map((d) => (
                              <span
                                key={d}
                                className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[280px]"
                                title={d}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATISTIK JABATAN */}
          {activeTab === 'jabatan' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Statistik Jabatan Mengikut Pegawai, Bilangan Program, RM &amp; Status
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Prestasi pelaksanaan dan kewangan mengikut setiap Jabatan
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-100 text-teal-800">
                  {filteredJabatan.length} Jabatan
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Bil</th>
                      <th className="py-3 px-3">Jabatan &amp; Pusat Induk</th>
                      <th className="py-3 px-3 text-center">Pegawai</th>
                      <th className="py-3 px-3 text-center">Program</th>
                      <th className="py-3 px-3 text-right">Peruntukan (RM)</th>
                      <th className="py-3 px-3 text-right">Belanja (RM)</th>
                      <th className="py-3 px-3 text-center">Pecahan Status</th>
                      <th className="py-3 px-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJabatan.map((j, idx) => (
                      <tr key={j.jabatan} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 max-w-[260px]">
                          <div className="font-bold text-slate-900">{j.jabatan}</div>
                          <div className="text-[10px] text-slate-400 font-medium truncate" title={j.parentPusat}>
                            {j.parentPusat}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {j.pegawaiCount} orang
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-black text-slate-900 text-sm">{j.programCount}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatRM(j.allocRm)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-amber-700">
                          {formatRM(j.actualRm)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200" title="Selesai">
                              S:{j.status.selesai}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200" title="Dalam Tindakan">
                              DT:{j.status.dalamTindakan}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200" title="Tanggung">
                              T:{j.status.tanggung}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Belum Ambil Tindakan">
                              BAT:{j.status.belumAmbil}
                            </span>
                            {j.status.batal > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200" title="Batal">
                                B:{j.status.batal}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onOpenDrillDown(`Program Jabatan: ${j.jabatan}`, j.programs)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STATISTIK PEGAWAI */}
          {activeTab === 'pegawai' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Statistik Pegawai Mengikut Bilangan Program, RM &amp; Status Program
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Beban tugas dan peruntukan diuruskan oleh setiap Pegawai Pengurus
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-100 text-teal-800">
                  {filteredPegawai.length} Pegawai
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Bil</th>
                      <th className="py-3 px-3">Nama Pegawai &amp; Jawatan</th>
                      <th className="py-3 px-3">Jabatan &amp; Pusat</th>
                      <th className="py-3 px-3 text-center">Bil. Program</th>
                      <th className="py-3 px-3 text-right">Peruntukan Diurus (RM)</th>
                      <th className="py-3 px-3 text-right">Belanja Sebenar (RM)</th>
                      <th className="py-3 px-3 text-center">Status Program Diurus</th>
                      <th className="py-3 px-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPegawai.map((pg, idx) => (
                      <tr key={pg.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 line-clamp-1">{pg.nama}</div>
                          <div className="text-[10px] text-teal-700 font-semibold">{pg.jawatan}</div>
                        </td>
                        <td className="py-3 px-3 max-w-[220px]">
                          <div className="text-slate-700 truncate" title={pg.jabatan}>
                            {pg.jabatan || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate" title={pg.pusat}>
                            {pg.pusat || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-black text-xs ${pg.programCount > 0 ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-400'}`}>
                            {pg.programCount} aktiviti
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatRM(pg.allocRm)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-amber-700">
                          {formatRM(pg.actualRm)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              S:{pg.status.selesai}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                              DT:{pg.status.dalamTindakan}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                              T:{pg.status.tanggung}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              BAT:{pg.status.belumAmbil}
                            </span>
                            {pg.status.batal > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                                B:{pg.status.batal}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onOpenDrillDown(`Program Pegawai: ${pg.nama}`, pg.programs)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: STATISTIK PROGRAM */}
          {activeTab === 'program' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Jumlah Program</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {statsProgram.totalPrograms}
                  </span>
                  <span className="text-[11px] text-slate-400">Aktiviti aktif</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Bilangan Pusat</span>
                  <span className="text-2xl font-black text-teal-700 mt-1 block">
                    {statsProgram.totalPusat}
                  </span>
                  <span className="text-[11px] text-slate-400">Pusat terlibat</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Bilangan Jabatan</span>
                  <span className="text-2xl font-black text-indigo-700 mt-1 block">
                    {statsProgram.totalJabatan}
                  </span>
                  <span className="text-[11px] text-slate-400">Jabatan terlibat</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Peruntukan (RM)</span>
                  <span className="text-lg font-black text-blue-950 mt-1 block truncate">
                    {formatRM(statsProgram.totalAlloc)}
                  </span>
                  <span className="text-[11px] text-blue-700">Jumlah diluluskan</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Belanja Sebenar</span>
                  <span className="text-lg font-black text-amber-950 mt-1 block truncate">
                    {formatRM(statsProgram.totalActual)}
                  </span>
                  <span className="text-[11px] text-amber-700">Perbelanjaan sebenar</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Baki Bersih</span>
                  <span className="text-lg font-black text-emerald-950 mt-1 block truncate">
                    {formatRM(statsProgram.totalBalance)}
                  </span>
                  <span className="text-[11px] text-emerald-700">Penjimatan baki</span>
                </div>
              </div>

              {/* Programs Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Senarai Terperinci Program, Pusat, Jabatan, RM &amp; Status
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {filteredProgramList.length} program ditemui
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3">Bil</th>
                        <th className="py-3 px-3">Kod &amp; Nama Program</th>
                        <th className="py-3 px-3">Jabatan &amp; Pusat</th>
                        <th className="py-3 px-3">Pengurus</th>
                        <th className="py-3 px-3 text-right">Peruntukan (RM)</th>
                        <th className="py-3 px-3 text-right">Belanja (RM)</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProgramList.map((p, idx) => {
                        const cfg = getStatusConfig(p.statusProgram);
                        return (
                          <tr key={p.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-3 max-w-[260px]">
                              <div className="font-bold text-slate-900 line-clamp-1">{p.namaProgram}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.kodProgram}</div>
                            </td>
                            <td className="py-3 px-3 max-w-[200px]">
                              <div className="text-slate-800 truncate" title={p.jabatan}>{p.jabatan}</div>
                              <div className="text-[10px] text-slate-400 truncate" title={p.pusat}>{p.pusat}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-700 truncate max-w-[150px]">
                              {p.pengurusNama || p.pengurusId}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900">
                              {formatRM(p.jumlahRm)}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-amber-700">
                              {formatRM(p.jumlahBelanjaRm ?? 0)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${cfg.badgeBg}`}>
                                {p.statusProgram}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => onViewProgramDetail(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
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
              </div>
            </div>
          )}

          {/* TAB 5: STATISTIK STATUS */}
          {activeTab === 'status' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    5. Statistik Status Mengikut Bilangan Pusat, Jabatan, Pegawai, Program &amp; RM
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pengelasan menyeluruh setiap Status Program di peringkat institut
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-100 text-teal-800">
                  5 Status Utama
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statsStatus.map((st) => (
                  <div
                    key={st.status}
                    className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${st.config.badgeBg}`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                            {st.status}
                          </span>
                        </div>
                        <span className="text-lg font-black text-slate-900">
                          {st.programCount} aktiviti
                        </span>
                      </div>

                      {/* Dimension metrics */}
                      <div className="grid grid-cols-3 gap-2 text-center mb-4 py-2 bg-white/70 rounded-xl border border-slate-200/60">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Pusat</span>
                          <strong className="text-xs font-black text-slate-900">{st.pusatCount}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Jabatan</span>
                          <strong className="text-xs font-black text-slate-900">{st.jabatanCount}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Pegawai</span>
                          <strong className="text-xs font-black text-slate-900">{st.pegawaiCount}</strong>
                        </div>
                      </div>

                      {/* Financial values */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Peruntukan:</span>
                          <strong className="font-bold text-slate-900">{formatRM(st.allocRm)}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Belanja Sebenar:</span>
                          <strong className="font-semibold text-amber-800">{formatRM(st.actualRm)}</strong>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                          <span className="text-slate-600">Baki Bersih:</span>
                          <strong className="font-bold text-emerald-800">{formatRM(st.balanceRm)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                      <button
                        onClick={() => onOpenDrillDown(`Program Status: ${st.status}`, st.programs)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Program ({st.programCount})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
