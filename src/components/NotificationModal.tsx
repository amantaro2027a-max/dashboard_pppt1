import React, { useEffect } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const NotificationModal: React.FC = () => {
  const { notificationPopup, closeNotification } = useProgramContext();

  useEffect(() => {
    if (!notificationPopup.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNotification();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [notificationPopup.isOpen, closeNotification]);

  if (!notificationPopup.isOpen) return null;

  const isSuccess = notificationPopup.type === 'success';

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closeNotification}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 text-white ${
            isSuccess ? 'bg-emerald-700' : 'bg-rose-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-100 shrink-0" />
            )}
            <h4 className="text-sm font-bold tracking-tight">{notificationPopup.title}</h4>
          </div>
          <button
            type="button"
            onClick={closeNotification}
            className="p-1 text-white/80 hover:text-white rounded cursor-pointer"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div
            className={`p-3.5 rounded-lg border text-xs leading-relaxed whitespace-pre-line ${
              isSuccess
                ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}
          >
            {notificationPopup.message}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={closeNotification}
            className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors cursor-pointer ${
              isSuccess
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
