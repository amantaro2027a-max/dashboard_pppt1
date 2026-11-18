import React, { useState, useMemo, useEffect } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem, Pegawai, PullbackSourceType, MessageTopik } from '../types/program';
import { formatRM, formatRMWithPrefix, formatNumber, getStatusConfig } from '../utils/formatters';
import { getCurrentFinanceYear, getProgramYear } from '../utils/financeYear';
import { deduplicateProgramsByCode, getProgramDedupeKey } from '../utils/programDedupe';
import {
  getProgramFinanceAggregate,
  getPeruntukanDiluluskanStats,
  computeJabatanFinanceSummary,
} from '../utils/financeCalculations';
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
  Wallet,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PusatJabatanChatSection } from './PusatJabatanChatSection';
import { DashboardJabatanSection } from './DashboardJabatanSection';

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
    fasaPeruntukanList,
    sumberKewanganList,
    jabatanAllocations,
    jabatanPullbacks,
    pusatJabatanMessages,
    addJabatanPullback,
    sendPusatJabatanMessage,
    deletePusatJabatanMessage,
    showNotification,
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
  const canManageJabatanReturn = Boolean(
    currentUser && (isSuperAdmin || currentUser.levelId === 'KETUA_JABATAN')
  );
  const canUsePusatJabatanChat = Boolean(
    currentUser &&
      (isSuperAdmin ||
        currentUser.levelId === 'KETUA_JABATAN' ||
        currentUser.levelId === 'KETUA_PUSAT')
  );

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
  const [filterTahun, setFilterTahun] = useState<string>(() => String(getCurrentFinanceYear()));
  const [officerSearch, setOfficerSearch] = useState<string>('');
  const [sortKey, setSortKey] = useState<'id' | 'nama' | 'totalPrograms' | 'selesai' | 'peruntukan' | 'successRate'>('totalPrograms');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [drillModal, setDrillModal] = useState<{
    title: string;
    subtitle?: string;
    items: ProgramItem[];
  } | null>(null);

  const [pulangModal, setPulangModal] = useState<{
    sumberBaki: PullbackSourceType;
    tahun: number;
    maxOs: { os21000: number; os24000: number; os27000: number; os29000: number };
    os21000: number;
    os24000: number;
    os27000: number;
    os29000: number;
    tarikh: string;
    catatan: string;
  } | null>(null);

  const [chatTopik, setChatTopik] = useState<MessageTopik>('BAKI');
  const [chatText, setChatText] = useState<string>('');

  // By default hide all sections except Section 1 (1. Nama Jabatan) and Dashboard Jabatan
  const [expandedSections, setExpandedSections] = useState<{
    dashboardJabatan: boolean;
    kewangan: boolean;
    chat: boolean;
    s2: boolean;
    s3: boolean;
    s4: boolean;
    s5: boolean;
  }>({
    dashboardJabatan: true,
    kewangan: false,
    chat: false,
    s2: false,
    s3: false,
    s4: false,
    s5: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    if (foundProg?.pusat) return foundProg.pusat;
    const foundAlloc = (jabatanAllocations || []).find(
      (a) => a.jabatan === selectedJabatan && a.pusat
    );
    return foundAlloc?.pusat || '-';
  }, [selectedJabatan, jabatanMap, programs, jabatanAllocations]);

  const availableYears = useMemo(() => {
    const set = new Set<string>([
      String(getCurrentFinanceYear()),
      ...programs.map((p) => String(getProgramYear(p))),
      ...(jabatanAllocations || []).map((a) => String(a.tahun)),
      ...(jabatanPullbacks || []).map((pb) => String(pb.tahun)),
    ]);
    return Array.from(set).sort().reverse();
  }, [programs, jabatanAllocations, jabatanPullbacks]);

  const effectiveActionYear =
    filterTahun === 'SEMUA'
      ? getCurrentFinanceYear()
      : Number(filterTahun) || getCurrentFinanceYear();

  const jabatanSummary = useMemo(() => {
    return computeJabatanFinanceSummary(
      selectedJabatan,
      filterTahun,
      programs,
      jabatanAllocations,
      jabatanPullbacks,
      parentPusat !== '-' ? parentPusat : undefined
    );
  }, [selectedJabatan, filterTahun, programs, jabatanAllocations, jabatanPullbacks, parentPusat]);

  // Autohide OS yang bernilai 0.00 daripada Page Peruntukan bagi Pusat induk
  const peruntukanPusatStats = useMemo(() => {
    const scopePusats = parentPusat && parentPusat !== '-' ? [parentPusat] : null;
    return getPeruntukanDiluluskanStats(
      fasaPeruntukanList,
      sumberKewanganList,
      scopePusats,
      filterTahun === 'SEMUA' ? 'SEMUA' : filterTahun
    );
  }, [fasaPeruntukanList, sumberKewanganList, parentPusat, filterTahun]);

  const activeOsList = useMemo(
    () => OS_META.filter((osItem) => (peruntukanPusatStats.overall[osItem.key] || 0) > 0),
    [peruntukanPusatStats]
  );

  const jabatanMessages = useMemo(() => {
    if (!canUsePusatJabatanChat || !selectedJabatan) return [];
    const jabUpper = selectedJabatan.trim().toUpperCase();
    return (pusatJabatanMessages || [])
      .filter((m) => {
        if ((m.jabatan || '').trim().toUpperCase() !== jabUpper) return false;
        if (filterTahun !== 'SEMUA' && String(m.tahun) !== filterTahun) return false;
        return true;
      })
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }, [canUsePusatJabatanChat, selectedJabatan, pusatJabatanMessages, filterTahun]);

  const openPulangModal = (sumberBaki: PullbackSourceType) => {
    if (!selectedJabatan) return;
    const yrSummary = computeJabatanFinanceSummary(
      selectedJabatan,
      effectiveActionYear,
      programs,
      jabatanAllocations,
      jabatanPullbacks,
      parentPusat !== '-' ? parentPusat : undefined
    );
    const maxSource =
      sumberBaki === 'ASAL' ? yrSummary.availableTarikAsal : yrSummary.availableTarikPenjimatan;

    setPulangModal({
      sumberBaki,
      tahun: effectiveActionYear,
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

  const handleConfirmPulang = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pulangModal || !selectedJabatan) return;
    const pusTarget = parentPusat !== '-' ? parentPusat : currentUser?.pusat || '';
    if (!pusTarget) {
      showNotification({
        type: 'error',
        title: 'Pusat Induk Tidak Dikenalpasti',
        message: 'Tidak dapat memulangkan peruntukan kerana Pusat Induk bagi jabatan ini tiada.',
      });
      return;
    }

    const res = addJabatanPullback({
      pusat: pusTarget,
      jabatan: selectedJabatan,
      tahun: pulangModal.tahun,
      jenisTindakan: 'PULANGKAN',
      sumberBaki: pulangModal.sumberBaki,
      tarikh: pulangModal.tarikh || new Date().toISOString().slice(0, 10),
      os21000: Number(pulangModal.os21000) || 0,
      os24000: Number(pulangModal.os24000) || 0,
      os27000: Number(pulangModal.os27000) || 0,
      os29000: Number(pulangModal.os29000) || 0,
      catatan: pulangModal.catatan.trim(),
    });

    if (!res.success) {
      showNotification({
        type: 'error',
        title: 'Gagal Memulangkan Baki',
        message: res.message || 'Pemulangan baki tidak berjaya.',
      });
      return;
    }

    setPulangModal(null);
    showNotification({
      type: 'success',
      title: 'Pemulangan Baki Berjaya',
      message: res.message || 'Baki telah berjaya dipulangkan ke Pusat untuk agihan semula.',
    });
  };

  const handleSendJabatanMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJabatan) return;
    const pusTarget = parentPusat !== '-' ? parentPusat : currentUser?.pusat || '';
    const res = sendPusatJabatanMessage({
      pusat: pusTarget,
      jabatan: selectedJabatan,
      tahun: effectiveActionYear,
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

  const allJabatanPrograms = useMemo(() => {
    if (!selectedJabatan) return [];
    return deduplicateProgramsByCode(programs.filter((p) => p.jabatan === selectedJabatan));
  }, [programs, selectedJabatan]);

  const jabatanPrograms = useMemo(() => {
    if (!selectedJabatan) return [];
    return deduplicateProgramsByCode(
      programs.filter((p) => {
        if (p.jabatan !== selectedJabatan) return false;
        if (filterTahun !== 'SEMUA' && String(getProgramYear(p)) !== filterTahun) return false;
        return true;
      })
    );
  }, [programs, selectedJabatan, filterTahun]);

  // Officers belonging to selectedJabatan (plus any managing/supporting programs under it)
  const jabatanOfficers = useMemo(() => {
    if (!selectedJabatan) return [];
    const byId = new Map<string, Pegawai>();
    pegawaiList.forEach((pg) => {
      if (pg.jabatan === selectedJabatan) {
        byId.set(pg.id, pg);
      }
    });
    // Also include officers who lead/co-lead/support programs in this Jabatan
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
        const matchUrusSetia =
          (idNorm && (p.urusSetiaId || '').trim().toUpperCase() === idNorm) ||
          (nmNorm && (p.urusSetiaNama || '').trim().toUpperCase() === nmNorm);
        if ((matchUtama || matchBersama || matchUrusSetia) && !byId.has(pg.id)) {
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
      const seenProgKeys = new Set<string>();
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
          const pKey = getProgramDedupeKey(p);
          if (!seenProgKeys.has(pKey)) {
            seenProgKeys.add(pKey);
            matchedProgs.push(p);
          }
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
        }
      });

      const fin = getProgramFinanceAggregate(matchedProgs, true);
      const peruntukan = fin.diagihkan.total;
      const belanja = fin.belanja.total;
      const penjimatan = fin.penjimatan.total;

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
      }
    });

    const fin = getProgramFinanceAggregate(jabatanPrograms, true);
    const peruntukan = fin.diagihkan.total;
    const belanja = fin.belanja.total;
    const penjimatan = fin.penjimatan.total;

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
      'Peruntukan Diagihkan (RM)': m.peruntukan,
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-4 border-t border-slate-800">
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
          <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-blue-300 block">Peruntukan Diluluskan</span>
            <span className="text-sm font-black text-blue-200 tabular-nums mt-1 block">
              {formatRMWithPrefix(jabatanSummary.diluluskan.total)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Peruntukan Diagihkan</span>
            <span className="text-sm font-black text-amber-300 tabular-nums mt-1 block">
              {formatRMWithPrefix(jabatanTotals.peruntukan)}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Belanja</span>
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
      {/* DASHBOARD JABATAN (DEFAULT PAPAR)                                 */}
      {/* ================================================================= */}
      <DashboardJabatanSection
        selectedJabatan={selectedJabatan}
        filterTahun={filterTahun}
        jabatanPrograms={jabatanPrograms}
        allJabatanPrograms={allJabatanPrograms}
        jabatanOfficers={jabatanOfficers}
        allPegawaiList={pegawaiList}
        isExpanded={expandedSections.dashboardJabatan}
        onToggleExpand={() => toggleSection('dashboardJabatan')}
        onViewProgram={viewProgramDetail}
        onDrillDown={(title, subtitle, items) => setDrillModal({ title, subtitle, items })}
      />

      {/* ================================================================= */}
      {/* KEWANGAN JABATAN (PECAHAN OS & PULANGKAN BAKI)                   */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('kewangan')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Kewangan Jabatan · Pecahan Objek Sebagai (OS)
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-teal-600" />
              <span>KEWANGAN JABATAN ({selectedJabatan || '-'})</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              JUMLAH BAKI TERKINI menjadi rujukan had peruntukan semasa Ketua Jabatan mendaftar program baharu.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">JUMLAH BAKI TERKINI</span>
              <span className="text-sm sm:text-base font-black text-teal-800 font-mono tabular-nums">
                {formatRMWithPrefix(jabatanSummary.jumlahBakiTerkini.total)}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap">
              <span>{expandedSections.kewangan ? 'Sembunyi' : 'Papar'}</span>
              {expandedSections.kewangan ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
        </button>

        {expandedSections.kewangan && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-5">
            {activeOsList.length === 0 && (
              <div className="px-3.5 py-2.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl">
                Tiada pecahan OS menerima peruntukan (&gt; RM 0.00) daripada Page Peruntukan bagi Pusat Induk dan tahun yang dipilih. Lajur OS bernilai 0.00 disembunyikan secara automatik.
              </div>
            )}

            {/* Jadual Pecahan OS KEWANGAN JABATAN */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 text-left min-w-[240px]">BUTIRAN KEWANGAN JABATAN</th>
                    {activeOsList.map((osItem) => (
                      <th key={osItem.key} className="py-3 px-3 text-right">
                        {osItem.label} (RM)
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right bg-slate-800">JUMLAH (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-blue-50/40">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      Peruntukan Diluluskan
                      <span className="ml-2 text-[11px] font-semibold text-blue-700">
                        ({jabatanSummary.agihanCount} kali agihan)
                      </span>
                    </td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.diluluskan[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-black text-blue-900 bg-blue-50/60">
                      {formatRM(jabatanSummary.diluluskan.total)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Peruntukan Diagihkan
                      <span className="ml-2 text-[11px] font-normal text-slate-500">
                        ({jabatanSummary.programCount} program · BK65)
                      </span>
                    </td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.diagihkan[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50">
                      {formatRM(jabatanSummary.diagihkan.total)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Perbelanjaan Sebenar
                      <span className="ml-2 text-[11px] font-normal text-slate-500">
                        ({jabatanSummary.programCount} program)
                      </span>
                    </td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.belanjaSebenar[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700 bg-emerald-50/40">
                      {formatRM(jabatanSummary.belanjaSebenar.total)}
                    </td>
                  </tr>

                  <tr className="bg-amber-50/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span>Baki (asal)</span>
                          <span className="block text-[10px] font-normal text-slate-500">
                            Peruntukan Diluluskan - Peruntukan Diagihkan
                          </span>
                        </div>
                        {canManageJabatanReturn && (
                          <button
                            type="button"
                            disabled={jabatanSummary.availableTarikAsal.total <= 0}
                            onClick={() => openPulangModal('ASAL')}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded bg-amber-600 hover:bg-amber-700 text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                          >
                            PULANGKAN
                          </button>
                        )}
                      </div>
                    </td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.bakiAsal[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-800 bg-amber-50/60">
                      {formatRM(jabatanSummary.bakiAsal.total)}
                    </td>
                  </tr>

                  <tr className="bg-teal-50/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span>Baki (Penjimatan)</span>
                          <span className="block text-[10px] font-normal text-slate-500">
                            Peruntukan Diagihkan - Perbelanjaan Sebenar
                          </span>
                        </div>
                        {canManageJabatanReturn && (
                          <button
                            type="button"
                            disabled={jabatanSummary.availableTarikPenjimatan.total <= 0}
                            onClick={() => openPulangModal('PENJIMATAN')}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded bg-amber-600 hover:bg-amber-700 text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                          >
                            PULANGKAN
                          </button>
                        )}
                      </div>
                    </td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.bakiPenjimatan[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-teal-800 bg-teal-50/60">
                      {formatRM(jabatanSummary.bakiPenjimatan.total)}
                    </td>
                  </tr>

                  <tr className="bg-slate-100 font-bold">
                    <td className="py-2.5 px-3 text-slate-900 uppercase">JUMLAH BAKI</td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.jumlahBaki[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-black text-slate-900">
                      {formatRM(jabatanSummary.jumlahBaki.total)}
                    </td>
                  </tr>

                  <tr className="text-rose-800">
                    <td className="py-2.5 px-3 font-semibold">
                      Peruntukan Ditarik
                      <span className="ml-2 text-[11px] font-normal text-rose-600">
                        ({jabatanSummary.pullbackCount} rekod)
                      </span>
                    </td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.ditarik[osItem.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold bg-rose-50/50">
                      {formatRM(jabatanSummary.ditarik.total)}
                    </td>
                  </tr>

                  <tr className="bg-slate-900 text-white font-black">
                    <td className="py-3 px-3 uppercase tracking-wide">
                      JUMLAH BAKI TERKINI
                      <span className="block text-[10px] font-normal text-slate-300">
                        JUMLAH BAKI - Peruntukan Ditarik
                      </span>
                    </td>
                    {activeOsList.map((osItem) => (
                      <td key={osItem.key} className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatRM(jabatanSummary.jumlahBakiTerkini[osItem.key])}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-300 bg-slate-800">
                      {formatRM(jabatanSummary.jumlahBakiTerkini.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Rekod Agihan Diterima & Rekod Penarikan/Pemulangan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Rekod Agihan Diterima daripada Ketua Pusat ({jabatanSummary.agihanCount})
                </h4>
                {jabatanSummary.agihanRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">Tiada agihan diterima buat masa ini.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {jabatanSummary.agihanRecords.map((rec, idx) => (
                      <div
                        key={rec.id}
                        className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">
                            Agihan #{idx + 1} · Tarikh: <span className="font-mono">{rec.tarikh}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {activeOsList.length > 0
                              ? activeOsList
                                  .map((o) => `${o.shortLabel}:${formatRM(rec[o.key])}`)
                                  .join(' | ')
                              : 'Tiada pecahan OS aktif'}
                          </span>
                          {rec.catatan && (
                            <span className="block text-[10px] text-slate-500 italic">{rec.catatan}</span>
                          )}
                        </div>
                        <span className="font-mono font-black text-blue-900 shrink-0 tabular-nums">
                          {formatRMWithPrefix(rec.jumlah)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-rose-600" />
                  <span>Rekod Penarikan / Pemulangan Baki ({jabatanSummary.pullbackCount})</span>
                </h4>
                {jabatanSummary.pullbackRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">Tiada rekod penarikan atau pemulangan baki.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {jabatanSummary.pullbackRecords.map((pb) => (
                      <div
                        key={pb.id}
                        className="bg-white border border-rose-200 rounded-lg p-2.5 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                pb.jenisTindakan === 'TARIK'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {pb.jenisTindakan}
                            </span>
                            <span className="font-bold text-slate-800">
                              {pb.sumberBaki === 'ASAL' ? 'Baki (asal)' : 'Baki (Penjimatan)'}
                            </span>
                            <span className="font-mono text-slate-500">· {pb.tarikh}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                            {activeOsList.length > 0
                              ? activeOsList
                                  .map((o) => `${o.shortLabel}:${formatRM(pb[o.key])}`)
                                  .join(' | ')
                              : 'Tiada pecahan OS aktif'}
                          </span>
                          {pb.catatan && (
                            <span className="block text-[10px] text-slate-500 italic">{pb.catatan}</span>
                          )}
                        </div>
                        <span className="font-mono font-black text-rose-800 shrink-0 tabular-nums">
                          {formatRMWithPrefix(pb.jumlah)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* KOMUNIKASI EKSLUSIF KETUA JABATAN & KETUA PUSAT                   */}
      {/* ================================================================= */}
      {canUsePusatJabatanChat && (
        <PusatJabatanChatSection
          mode="jabatan"
          isExpanded={expandedSections.chat}
          onToggleExpand={() => toggleSection('chat')}
          title={`Komunikasi Baki, Penarikan & Pemulangan dengan Ketua Pusat (${parentPusat})`}
          subtitle={`Saluran rasmi antara Ketua Jabatan ${selectedJabatan || '-'} dan Ketua Pusat ${parentPusat}.`}
          messages={jabatanMessages}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          chatTopik={chatTopik}
          onChangeChatTopik={setChatTopik}
          chatText={chatText}
          onChangeChatText={setChatText}
          onSendMessage={handleSendJabatanMessage}
          onDeleteMessage={deletePusatJabatanMessage}
          onNotify={showNotification}
        />
      )}

      {/* ================================================================= */}
      {/* 2. PEGAWAI-PEGAWAI DI BAWAH JABATAN                               */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s2')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
              2. Senarai Pegawai Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Pegawai-Pegawai di Bawah {selectedJabatan} ({filteredSortedMetrics.length} Orang)
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap self-end sm:self-center">
            <span>{expandedSections.s2 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s2 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s2 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-end">
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
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 3. VISUALISASI DAN INFOGRAFIK SETIAP PEGAWAI                      */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s3')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              3. Visualisasi &amp; Infografik Pegawai
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Kad Infografik Prestasi &amp; Beban Tugas Setiap Pegawai
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap self-end sm:self-center">
            <span>{expandedSections.s3 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s3 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s3 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100">
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
                    <span className="text-slate-500">Peruntukan Diagihkan:</span>
                    <strong className="font-mono text-slate-900">{formatRMWithPrefix(m.peruntukan)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Belanja:</span>
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
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 4. VISUALISASI COMPARISON SETIAP PEGAWAI                          */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s4')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              4. Visualisasi Perbandingan Pegawai
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Perbandingan Prestasi, Kewangan &amp; Impak Antara Pegawai Jabatan
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap self-end sm:self-center">
            <span>{expandedSections.s4 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s4 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s4 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-6">
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
              <span>Perbandingan Peruntukan Diagihkan vs Belanja (RM)</span>
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
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 5. RUMUSAN SETIAP PEGAWAI MENGIKUT STATUS & PERUNTUKAN            */}
      {/* ================================================================= */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s5')}
          className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              5. Rumusan Pegawai Jabatan
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Rumusan Setiap Pegawai Mengikut Status Program, Peruntukan &amp; Sebagainya
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap self-end sm:self-center">
            <span>{expandedSections.s5 ? 'Sembunyi' : 'Papar'}</span>
            {expandedSections.s5 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {expandedSections.s5 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExportRumusanJabatan}
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
                <th className="py-3 px-3 text-right">PERUNTUKAN DIAGIHKAN (RM)</th>
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

      {/* ================================================================= */}
      {/* PULANGKAN BAKI JABATAN WARNING CONFIRMATION MODAL                 */}
      {/* ================================================================= */}
      {pulangModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmPulang}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-100 block">
                  Peringatan &amp; Pengesahan Pemulangan Baki
                </span>
                <h4 className="text-sm font-black uppercase tracking-wide mt-0.5">
                  PULANGKAN {pulangModal.sumberBaki === 'ASAL' ? 'Baki (asal)' : 'Baki (Penjimatan)'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPulangModal(null)}
                className="p-1.5 text-amber-100 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Amaran Sebelum Pengesahan:</p>
                  <p className="leading-relaxed">
                    Anda bakal memulangkan{' '}
                    <strong>{pulangModal.sumberBaki === 'ASAL' ? 'Baki (asal)' : 'Baki (Penjimatan)'}</strong>{' '}
                    daripada <strong>{selectedJabatan}</strong> (Tahun {pulangModal.tahun}) kepada{' '}
                    <strong>{parentPusat}</strong>. Jumlah ini akan ditolak daripada{' '}
                    <strong>JUMLAH BAKI TERKINI</strong> Jabatan dan dikembalikan ke Baki Pusat untuk agihan semula.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">Tahun</label>
                  <input
                    type="number"
                    value={pulangModal.tahun}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">Tarikh Pemulangan</label>
                  <input
                    type="date"
                    required
                    value={pulangModal.tarikh}
                    onChange={(e) => setPulangModal({ ...pulangModal, tarikh: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(activeOsList.length > 0
                  ? activeOsList
                  : OS_META.filter((o) => pulangModal.maxOs[o.key] > 0)
                ).map((osItem) => {
                  const osKey = osItem.key;
                  return (
                    <div key={osKey}>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1 uppercase">
                        {osItem.label} (Maks: RM {formatRM(pulangModal.maxOs[osKey])})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={pulangModal.maxOs[osKey]}
                        step="0.01"
                        value={pulangModal[osKey]}
                        onChange={(e) =>
                          setPulangModal({
                            ...pulangModal,
                            [osKey]: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full px-3 py-2 font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 text-slate-900"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-lg">
                <span className="font-bold uppercase text-[11px]">Jumlah Bakal Dipulangkan</span>
                <span className="text-sm font-black font-mono text-amber-300">
                  {formatRMWithPrefix(
                    pulangModal.os21000 +
                      pulangModal.os24000 +
                      pulangModal.os27000 +
                      pulangModal.os29000
                  )}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 text-[11px] mb-1">Catatan (Pilihan)</label>
                <input
                  type="text"
                  value={pulangModal.catatan}
                  onChange={(e) => setPulangModal({ ...pulangModal, catatan: e.target.value })}
                  placeholder="cth: Baki tidak diperlukan / lebihan penjimatan program"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPulangModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                Sahkan Pemulangan (PULANGKAN)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
