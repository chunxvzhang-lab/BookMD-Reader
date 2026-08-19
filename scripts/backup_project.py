import os
import sys
import shutil
import zipfile
import subprocess
from datetime import datetime

def main():
    root = r"C:\Users\chunxvzhang\Desktop\codex"
    desktop = r"C:\Users\chunxvzhang\Desktop"
    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    backup_dir_name = f"BookMD-Reader-Backup-{now_str}"
    backup_dir = os.path.join(desktop, backup_dir_name)
    backup_zip = os.path.join(desktop, f"{backup_dir_name}.zip")
    git_bundle = os.path.join(desktop, f"BookMD-Reader-{now_str}.bundle")
    
    # Set stdout encoding if possible
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print(f"=== Starting Project Backup ({now_str}) ===")
    
    # 1. Create Git Bundle (complete full git repository snapshot)
    print("1. Creating Git Bundle snapshot...")
    bundle_size = 0.0
    try:
        subprocess.run(
            ["git", "bundle", "create", git_bundle, "--all"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True
        )
        bundle_size = os.path.getsize(git_bundle) / (1024 * 1024)
        print(f"   [OK] Git Bundle created: {git_bundle} ({bundle_size:.2f} MB)")
    except Exception as e:
        print(f"   [WARN] Git bundle warning: {e}")

    # 2. Package source code, assets, configs, docs into clean zip archive
    # Exclude: node_modules, release/win-unpacked, dist cache, __pycache__, .git (since bundle handles git)
    print("2. Packaging project files into ZIP archive...")
    
    exclude_dirs = {
        "node_modules",
        "win-unpacked",
        "__pycache__",
        ".playwright-cli",
        ".tempmediaStorage"
    }
    
    exclude_extensions = {".log", ".tmp"}
    
    file_count = 0
    total_uncompressed_bytes = 0
    
    with zipfile.ZipFile(backup_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for dirpath, dirnames, filenames in os.walk(root):
            # Prune excluded directories
            dirnames[:] = [d for d in dirnames if d not in exclude_dirs and not d.startswith(".temp")]
            
            # Skip if inside win-unpacked or node_modules
            rel_dir = os.path.relpath(dirpath, root)
            if any(part in exclude_dirs for part in rel_dir.split(os.sep)):
                continue
                
            for filename in filenames:
                ext = os.path.splitext(filename)[1].lower()
                if ext in exclude_extensions:
                    continue
                if filename in {"debug.log"}:
                    continue
                    
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, root)
                
                try:
                    zf.write(full_path, rel_path)
                    file_count += 1
                    total_uncompressed_bytes += os.path.getsize(full_path)
                except Exception as e:
                    print(f"   [WARN] Could not add {rel_path}: {e}")

    zip_size_mb = os.path.getsize(backup_zip) / (1024 * 1024)
    total_uncomp_mb = total_uncompressed_bytes / (1024 * 1024)
    
    print(f"   [OK] ZIP Archive created: {backup_zip}")
    print(f"   [OK] Total files archived: {file_count}")
    print(f"   [OK] Uncompressed size: {total_uncomp_mb:.2f} MB")
    print(f"   [OK] Compressed ZIP size: {zip_size_mb:.2f} MB")
    
    # 3. Create a backup report manifest
    manifest_file = os.path.join(desktop, f"BookMD-Reader-Backup-{now_str}-MANIFEST.txt")
    with open(manifest_file, "w", encoding="utf-8") as f:
        f.write(f"BookMD Reader 项目备份清单\n")
        f.write(f"=========================================\n")
        f.write(f"备份时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"项目路径: {root}\n")
        f.write(f"Git 仓库: https://github.com/chunxvzhang-lab/BookMD-Reader.git\n")
        f.write(f"当前版本: 1.2.0 (Tag: v1.2.0)\n")
        f.write(f"-----------------------------------------\n")
        f.write(f"备份文件 1 (项目全量源码+资源 ZIP): \n  {backup_zip} ({zip_size_mb:.2f} MB, {file_count} 个文件)\n\n")
        if os.path.exists(git_bundle):
            f.write(f"备份文件 2 (完整 Git 分支与历史 Bundle): \n  {git_bundle} ({bundle_size:.2f} MB)\n\n")
        f.write(f"恢复方法:\n")
        f.write(f"1. 解压 ZIP 压缩包即可获取全部工程源码与资源文件，执行 npm install 即可开始开发。\n")
        f.write(f"2. 若需从 Git Bundle 恢复完整版本历史，在终端执行:\n")
        f.write(f"   git clone \"{git_bundle}\" BookMD-Reader\n")
        f.write(f"=========================================\n")
        f.write(f"研发团队: 摸鱼Lab\n")
        
    print(f"   [OK] Manifest created: {manifest_file}")
    print(f"\n[DONE] 备份全部完成！")

if __name__ == "__main__":
    main()
