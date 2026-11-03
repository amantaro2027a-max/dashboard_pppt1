import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatNumber } from '../utils/formatters';
import { CheckCircle2, Clock, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

export const FlashCardsGroup2: React.FC = () => {
  const { group2Stats, filteredPrograms, setFilter, filters } = useProgramContext();
  const total = filteredPrograms.length || 1;

  const cards = [
    {
      id: 'selesai',
      statusKey: 'SELESAI',
      title: 'Bilangan Selesai',
      value: group2Stats.bilanganSelesai,
      percentage: Math.round((group2Stats.bilanganSelesai / total) * 100),
      desc: 'Sempurna & selesai laksana',
      icon: CheckCircle2,
      textColor: 'text-emerald-900',
      valueColor: 'text-emerald-950',
      bgColor: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      id: 'dalam_tindakan',
      statusKey: 'DALAM TINDAKAN',
      title: 'Bilangan Dalam Tindakan',
      value: group2Stats.bilanganDalamTindakan,
      percentage: Math.round((group2Stats.bilanganDalamTindakan / total) * 100),
      desc: 'Sedang giat dijalankan',
      icon: Clock,
      textColor: 'text-sky-900',
      valueColor: 'text-sky-950',
      bgColor: 'bg-gradient-to-br from-sky-50 via-white to-sky-50/40',
      borderColor: 'border-sky-200 hover:border-sky-300',
      iconBg: 'bg-sky-600 text-white',
    },
    {
      id: 'tanggung',
      statusKey: 'TANGGUNG',
      title: 'Bilangan Tanggung',
      value: group2Stats.bilanganTanggung,
      percentage: Math.round((group2Stats.bilanganTanggung / total) * 100),
      desc: 'Penjadualan semula tarikh',
      icon: AlertTriangle,
      textColor: 'text-amber-900',
      valueColor: 'text-amber-950',
      bgColor: 'bg-gradient-to-br from-amber-50 via-white to-amber-50/40',
      borderColor: 'border-amber-200 hover:border-amber-300',
      iconBg: 'bg-amber-600 text-white',
    },
    {
      id: 'belum_ambil_tindakan',
      statusKey: 'BELUM AMBIL TINDAKAN',
      title: 'Bilangan Belum Ambil Tindakan',
      value: group2Stats.bilanganBelumAmbilTindakan,
      percentage: Math.round((group2Stats.bilanganBelumAmbilTindakan / total) * 100),
      desc: 'Perancangan fasa awalan',
      icon: HelpCircle,
      textColor: 'text-indigo-900',
      valueColor: 'text-indigo-950',
      bgColor: 'bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-600 text-white',
    },
    {
      id: 'batal',
      statusKey: 'BATAL',
      title: 'Bilangan Batal',
      value: group2Stats.bilanganBatal,
      percentage: Math.round((group2Stats.bilanganBatal / total) * 100),
      desc: 'Tidak dilaksanakan',
      icon: XCircle,
      textColor: 'text-rose-900',
      valueColor: 'text-rose-950',
      bgColor: 'bg-gradient-to-br from-rose-50 via-white to-rose-50/40',
      borderColor: 'border-rose-200 hover:border-rose-300',
      iconBg: 'bg-rose-600 text-white',
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Status Pelaksanaan Program
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Flash card status aktiviti: Selesai, Dalam Tindakan, Tanggung, Belum Ambil Tindakan, dan Batal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = filters.status === card.statusKey;

          return (
            <button
              key={card.id}
              onClick={() => {
                if (isSelected) {
                  setFilter('status', '');
                } else {
                  setFilter('status', card.statusKey);
                }
              }}
              className={`text-left p-4 rounded-lg border transition-all ${card.borderColor} ${card.bgColor} ${
                isSelected ? 'ring-2 ring-slate-900 shadow-sm' : 'hover:shadow-xs'
              } flex flex-col justify-between cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${card.textColor} line-clamp-1`}>
                  {card.title}
                </span>
                <div className={`w-6 h-6 rounded-md ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold tabular-nums tracking-tight ${card.valueColor}`}>
                    {formatNumber(card.value)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium tabular-nums">
                    ({card.percentage}%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {card.desc}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{isSelected ? 'Klik untuk batal penapis' : 'Klik untuk tapis status'}</span>
                <span className="text-xs font-semibold">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
