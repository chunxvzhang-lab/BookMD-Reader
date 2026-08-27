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
    repo = "KnowSpace"
    tag = "v1.6.0"
    title = "KnowSpace v1.6.0 - 闪念胶囊速记微窗、全局自定义热键、系统托盘后台常驻与开机自启动"
    
    # 1. Create and push git tag
    print("1. Ensuring git tag exists and is pushed...")
    try:
        subprocess.run(["git", "tag", "-f", "-a", tag, "-m", f"Release {tag}"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["git", "push", "-f", "origin", tag], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Git tag {tag} checked.")
    except Exception as e:
        print(f"Tag note: {e}")

    # 2. Check existing release or create new
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "KnowSpace-Release-Script"
    }

    rel_data = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}",
                headers=headers
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                rel_data = json.loads(resp.read().decode("utf-8"))
                print(f"Existing release found: {rel_data.get('html_url')}")
                break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"No existing release found for {tag}, will create one.")
                break
            print(f"Notice HTTP {e.code}: {e}")
        except Exception as e:
            print(f"Attempt {attempt+1} query notice: {e}")
            time.sleep(2)

    # 3. Create Release Body
    body_md = """# 🚀 KnowSpace v1.6.0

**KnowSpace · Personal Knowledge Workspace (个人知识工作台)**  
> **Write. Read. Connect. Know.（记录 · 阅读 · 连接 · 认知）**

本次 **v1.6.0** 重磅上线了核心生产力特性 **「闪念胶囊 (Flash Notes) 独立微窗」** 与 **「全局热键自定义系统」**，并全面支持 **「Windows 系统托盘常驻后台运行」** 与 **「开机自启动（静默就绪）」**！

---

### ✨ v1.6.0 核心更新亮点

1. **⚡ 闪念胶囊 (Flash Notes) 独立毛玻璃微窗**：
   - 无论在任何工作、游戏或编码窗口，按下全局快捷键（默认 `Alt + Space`）即刻在当前显示器黄金视线区域秒级唤起轻巧毛玻璃微窗（`620×380`）。
   - **无打扰沉浸速记**：随时捕获灵感火花与即刻待办，失焦自动隐匿（Auto-Hide on Blur），按 `Esc` 键亦可快速退出。
   - **快捷标记工具栏**：支持一键快速插入待办 (`- [ ] `)、标签 (`#`)、双链 (`[[`)、系统时间（`HH:MM`）及灵感卡片 (`> 💡 `)。
   - **原子落盘与自动归档**：按下 `Ctrl + Enter` 瞬间触发保存并自动关闭微窗，按日期安全追加落盘到工作区 `Inbox/YYYY-MM-DD.md` 收集箱，主窗口知识库目录树无感实时刷新。

2. **⌨️ 软件内自由自定义全局热键 (Customizable Global Hotkeys)**：
   - 闪念胶囊微窗内点击快捷键胶囊或 ⚙️ 设置按钮，即可滑出自定义热键抽屉。
   - 支持常用快捷预设（`Alt+Space`、`Ctrl+Shift+Space`、`Alt+N`、`Ctrl+Alt+N`、`F9`）。
   - **交互式键盘录制器**：点击录制输入框后直接在键盘上按下任意组合键，主进程即时校验并重注册全局热键，遇冲突给出友好警示并安全回滚，配置本地自动持久化。

3. **🗔 Windows 系统托盘后台常驻 (System Tray & Background Running)**：
   - 状态栏右下角常驻 KnowSpace 专属托盘图标，悬停提示「KnowSpace · 个人知识工作台」。
   - **单击/双击托盘图标**：秒级显示并聚焦 KnowSpace 主窗口。
   - **托盘右键菜单**：支持一键唤起闪念胶囊、打开工作台、切换开机自启动、切换关闭窗口时保持后台运行以及彻底退出。
   - **关闭主窗口时最小化至托盘**：点击窗口右上角 ✕ 时隐藏至右下角系统托盘，全局热键与闪念胶囊持续就绪，未保存内容依然触发安全防丢稿弹窗。

4. **🚀 Windows 开机自启动与后台静默就绪 (Launch on Startup & Silent Launch)**：
   - 支持随 Windows 开机自动启动并在后台静默就绪（`--hidden`），开机不弹出大窗口打扰用户，全局快捷键随叫随到。
   - 在闪念胶囊设置抽屉与主窗口关于界面均提供一键开关，状态多端双向实时联动。

5. **📖 仿电子墨水屏纸质主题与视觉纯粹化 (v1.5.1 特性)**：
   - 温暖羊皮纸米白纸质底色（`#f8f6f0`）与高对比沉稳墨色字体（`#1a1a1a`），长时间深度阅读写作护眼无疲劳。
   - 统一浅灰色高亮系统与 Mermaid 纯净 Neutral 黑白灰度图表。
   - 底部直选式三主题按钮（☀️ 日光浅色 / 📖 仿电子墨水屏 / ✨ 极客暗黑）。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`KnowSpace-1.6.0.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
| **`KnowSpace-win-x64-portable.zip`** | Windows 便携绿色版 | 解压后直接双击 `KnowSpace.exe` 即可运行 |

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
    msi_path = None
    msi_candidates = [
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace 1.6.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-1.6.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64\release\KnowSpace-1.6.0.msi",
    ]
    for p in msi_candidates:
        if os.path.exists(p):
            msi_path = p
            break

    portable_zip_path = r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64-portable.zip"

    assets_to_upload = [
        (
            msi_path,
            "KnowSpace-1.6.0.msi",
            "application/x-msi"
        ),
        (
            portable_zip_path,
            "KnowSpace-win-x64-portable.zip",
            "application/zip"
        )
    ]

    import time
    for file_path, name, content_type in assets_to_upload:
        if not file_path or not os.path.exists(file_path):
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
                        "User-Agent": "KnowSpace-Release-Script",
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

    print("\n[SUCCESS] Release v1.5.1 published successfully!")
    print(f"View Release: {html_url}")

if __name__ == "__main__":
    main()
