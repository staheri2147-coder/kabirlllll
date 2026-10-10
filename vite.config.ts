import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function mockPhpApiPlugin(): Plugin {
  let dbData: any = null;
  let revision = 1;
  const storeFilePath = path.resolve(__dirname, '.db_store.json');
  try {
    if (fs.existsSync(storeFilePath)) {
      dbData = JSON.parse(fs.readFileSync(storeFilePath, 'utf-8'));
    }
  } catch {}

  const saveToDisk = () => {
    try {
      if (dbData) {
        fs.writeFileSync(storeFilePath, JSON.stringify(dbData), 'utf-8');
      }
    } catch {}
  };

  return {
    name: 'mock-php-api',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        const urlStr = req.url || '';
        if (urlStr.includes('api.php')) {
          const urlObj = new URL(urlStr, 'http://localhost');
          const action = urlObj.searchParams.get('action');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                if (action === 'save' || action === 'restore') {
                  const parsed = JSON.parse(body || '{}');
                  dbData = parsed;
                  revision++;
                  saveToDisk();
                  res.end(JSON.stringify({ success: true, revision, message: 'اطلاعات با موفقیت ذخیره گردید.' }));
                  return;
                }
                if (action === 'save_item') {
                  revision++;
                  res.end(JSON.stringify({ success: true, message: 'ثبت با موفقیت انجام شد.' }));
                  return;
                }
                if (action === 'upload_image' || action === 'upload_file') {
                  let parsed: any = {};
                  try {
                    parsed = JSON.parse(body || '{}');
                  } catch {}
                  const type = parsed.type || 'img';
                  const base64Data = parsed.base64 || '';
                  
                  let ext = 'png';
                  if (base64Data.includes('image/jpeg') || base64Data.includes('image/jpg')) ext = 'jpg';
                  else if (base64Data.includes('image/webp')) ext = 'webp';
                  else if (base64Data.includes('image/svg')) ext = 'svg';

                  let filename = `${type}_${Date.now()}.${ext}`;
                  if (type === 'logo') filename = `logo.${ext}`;
                  else if (type === 'stamp') filename = `stamp_signature.png`;
                  else if (type === 'bg' || type === 'cover') filename = `login_bg.${ext}`;

                  const uploadsDir = path.resolve(__dirname, 'public/uploads');
                  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

                  if (base64Data) {
                    const rawB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
                    try {
                      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(rawB64, 'base64'));
                    } catch (e) {}
                  }

                  const targetUrl = `uploads/${filename}?v=${Date.now()}`;

                  if (dbData && dbData.settings) {
                    if (type === 'logo') dbData.settings.logo_url = targetUrl;
                    if (type === 'stamp') dbData.settings.stamp_signature_url = targetUrl;
                    if (type === 'bg' || type === 'cover') dbData.settings.login_background_url = targetUrl;
                    saveToDisk();
                  }

                  res.end(JSON.stringify({
                    success: true,
                    url: targetUrl,
                    filename,
                    message: 'تصویر با موفقیت در پوشه uploads ذخیره گردید.'
                  }));
                  return;
                }
                if (action === 'save_settings') {
                  revision++;
                  res.end(JSON.stringify({ success: true, message: 'تنظیمات با موفقیت ذخیره شد.' }));
                  return;
                }
                if (action === 'delete_item') {
                  revision++;
                  res.end(JSON.stringify({ success: true, message: 'حذف با موفقیت انجام شد.' }));
                  return;
                }
                if (action === 'test_db') {
                  res.end(JSON.stringify({ success: true, message: 'ارتباط آزمایشی با دیتابیس برقرار است.', version: '8.0.36-in-memory' }));
                  return;
                }
                if (action === 'save_db_config') {
                  res.end(JSON.stringify({ success: true, message: 'تنظیمات اتصال با موفقیت ذخیره شد.' }));
                  return;
                }
                if (action === 'restore_sql') {
                  res.end(JSON.stringify({ success: true, message: 'بازیابی فایل SQL انجام شد.' }));
                  return;
                }
                if (action === 'factory_reset') {
                  dbData = null;
                  revision++;
                  try { if (fs.existsSync(storeFilePath)) fs.unlinkSync(storeFilePath); } catch {}
                  res.end(JSON.stringify({ success: true, message: 'بازنشانی با موفقیت انجام شد.' }));
                  return;
                }
                res.end(JSON.stringify({ success: true, message: 'عملیات موفق' }));
              } catch (e: any) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: e.message }));
              }
            });
            return;
          }

          // GET handlers
          if (action === 'status') {
            res.end(JSON.stringify({
              success: true,
              status: 'online',
              engine: 'in-memory',
              message: 'سرور فعال است',
              tablesCount: 22,
              totalRecords: dbData ? Object.keys(dbData).length : 0,
            }));
            return;
          }
          if (action === 'load') {
            res.end(JSON.stringify({
              success: true,
              engine: 'in-memory',
              revision,
              data: dbData,
            }));
            return;
          }
          if (action === 'version') {
            res.end(JSON.stringify({
              success: true,
              revision,
              total_rows: dbData ? Object.keys(dbData).length : 0,
              reset_epoch: '0',
            }));
            return;
          }
          if (action === 'backup_sql') {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('-- Alborz Pipe In-Memory SQL Backup\n');
            return;
          }

          res.end(JSON.stringify({ success: true, status: 'online' }));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), mockPhpApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
