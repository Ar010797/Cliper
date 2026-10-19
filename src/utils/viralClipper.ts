import { VideoClip, ViralMoment, ViralTopic, MomentDurationMode } from '../types';

export interface TopicInfo {
  id: ViralTopic;
  name: string;
  icon: string;
  description: string;
  hookPrefixes: string[];
  hashtags: string[];
}

export const VIRAL_TOPICS: TopicInfo[] = [
  {
    id: 'podcast',
    name: 'Podcast & Wawancara',
    icon: '🎙️',
    description: 'Diskusi mendalam, obrolan seru, dan pengakuan tak terduga',
    hookPrefixes: [
      'PENGAKUAN PALING MENGEJUTKAN 😱',
      'DI SINI GUE BARU SADAR... 🤯',
      'JANGAN SKIP! Jawaban ini bikin merinding 🔥',
      'Obrolan yang gak pernah dibahas di TV! 🤫',
      'Momen paling jujur dalam podcast ini 💯',
    ],
    hashtags: ['#podcastindonesia', '#obrolanviral', '#deepfake', '#fyp', '#reels'],
  },
  {
    id: 'education',
    name: 'Edukasi & Tutorial',
    icon: '💡',
    description: 'Tips daging, tutorial praktis, dan wawasan baru',
    hookPrefixes: [
      'TRIK RAHASIA YANG JARANG ORANG TAHU! 💡',
      'STOP LAKUKAN INI! Ini cara yang benar ⚠️',
      'Simpan video ini sebelum dihapus! 📌',
      'Tutorial tercepat yang wajib kamu coba 🚀',
      '1 Menit paham konsep penting ini! 🧠',
    ],
    hashtags: ['#belajaronline', '#tipskeren', '#edukasitiktok', '#lifehack', '#viral'],
  },
  {
    id: 'business',
    name: 'Bisnis & Finansial',
    icon: '💼',
    description: 'Strategi cuan, pola pikir finansial, dan rahasia sukses',
    hookPrefixes: [
      'RAHASIA CUAN YANG BIKIN KAYA CEPAT 💰',
      'Kesalahan fatal finansial di usia muda ❌',
      'Cara cerdas melipatgandakan penghasilan 📈',
      'Bongkar strategi bisnis tanpa modal besar 🚀',
      'Fakta uang yang sengaja disembunyikan! 🤫',
    ],
    hashtags: ['#bisnisviral', '#tipsfinansial', '#investasimuda', '#sukses', '#cuan'],
  },
  {
    id: 'gaming',
    name: 'Gaming & Momen Seru',
    icon: '🎮',
    description: 'Clutch moments, reaksi heboh, dan gameplay gila',
    hookPrefixes: [
      'CLUTCH PALING MUSTAHIL SEPANJANG SEJARAH! 🔥',
      'REAKSI GILA PAS DAPAT MOMEN INI! 😱',
      'Enemy-nya auto panik kena trik ini ⚡',
      'Tonton detik ke-10, ada yang aneh! 👀',
      'Ending-nya beneran di luar nalar 🤯',
    ],
    hashtags: ['#gamingclips', '#clutch', '#gamerviral', '#highlightgame', '#fyp'],
  },
  {
    id: 'comedy',
    name: 'Komedi & Hiburan',
    icon: '🎭',
    description: 'Humor spontan, lelucon receh, dan momen kocak',
    hookPrefixes: [
      'BENERAN GAK KUAT NAHAN TAWA DI SINI! 🤣',
      'PLOT TWIST PALING GILA HARI INI 💀',
      'Tolong jelaskan kenapa ini bisa terjadi?! 😭',
      'Tahan tawa sampai akhir, siapa yang gagal? 😂',
      'Kena jebakan paling epic se-Indonesia! 💥',
    ],
    hashtags: ['#lucubanget', '#ngakakkocak', '#videolucu', '#komediviral', '#foryou'],
  },
  {
    id: 'motivation',
    name: 'Motivasi & Self-Growth',
    icon: '🎯',
    description: 'Kata-kata pembakar semangat dan inspirasi hidup',
    hookPrefixes: [
      'KATA-KATA INI BAKAL MENGUBAH HIDUPMU 🎯',
      'Kalau kamu lagi di titik terendah, dengar ini! ✨',
      'Pesan penting buat kamu yang mau menyerah 🕊️',
      'Alasan kenapa kamu belum sukses sampai sekarang 🔥',
      'Buktikan ke mereka yang meremehkanmu! 💪',
    ],
    hashtags: ['#motivasihidup', '#katabijak', '#semangatpagi', '#mindset', '#sukses'],
  },
  {
    id: 'mystery',
    name: 'Misteri & Fakta Unik',
    icon: '😱',
    description: 'Kejadian aneh, konspirasi seru, dan fakta mencengangkan',
    hookPrefixes: [
      'YANG TERAKHIR BIKIN MERINDING BANGET! 😱',
      'FAKTA MENGERIKAN YANG DISINGKIRKAN ORANG! ⚠️',
      'Perhatikan baik-baik detik ini... 👀',
      'Misteri terbesar yang belum terpecahkan! 🕵️',
      'Jangan tonton video ini sendirian malam hari 🕯️',
    ],
    hashtags: ['#faktaunik', '#misteriviral', '#kisahnyata', '#merinding', '#horror'],
  },
  {
    id: 'tech',
    name: 'Teknologi & Gadget',
    icon: '📱',
    description: 'AI terbaru, fitur tersembunyi, dan review gadget',
    hookPrefixes: [
      'FITUR RAHASIA YANG GAK DIBERITAHU PABRIK! ⚡',
      'AI INI SUDAH TERLALU PINTAR, BIKIN TAKUT 🤖',
      'Alat canggih yang bakal ubah cara kerja kamu 🚀',
      'Bongkar kekurangan fatal perangkat ini! 💥',
      'Wajib install aplikasi ini sekarang juga 📲',
    ],
    hashtags: ['#teknologi', '#gadgetviral', '#aiindonesia', '#tipshack', '#technews'],
  },
  {
    id: 'action',
    name: 'Aksi, Balap & Sinematik',
    icon: '🏎️',
    description: 'Drift, manuver ekstrem, adegan menegangkan & cinematic high energy',
    hookPrefixes: [
      'AKSI PALING GILA! Jangan Kedip di Detik Ini 😱🔥',
      'DETIK-DETIK MENEGANGKAN HAMPIR FATAL! ⚡👀',
      'SKILL TINGKAT DEWA YANG BIKIN JANTUNGAN 🤯💥',
      'Manuver berbahaya yang bikin semua orang syok! 🚨',
      'Ending-nya beneran di luar dugaan! 🚀🔥',
    ],
    hashtags: ['#aksiviral', '#drift', '#cinematic', '#adrenalin', '#viral'],
  },
  {
    id: 'general',
    name: 'Umum & Cerita Viral',
    icon: '✨',
    description: 'Momen menarik serbaguna untuk segala konten',
    hookPrefixes: [
      'JANGAN SKIP! Momen ini paling viral hari ini 🔥',
      'Tonton sampai habis, plot twist-nya gila! 🤯',
      'Beneran gak nyangka bakal berakhir seperti ini 😱',
      'Semua orang kaget pas lihat kejadian ini! ⚡',
      'Momen terbaik yang wajib kamu tonton ulang 🚀',
    ],
    hashtags: ['#viralindonesia', '#trendingnow', '#fypシ', '#videoviral', '#reelsviral'],
  },
];

