import React, { useState, useMemo, useEffect } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem, Pegawai } from '../types/program';
import { formatRM, formatRMWithPrefix, formatNumber, getStatusConfig } from '../utils/formatters';
import { getCurrentFinanceYear, getProgramYear } from '../utils/financeYear';
import { deduplicateProgramsByCode } from '../utils/programDedupe';
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
} from 'lucide-react';

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
}

export const PusatPage: React.FC = () => {
  const {
    programs,
    pegawaiList,
    pusatList,
    jabatanMap,
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

  useEffect(() => {
    if (authorizedPusatList.length === 0) {
      setSelectedPusat('');
    } else if (!selectedPusat || !authorizedPusatList.includes(selectedPusat)) {
      setSelectedPusat(authorizedPusatList[0]);
    }
  }, [authorizedPusatList, selectedPusat]);

  const availableYears = useMemo(() => {
    const set = new Set<string>([
      String(getCurrentFinanceYear()),
      ...programs.map((p) => String(getProgramYear(p))),
    ]);
    return Array.from(set).sort().reverse();
  }, [programs]);

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

  // Officers under selectedPusat
  const pusatOfficers = useMemo(() => {
    if (!selectedPusat) return [];
    return pegawaiList.filter(
      (pg) =>
        pg.pusat === selectedPusat ||
        (pg.jabatan && jabatansUnderPusat.includes(pg.jabatan))
    );
  }, [pegawaiList, selectedPusat, jabatansUnderPusat]);

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
      const peruntukan = matched.reduce((acc, pr) => {
        if ((pr.statusProgram || '').trim().toUpperCase() === 'BATAL') return acc;
        return acc + (Number(pr.jumlahRm) || 0);
      }, 0);
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

  // Per-Jabatan aggregated metrics
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
      let peruntukan = 0;
      let belanja = 0;
      let penjimatan = 0;

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
          peruntukan += Number(p.jumlahRm) || 0;
          belanja += Number(p.jumlahBelanjaRm) || 0;
          penjimatan += Number(p.jumlahPenjimatanRm) || 0;
        }
      });

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
      };
    });
  }, [jabatansUnderPusat, pusatPrograms, pusatOfficers]);

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
      'Peruntukan Diterima (RM)': j.peruntukan,
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-800">
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
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Peruntukan (RM)</span>
            <span className="text-sm font-black text-amber-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(pusatTotals.peruntukan)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Belanja Sebenar</span>
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
      {/* 2. NAMA-NAMA JABATAN DI BAWAH PUSAT                               */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              2. Senarai Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Nama-Nama Jabatan di Bawah {selectedPusat}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {jabatansUnderPusat.length} Jabatan Aktif
          </span>
        </div>

        {jabatanMetricsList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            Tiada jabatan direkodkan di bawah pusat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jabatanMetricsList.map((jm, idx) => (
              <div
                key={jm.jabatan}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                      JABATAN #{idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {jm.successRate}% Selesai
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mt-2 uppercase leading-snug">
                    {jm.jabatan}
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/80 text-xs">
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Pegawai</span>
                    <strong className="text-slate-900 tabular-nums">{jm.pegawaiCount}</strong>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Program</span>
                    <strong className="text-blue-700 tabular-nums">{jm.totalPrograms}</strong>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Peserta</span>
                    <strong className="text-slate-900 tabular-nums">{formatNumber(jm.peserta)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">Peruntukan: <strong className="text-slate-900 font-mono">{formatRMWithPrefix(jm.peruntukan)}</strong></span>
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
                    <span>Papar Program</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 3. PEGAWAI-PEGAWAI DI BAWAH PUSAT                                 */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              3. Direktori Pegawai Pusat
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Pegawai-Pegawai di Bawah {selectedPusat} ({filteredSortedOfficers.length} Orang)
            </h3>
          </div>

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
                <th className="py-2.5 px-3 text-right">PERUNTUKAN DIURUS (RM)</th>
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
      </section>

      {/* ================================================================= */}
      {/* 4. VISUALISASI DAN INFOGRAFIK SETIAP JABATAN                      */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            4. Visualisasi &amp; Infografik Jabatan
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Kad Infografik Prestasi &amp; Kewangan Setiap Jabatan
          </h3>
        </div>

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
                      <span className="text-slate-400 block">Diterima</span>
                      <strong className="font-mono text-slate-900">{formatRMWithPrefix(jm.peruntukan)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Belanja Sebenar</span>
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
      </section>

      {/* ================================================================= */}
      {/* 5. VISUALISASI COMPARISON SETIAP JABATAN                          */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            5. Visualisasi Perbandingan Jabatan
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Perbandingan Prestasi, Kewangan &amp; Impak Antara Jabatan
          </h3>
        </div>

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
              <span>Perbandingan Peruntukan vs Belanja Sebenar (RM)</span>
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
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-xs" /> Peruntukan Diterima</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs" /> Belanja Sebenar</span>
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
      </section>

      {/* ================================================================= */}
      {/* 6. RUMUSAN SETIAP JABATAN MENGIKUT STATUS PROGRAM & PERUNTUKAN    */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              6. Rumusan Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Rumusan Setiap Jabatan Mengikut Status Program, Peruntukan &amp; Sebagainya
            </h3>
          </div>

          <button
            type="button"
            onClick={handleExportRumusanPusat}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
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
                <th className="py-3 px-3 text-right">PERUNTUKAN (RM)</th>
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
    </div>
  );
};
