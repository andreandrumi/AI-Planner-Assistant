import React, { useState } from 'react';
import { RegionProfile, UrgencyLevel } from '../types';
import { AlertTriangle, ShieldAlert, Award, MapPin, Eye, TrendingUp } from 'lucide-react';

interface InteractiveMapProps {
  regions: RegionProfile[];
  selectedYear: number;
  selectedRegionId: string | null;
  onSelectRegion: (region: RegionProfile) => void;
  selectedSegment: 'Semua' | 'vokasi' | 'umkm' | 'asn';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  regions,
  selectedYear,
  selectedRegionId,
  onSelectRegion,
  selectedSegment,
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<RegionProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'jatim' | 'ntb'>('all');

  const getUrgencyColor = (level: UrgencyLevel) => {
    switch (level) {
      case 'Kritis':
        return {
          bg: 'bg-rose-500/90 hover:bg-rose-500',
          border: 'border-rose-400',
          text: 'text-rose-400',
          hex: '#f43f5e',
          badge: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
        };
      case 'Perlu Perhatian':
        return {
          bg: 'bg-amber-500/90 hover:bg-amber-500',
          border: 'border-amber-400',
          text: 'text-amber-400',
          hex: '#f59e0b',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
        };
      case 'Telah Terpenuhi':
        return {
          bg: 'bg-emerald-500/90 hover:bg-emerald-500',
          border: 'border-emerald-400',
          text: 'text-emerald-400',
          hex: '#10b981',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
        };
    }
  };

  const jatimRegions = regions.filter((r) => r.province === 'Jawa Timur');
  const ntbRegions = regions.filter((r) => r.province === 'Nusa Tenggara Barat');

