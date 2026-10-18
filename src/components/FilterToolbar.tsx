import React, { useEffect, useState } from 'react';
import { Search, Play, Pause, RotateCcw, Map, Table, SlidersHorizontal } from 'lucide-react';
import { ProvinceName, UrgencyLevel } from '../types';

interface FilterToolbarProps {
  selectedProvince: ProvinceName | 'Semua';
  onProvinceChange: (p: ProvinceName | 'Semua') => void;
  selectedUrgency: UrgencyLevel | 'Semua';
  onUrgencyChange: (u: UrgencyLevel | 'Semua') => void;
  selectedSegment: 'Semua' | 'vokasi' | 'umkm' | 'asn';
  onSegmentChange: (s: 'Semua' | 'vokasi' | 'umkm' | 'asn') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedYear: number;
  onYearChange: (y: number) => void;
  viewMode: 'map' | 'table' | 'timeseries';
  onViewModeChange: (m: 'map' | 'table' | 'timeseries') => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  selectedProvince,
  onProvinceChange,
  selectedUrgency,
  onUrgencyChange,
  selectedSegment,
  onSegmentChange,
  searchQuery,
  onSearchChange,
  selectedYear,
  onYearChange,
  viewMode,
  onViewModeChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Time-series playback effect
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (selectedYear >= 2026) {
          setIsPlaying(false);
        } else {
          onYearChange(selectedYear + 1);
        }
      }, 1600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, selectedYear, onYearChange]);

  const years = [2022, 2023, 2024, 2025, 2026];

  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 mb-6 shadow-md backdrop-blur-sm">
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Province Quick Switcher Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-700/80 self-start">
          <button
            onClick={() => onProvinceChange('Semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedProvince === 'Semua'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua (48)
          </button>
          <button
            onClick={() => onProvinceChange('Jawa Timur')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedProvince === 'Jawa Timur'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Jawa Timur (38)
          </button>
          <button
            onClick={() => onProvinceChange('Nusa Tenggara Barat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedProvince === 'Nusa Tenggara Barat'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            NTB (10)
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900/80 rounded-xl border border-slate-700/80 self-start">
          <button
            onClick={() => onViewModeChange('map')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'map' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Peta Heatmap</span>
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Matriks Wilayah</span>
          </button>
          <button
            onClick={() => onViewModeChange('timeseries')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === 'timeseries' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Deret Waktu (2022-2026)</span>
          </button>
        </div>

        {/* Search District */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Kab/Kota (cth: Sampang, Surabaya)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Urgency Filter + Segment Filter + Time-Series Player Slider */}
      <div className="mt-4 pt-3 border-t border-slate-750 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Urgency Filter */}
          <div className="flex items-center space-x-1 text-xs text-slate-300">
            <span className="text-slate-400">Tingkat Urgensi:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => onUrgencyChange(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="Semua">Semua Tingkat Urgensi</option>
              <option value="Kritis">Kritis (Merah)</option>
              <option value="Perlu Perhatian">Perlu Perhatian (Kuning)</option>
              <option value="Telah Terpenuhi">Telah Terpenuhi (Hijau)</option>
            </select>
          </div>

          {/* Segment Filter */}
          <div className="flex items-center space-x-1 text-xs text-slate-300">
            <span className="text-slate-400">Segmen Sasaran:</span>
            <select
              value={selectedSegment}
              onChange={(e) => onSegmentChange(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="Semua">Semua Segmen Sasaran</option>
              <option value="vokasi">Remaja & Vokasi (SMK/Poltek)</option>
              <option value="umkm">Usia Produktif & UMKM</option>
              <option value="asn">Pejabat Publik & ASN</option>
            </select>
          </div>
        </div>

        {/* Time-Series 2022-2026 Slider with Play/Pause */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end bg-slate-900/60 px-3.5 py-1.5 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 transition cursor-pointer"
            title={isPlaying ? 'Jeda Deret Waktu' : 'Putar Evaluasi Deret Waktu (2022-2026)'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              onYearChange(2022);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Reset ke Tahun 2022"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center space-x-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setIsPlaying(false);
                  onYearChange(y);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  selectedYear === y
                    ? 'bg-blue-500 text-white shadow-sm ring-1 ring-blue-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
            Tahun {selectedYear}
          </span>
        </div>
      </div>
    </div>
  );
};
