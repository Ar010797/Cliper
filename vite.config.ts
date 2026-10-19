import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function cliprushApiPlugin(): Plugin {
  return {
    name: 'cliprush-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || '';

        // Serve /samples/* with proper video/mp4 headers
        if (reqUrl.startsWith('/samples/')) {
          const sampleName = reqUrl.replace('/samples/', '').split('?')[0];
          const filePath = path.resolve(__dirname, 'public/samples', sampleName);
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            const range = req.headers.range;

            if (range) {
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
              const chunksize = end - start + 1;
              const file = fs.createReadStream(filePath, { start, end });
              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Access-Control-Allow-Origin': '*',
              });
              file.pipe(res);
              return;
            } else {
              res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
              });
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
        }

        // Health check endpoint
        if (reqUrl.startsWith('/api/health')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ status: 'ok', server: 'ClipRush Vite' }));
          return;
        }

        // Video Proxy Stream to bypass CORS
        if (reqUrl.startsWith('/api/proxy-stream')) {
          const parsedUrl = new URL(reqUrl, 'http://localhost:3000');
          const targetUrl = parsedUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Parameter url wajib disertakan' }));
            return;
          }

          try {
            const decodedUrl = decodeURIComponent(targetUrl);
            const headers: Record<string, string> = {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              Accept: '*/*',
            };
            if (req.headers.range) {
              headers['Range'] = req.headers.range;
            }

            const response = await fetch(decodedUrl, { headers, redirect: 'follow' });

            res.statusCode = response.status;
            res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Access-Control-Allow-Origin', '*');

            const contentRange = response.headers.get('content-range');
            if (contentRange) res.setHeader('Content-Range', contentRange);

            const contentLength = response.headers.get('content-length');
            if (contentLength) res.setHeader('Content-Length', contentLength);

            if (!response.body) {
              res.end();
              return;
            }

            const reader = response.body.getReader();
            req.on('close', () => {
              reader.cancel().catch(() => {});
            });

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) res.write(Buffer.from(value));
            }
            res.end();
            return;
          } catch (err: unknown) {
            const error = err as Error;
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Gagal proxy video: ${error.message}` }));
            return;
          }
        }

        // Link Resolution API
        if (reqUrl.startsWith('/api/resolve-link') && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const url = (body.url || '').trim();

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');

              if (!url) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'URL kosong' }));
                return;
              }

              // 1. Hosted sample check
              if (url.startsWith('/samples/') || url.includes('cliprush_demo_')) {
                const sampleName = path.basename(url.split('?')[0]);
                res.end(
                  JSON.stringify({
                    success: true,
                    type: 'sample',
                    streamUrl: `/samples/${sampleName}`,
                    title: `Contoh Video ClipRush (${sampleName})`,
                  })
                );
                return;
              }

              // 2. Direct video URL check
              const isDirect = /\.(mp4|webm|mov|mkv|m4v)(\?.*)?$/i.test(url);
              if (isDirect) {
                const filename = path.basename(url.split('?')[0]) || 'video.mp4';
                res.end(
                  JSON.stringify({
                    success: true,
                    type: 'direct',
                    streamUrl: `/api/proxy-stream?url=${encodeURIComponent(url)}`,
                    directUrl: url,
                    title: decodeURIComponent(filename),
                  })
                );
                return;
              }

              // 3. Google Drive
              const gdriveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
              if (gdriveMatch && gdriveMatch[1]) {
                const driveId = gdriveMatch[1];
                const directDrive = `https://drive.google.com/uc?export=download&id=${driveId}`;
                res.end(
                  JSON.stringify({
                    success: true,
                    type: 'gdrive',
                    streamUrl: `/api/proxy-stream?url=${encodeURIComponent(directDrive)}`,
                    title: `Google Drive Video (${driveId})`,
                  })
                );
                return;
              }

              // 4. Dropbox
              if (url.includes('dropbox.com')) {
                const directDropbox = url.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
                res.end(
                  JSON.stringify({
                    success: true,
                    type: 'dropbox',
                    streamUrl: `/api/proxy-stream?url=${encodeURIComponent(directDropbox)}`,
                    title: 'Dropbox Video',
                  })
                );
                return;
              }

              // 5. YouTube & Shorts
              const ytIdMatch =
                url.match(/\/shorts\/([a-zA-Z0-9_-]+)/) ||
                url.match(/[?&]v=([a-zA-Z0-9_-]+)/) ||
                url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) ||
                url.match(/\/embed\/([a-zA-Z0-9_-]+)/);

              if (ytIdMatch && ytIdMatch[1]) {
                const videoId = ytIdMatch[1];
                let title = `YouTube Video (${videoId})`;
                const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

                try {
                  const oembedRes = await fetch(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
                    { signal: AbortSignal.timeout(2500) }
                  );
                  if (oembedRes.ok) {
                    const oData = (await oembedRes.json()) as { title?: string };
                    if (oData.title) title = oData.title;
                  }
                } catch {
                  // ignore
                }

                res.end(
                  JSON.stringify({
                    success: false,
                    isYouTube: true,
                    id: videoId,
                    title,
                    thumbnail,
                    message:
                      'Server YouTube membatasi download langsung dari IP datacenter. Gunakan Video Siap Pakai di bawah, atau konversi MP4 lalu buka file di sini.',
                  })
                );
                return;
              }

              // Default: Try HEAD request to see if video stream
              try {
                const headRes = await fetch(url, {
                  method: 'HEAD',
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  signal: AbortSignal.timeout(4000),
                });
                const cType = headRes.headers.get('content-type') || '';
                if (cType.includes('video') || cType.includes('octet-stream')) {
                  res.end(
                    JSON.stringify({
                      success: true,
                      type: 'direct',
                      streamUrl: `/api/proxy-stream?url=${encodeURIComponent(url)}`,
                      title: 'Web Video Stream',
                    })
                  );
                  return;
                }
              } catch {
                // ignore
              }

              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    'Tautan tidak dapat diproses secara langsung. Pastikan link adalah video (.mp4/.webm) atau gunakan opsi Video Siap Pakai ClipRush.',
                })
              );
            } catch (err: unknown) {
              const error = err as Error;
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cliprushApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
