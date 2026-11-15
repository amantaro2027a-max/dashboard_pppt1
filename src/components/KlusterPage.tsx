import React, { useMemo, useState } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem, Pegawai } from '../types/program';
import { formatRM, getStatusConfig } from '../utils/formatters';
import * as XLSX from 'xlsx';
import {
  Layers,
  Landmark,
  Briefcase,
  Users,
  BarChart3,
  PieChart,
  TrendingUp,
  CheckCircle2,
  Clock,
  PauseCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Wallet,
  CreditCard,
  PiggyBank,
  Search,
  Download,
  Lock,
  ShieldAlert,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface KlusterPageProps {
  targetKlusterKey: 'KLUSTER KHIDMAT PROFESIONAL' | 'KLUSTER KHIDMAT LATIHAN';
}

interface PusatMetric {
  pusat: string;
  jabatanCount: number;
  pegawaiCount: number;
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
}

interface JabatanMetric {
  pusat: string;
  jabatan: string;
  pegawaiCount: number;
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
}

export const KlusterPage: React.FC<KlusterPageProps> = ({ targetKlusterKey }) => {
  const {
    currentUser,
    isSuperAdmin,
    getPageAccessMode,
    setActiveTab,
    klusterList,
    klusterMap,
    pusatList,
    jabatanMap,
    pegawaiList,
    programs,
    viewProgramDetail,
    logActivity,
  } = useProgramContext();

  const pageMode = getPageAccessMode(targetKlusterKey);
  const canAccess = Boolean(currentUser) && (isSuperAdmin || pageMode !== 'none');

  // Resolve Kluster name dynamically from Master Data (tab Kluster IAB)
  const resolvedKlusterName = useMemo(() => {
    const exact = klusterList.find(
      (k) => k.trim().toUpperCase() === targetKlusterKey.trim().toUpperCase()
    );
    if (exact) return exact;
    const partial = klusterList.find((k) =>
      targetKlusterKey.includes('PROFESIONAL')
        ? k.toUpperCase().includes('PROFESIONAL')
        : k.toUpperCase().includes('LATIHAN')
    );
    return partial || targetKlusterKey;
  }, [klusterList, targetKlusterKey]);

  // Pusats mapped under this Kluster (from klusterMap)
  const pusatsUnderKluster = useMemo(() => {
    const mapped = klusterMap[resolvedKlusterName] || klusterMap[targetKlusterKey] || [];
    return mapped.filter((p) => pusatList.includes(p));
  }, [klusterMap, resolvedKlusterName, targetKlusterKey, pusatList]);

  // Filters
  const [filterTahun, setFilterTahun] = useState<string>('SEMUA');
  const [selectedPusatFilter, setSelectedPusatFilter] = useState<string>('SEMUA');
  const [officerSearch, setOfficerSearch] = useState('');
  const [officerPusatFilter, setOfficerPusatFilter] = useState('SEMUA');
  const [officerSortKey, setOfficerSortKey] = useState<'nama' | 'pusat' | 'jabatan' | 'total' | 'selesai' | 'peruntukan'>('total');
  const [officerSortDir, setOfficerSortDir] = useState<'asc' | 'desc'>('desc');
  const [comparisonTarget, setComparisonTarget] = useState<'pusat' | 'jabatan'>('pusat');
  const [drilldownModal, setDrilldownModal] = useState<{ title: string; subtitle: string; list: ProgramItem[] } | null>(null);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    programs.forEach((p) => {
      if (p.tahun) set.add(String(p.tahun));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [programs]);

  const effectivePusats = useMemo(() => {
    if (selectedPusatFilter !== 'SEMUA' && pusatsUnderKluster.includes(selectedPusatFilter)) {
      return [selectedPusatFilter];
    }
    return pusatsUnderKluster;
  }, [pusatsUnderKluster, selectedPusatFilter]);

  const jabatansMapForKluster = useMemo(() => {
    const result: Array<{ pusat: string; jabatans: string[] }> = [];
    effectivePusats.forEach((pus) => {
      result.push({
        pusat: pus,
        jabatans: (jabatanMap[pus] || []).filter((j) => j && j !== 'SEMUA JABATAN'),
      });
    });
    return result;
  }, [effectivePusats, jabatanMap]);

  const allJabatansUnderKluster = useMemo(() => {
    const list: Array<{ pusat: string; jabatan: string }> = [];
    jabatansMapForKluster.forEach((item) => {
      item.jabatans.forEach((jab) => list.push({ pusat: item.pusat, jabatan: jab }));
    });
    return list;
  }, [jabatansMapForKluster]);

  // Filter programs belonging to this Kluster's Pusats/Jabatans
  const klusterPrograms = useMemo(() => {
    const jabSet = new Set(allJabatansUnderKluster.map((x) => x.jabatan));
    const pusSet = new Set(effectivePusats);
    return programs.filter((p) => {
      const matchKluster = pusSet.has(p.pusat) || jabSet.has(p.jabatan);
      const matchYear = filterTahun === 'SEMUA' || String(p.tahun) === filterTahun;
      return matchKluster && matchYear;
    });
  }, [programs, effectivePusats, allJabatansUnderKluster, filterTahun]);

  // Pegawai under Pusats in this Kluster
  const klusterOfficers = useMemo(() => {
    const pusSet = new Set(effectivePusats);
    const jabSet = new Set(allJabatansUnderKluster.map((x) => x.jabatan));
    return pegawaiList.filter((peg) => pusSet.has(peg.pusat || '') || jabSet.has(peg.jabatan || ''));
  }, [pegawaiList, effectivePusats, allJabatansUnderKluster]);

  const computeProgramGroupStats = (groupProgs: ProgramItem[]) => {
    const selesai = groupProgs.filter((p) => p.statusProgram === 'SELESAI').length;
    const dalamTindakan = groupProgs.filter((p) => p.statusProgram === 'DALAM TINDAKAN').length;
    const tanggung = groupProgs.filter((p) => p.statusProgram === 'TANGGUNG').length;
    const belum = groupProgs.filter((p) => p.statusProgram === 'BELUM AMBIL TINDAKAN').length;
    const batal = groupProgs.filter((p) => p.statusProgram === 'BATAL').length;
    const peserta = groupProgs.reduce((sum, p) => sum + (Number(p.bilanganPeserta) || 0), 0);
    const hari = groupProgs.reduce((sum, p) => sum + (Number(p.jumlahHari) || 0), 0);
    const peruntukan = groupProgs.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
    const belanja = groupProgs.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
    const penjimatan = groupProgs.reduce(
      (sum, p) =>
        sum +
        (p.jumlahPenjimatanRm !== undefined
          ? Number(p.jumlahPenjimatanRm)
          : Math.max(0, (Number(p.jumlahRm) || 0) - (Number(p.jumlahBelanjaRm) || 0))),
      0
    );
    const activeTotal = Math.max(0, groupProgs.length - batal);
    const successRate = activeTotal > 0 ? Math.round((selesai / activeTotal) * 100) : 0;
    return {
      totalPrograms: groupProgs.length,
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
    };
  };

  // Metrics per Pusat
  const pusatMetrics: PusatMetric[] = useMemo(() => {
    return effectivePusats.map((pus) => {
      const jabs = (jabatanMap[pus] || []).filter((j) => j && j !== 'SEMUA JABATAN');
      const jabSet = new Set(jabs);
      const pusProgs = klusterPrograms.filter((p) => p.pusat === pus || jabSet.has(p.jabatan));
      const pusPeg = klusterOfficers.filter((peg) => peg.pusat === pus || jabSet.has(peg.jabatan || ''));
      const stats = computeProgramGroupStats(pusProgs);
      return {
        pusat: pus,
        jabatanCount: jabs.length,
        pegawaiCount: pusPeg.length,
        ...stats,
      };
    });
  }, [effectivePusats, jabatanMap, klusterPrograms, klusterOfficers]);

  // Metrics per Jabatan
  const jabatanMetrics: JabatanMetric[] = useMemo(() => {
    return allJabatansUnderKluster.map(({ pusat, jabatan }) => {
      const jabProgs = klusterPrograms.filter((p) => p.jabatan === jabatan);
      const jabPeg = klusterOfficers.filter((peg) => peg.jabatan === jabatan);
      const stats = computeProgramGroupStats(jabProgs);
      return {
        pusat,
        jabatan,
        pegawaiCount: jabPeg.length,
        ...stats,
      };
    });
  }, [allJabatansUnderKluster, klusterPrograms, klusterOfficers]);

  // Kluster Grand Totals
  const klusterTotals = useMemo(() => {
    const base = computeProgramGroupStats(klusterPrograms);
    return {
      ...base,
      pusatCount: effectivePusats.length,
      jabatanCount: allJabatansUnderKluster.length,
      pegawaiCount: klusterOfficers.length,
    };
  }, [klusterPrograms, effectivePusats.length, allJabatansUnderKluster.length, klusterOfficers.length]);

  // Officer Performance Rows
  const officerRows = useMemo(() => {
    const rows = klusterOfficers
      .filter((peg) => officerPusatFilter === 'SEMUA' || peg.pusat === officerPusatFilter)
      .filter((peg) => {
        if (!officerSearch.trim()) return true;
        const q = officerSearch.toLowerCase();
        return (
          peg.nama.toLowerCase().includes(q) ||
          peg.id.toLowerCase().includes(q) ||
          (peg.jawatan || '').toLowerCase().includes(q) ||
          (peg.pusat || '').toLowerCase().includes(q) ||
          (peg.jabatan || '').toLowerCase().includes(q)
        );
      })
      .map((peg) => {
        const pegProgs = klusterPrograms.filter(
          (p) =>
            p.pengurusId === peg.id ||
            p.pengurusBersamaId === peg.id ||
            p.pengurusNama === peg.nama ||
            p.pengurusBersamaNama === peg.nama
        );
        const stats = computeProgramGroupStats(pegProgs);
        return {
          pegawai: peg,
          programs: pegProgs,
          ...stats,
        };
      });

    rows.sort((a, b) => {
      let cmp = 0;
      if (officerSortKey === 'nama') cmp = a.pegawai.nama.localeCompare(b.pegawai.nama);
      else if (officerSortKey === 'pusat') cmp = (a.pegawai.pusat || '').localeCompare(b.pegawai.pusat || '');
      else if (officerSortKey === 'jabatan') cmp = (a.pegawai.jabatan || '').localeCompare(b.pegawai.jabatan || '');
      else if (officerSortKey === 'total') cmp = a.totalPrograms - b.totalPrograms;
      else if (officerSortKey === 'selesai') cmp = a.selesai - b.selesai;
      else if (officerSortKey === 'peruntukan') cmp = a.peruntukan - b.peruntukan;
      return officerSortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [klusterOfficers, officerPusatFilter, officerSearch, klusterPrograms, officerSortKey, officerSortDir]);

  const handleSortOfficer = (key: typeof officerSortKey) => {
    if (officerSortKey === key) {
      setOfficerSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOfficerSortKey(key);
      setOfficerSortDir(key === 'nama' || key === 'pusat' || key === 'jabatan' ? 'asc' : 'desc');
    }
  };

  const maxPusatProg = useMemo(() => Math.max(1, ...pusatMetrics.map((p) => p.totalPrograms)), [pusatMetrics]);
  const maxPusatBudget = useMemo(
    () => Math.max(1, ...pusatMetrics.map((p) => Math.max(p.peruntukan, p.belanja))),
    [pusatMetrics]
  );
  const maxJabProg = useMemo(() => Math.max(1, ...jabatanMetrics.map((j) => j.totalPrograms)), [jabatanMetrics]);
  const maxJabBudget = useMemo(
    () => Math.max(1, ...jabatanMetrics.map((j) => Math.max(j.peruntukan, j.belanja))),
    [jabatanMetrics]
  );

  const handleExportKlusterExcel = () => {
    const wb = XLSX.utils.book_new();
    const pusRows = pusatMetrics.map((p, i) => ({
      Bil: i + 1,
      Kluster: resolvedKlusterName,
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
      'Jumlah Hari': p.hari,
      'Peruntukan (RM)': p.peruntukan,
      'Belanja Sebenar (RM)': p.belanja,
      'Penjimatan (RM)': p.penjimatan,
      'Kadar Selesai (%)': `${p.successRate}%`,
    }));
    const jabRows = jabatanMetrics.map((j, i) => ({
      Bil: i + 1,
      Kluster: resolvedKlusterName,
      'Pusat Induk': j.pusat,
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
      'Peruntukan (RM)': j.peruntukan,
      'Belanja Sebenar (RM)': j.belanja,
      'Penjimatan (RM)': j.penjimatan,
      'Kadar Selesai (%)': `${j.successRate}%`,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pusRows), 'Rumusan Pusat');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jabRows), 'Rumusan Jabatan');
    XLSX.writeFile(
      wb,
      `RUMUSAN_${resolvedKlusterName.replace(/[^A-Z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    logActivity({
      action_type: 'EXPORT',
      module_name: targetKlusterKey.includes('PROFESIONAL')
        ? 'Kluster Khidmat Profesional'
        : 'Kluster Khidmat Latihan',
      activity_description: `Exported Kluster "${resolvedKlusterName}" summary to Excel`,
      record_id: resolvedKlusterName,
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
            {resolvedKlusterName}
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            {currentUser
              ? `Akaun anda tidak mempunyai kebenaran untuk memaparkan halaman ${resolvedKlusterName}. Sila hubungi Super Admin untuk menetapkan kebenaran dalam KEBENARAN VIEW/PAPAR PAGE.`
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
      {/* 1. NAMA KLUSTER & KAWALAN TAPISAN                                 */}
      {/* ================================================================= */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-600/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded">
                  1. Nama Kluster (Data Induk Kluster IAB)
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">
                  {isSuperAdmin
                    ? 'Akses Penuh Super Admin'
                    : pageMode === 'edit'
                    ? 'Akses Kluster (Edit)'
                    : 'Mod Paparan Sahaja (View Only)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 uppercase">
                {resolvedKlusterName}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Paparan menyeluruh Pusat, Jabatan, Pegawai, Infografik, Perbandingan dan Rumusan di bawah {resolvedKlusterName}.
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

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tapis Pusat Di Bawah Kluster
              </label>
              <select
                value={selectedPusatFilter}
                onChange={(e) => setSelectedPusatFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-xs"
              >
                <option value="SEMUA">SEMUA PUSAT ({pusatsUnderKluster.length})</option>
                {pusatsUnderKluster.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-4 border-t border-slate-800 tabular-nums">
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Pusat</div>
            <div className="text-xl font-black text-white mt-0.5">{klusterTotals.pusatCount}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Jabatan</div>
            <div className="text-xl font-black text-blue-300 mt-0.5">{klusterTotals.jabatanCount}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Pegawai</div>
            <div className="text-xl font-black text-teal-300 mt-0.5">{klusterTotals.pegawaiCount}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Program</div>
            <div className="text-xl font-black text-white mt-0.5">{klusterTotals.totalPrograms}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-emerald-400">Selesai</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              {klusterTotals.selesai}{' '}
              <span className="text-xs font-bold text-slate-400">({klusterTotals.successRate}%)</span>
            </div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Peruntukan</div>
            <div className="text-sm font-black text-amber-300 mt-1">RM {formatRM(klusterTotals.peruntukan)}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Belanja</div>
            <div className="text-sm font-black text-sky-300 mt-1">RM {formatRM(klusterTotals.belanja)}</div>
          </div>
          <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Penjimatan</div>
            <div className="text-sm font-black text-emerald-300 mt-1">RM {formatRM(klusterTotals.penjimatan)}</div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. NAMA-NAMA PUSAT DI BAWAH KLUSTER                               */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
              Seksyen 2
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              2. Nama-Nama Pusat di bawah {resolvedKlusterName}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {pusatMetrics.length} Pusat
          </span>
        </div>

        {pusatMetrics.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
            Tiada Pusat dipautkan di bawah {resolvedKlusterName}. Sila pautkan Pusat pada tab <strong>Data Induk &rarr; 4. Pusat</strong>.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pusatMetrics.map((pm) => (
              <div
                key={pm.pusat}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-blue-300 transition-colors space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase leading-snug">
                        {pm.pusat}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-semibold">
                        <span>{pm.jabatanCount} Jabatan</span>
                        <span>·</span>
                        <span>{pm.pegawaiCount} Pegawai</span>
                        <span>·</span>
                        <span>{pm.peserta} Peserta</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDrilldownModal({
                        title: pm.pusat,
                        subtitle: `${pm.totalPrograms} program berdaftar`,
                        list: klusterPrograms.filter(
                          (pr) =>
                            pr.pusat === pm.pusat ||
                            (jabatanMap[pm.pusat] || []).includes(pr.jabatan)
                        ),
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{pm.totalPrograms} Program</span>
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold tabular-nums">
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg py-1.5">
                    <div>Selesai</div>
                    <div className="text-sm font-black">{pm.selesai}</div>
                  </div>
                  <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg py-1.5">
                    <div>Tindakan</div>
                    <div className="text-sm font-black">{pm.dalamTindakan}</div>
                  </div>
                  <div className="bg-purple-50 text-purple-800 border border-purple-200 rounded-lg py-1.5">
                    <div>Tanggung</div>
                    <div className="text-sm font-black">{pm.tanggung}</div>
                  </div>
                  <div className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg py-1.5">
                    <div>Belum</div>
                    <div className="text-sm font-black">{pm.belum}</div>
                  </div>
                  <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg py-1.5">
                    <div>Batal</div>
                    <div className="text-sm font-black">{pm.batal}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs tabular-nums">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Peruntukan</div>
                    <div className="font-bold text-slate-900">RM {formatRM(pm.peruntukan)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Belanja</div>
                    <div className="font-bold text-blue-700">RM {formatRM(pm.belanja)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Penjimatan</div>
                    <div className="font-bold text-emerald-700">RM {formatRM(pm.penjimatan)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 3. NAMA-NAMA JABATAN DI BAWAH PUSAT (KLUSTER BERKENAAN)           */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded">
              Seksyen 3
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              3. Nama-Nama Jabatan di bawah Pusat ({resolvedKlusterName})
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {jabatanMetrics.length} Jabatan
          </span>
        </div>

        <div className="space-y-4">
          {jabatansMapForKluster.map((group) => {
            const jabsInGroup = jabatanMetrics.filter((jm) => jm.pusat === group.pusat);
            return (
              <div key={group.pusat} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 uppercase">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span>{group.pusat}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {jabsInGroup.length} Jabatan
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {jabsInGroup.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-xs text-slate-400">
                      Tiada jabatan berdaftar di bawah pusat ini.
                    </div>
                  ) : (
                    jabsInGroup.map((jm) => (
                      <div
                        key={jm.jabatan}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 transition-colors space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <Briefcase className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">
                              {jm.jabatan}
                            </h5>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDrilldownModal({
                                title: jm.jabatan,
                                subtitle: `Pusat Induk: ${jm.pusat}`,
                                list: klusterPrograms.filter((p) => p.jabatan === jm.jabatan),
                              })
                            }
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 cursor-pointer shrink-0"
                          >
                            {jm.totalPrograms} Prog
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                          <span>{jm.pegawaiCount} Pegawai</span>
                          <span>Selesai: <strong className="text-emerald-700">{jm.selesai}</strong> ({jm.successRate}%)</span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold tabular-nums pt-1 border-t border-slate-200/70 flex justify-between">
                          <span>Peruntukan:</span>
                          <span>RM {formatRM(jm.peruntukan)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. PEGAWAI-PEGAWAI DI BAWAH PUSAT                                 */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
              Seksyen 4
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              4. Senarai Pegawai di bawah Pusat ({resolvedKlusterName})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pegawai berdaftar mengikut Pusat &amp; Jabatan di bawah kluster ini berserta rekod program diuruskan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, ID, jawatan..."
                value={officerSearch}
                onChange={(e) => setOfficerSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <select
              value={officerPusatFilter}
              onChange={(e) => setOfficerPusatFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white max-w-xs"
            >
              <option value="SEMUA">Semua Pusat</option>
              {effectivePusats.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 select-none">
                <th className="py-2.5 px-3 w-12 text-center">Bil</th>
                <th onClick={() => handleSortOfficer('nama')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200">
                  <div className="flex items-center gap-1">
                    <span>Nama Pegawai</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSortOfficer('pusat')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200">
                  <div className="flex items-center gap-1">
                    <span>Pusat</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSortOfficer('jabatan')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200">
                  <div className="flex items-center gap-1">
                    <span>Jabatan &amp; Jawatan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSortOfficer('total')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200">
                  Program
                </th>
                <th onClick={() => handleSortOfficer('selesai')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200">
                  Selesai
                </th>
                <th onClick={() => handleSortOfficer('peruntukan')} className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200">
                  Peruntukan (RM)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {officerRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tiada pegawai ditemui di bawah pusat kluster ini.
                  </td>
                </tr>
              ) : (
                officerRows.map((row, idx) => (
                  <tr key={row.pegawai.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{row.pegawai.nama}</div>
                      <div className="text-[10px] font-mono text-slate-500">{row.pegawai.id}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-medium text-slate-700 max-w-[200px]">
                      {row.pegawai.pusat || '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[11px] font-semibold text-slate-800">{row.pegawai.jabatan || '-'}</div>
                      <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {row.pegawai.jawatan || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDrilldownModal({
                            title: `Program Diuruskan: ${row.pegawai.nama}`,
                            subtitle: `${row.pegawai.id} · ${row.pegawai.jabatan || ''}`,
                            list: row.programs,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold hover:bg-blue-100 cursor-pointer"
                      >
                        {row.totalPrograms}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {row.selesai}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      RM {formatRM(row.peruntukan)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. VISUALISASI DAN INFOGRAFIK SETIAP PUSAT DAN JABATAN            */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded">
            Seksyen 5
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            5. Visualisasi dan Infografik Setiap Pusat dan Jabatan
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Infografik Pusat */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <PieChart className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Infografik Status &amp; Kewangan Mengikut Pusat
              </h4>
            </div>
            <div className="space-y-4 tabular-nums">
              {pusatMetrics.map((pm) => {
                const total = Math.max(1, pm.totalPrograms);
                return (
                  <div key={pm.pusat} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 truncate" title={pm.pusat}>
                        {pm.pusat}
                      </span>
                      <span className="font-mono font-bold text-blue-700 shrink-0">
                        {pm.totalPrograms} Program ({pm.successRate}% Selesai)
                      </span>
                    </div>
                    <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                      {pm.selesai > 0 && (
                        <div
                          style={{ width: `${(pm.selesai / total) * 100}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Selesai: ${pm.selesai}`}
                        />
                      )}
                      {pm.dalamTindakan > 0 && (
                        <div
                          style={{ width: `${(pm.dalamTindakan / total) * 100}%` }}
                          className="bg-amber-400 h-full"
                          title={`Dalam Tindakan: ${pm.dalamTindakan}`}
                        />
                      )}
                      {pm.tanggung > 0 && (
                        <div
                          style={{ width: `${(pm.tanggung / total) * 100}%` }}
                          className="bg-purple-500 h-full"
                          title={`Tanggung: ${pm.tanggung}`}
                        />
                      )}
                      {pm.belum > 0 && (
                        <div
                          style={{ width: `${(pm.belum / total) * 100}%` }}
                          className="bg-slate-400 h-full"
                          title={`Belum Tindakan: ${pm.belum}`}
                        />
                      )}
                      {pm.batal > 0 && (
                        <div
                          style={{ width: `${(pm.batal / total) * 100}%` }}
                          className="bg-rose-500 h-full"
                          title={`Batal: ${pm.batal}`}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                      <span>Peserta: <strong className="text-slate-800">{pm.peserta}</strong> · Hari: <strong className="text-slate-800">{pm.hari}</strong></span>
                      <span>Peruntukan: <strong className="text-slate-900">RM {formatRM(pm.peruntukan)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Selesai</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Dalam Tindakan</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500" /> Tanggung</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-400" /> Belum Tindakan</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Batal</span>
            </div>
          </div>

          {/* Infografik Jabatan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Infografik Pencapaian Mengikut Jabatan
              </h4>
            </div>
            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1 tabular-nums">
              {jabatanMetrics.map((jm) => {
                const barWidth = Math.round((jm.totalPrograms / maxJabProg) * 100);
                return (
                  <div key={jm.jabatan} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-800 truncate" title={jm.jabatan}>
                        {jm.jabatan}
                      </span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {jm.totalPrograms} ({jm.selesai} Selesai)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className="h-full bg-teal-600 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. VISUALISASI COMPARISON SETIAP PUSAT DAN JABATAN                */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
              Seksyen 6
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              6. Visualisasi Comparison Setiap Pusat dan Jabatan
            </h3>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start">
            <button
              type="button"
              onClick={() => setComparisonTarget('pusat')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                comparisonTarget === 'pusat'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Perbandingan Pusat
            </button>
            <button
              type="button"
              onClick={() => setComparisonTarget('jabatan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                comparisonTarget === 'jabatan'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Perbandingan Jabatan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 tabular-nums">
          {/* Comparison 1: Peruntukan vs Belanja Sebenar */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span>Perbandingan Peruntukan Diterima vs Belanja Sebenar (RM)</span>
            </h4>
            <div className="space-y-3">
              {(comparisonTarget === 'pusat' ? pusatMetrics : jabatanMetrics).map((item) => {
                const label = 'jabatan' in item ? item.jabatan : item.pusat;
                const maxB = comparisonTarget === 'pusat' ? maxPusatBudget : maxJabBudget;
                const wPer = Math.round((item.peruntukan / maxB) * 100);
                const wBel = Math.round((item.belanja / maxB) * 100);
                return (
                  <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-xs font-bold text-slate-900 truncate" title={label}>
                      {label}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-20 text-slate-500 font-semibold shrink-0">Peruntukan</span>
                        <div className="flex-1 h-2.5 bg-white rounded-full border border-slate-200 overflow-hidden">
                          <div style={{ width: `${wPer}%` }} className="h-full bg-blue-600 rounded-full" />
                        </div>
                        <span className="w-24 text-right font-bold text-slate-900">RM {formatRM(item.peruntukan)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-20 text-slate-500 font-semibold shrink-0">Belanja</span>
                        <div className="flex-1 h-2.5 bg-white rounded-full border border-slate-200 overflow-hidden">
                          <div style={{ width: `${wBel}%` }} className="h-full bg-emerald-600 rounded-full" />
                        </div>
                        <span className="w-24 text-right font-bold text-emerald-700">RM {formatRM(item.belanja)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison 2: Kadar Selesai & Beban Program */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Perbandingan Kadar Pelaksanaan Selesai (%) &amp; Bilangan Peserta</span>
            </h4>
            <div className="space-y-3">
              {(comparisonTarget === 'pusat' ? pusatMetrics : jabatanMetrics).map((item) => {
                const label = 'jabatan' in item ? item.jabatan : item.pusat;
                const maxP = comparisonTarget === 'pusat' ? maxPusatProg : maxJabProg;
                const wProg = Math.round((item.totalPrograms / maxP) * 100);
                return (
                  <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate" title={label}>
                        {label}
                      </span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        {item.successRate}% Selesai
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <div className="flex-1 h-2.5 bg-white rounded-full border border-slate-200 overflow-hidden">
                        <div
                          style={{ width: `${wProg}%` }}
                          className="h-full bg-indigo-600 rounded-full"
                        />
                      </div>
                      <span className="font-bold text-slate-800 shrink-0">
                        {item.totalPrograms} Prog · {item.peserta} Peserta
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 7. RUMUSAN SETIAP PUSAT & JABATAN BY STATUS, PERUNTUKAN DLL.      */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
              Seksyen 7
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              7. Rumusan Setiap Pusat &amp; Jabatan Mengikut Status Program &amp; Kewangan
            </h3>
          </div>
          <button
            type="button"
            onClick={handleExportKlusterExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Eksport Rumusan Excel</span>
          </button>
        </div>

        {/* Jadual 7A: Rumusan Pusat */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-800 uppercase tracking-wider">
          A. Rumusan Mengikut Pusat ({resolvedKlusterName})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">Nama Pusat</th>
                <th className="py-2.5 px-2 text-center">Jbt</th>
                <th className="py-2.5 px-2 text-center">Peg</th>
                <th className="py-2.5 px-2 text-center">Prog</th>
                <th className="py-2.5 px-2 text-center text-emerald-700">Selesai</th>
                <th className="py-2.5 px-2 text-center text-amber-700">Tindakan</th>
                <th className="py-2.5 px-2 text-center text-purple-700">Tanggung</th>
                <th className="py-2.5 px-2 text-center text-slate-600">Belum</th>
                <th className="py-2.5 px-2 text-center text-rose-700">Batal</th>
                <th className="py-2.5 px-2 text-right">Peserta</th>
                <th className="py-2.5 px-3 text-right">Peruntukan (RM)</th>
                <th className="py-2.5 px-3 text-right">Belanja (RM)</th>
                <th className="py-2.5 px-3 text-right">Penjimatan (RM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pusatMetrics.map((pm) => (
                <tr key={pm.pusat} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{pm.pusat}</td>
                  <td className="py-2.5 px-2 text-center">{pm.jabatanCount}</td>
                  <td className="py-2.5 px-2 text-center">{pm.pegawaiCount}</td>
                  <td className="py-2.5 px-2 text-center font-black">{pm.totalPrograms}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-emerald-700">{pm.selesai}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-amber-700">{pm.dalamTindakan}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-purple-700">{pm.tanggung}</td>
                  <td className="py-2.5 px-2 text-center">{pm.belum}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-rose-600">{pm.batal}</td>
                  <td className="py-2.5 px-2 text-right">{pm.peserta}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatRM(pm.peruntukan)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-blue-700">{formatRM(pm.belanja)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{formatRM(pm.penjimatan)}</td>
                </tr>
              ))}
              <tr className="bg-slate-900 text-white font-black">
                <td className="py-3 px-3">JUMLAH KESELURUHAN PUSAT</td>
                <td className="py-3 px-2 text-center">{klusterTotals.jabatanCount}</td>
                <td className="py-3 px-2 text-center">{klusterTotals.pegawaiCount}</td>
                <td className="py-3 px-2 text-center">{klusterTotals.totalPrograms}</td>
                <td className="py-3 px-2 text-center text-emerald-300">{klusterTotals.selesai}</td>
                <td className="py-3 px-2 text-center text-amber-300">{klusterTotals.dalamTindakan}</td>
                <td className="py-3 px-2 text-center text-purple-300">{klusterTotals.tanggung}</td>
                <td className="py-3 px-2 text-center">{klusterTotals.belum}</td>
                <td className="py-3 px-2 text-center text-rose-300">{klusterTotals.batal}</td>
                <td className="py-3 px-2 text-right">{klusterTotals.peserta}</td>
                <td className="py-3 px-3 text-right">{formatRM(klusterTotals.peruntukan)}</td>
                <td className="py-3 px-3 text-right text-sky-300">{formatRM(klusterTotals.belanja)}</td>
                <td className="py-3 px-3 text-right text-emerald-300">{formatRM(klusterTotals.penjimatan)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Jadual 7B: Rumusan Jabatan */}
        <div className="px-5 py-2.5 bg-slate-50 border-y border-slate-200 text-xs font-black text-slate-800 uppercase tracking-wider mt-4">
          B. Rumusan Terperinci Mengikut Jabatan
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">Nama Jabatan</th>
                <th className="py-2.5 px-3">Pusat Induk</th>
                <th className="py-2.5 px-2 text-center">Peg</th>
                <th className="py-2.5 px-2 text-center">Prog</th>
                <th className="py-2.5 px-2 text-center text-emerald-700">Selesai</th>
                <th className="py-2.5 px-2 text-center text-amber-700">Tindakan</th>
                <th className="py-2.5 px-2 text-center text-purple-700">Tanggung</th>
                <th className="py-2.5 px-2 text-center text-slate-600">Belum</th>
                <th className="py-2.5 px-2 text-center text-rose-700">Batal</th>
                <th className="py-2.5 px-2 text-right">Peserta</th>
                <th className="py-2.5 px-3 text-right">Peruntukan (RM)</th>
                <th className="py-2.5 px-3 text-right">Belanja (RM)</th>
                <th className="py-2.5 px-3 text-right">Penjimatan (RM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jabatanMetrics.map((jm) => (
                <tr key={jm.jabatan} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{jm.jabatan}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-600">{jm.pusat}</td>
                  <td className="py-2.5 px-2 text-center">{jm.pegawaiCount}</td>
                  <td className="py-2.5 px-2 text-center font-black">{jm.totalPrograms}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-emerald-700">{jm.selesai}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-amber-700">{jm.dalamTindakan}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-purple-700">{jm.tanggung}</td>
                  <td className="py-2.5 px-2 text-center">{jm.belum}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-rose-600">{jm.batal}</td>
                  <td className="py-2.5 px-2 text-right">{jm.peserta}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatRM(jm.peruntukan)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-blue-700">{formatRM(jm.belanja)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{formatRM(jm.penjimatan)}</td>
                </tr>
              ))}
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
