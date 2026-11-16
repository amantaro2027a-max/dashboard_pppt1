import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ChevronRight } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const { setActiveTab } = useProgramContext();

  const handleEnter = () => {
    setActiveTab('dashboard');
  };

  const posterSrc = `${import.meta.env.BASE_URL}assets/aistudio/Malaysian_Education_Portal_Welcome_Poster_7357b827.png`;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-2 sm:p-6 select-none overflow-x-hidden">
      {/* Container matching exact natural aspect ratio (1079x1457) of the official portal poster */}
      <div className="relative w-full max-w-[520px] aspect-[1079/1457] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden bg-[#07306b] flex flex-col justify-between border border-blue-900/40">
        {/* Background Poster Image */}
        <img
          src={posterSrc}
          alt="Selamat Datang ke Aplikasi Portal Pengurusan Maklumat Program Institut Aminuddin Baki"
          className="w-full h-full object-cover pointer-events-none absolute inset-0"
        />

        {/* Interactive MASUK Button positioned below wording PENGURUSAN MAKLUMAT PROGRAM INSTITUT AMINUDDIN BAKI */}
        <div
          className="absolute inset-x-0 flex justify-center items-center"
          style={{ top: '51%' }}
        >
          <button
            type="button"
            onClick={handleEnter}
            aria-label="Masuk ke Dashboard Program"
            className="group relative cursor-pointer outline-none transition-all duration-300 transform hover:scale-105 active:scale-95 focus:scale-105"
            style={{
              width: '44%',
              minWidth: '165px',
              maxWidth: '230px',
              height: '48px',
            }}
          >
            {/* Outer Gold Glow ring */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 opacity-75 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-300 animate-pulse" />

            {/* Main Button Body matching royal blue gradient & gold border */}
            <span className="relative flex items-center justify-center gap-2 w-full h-full rounded-full bg-gradient-to-b from-[#195bc7] via-[#09419b] to-[#042867] border-2 border-yellow-300 shadow-[0_6px_20px_rgba(0,0,0,0.4)] px-6 text-white font-extrabold tracking-wider text-base sm:text-lg uppercase">
              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">MASUK</span>
              <span className="w-6 h-6 rounded-full bg-white/95 text-[#09419b] flex items-center justify-center shadow-inner group-hover:translate-x-0.5 transition-transform duration-200">
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </span>
            </span>
          </button>
        </div>

        {/* Bottom subtle direct access link for accessibility */}
        <div className="absolute bottom-2 inset-x-0 flex justify-center text-center opacity-50 hover:opacity-100 transition-opacity">
          <button
            onClick={handleEnter}
            className="text-[11px] text-white/90 hover:text-white underline tracking-wide py-1 px-3 cursor-pointer"
          >
            Klik di sini atau butang di atas untuk terus ke Dashboard Program &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