/**
 * Smartly extracts context, clean subject, and topic from video title/filename
 */
export function extractContextFromTitle(title?: string): {
  detectedTopic: ViralTopic;
  keyword: string;
  cleanSubject: string;
} {
  if (!title) {
    return { detectedTopic: 'general', keyword: '', cleanSubject: 'Momen Video' };
  }

  // Remove extensions, brackets, and clean delimiters
  let clean = title
    .replace(/\.(mp4|webm|mov|mkv|m4v|avi|ts)$/i, '')
    .replace(/[\[\(\{].*?[\]\)\}]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common generic prefixes
  clean = clean
    .replace(/^(video|clip|cliprush|demo|sample|whatsapp video|screen recording|my video)/i, '')
    .trim();

  const lower = (clean + ' ' + title).toLowerCase();

  let detectedTopic: ViralTopic = 'general';
  let keyword = clean.length > 2 ? clean.substring(0, 32) : '';

  if (/action|drift|balap|mobil|motor|kecepatan|stunt|adrenalin|sinematik/i.test(lower)) {
    detectedTopic = 'action';
    if (!keyword || /^(action|demo|cliprush)$/i.test(keyword)) {
      keyword = 'Aksi Ekstrem';
    }
  } else if (/podcast|wawancara|interview|ngobrol|obrolan|curhat|bicara|debat|vokal|smartcut/i.test(lower)) {
    detectedTopic = 'podcast';
    if (!keyword || /^(podcast|demo|cliprush)$/i.test(keyword)) {
      keyword = 'Obrolan Podcast';
    }
  } else if (/tutorial|cara|tips|trik|belajar|panduan|resep|masak|edukasi|kursus/i.test(lower)) {
    detectedTopic = 'education';
    if (!keyword || /^(tutorial|demo)$/i.test(keyword)) {
      keyword = 'Tips Edukasi';
    }
  } else if (/bisnis|cuan|finansial|investasi|saham|uang|kaya|omzet|marketing|sales/i.test(lower)) {
    detectedTopic = 'business';
    if (!keyword || /^(bisnis|demo)$/i.test(keyword)) {
      keyword = 'Strategi Cuan';
    }
  } else if (/game|gaming|mlbb|mobile legend|ff|free fire|pubg|valorant|dota|roblox|genshin/i.test(lower)) {
    detectedTopic = 'gaming';
    if (!keyword || /^(game|demo)$/i.test(keyword)) {
      keyword = 'Gameplay Seru';
    }
  } else if (/lucu|kocak|ngakak|prank|komedi|humor|gokil|meme|bikin ketawa/i.test(lower)) {
    detectedTopic = 'comedy';
    if (!keyword || /^(lucu|demo)$/i.test(keyword)) {
      keyword = 'Momen Lucu';
    }
  } else if (/motivasi|semangat|renungan|inspirasi|sukses|mindset|nasihat|pesan hidup/i.test(lower)) {
    detectedTopic = 'motivation';
    if (!keyword || /^(motivasi|demo)$/i.test(keyword)) {
      keyword = 'Pesan Inspiratif';
    }
  } else if (/misteri|horor|horror|seram|aneh|konspirasi|fakta unik|hantu|merinding/i.test(lower)) {
    detectedTopic = 'mystery';
    if (!keyword || /^(misteri|demo)$/i.test(keyword)) {
      keyword = 'Misteri Tersembunyi';
    }
  } else if (/ai|teknologi|gadget|hp|iphone|android|komputer|laptop|software|tech|robot/i.test(lower)) {
    detectedTopic = 'tech';
    if (!keyword || /^(tech|demo)$/i.test(keyword)) {
      keyword = 'Teknologi Canggih';
    }
  } else if (/shorts|reels|tiktok|vertikal/i.test(lower)) {
    if (!keyword || /^(shorts|demo)$/i.test(keyword)) {
      keyword = 'Konten Vertikal';
    }
  }

  const cleanSubject = keyword || (clean.length > 2 ? clean : 'Isi Video');

  return { detectedTopic, keyword, cleanSubject };
}

/**
 * Generate viral taglines strictly customized to the video's actual content and discussion topic
 */
export function generateTaglinesForMoment(
  topicId: ViralTopic,
  category: 'hook' | 'climax' | 'insight' | 'reaction' | 'cta',
  customKeyword?: string,
  videoTitle?: string
): { mainTagline: string; badge: string; suggestions: string[] } {
  const topic = VIRAL_TOPICS.find((t) => t.id === topicId) || VIRAL_TOPICS[VIRAL_TOPICS.length - 1];

  // Extract context if keyword is empty but video title is provided
  let kw = customKeyword ? customKeyword.trim() : '';
  if (!kw && videoTitle) {
    const extracted = extractContextFromTitle(videoTitle);
    kw = extracted.keyword;
  }
  const cleanSubject = kw || topic.name.split('&')[0].trim();

  let badge = '🔥 VIRAL HOOK';
  if (category === 'climax') badge = '⚡ PUNCAK EMOSI';
  if (category === 'insight') badge = '💡 RAHASIA TERUNGKAP';
  if (category === 'reaction') badge = '😱 PLOT TWIST';
  if (category === 'cta') badge = '🚀 KLIMAKS AKHIR';

  const suggestions: string[] = [];

  // Generate high-impact taglines strictly woven with the video subject
  if (cleanSubject) {
    const kwUpper = cleanSubject.toUpperCase();
    if (category === 'hook') {
      suggestions.push(`JANGAN SKIP! Rahasia ${kwUpper} Yang Bikin Syok 😱`);
      suggestions.push(`Bongkar Fakta ${cleanSubject} Yang Gak Pernah Dibahas di TV! 🔥`);
      suggestions.push(`Perhatikan Baik-Baik ${cleanSubject} di Detik Ke-5... 👀`);
      suggestions.push(`Gak Nyangka Hasil ${cleanSubject} Bakal Seheboh Ini! 🤯`);
      suggestions.push(`STOP! Jangan Lewatkan Bagian ${cleanSubject} Ini ⚠️`);
    } else if (category === 'climax') {
      suggestions.push(`MOMEN PALING GILA SOAL ${kwUpper}! 🤯`);
      suggestions.push(`Semua Orang Langsung Terdiam Pas Tahu Soal ${cleanSubject}! ⚡`);
      suggestions.push(`Puncak Pembahasan ${cleanSubject} Yang Bikin Merinding! 🔥`);
      suggestions.push(`Detik Paling Menegangkan Dalam ${cleanSubject}! 😱`);
      suggestions.push(`Reaksi Spontan Semua Orang Saat ${cleanSubject} Terjadi! 💥`);
    } else if (category === 'insight') {
      suggestions.push(`FAKTA SEBENARNYA: Ternyata Begini Soal ${cleanSubject}! 💡`);
      suggestions.push(`Trik Rahasia ${cleanSubject} Yang Bakal Ubah Cara Pikirmu 📌`);
      suggestions.push(`Poin Daging ${cleanSubject} Yang Wajib Kamu Catat Sekarang 🧠`);
      suggestions.push(`Kesalahan Fatal Dalam ${cleanSubject} Yang Sering Terjadi ❌`);
      suggestions.push(`Cara Cerdas Menguasai ${cleanSubject} Tanpa Ribet 🚀`);
    } else if (category === 'reaction') {
      suggestions.push(`PLOT TWIST TERBAIK! Reaksi Spontan Soal ${cleanSubject} 🤣`);
      suggestions.push(`Beneran Gak Nyangka Bakal Kejadian Begini di ${cleanSubject}! 😱`);
      suggestions.push(`Detik-Detik Tak Terduga Pas ${cleanSubject} Berlangsung! 👀`);
    } else {
      suggestions.push(`Menurut Kalian Masuk Akal Gak Soal ${cleanSubject}? Komen! 👇`);
      suggestions.push(`Share Video ${cleanSubject} Ini ke Temanmu Yang Butuh Tahu! 🚀`);
      suggestions.push(`Kalian Tim Setuju Atau Gak Soal ${cleanSubject}? Diskusi yuk! 💬`);
    }
  }

  // Add specialized topic hooks strictly adapted to the video subject
  topic.hookPrefixes.forEach((prefix) => {
    if (cleanSubject) {
      if (prefix.includes('INI')) {
        suggestions.push(prefix.replace(/INI/g, cleanSubject.toUpperCase()));
      } else if (!prefix.toLowerCase().includes(cleanSubject.toLowerCase())) {
        // Weave subject naturally into the hook
        suggestions.push(`${prefix.replace(/[!?.…]+$/, '')}: ${cleanSubject}! 🔥`);
      } else {
        suggestions.push(prefix);
      }
    } else {
      suggestions.push(prefix);
    }
  });

  if (suggestions.length === 0) {
    suggestions.push(`JANGAN SKIP! Momen ${cleanSubject} Paling Viral Hari Ini 🔥`);
    suggestions.push(`Tonton Sampai Habis, Ending-nya Di Luar Nalar! 🤯`);
  }

  // Ensure unique suggestions
  const uniqueSuggestions = Array.from(new Set(suggestions));
  const mainTagline = uniqueSuggestions[0];

  return {
    mainTagline,
    badge,
    suggestions: uniqueSuggestions.slice(0, 7),
  };
}

/**
 * Automatically detects viral clip moments from audio waveforms, duration, and video context
 */
/**
 * Automatically detects viral clip moments from audio waveforms, speech segments, duration, and video context.
 * Durasi TIDAK HARUS 60 detik - mencari momen pas yang viral secara alami tanpa asal potong!
 */
export function detectViralMoments(
  duration: number,
  waveformPeaks?: number[],
  topic: ViralTopic = 'general',
  customTopicKeyword?: string,
  videoTitle?: string,
  durationMode: MomentDurationMode = 'adaptive',
  soundSegments?: { start: number; end: number }[],
  silenceSegments?: { start: number; end: number }[]
): ViralMoment[] {
  if (duration <= 0) return [];

  const moments: ViralMoment[] = [];

  // If topic is general but title has rich clues, auto-refine topic
  let effectiveTopic = topic;
  let effectiveKeyword = (customTopicKeyword || '').trim();
  if (videoTitle && (!effectiveKeyword || topic === 'general')) {
    const context = extractContextFromTitle(videoTitle);
    if (topic === 'general' && context.detectedTopic !== 'general') {
      effectiveTopic = context.detectedTopic;
    }
    if (!effectiveKeyword) {
      effectiveKeyword = context.cleanSubject;
    }
  }

  // Calculate target clip length baseline according to durationMode
  let minTargetLen = 18;
  let idealTargetLen = 35;
  let maxTargetLen = 85;

  if (durationMode === 'shorts') {
    minTargetLen = 12;
    idealTargetLen = 25;
    maxTargetLen = 45;
  } else if (durationMode === 'medium') {
    minTargetLen = 30;
    idealTargetLen = 55;
    maxTargetLen = 90;
  } else if (durationMode === 'extended') {
    minTargetLen = 50;
    idealTargetLen = 95;
    maxTargetLen = 180;
  } else {
    // 'adaptive' - menyesuaikan durasi total video secara proporsional
    if (duration <= 45) {
      minTargetLen = Math.max(10, duration * 0.4);
      idealTargetLen = duration;
      maxTargetLen = duration;
    } else if (duration <= 90) {
      minTargetLen = 20;
      idealTargetLen = Math.max(25, duration * 0.55);
      maxTargetLen = Math.min(duration, 70);
    } else if (duration <= 240) {
      minTargetLen = 30;
      idealTargetLen = Math.max(45, duration * 0.38);
      maxTargetLen = Math.min(duration, 110);
    } else {
      minTargetLen = 45;
      idealTargetLen = Math.max(60, Math.min(150, duration * 0.25));
      maxTargetLen = Math.min(duration, 180);
    }
  }

  interface SegmentCandidate {
    startSec: number;
    endSec: number;
    avgEnergy: number;
    peakEnergy: number;
    contrast: number;
    category: 'hook' | 'climax' | 'insight' | 'reaction' | 'cta';
    viralReason: string;
  }

  const rawCandidates: SegmentCandidate[] = [];

  // STRATEGY 1: Sound Segments Available (Precise Speech/Sentence Boundaries)
  if (soundSegments && soundSegments.length > 2) {
    // Cluster consecutive sound segments into coherent story arcs
    for (let i = 0; i < soundSegments.length; i++) {
      const segStart = soundSegments[i].start;
      let segEnd = soundSegments[i].end;
      let wordCountEstimate = 1;

      for (let j = i + 1; j < soundSegments.length; j++) {
        const nextSeg = soundSegments[j];
        const prospectiveDur = nextSeg.end - segStart;
        if (prospectiveDur > maxTargetLen) break;

        segEnd = nextSeg.end;
        wordCountEstimate++;

        if (prospectiveDur >= idealTargetLen * 0.75) {
          // Check if followed by a clean pause
          const pauseAfter = (soundSegments[j + 1]?.start || duration) - nextSeg.end;
          if (pauseAfter >= 0.25 || prospectiveDur >= idealTargetLen) {
            let cat: 'hook' | 'climax' | 'insight' | 'reaction' | 'cta' = 'insight';
            let reason = `Dialog utuh (${(segEnd - segStart).toFixed(1)}s) diakhiri jeda nafas alami ${pauseAfter.toFixed(1)}s tanpa terpotong di tengah kata.`;

            if (segStart <= 4) {
              cat = 'hook';
              reason = `Hook pembuka emas (${(segEnd - segStart).toFixed(1)}s) langsung menangkap perhatian penonton sejak detik pertama.`;
            } else if (segEnd >= duration - 10) {
              cat = 'cta';
              reason = `Pemberhentian klimaks & penutup alami (${(segEnd - segStart).toFixed(1)}s) memancing interaksi komentar & share.`;
            }

            rawCandidates.push({
              startSec: Number(segStart.toFixed(1)),
              endSec: Number(segEnd.toFixed(1)),
              avgEnergy: 0.6 + Math.min(0.3, wordCountEstimate * 0.05),
              peakEnergy: 0.85,
              contrast: 0.3,
              category: cat,
              viralReason: reason,
            });
            break;
          }
        }
      }
    }
  }

  // STRATEGY 2: Waveform Peaks Analysis (Volume Energy Bursts, Pauses & Punchlines)
  if (waveformPeaks && waveformPeaks.length > 25) {
    const barsCount = waveformPeaks.length;
    const windowBars = Math.max(8, Math.floor((idealTargetLen / duration) * barsCount));
    const stepBars = Math.max(3, Math.floor(windowBars * 0.35));

    for (let i = 0; i <= barsCount - windowBars; i += stepBars) {
      let sum = 0;
      let peak = 0;
      let valley = 1;

      for (let j = 0; j < windowBars; j++) {
        const val = waveformPeaks[i + j] || 0;
        sum += val;
        if (val > peak) peak = val;
        if (val < valley) valley = val;
      }
      const avg = sum / windowBars;
      const contrast = peak - valley;

      // Smart Snap: Look backward/forward up to 12 bars (~2.5s) for natural speech pause
      let bestStartBar = i;
      let minStartAmp = waveformPeaks[i] || 0;
      for (let s = Math.max(0, i - 10); s <= Math.min(barsCount - 1, i + 8); s++) {
        if ((waveformPeaks[s] || 0) < minStartAmp) {
          minStartAmp = waveformPeaks[s] || 0;
          bestStartBar = s;
        }
      }

      const rawEndBar = i + windowBars;
      let bestEndBar = rawEndBar;
      let minEndAmp = waveformPeaks[rawEndBar] || 0;
      for (let e = Math.max(0, rawEndBar - 10); e <= Math.min(barsCount - 1, rawEndBar + 12); e++) {
        if ((waveformPeaks[e] || 0) < minEndAmp) {
          minEndAmp = waveformPeaks[e] || 0;
          bestEndBar = e;
        }
      }

      const startSec = Number(((bestStartBar / barsCount) * duration).toFixed(1));
      const endSec = Number(((Math.min(barsCount, bestEndBar) / barsCount) * duration).toFixed(1));
      const segDur = endSec - startSec;

      if (segDur < minTargetLen * 0.7 || segDur > maxTargetLen * 1.3) continue;

      let cat: 'hook' | 'climax' | 'insight' | 'reaction' | 'cta' = 'insight';
      let reason = `Poin daging & solusi (${segDur.toFixed(1)}s) dengan artikulasi vokal konsisten.`;

      if (startSec <= 6) {
        cat = 'hook';
        reason = `Hook pembuka anti-skip (${segDur.toFixed(1)}s): Penonton langsung penasaran di detik-detik awal.`;
      } else if (peak >= 0.75 || avg >= 0.52) {
        cat = 'climax';
        reason = `Lonjakan energi suara tertinggi (${segDur.toFixed(1)}s, Peak ${Math.round(peak * 100)}%): Puncak emosi / tawa / aksi paling intens!`;
      } else if (contrast >= 0.45) {
        cat = 'reaction';
        reason = `Struktur punchline klasik (${segDur.toFixed(1)}s): Jeda dramatis diikuti ledakan reaksi spontan.`;
      } else if (endSec >= duration - 12) {
        cat = 'cta';
        reason = `Penutup & kesimpulan (${segDur.toFixed(1)}s): Mendorong penonton untuk meninggalkan komentar & share.`;
      }

      rawCandidates.push({
        startSec,
        endSec,
        avgEnergy: avg,
        peakEnergy: peak,
        contrast,
        category: cat,
        viralReason: reason,
      });
    }
  }

  // STRATEGY 3: Algorithmic Story Arc Pacing (If audio not yet analyzed or too few peaks)
  if (rawCandidates.length === 0) {
    // High-retention non-linear narrative arcs (Hook, Midpoint Climax, Insight, Plot Twist)
    // Never mechanical uniform chunks!
    const hookEnd = Number(Math.min(duration, Math.max(minTargetLen, Math.min(32, duration * 0.35))).toFixed(1));
    rawCandidates.push({
      startSec: 0,
      endSec: hookEnd,
      avgEnergy: 0.75,
      peakEnergy: 0.9,
      contrast: 0.4,
      category: 'hook',
      viralReason: `Hook pembuka anti-skip (${hookEnd}s) untuk menahan scroll di feed Reels & TikTok.`,
    });

    if (duration > 35) {
      const climaxStart = Number(Math.max(hookEnd * 0.8, duration * 0.32).toFixed(1));
      const climaxEnd = Number(Math.min(duration, climaxStart + Math.max(minTargetLen, duration * 0.38)).toFixed(1));
      rawCandidates.push({
        startSec: climaxStart,
        endSec: climaxEnd,
        avgEnergy: 0.82,
        peakEnergy: 0.95,
        contrast: 0.5,
        category: 'climax',
        viralReason: `Momen puncak video (${(climaxEnd - climaxStart).toFixed(1)}s): Inti pembahasan & aksi paling seru.`,
      });
    }

    if (duration > 70) {
      const insightStart = Number((duration * 0.58).toFixed(1));
      const insightEnd = Number(Math.min(duration, insightStart + Math.max(minTargetLen, duration * 0.3)).toFixed(1));
      rawCandidates.push({
        startSec: insightStart,
        endSec: insightEnd,
        avgEnergy: 0.68,
        peakEnergy: 0.84,
        contrast: 0.35,
        category: 'insight',
        viralReason: `Fakta daging & solusi (${(insightEnd - insightStart).toFixed(1)}s) yang wajib disimak penonton.`,
      });
    }

    if (duration > 110) {
      const reactionStart = Number((duration * 0.76).toFixed(1));
      const reactionEnd = Number(duration.toFixed(1));
      rawCandidates.push({
        startSec: reactionStart,
        endSec: reactionEnd,
        avgEnergy: 0.72,
        peakEnergy: 0.88,
        contrast: 0.42,
        category: 'reaction',
        viralReason: `Plot twist & penutup viral (${(reactionEnd - reactionStart).toFixed(1)}s) yang memancing diskusi di kolom komentar.`,
      });
    }
  }

  // Filter and pick the top diverse viral moments
  // Prioritize: 1 Hook, 1 Climax (Highest Peak), 1 Insight, 1 Reaction/CTA
  const finalPicked: SegmentCandidate[] = [];

  // 1. Guaranteed Hook (starts in first 8 seconds)
  const hookCandidate = rawCandidates.find((c) => c.category === 'hook' || c.startSec <= 6);
  if (hookCandidate) {
    finalPicked.push(hookCandidate);
  }

  // 2. Guaranteed Climax (Highest energy in middle 30% to 80%)
  const climaxPool = rawCandidates
    .filter((c) => c.startSec > 6 && c.endSec < duration)
    .sort((a, b) => b.peakEnergy * 0.6 + b.avgEnergy * 0.4 - (a.peakEnergy * 0.6 + a.avgEnergy * 0.4));

  for (const c of climaxPool) {
    const overlaps = finalPicked.some(
      (p) => Math.abs(p.startSec - c.startSec) < idealTargetLen * 0.6
    );
    if (!overlaps) {
      finalPicked.push(c);
      break;
    }
  }

  // 3. Fill remaining slots up to 4-5 diverse moments
  const sortedByScore = [...rawCandidates].sort((a, b) => {
    const scoreA = a.peakEnergy * 0.5 + a.contrast * 0.3 + a.avgEnergy * 0.2;
    const scoreB = b.peakEnergy * 0.5 + b.contrast * 0.3 + b.avgEnergy * 0.2;
    return scoreB - scoreA;
  });

  for (const c of sortedByScore) {
    if (finalPicked.length >= 5) break;
    const tooClose = finalPicked.some(
      (p) => Math.abs(p.startSec - c.startSec) < idealTargetLen * 0.55
    );
    if (!tooClose) {
      finalPicked.push(c);
    }
  }

  // Sort picked moments chronologically
  finalPicked.sort((a, b) => a.startSec - b.startSec);

  // Generate customized moments with high-converting Indonesian viral taglines
  finalPicked.forEach((p, idx) => {
    const { mainTagline, badge, suggestions } = generateTaglinesForMoment(
      effectiveTopic,
      p.category,
      effectiveKeyword,
      videoTitle
    );

    // Calculate score (88 - 99%)
    const scoreBase = Math.round(86 + p.peakEnergy * 10 + (p.category === 'climax' ? 3 : 0));
    const viralScore = Math.min(99, Math.max(88, scoreBase));
    const clipDurSec = Number((p.endSec - p.startSec).toFixed(1));

    const subjectLabel = effectiveKeyword ? ` (${effectiveKeyword})` : '';
    let title = `Klip Viral #${idx + 1}`;
    if (p.category === 'hook') title = `🔥 Hook Pembuka Anti-Skip${subjectLabel}`;
    if (p.category === 'climax') title = `⚡ Puncak Emosi & Momen Seru${subjectLabel}`;
    if (p.category === 'insight') title = `💡 Fakta Daging & Rahasia${subjectLabel}`;
    if (p.category === 'reaction') title = `😱 Plot Twist & Reaksi Spontan${subjectLabel}`;
    if (p.category === 'cta') title = `🚀 Penutup & Klimaks Akhir${subjectLabel}`;

    moments.push({
      id: `viral-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      tagline: mainTagline,
      taglineBadge: badge,
      category: p.category,
      startTime: p.startSec,
      endTime: p.endSec,
      viralScore,
      reason: `${p.viralReason} (Durasi ${clipDurSec}s)`,
      suggestedTaglines: suggestions,
    });
  });

  return moments;
}

/**
 * Fetch Gemini-powered contextual clips and taglines from the backend
 */
export async function fetchGeminiViralMoments(
  videoName: string,
  duration: number,
  topic: ViralTopic = 'general',
  customKeyword?: string,
  durationMode: MomentDurationMode = 'adaptive'
): Promise<{ moments: ViralMoment[]; detectedTheme?: string; antiCopyrightNotes?: string } | null> {
  try {
    const res = await fetch('/api/gemini/analyze-video-moments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoName,
        duration,
        topic,
        customKeyword,
        durationMode,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.clips) && data.clips.length > 0) {
      const moments: ViralMoment[] = data.clips.map((c: any, idx: number) => ({
        id: `gemini-clip-${Date.now()}-${idx}`,
        title: c.title,
        tagline: c.tagline,
        taglineBadge: c.taglineBadge || '🔥 VIRAL HOOK',
        category: (c.category || 'hook') as ViralMoment['category'],
        startTime: Number(c.startTime || 0),
        endTime: Number(c.endTime || duration),
        viralScore: Number(c.viralScore || 95),
        reason: c.reason || 'Dianalisis oleh AI Gemini berdasarkan keutuhan momen & dialog video.',
        suggestedTaglines: Array.isArray(c.suggestedTaglines) && c.suggestedTaglines.length > 0
          ? c.suggestedTaglines
          : [c.tagline],
      }));
      return {
        moments,
        detectedTheme: data.detectedTheme,
        antiCopyrightNotes: data.antiCopyrightNotes,
      };
    }
  } catch (err) {
    console.warn('Failed to fetch Gemini viral moments:', err);
  }
  return null;
}

/**
 * Convert detected viral moments into VideoClips for the timeline
 */
export function convertViralMomentsToClips(moments: ViralMoment[]): VideoClip[] {
  const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981'];

  return moments.map((m, idx) => ({
    id: `clip-viral-${Date.now()}-${idx}`,
    name: m.title.replace(/[🔥⚡💡😱🚀]/g, '').trim() || `Viral Klip ${idx + 1}`,
    startTime: m.startTime,
    endTime: m.endTime,
    color: colors[idx % colors.length],
    isMuted: false,
    tagline: m.tagline,
    taglineBadge: m.taglineBadge,
    viralScore: m.viralScore,
    category: m.category,
    reason: m.reason,
    suggestedTaglines: m.suggestedTaglines,
  }));
}
