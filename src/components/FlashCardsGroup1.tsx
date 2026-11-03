import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatNumber } from '../utils/formatters';
import {
  CalendarDays,
  Layers,
  Users,
  Wallet,
  Clock,
  UserCheck,
} from 'lucide-react';

export const FlashCardsGroup1: React.FC = () => {
  const { group1Stats } = useProgramContext();

  const cards = [
    {
      id: 'bil_program',
      title: 'Bilangan Program',
      value: formatNumber(group1Stats.bilanganProgram),
      subtext: 'Aktiviti berdaftar',
      icon: CalendarDays,
      bgCard: 'bg-gradient-to-br from-blue-50/90 via-white to-blue-50/30',
      borderColor: 'border-blue-200 hover:border-blue-300',
      iconBg: 'bg-blue-600 text-white',
      titleColor: 'text-blue-900',
      valueColor: 'text-blue-950',
      subtextColor: 'text-blue-600/80',
    },
    {
      id: 'bil_jenis',
      title: 'Bilangan Jenis Program',
      value: formatNumber(group1Stats.bilanganJenisProgram),
      subtext: 'Daripada 22 jenis rasmi',
      icon: Layers,
      bgCard: 'bg-gradient-to-br from-purple-50/90 via-white to-purple-50/30',
      borderColor: 'border-purple-200 hover:border-purple-300',
      iconBg: 'bg-purple-600 text-white',
      titleColor: 'text-purple-900',
      valueColor: 'text-purple-950',
      subtextColor: 'text-purple-600/80',
    },
    {
      id: 'jum_peserta',
      title: 'Jumlah Peserta',
      value: formatNumber(group1Stats.jumlahPeserta),
      subtext: 'Orang peserta terlibat',
      icon: Users,
      bgCard: 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-600 text-white',
      titleColor: 'text-emerald-900',
      valueColor: 'text-emerald-950',
      subtextColor: 'text-emerald-600/80',
    },
    {
      id: 'bil_sumber',
      title: 'Bilangan Sumber Kewangan',
      value: formatNumber(group1Stats.bilanganSumberKewangan),
      subtext: 'Punca peruntukan aktif',
      icon: Wallet,
      bgCard: 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/30',
      borderColor: 'border-amber-200 hover:border-amber-300',
      iconBg: 'bg-amber-600 text-white',
      titleColor: 'text-amber-900',
      valueColor: 'text-amber-950',
      subtextColor: 'text-amber-700/80',
    },
    {
      id: 'jum_hari',
      title: 'Jumlah Hari Program',
      value: formatNumber(group1Stats.jumlahHariProgram),
      subtext: 'Hari latihan & mesyuarat',
      icon: Clock,
      bgCard: 'bg-gradient-to-br from-teal-50/90 via-white to-teal-50/30',
      borderColor: 'border-teal-200 hover:border-teal-300',
      iconBg: 'bg-teal-600 text-white',
      titleColor: 'text-teal-900',
      valueColor: 'text-teal-950',
      subtextColor: 'text-teal-700/80',
    },
    {
      id: 'purata_peserta',
      title: 'Purata Peserta',
      value: formatNumber(group1Stats.purataPeserta),
      subtext: 'Orang / program',
      icon: UserCheck,
      bgCard: 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/30',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-600 text-white',
      titleColor: 'text-indigo-900',
      valueColor: 'text-indigo-950',
      subtextColor: 'text-indigo-700/80',
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Prestasi Pelaksanaan Program
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Flash card metrik aktiviti program, kepelbagaian latihan, dan jangkauan penyertaan warga pendidik
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`${card.bgCard} ${card.borderColor} border rounded-lg p-3.5 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className={`text-[11px] font-semibold ${card.titleColor} line-clamp-1`}>
                  {card.title}
                </span>
                <div className={`w-6 h-6 rounded-md ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className={`text-xl font-bold ${card.valueColor} tabular-nums tracking-tight`}>
                  {card.value}
                </div>
                <div className={`text-[11px] ${card.subtextColor} mt-0.5 line-clamp-1 font-medium`}>
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
