#!/usr/bin/env python3
import os
import zipfile
import shutil

def package():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(base_dir, 'dist')
    public_dir = os.path.join(base_dir, 'public')
    
    zip_pkg_name = 'alborz_pipe_latest_package.zip'
    zip_public_path = os.path.join(public_dir, zip_pkg_name)
    zip_root_path = os.path.join(base_dir, zip_pkg_name)
    
    seen = set()
    files_to_add = []
    
    # 1. Add everything from dist except previous zips
    if os.path.exists(dist_dir):
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                if file.endswith('.zip') or file.endswith('.tar.gz'):
                    continue
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, dist_dir)
                if rel_path not in seen:
                    seen.add(rel_path)
                    files_to_add.append((abs_path, rel_path))
            
    # 2. Add PHP and setup files from public if not in dist
    for extra in ['api.php', 'db_config.php', 'download_pkg.php', '.htaccess', 'راهنمای_نصب_هاست_و_لوکال.txt', 'AlborzPipe_MySQL_FullDump_2026-10-03.sql']:
        if extra not in seen:
            p = os.path.join(public_dir, extra)
            if os.path.exists(p):
                seen.add(extra)
                files_to_add.append((p, extra))
            
    # Create the zip archive
    print(f"Creating {zip_public_path} with {len(files_to_add)} files...")
    with zipfile.ZipFile(zip_public_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for abs_p, arc_name in files_to_add:
            print(f"  + {arc_name}")
            zf.write(abs_p, arc_name)
            
    # Copy to root and dist
    shutil.copyfile(zip_public_path, zip_root_path)
    if os.path.exists(dist_dir):
        shutil.copyfile(zip_public_path, os.path.join(dist_dir, zip_pkg_name))
        
    print(f"Package {zip_pkg_name} created successfully!")

if __name__ == '__main__':
    package()

