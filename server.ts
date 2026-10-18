import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Server-side Gemini AI setup
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Route: AI Policy Advisor reasoning
app.post('/api/ai/advise', async (req, res) => {
  try {
    const {
      regionName,
      province,
      imdiScore,
      subPillars,
      ipmScore,
      economicContext,
      historySummary,
      uniqueTalents,
      multiSkillRatio,
      customQuery,
    } = req.body;

    if (!regionName) {
      return res.status(400).json({ error: 'Nama daerah wajib disertakan.' });
    }

    if (!ai) {
      // Fallback rule-based authoritative engine will be handled gracefully by client
      return res.json({
        source: 'rule_engine',
        message: 'Mode penalaran deterministik aktif.',
      });
    }

    const prompt = `Peran Kamu:
Kamu adalah DATAMAP AI, seorang Asisten Perencana Kebijakan Publik Senior dan Ahli Ekonomi Digital yang berfokus di Provinsi Jawa Timur dan Nusa Tenggara Barat (NTB). Gaya komunikasimu analitis, objektif, berwibawa, dan selalu berlandaskan data (data-driven).

Berikut adalah data resmi daerah yang dianalisis:
- Nama Daerah: ${regionName} (${province})
- Skor IMDI: ${imdiScore}/100 (Sub-pilar: Infrastruktur ${subPillars?.infrastructure ?? '-'}, Keterampilan ${subPillars?.skills ?? '-'}, Pemberdayaan ${subPillars?.empowerment ?? '-'}, Pekerjaan ${subPillars?.workforce ?? '-'})
- Indeks Pembangunan Manusia (IPM): ${ipmScore}
- Karakteristik Ekonomi & Geografis: ${economicContext}
- Histori Pelatihan 2022-2026: ${historySummary}
- Total Talenta Unik Terdaftar: ${uniqueTalents} (Rasio Multi-Keahlian: ${multiSkillRatio}%)
${customQuery ? `- Pertanyaan/Instruksi Spesifik Pemda: "${customQuery}"` : ''}

ATURAN WAJIB (PRD Source of Truth):
1. Evaluasi Time-Series: Jika alumni tinggi tapi IMDI stagnan, usulkan perombakan total sektor.
2. Segmentasi 3 Berjenjang:
   - Remaja / Pendidikan Vokasi (SMK/Politeknik/Mahasiswa)
   - Usia Produktif / UMKM / Swasta (Wirausaha & Pekerja)
   - Pejabat Publik / ASN (Aparatur Sipil Negara)
3. Konteks Pendidikan & Ekonomi:
   - Jika IPM rendah (<70), sarankan kelas Literasi Dasar. Jika IPM tinggi, sarankan kelas lanjutan (AI, Cloud, Cyber Security).
   - Sesuaikan dengan sektor ekonomi daerah (${economicContext}).
4. Aturan Sub-Pilar IMDI: Jika sub-pilar Pemberdayaan (<38) dan Infrastruktur (<40) rendah, otomatis jadikan segmen ASN prioritas utama pelatihan "Tata Kelola Digital / SPBE".
5. AI Audit Trail: Berikan justifikasi penalaran matematis dan komparatif yang dapat dipertanggungjawabkan secara hukum dan politik oleh Bupati/Walikota/Gubernur.

Format Output WAJIB dalam JSON valid:
{
  "ringkasanEksekutif": "1 paragraf padat tentang status kesenjangan wilayah.",
  "tingkatUrgensi": "Kritis" | "Perlu Perhatian" | "Telah Terpenuhi",
  "alasanUrgensi": "Alasan singkat penentuan level urgensi",
  "rekomendasiTema": {
    "vokasi": ["Tema 1", "Tema 2", "Tema 3"],
    "umkm": ["Tema 1", "Tema 2", "Tema 3"],
    "asn": ["Tema 1", "Tema 2", "Tema 3"]
  },
  "fokusPerubahanStrategis": "Pesan perombakan jika time-series stagnan atau akselerasi",
  "aiAuditTrail": {
    "metrikEvaluasi": "Kompilasi rasio talenta unik vs populasi dan IMDI",
    "justifikasiPolitikHukum": "Argumen hukum/kebijakan formal",
    "analisisKorelasi": "Analisis dampak intervensi terhadap peningkatan IMDI"
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ source: 'gemini', data: parsed });
  } catch (error: any) {
    console.warn('Gemini API call non-critical fallback:', error?.message || error);
    // Return graceful fallback signal so frontend deterministically renders the authoritative PRD policy report
    return res.json({
      source: 'rule_engine',
      fallback: true,
      message: 'Penalaran deterministik PRD v2.1 aktif.',
    });
  }
});

// Setup Vite in development or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`DATAMAP AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
