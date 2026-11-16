import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { useProgramContext } from '../context/ProgramContext';
import { getCurrentFinanceYear } from '../utils/financeYear';

interface FinanceYearTabsProps {
  accentColor?: 'emerald' | 'teal' | 'amber' | 'blue';
  subtitle?: string;
}

export const FinanceYearTabs: React.FC<FinanceYearTabsProps> = ({
  accentColor = 'blue',
  subtitle,
}) => {
  const {
    selectedFinanceYear,
    setSelectedFinanceYear,
    availableFinanceYears,
  } = useProgramContext();

  const currentYear = getCurrentFinanceYear();

  const activeButtonClass =
    accentColor === 'emerald'
      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
      : accentColor === 'teal'
      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
      : accentColor === 'amber'
      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
      : 'bg-slate-900 text-white border-slate-900 shadow-xs';

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 sm:px-5 py-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Penapis Tahun Kewangan
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              <RefreshCw className="w-2.5 h-2.5 text-emerald-600" />
              <span>Disegerakkan: Tahun {selectedFinanceYear}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {subtitle ||
              'Pilih tab tahun untuk menapis & menyegerakkan data merentas halaman Peruntukan, Perbelanjaan, Subwaran dan Baki Peruntukan.'}
          </p>
        </div>
      </div>

      {/* Year Tabs + Quick Select */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Pilih Tahun Kewangan">
          {availableFinanceYears.map((yr) => {
            const isActive = yr === selectedFinanceYear;
            const isCurrent = yr === currentYear;
            return (
              <button
                key={yr}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedFinanceYear(yr)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? activeButtonClass
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="font-mono">{yr}</span>
                {isCurrent && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      isActive
                        ? accentColor === 'amber'
                          ? 'bg-slate-900/15 text-slate-950'
                          : 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Semasa
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <select
          aria-label="Pilih Tahun Kewangan"
          value={selectedFinanceYear}
          onChange={(e) => setSelectedFinanceYear(Number(e.target.value))}
          className="text-xs font-semibold py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
        >
          {availableFinanceYears.map((yr) => (
            <option key={yr} value={yr}>
              Tahun {yr} {yr === currentYear ? '(Semasa)' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
