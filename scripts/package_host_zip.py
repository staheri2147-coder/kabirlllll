import os
import zipfile
import shutil

dist_dir = 'dist'
out_zip = 'public/alborz_pipe_latest_package.zip'
dist_out_zip = 'dist/alborz_pipe_latest_package.zip'

if not os.path.exists(dist_dir):
    print("dist directory does not exist. Run vite build first.")
    exit(1)

files_to_zip = [
    ('.htaccess', '.htaccess'),
    ('index.html', 'index.html'),
    ('api.php', 'api.php'),
    ('db_config.php', 'db_config.php'),
    ('راهنمای_نصب_هاست_و_لوکال.txt', 'راهنمای_نصب_هاست_و_لوکال.txt'),
    ('AlborzPipe_MySQL_FullDump_2026-10-03.sql', 'AlborzPipe_MySQL_FullDump_2026-10-03.sql'),
]

os.makedirs('public', exist_ok=True)

with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for src_rel, arcname in files_to_zip:
        p = os.path.join(dist_dir, src_rel)
        if not os.path.exists(p):
            p = os.path.join('public', src_rel)
        if not os.path.exists(p):
            p = src_rel
        if os.path.exists(p):
            z.write(p, arcname)

    assets_dir = os.path.join(dist_dir, 'assets')
    if os.path.exists(assets_dir):
        for f in os.listdir(assets_dir):
            fp = os.path.join(assets_dir, f)
            if os.path.isfile(fp):
                z.write(fp, f'assets/{f}')

    uploads_dir = os.path.join(dist_dir, 'uploads')
    if not os.path.exists(uploads_dir):
        uploads_dir = 'public/uploads'
    if os.path.exists(uploads_dir):
        for f in os.listdir(uploads_dir):
            fp = os.path.join(uploads_dir, f)
            if os.path.isfile(fp):
                z.write(fp, f'uploads/{f}')

if os.path.exists(dist_dir):
    shutil.copyfile(out_zip, dist_out_zip)

print(f"Packaged latest host zip: {out_zip} ({os.path.getsize(out_zip)} bytes)")
