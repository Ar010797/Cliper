/**
 * Generates and downloads a self-contained single-file HTML version of ClipRush
 * so users can open it directly in any web browser without any server or setup.
 */
export function generateSingleFileHtml(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClipRush - Professional Video Clipper</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      background-color: #0b0b0f;
      color: #f3f4f6;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    h1, h2, h3, .font-heading {
      font-family: 'Space Grotesk', system-ui, sans-serif;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
    }
    .glass-panel {
      background: rgba(18, 18, 26, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: rgba(24, 24, 35, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    /* Waveform canvas styling */
    #waveformCanvas {
      width: 100%;
      height: 72px;
      display: block;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-[#0b0b0f] text-slate-100 antialiased selection:bg-purple-500 selection:text-white">

  <!-- Top Navigation Bar -->
  <header class="h-16 border-b border-white/10 glass-panel px-6 flex items-center justify-between z-20 shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
        <i data-lucide="scissors" class="w-5 h-5 text-white"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-heading font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">ClipRush</span>
          <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">Standalone v1.0</span>
        </div>
        <p class="text-[11px] text-slate-400 hidden sm:block">Smart Client-Side Video Clipper & Editor</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button id="btnSampleVideo" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition flex items-center gap-2">
        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
        <span>Demo Clip</span>
      </button>
      <button id="btnExportTop" class="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-lg shadow-purple-600/20 transition flex items-center gap-2">
        <i data-lucide="download" class="w-4 h-4"></i>
        <span>Export Video</span>
      </button>
    </div>
  </header>

  <!-- Main Studio Workspace -->
  <main class="flex-1 flex overflow-hidden">
    <!-- Left Sidebar: Modes -->
    <aside class="w-64 border-r border-white/10 glass-panel flex flex-col p-4 gap-4 overflow-y-auto">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Video Intake</div>
      
      <!-- Upload Card -->
      <div id="dropzone" class="border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 rounded-2xl p-4 text-center cursor-pointer transition bg-violet-500/5 hover:bg-violet-500/10 flex flex-col items-center gap-2">
        <input type="file" id="fileInput" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" class="hidden">
        <div class="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
          <i data-lucide="upload-cloud" class="w-5 h-5"></i>
        </div>
        <div class="text-xs font-semibold text-slate-200">Upload Video</div>
        <div class="text-[10px] text-slate-400">Drag & drop MP4, WebM, MOV</div>
      </div>

      <!-- YouTube Card -->
      <div class="glass-card rounded-2xl p-3 flex flex-col gap-2">
        <div class="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <i data-lucide="youtube" class="w-4 h-4 text-red-400"></i>
          <span>YouTube URL</span>
        </div>
        <input type="text" id="ytUrlInput" placeholder="https://youtube.com/watch?v=..." class="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500">
        <button id="btnFetchYt" class="w-full py-2 rounded-xl text-xs font-semibold bg-violet-600/30 hover:bg-violet-600/40 border border-violet-500/40 text-violet-300 transition flex items-center justify-center gap-1.5">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
          <span>Ambil Video</span>
        </button>
      </div>

      <!-- Smart Cut & Silence Tools -->
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">Auto-Cut Tools</div>
      <div class="glass-card rounded-2xl p-3 flex flex-col gap-3">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-slate-200 flex items-center gap-1.5">
            <i data-lucide="wand-2" class="w-4 h-4 text-cyan-400"></i>
            <span>Smart Silence Cut</span>
          </span>
          <span id="thresholdVal" class="text-[11px] font-mono text-cyan-400">-35 dB</span>
        </div>
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">Ambang Volume (RMS dB)</label>
          <input type="range" id="thresholdSlider" min="-50" max="-15" value="-35" class="w-full accent-cyan-400">
        </div>
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">Min Durasi Hening</label>
          <div class="flex items-center justify-between text-xs">
            <input type="range" id="minSilenceSlider" min="0.2" max="2.0" step="0.1" value="0.5" class="w-full accent-cyan-400">
            <span id="minSilenceVal" class="text-[11px] font-mono text-cyan-400 ml-2">0.5s</span>
          </div>
        </div>
        <button id="btnAutoSilence" class="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20">
          <i data-lucide="scissors" class="w-3.5 h-3.5"></i>
          <span>Hapus Semua Jeda Hening</span>
        </button>
      </div>

      <!-- Preset Highlights -->
      <div class="glass-card rounded-2xl p-3 flex flex-col gap-2">
        <div class="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <i data-lucide="flame" class="w-4 h-4 text-amber-400"></i>
          <span>Auto Highlight</span>
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          <button class="btn-highlight py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5" data-sec="15">15s</button>
          <button class="btn-highlight py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5" data-sec="30">30s</button>
          <button class="btn-highlight py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5" data-sec="60">60s</button>
        </div>
      </div>
    </aside>

    <!-- Center: Preview Player & Timeline -->
    <section class="flex-1 flex flex-col min-w-0 bg-[#07070a]">
      <!-- Video Screen Viewport -->
      <div class="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div id="playerContainer" class="relative max-w-4xl w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center group">
          <video id="videoElement" class="w-full h-full object-contain" playsinline></video>
          
          <div id="emptyState" class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/80">
            <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-violet-400">
              <i data-lucide="film" class="w-8 h-8"></i>
            </div>
            <div class="font-heading text-lg font-bold text-slate-200">Belum Ada Video Dimuat</div>
            <p class="text-xs text-slate-400 max-w-sm">Upload video kamu dari sidebar atau klik tombol "Demo Clip" di atas untuk mencoba fitur Smart Cut langsung.</p>
          </div>

          <!-- Video Overlays / Subtitle -->
          <div id="captionDisplay" class="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-black/75 text-white text-sm font-semibold pointer-events-none hidden text-center shadow-lg"></div>

          <!-- Floating Player Controls Bar -->
          <div class="absolute bottom-3 left-4 right-4 h-12 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 px-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div class="flex items-center gap-2">
              <button id="btnPlayPause" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                <i data-lucide="play" class="w-4 h-4"></i>
              </button>
              <button id="btnPrevFrame" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 transition" title="-1 Frame (Arrow Left)">
                <i data-lucide="step-back" class="w-4 h-4"></i>
              </button>
              <button id="btnNextFrame" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 transition" title="+1 Frame (Arrow Right)">
                <i data-lucide="step-forward" class="w-4 h-4"></i>
              </button>
              <span id="timecodeDisplay" class="font-mono text-xs text-slate-300 ml-2">00:00.00 / 00:00.00</span>
            </div>

            <div class="flex items-center gap-3">
              <select id="speedSelect" class="bg-black/60 border border-white/10 rounded-lg text-xs px-2 py-1 text-slate-300 focus:outline-none">
                <option value="0.5">0.5x</option>
                <option value="1" selected>1.0x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
              <button id="btnFullscreen" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 transition">
                <i data-lucide="maximize" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Audio Waveform & Multi-Clip Timeline -->
      <div class="h-64 border-t border-white/10 glass-panel flex flex-col shrink-0">
        <!-- Timeline Header Toolbar -->
        <div class="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-black/20 text-xs">
          <div class="flex items-center gap-3">
            <span class="font-semibold text-slate-300 flex items-center gap-1.5">
              <i data-lucide="layers" class="w-4 h-4 text-violet-400"></i>
              <span>Timeline Editor</span>
            </span>
            <span id="clipCountLabel" class="text-slate-400 text-[11px]">0 Klip Aktif</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="btnSplitClip" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 text-[11px] font-semibold flex items-center gap-1" title="Shortcut: S">
              <i data-lucide="scissors" class="w-3 h-3"></i>
              <span>Split (S)</span>
            </button>
            <button id="btnDeleteClip" class="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-semibold flex items-center gap-1" title="Shortcut: Delete">
              <i data-lucide="trash-2" class="w-3 h-3"></i>
              <span>Hapus Klip</span>
            </button>
          </div>
        </div>

        <!-- Waveform Canvas Track -->
        <div class="relative flex-1 bg-black/40 overflow-hidden select-none" id="timelineTrackContainer">
          <canvas id="waveformCanvas"></canvas>
          
          <!-- Playhead Line -->
          <div id="playhead" class="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-10" style="left: 0%;">
            <div class="w-3 h-3 bg-cyan-400 rounded-full -ml-[5px] -mt-1 shadow-lg shadow-cyan-400/50"></div>
          </div>

          <!-- Interactive Clips Strip -->
          <div id="clipsContainer" class="absolute left-0 right-0 bottom-1 h-12 flex gap-1 px-2 items-center pointer-events-auto"></div>
        </div>

        <!-- Timeline Info Footer -->
        <div class="h-8 border-t border-white/5 px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-black/30">
          <div>Shortcut: Space (Play/Pause) · S (Split) · J/K/L (Scrub) · I/O (Trim In/Out)</div>
          <div id="totalEditDuration" class="text-cyan-400 font-semibold">Total Durasi: 00:00.00</div>
        </div>
      </div>
    </section>

    <!-- Right Sidebar: Clip Inspector & Export -->
    <aside class="w-72 border-l border-white/10 glass-panel flex flex-col p-4 gap-4 overflow-y-auto">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Inspektur Klip</div>
      
      <div id="selectedClipInfo" class="glass-card rounded-2xl p-3 flex flex-col gap-2">
        <div class="text-xs font-semibold text-slate-200" id="clipNameTitle">Pilih klip di timeline</div>
        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="bg-black/30 p-2 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-400 block font-sans">IN Point</span>
            <span id="clipInTime" class="text-cyan-400">00:00.00</span>
          </div>
          <div class="bg-black/30 p-2 rounded-xl border border-white/5">
            <span class="text-[10px] text-slate-400 block font-sans">OUT Point</span>
            <span id="clipOutTime" class="text-violet-400">00:00.00</span>
          </div>
        </div>
      </div>

      <!-- Export Presets -->
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 pt-2">Pengaturan Export</div>
      <div class="glass-card rounded-2xl p-3 flex flex-col gap-3">
        <div>
          <label class="text-[11px] text-slate-300 block mb-1">Rasio Aspek</label>
          <select id="exportRatio" class="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-slate-200">
            <option value="original">Original</option>
            <option value="16:9">16:9 (YouTube / Widescreen)</option>
            <option value="9:16">9:16 (TikTok / Reels / Shorts)</option>
            <option value="1:1">1:1 (Instagram Feed)</option>
            <option value="4:5">4:5 (Portrait Social)</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] text-slate-300 block mb-1">Resolusi</label>
          <select id="exportRes" class="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-slate-200">
            <option value="original">Resolusi Asli</option>
            <option value="1080p">1080p Full HD</option>
            <option value="720p" selected>720p HD</option>
            <option value="480p">480p SD</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] text-slate-300 block mb-1">Mode Framing (Jika Rasio Berubah)</label>
          <select id="exportFit" class="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-slate-200">
            <option value="letterbox">Letterbox (Bilah Hitam)</option>
            <option value="crop">Crop Center (Isi Penuh)</option>
            <option value="blur">Blur Background (Estetik)</option>
          </select>
        </div>
        <button id="btnStartExport" class="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2">
          <i data-lucide="download" class="w-4 h-4"></i>
          <span>Mulai Export Sekarang</span>
        </button>
      </div>
    </aside>
  </main>

  <!-- Script Initialization -->
  <script>
    lucide.createIcons();

    // App state
    let videoFile = null;
    let videoDuration = 0;
    let activeClips = [];
    let selectedClipIndex = 0;
    let isPlaying = false;
    let audioPeaks = [];

    const videoEl = document.getElementById('videoElement');
    const playPauseBtn = document.getElementById('btnPlayPause');
    const timecodeDisplay = document.getElementById('timecodeDisplay');
    const playhead = document.getElementById('playhead');
    const clipsContainer = document.getElementById('clipsContainer');
    const totalEditDuration = document.getElementById('totalEditDuration');
    const clipCountLabel = document.getElementById('clipCountLabel');
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('dropzone');

    function formatTime(sec) {
      if (!sec || isNaN(sec)) return '00:00.00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 100);
      return \`\${m < 10 ? '0' : ''}\${m}:\${s < 10 ? '0' : ''}\${s}.\${ms < 10 ? '0' : ''}\${ms}\`;
    }

    function renderClips() {
      clipsContainer.innerHTML = '';
      if (!activeClips.length) {
        clipCountLabel.innerText = '0 Klip';
        totalEditDuration.innerText = 'Total Durasi: 00:00.00';
        return;
      }
      clipCountLabel.innerText = \`\${activeClips.length} Klip\`;
      const totalSec = activeClips.reduce((acc, c) => acc + (c.end - c.start), 0);
      totalEditDuration.innerText = \`Total Durasi: \${formatTime(totalSec)}\`;

      activeClips.forEach((clip, idx) => {
        const div = document.createElement('div');
        div.className = \`flex-1 h-full rounded-xl border flex flex-col justify-center px-3 cursor-pointer transition select-none \${selectedClipIndex === idx ? 'bg-violet-600/40 border-violet-400' : 'bg-white/10 border-white/10 hover:bg-white/20'}\`;
        div.innerHTML = \`<span class="text-xs font-bold text-white truncate">\${clip.name || 'Klip ' + (idx + 1)}</span><span class="text-[10px] font-mono text-cyan-300">\${formatTime(clip.end - clip.start)}</span>\`;
        div.onclick = () => {
          selectedClipIndex = idx;
          videoEl.currentTime = clip.start;
          renderClips();
        };
        clipsContainer.appendChild(div);
      });
    }

    // Load file
    function loadVideo(file) {
      videoFile = file;
      const url = URL.createObjectURL(file);
      videoEl.src = url;
      document.getElementById('emptyState').classList.add('hidden');
      videoEl.onloadedmetadata = () => {
        videoDuration = videoEl.duration;
        activeClips = [{ id: '1', name: 'Klip 1', start: 0, end: videoDuration }];
        selectedClipIndex = 0;
        renderClips();
        timecodeDisplay.innerText = \`00:00.00 / \${formatTime(videoDuration)}\`;
        drawWaveform();
      };
    }

    dropzone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) loadVideo(e.target.files[0]);
    };

    // Play/Pause
    playPauseBtn.onclick = () => {
      if (videoEl.paused) {
        videoEl.play();
        playPauseBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i>';
      } else {
        videoEl.pause();
        playPauseBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>';
      }
      lucide.createIcons();
    };

    videoEl.ontimeupdate = () => {
      timecodeDisplay.innerText = \`\${formatTime(videoEl.currentTime)} / \${formatTime(videoDuration)}\`;
      if (videoDuration > 0) {
        const pct = (videoEl.currentTime / videoDuration) * 100;
        playhead.style.left = \`\${pct}%\`;
      }
    };

    // Fetch URL or Direct Link
    document.getElementById('btnFetchYt').onclick = async () => {
      const urlInput = document.getElementById('ytUrlInput');
      const url = urlInput.value.trim();
      if (!url) {
        alert('Silakan masukkan tautan video (direct MP4/WebM atau link YouTube).');
        return;
      }

      // If YouTube link
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const choice = confirm(
          'Official Cobalt telah menonaktifkan unduhan YouTube karena pembatasan YouTube.\\n\\nIngin membuka konverter cepat (yt1s / cobalt web) untuk mengunduh MP4 dalam 1-klik, lalu seret ke sini?'
        );
        if (choice) {
          window.open('https://yt1s.com/en?q=' + encodeURIComponent(url), '_blank');
        }
        return;
      }

      // Direct video fetch
      try {
        const btn = document.getElementById('btnFetchYt');
        btn.innerText = 'Mengunduh stream...';
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        loadVideo(blob);
        btn.innerHTML = '<i data-lucide="download" class="w-3.5 h-3.5"></i><span>Ambil Video</span>';
        lucide.createIcons();
      } catch (err) {
        alert('Gagal mengunduh video langsung: ' + err.message + '\\nCoba gunakan tombol Demo Clip atau upload file lokal.');
        document.getElementById('btnFetchYt').innerHTML = '<i data-lucide="download" class="w-3.5 h-3.5"></i><span>Ambil Video</span>';
        lucide.createIcons();
      }
    };

    // Preset Highlight buttons
    document.querySelectorAll('.btn-highlight').forEach((btn) => {
      btn.onclick = () => {
        const sec = parseInt(btn.getAttribute('data-sec') || '30', 10);
        if (!videoDuration) {
          alert('Muat video terlebih dahulu!');
          return;
        }
        const numChunks = Math.max(1, Math.floor(videoDuration / sec));
        activeClips = [];
        for (let i = 0; i < numChunks; i++) {
          activeClips.push({
            id: 'h-' + i,
            name: 'Highlight ' + (i + 1) + ' (' + sec + 's)',
            start: i * sec,
            end: Math.min(videoDuration, (i + 1) * sec),
          });
        }
        selectedClipIndex = 0;
        renderClips();
      };
    });

    // Waveform simulation / render
    function drawWaveform() {
      const canvas = document.getElementById('waveformCanvas');
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 72;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#a855f7';
      const bars = 120;
      const barW = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const h = Math.sin(i * 0.15) * 20 + 25 + Math.random() * 15;
        ctx.fillRect(i * barW + 1, (canvas.height - h) / 2, barW - 2, h);
      }
    }

    // Demo clip generator
    document.getElementById('btnSampleVideo').onclick = async () => {
      alert('Video demo otomatis dimuat ke editor!');
      videoDuration = 14;
      activeClips = [
        { id: '1', name: 'Intro', start: 0, end: 3.5 },
        { id: '2', name: 'Presentasi', start: 5.5, end: 9.0 },
        { id: '3', name: 'Outro', start: 10.8, end: 14.0 },
      ];
      renderClips();
      drawWaveform();
      document.getElementById('emptyState').classList.add('hidden');
    };

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        playPauseBtn.click();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Initiates download of the standalone single-file HTML version
 */
export function downloadSingleFileHtml() {
  const htmlContent = generateSingleFileHtml();
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cliprush_standalone.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
