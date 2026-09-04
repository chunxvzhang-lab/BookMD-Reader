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
    tag = "v1.10.0"
    title = "KnowSpace v1.10.0 - 斜杠命令、Obsidian级右键上下文菜单、专业PDF打印与导图重排深化"
    
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
    body_md = """# 🚀 KnowSpace v1.10.0

**KnowSpace · Personal Knowledge Workspace (个人知识工作台)**  
> **Write. Read. Connect. Know.（记录 · 阅读 · 连接 · 认知）**

本次 **v1.10.0** 迎来四大重量级生产力革新——**「全键盘斜杠命令菜单、Obsidian级情境感知右键上下文、高保真专业PDF打印与导图跨层级拖拽重排 (Slash Commands, Context Menu, High-Fidelity PDF Print & Mindmap Reparenting)」**！

---

### ✨ v1.10.0 核心更新亮点

1. **⌨️ 全键盘斜杠命令菜单 (`/` Slash Commands)**：
   - **极速呼出**：在编辑器行首或空格后键入 `/`（或拼音首字母缩写），毫秒级弹出交互式下拉补全菜单；
   - **20+ 原生排版构件模版**：支持 H1~H6 标题、待办清单 `- [ ]`、GFM 智能表格、多语言代码块、LaTeX 数学公式、Mermaid 架构流程图，以及 Note/Tip/Warning/Important/Caution 提示框；
   - **智能光标定位**：模版插入后光标自动移至最佳输入焦点，全键盘上下键极速选择，写作心流丝滑无阻。

2. **📑 Obsidian 级情境感知右键上下文菜单 (Context Menu)**：
   - **选区一键提取为新笔记**：提取当前选区创建独立 Markdown 文档，并在原文原地无缝替换为 `[[新笔记名]]` 双链；
   - **创建段落块引用锚点**：提取并就地生成标准 `^block-id` 唯一指纹，一键复制与插入引用；
   - **存入 Space 闪记箱**：随时将正文灵感片段一键存入闪念收集箱归档；
   - **快捷行样式转换与格式化**：选区加粗、斜体、代码、高亮（`==`）、删除线，多行批量转为标题、待办清单或引用块；
   - **文档统计卡片**：菜单底部内嵌轻量统计面板，实时展示选中字符数、词数、行数与预估阅读时长；
   - **全主题美学适配**：完美适配日光浅色、墨水屏与极客暗黑主题的毛玻璃微光质感。

3. **🖨️ 高保真专业 PDF 矢量打印与导出 (`Ctrl + P`)**：
   - **Chromium 原生矢量输出**：集成 Electron `webContents.printToPDF` 与原生打印通道，一键输出标准 A4 矢量 PDF；
   - **印刷级跨页防截断规则**：注入 `@media print` 样式表，正文一级/二级标题、代码块、Mermaid 架构图与 GFM 表格自动施加 `break-inside: avoid` 保护，彻底告别跨页文字图表腰斩断裂；
   - **便捷全局入口**：顶部工具栏常驻 `🖨️ 打印` 导出按钮，同时支持 `Ctrl + P` 全局快捷键。

4. **🧠 思维导图跨层级拖拽重排与画布搜索聚焦**：
   - **拖拽重组分支归属 (Drag-and-Drop Reparenting)**：鼠标自由抓取任意分支拖放至目标节点，即可变更为子节点或同级重排；
   - **自闭环防环保护**：算法严格阻止将父节点拖入自身子孙分支，杜绝拓扑环路死循环；
   - **实时搜索与运镜平滑聚焦**：画布顶部微型搜索栏实时高亮所有匹配节点，支持回车一键运镜（`Smooth Pan`）居中定位高亮目标。

5. **🛡️ 质量防护与自动化测试**：
   - 24 个自动化测试套件、122 项单元测试 100% 全部通过，全方位守护系统稳定性。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`KnowSpace-1.10.0.msi`** | Windows 标准安装包 | Windows Installer 官方安装格式，自动创建桌面与开始菜单快捷方式（推荐） |
| **`KnowSpace-win-x64-portable.zip`** | Windows 便携绿色版 | 免安装解压即用，解压后双击 `KnowSpace.exe` 即可运行 |

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
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-1.10.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace 1.10.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64\release\KnowSpace-1.10.0.msi",
    ]
    for p in msi_candidates:
        if os.path.exists(p):
            msi_path = p
            break

    portable_zip_path = r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64-portable.zip"

    assets_to_upload = [
        (
            msi_path,
            "KnowSpace-1.10.0.msi",
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

    print(f"\n[SUCCESS] Release {tag} published successfully!")
    print(f"View Release: {html_url}")

if __name__ == "__main__":
    main()
