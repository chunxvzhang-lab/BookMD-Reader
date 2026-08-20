"""
Script to create GitHub Release v1.3.0 and upload release assets with UTF-8 encoding.
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.parse

def get_git_token():
    try:
        proc = subprocess.Popen(
            ["git", "credential", "fill"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        out, _ = proc.communicate(input="protocol=https\nhost=github.com\n\n")
        token = ""
        for line in out.splitlines():
            if line.startswith("password="):
                token = line.split("=", 1)[1]
        return token
    except Exception as e:
        print("Error getting token:", e)
        return ""

def main():
    token = get_git_token()
    if not token:
        print("Failed to get GitHub token from git credentials.")
        sys.exit(1)
    
    owner = "chunxvzhang-lab"
    repo = "BookMD-Reader"
    tag = "v1.4.2"
    title = "BookMD Reader v1.4.2 - 界面分栏自由拖拽与正文预览行号显示"
    
    # 1. Create and push git tag
    print("1. Ensuring git tag exists and is pushed...")
    try:
        subprocess.run(["git", "tag", "-d", tag], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["git", "push", "--delete", "origin", tag], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass
    subprocess.run(["git", "tag", "-a", tag, "-m", f"Release {tag}"], check=True)
    subprocess.run(["git", "push", "origin", tag], check=True)
    print(f"Git tag {tag} pushed successfully.")

    # 2. Check existing release or create new
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "BookMD-Release-Script"
    }

    rel_data = None
    try:
        req = urllib.request.Request(
            f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}",
            headers=headers
        )
        with urllib.request.urlopen(req) as resp:
            rel_data = json.loads(resp.read().decode("utf-8"))
            print(f"Existing release found: {rel_data.get('html_url')}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"No existing release found for {tag}, will create one.")
        else:
            print(f"HTTP error checking release: {e}")
    except Exception as e:
        print(f"Notice: {e}")

    # 3. Create Release Body
    body_md = """# 🚀 BookMD Reader v1.4.2

BookMD Reader v1.4.2 现已正式发布！本次版本迭代重点带来了**界面多栏边界自由鼠标拖拽调整**与**正文预览区行号自动显示**功能。

---

### ✨ 核心更新亮点

1. **📐 界面分栏边界自由拖拽调整（Resizable Splitters）**：
   - **多栏独立调整**：文档目录栏（`ChapterList`，160px~480px）、大纲/书签/搜索侧栏（`side-panel`，180px~520px）以及分屏模式下源码/预览分栏比例（`splitRatio`，15%~85%）均支持鼠标自由拖拽调整。
   - **智能状态持久化**：用户自定义的分栏宽度与比例自动保存至本地配置，重启后自动恢复最佳排版布局。
   - **双向箭头反馈与防划选**：悬停时显示专业双向调整指示条（`col-resize`），拖拽时光晕高亮反馈，并杜绝拖拽过程中正文文字被意外划选。

2. **🔢 正文预览区行号自动显示（Automatic Preview Line Numbers）**：
   - **AST 零开销行号槽位**：利用 Markdown AST 行号元数据，在正文段落、标题、列表项、代码块、引用块及表格的左侧槽位自动显示源码行号。
   - **1:1 编辑对齐与悬停发光**：等宽字体排版，鼠标悬停时行号自动点亮为电光蓝（`#1d9bf0`），与代码编辑侧行号完美对齐。
   - **工具栏快捷切换**：顶部工具栏新增行号显隐切换快捷按钮（`#`），随心切换。

3. **🔍 搜索同文段卡片聚合与大片对应文段高亮优化**：
   - 同一文段多次命中聚合为 1 张卡片，正文大片文段微光包裹与所有命中词高亮。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`BookMD-Reader-1.4.2.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
| **`BookMD-Reader-win-x64-portable.zip`** | Windows 便携绿色版 | 解压后直接双击 `BookMD Reader.exe` 即可运行 |

---

### 🖥️ 系统要求

- Windows 10 / 11 (x64)
- 摸鱼Lab 研发出品
"""

    if not rel_data:
        create_payload = {
            "tag_name": tag,
            "name": title,
            "body": body_md,
            "draft": False,
            "prerelease": False
        }

        print("2. Creating new GitHub Release via API...")
        req = urllib.request.Request(
            f"https://api.github.com/repos/{owner}/{repo}/releases",
            data=json.dumps(create_payload).encode("utf-8"),
            headers={**headers, "Content-Type": "application/json; charset=utf-8"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            rel_data = json.loads(resp.read().decode("utf-8"))
    else:
        update_payload = {
            "name": title,
            "body": body_md,
        }
        print("2. Updating existing GitHub Release title and body...")
        req = urllib.request.Request(
            f"https://api.github.com/repos/{owner}/{repo}/releases/{rel_data['id']}",
            data=json.dumps(update_payload).encode("utf-8"),
            headers={**headers, "Content-Type": "application/json; charset=utf-8"},
            method="PATCH"
        )
        with urllib.request.urlopen(req) as resp:
            rel_data = json.loads(resp.read().decode("utf-8"))
    
    upload_url_template = rel_data["upload_url"]
    upload_base_url = upload_url_template.split("{")[0]
    html_url = rel_data["html_url"]
    existing_assets = {a["name"]: a["id"] for a in rel_data.get("assets", [])}

    # 4. Upload Assets
    assets_to_upload = [
        (
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.2.msi" if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.2.msi") else (r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.2.msi" if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.2.msi") else r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64\release\BookMD-Reader-1.4.2.msi"),
            "BookMD-Reader-1.4.2.msi",
            "application/x-msi"
        ),
        (
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64-portable.zip",
            "BookMD-Reader-win-x64-portable.zip",
            "application/zip"
        )
    ]

    import time
    for file_path, name, content_type in assets_to_upload:
        if not os.path.exists(file_path):
            print(f"Warning: file not found {file_path}")
            continue
        
        # Delete existing asset to upload fresh build
        if name in existing_assets:
            print(f"Asset {name} already exists (ID: {existing_assets[name]}), deleting to replace with fresh build...")
            del_asset_req = urllib.request.Request(
                f"https://api.github.com/repos/{owner}/{repo}/releases/assets/{existing_assets[name]}",
                headers=headers,
                method="DELETE"
            )
            try:
                with urllib.request.urlopen(del_asset_req) as del_resp:
                    print(f"Deleted old asset {name} (HTTP {del_resp.status}).")
            except Exception as e:
                print(f"Notice deleting asset: {e}")

        size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"Uploading asset: {name} ({size_mb:.2f} MB)...")
        upload_url = f"{upload_base_url}?name={urllib.parse.quote(name)}"
        with open(file_path, "rb") as f:
            file_data = f.read()
        
        for attempt in range(1, 4):
            try:
                up_req = urllib.request.Request(
                    upload_url,
                    data=file_data,
                    headers={
                        "Authorization": f"token {token}",
                        "Content-Type": content_type,
                        "User-Agent": "BookMD-Release-Script",
                        "Content-Length": str(len(file_data))
                    },
                    method="POST"
                )
                with urllib.request.urlopen(up_req, timeout=300) as up_resp:
                    up_data = json.loads(up_resp.read().decode("utf-8"))
                    print(f"Uploaded {name} successfully! Asset URL: {up_data.get('browser_download_url')}")
                    break
            except Exception as e:
                print(f"Attempt {attempt} failed for {name}: {e}")
                if attempt < 3:
                    time.sleep(3)
                else:
                    raise

    print("\n[SUCCESS] Release v1.4.0 published successfully!")
    print(f"View Release: {html_url}")

if __name__ == "__main__":
    main()
