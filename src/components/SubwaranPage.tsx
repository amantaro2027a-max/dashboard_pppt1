import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { SubwaranRecord, PtjOption } from '../types/program';
import { formatRMWithPrefix, formatRM } from '../utils/formatters';
import {
  Share2,
  Plus,
  ShieldAlert,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

const PTJ_OPTIONS: PtjOption[] = [
  'IABCGH',
  'IABCU',
  'IABCSWK',
  'IABCSBH',
  'JPN',
  'PPD',
  'IPG',
  'KV',
  'LAIN-LAIN',
];

interface BahagianSubwaranCardProps {
  bahagianIndex: number;
  sumberKewangan: string;
  subwaranItems: SubwaranRecord[];
  onOpenCreateModal: (sumberKewangan: string) => void;
  onOpenEditModal: (item: SubwaranRecord) => void;
  onRequestDelete: (item: SubwaranRecord) => void;
}

const BahagianSubwaranCard: React.FC<BahagianSubwaranCardProps> = ({
  bahagianIndex,
  sumberKewangan,
  subwaranItems,
  onOpenCreateModal,
  onOpenEditModal,
  onRequestDelete,
}) => {
  // Sembunyi bahagian ini as a default
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Filter items for this Sumber Kewangan
  const relevantItems = useMemo(() => {
    return subwaranItems.filter((s) => s.sumberKewangan === sumberKewangan);
  }, [subwaranItems, sumberKewangan]);

  // Compute totals
  const totals = useMemo(() => {
    let t21 = 0;
    let t24 = 0;
    let t27 = 0;
    let t29 = 0;

    relevantItems.forEach((item) => {
      t21 += Number(item.os21000) || 0;
      t24 += Number(item.os24000) || 0;
      t27 += Number(item.os27000) || 0;
      t29 += Number(item.os29000) || 0;
    });

    return {
      os21: t21,
      os24: t24,
      os27: t27,
      os29: t29,
      grand: t21 + t24 + t27 + t29,
    };
  }, [relevantItems]);

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden mb-8 transition-all hover:border-slate-400">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-amber-600/30 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                Bahagian {bahagianIndex}
              </span>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                PERUNTUKAN DISUBWARAN
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Sumber Kewangan {bahagianIndex}:</span>
              <strong className="text-amber-400 font-bold uppercase">{sumberKewangan}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Disubwaran
            </span>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {formatRMWithPrefix(totals.grand)}
            </span>
          </div>

          {/* Sembunyi / Papar Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'Papar Bahagian Ini' : 'Sembunyi Bahagian Ini'}
          >
            <span>{isCollapsed ? 'Papar' : 'Sembunyi'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-6 space-y-4">
          {/* Action Bar & Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>Senarai nama PTJ yang disubwaran:</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pecahan agihan peruntukan mengikut kod Objek Sebagai (OS) kepada Pusat Tanggungjawab (PTJ).
              </p>
            </div>

            <button
              onClick={() => onOpenCreateModal(sumberKewangan)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>DAFTAR SUB WARAN PERUNTUKAN INI</span>
            </button>
          </div>

          {/* Table */}
          {relevantItems.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-xs">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>Tiada rekod subwaran didaftarkan di bawah sumber kewangan <strong>{sumberKewangan}</strong> setakat ini.</p>
              <button
                onClick={() => onOpenCreateModal(sumberKewangan)}
                className="mt-3 text-xs font-bold text-amber-700 hover:underline cursor-pointer"
              >
                + Klik di sini untuk Daftar Sub Waran Baharu
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">BIL.</th>
                    <th className="py-3 px-3 min-w-[140px]">NAMA PTJ</th>
                    <th className="py-3 px-3 w-28">TARIKH SUB WARAN</th>
                    <th className="py-3 px-3 min-w-[200px]">NAMA PROGRAM &amp; PIC</th>
                    <th className="py-3 px-3 w-32 text-right">OS21000: AUTOFILL</th>
                    <th className="py-3 px-3 w-32 text-right">OS24000: AUTOFILL</th>
                    <th className="py-3 px-3 w-32 text-right">OS27000: AUTOFILL</th>
                    <th className="py-3 px-3 w-32 text-right">OS29000: AUTOFILL</th>
                    <th className="py-3 px-4 w-36 text-right bg-amber-50/70 font-bold text-amber-950">
                      JUMLAH (RM)
                    </th>
                    <th className="py-3 px-3 w-20 text-center">TINDAKAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantItems.map((item, idx) => {
                    const os21 = Number(item.os21000) || 0;
                    const os24 = Number(item.os24000) || 0;
                    const os27 = Number(item.os27000) || 0;
                    const os29 = Number(item.os29000) || 0;
                    const rowSum = item.jumlah !== undefined ? Number(item.jumlah) : os21 + os24 + os27 + os29;

                    const isNonIAB = !item.namaPtj.startsWith('IAB');

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500">
                          {idx + 1}.
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 uppercase">
                              {item.namaPtj}
                            </span>
                            {isNonIAB && (
                              <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-semibold">
                                Luar IAB
                              </span>
                            )}
                          </div>
                          {item.ptjLain && (
                            <span className="text-[11px] text-slate-600 block mt-0.5 italic">
                              ({item.ptjLain})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {item.tarikhSubWaran || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 uppercase block line-clamp-2">
                            {item.namaProgram}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                            <span>PIC:</span>
                            <strong className="text-slate-700">{item.pegawaiPic}</strong>
                          </div>
                          {item.objektif && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1 italic">
                              {item.objektif}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os21)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os24)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os27)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os29)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-950 bg-amber-50/40">
                          {formatRMWithPrefix(rowSum)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenEditModal(item)}
                              title="Kemaskini Subwaran"
                              className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onRequestDelete(item)}
                              title="Hapus Subwaran"
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                    <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-right">
                      JUMLAH TELAH DISUBWARAN:
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os21)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os24)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os27)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os29)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-300 bg-slate-950 text-sm">
                      {formatRMWithPrefix(totals.grand)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SubwaranPage: React.FC = () => {
  const {
    currentUser,
    setActiveTab,
    sumberKewanganList,
    subwaranList,
    addSubwaran,
    updateSubwaran,
    deleteSubwaran,
    pegawaiList,
  } = useProgramContext();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canAccess = isSuperAdmin || (currentUser?.role === 'ADMIN' && currentUser.allowedPages?.includes('SUBWARAN'));

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubwaranRecord | null>(null);

  // Form Fields
  const [formSumberKewangan, setFormSumberKewangan] = useState<string>('');
  const [formNamaPtj, setFormNamaPtj] = useState<PtjOption>('IABCGH');
  const [formPtjLain, setFormPtjLain] = useState<string>('');
  const [formTarikhSubwaran, setFormTarikhSubwaran] = useState<string>('');
  const [formOs21000, setFormOs21000] = useState<number | string>(0);
  const [formOs24000, setFormOs24000] = useState<number | string>(0);
  const [formOs27000, setFormOs27000] = useState<number | string>(0);
  const [formOs29000, setFormOs29000] = useState<number | string>(0);
  const [formNamaProgram, setFormNamaProgram] = useState<string>('');
  const [formObjektif, setFormObjektif] = useState<string>('');
  const [formPegawaiPic, setFormPegawaiPic] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SubwaranRecord | null>(null);

  // SECTION 1: PERUNTUKAN SUBWARAN KESELURUHAN Stats
  const keseluruhanStats = useMemo(() => {
    const bySumber: Record<
      string,
      { os21: number; os24: number; os27: number; os29: number; grand: number; count: number }
    > = {};

    let grand21 = 0;
    let grand24 = 0;
    let grand27 = 0;
    let grand29 = 0;
    let totalAgihan = 0;

    sumberKewanganList.forEach((sk) => {
      let s21 = 0;
      let s24 = 0;
      let s27 = 0;
      let s29 = 0;
      let count = 0;

      subwaranList.forEach((item) => {
        if (item.sumberKewangan === sk) {
          s21 += Number(item.os21000) || 0;
          s24 += Number(item.os24000) || 0;
          s27 += Number(item.os27000) || 0;
          s29 += Number(item.os29000) || 0;
          count++;
        }
      });

      const rowSum = s21 + s24 + s27 + s29;
      bySumber[sk] = {
        os21: s21,
        os24: s24,
        os27: s27,
        os29: s29,
        grand: rowSum,
        count,
      };

      grand21 += s21;
      grand24 += s24;
      grand27 += s27;
      grand29 += s29;
      totalAgihan += count;
    });

    return {
      bySumber,
      grandTotals: {
        os21: grand21,
        os24: grand24,
        os27: grand27,
        os29: grand29,
        grand: grand21 + grand24 + grand27 + grand29,
        totalAgihan,
      },
    };
  }, [sumberKewanganList, subwaranList]);

  // Form Auto Total
  const calculatedFormTotal = useMemo(() => {
    const n21 = Number(formOs21000) || 0;
    const n24 = Number(formOs24000) || 0;
    const n27 = Number(formOs27000) || 0;
    const n29 = Number(formOs29000) || 0;
    return n21 + n24 + n27 + n29;
  }, [formOs21000, formOs24000, formOs27000, formOs29000]);

  // Open Create Modal - Clear all info by default & OS as 0.00
  const handleOpenCreateModal = (sk: string) => {
    setEditingItem(null);
    setFormSumberKewangan(sk);
    setFormNamaPtj('IABCGH');
    setFormPtjLain('');
    setFormTarikhSubwaran('');
    setFormOs21000('0.00');
    setFormOs24000('0.00');
    setFormOs27000('0.00');
    setFormOs29000('0.00');
    setFormNamaProgram('');
    setFormObjektif('');
    setFormPegawaiPic('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: SubwaranRecord) => {
    setEditingItem(item);
    setFormSumberKewangan(item.sumberKewangan);
    setFormNamaPtj(item.namaPtj);
    setFormPtjLain(item.ptjLain || '');
    setFormTarikhSubwaran(item.tarikhSubWaran || '');
    setFormOs21000(item.os21000);
    setFormOs24000(item.os24000);
    setFormOs27000(item.os27000);
    setFormOs29000(item.os29000);
    setFormNamaProgram(item.namaProgram);
    setFormObjektif(item.objektif || '');
    setFormPegawaiPic(item.pegawaiPic || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Save
  const handleSaveSubwaran = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formNamaPtj) {
      setFormError('Sila pilih Nama PTJ.');
      return;
    }

    if (!formNamaProgram.trim()) {
      setFormError('Sila masukkan Nama Program.');
      return;
    }

    if (!formTarikhSubwaran) {
      setFormError('Sila pilih Tarikh Sub Waran.');
      return;
    }

    if (!formPegawaiPic.trim()) {
      setFormError('Sila pilih atau masukkan Pegawai PIC.');
      return;
    }

    const payload = {
      sumberKewangan: formSumberKewangan,
      namaPtj: formNamaPtj,
      ptjLain: formPtjLain.trim() || undefined,
      tarikhSubWaran: formTarikhSubwaran,
      os21000: Number(formOs21000) || 0,
      os24000: Number(formOs24000) || 0,
      os27000: Number(formOs27000) || 0,
      os29000: Number(formOs29000) || 0,
      jumlah: calculatedFormTotal,
      namaProgram: formNamaProgram.trim().toUpperCase(),
      objektif: formObjektif.trim() || undefined,
      pegawaiPic: formPegawaiPic.trim(),
    };

    if (editingItem) {
      const res = updateSubwaran(editingItem.id, payload);
      if (!res.success) {
        setFormError(res.message || 'Gagal mengemaskini subwaran.');
        return;
      }
    } else {
      const res = addSubwaran(payload);
      if (!res.success) {
        setFormError(res.message || 'Gagal menambah subwaran.');
        return;
      }
    }

    setIsModalOpen(false);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSubwaran(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Super Admin & Allowed Admin Restriction Gate
  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-rose-50">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Akses Dihadkan · Super Admin Sahaja
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-4 tracking-tight">
            Pengurusan Subwaran Peruntukan (IAB)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Halaman ini hanya boleh diakses oleh <strong>Super Admin (Kuasa Penuh)</strong> bagi
            mengurus dan mendaftarkan pengagihan sub waran peruntukan ke PTJ luar dan cawangan.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('admin')}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Log Masuk Sebagai Super Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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
      {/* Page Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Pengurusan Sub Waran Peruntukan Kewangan IAB
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Pendaftaran dan pemantauan peruntukan yang diagihkan / disubwaran kepada PTJ Cawangan IAB, JPN, PPD, IPG, dan KV.
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Disubwaran
            </span>
            <span className="text-base font-bold text-amber-400 font-mono">
              {formatRMWithPrefix(keseluruhanStats.grandTotals.grand)}
            </span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Agihan PTJ
            </span>
            <span className="text-base font-bold text-white font-mono">
              {keseluruhanStats.grandTotals.totalAgihan} Rekod
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: PERUNTUKAN SUBWARAN KESELURUHAN
         ========================================================================= */}
      <div className="bg-white border-2 border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  PERUNTUKAN SUBWARAN KESELURUHAN
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Autofill Automatik
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Jumlah amaun peruntukan disubwaran bagi semua Bahagian mengikut Sumber Kewangan Induk.
              </p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Keseluruhan Disubwaran
            </span>
            <span className="text-base font-bold text-amber-300 font-mono">
              {formatRMWithPrefix(keseluruhanStats.grandTotals.grand)}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">BIL</th>
                <th className="py-3 px-4 min-w-[240px]">NAMA SUMBER KEWANGAN (DATA INDUK)</th>
                <th className="py-3 px-4 w-40 text-right">OS21000: AUTOFILL (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS24000: AUTOFILL (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS27000: AUTOFILL (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS29000: AUTOFILL (RM)</th>
                <th className="py-3 px-5 w-48 text-right bg-amber-50/70 text-amber-950">
                  JUMLAH BESAR (RM)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sumberKewanganList.map((sk, index) => {
                const row = keseluruhanStats.bySumber[sk] || {
                  os21: 0,
                  os24: 0,
                  os27: 0,
                  os29: 0,
                  grand: 0,
                  count: 0,
                };
                return (
                  <tr key={sk} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 uppercase block">
                        {sk}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Sumber Kewangan {index + 1} · ({row.count} agihan PTJ)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os21)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os24)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os27)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os29)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-amber-950 bg-amber-50/40 text-xs">
                      {formatRMWithPrefix(row.grand)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                <td colSpan={2} className="py-4 px-4 uppercase tracking-wider text-right">
                  JUMLAH KESELURUHAN (SEMUA SUMBER KEWANGAN):
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os21)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os24)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os27)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os29)}
                </td>
                <td className="py-4 px-5 text-right font-mono text-amber-300 bg-slate-950 text-sm">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.grand)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* =========================================================================
          SECTIONS FOR EACH SUMBER KEWANGAN (BAHAGIAN 1, BAHAGIAN 2, DLL.)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-slate-600" />
              <span>Agihan Peruntukan Disubwaran Mengikut Sumber Kewangan</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap bahagian boleh dibuka atau disembunyikan. Klik butang &quot;DAFTAR SUB WARAN PERUNTUKAN INI&quot; untuk menambah agihan baharu.
            </p>
          </div>
        </div>

        {sumberKewanganList.map((sk, idx) => (
          <BahagianSubwaranCard
            key={sk}
            bahagianIndex={idx + 1}
            sumberKewangan={sk}
            subwaranItems={subwaranList}
            onOpenCreateModal={handleOpenCreateModal}
            onOpenEditModal={handleOpenEditModal}
            onRequestDelete={(item) => setDeleteTarget(item)}
          />
        ))}
      </div>

      {/* =========================================================================
          MODAL: DAFTAR / KEMASKINI SUB WARAN PERUNTUKAN
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    {editingItem ? 'KEMASKINI SUB WARAN PERUNTUKAN' : 'DAFTAR SUB WARAN PERUNTUKAN INI'}
                  </h3>
                  <span className="text-[11px] text-amber-400 font-semibold uppercase">
                    Sumber Kewangan: {formSumberKewangan}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSubwaran} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid 1: Nama PTJ & Jika Selain IAB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nama PTJ: (drop down) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    1. Nama PTJ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formNamaPtj}
                    onChange={(e) => setFormNamaPtj(e.target.value as PtjOption)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    {PTJ_OPTIONS.map((ptj) => (
                      <option key={ptj} value={ptj}>
                        {ptj}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pilih daripada cawangan IAB atau PTJ luar (JPN, PPD, IPG, KV, LAIN-LAIN)
                  </p>
                </div>

                {/* 2. Jika selain IAB (Nyatakan): */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    2. Jika selain IAB (Nyatakan):
                  </label>
                  <input
                    type="text"
                    value={formPtjLain}
                    onChange={(e) => setFormPtjLain(e.target.value)}
                    placeholder="Contoh: JPN Selangor / PPD Kinta Utara / IPG Kampus Darulaman"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nyatakan nama khusus agensi luar yang menerima subwaran
                  </p>
                </div>
              </div>

              {/* Grid 2: Tarikh Sub Waran & Pegawai PIC */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    3. Tarikh Sub Waran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTarikhSubwaran}
                    onChange={(e) => setFormTarikhSubwaran(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    4. Pegawai PIC <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPegawaiPic}
                    onChange={(e) => setFormPegawaiPic(e.target.value)}
                    placeholder="Masukkan nama Pegawai PIC"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Grid 3: Nama Program & Objektif */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  5. Nama Program <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNamaProgram}
                  onChange={(e) => setFormNamaProgram(e.target.value)}
                  placeholder="Contoh: KURSUS KEPIMPINAN INSTRUKSIONAL PEMIMPIN PENDIDIKAN"
                  className="w-full px-3 py-2 text-xs uppercase border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  6. Objektif (Pilihan):
                </label>
                <textarea
                  rows={2}
                  value={formObjektif}
                  onChange={(e) => setFormObjektif(e.target.value)}
                  placeholder="Keterangan ringkas tujuan atau justifikasi pengagihan subwaran..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Pecahan OS Subwaran */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Pecahan Agihan Mengikut Objek Sebagai (OS)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      JUMLAH (AUTO):
                    </span>
                    <span className="text-xs font-bold font-mono text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded">
                      {formatRMWithPrefix(calculatedFormTotal)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      OS21000 (RM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formOs21000}
                      onChange={(e) => setFormOs21000(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      OS24000 (RM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formOs24000}
                      onChange={(e) => setFormOs24000(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      OS27000 (RM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formOs27000}
                      onChange={(e) => setFormOs27000(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      OS29000 (RM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formOs29000}
                      onChange={(e) => setFormOs29000(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer uppercase tracking-wider"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Kemaskini Subwaran' : 'Simpan Subwaran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRM DELETE MODAL
         ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border-2 border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase">
              Hapus Rekod Subwaran?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Adakah anda pasti untuk menghapuskan rekod subwaran kepada PTJ{' '}
              <strong>{deleteTarget.namaPtj}</strong> ({deleteTarget.namaProgram}) berjumlah{' '}
              <strong>{formatRMWithPrefix(deleteTarget.jumlah)}</strong>? Tindakan ini tidak boleh diundur.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
