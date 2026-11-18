import React, { useState, useEffect, useRef } from 'react';
import { PusatJabatanMessage, MessageTopik, AdminUser } from '../types/program';
import {
  MessageSquare,
  Send,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  X,
} from 'lucide-react';

interface PusatJabatanChatSectionProps {
  mode: 'pusat' | 'jabatan';
  isExpanded: boolean;
  onToggleExpand: () => void;
  title: string;
  subtitle?: string;
  messages: PusatJabatanMessage[];
  currentUser: AdminUser | null;
  isSuperAdmin: boolean;
  jabatansUnderPusat?: string[];
  chatJabatanFilter?: string;
  onChangeChatJabatanFilter?: (val: string) => void;
  chatTargetJabatan?: string;
  onChangeChatTargetJabatan?: (val: string) => void;
  chatTopik: MessageTopik;
  onChangeChatTopik: (val: MessageTopik) => void;
  chatText: string;
  onChangeChatText: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onDeleteMessage: (id: string) => { success: boolean; message?: string };
  onNotify: (opts: { type: 'success' | 'error'; title: string; message: string }) => void;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

const getInitials = (name: string): string => {
  const cleaned = (name || '')
    .replace(/\b(DR\.?|PROF\.?|DATO'?|DATIN|HAJI|HJH\.?|TN\.?|PN\.?|EN\.?|CIK)\b/gi, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'PG';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const formatRoleShort = (level: string): string => {
  const up = (level || '').toUpperCase();
  if (up === 'SUPER_ADMIN') return 'Super Admin';
  if (up === 'KETUA_PUSAT') return 'Ketua Pusat';
  if (up === 'KETUA_JABATAN') return 'Ketua Jabatan';
  return level || 'Pegawai';
};

export const PusatJabatanChatSection: React.FC<PusatJabatanChatSectionProps> = ({
  mode,
  isExpanded,
  onToggleExpand,
  title,
  subtitle,
  messages,
  currentUser,
  isSuperAdmin,
  jabatansUnderPusat = [],
  chatJabatanFilter = 'SEMUA',
  onChangeChatJabatanFilter,
  chatTargetJabatan = '',
  onChangeChatTargetJabatan,
  chatTopik,
  onChangeChatTopik,
  chatText,
  onChangeChatText,
  onSendMessage,
  onDeleteMessage,
  onNotify,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [deleteTarget, setDeleteTarget] = useState<PusatJabatanMessage | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isExpanded, messages.length]);

  const accentBorder = mode === 'pusat' ? 'border-indigo-200' : 'border-teal-200';
  const accentText = mode === 'pusat' ? 'text-indigo-700' : 'text-teal-700';
  const accentBtn =
    mode === 'pusat'
      ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
      : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500';
  const ownBubbleBg = mode === 'pusat' ? 'bg-slate-900 text-white' : 'bg-teal-900 text-white';

  const getMessageDeleteEligibility = (msg: PusatJabatanMessage) => {
    if (isSuperAdmin) {
      return { canDelete: true, isOwn: msg.pengirimId === currentUser?.id, remainingMins: null as number | null };
    }
    const isOwn =
      Boolean(currentUser?.id) &&
      (msg.pengirimId || '').trim().toUpperCase() === (currentUser?.id || '').trim().toUpperCase();
    const isAuthorizedRole =
      currentUser?.levelId === 'KETUA_PUSAT' || currentUser?.levelId === 'KETUA_JABATAN';
    if (!isOwn || !isAuthorizedRole) {
      return { canDelete: false, isOwn, remainingMins: null };
    }
    const createdMs = msg.createdAtMs ?? (msg.createdAt ? Date.parse(msg.createdAt) : NaN);
    if (isNaN(createdMs)) {
      return { canDelete: false, isOwn, remainingMins: 0 };
    }
    const elapsed = nowMs - createdMs;
    if (elapsed <= TEN_MINUTES_MS) {
      const remMins = Math.max(1, Math.ceil((TEN_MINUTES_MS - elapsed) / 60000));
      return { canDelete: true, isOwn, remainingMins: remMins };
    }
    return { canDelete: false, isOwn, remainingMins: 0 };
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const res = onDeleteMessage(deleteTarget.id);
    setDeleteTarget(null);
    onNotify({
      type: res.success ? 'success' : 'error',
      title: res.success ? 'Mesej Dipadam' : 'Gagal Memadam Mesej',
      message: res.message || (res.success ? 'Mesej berjaya dipadam.' : 'Tidak berjaya memadam mesej.'),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatText.trim()) {
        onSendMessage(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <section className={`bg-white border ${accentBorder} rounded-2xl shadow-xs overflow-hidden`}>
      {/* Clickable Section Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className={`inline-flex items-center gap-1.5 ${accentText}`}>
              <Lock className="w-3.5 h-3.5" />
              <span>Saluran Sulit · Ketua Pusat &amp; Ketua Jabatan Sahaja</span>
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
            <MessageSquare className={`w-4 h-4 shrink-0 ${accentText}`} />
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {messages.length} Mesej
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap">
            <span>{isExpanded ? 'Sembunyi' : 'Papar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {/* Collapsible Chat Body */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {/* Toolbar & Policy Strip */}
          <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Mesej sendiri boleh dipadam dalam tempoh <strong className="text-slate-900">10 minit</strong> selepas dihantar. Selepas 10 minit, hanya <strong className="text-slate-900">Super Admin</strong> boleh memadam.
              </span>
            </div>

            {mode === 'pusat' && onChangeChatJabatanFilter && (
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                  Tapis Jabatan:
                </label>
                <select
                  value={chatJabatanFilter}
                  onChange={(e) => onChangeChatJabatanFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="SEMUA">Semua Jabatan</option>
                  {jabatansUnderPusat.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Conversation Thread */}
          <div className="p-5 sm:p-6 bg-slate-50/40 max-h-96 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-600">Belum ada perbualan direkodkan.</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Mulakan perbincangan rasmi berkaitan baki peruntukan, agihan, penarikan atau pemulangan di bawah.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const { canDelete, isOwn, remainingMins } = getMessageDeleteEligibility(msg);
                const roleLabel = formatRoleShort(msg.pengirimLevel);
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar Initials */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 ${
                        isOwn
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                      title={msg.pengirimNama}
                    >
                      {getInitials(msg.pengirimNama)}
                    </div>

                    {/* Message Column */}
                    <div className={`max-w-[82%] sm:max-w-[74%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {/* Clean Inline Metadata */}
                      <div
                        className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] mb-1 px-1 ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="font-bold text-slate-900">{msg.pengirimNama}</span>
                        <span className="text-slate-400">·</span>
                        <span className={`font-semibold ${accentText}`}>{roleLabel}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-amber-700">{msg.topik || 'UMUM'}</span>
                        {mode === 'pusat' && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 truncate max-w-[220px]" title={msg.jabatan}>
                              {msg.jabatan}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`group relative px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                          isOwn
                            ? `${ownBubbleBg} rounded-2xl rounded-tr-xs`
                            : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.mesej}</p>
                      </div>

                      {/* Timestamp + Delete Status */}
                      <div
                        className={`flex items-center gap-2.5 mt-1 px-1 text-[10px] text-slate-400 ${
                          isOwn ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <span className="font-mono tabular-nums">
                          {msg.malaysiaDisplay || msg.createdAt.slice(0, 16)}
                        </span>

                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(msg)}
                            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold transition-colors cursor-pointer"
                            title={
                              isSuperAdmin
                                ? 'Padam mesej (Akses Super Admin)'
                                : `Padam mesej sendiri (baki ~${remainingMins} minit)`
                            }
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>
                              Padam
                              {!isSuperAdmin && remainingMins ? ` (${remainingMins}m)` : ''}
                            </span>
                          </button>
                        ) : (
                          isOwn && (
                            <span
                              className="inline-flex items-center gap-1 text-slate-400"
                              title="Tempoh 10 minit telah tamat. Hanya Super Admin boleh memadam mesej ini."
                            >
                              <Clock className="w-3 h-3" />
                              <span>Dikunci (&gt;10m)</span>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Composer Area */}
          <form onSubmit={onSendMessage} className="p-4 sm:p-5 bg-white border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {mode === 'pusat' && onChangeChatTargetJabatan && (
                <div className="sm:col-span-7">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Jabatan Berkaitan
                  </label>
                  <select
                    value={chatTargetJabatan}
                    onChange={(e) => onChangeChatTargetJabatan(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {jabatansUnderPusat.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={mode === 'pusat' ? 'sm:col-span-5' : 'sm:col-span-4'}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Topik Perbincangan
                </label>
                <select
                  value={chatTopik}
                  onChange={(e) => onChangeChatTopik(e.target.value as MessageTopik)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="BAKI">BAKI</option>
                  <option value="AGIHAN">AGIHAN</option>
                  <option value="PENARIKAN">PENARIKAN</option>
                  <option value="PEMULANGAN">PEMULANGAN</option>
                  <option value="UMUM">UMUM</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={chatText}
                  onChange={(e) => onChangeChatText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tulis mesej anda dengan jelas dan profesional... (Tekan Enter untuk hantar)"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!chatText.trim()}
                className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white rounded-xl cursor-pointer transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap shrink-0 h-10 ${accentBtn}`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Hantar Mesej</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Delete Message Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wide">Sahkan Pemadaman Mesej</h4>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-700 space-y-3">
              <p>Adakah anda pasti ingin memadam mesej ini daripada saluran komunikasi?</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[11px] font-bold text-slate-900">
                  {deleteTarget.pengirimNama} · <span className="text-amber-700">{deleteTarget.topik || 'UMUM'}</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{deleteTarget.mesej}</p>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Padam Mesej
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
