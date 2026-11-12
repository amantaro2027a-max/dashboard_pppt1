import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { OsAllocation, FasaPeruntukanRecord } from '../types/program';
import { formatRMWithPrefix } from '../utils/formatters';
import {
  Wallet,
  ShieldAlert,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Layers,
  Calculator,
  Lock,
  Unlock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
} from 'lucide-react';

interface FasaCardProps {
  fasa: FasaPeruntukanRecord;
  sumberKewanganList: string[];
  onSave: (fasaId: string, allocations: Record<string, OsAllocation>) => void;
  onRequestDelete?: (fasa: FasaPeruntukanRecord) => void;
  canDelete: boolean;
}

const FasaCard: React.FC<FasaCardProps> = ({
  fasa,
  sumberKewanganList,
  onSave,
  onRequestDelete,
  canDelete,
}) => {
  // Local state for edits
  const [localAllocations, setLocalAllocations] = useState<Record<string, OsAllocation>>(() => {
    const initial: Record<string, OsAllocation> = {};
    sumberKewanganList.forEach((sk) => {
      const existing = fasa.allocations?.[sk];
      initial[sk] = {
        os21000: existing?.os21000 || 0,
        os24000: existing?.os24000 || 0,
        os27000: existing?.os27000 || 0,
        os29000: existing?.os29000 || 0,
      };
    });
    return initial;
  });

  // Collapse/Hide state for this Fasa (Default: Sembunyi Fasa)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Edit locking / dimming state:
  // When false, data is locked / dimmed (not editable).
  // When true, user can edit the inputs.
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync if external fasa changes (e.g. from database reload)
  React.useEffect(() => {
    const updated: Record<string, OsAllocation> = {};
    sumberKewanganList.forEach((sk) => {
      const existing = fasa.allocations?.[sk];
      updated[sk] = {
        os21000: existing?.os21000 || 0,
        os24000: existing?.os24000 || 0,
        os27000: existing?.os27000 || 0,
        os29000: existing?.os29000 || 0,
      };
    });
    setLocalAllocations(updated);
  }, [fasa, sumberKewanganList]);

  const handleInputChange = (
    sk: string,
    field: keyof OsAllocation,
    valStr: string
  ) => {
    setSavedSuccess(false);
    const num = Math.max(0, parseFloat(valStr) || 0);
    setLocalAllocations((prev) => ({
      ...prev,
      [sk]: {
        ...(prev[sk] || { os21000: 0, os24000: 0, os27000: 0, os29000: 0 }),
        [field]: num,
      },
    }));
  };

  // Totals for this fasa
  const fasaTotals = useMemo(() => {
    let t21 = 0;
    let t24 = 0;
    let t27 = 0;
    let t29 = 0;
    sumberKewanganList.forEach((sk) => {
      const alloc = localAllocations[sk] || { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
      t21 += alloc.os21000 || 0;
      t24 += alloc.os24000 || 0;
      t27 += alloc.os27000 || 0;
      t29 += alloc.os29000 || 0;
    });
    return {
      os21: t21,
      os24: t24,
      os27: t27,
      os29: t29,
      grand: t21 + t24 + t27 + t29,
    };
  }, [localAllocations, sumberKewanganList]);

  // Handle Button Click:
  // "Apabila dah simpan, data akan dim/tak boleh edit kecuali tekan semula butang tersebut sekali lagi."
  const handleButtonClick = () => {
    if (isEditing) {
      // Save data and lock / dim fields
      onSave(fasa.id, localAllocations);
      setIsEditing(false);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 4000);
    } else {
      // Unlock fields for re-editing
      setIsEditing(true);
      setSavedSuccess(false);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden mb-6 transition-all hover:border-slate-400">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer"
            title={isCollapsed ? 'Papar Bahagian Ini' : 'Sembunyi / Collapse Bahagian Ini'}
          >
            <Wallet className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                {fasa.nama}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  isEditing
                    ? 'bg-amber-400 text-slate-950 border border-amber-300'
                    : 'bg-emerald-600/30 border border-emerald-400/40 text-emerald-300'
                }`}
              >
                {isEditing ? 'Mod Suntingan Aktif' : 'Disimpan / Terkunci (Dim)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEditing
                ? 'Sila masukkan atau kemaskini amaun agihan pecahan OS bagi setiap Sumber Kewangan.'
                : 'Data agihan fasa ini dikunci. Tekan butang di bawah untuk membuka semula mod suntingan.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah {fasa.nama}
            </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {formatRMWithPrefix(fasaTotals.grand)}
            </span>
          </div>

          {canDelete && onRequestDelete && (
            <button
              onClick={() => onRequestDelete(fasa)}
              className="p-2 text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors cursor-pointer"
              title={`Hapus ${fasa.nama}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'Papar Fasa' : 'Sembunyi Fasa'}
          >
            <span>{isCollapsed ? 'Papar' : 'Sembunyi'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">BIL</th>
                  <th className="py-3 px-4 min-w-[240px]">NAMA SUMBER KEWANGAN (DATA INDUK)</th>
                  <th className="py-3 px-3 w-40 text-right">OS21000 (RM)</th>
                  <th className="py-3 px-3 w-40 text-right">OS24000 (RM)</th>
                  <th className="py-3 px-3 w-40 text-right">OS27000 (RM)</th>
                  <th className="py-3 px-3 w-40 text-right">OS29000 (RM)</th>
                  <th className="py-3 px-4 w-44 text-right bg-slate-200/50">JUMLAH (RM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sumberKewanganList.map((sk, index) => {
                  const alloc = localAllocations[sk] || { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
                  const rowTotal =
                    (alloc.os21000 || 0) +
                    (alloc.os24000 || 0) +
                    (alloc.os27000 || 0) +
                    (alloc.os29000 || 0);

                  return (
                    <tr
                      key={sk}
                      className={`transition-colors ${
                        !isEditing ? 'bg-slate-50/50 hover:bg-slate-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 uppercase block">
                          {sk}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Sumber Kewangan #{index + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isEditing}
                          value={alloc.os21000 === 0 ? '' : alloc.os21000}
                          placeholder="0.00"
                          onChange={(e) => handleInputChange(sk, 'os21000', e.target.value)}
                          className={`w-full text-right py-1.5 px-2 rounded font-mono font-medium text-xs border ${
                            !isEditing
                              ? 'bg-slate-100/90 text-slate-500 opacity-70 cursor-not-allowed border-slate-200 select-none'
                              : 'bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isEditing}
                          value={alloc.os24000 === 0 ? '' : alloc.os24000}
                          placeholder="0.00"
                          onChange={(e) => handleInputChange(sk, 'os24000', e.target.value)}
                          className={`w-full text-right py-1.5 px-2 rounded font-mono font-medium text-xs border ${
                            !isEditing
                              ? 'bg-slate-100/90 text-slate-500 opacity-70 cursor-not-allowed border-slate-200 select-none'
                              : 'bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isEditing}
                          value={alloc.os27000 === 0 ? '' : alloc.os27000}
                          placeholder="0.00"
                          onChange={(e) => handleInputChange(sk, 'os27000', e.target.value)}
                          className={`w-full text-right py-1.5 px-2 rounded font-mono font-medium text-xs border ${
                            !isEditing
                              ? 'bg-slate-100/90 text-slate-500 opacity-70 cursor-not-allowed border-slate-200 select-none'
                              : 'bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isEditing}
                          value={alloc.os29000 === 0 ? '' : alloc.os29000}
                          placeholder="0.00"
                          onChange={(e) => handleInputChange(sk, 'os29000', e.target.value)}
                          className={`w-full text-right py-1.5 px-2 rounded font-mono font-medium text-xs border ${
                            !isEditing
                              ? 'bg-slate-100/90 text-slate-500 opacity-70 cursor-not-allowed border-slate-200 select-none'
                              : 'bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-3 px-4 text-right bg-slate-50/60 font-mono font-bold text-slate-900">
                        {formatRMWithPrefix(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-[11px]">
                  <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider text-right">
                    Jumlah Keseluruhan ({fasa.nama}):
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                    {formatRMWithPrefix(fasaTotals.os21)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                    {formatRMWithPrefix(fasaTotals.os24)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                    {formatRMWithPrefix(fasaTotals.os27)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                    {formatRMWithPrefix(fasaTotals.os29)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-800 bg-emerald-50/70 text-xs">
                    {formatRMWithPrefix(fasaTotals.grand)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer with Action Button */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {savedSuccess ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Peruntukan {fasa.nama} berjaya disimpan! Data kini dikunci (dim). Tekan butang di sebelah jika ingin menyunting semula.
                </span>
              ) : isEditing ? (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                  Mod suntingan aktif. Selesai memasukkan amaun, tekan butang di sebelah untuk mengemaskini dan menyimpan.
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Data fasa ini sedang dikunci (dim). Tekan butang di sebelah untuk membuka semula borang bagi mengemaskini.
                </span>
              )}
            </div>

            <button
              onClick={handleButtonClick}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
                isEditing
                  ? 'text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 ring-2 ring-emerald-500/40'
                  : 'text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950'
              }`}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 text-emerald-300" />
                  <span>Kemaskini dan Simpan {fasa.nama} Sahaja</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>Kemaskini dan Simpan {fasa.nama} Sahaja</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const PeruntukanPage: React.FC = () => {
  const {
    currentUser,
    pegawaiList,
    setActiveTab,
    sumberKewanganList,
    fasaPeruntukanList,
    updateFasaPeruntukan,
    addFasaPeruntukan,
    deleteFasaPeruntukan,
  } = useProgramContext();

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State for in-app deletion confirmation modal (Reliable in iFrame)
  const [fasaToDelete, setFasaToDelete] = useState<FasaPeruntukanRecord | null>(null);

  // Super Admin Check & Page Permission Check
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canAccess = isSuperAdmin || (currentUser?.role === 'ADMIN' && currentUser.allowedPages?.includes('PERUNTUKAN'));

  // Calculate PERUNTUKAN KESELURUHAN (Autofill across all active phases)
  const peruntukanKeseluruhan = useMemo(() => {
    const bySumber: Record<
      string,
      { os21: number; os24: number; os27: number; os29: number; grand: number }
    > = {};

    let grand21 = 0;
    let grand24 = 0;
    let grand27 = 0;
    let grand29 = 0;

    sumberKewanganList.forEach((sk) => {
      let s21 = 0;
      let s24 = 0;
      let s27 = 0;
      let s29 = 0;

      fasaPeruntukanList.forEach((fasa) => {
        const alloc = fasa.allocations?.[sk];
        if (alloc) {
          s21 += alloc.os21000 || 0;
          s24 += alloc.os24000 || 0;
          s27 += alloc.os27000 || 0;
          s29 += alloc.os29000 || 0;
        }
      });

      const rowSum = s21 + s24 + s27 + s29;
      bySumber[sk] = {
        os21: s21,
        os24: s24,
        os27: s27,
        os29: s29,
        grand: rowSum,
      };

      grand21 += s21;
      grand24 += s24;
      grand27 += s27;
      grand29 += s29;
    });

    return {
      bySumber,
      grandTotals: {
        os21: grand21,
        os24: grand24,
        os27: grand27,
        os29: grand29,
        grand: grand21 + grand24 + grand27 + grand29,
      },
    };
  }, [sumberKewanganList, fasaPeruntukanList]);

  // Handle Save specific Fasa
  const handleSaveFasa = (fasaId: string, allocations: Record<string, OsAllocation>) => {
    const res = updateFasaPeruntukan(fasaId, allocations);
    if (res.success) {
      setNotification({
        type: 'success',
        message: 'Peruntukan fasa berjaya dikemaskini dan disimpan ke pangkalan data!',
      });
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification({
        type: 'error',
        message: res.message || 'Gagal menyimpan peruntukan fasa.',
      });
    }
  };

  // Handle Add New Fasa
  const handleAddNewFasa = () => {
    const newFasaNum = fasaPeruntukanList.length + 1;
    const res = addFasaPeruntukan(`PERUNTUKAN FASA ${newFasaNum}`);
    if (res.success) {
      setNotification({
        type: 'success',
        message: `PERUNTUKAN FASA ${newFasaNum} berjaya ditambah! Anda kini boleh memasukkan peruntukan secara manual.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification({
        type: 'error',
        message: res.message || 'Gagal menambah fasa baharu.',
      });
    }
  };

  // Confirmed Delete Fasa Action (Triggered from modal)
  const handleConfirmDeleteFasa = () => {
    if (!fasaToDelete) return;
    const res = deleteFasaPeruntukan(fasaToDelete.id);
    if (res.success) {
      setNotification({
        type: 'success',
        message: `${fasaToDelete.nama} berjaya dihapuskan sepenuhnya!`,
      });
      setFasaToDelete(null);
      setTimeout(() => setNotification(null), 3500);
    } else {
      setNotification({
        type: 'error',
        message: res.message || 'Gagal menghapuskan fasa.',
      });
      setFasaToDelete(null);
    }
  };

  // If user cannot access, show restricted screen
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
            Pengurusan Peruntukan Fasa (IAB)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Halaman ini hanya boleh diakses oleh <strong>Super Admin (Kuasa Penuh)</strong> bagi
            menetapkan agihan peruntukan fasa dan sumber kewangan Institut Aminuddin Baki.
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
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Portal Pengurusan Peruntukan Fasa IAB
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Penetapan agihan peruntukan bagi Fasa 1, Fasa 2 dan fasa seterusnya mengikut Sumber Kewangan &amp; Kod OS.
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Peruntukan Keseluruhan
            </span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {formatRMWithPrefix(peruntukanKeseluruhan.grandTotals.grand)}
            </span>
          </div>

          <button
            onClick={handleAddNewFasa}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Tambah Fasa Baharu</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: PERUNTUKAN KESELURUHAN (AUTOFILL DARI SEMUA FASA)
         ========================================================================= */}
      <div className="bg-white border-2 border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  PERUNTUKAN KESELURUHAN
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Autofill Automatik
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pengiraan automatik jumlah amaun semua Fasa yang direkodkan (Fasa 1, Fasa 2 dan seterusnya).
              </p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Besar Keseluruhan
            </span>
            <span className="text-base font-bold text-amber-300 font-mono">
              {formatRMWithPrefix(peruntukanKeseluruhan.grandTotals.grand)}
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
                <th className="py-3 px-4 w-40 text-right">OS21000 (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS24000 (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS27000 (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS29000 (RM)</th>
                <th className="py-3 px-5 w-48 text-right bg-amber-50/70 text-amber-950">
                  JUMLAH BESAR (RM)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sumberKewanganList.map((sk, index) => {
                const row = peruntukanKeseluruhan.bySumber[sk] || {
                  os21: 0,
                  os24: 0,
                  os27: 0,
                  os29: 0,
                  grand: 0,
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
                        Sumber Kewangan {index + 1}
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
                  JUMLAH KESELURUHAN (SEMUA FASA):
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(peruntukanKeseluruhan.grandTotals.os21)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(peruntukanKeseluruhan.grandTotals.os24)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(peruntukanKeseluruhan.grandTotals.os27)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(peruntukanKeseluruhan.grandTotals.os29)}
                </td>
                <td className="py-4 px-5 text-right font-mono text-amber-300 bg-slate-950 text-sm">
                  {formatRMWithPrefix(peruntukanKeseluruhan.grandTotals.grand)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* =========================================================================
          SECTIONS FOR EACH FASA (PERUNTUKAN FASA 1, FASA 2, ETC.)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span>Agihan Peruntukan Mengikut Fasa</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap fasa boleh disembunyikan (collapse/hide) dan mempunyai fungsi kemaskini &amp; simpan tersendiri.
            </p>
          </div>

          <button
            onClick={handleAddNewFasa}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Fasa Baharu</span>
          </button>
        </div>

        {fasaPeruntukanList.map((fasa) => (
          <FasaCard
            key={fasa.id}
            fasa={fasa}
            sumberKewanganList={sumberKewanganList}
            onSave={handleSaveFasa}
            onRequestDelete={(targetFasa) => setFasaToDelete(targetFasa)}
            canDelete={fasa.id !== 'fasa_1' && fasa.id !== 'fasa_2'}
          />
        ))}

        {/* Prominent Add Next Phase Button */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center mx-auto">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Perlukan Fasa Tambahan?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Anda boleh menambah FASA 3, FASA 4 atau fasa seterusnya mengikut keperluan agihan peruntukan tahun semasa.
              </p>
            </div>
            <button
              onClick={handleAddNewFasa}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Fasa Baharu Seterusnya Secara Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PERINGATAN / CONFIRMATION MODAL FOR DELETING FASA
         ========================================================================= */}
      {fasaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            <div className="bg-rose-50 px-6 py-5 border-b border-rose-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Peringatan &amp; Pengesahan
                  </span>
                  <button
                    onClick={() => setFasaToDelete(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Hapuskan {fasaToDelete.nama}?
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Adakah anda pasti untuk menghapuskan rekod <strong>{fasaToDelete.nama}</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 leading-normal">
                <strong>Perhatian:</strong> Tindakan ini akan memadamkan keseluruhan rekod agihan pecahan OS bagi fasa ini dan mengemaskini semula pengiraan autofill pada Peruntukan Keseluruhan secara kekal.
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFasaToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFasa}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Fasa Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
