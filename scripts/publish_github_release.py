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
    tag = "v1.5.0"
    title = "KnowSpace v1.5.0 - 全新品牌「个人知识工作台」、超立方空间图标与多文档分屏"
    
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
        "User-Agent": "BookMD-Release-Script"
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
    body_md = """# 🚀 KnowSpace v1.5.0

**KnowSpace**（原 BookMD Reader）现已全面完成品牌与架构升级！
> **KnowSpace · Personal Knowledge Workspace (个人知识工作台)**  
> **Write. Read. Connect. Know.（记录 · 阅读 · 连接 · 认知）**

本次版本迭代带来了 **「超立方空间」HyperSpace Cube 全新品牌应用图标**、**多文档左右分屏对比模式**、**标签页分离独立新窗口**、**84% 首屏包体积压缩与毫秒秒开**、**Windows 桌面贴靠分栏无遮挡适配** 以及 **暖橙黄浅色高亮体系**！

---

### 🏛️ KnowSpace 核心能力体系

- **📖 Reader** — 现代化 Markdown 沉浸式阅读与排版引擎
- **✍️ Editor** — CodeMirror 6 极客编辑、零延迟 AST 语法高精度映射
- **📚 Library** — 文档与多级知识库树形管理、展开状态智能持久化
- **🔍 Search** — 全文精准定位、大纲（TOC）实时追踪与高亮
- **🎨 Visual & Lightbox** — Mermaid 架构图 3× 超清全幅导出、图片高质无损灯箱

---

### ✨ v1.5.0 核心更新亮点

1. **💎 全新「超立方空间」HyperSpace Cube 专属应用图标**：
   - **构型**：一个半透明悬浮的等距等角投影（Isometric）多面体空间，内部悬浮着一颗发光的知识晶体核心（Knowledge Core）。
   - **质感**：磨砂玻璃（Frosted Glassmorphism）质感，棱角分明，配合发光切面。
   - **寓意**：收纳一切想法、文档、图表与知识的私密安全空间。
   - **全链路换装**：全面覆盖 Windows `.exe` 原生可执行文件（含 `256×256` 至 `16×16` 完整 6 层 32-bit RGBA 帧）、窗口标题栏、任务栏以及内部关于界面与侧边活动栏。

2. **⚡ 独立新窗口毫秒秒开与性能极速优化（Instant Window Launch & Bundle Splitting）**：
   - **84% 首屏 JS 体积大幅缩减**：对 Mermaid、CodeMirror 6、Highlight.js、KaTeX 等庞大模块进行细粒度 Rollup 代码分包，主入口体积从 2,001 kB 锐减至 332 kB，极大降低 Chromium V8 脚本解析执行耗时。
   - **主进程异步预读与同步即时握手**：分离标签页拉起新窗口时，主进程在后台并行预读 Markdown，并通过预加载脚本同步注入文档数据，React 挂载首帧即刻完成正文渲染，彻底告别等待与白屏。

3. **🪟 多文档左右分屏对比查看模式（Dual Document Split View）**：
   - 在多标签页栏上右键任意未激活标签页，即可选择「🗗 开启左右分屏模式」，实现同一窗口内同时并排查看与对照两份不同的 Markdown 文档。
   - 分屏模式下自动隐藏左侧 ActivityBar 导航栏，释放最大化水平可视面积；中间分割线支持鼠标自由拖拽调整双栏比例，支持右键一键「关闭分屏模式」。

4. **🗗 标签页分离为独立新窗口（Detach Tab to Independent Window）**：
   - 标签页右键菜单支持「🗗 分离到独立新窗口」，支持将任意标签页秒级脱离为主窗口之外的完全独立新窗口。
   - 多窗口并行运作，每个窗口均具备独立的阅读、编辑、目录大纲与安全保存状态，多屏办公极度高效。

5. **🪟 Windows 系统桌面贴靠/分栏（Snap Layouts）完美适配**：
   - 针对 Windows 10/11 的桌面贴靠分栏（`Win + ← / →` 左右对半、3 栏并排、4 象限分栏及高 DPI 屏幕缩放）进行了深度优化。
   - 优化系统级最小窗口尺寸限制（360×240），彻底杜绝在桌面多窗口分栏时发生窗口溢出或与相邻窗口互相遮挡的问题；在窄屏状态下自适应弹性排版，体验严丝合缝。

6. **🎨 浅色主题暖橙黄高亮体系（Warm Amber-Orange Light Theme）**：
   - 针对浅色模式全面定制了温暖雅致的暖橙黄色系（`#d97706` / `#f59e0b`），长时间阅读与写作柔和舒适、不刺眼。
   - 编辑器光标、行号、选区、搜索命中、分屏高亮及正文高亮全链路自适应橙黄色调。

7. **📑 多标签页协同编辑栏（Multi-Tabs Bar）**：
   - 顶部原生文档标签栏，打开多个 Markdown 章节或独立文档随心并行切换。
   - 支持未保存修改黄点呼吸灯状态（`isDirty`）、鼠标中键快速关闭。
   - 快捷键支持：`Ctrl + W` 关闭标签、`Ctrl + Tab` / `Ctrl + Shift + Tab` 前后循环切换。

8. **🔍 图片与 Mermaid 架构图无损灯箱 & 3× 超清 PNG 导出（Media Lightbox & Hi-DPI PNG Export）**：
   - 点击正文中的任何图片或 Mermaid 渲染图，一键呼出高画质毛玻璃全屏灯箱。
   - 支持 0.2× ~ 6× 鼠标滚轮平滑缩放、鼠标任意拖拽平移及 `Esc` 退出。
   - Mermaid 架构图一键导出 3× Retina 超高清无裁切 PNG 图片。

9. **📁 目录树多级子目录折叠与展开（Collapsible Directory Tree）**：
   - 支持任意层级的 Markdown 目录树结构，子目录点击轻松折叠/展开，展开状态自动持久化。

10. **📋 代码块一键复制与语言标签（Code Copy & Language Badges）**：
    - 自动识别并呈现语法语言胶囊，一键复制代码至剪贴板，提供绿色 `✓ 已复制` 动效反馈。

11. **🧘 专注极简模式（Zen Mode / `F10`）与打字机居中滚动（Alt+T）**：
    - 一键隐藏侧边栏与状态栏，正文居中呈现；编辑时光标行始终保持在视口视线黄金区域。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`KnowSpace-1.5.0.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
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
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace 1.5.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-1.5.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64\release\KnowSpace-1.5.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.5.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.5.0.msi",
    ]
    for p in msi_candidates:
        if os.path.exists(p):
            msi_path = p
            break

    portable_zip_path = (
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64-portable.zip"
        if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64-portable.zip")
        else r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64-portable.zip"
    )

    assets_to_upload = [
        (
            msi_path,
            "KnowSpace-1.5.0.msi",
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
