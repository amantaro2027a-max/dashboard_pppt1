import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Info,
  Sparkles,
  ChevronRight,
  Clock,
  Coins,
} from 'lucide-react';
import { ProgramItem } from '../../types/program';
import { formatRM } from '../../utils/formatters';

interface AnnouncementBoardProps {
  programs: ProgramItem[];
  onSelectRiskFilter?: (riskType: 'deficit' | 'high_util' | 'pending_lo' | 'all') => void;
  onViewProgram?: (prog: ProgramItem) => void;
}

export const AnnouncementBoard: React.FC<AnnouncementBoardProps> = ({
  programs,
  onSelectRiskFilter,
  onViewProgram,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Compute automated alerts dynamically from database
  const deficitPrograms = programs.filter(
    (p) => (Number(p.jumlahBelanjaRm) || 0) > (Number(p.jumlahRm) || 0)
  );

  const highUtilPrograms = programs.filter((p) => {
    const alloc = Number(p.jumlahRm) || 0;
    const spend = Number(p.jumlahBelanjaRm) || 0;
    if (alloc <= 0) return false;
    const util = (spend / alloc) * 100;
    return util >= 90 && util <= 100;
  });

  const pendingLoPrograms = programs.filter(
    (p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG'
  );

  const completedPrograms = programs.filter(
    (p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI'
  );

  const amendedPrograms = programs.filter(
    (p) => (p.rekodPindaan && p.rekodPindaan.length > 0)
  );

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/80 mb-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Papan Pengumuman &amp; Amaran Automatik
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Sistem Pengurusan Eksekutif PPPT
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              Notis Eksekutif &amp; Pemantauan Risiko Masa Nyata
            </h2>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="self-start sm:self-auto text-xs text-indigo-300 hover:text-white font-medium px-3 py-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-700/50 transition-colors cursor-pointer"
        >
          {isExpanded ? 'Sembunyikan Butiran Notis' : 'Papar Butiran Notis'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-4">
          {/* Main Executive Memo */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-200 leading-relaxed">
              <span className="font-bold text-white block mb-0.5 text-sm">
                Memo Eksekutif: Sasaran Pelaksanaan Program PPPT Tahun Semasa
              </span>
              Semua program dan bengkel di bawah Pusat Pembangunan dan Pengurusan Teknologi (PPPT) dipantau secara langsung menerusi Dashboard Bersepadu ini. Sila pastikan pelaporan perbelanjaan sebenar (OS21, OS24, OS27, OS29) dan rekod pindaan BK04 dikemaskini tepat pada masanya bagi tujuan pengauditan dan pematuhan tadbir urus IAB.
            </div>
          </div>

          {/* Quick Alert Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Deficit Alert */}
            <div
              onClick={() => onSelectRiskFilter && onSelectRiskFilter('deficit')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                deficitPrograms.length > 0
                  ? 'bg-rose-950/40 border-rose-800/60 hover:bg-rose-950/60 hover:border-rose-600'
                  : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Perbelanjaan Defisit
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    deficitPrograms.length > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {deficitPrograms.length}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                {deficitPrograms.length > 0
                  ? `${deficitPrograms.length} program mencatatkan perbelanjaan melebihi peruntukan diluluskan.`
                  : 'Tiada program mengalami defisit kewangan.'}
              </p>
            </div>

            {/* High Util Alert */}
            <div
              onClick={() => onSelectRiskFilter && onSelectRiskFilter('high_util')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                highUtilPrograms.length > 0
                  ? 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-950/60 hover:border-amber-600'
                  : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Utiliti Tinggi (&ge;90%)
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    highUtilPrograms.length > 0
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {highUtilPrograms.length}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                {highUtilPrograms.length > 0
                  ? `${highUtilPrograms.length} program telah membelanjakan 90% ke atas daripada peruntukan.`
                  : 'Semua program berada dalam zon utiliti berwaspada.'}
              </p>
            </div>

            {/* Pending LO (Tanggung) Alert */}
            <div
              onClick={() => onSelectRiskFilter && onSelectRiskFilter('pending_lo')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                pendingLoPrograms.length > 0
                  ? 'bg-sky-950/40 border-sky-800/60 hover:bg-sky-950/60 hover:border-sky-600'
                  : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Komitmen LO (Tanggung)
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    pendingLoPrograms.length > 0
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {pendingLoPrograms.length}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                {pendingLoPrograms.length > 0
                  ? `${pendingLoPrograms.length} aktiviti berstatus Tanggung dengan komitmen LO belum selesai.`
                  : 'Tiada komitmen LO tertunggak.'}
              </p>
            </div>

            {/* BK04 Governance Alert */}
            <div
              className="p-3.5 rounded-xl border bg-purple-950/40 border-purple-800/60 hover:bg-purple-950/60 hover:border-purple-600 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  Rekod Pindaan BK04
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-500 text-white">
                  {amendedPrograms.length}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                {amendedPrograms.length > 0
                  ? `${amendedPrograms.length} program telah melalui proses pindaan rasmi (Tarikh/Tempat/Kewangan).`
                  : 'Semua program berjalan mengikut jadual asal tanpa pindaan BK04.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
