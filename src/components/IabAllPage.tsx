import React, { useMemo, useState } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem } from '../types/program';
import { formatRM, getStatusConfig } from '../utils/formatters';
import { getCurrentFinanceYear, getFasaYear, getProgramYear } from '../utils/financeYear';
import { deduplicateProgramsByCode } from '../utils/programDedupe';
import {
  getPeruntukanDiluluskanStats,
  getProgramFinanceAggregate,
} from '../utils/financeCalculations';
import * as XLSX from 'xlsx';
import {
  Globe,
  Layers,
  Landmark,
  Briefcase,
  Users,
  BarChart3,
  PieChart,
  TrendingUp,
  Wallet,
  Search,
  Lock,
  ShieldAlert,
  ArrowRight,
  ArrowUpDown,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface GroupStats {
  totalPrograms: number;
  selesai: number;
  dalamTindakan: number;
  tanggung: number;
  belum: number;
  batal: number;
  peserta: number;
  hari: number;
  peruntukanDiagihkan: number;
  belanja: number;
  penjimatan: number;
  successRate: number;
}

export const IabAllPage: React.FC = () => {
  const {
    currentUser,
    isSuperAdmin,
    getPageAccessMode,
    setActiveTab,
    klusterList,
    klusterMap,
    getKlusterForPusat,
    pusatList,
    jabatanMap,
    pegawaiList,
    programs,
    fasaPeruntukanList,
    sumberKewanganList,
    viewProgramDetail,
    logActivity,
  } = useProgramContext();

  const pageMode = getPageAccessMode('IAB ALL');
  const canAccess = Boolean(currentUser) && (isSuperAdmin || pageMode !== 'none');

  const [filterTahun, setFilterTahun] = useState<string>(() => String(getCurrentFinanceYear()));
  const [filterKluster, setFilterKluster] = useState<string>('SEMUA');
  const [officerSearch, setOfficerSearch] = useState('');
  const [officerKlusterFilter, setOfficerKlusterFilter] = useState('SEMUA');
  const [officerSortKey, setOfficerSortKey] = useState<'nama' | 'kluster' | 'pusat' | 'jabatan' | 'total' | 'selesai' | 'peruntukan'>('total');
  const [officerSortDir, setOfficerSortDir] = useState<'asc' | 'desc'>('desc');
  const [comparisonLevel, setComparisonLevel] = useState<'kluster' | 'pusat' | 'jabatan'>('kluster');
  const [rumusanLevel, setRumusanLevel] = useState<'kluster' | 'pusat' | 'jabatan'>('kluster');
  const [drilldownModal, setDrilldownModal] = useState<{ title: string; subtitle: string; list: ProgramItem[] } | null>(null);

  const availableYears = useMemo(() => {
    const set = new Set<string>([String(getCurrentFinanceYear())]);
    programs.forEach((p) => {
      set.add(String(getProgramYear(p)));
    });
    (fasaPeruntukanList || []).forEach((f) => {
      set.add(String(getFasaYear(f)));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [programs, fasaPeruntukanList]);

  const computeStats = (rawList: ProgramItem[]): GroupStats => {
    const list = deduplicateProgramsByCode(rawList);
    const selesai = list.filter((p) => p.statusProgram === 'SELESAI').length;
    const dalamTindakan = list.filter((p) => p.statusProgram === 'DALAM TINDAKAN').length;
    const tanggung = list.filter((p) => p.statusProgram === 'TANGGUNG').length;
    const belum = list.filter((p) => p.statusProgram === 'BELUM AMBIL TINDAKAN').length;
    const batal = list.filter((p) => p.statusProgram === 'BATAL').length;
    const peserta = list.reduce((sum, p) => sum + (Number(p.bilanganPeserta) || 0), 0);
    const hari = list.reduce((sum, p) => sum + (Number(p.jumlahHari) || 0), 0);
    const fin = getProgramFinanceAggregate(list, true);
    const activeTotal = Math.max(0, list.length - batal);
    const successRate = activeTotal > 0 ? Math.round((selesai / activeTotal) * 100) : 0;
    return {
      totalPrograms: list.length,
      selesai,
      dalamTindakan,
      tanggung,
      belum,
      batal,
      peserta,
      hari,
      peruntukanDiagihkan: fin.diagihkan.total,
      belanja: fin.belanja.total,
      penjimatan: fin.penjimatan.total,
      successRate,
    };
  };

  // Year-filtered programs (deduplicated by Kod Program)
  const yearPrograms = useMemo(
    () =>
      deduplicateProgramsByCode(
        programs.filter((p) => filterTahun === 'SEMUA' || String(getProgramYear(p)) === filterTahun)
      ),
    [programs, filterTahun]
  );

  // Active Klusters (plus unmapped if any pusat isn't in klusterMap)
  const effectiveKlusters = useMemo(() => {
    const list = [...klusterList];
    return filterKluster === 'SEMUA' ? list : list.filter((k) => k === filterKluster);
  }, [klusterList, filterKluster]);

  // Helper to get Pusats belonging to a Kluster
  const getPusatsForKluster = (klusterName: string) =>
    (klusterMap[klusterName] || []).filter((p) => pusatList.includes(p));

  // Metrics per Kluster
  const klusterMetrics = useMemo(() => {
    return effectiveKlusters.map((klu) => {
      const pusats = getPusatsForKluster(klu);
      const pusSet = new Set(pusats);
      const jabs: string[] = [];
      pusats.forEach((p) => {
        (jabatanMap[p] || []).forEach((j) => {
          if (j && j !== 'SEMUA JABATAN' && !jabs.includes(j)) jabs.push(j);
        });
      });
      const jabSet = new Set(jabs);
      const kluUpper = klu.trim().toUpperCase();
      const progs = yearPrograms.filter(
        (p) =>
          pusSet.has(p.pusat) ||
          jabSet.has(p.jabatan) ||
          (p.kluster || '').trim().toUpperCase() === kluUpper
      );
      const pegs = pegawaiList.filter((peg) => pusSet.has(peg.pusat || '') || jabSet.has(peg.jabatan || ''));
      const diluluskanStats = getPeruntukanDiluluskanStats(
        fasaPeruntukanList,
        sumberKewanganList,
        pusats,
        filterTahun === 'SEMUA' ? 'SEMUA' : filterTahun
      );
      return {
        kluster: klu,
        pusats,
        jabatanCount: jabs.length,
        pegawaiCount: pegs.length,
        programs: progs,
        peruntukanDiluluskan: diluluskanStats.overall.total,
        ...computeStats(progs),
      };
    });
  }, [effectiveKlusters, klusterMap, pusatList, jabatanMap, yearPrograms, pegawaiList, fasaPeruntukanList, sumberKewanganList, filterTahun]);

  // Metrics per Pusat across selected Klusters
  const pusatMetrics = useMemo(() => {
    const rows: Array<
      GroupStats & {
        kluster: string;
        pusat: string;
        jabatanCount: number;
        pegawaiCount: number;
        peruntukanDiluluskan: number;
        programs: ProgramItem[];
      }
    > = [];
    effectiveKlusters.forEach((klu) => {
      getPusatsForKluster(klu).forEach((pus) => {
        const jabs = (jabatanMap[pus] || []).filter((j) => j && j !== 'SEMUA JABATAN');
        const jabSet = new Set(jabs);
        const progs = yearPrograms.filter((p) => p.pusat === pus || jabSet.has(p.jabatan));
        const pegs = pegawaiList.filter((peg) => peg.pusat === pus || jabSet.has(peg.jabatan || ''));
        const diluluskanStats = getPeruntukanDiluluskanStats(
          fasaPeruntukanList,
          sumberKewanganList,
          [pus],
          filterTahun === 'SEMUA' ? 'SEMUA' : filterTahun
        );
        rows.push({
          kluster: klu,
          pusat: pus,
          jabatanCount: jabs.length,
          pegawaiCount: pegs.length,
          programs: progs,
          peruntukanDiluluskan: diluluskanStats.overall.total,
          ...computeStats(progs),
        });
      });
    });
    // Include any unmapped pusat when filterKluster === 'SEMUA'
    if (filterKluster === 'SEMUA') {
      pusatList.forEach((pus) => {
        if (!getKlusterForPusat(pus)) {
          const jabs = (jabatanMap[pus] || []).filter((j) => j && j !== 'SEMUA JABATAN');
          const jabSet = new Set(jabs);
          const progs = yearPrograms.filter((p) => p.pusat === pus || jabSet.has(p.jabatan));
          const pegs = pegawaiList.filter((peg) => peg.pusat === pus || jabSet.has(peg.jabatan || ''));
          const diluluskanStats = getPeruntukanDiluluskanStats(
            fasaPeruntukanList,
            sumberKewanganList,
            [pus],
            filterTahun === 'SEMUA' ? 'SEMUA' : filterTahun
          );
          rows.push({
            kluster: 'BELUM DITETAPKAN',
            pusat: pus,
            jabatanCount: jabs.length,
            pegawaiCount: pegs.length,
            programs: progs,
            peruntukanDiluluskan: diluluskanStats.overall.total,
            ...computeStats(progs),
          });
        }
      });
    }
    return rows;
  }, [effectiveKlusters, klusterMap, pusatList, jabatanMap, yearPrograms, pegawaiList, filterKluster, getKlusterForPusat, fasaPeruntukanList, sumberKewanganList, filterTahun]);

  // Metrics per Jabatan across selected Klusters
  const jabatanMetrics = useMemo(() => {
    const rows: Array<
      GroupStats & {
        kluster: string;
        pusat: string;
        jabatan: string;
        pegawaiCount: number;
        programs: ProgramItem[];
      }
    > = [];
    pusatMetrics.forEach((pm) => {
      const jabs = (jabatanMap[pm.pusat] || []).filter((j) => j && j !== 'SEMUA JABATAN');
      jabs.forEach((jab) => {
        const progs = yearPrograms.filter((p) => p.jabatan === jab);
        const pegs = pegawaiList.filter((peg) => peg.jabatan === jab);
        rows.push({
          kluster: pm.kluster,
          pusat: pm.pusat,
          jabatan: jab,
          pegawaiCount: pegs.length,
          programs: progs,
          ...computeStats(progs),
        });
      });
    });
    return rows;
  }, [pusatMetrics, jabatanMap, yearPrograms, pegawaiList]);

  // Grand Totals for IAB All
  const grandTotals = useMemo(() => {
    const scopedPrograms =
      filterKluster === 'SEMUA'
        ? yearPrograms
        : yearPrograms.filter(
            (p) =>
              (p.kluster || '').trim().toUpperCase() === filterKluster.trim().toUpperCase() ||
              pusatMetrics.some(
                (pm) => pm.pusat === p.pusat || (jabatanMap[pm.pusat] || []).includes(p.jabatan)
              )
          );
    const stats = computeStats(scopedPrograms);
    const targetPusatsForDiluluskan =
      filterKluster === 'SEMUA' ? null : pusatMetrics.map((pm) => pm.pusat);
    const diluluskanStats = getPeruntukanDiluluskanStats(
      fasaPeruntukanList,
      sumberKewanganList,
      targetPusatsForDiluluskan,
      filterTahun === 'SEMUA' ? 'SEMUA' : filterTahun
    );
    return {
      ...stats,
      peruntukanDiluluskan: diluluskanStats.overall.total,
      klusterCount: effectiveKlusters.length,
      pusatCount: pusatMetrics.length,
      jabatanCount: jabatanMetrics.length,
      pegawaiCount:
        filterKluster === 'SEMUA'
          ? pegawaiList.length
          : pegawaiList.filter((peg) =>
              pusatMetrics.some(
                (pm) => pm.pusat === peg.pusat || (jabatanMap[pm.pusat] || []).includes(peg.jabatan || '')
              )
            ).length,
    };
  }, [filterKluster, yearPrograms, pusatMetrics, jabatanMap, effectiveKlusters.length, jabatanMetrics.length, pegawaiList, fasaPeruntukanList, sumberKewanganList, filterTahun]);

  // Pegawai rows by Kluster
  const officerRows = useMemo(() => {
    const rows = pegawaiList
      .map((peg) => {
        const klu = getKlusterForPusat(peg.pusat || '') || 'TIDAK BERKENAAN';
        const pegProgs = yearPrograms.filter(
          (p) =>
            p.pengurusId === peg.id ||
            p.pengurusBersamaId === peg.id ||
            p.pengurusNama === peg.nama ||
            p.pengurusBersamaNama === peg.nama
        );
        return {
          pegawai: peg,
          kluster: klu,
          programs: pegProgs,
          ...computeStats(pegProgs),
        };
      })
      .filter((r) => filterKluster === 'SEMUA' || r.kluster === filterKluster)
      .filter((r) => officerKlusterFilter === 'SEMUA' || r.kluster === officerKlusterFilter)
      .filter((r) => {
        if (!officerSearch.trim()) return true;
        const q = officerSearch.toLowerCase();
        return (
          r.pegawai.nama.toLowerCase().includes(q) ||
          r.pegawai.id.toLowerCase().includes(q) ||
          r.kluster.toLowerCase().includes(q) ||
          (r.pegawai.pusat || '').toLowerCase().includes(q) ||
          (r.pegawai.jabatan || '').toLowerCase().includes(q)
        );
      });

    rows.sort((a, b) => {
      let cmp = 0;
      if (officerSortKey === 'nama') cmp = a.pegawai.nama.localeCompare(b.pegawai.nama);
      else if (officerSortKey === 'kluster') cmp = a.kluster.localeCompare(b.kluster);
      else if (officerSortKey === 'pusat') cmp = (a.pegawai.pusat || '').localeCompare(b.pegawai.pusat || '');
      else if (officerSortKey === 'jabatan') cmp = (a.pegawai.jabatan || '').localeCompare(b.pegawai.jabatan || '');
      else if (officerSortKey === 'total') cmp = a.totalPrograms - b.totalPrograms;
      else if (officerSortKey === 'selesai') cmp = a.selesai - b.selesai;
      else if (officerSortKey === 'peruntukan') cmp = a.peruntukanDiagihkan - b.peruntukanDiagihkan;
      return officerSortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [pegawaiList, getKlusterForPusat, yearPrograms, filterKluster, officerKlusterFilter, officerSearch, officerSortKey, officerSortDir]);

  const handleSortOfficer = (key: typeof officerSortKey) => {
    if (officerSortKey === key) {
      setOfficerSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOfficerSortKey(key);
      setOfficerSortDir(['nama', 'kluster', 'pusat', 'jabatan'].includes(key) ? 'asc' : 'desc');
    }
  };

  const comparisonItems = useMemo(() => {
    if (comparisonLevel === 'kluster') {
      return klusterMetrics.map((k) => ({
        label: k.kluster,
        sub: `${k.pusats.length} Pusat · ${k.jabatanCount} Jabatan`,
        ...k,
      }));
    }
    if (comparisonLevel === 'pusat') {
      return pusatMetrics.map((p) => ({
        label: p.pusat,
        sub: p.kluster,
        ...p,
      }));
    }
    return jabatanMetrics.map((j) => ({
      label: j.jabatan,
      sub: `${j.pusat} (${j.kluster})`,
      peruntukanDiluluskan: null as number | null,
      ...j,
    }));
  }, [comparisonLevel, klusterMetrics, pusatMetrics, jabatanMetrics]);

  const maxCompProg = useMemo(() => Math.max(1, ...comparisonItems.map((c) => c.totalPrograms)), [comparisonItems]);
  const maxCompBudget = useMemo(
    () =>
      Math.max(
        1,
        ...comparisonItems.map((c) =>
          Math.max(c.peruntukanDiluluskan || 0, c.peruntukanDiagihkan, c.belanja)
        )
      ),
    [comparisonItems]
  );

  const handleExportIabAllExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        klusterMetrics.map((k, i) => ({
          Bil: i + 1,
          'Nama Kluster': k.kluster,
          'Bil. Pusat': k.pusats.length,
          'Bil. Jabatan': k.jabatanCount,
          'Bil. Pegawai': k.pegawaiCount,
          'Jumlah Program': k.totalPrograms,
          Selesai: k.selesai,
          'Dalam Tindakan': k.dalamTindakan,
          Tanggung: k.tanggung,
          'Belum Tindakan': k.belum,
          Batal: k.batal,
          'Jumlah Peserta': k.peserta,
          'Peruntukan Diluluskan (RM)': k.peruntukanDiluluskan,
          'Peruntukan Diagihkan (RM)': k.peruntukanDiagihkan,
          'Belanja (RM)': k.belanja,
          'Penjimatan (RM)': k.penjimatan,
          'Kadar Selesai (%)': `${k.successRate}%`,
        }))
      ),
      'Rumusan Kluster'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        pusatMetrics.map((p, i) => ({
          Bil: i + 1,
          Kluster: p.kluster,
          'Nama Pusat': p.pusat,
          'Bil. Jabatan': p.jabatanCount,
          'Bil. Pegawai': p.pegawaiCount,
          'Jumlah Program': p.totalPrograms,
          Selesai: p.selesai,
          'Dalam Tindakan': p.dalamTindakan,
          Tanggung: p.tanggung,
          'Belum Tindakan': p.belum,
          Batal: p.batal,
          'Jumlah Peserta': p.peserta,
          'Peruntukan Diluluskan (RM)': p.peruntukanDiluluskan,
          'Peruntukan Diagihkan (RM)': p.peruntukanDiagihkan,
          'Belanja (RM)': p.belanja,
          'Penjimatan (RM)': p.penjimatan,
          'Kadar Selesai (%)': `${p.successRate}%`,
        }))
      ),
      'Rumusan Pusat'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        jabatanMetrics.map((j, i) => ({
          Bil: i + 1,
          Kluster: j.kluster,
          Pusat: j.pusat,
          'Nama Jabatan': j.jabatan,
          'Bil. Pegawai': j.pegawaiCount,
          'Jumlah Program': j.totalPrograms,
          Selesai: j.selesai,
          'Dalam Tindakan': j.dalamTindakan,
          Tanggung: j.tanggung,
          'Belum Tindakan': j.belum,
          Batal: j.batal,
          'Jumlah Peserta': j.peserta,
          'Peruntukan Diagihkan (RM)': j.peruntukanDiagihkan,
          'Belanja (RM)': j.belanja,
          'Penjimatan (RM)': j.penjimatan,
          'Kadar Selesai (%)': `${j.successRate}%`,
        }))
      ),
      'Rumusan Jabatan'
    );
    XLSX.writeFile(wb, `RUMUSAN_IAB_ALL_${new Date().toISOString().slice(0, 10)}.xlsx`);
    logActivity({
      action_type: 'EXPORT',
      module_name: 'Page IAB All',
      activity_description: `Exported IAB All summary (${klusterMetrics.length} clusters, ${pusatMetrics.length} pusat) to Excel`,
      record_id: 'RUMUSAN_IAB_ALL',
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
            Halaman IAB All (Semua Kluster)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            {currentUser
              ? 'Akaun anda tidak mempunyai kebenaran untuk memaparkan Halaman IAB All. Sila hubungi Super Admin untuk menetapkan kebenaran dalam KEBENARAN VIEW/PAPAR PAGE.'
              : 'Halaman ini memerlukan log masuk pengguna. Sila log masuk melalui Portal Admin.'}
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
      {/* HERO & KAWALAN TAPISAN IAB ALL                                    */}
      {/* ================================================================= */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-600/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded">
                  Keseluruhan Institut Aminuddin Baki
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">
                  {isSuperAdmin ? 'Akses Penuh Super Admin' : pageMode === 'edit' ? 'Akses Edit' : 'Mod Paparan Sahaja'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 uppercase">
                IAB ALL — SEMUA KLUSTER, PUSAT &amp; JABATAN
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Integrasi keseluruhan Kluster IAB, Pusat, Jabatan, Pegawai, Infografik, Perbandingan dan Rumusan Pelaksanaan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tahun Program
              </label>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg"
              >
                <option value="SEMUA">SEMUA TAHUN</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tapis Kluster IAB
              </label>
              <select
                value={filterKluster}
                onChange={(e) => setFilterKluster(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg max-w-xs"
              >
                <option value="SEMUA">SEMUA KLUSTER ({klusterList.length})</option>
                {klusterList.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 pt-4 border-t border-slate-800 tabular-nums">
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-indigo-300">Kluster</div>
            <div className="text-xl font-black text-white mt-0.5">{grandTotals.klusterCount}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Pusat</div>
            <div className="text-xl font-black text-white mt-0.5">{grandTotals.pusatCount}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Jabatan</div>
            <div className="text-xl font-black text-blue-300 mt-0.5">{grandTotals.jabatanCount}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Pegawai</div>
            <div className="text-xl font-black text-teal-300 mt-0.5">{grandTotals.pegawaiCount}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Program</div>
            <div className="text-xl font-black text-white mt-0.5">{grandTotals.totalPrograms}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-emerald-400">Selesai</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              {grandTotals.selesai} <span className="text-[11px] text-slate-400">({grandTotals.successRate}%)</span>
            </div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-purple-700/50">
            <div className="text-[10px] font-bold uppercase text-purple-300">Peruntukan Diluluskan</div>
            <div className="text-xs font-black text-purple-200 mt-1">RM {formatRM(grandTotals.peruntukanDiluluskan)}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-amber-300">Peruntukan Diagihkan</div>
            <div className="text-xs font-black text-amber-200 mt-1">RM {formatRM(grandTotals.peruntukanDiagihkan)}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-sky-300">Belanja</div>
            <div className="text-xs font-black text-sky-200 mt-1">RM {formatRM(grandTotals.belanja)}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-emerald-300">Penjimatan</div>
            <div className="text-xs font-black text-emerald-200 mt-1">RM {formatRM(grandTotals.penjimatan)}</div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 1. NAMA SEMUA KLUSTER                                             */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
            Seksyen 1
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            1. Nama Semua Kluster (Data Induk Kluster IAB)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 tabular-nums">
          {klusterMetrics.map((km) => (
            <div
              key={km.kluster}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase">{km.kluster}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {km.pusats.length} Pusat · {km.jabatanCount} Jabatan · {km.pegawaiCount} Pegawai
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDrilldownModal({
                      title: km.kluster,
                      subtitle: `${km.totalPrograms} program di bawah kluster ini`,
                      list: km.programs,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{km.totalPrograms} Program</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Peruntukan Diluluskan</span>
                  <span className="font-bold text-purple-950">RM {formatRM(km.peruntukanDiluluskan)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Peruntukan Diagihkan</span>
                  <span className="font-bold text-slate-900">RM {formatRM(km.peruntukanDiagihkan)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Belanja</span>
                  <span className="font-bold text-blue-700">RM {formatRM(km.belanja)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Penjimatan</span>
                  <span className="font-bold text-emerald-700">RM {formatRM(km.penjimatan)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. NAMA SEMUA PUSAT DI BAWAH KLUSTER                              */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
            Seksyen 2
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            2. Nama Semua Pusat di bawah Kluster
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 tabular-nums">
          {pusatMetrics.map((pm) => (
            <div key={pm.pusat} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                    {pm.kluster}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 uppercase mt-1.5">{pm.pusat}</h4>
                </div>
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 shrink-0">
                  {pm.totalPrograms} Prog
                </span>
              </div>
              <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                <span><strong>{pm.jabatanCount}</strong> Jabatan</span>
                <span><strong>{pm.pegawaiCount}</strong> Pegawai</span>
                <span><strong>{pm.peserta}</strong> Peserta</span>
                <span>Selesai: <strong className="text-emerald-700">{pm.successRate}%</strong></span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Diluluskan</span>
                  <span className="font-bold text-purple-950">RM {formatRM(pm.peruntukanDiluluskan)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Diagihkan</span>
                  <span className="font-bold text-slate-900">RM {formatRM(pm.peruntukanDiagihkan)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Belanja</span>
                  <span className="font-bold text-blue-700">RM {formatRM(pm.belanja)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Penjimatan</span>
                  <span className="font-bold text-emerald-700">RM {formatRM(pm.penjimatan)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. NAMA-NAMA JABATAN DI BAWAH PUSAT (SEMUA KLUSTER)               */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded">
            Seksyen 3
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            3. Nama-Nama Jabatan di bawah Pusat (Semua Kluster)
          </h3>
        </div>
        <div className="space-y-4">
          {pusatMetrics.map((pm) => {
            const jabs = jabatanMetrics.filter((j) => j.pusat === pm.pusat);
            return (
              <div key={pm.pusat} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span>{pm.pusat}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {pm.kluster}
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 tabular-nums">
                  {jabs.map((jm) => (
                    <div key={jm.jabatan} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">{jm.jabatan}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDrilldownModal({
                              title: jm.jabatan,
                              subtitle: `${pm.pusat} · ${pm.kluster}`,
                              list: jm.programs,
                            })
                          }
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 cursor-pointer shrink-0"
                        >
                          {jm.totalPrograms} Prog
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>{jm.pegawaiCount} Pegawai · {jm.selesai} Selesai</span>
                        <span className="font-bold text-slate-900" title="Peruntukan Diagihkan (BK65)">
                          RM {formatRM(jm.peruntukanDiagihkan)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. PEGAWAI-PEGAWAI DI BAWAH PUSAT MENGIKUT KLUSTER                */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
              Seksyen 4
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              4. Pegawai-Pegawai di bawah Pusat Mengikut Kluster
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pegawai, ID, pusat..."
                value={officerSearch}
                onChange={(e) => setOfficerSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <select
              value={officerKlusterFilter}
              onChange={(e) => setOfficerKlusterFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white max-w-xs"
            >
              <option value="SEMUA">Semua Kluster</option>
              {klusterList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 select-none">
                <th className="py-2.5 px-3 w-12 text-center">Bil</th>
                <th onClick={() => handleSortOfficer('nama')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200">
                  <div className="flex items-center gap-1">
                    <span>Nama Pegawai</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSortOfficer('kluster')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200">
                  Kluster
                </th>
                <th onClick={() => handleSortOfficer('pusat')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200">
                  Pusat
                </th>
                <th onClick={() => handleSortOfficer('jabatan')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200">
                  Jabatan
                </th>
                <th onClick={() => handleSortOfficer('total')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200">
                  Program
                </th>
                <th onClick={() => handleSortOfficer('selesai')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200">
                  Selesai
                </th>
                <th onClick={() => handleSortOfficer('peruntukan')} className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200">
                  Peruntukan Diagihkan (RM)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {officerRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tiada rekod pegawai ditemui.
                  </td>
                </tr>
              ) : (
                officerRows.map((row, idx) => (
                  <tr key={row.pegawai.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{row.pegawai.nama}</div>
                      <div className="text-[10px] font-mono text-slate-500">{row.pegawai.id} · {row.pegawai.jawatan}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {row.kluster}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-700 max-w-[180px]">{row.pegawai.pusat || '-'}</td>
                    <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-800 max-w-[180px]">{row.pegawai.jabatan || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDrilldownModal({
                            title: `Program: ${row.pegawai.nama}`,
                            subtitle: `${row.kluster} · ${row.pegawai.pusat || ''}`,
                            list: row.programs,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold hover:bg-blue-100 cursor-pointer"
                      >
                        {row.totalPrograms}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{row.selesai}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">RM {formatRM(row.peruntukanDiagihkan)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. VISUALISASI & INFOGRAFIK SETIAP KLUSTER, PUSAT DAN JABATAN     */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded">
            Seksyen 5
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            5. Visualisasi dan Infografik Setiap Kluster, Pusat dan Jabatan
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 tabular-nums">
          {/* Kluster Visuals */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Mengikut Kluster</h4>
            </div>
            <div className="space-y-3.5">
              {klusterMetrics.map((km) => {
                const total = Math.max(1, km.totalPrograms);
                return (
                  <div key={km.kluster} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate">{km.kluster}</span>
                      <span className="font-mono font-bold text-indigo-700">{km.totalPrograms} Prog</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      {km.selesai > 0 && <div style={{ width: `${(km.selesai / total) * 100}%` }} className="bg-emerald-500" />}
                      {km.dalamTindakan > 0 && <div style={{ width: `${(km.dalamTindakan / total) * 100}%` }} className="bg-amber-400" />}
                      {km.tanggung > 0 && <div style={{ width: `${(km.tanggung / total) * 100}%` }} className="bg-purple-500" />}
                      {km.belum > 0 && <div style={{ width: `${(km.belum / total) * 100}%` }} className="bg-slate-400" />}
                      {km.batal > 0 && <div style={{ width: `${(km.batal / total) * 100}%` }} className="bg-rose-500" />}
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>Diluluskan: <strong className="text-purple-900">RM {formatRM(km.peruntukanDiluluskan)}</strong></span>
                      <span>Diagihkan: <strong className="text-slate-900">RM {formatRM(km.peruntukanDiagihkan)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pusat Visuals */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <PieChart className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Mengikut Pusat</h4>
            </div>
            <div className="space-y-3.5">
              {pusatMetrics.map((pm) => {
                const total = Math.max(1, pm.totalPrograms);
                return (
                  <div key={pm.pusat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate" title={pm.pusat}>{pm.pusat}</span>
                      <span className="font-mono font-bold text-blue-700 shrink-0">{pm.totalPrograms} Prog</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      {pm.selesai > 0 && <div style={{ width: `${(pm.selesai / total) * 100}%` }} className="bg-emerald-500" />}
                      {pm.dalamTindakan > 0 && <div style={{ width: `${(pm.dalamTindakan / total) * 100}%` }} className="bg-amber-400" />}
                      {pm.tanggung > 0 && <div style={{ width: `${(pm.tanggung / total) * 100}%` }} className="bg-purple-500" />}
                      {pm.belum > 0 && <div style={{ width: `${(pm.belum / total) * 100}%` }} className="bg-slate-400" />}
                      {pm.batal > 0 && <div style={{ width: `${(pm.batal / total) * 100}%` }} className="bg-rose-500" />}
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>Diluluskan: <strong className="text-purple-900">RM {formatRM(pm.peruntukanDiluluskan)}</strong></span>
                      <span>Diagihkan: <strong className="text-slate-900">RM {formatRM(pm.peruntukanDiagihkan)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jabatan Visuals */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-900">Mengikut Jabatan</h4>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {jabatanMetrics.map((jm) => {
                const maxJ = Math.max(1, ...jabatanMetrics.map((x) => x.totalPrograms));
                return (
                  <div key={jm.jabatan} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 truncate" title={jm.jabatan}>{jm.jabatan}</span>
                      <span className="font-mono font-bold text-teal-700 shrink-0">{jm.totalPrograms}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${Math.round((jm.totalPrograms / maxJ) * 100)}%` }} className="h-full bg-teal-600 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. VISUALISASI COMPARISON SETIAP KLUSTER, PUSAT DAN JABATAN       */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
              Seksyen 6
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              6. Visualisasi Comparison Setiap Kluster, Pusat dan Jabatan
            </h3>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start">
            {(['kluster', 'pusat', 'jabatan'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setComparisonLevel(lvl)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors cursor-pointer ${
                  comparisonLevel === lvl ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl === 'kluster' ? 'Kluster' : lvl === 'pusat' ? 'Pusat' : 'Jabatan'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 tabular-nums">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span>
                {comparisonLevel === 'jabatan'
                  ? 'Perbandingan Peruntukan Diagihkan vs Belanja (RM)'
                  : 'Perbandingan Peruntukan Diluluskan, Peruntukan Diagihkan vs Belanja (RM)'}
              </span>
            </h4>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {comparisonItems.map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 truncate" title={item.label}>{item.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{item.sub}</div>
                  {item.peruntukanDiluluskan !== null && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-20 text-purple-700 font-semibold">Diluluskan</span>
                      <div className="flex-1 h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
                        <div style={{ width: `${Math.round((item.peruntukanDiluluskan / maxCompBudget) * 100)}%` }} className="h-full bg-purple-600" />
                      </div>
                      <span className="w-24 text-right font-bold text-purple-900">RM {formatRM(item.peruntukanDiluluskan)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-20 text-slate-500 font-semibold">Diagihkan</span>
                    <div className="flex-1 h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
                      <div style={{ width: `${Math.round((item.peruntukanDiagihkan / maxCompBudget) * 100)}%` }} className="h-full bg-blue-600" />
                    </div>
                    <span className="w-24 text-right font-bold">RM {formatRM(item.peruntukanDiagihkan)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-20 text-slate-500 font-semibold">Belanja</span>
                    <div className="flex-1 h-2 bg-white rounded-full border border-slate-200 overflow-hidden">
                      <div style={{ width: `${Math.round((item.belanja / maxCompBudget) * 100)}%` }} className="h-full bg-emerald-600" />
                    </div>
                    <span className="w-24 text-right font-bold text-emerald-700">RM {formatRM(item.belanja)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Perbandingan Bilangan Program, Peserta &amp; Kadar Selesai</span>
            </h4>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {comparisonItems.map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate" title={item.label}>{item.label}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                      {item.successRate}% Selesai
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <div className="flex-1 h-2.5 bg-white rounded-full border border-slate-200 overflow-hidden">
                      <div style={{ width: `${Math.round((item.totalPrograms / maxCompProg) * 100)}%` }} className="h-full bg-indigo-600 rounded-full" />
                    </div>
                    <span className="font-bold text-slate-800 shrink-0">
                      {item.totalPrograms} Prog · {item.peserta} Peserta
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 7. RUMUSAN SETIAP KLUSTER, PUSAT, JABATAN BY STATUS & KEWANGAN    */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
              Seksyen 7
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              7. Rumusan Setiap Kluster, Pusat &amp; Jabatan Mengikut Status Program &amp; Peruntukan
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              {(['kluster', 'pusat', 'jabatan'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setRumusanLevel(lvl)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    rumusanLevel === lvl ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl === 'kluster' ? 'Kluster' : lvl === 'pusat' ? 'Pusat' : 'Jabatan'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExportIabAllExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Eksport Excel</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">
                  {rumusanLevel === 'kluster' ? 'Nama Kluster' : rumusanLevel === 'pusat' ? 'Nama Pusat (Kluster)' : 'Nama Jabatan (Pusat)'}
                </th>
                <th className="py-2.5 px-2 text-center">Peg</th>
                <th className="py-2.5 px-2 text-center">Prog</th>
                <th className="py-2.5 px-2 text-center text-emerald-700">Selesai</th>
                <th className="py-2.5 px-2 text-center text-amber-700">Tindakan</th>
                <th className="py-2.5 px-2 text-center text-purple-700">Tanggung</th>
                <th className="py-2.5 px-2 text-center text-slate-600">Belum</th>
                <th className="py-2.5 px-2 text-center text-rose-700">Batal</th>
                <th className="py-2.5 px-2 text-right">Peserta</th>
                {rumusanLevel !== 'jabatan' && (
                  <th className="py-2.5 px-3 text-right text-purple-800">Peruntukan Diluluskan (RM)</th>
                )}
                <th className="py-2.5 px-3 text-right">Peruntukan Diagihkan (RM)</th>
                <th className="py-2.5 px-3 text-right">Belanja (RM)</th>
                <th className="py-2.5 px-3 text-right">Penjimatan (RM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(rumusanLevel === 'kluster'
                ? klusterMetrics.map((k) => ({ key: k.kluster, title: k.kluster, sub: `${k.pusats.length} Pusat · ${k.jabatanCount} Jabatan`, diluluskan: k.peruntukanDiluluskan, ...k }))
                : rumusanLevel === 'pusat'
                ? pusatMetrics.map((p) => ({ key: p.pusat, title: p.pusat, sub: p.kluster, diluluskan: p.peruntukanDiluluskan, ...p }))
                : jabatanMetrics.map((j) => ({ key: j.jabatan, title: j.jabatan, sub: `${j.pusat} · ${j.kluster}`, diluluskan: 0, ...j }))
              ).map((r) => (
                <tr key={r.key} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{r.title}</div>
                    <div className="text-[10px] text-slate-500">{r.sub}</div>
                  </td>
                  <td className="py-2.5 px-2 text-center">{r.pegawaiCount}</td>
                  <td className="py-2.5 px-2 text-center font-black">{r.totalPrograms}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-emerald-700">{r.selesai}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-amber-700">{r.dalamTindakan}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-purple-700">{r.tanggung}</td>
                  <td className="py-2.5 px-2 text-center">{r.belum}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-rose-600">{r.batal}</td>
                  <td className="py-2.5 px-2 text-right">{r.peserta}</td>
                  {rumusanLevel !== 'jabatan' && (
                    <td className="py-2.5 px-3 text-right font-semibold text-purple-800">{formatRM(r.diluluskan)}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-semibold">{formatRM(r.peruntukanDiagihkan)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-blue-700">{formatRM(r.belanja)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{formatRM(r.penjimatan)}</td>
                </tr>
              ))}
              <tr className="bg-slate-900 text-white font-black">
                <td className="py-3 px-3">JUMLAH KESELURUHAN IAB</td>
                <td className="py-3 px-2 text-center">{grandTotals.pegawaiCount}</td>
                <td className="py-3 px-2 text-center">{grandTotals.totalPrograms}</td>
                <td className="py-3 px-2 text-center text-emerald-300">{grandTotals.selesai}</td>
                <td className="py-3 px-2 text-center text-amber-300">{grandTotals.dalamTindakan}</td>
                <td className="py-3 px-2 text-center text-purple-300">{grandTotals.tanggung}</td>
                <td className="py-3 px-2 text-center">{grandTotals.belum}</td>
                <td className="py-3 px-2 text-center text-rose-300">{grandTotals.batal}</td>
                <td className="py-3 px-2 text-right">{grandTotals.peserta}</td>
                {rumusanLevel !== 'jabatan' && (
                  <td className="py-3 px-3 text-right text-purple-300">{formatRM(grandTotals.peruntukanDiluluskan)}</td>
                )}
                <td className="py-3 px-3 text-right text-amber-300">{formatRM(grandTotals.peruntukanDiagihkan)}</td>
                <td className="py-3 px-3 text-right text-sky-300">{formatRM(grandTotals.belanja)}</td>
                <td className="py-3 px-3 text-right text-emerald-300">{formatRM(grandTotals.penjimatan)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Drill-down Modal */}
      {drilldownModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDrilldownModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold">{drilldownModal.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5">{drilldownModal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto divide-y divide-slate-100 text-xs">
              {drilldownModal.list.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  Tiada program direkodkan bagi pilihan ini.
                </div>
              ) : (
                drilldownModal.list.map((prog) => {
                  const st = getStatusConfig(prog.statusProgram);
                  return (
                    <div
                      key={prog.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                            {prog.kodProgram}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${st.badgeBg}`}>
                            {prog.statusProgram}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mt-1">{prog.namaProgram}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {prog.jabatan} · {prog.tempoh} · Pengurus: {prog.pengurusNama}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right tabular-nums">
                          <div className="font-bold text-slate-900">RM {formatRM(prog.jumlahRm)}</div>
                          <div className="text-[10px] text-slate-500">{prog.bilanganPeserta} Peserta</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDrilldownModal(null);
                            viewProgramDetail(prog);
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                        >
                          Perincian
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
