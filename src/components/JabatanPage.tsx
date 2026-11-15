import React, { useState, useMemo, useEffect } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem, Pegawai } from '../types/program';
import { formatRM, formatRMWithPrefix, formatNumber, getStatusConfig } from '../utils/formatters';
import * as XLSX from 'xlsx';
import {
  Briefcase,
  Users,
  BarChart3,
  Lock,
  ShieldAlert,
  ArrowRight,
  Download,
  Eye,
  Search,
  ArrowUpDown,
  X,
  TrendingUp,
  Award,
} from 'lucide-react';

interface OfficerJabatanMetrics {
  pegawai: Pegawai;
  utamaCount: number;
  bersamaCount: number;
  totalPrograms: number;
  programs: ProgramItem[];
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

export const JabatanPage: React.FC = () => {
  const {
    programs,
    pegawaiList,
    jabatanMap,
    currentUser,
    isSuperAdmin,
    getPageAccessMode,
    getAuthorizedJabatanList,
    viewProgramDetail,
    setActiveTab,
    logActivity,
  } = useProgramContext();

  const pageMode = getPageAccessMode('JABATAN');
  const canAccess = Boolean(currentUser) && pageMode !== 'none';

  const authorizedJabatanList = useMemo(() => {
    const base = getAuthorizedJabatanList();
    if (isSuperAdmin) {
      const merged = new Set<string>([...Object.values(jabatanMap).flat(), ...base]);
      programs.forEach((p) => {
        if (p.jabatan && p.jabatan !== 'TIDAK BERKENAAN') merged.add(p.jabatan);
      });
      return Array.from(merged).filter((j) => j && j !== 'SEMUA JABATAN');
    }
    return base;
  }, [getAuthorizedJabatanList, isSuperAdmin, jabatanMap, programs]);

  const [selectedJabatan, setSelectedJabatan] = useState<string>('');
  const [filterTahun, setFilterTahun] = useState<string>('SEMUA');
  const [officerSearch, setOfficerSearch] = useState<string>('');
  const [sortKey, setSortKey] = useState<'id' | 'nama' | 'totalPrograms' | 'selesai' | 'peruntukan' | 'successRate'>('totalPrograms');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [drillModal, setDrillModal] = useState<{
    title: string;
    subtitle?: string;
    items: ProgramItem[];
  } | null>(null);

  useEffect(() => {
    if (authorizedJabatanList.length === 0) {
      setSelectedJabatan('');
    } else if (!selectedJabatan || !authorizedJabatanList.includes(selectedJabatan)) {
      setSelectedJabatan(authorizedJabatanList[0]);
    }
  }, [authorizedJabatanList, selectedJabatan]);

  // Parent Pusat of selectedJabatan
  const parentPusat = useMemo(() => {
    if (!selectedJabatan) return '-';
    for (const [pus, jabs] of Object.entries(jabatanMap)) {
      if (jabs.includes(selectedJabatan)) return pus;
    }
    const foundProg = programs.find((p) => p.jabatan === selectedJabatan && p.pusat);
    return foundProg?.pusat || '-';
  }, [selectedJabatan, jabatanMap, programs]);

  const availableYears = useMemo(() => {
    const set = new Set<string>(programs.map((p) => String(p.tahun || '2026')));
    return Array.from(set).sort().reverse();
  }, [programs]);

  const jabatanPrograms = useMemo(() => {
    if (!selectedJabatan) return [];
    return programs.filter((p) => {
      if (p.jabatan !== selectedJabatan) return false;
      if (filterTahun !== 'SEMUA' && String(p.tahun) !== filterTahun) return false;
      return true;
    });
  }, [programs, selectedJabatan, filterTahun]);

  // Officers belonging to selectedJabatan (plus any managing programs under it)
  const jabatanOfficers = useMemo(() => {
    if (!selectedJabatan) return [];
    const byId = new Map<string, Pegawai>();
    pegawaiList.forEach((pg) => {
      if (pg.jabatan === selectedJabatan) {
        byId.set(pg.id, pg);
      }
    });
    // Also include officers who lead/co-lead programs in this Jabatan
    jabatanPrograms.forEach((p) => {
      pegawaiList.forEach((pg) => {
        const idNorm = (pg.id || '').trim().toUpperCase();
        const nmNorm = (pg.nama || '').trim().toUpperCase();
        const matchUtama =
          (idNorm && (p.pengurusId || '').trim().toUpperCase() === idNorm) ||
          (nmNorm && (p.pengurusNama || '').trim().toUpperCase() === nmNorm);
        const matchBersama =
          (idNorm && (p.pengurusBersamaId || '').trim().toUpperCase() === idNorm) ||
          (nmNorm && (p.pengurusBersamaNama || '').trim().toUpperCase() === nmNorm);
        if ((matchUtama || matchBersama) && !byId.has(pg.id)) {
          byId.set(pg.id, pg);
        }
      });
    });
    return Array.from(byId.values());
  }, [selectedJabatan, pegawaiList, jabatanPrograms]);

  const officerMetricsList: OfficerJabatanMetrics[] = useMemo(() => {
    return jabatanOfficers.map((pg) => {
      const idNorm = (pg.id || '').trim().toUpperCase();
      const nmNorm = (pg.nama || '').trim().toUpperCase();

      const matchedProgs: ProgramItem[] = [];
      let utamaCount = 0;
      let bersamaCount = 0;

      jabatanPrograms.forEach((p) => {
        const isUtama =
          (idNorm && (p.pengurusId || '').trim().toUpperCase() === idNorm) ||
          (nmNorm && (p.pengurusNama || '').trim().toUpperCase() === nmNorm);
        const isBersama =
          (idNorm && (p.pengurusBersamaId || '').trim().toUpperCase() === idNorm) ||
          (nmNorm && (p.pengurusBersamaNama || '').trim().toUpperCase() === nmNorm);
        if (isUtama || isBersama) {
          matchedProgs.push(p);
          if (isUtama) utamaCount++;
          if (isBersama) bersamaCount++;
        }
      });

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

      matchedProgs.forEach((p) => {
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

      const active = matchedProgs.length - batal;
      const successRate = active > 0 ? Math.round((selesai / active) * 100) : 0;
      const utilRate = peruntukan > 0 ? Math.round((belanja / peruntukan) * 100) : 0;

      return {
        pegawai: pg,
        utamaCount,
        bersamaCount,
        totalPrograms: matchedProgs.length,
        programs: matchedProgs,
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
  }, [jabatanOfficers, jabatanPrograms]);

  const filteredSortedMetrics = useMemo(() => {
    let list = [...officerMetricsList];
    if (officerSearch.trim()) {
      const q = officerSearch.toLowerCase();
      list = list.filter(
        (m) =>
          (m.pegawai.id && m.pegawai.id.toLowerCase().includes(q)) ||
          (m.pegawai.nama && m.pegawai.nama.toLowerCase().includes(q)) ||
          (m.pegawai.jawatan && m.pegawai.jawatan.toLowerCase().includes(q)) ||
          (m.pegawai.emel && m.pegawai.emel.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortKey === 'id') {
        const nA = parseInt((a.pegawai.id || '').replace(/\D/g, ''), 10) || 0;
        const nB = parseInt((b.pegawai.id || '').replace(/\D/g, ''), 10) || 0;
        return sortDir === 'asc' ? nA - nB : nB - nA;
      }
      if (sortKey === 'nama') {
        const cmp = a.pegawai.nama.localeCompare(b.pegawai.nama, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const valA = a[sortKey];
      const valB = b[sortKey];
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [officerMetricsList, officerSearch, sortKey, sortDir]);

  const toggleSort = (key: 'id' | 'nama' | 'totalPrograms' | 'selesai' | 'peruntukan' | 'successRate') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'id' || key === 'nama' ? 'asc' : 'desc');
    }
  };

  // Jabatan overall totals (computed from jabatanPrograms directly to avoid double-counting shared programs)
  const jabatanTotals = useMemo(() => {
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

    jabatanPrograms.forEach((p) => {
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

    const active = jabatanPrograms.length - batal;
    const successRate = active > 0 ? Math.round((selesai / active) * 100) : 0;

    return {
      totalPrograms: jabatanPrograms.length,
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
  }, [jabatanPrograms]);

  const maxOffProg = useMemo(
    () => Math.max(1, ...filteredSortedMetrics.map((m) => m.totalPrograms)),
    [filteredSortedMetrics]
  );
  const maxOffBudget = useMemo(
    () => Math.max(1, ...filteredSortedMetrics.map((m) => Math.max(m.peruntukan, m.belanja))),
    [filteredSortedMetrics]
  );
  const maxOffPeserta = useMemo(
    () => Math.max(1, ...filteredSortedMetrics.map((m) => m.peserta)),
    [filteredSortedMetrics]
  );

  const handleExportRumusanJabatan = () => {
    const rows = filteredSortedMetrics.map((m, idx) => ({
      Bil: idx + 1,
      'ID Pegawai': m.pegawai.id,
      'Nama Pegawai': m.pegawai.nama,
      Jawatan: m.pegawai.jawatan || '-',
      'Program Utama': m.utamaCount,
      'Program Bersama': m.bersamaCount,
      'Jumlah Program': m.totalPrograms,
      Selesai: m.selesai,
      'Dalam Tindakan': m.dalamTindakan,
      Tanggung: m.tanggung,
      'Belum Tindakan': m.belum,
      Batal: m.batal,
      'Jumlah Peserta': m.peserta,
      'Jumlah Hari': m.hari,
      'Peruntukan Diurus (RM)': m.peruntukan,
      'Belanja Sebenar (RM)': m.belanja,
      'Penjimatan (RM)': m.penjimatan,
      'Kadar Selesai (%)': `${m.successRate}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rumusan Pegawai Jabatan');
    XLSX.writeFile(
      wb,
      `RUMUSAN_JABATAN_${(selectedJabatan || 'IAB').replace(/[^A-Z0-9]/gi, '_').slice(0, 30)}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
    logActivity({
      action_type: 'EXPORT',
      module_name: 'Page Jabatan',
      activity_description: `Exported Jabatan "${selectedJabatan || 'IAB'}" summary to Excel`,
      record_id: selectedJabatan || 'IAB',
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
            Halaman Jabatan (IAB)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            {currentUser
              ? 'Akaun anda tidak mempunyai kebenaran untuk memaparkan Halaman Jabatan. Sila hubungi Super Admin untuk menetapkan kebenaran dalam KEBENARAN VIEW/PAPAR PAGE.'
              : 'Halaman ini memerlukan log masuk pengguna. Sila log masuk melalui Portal Admin untuk melihat maklumat Jabatan anda.'}
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
      {/* 1. NAMA JABATAN & KAWALAN TAPISAN                                 */}
      {/* ================================================================= */}
      <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-teal-600/30 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded">
                  1. Nama Jabatan
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-800 text-slate-300 border-slate-700">
                  {isSuperAdmin
                    ? 'Akses Penuh Super Admin'
                    : pageMode === 'edit'
                    ? 'Akses Jabatan Pengguna (Edit)'
                    : 'Mod Paparan Sahaja (View Only)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 uppercase">
                {selectedJabatan || 'Tiada Jabatan Ditugaskan'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Pusat Induk: <strong className="text-white">{parentPusat}</strong>
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
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400"
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
                Pilih Jabatan {isSuperAdmin ? '(Super Admin)' : '(Mengikut Akses Akaun)'}
              </label>
              <select
                value={selectedJabatan}
                disabled={!isSuperAdmin && authorizedJabatanList.length <= 1}
                onChange={(e) => setSelectedJabatan(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 max-w-xs disabled:opacity-75"
              >
                {authorizedJabatanList.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Ringkas Jabatan */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Pegawai</span>
            <span className="text-lg font-black text-cyan-300 tabular-nums mt-0.5 block">
              {jabatanOfficers.length}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Jumlah Program</span>
            <span className="text-lg font-black text-white tabular-nums mt-0.5 block">
              {jabatanTotals.totalPrograms}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Kadar Selesai</span>
            <span className="text-lg font-black text-emerald-400 tabular-nums mt-0.5 block">
              {jabatanTotals.successRate}%
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Peruntukan (RM)</span>
            <span className="text-sm font-black text-amber-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(jabatanTotals.peruntukan)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Belanja Sebenar</span>
            <span className="text-sm font-black text-emerald-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(jabatanTotals.belanja)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Penjimatan</span>
            <span className="text-sm font-black text-teal-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(jabatanTotals.penjimatan)}
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. PEGAWAI-PEGAWAI DI BAWAH JABATAN                               */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              2. Senarai Pegawai Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Pegawai-Pegawai di Bawah {selectedJabatan} ({filteredSortedMetrics.length} Orang)
            </h3>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={officerSearch}
              onChange={(e) => setOfficerSearch(e.target.value)}
              placeholder="Cari ID, nama, jawatan, emel..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">BIL</th>
                <th onClick={() => toggleSort('id')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 select-none">
                  <div className="flex items-center gap-1"><span>ID</span><ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th onClick={() => toggleSort('nama')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 select-none">
                  <div className="flex items-center gap-1"><span>NAMA PEGAWAI</span><ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th className="py-2.5 px-3">JAWATAN</th>
                <th className="py-2.5 px-3">EMEL &amp; NO. HP</th>
                <th className="py-2.5 px-3 text-center">UTAMA</th>
                <th className="py-2.5 px-3 text-center">BERSAMA</th>
                <th onClick={() => toggleSort('totalPrograms')} className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/70 select-none">
                  <div className="flex items-center justify-center gap-1"><span>JUMLAH PROGRAM</span><ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSortedMetrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tiada pegawai direkodkan di bawah jabatan ini.
                  </td>
                </tr>
              ) : (
                filteredSortedMetrics.map((m, idx) => (
                  <tr key={m.pegawai.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}.</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {m.pegawai.id}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 uppercase">
                      {m.pegawai.nama}
                      {m.pegawai.jabatan !== selectedJabatan && m.pegawai.jabatan && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Asal: {m.pegawai.jabatan}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{m.pegawai.jawatan || '-'}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      <div>{m.pegawai.emel || '-'}</div>
                      <div className="text-slate-400 font-mono">{m.pegawai.noHp || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">{m.utamaCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700">{m.bersamaCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDrillModal({
                            title: m.pegawai.nama,
                            subtitle: `${m.totalPrograms} Program di bawah ${selectedJabatan}`,
                            items: m.programs,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold tabular-nums cursor-pointer"
                      >
                        <span>{m.totalPrograms}</span>
                        <Eye className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. VISUALISASI DAN INFOGRAFIK SETIAP PEGAWAI                      */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            3. Visualisasi &amp; Infografik Pegawai
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Kad Infografik Prestasi &amp; Beban Tugas Setiap Pegawai
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSortedMetrics.map((m) => {
            const tot = Math.max(1, m.totalPrograms);
            const pctSelesai = (m.selesai / tot) * 100;
            const pctDalam = (m.dalamTindakan / tot) * 100;
            const pctTanggung = (m.tanggung / tot) * 100;
            const pctBelum = (m.belum / tot) * 100;
            const pctBatal = (m.batal / tot) * 100;

            return (
              <div
                key={m.pegawai.id}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:bg-white hover:border-teal-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                        {m.pegawai.id}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 truncate">
                        {m.pegawai.jawatan || 'PEGAWAI'}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase mt-1.5 line-clamp-2">
                      {m.pegawai.nama}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase block">Selesai</span>
                    <span className="text-sm font-black text-emerald-700 tabular-nums">{m.successRate}%</span>
                  </div>
                </div>

                {/* Utama / Bersama split */}
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-white border border-slate-200 rounded-lg p-2">
                    <span className="text-slate-400 text-[10px] block">Jumlah</span>
                    <strong className="text-slate-900 font-mono">{m.totalPrograms}</strong>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2">
                    <span className="text-slate-400 text-[10px] block">Utama</span>
                    <strong className="text-blue-700 font-mono">{m.utamaCount}</strong>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2">
                    <span className="text-slate-400 text-[10px] block">Bersama</span>
                    <strong className="text-indigo-700 font-mono">{m.bersamaCount}</strong>
                  </div>
                </div>

                {/* Stacked status bar */}
                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    {m.selesai > 0 && <div style={{ width: `${pctSelesai}%` }} className="bg-emerald-500" />}
                    {m.dalamTindakan > 0 && <div style={{ width: `${pctDalam}%` }} className="bg-blue-500" />}
                    {m.tanggung > 0 && <div style={{ width: `${pctTanggung}%` }} className="bg-amber-500" />}
                    {m.belum > 0 && <div style={{ width: `${pctBelum}%` }} className="bg-slate-400" />}
                    {m.batal > 0 && <div style={{ width: `${pctBatal}%` }} className="bg-rose-500" />}
                  </div>
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-slate-600">
                    <span>Selesai: <strong>{m.selesai}</strong></span>
                    <span>Tindakan: <strong>{m.dalamTindakan}</strong></span>
                    <span>Tanggung: <strong>{m.tanggung}</strong></span>
                    <span>Batal: <strong>{m.batal}</strong></span>
                  </div>
                </div>

                {/* Financial snapshot */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Peruntukan:</span>
                    <strong className="font-mono text-slate-900">{formatRMWithPrefix(m.peruntukan)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Belanja Sebenar:</span>
                    <strong className="font-mono text-emerald-700">{formatRMWithPrefix(m.belanja)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Peserta / Hari:</span>
                    <strong className="font-mono text-slate-800">{formatNumber(m.peserta)} org / {m.hari} hr</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDrillModal({
                      title: m.pegawai.nama,
                      subtitle: `${m.totalPrograms} Program di bawah ${selectedJabatan}`,
                      items: m.programs,
                    })
                  }
                  className="w-full py-1.5 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Senarai Program Pegawai</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. VISUALISASI COMPARISON SETIAP PEGAWAI                          */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            4. Visualisasi Perbandingan Pegawai
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Perbandingan Prestasi, Kewangan &amp; Impak Antara Pegawai Jabatan
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart A: Program Count */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Perbandingan Bilangan Program Mengikut Pegawai</span>
            </h4>
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredSortedMetrics.map((m) => {
                const wPct = (m.totalPrograms / maxOffProg) * 100;
                const sPct = m.totalPrograms > 0 ? (m.selesai / m.totalPrograms) * 100 : 0;
                return (
                  <div key={m.pegawai.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 truncate pr-2">{m.pegawai.nama}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {m.totalPrograms} ({m.selesai} Selesai)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div style={{ width: `${wPct}%` }} className="h-full bg-blue-500 flex">
                        <div style={{ width: `${sPct}%` }} className="h-full bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart B: Financial Comparison */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Perbandingan Peruntukan vs Belanja Sebenar (RM)</span>
            </h4>
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredSortedMetrics.map((m) => {
                const pW = (m.peruntukan / maxOffBudget) * 100;
                const bW = (m.belanja / maxOffBudget) * 100;
                return (
                  <div key={m.pegawai.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 truncate pr-2">{m.pegawai.nama}</span>
                      <span className="font-mono text-[10px] text-slate-700 shrink-0">
                        {formatRMWithPrefix(m.peruntukan)} / <strong className="text-emerald-700">{formatRMWithPrefix(m.belanja)}</strong>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
                        <div style={{ width: `${pW}%` }} className="h-full bg-amber-500 rounded" />
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
                        <div style={{ width: `${bW}%` }} className="h-full bg-emerald-600 rounded" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart C: Participants & Success */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Perbandingan Peserta &amp; Kadar Kejayaan Pelaksanaan Mengikut Pegawai</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSortedMetrics.map((m) => (
              <div key={m.pegawai.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 truncate pr-2">{m.pegawai.nama}</span>
                  <span className="font-mono font-bold text-purple-700 shrink-0">
                    {formatNumber(m.peserta)} org · {m.successRate}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(m.peserta / maxOffPeserta) * 100}%` }}
                    className="h-full bg-purple-600 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. RUMUSAN SETIAP PEGAWAI MENGIKUT STATUS & PERUNTUKAN            */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              5. Rumusan Pegawai Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Rumusan Setiap Pegawai Mengikut Status Program, Peruntukan &amp; Sebagainya
            </h3>
          </div>

          <button
            type="button"
            onClick={handleExportRumusanJabatan}
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
                <th className="py-3 px-2.5 text-center">BIL</th>
                <th className="py-3 px-2.5">ID</th>
                <th className="py-3 px-3 min-w-[180px]">NAMA PEGAWAI</th>
                <th className="py-3 px-2 text-center">UTAMA</th>
                <th className="py-3 px-2 text-center">BERSAMA</th>
                <th className="py-3 px-2 text-center">JUMLAH</th>
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
                <th className="py-3 px-2.5 text-center">% SELESAI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSortedMetrics.map((m, idx) => (
                <tr key={m.pegawai.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-2.5 text-center font-mono text-slate-500">{idx + 1}.</td>
                  <td className="py-2.5 px-2.5 font-mono font-bold text-slate-700">{m.pegawai.id}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 uppercase">
                    <button
                      type="button"
                      onClick={() =>
                        setDrillModal({
                          title: m.pegawai.nama,
                          subtitle: `${m.totalPrograms} Program di bawah ${selectedJabatan}`,
                          items: m.programs,
                        })
                      }
                      className="text-left hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {m.pegawai.nama}
                    </button>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-blue-700 font-bold">{m.utamaCount}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-indigo-700 font-bold">{m.bersamaCount}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-black text-slate-900">{m.totalPrograms}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">{m.selesai}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-blue-700">{m.dalamTindakan}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-amber-700">{m.tanggung}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-600">{m.belum}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-rose-700">{m.batal}</td>
                  <td className="py-2.5 px-2 text-right font-mono">{formatNumber(m.peserta)}</td>
                  <td className="py-2.5 px-2 text-right font-mono">{formatNumber(m.hari)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">{formatRM(m.peruntukan)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">{formatRM(m.belanja)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700">{formatRM(m.penjimatan)}</td>
                  <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900">{m.successRate}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                <td colSpan={3} className="py-3.5 px-3 text-right uppercase">
                  RUMUSAN SEBENAR JABATAN (UNIK PROGRAM):
                </td>
                <td colSpan={2} className="py-3.5 px-2 text-center text-[10px] text-slate-500">
                  {jabatanOfficers.length} Pegawai
                </td>
                <td className="py-3.5 px-2 text-center font-mono">{jabatanTotals.totalPrograms}</td>
                <td className="py-3.5 px-2 text-center font-mono text-emerald-700">{jabatanTotals.selesai}</td>
                <td className="py-3.5 px-2 text-center font-mono text-blue-700">{jabatanTotals.dalamTindakan}</td>
                <td className="py-3.5 px-2 text-center font-mono text-amber-700">{jabatanTotals.tanggung}</td>
                <td className="py-3.5 px-2 text-center font-mono">{jabatanTotals.belum}</td>
                <td className="py-3.5 px-2 text-center font-mono text-rose-700">{jabatanTotals.batal}</td>
                <td className="py-3.5 px-2 text-right font-mono">{formatNumber(jabatanTotals.peserta)}</td>
                <td className="py-3.5 px-2 text-right font-mono">{formatNumber(jabatanTotals.hari)}</td>
                <td className="py-3.5 px-3 text-right font-mono">{formatRMWithPrefix(jabatanTotals.peruntukan)}</td>
                <td className="py-3.5 px-3 text-right font-mono text-emerald-800">{formatRMWithPrefix(jabatanTotals.belanja)}</td>
                <td className="py-3.5 px-3 text-right font-mono text-amber-800">{formatRMWithPrefix(jabatanTotals.penjimatan)}</td>
                <td className="py-3.5 px-2.5 text-center font-mono">{jabatanTotals.successRate}%</td>
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
                      className="p-3.5 border border-slate-200 rounded-xl hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
                          {p.tempoh} · Pengurus: {p.pengurusNama} · Bersama: {p.pengurusBersamaNama || '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-900 block">
                          {formatRMWithPrefix(p.jumlahRm)}
                        </span>
                        <span className="text-[10px] text-teal-600 font-semibold">Klik untuk perincian →</span>
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
