/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { REGIONS_DATA, computeUrgency } from './data/regionsData';
import { RegionProfile, ProvinceName, UrgencyLevel, DirtyDataSummary, AIPolicyReport, SubPillars } from './types';
import { Navbar } from './components/Navbar';
import { MacroStats } from './components/MacroStats';
import { FilterToolbar } from './components/FilterToolbar';
import { InteractiveMap } from './components/InteractiveMap';
import { TableView } from './components/TableView';
import { TimeSeriesView } from './components/TimeSeriesView';
import { AdvisorPanel } from './components/AdvisorPanel';
import { DataUploaderModal } from './components/DataUploaderModal';
import { ImdiManagerModal } from './components/ImdiManagerModal';
import { PolicyBriefModal } from './components/PolicyBriefModal';
import {
  CleanedParticipant,
  DirtyDataProcessingResult,
  downloadRealAlumniTemplateXLSX,
  downloadRealImdiTemplateXLSX,
  recomputeRegionsFromParticipants,
} from './utils/dataCleaner';
import { generateRuleBasedPolicyReport } from './utils/policyAdvisor';
import { Database, FileSpreadsheet, Download, CheckCircle2, RotateCcw, PlusCircle, SlidersHorizontal, Sparkles } from 'lucide-react';

export default function App() {
  // Stored participants list
  const [participants, setParticipants] = useState<CleanedParticipant[]>(() => {
    try {
      const saved = localStorage.getItem('DATAMAP_AI_PARTICIPANTS');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Gagal membaca data peserta tersimpan:', e);
    }
    return [];
  });

  // Stored custom IMDI overrides per region & year
  const [customImdiUpdates, setCustomImdiUpdates] = useState<Record<string, Record<number, {
    imdiComposite: number;
    subPillars: SubPillars;
    ipmScore?: number;
  }>>>(() => {
    try {
      const saved = localStorage.getItem('DATAMAP_AI_CUSTOM_IMDI');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Gagal membaca custom IMDI tersimpan:', e);
    }
    return {};
  });

  // Stored regions data (recomputed from participants and custom IMDI updates)
  const [regions, setRegions] = useState<RegionProfile[]>(() => {
    try {
      const savedParts = localStorage.getItem('DATAMAP_AI_PARTICIPANTS');
      const savedImdi = localStorage.getItem('DATAMAP_AI_CUSTOM_IMDI');
      const parsedParts: CleanedParticipant[] = savedParts ? JSON.parse(savedParts) : [];
      const parsedImdi = savedImdi ? JSON.parse(savedImdi) : undefined;
      return recomputeRegionsFromParticipants(REGIONS_DATA, parsedParts, parsedImdi);
    } catch (e) {
      console.warn('Gagal membaca regions tersimpan:', e);
    }
    return REGIONS_DATA;
  });

  const [dirtyDataSummary, setDirtyDataSummary] = useState<DirtyDataSummary | null>(() => {
    try {
      const saved = localStorage.getItem('DATAMAP_AI_REAL_SUMMARY');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Gagal membaca ringkasan tersimpan:', e);
    }
    return null;
  });

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceName | 'Semua'>('Semua');
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | 'Semua'>('Semua');
  const [selectedSegment, setSelectedSegment] = useState<'Semua' | 'vokasi' | 'umkm' | 'asn'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'table' | 'timeseries'>('map');

  // Modals & Panels
  const [selectedRegion, setSelectedRegion] = useState<RegionProfile | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isImdiManagerOpen, setIsImdiManagerOpen] = useState(false);
  const [isPolicyBriefOpen, setIsPolicyBriefOpen] = useState(false);
  const [activePolicyReport, setActivePolicyReport] = useState<AIPolicyReport | null>(null);

  // Compute total real unique talents loaded for selected year
  const totalUniqueLoaded = regions.reduce(
    (acc, r) => acc + (r.yearlyData[selectedYear]?.uniqueTalents || 0),
    0
  );

  // Unified updater for participants and custom IMDI updates
  const applyAllUpdates = (
    newParticipants: CleanedParticipant[],
    newImdiUpdates: Record<string, Record<number, {
      imdiComposite: number;
      subPillars: SubPillars;
      ipmScore?: number;
    }>>,
    summary?: DirtyDataSummary | null
  ) => {
    setParticipants(newParticipants);
    setCustomImdiUpdates(newImdiUpdates);
    const updatedRegions = recomputeRegionsFromParticipants(REGIONS_DATA, newParticipants, newImdiUpdates);
    setRegions(updatedRegions);

    if (summary !== undefined) {
      setDirtyDataSummary(summary);
      if (summary) {
        try {
          localStorage.setItem('DATAMAP_AI_REAL_SUMMARY', JSON.stringify(summary));
        } catch (e) {}
      } else {
        localStorage.removeItem('DATAMAP_AI_REAL_SUMMARY');
      }
    }

    try {
      localStorage.setItem('DATAMAP_AI_PARTICIPANTS', JSON.stringify(newParticipants));
      localStorage.setItem('DATAMAP_AI_CUSTOM_IMDI', JSON.stringify(newImdiUpdates));
      localStorage.setItem('DATAMAP_AI_REAL_REGIONS', JSON.stringify(updatedRegions));
    } catch (e) {
      console.warn('Gagal menyimpan ke localStorage:', e);
    }
  };

  // Sync state & recalculate regions whenever participants change
  const updateParticipantsAndRegions = (newParticipants: CleanedParticipant[], summary?: DirtyDataSummary) => {
    if (summary) {
      applyAllUpdates(newParticipants, customImdiUpdates, summary);
    } else if (newParticipants.length > 0) {
      const uniqueCount = new Set(newParticipants.map((p) => p.nomorRegister)).size;
      const updatedSummary: DirtyDataSummary = {
        originalRowCount: newParticipants.length,
        cleanRowCount: newParticipants.length,
        duplicateRowsRemoved: 0,
        uniqueTalentsIdentified: uniqueCount,
        multiSkillTalents: 0,
        invalidAgesCorrected: 0,
        yearsParsedRange: [2022, 2026],
        unmappedColumnsResolved: 0,
        fileHash: 'manual_or_managed',
        fileName: dirtyDataSummary?.fileName || 'Data_Talenta_Terkelola.xlsx',
        processedAt: new Date().toISOString(),
        logs: [],
      };
      applyAllUpdates(newParticipants, customImdiUpdates, updatedSummary);
    } else {
      applyAllUpdates(newParticipants, customImdiUpdates, null);
    }
  };

  // Add individual participant
  const handleAddParticipant = (newP: CleanedParticipant) => {
    const nextList = [newP, ...participants];
    updateParticipantsAndRegions(nextList);
  };

  // Delete individual participant
  const handleDeleteParticipant = (id: string) => {
    const nextList = participants.filter((p) => p.id !== id);
    updateParticipantsAndRegions(nextList);
  };

  // Bulk delete by filter
  const handleBulkDelete = (filterParams?: { kabKota?: string; year?: number }) => {
    if (!filterParams) return;
    const nextList = participants.filter((p) => {
      if (filterParams.kabKota && p.kabKota === filterParams.kabKota) return false;
      if (filterParams.year && p.year === filterParams.year) return false;
      return true;
    });
    updateParticipantsAndRegions(nextList);
  };

  // Handle batch file upload (Append or Replace)
  const handleApplyCleanedData = (result: DirtyDataProcessingResult, mode: 'replace' | 'append') => {
    let combinedParticipants: CleanedParticipant[] = [];

    if (mode === 'replace') {
      combinedParticipants = result.cleanedParticipants;
    } else {
      const existingSignatures = new Set(
        participants.map((p) => `${p.nomorRegister}|${p.themeName}|${p.kabKota}|${p.year}`)
      );
      const newItems = result.cleanedParticipants.filter(
        (p) => !existingSignatures.has(`${p.nomorRegister}|${p.themeName}|${p.kabKota}|${p.year}`)
      );
      combinedParticipants = [...newItems, ...participants];
    }

    updateParticipantsAndRegions(combinedParticipants, result.summary);
  };

  // Reset to clean zero data
  const handleResetData = () => {
    try {
      localStorage.removeItem('DATAMAP_AI_PARTICIPANTS');
      localStorage.removeItem('DATAMAP_AI_REAL_REGIONS');
      localStorage.removeItem('DATAMAP_AI_REAL_SUMMARY');
    } catch (e) {}
    applyAllUpdates([], customImdiUpdates, null);
    setSelectedRegion(null);
  };

  // IMDI Handlers
  const handleSaveSingleImdi = (entry: {
    kabKota: string;
    year: number;
    imdiComposite: number;
    subPillars: SubPillars;
    ipmScore?: number;
  }) => {
    const nextUpdates = { ...customImdiUpdates };
    if (!nextUpdates[entry.kabKota]) {
      nextUpdates[entry.kabKota] = {};
    }
    nextUpdates[entry.kabKota][entry.year] = {
      imdiComposite: entry.imdiComposite,
      subPillars: entry.subPillars,
      ipmScore: entry.ipmScore,
    };
    applyAllUpdates(participants, nextUpdates, dirtyDataSummary);
  };

  const handleDeleteSingleImdi = (kabKota: string, year: number) => {
    const nextUpdates = { ...customImdiUpdates };
    if (nextUpdates[kabKota]) {
      delete nextUpdates[kabKota][year];
      if (Object.keys(nextUpdates[kabKota]).length === 0) {
        delete nextUpdates[kabKota];
      }
    }
    applyAllUpdates(participants, nextUpdates, dirtyDataSummary);
  };

  const handleApplyBatchImdi = (
    batchUpdates: Record<string, Record<number, {
      imdiComposite: number;
      subPillars: SubPillars;
      ipmScore?: number;
    }>>,
    mode: 'merge' | 'replace'
  ) => {
    let nextUpdates = mode === 'replace' ? {} : { ...customImdiUpdates };
    for (const [kabKota, yearly] of Object.entries(batchUpdates)) {
      if (!nextUpdates[kabKota]) nextUpdates[kabKota] = {};
      for (const [yr, data] of Object.entries(yearly)) {
        nextUpdates[kabKota][Number(yr)] = data;
      }
    }
    applyAllUpdates(participants, nextUpdates, dirtyDataSummary);
  };

  const handleResetImdi = () => {
    try {
      localStorage.removeItem('DATAMAP_AI_CUSTOM_IMDI');
    } catch (e) {}
    applyAllUpdates(participants, {}, dirtyDataSummary);
  };

  // Open Region Advisor by ID
  const handleOpenRegionById = (id: string) => {
    const found = regions.find((r) => r.id === id);
    if (found) {
      setSelectedRegion(found);
    }
  };

  // Open Policy Brief modal
  const handleOpenPolicyBrief = (report?: AIPolicyReport) => {
    if (report) {
      setActivePolicyReport(report);
    } else {
      const target = selectedRegion || regions.find((r) => r.id === 'jatim-sampang') || regions[0];
      const rep = generateRuleBasedPolicyReport(target, selectedYear);
      setActivePolicyReport(rep);
    }
    setIsPolicyBriefOpen(true);
  };

  // Count total custom IMDI entries
  const customDistrictsCount = Object.keys(customImdiUpdates).length;
  let totalCustomImdiCount = 0;
  for (const reg of Object.keys(customImdiUpdates)) {
    totalCustomImdiCount += Object.keys(customImdiUpdates[reg]).length;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Executive Navbar */}
      <Navbar
        dirtyDataSummary={dirtyDataSummary}
        onOpenUploader={() => setIsUploaderOpen(true)}
        onOpenPolicyBrief={() => handleOpenPolicyBrief()}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real Data Readiness Hero Card - Data Peserta */}
        {participants.length === 0 ? (
          <div className="mb-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm sm:text-base font-extrabold text-white">
                    Pusat Pengelolaan Data Talenta (Siap Data Riil)
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                    Zero Dummy
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Sistem telah dilengkapi fitur untuk mengelola data: tambah data satuan, hapus baris peserta, atau unggah berkas Excel/CSV lapangan. Semua indikator terhubung langsung ke skor IMDI dan analisis urgensi daerah.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto shrink-0">
              <button
                onClick={() => setIsUploaderOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Kelola Data Peserta</span>
              </button>
              <button
                onClick={downloadRealAlumniTemplateXLSX}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Unduh Format Standar Excel untuk Diisi"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Unduh Template (.xlsx)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Data Riil Aktif: {participants.length.toLocaleString('id-ID')} Baris Data (
                  <strong className="text-cyan-300">
                    {new Set(participants.map((p) => p.nomorRegister)).size.toLocaleString('id-ID')} No. Register Unik
                  </strong>
                  )
                </span>
                <span className="text-[11px] text-slate-400">
                  Data tersimpan secara aman &amp; persisten. Anda dapat menambah atau menghapus data peserta sewaktu-waktu.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsUploaderOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Kelola Data Peserta</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Yakin ingin mereset dan mengosongkan seluruh data talenta?')) {
                    handleResetData();
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                title="Kosongkan Seluruh Data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Duplikasi Bagian Ini: Pusat Pengelolaan Nilai IMDI */}
        {totalCustomImdiCount === 0 ? (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-white">
                    Pusat Pengelolaan Nilai IMDI (Indeks Masyarakat Digital Indonesia)
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Kolom Recognizer
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Kelola nilai komposit dan 4 sub-pilar IMDI (Infrastruktur, Keterampilan, Pemberdayaan, Pekerjaan). Agen AI secara otomatis mengenali kolom yang dibutuhkan untuk memberikan rekomendasi kebijakan presisi.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto shrink-0">
              <button
                onClick={() => setIsImdiManagerOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Kelola Nilai IMDI</span>
              </button>
              <button
                onClick={downloadRealImdiTemplateXLSX}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Unduh Format Standar Excel IMDI untuk Diisi"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Unduh Template IMDI (.xlsx)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Nilai IMDI Terkelola: {totalCustomImdiCount} Entri Kustom Aktif (
                  <strong className="text-indigo-300">
                    {customDistrictsCount} Daerah Disesuaikan
                  </strong>
                  )
                </span>
                <span className="text-[11px] text-slate-400">
                  Agen AI mengenali sub-pilar IMDI &amp; langsung menyinkronkan pemicu mandat SPBE serta rekomendasi intervensi presisi.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsImdiManagerOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Kelola Nilai IMDI</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Kembalikan seluruh nilai IMDI kustom ke baseline standar BPS-Kominfo?')) {
                    handleResetImdi();
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                title="Kembalikan ke Baseline Standar"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Executive Macro KPIs */}
        <MacroStats
          regions={regions}
          selectedYear={selectedYear}
          selectedProvince={selectedProvince}
        />

        {/* Macro Filter & Time-Series Toolbar */}
        <FilterToolbar
          selectedProvince={selectedProvince}
          onProvinceChange={setSelectedProvince}
          selectedUrgency={selectedUrgency}
          onUrgencyChange={setSelectedUrgency}
          selectedSegment={selectedSegment}
          onSegmentChange={setSelectedSegment}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Dynamic Views: Map / Table / TimeSeries */}
        {viewMode === 'map' && (
          <InteractiveMap
            regions={regions}
            selectedYear={selectedYear}
            selectedRegionId={selectedRegion?.id || null}
            onSelectRegion={(r) => setSelectedRegion(r)}
            selectedSegment={selectedSegment}
          />
        )}

        {viewMode === 'table' && (
          <TableView
            regions={regions}
            selectedYear={selectedYear}
            onSelectRegion={(r) => setSelectedRegion(r)}
            selectedUrgency={selectedUrgency}
            selectedProvince={selectedProvince}
            searchQuery={searchQuery}
          />
        )}

        {viewMode === 'timeseries' && (
          <TimeSeriesView
            regions={regions}
            onSelectRegion={(r) => setSelectedRegion(r)}
            selectedProvince={selectedProvince}
          />
        )}

        {/* Footer info note */}
        <footer className="mt-12 pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
          <p>
            DATAMAP AI • Asisten Perencana Kebijakan Publik Senior Jawa Timur &amp; NTB
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            Berlandaskan PRD v2.1 • Standar Kominfo &amp; BPS • Dilengkapi Logika Deduplikasi Talenta Unik &amp; Pembersihan Data Otonom
          </p>
        </footer>
      </main>

      {/* AI Policy Advisor Deep Dive Panel */}
      <AdvisorPanel
        region={selectedRegion}
        selectedYear={selectedYear}
        onClose={() => setSelectedRegion(null)}
        onOpenPolicyBrief={(report) => handleOpenPolicyBrief(report)}
      />

      {/* Comprehensive Data Management Center Modal */}
      <DataUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        participants={participants}
        onAddParticipant={handleAddParticipant}
        onDeleteParticipant={handleDeleteParticipant}
        onBulkDelete={handleBulkDelete}
        onApplyCleanedData={handleApplyCleanedData}
        onResetData={handleResetData}
        currentSummary={dirtyDataSummary}
      />

      {/* Official IMDI Scores Manager Modal */}
      <ImdiManagerModal
        isOpen={isImdiManagerOpen}
        onClose={() => setIsImdiManagerOpen(false)}
        regions={regions}
        customImdiUpdates={customImdiUpdates}
        onSaveSingleImdi={handleSaveSingleImdi}
        onDeleteSingleImdi={handleDeleteSingleImdi}
        onApplyBatchImdi={handleApplyBatchImdi}
        onResetAllCustomImdi={handleResetImdi}
      />

      {/* Official Policy Memo PDF Modal */}
      <PolicyBriefModal
        isOpen={isPolicyBriefOpen}
        onClose={() => setIsPolicyBriefOpen(false)}
        report={activePolicyReport}
      />
    </div>
  );
}
