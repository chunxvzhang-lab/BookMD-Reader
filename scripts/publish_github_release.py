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
    tag = "v1.5.0"
    title = "BookMD Reader v1.5.0 - 多标签页协同、Mermaid超清PNG导出、目录树折叠与专注模式"
    
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
    body_md = """# 🚀 BookMD Reader v1.5.0

BookMD Reader v1.5.0 现已正式发布！本次版本迭代带来了**多标签页多文档协同编辑**、**Mermaid 架构图 3× 超清全幅 PNG 导出**、**多级目录树折叠/展开与状态记忆**、**代码块一键复制与语言标签 Pill**、**专注模式 (F10)** 与**打字机居中滚动 (Alt+T)**。

---

### ✨ 核心更新亮点

1. **📑 多标签页协同编辑栏（Multi-Tabs Bar）**：
   - 顶部原生文档标签栏，打开多个 Markdown 章节或独立文档随心并行切换。
   - 支持未保存修改黄点呼吸灯状态（`isDirty`）、鼠标中键快速关闭。
   - 右键上下文菜单支持：关闭当前、关闭其他、关闭右侧标签页。
   - 快捷键支持：`Ctrl + W` 关闭标签、`Ctrl + Tab` / `Ctrl + Shift + Tab` 前后循环切换。

2. **🔍 图片与 Mermaid 架构图无损灯箱 & 3× 超清 PNG 导出（Media Lightbox & Hi-DPI PNG Export）**：
   - 点击正文中的任何图片或 Mermaid 渲染图，一键呼出高画质毛玻璃全屏灯箱。
   - 支持 0.2× ~ 6× 鼠标滚轮平滑缩放、鼠标任意拖拽平移及 `Esc` 退出。
   - **Mermaid 架构图一键导出超高清 PNG**：基于 DOM 实时矢量包围盒（`getBBox()`）与 CSS 深度内联，自动应用主题底色与安全边距，以 3× Retina 超高清画质生成全幅无裁切的 PNG 图片，原生保存对话框安全落盘。

3. **📁 目录树多级子目录折叠与展开（Collapsible Directory Tree）**：
   - 支持任意层级的 Markdown 目录树结构，子目录点击轻松折叠/展开。
   - 顶部提供「全部展开 / 全部折叠」快捷控制按钮。
   - 自动持久化保存文件夹展开状态，重启应用或切换文档不丢失。

4. **📋 代码块一键复制与语言标签（Code Copy & Language Badges）**：
   - 自动识别并呈现语法语言胶囊（`PYTHON`, `TYPESCRIPT`, `JSON`, `BASH` 等）。
   - 一键复制代码至剪贴板，提供绿色 `✓ 已复制` 动效反馈。

5. **🧘 专注极简模式（Zen Mode / `F10`）**：
   - 一键隐藏侧边栏、目录树与状态栏，正文自动居中呈现（960px 黄金阅读视宽），沉浸写作。

6. **✍️ 打字机居中滚动模式（Typewriter Scrolling Mode / `Alt+T`）**：
   - 编辑时保持活动光标行始终位于视口垂直中心（45%~50% 视线黄金区），免去频繁低头。

7. **⚡ 源码模式交互深度防抖优化**：
   - 优化源码模式下选区与行号联动机制，多行代码划选复制平滑稳定不抖动。
   - 源码模式下点击大纲 (TOC) 或目录精准平滑滚动定位到对应代码行。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`BookMD-Reader-1.5.0.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
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
    msi_path = (
        r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.5.0.msi"
        if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.5.0.msi")
        else (
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.5.0.msi"
            if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.5.0.msi")
            else r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64\release\BookMD-Reader-1.5.0.msi"
        )
    )

    assets_to_upload = [
        (
            msi_path,
            "BookMD-Reader-1.5.0.msi",
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
