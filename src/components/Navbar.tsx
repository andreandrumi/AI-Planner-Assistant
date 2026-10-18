import React from 'react';
import { ShieldCheck, FileSpreadsheet, Printer, Sparkles, Database, Layers } from 'lucide-react';
import { DirtyDataSummary } from '../types';

interface NavbarProps {
  dirtyDataSummary: DirtyDataSummary | null;
  onOpenUploader: () => void;
  onOpenPolicyBrief: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  dirtyDataSummary,
  onOpenUploader,
  onOpenPolicyBrief,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-blue-100 to-cyan-300 bg-clip-text text-transparent">
                  DATAMAP AI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  v2.1 PRD Core
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Asisten Perencana Kebijakan Publik
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-3">
            {/* Dirty data status badge */}
            <button
              onClick={onOpenUploader}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              title="Kelola & Bersihkan Data Lapangan"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Data Lapangan:</span>
              {dirtyDataSummary && dirtyDataSummary.uniqueTalentsIdentified > 0 ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {dirtyDataSummary.uniqueTalentsIdentified.toLocaleString('id-ID')} Talenta Riil
                </span>
              ) : (
                <span className="text-slate-400 font-semibold">Siap Data Riil (0 Terunggah)</span>
              )}
            </button>

            {/* Upload Button */}
            <button
              onClick={onOpenUploader}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-medium transition shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unggah Data Talenta Digital</span>
              <span className="sm:hidden">Unggah Talenta</span>
            </button>

            {/* Policy Memo PDF Export Button */}
            <button
              onClick={onOpenPolicyBrief}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-medium transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor Nota Kebijakan</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