  const visibleRegions =
    activeTab === 'all'
      ? regions
      : activeTab === 'jatim'
      ? jatimRegions
      : ntbRegions;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden mb-6">
      {/* Top Header of Map */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
            Peta Urgensi Kesenjangan Talenta Digital (Heatmap)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Warna node menunjukkan Tingkat Urgensi Intervensi tahun {selectedYear} berbasis IMDI, IPM &amp; Rasio Talenta Unik
          </p>
        </div>

        {/* Region tabs & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-region switch pills */}
          <div className="flex items-center space-x-1 p-0.5 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua Wilayah
            </button>
            <button
              onClick={() => setActiveTab('jatim')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === 'jatim'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jawa Timur (38)
            </button>
            <button
              onClick={() => setActiveTab('ntb')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === 'ntb'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              NTB (10)
            </button>
          </div>

          {/* Map legend */}
          <div className="flex items-center space-x-3 text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              <span className="text-slate-300 font-medium">Kritis</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span className="text-slate-300 font-medium">Perlu Perhatian</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-slate-300 font-medium">Telah Terpenuhi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map Layout Container */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 p-4 min-h-[480px]">
        {/* Subtle Map Grid Background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0f172a 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />

        {/* Geographic Sub-Islands Overlay Labels */}
        <div className="absolute top-4 left-6 pointer-events-none z-10 flex flex-col gap-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-400/80">
            {activeTab === 'ntb' ? 'Kepulauan Nusa Tenggara Barat' : 'Wilayah Provinsi Jawa Timur'}
          </span>
          <span className="text-[10px] text-slate-500">
            Klik kabupaten/kota untuk membuka rekomendasi mendalam AI Policy Advisor
          </span>
        </div>

        {/* Visual Map Canvas Representation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 pt-8 pb-4">
          {/* JAWA TIMUR SECTION */}
          {(activeTab === 'all' || activeTab === 'jatim') && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Jawa Timur (38 Kab/Kota)
                </span>
                <span className="text-[10px] text-slate-400">
                  Gerbangkertosusila • Madura • Mataraman • Tapal Kuda • Pantura
                </span>
              </div>

              {/* Grid of interactive district tiles with colors */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {jatimRegions.map((region) => {
                  const ym = region.yearlyData[selectedYear] || region.yearlyData[2026];
                  const colors = getUrgencyColor(ym.urgencyLevel);
                  const isSelected = selectedRegionId === region.id;
                  const isSPBEAlert = ym.subPillars.empowerment < 38.0 && ym.subPillars.infrastructure < 40.0;
                  const isStagnant = ym.stagnantWarning;

                  return (
                    <button
                      key={region.id}
                      onClick={() => onSelectRegion(region)}
                      onMouseEnter={() => setHoveredRegion(region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      className={`text-left p-2.5 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'border-blue-400 bg-slate-800 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/40'
                          : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      {/* Left color urgency indicator bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: colors.hex }}
                      />

                      <div className="pl-1.5">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                            {region.shortName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${colors.badge}`}
                          >
                            {ym.urgencyLevel === 'Kritis' ? 'Kritis' : ym.urgencyLevel === 'Perlu Perhatian' ? 'Atensi' : 'Aman'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>IMDI: <strong className="text-slate-200">{ym.imdiComposite.toFixed(1)}</strong></span>
                          <span>IPM: <strong className="text-slate-300">{region.ipmScore.toFixed(0)}</strong></span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>{ym.uniqueTalents.toLocaleString('id-ID')} talenta</span>
                          {isSPBEAlert && (
                            <span className="text-amber-400 font-semibold flex items-center" title="Prioritas SPBE ASN (Pemberdayaan & Infrastruktur rendah)">
                              <ShieldAlert className="w-3 h-3 text-amber-400 inline" />
                            </span>
                          )}
                          {isStagnant && (
                            <span className="text-orange-400 font-semibold flex items-center" title="Peringatan Stagnansi Kuota vs IMDI">
                              <TrendingUp className="w-3 h-3 text-orange-400 inline" />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NUSA TENGGARA BARAT SECTION */}
          {(activeTab === 'all' || activeTab === 'ntb') && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Nusa Tenggara Barat (10 Kab/Kota)
                </span>
                <span className="text-[10px] text-slate-400">
                  Pulau Lombok • Pulau Sumbawa
                </span>
              </div>

              {/* Grid of interactive district tiles with colors */}
              <div className="grid grid-cols-2 gap-2.5">
                {ntbRegions.map((region) => {
                  const ym = region.yearlyData[selectedYear] || region.yearlyData[2026];
                  const colors = getUrgencyColor(ym.urgencyLevel);
                  const isSelected = selectedRegionId === region.id;
                  const isSPBEAlert = ym.subPillars.empowerment < 38.0 && ym.subPillars.infrastructure < 40.0;
                  const isStagnant = ym.stagnantWarning;

                  return (
                    <button
                      key={region.id}
                      onClick={() => onSelectRegion(region)}
                      onMouseEnter={() => setHoveredRegion(region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'border-cyan-400 bg-slate-800 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/40'
                          : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      {/* Left color urgency indicator bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: colors.hex }}
                      />

                      <div className="pl-1.5">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                            {region.shortName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${colors.badge}`}
                          >
                            {ym.urgencyLevel === 'Kritis' ? 'Kritis' : ym.urgencyLevel === 'Perlu Perhatian' ? 'Atensi' : 'Aman'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>IMDI: <strong className="text-slate-200">{ym.imdiComposite.toFixed(1)}</strong></span>
                          <span>IPM: <strong className="text-slate-300">{region.ipmScore.toFixed(0)}</strong></span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>{ym.uniqueTalents.toLocaleString('id-ID')} talenta</span>
                          {isSPBEAlert && (
                            <span className="text-amber-400 font-semibold flex items-center" title="Prioritas SPBE ASN (Pemberdayaan & Infrastruktur rendah)">
                              <ShieldAlert className="w-3 h-3 text-amber-400 inline" />
                            </span>
                          )}
                          {isStagnant && (
                            <span className="text-orange-400 font-semibold flex items-center" title="Peringatan Stagnansi Kuota vs IMDI">
                              <TrendingUp className="w-3 h-3 text-orange-400 inline" />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Floating Tooltip Card for hover overview */}
        {hoveredRegion && (
          <div className="absolute bottom-4 right-4 z-20 max-w-sm bg-slate-950/95 border border-slate-700 rounded-2xl p-4 shadow-2xl text-xs backdrop-blur-md animate-fadeIn">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
              <div>
                <h4 className="font-bold text-white text-sm">{hoveredRegion.name}</h4>
                <p className="text-[10px] text-slate-400">{hoveredRegion.province} • {hoveredRegion.economicCategory}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getUrgencyColor(hoveredRegion.yearlyData[selectedYear]?.urgencyLevel || 'Perlu Perhatian').badge}`}>
                {hoveredRegion.yearlyData[selectedYear]?.urgencyLevel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Skor IMDI ({selectedYear})</span>
                <span className="text-white font-bold text-sm">
                  {hoveredRegion.yearlyData[selectedYear]?.imdiComposite.toFixed(1)} / 100
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Talenta Unik</span>
                <span className="text-cyan-300 font-bold text-sm">
                  {hoveredRegion.yearlyData[selectedYear]?.uniqueTalents.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Sub pillars mini stats */}
            <div className="text-[10px] text-slate-400 space-y-1 mb-2">
              <div className="flex justify-between">
                <span>Infrastruktur:</span>
                <strong className="text-slate-300">{hoveredRegion.yearlyData[selectedYear]?.subPillars.infrastructure.toFixed(1)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Keterampilan:</span>
                <strong className="text-slate-300">{hoveredRegion.yearlyData[selectedYear]?.subPillars.skills.toFixed(1)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Pemberdayaan:</span>
                <strong className={hoveredRegion.yearlyData[selectedYear]?.subPillars.empowerment < 38 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {hoveredRegion.yearlyData[selectedYear]?.subPillars.empowerment.toFixed(1)}
                </strong>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              Klik kotak wilayah untuk membuka rekomendasi 3 segmen dan jejak audit AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
