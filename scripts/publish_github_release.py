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
    tag = "v1.4.0"
    title = "BookMD Reader v1.4.0 - 全屏沉浸模式与交互动效升级"
    
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
    body_md = """# 🚀 BookMD Reader v1.4.0

BookMD Reader v1.4.0 重磅发布！本次更新带来了**全屏沉浸式阅读与写作支持**，并全面重构美化了交互按键与拟物悬浮微动效体系。

---

### ✨ 核心更新亮点

1. **🖥️ 软件全屏沉浸模式（Zen Mode）**：
   - **全局快捷键**：支持按 **`F11`** 一键即时进入/退出全屏；全屏状态下支持按 **`Esc`** 快速退出。
   - **双端按键联动**：在顶部工具栏（`Toolbar`）与左侧活动栏（`ActivityBar`）分别新增动态全屏切换按钮，带有图标状态自适应（`Maximize2` ↔ `Minimize2`）与即时状态同步。
   - **双向 IPC 架构**：Electron 桌面主进程与渲染层无缝联动全屏生命周期事件。

2. **✨ 悬浮微交互按键与动效美化**：
   - **弹性悬浮放大（Spring Magnification）**：按键在鼠标悬停时平滑缩放 `scale(1.15)` 并微上浮，按下时具备 `scale(0.92)` 紧致触觉回弹。
   - **拟物微边框与极客电光蓝辉光**：激活按钮注入发丝高光微边框与 `box-shadow: 0 0 16px rgba(29, 155, 240, 0.35)` 极客辉光。
   - **悬浮气泡提示（Floating Tooltips）**：左侧活动栏与工具栏按钮配备零延迟毛玻璃悬浮气泡提示，摆脱原生浏览器 Title 延迟。
   - **视口切换器胶囊化**：“阅读 / 分屏 / 源码”三段式切换升级为现代滑动胶囊卡片。

3. **🎨 极客暗黑 & 日光浅色 双主题美学升华**：
   - 完美适配 Lights Out 纯黑底色 (`#000000`) 与日光浅色，界面更加通透优雅。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`BookMD-Reader-1.4.0.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
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
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.0.msi" if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.0.msi") else (r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.0.msi" if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.0.msi") else r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64\release\BookMD-Reader-1.4.0.msi"),
            "BookMD-Reader-1.4.0.msi",
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
