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
    tag = "v1.9.0"
    title = "KnowSpace v1.9.0 - 实时双向思维导图、块级原子互联、卡片内联嵌入与 MSI 安装包"
    
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
    body_md = """# 🚀 KnowSpace v1.9.0

**KnowSpace · Personal Knowledge Workspace (个人知识工作台)**  
> **Write. Read. Connect. Know.（记录 · 阅读 · 连接 · 认知）**

本次 **v1.9.0** 带来首要重磅版本更新——**「结构认知、实时双向思维导图与块级原子互联体系 (Mind Map & Block-level Links)」** 全新发布！从宏观章节大纲到微观段落原子，为知识创作者构建高密度的结构化认知网络！

---

### ✨ v1.9.0 核心更新亮点

1. **🧠 XMind 级全键盘交互思维导图 (Interactive Mind Map)**：
   - **全键盘高能心流**：支持 `Tab`（添加子主题）、`Enter`（添加同级主题）、`Delete`（删除分支）、`F2` / 双击（就地重命名，完美支持中文输入法）、方向键漫游、`Ctrl+Z` / `Ctrl+Y`（撤销与重做）；
   - **新建脑图入口**：目录树顶部新增 `+ 脑图` 按钮，空白首页新增专属卡片，一键生成标准 `.mindmap.md` 文件并立即进入交互编辑；
   - **双向标准 Markdown 存储**：自动与自然易读的标准 Markdown 缩进层级双向序列化，外部编辑器与 Git 零侵入。

2. **🎨 节点与连线右键外观深度定制 (Right-Click Customization)**：
   - **右键外观面板**：在任意脑图节点右键（或点击顶部“外观样式”按钮），呼出半透明毛玻璃定制面板；
   - **8 色节点色彩**：天蓝、翡翠绿、珊瑚橙、罗兰紫、玫瑰粉、琥珀黄、石墨灰等或跟随分支色；
   - **4 种节点形状**：圆角胶囊 (`capsule`)、圆角矩形 (`rounded`)、直角矩形 (`rect`)、极简下划线 (`underline`)；
   - **3 种分支连接线**：平滑贝塞尔曲线 (`bezier`)、90° 直角折线 (`step`)、笔直直线 (`straight`)；
   - **连线颜色定制**：可为特定分支流出的连线独立指定色彩或自动继承；
   - **标准行内注释持久化**：以标准 Markdown 注释（如 `<!-- style: color=#10b981,shape=capsule,lineStyle=step -->`）保真落盘。

3. **🎛️ 工具栏排版优化与防乱闪修复**：
   - **排版工整不折行**：为所有工具栏按钮设置 `white-space: nowrap` 与标准尺寸，杜绝文字垂直分割折行；
   - **精炼聚焦**：精简移除冗余缩放与 SVG 导出按键，专注核心脑图编辑与一键导出高清 PNG 图片（画布保留鼠标滚轮平滑缩放与拖拽漫游）；
   - **加号排版与消除乱闪**：错开折叠按钮与悬浮加号按钮位置（杜绝物理重合），采用确定性稳定路径 ID 与防回流校验，彻底根除添加节点时的乱闪与重绘问题。

4. **⚓ 块级原子互联体系 (Block-level Linking & Anchors)**：
   - **块指纹标记 (`^block-id`)**：在任何段落、公式或列表末尾添加 ` ^block-id`，阅读引擎自动转化为可交互的块级徽章 `[^block-id]`；
   - **一键复制块语法**：在正文中点击块徽章，瞬间将 `[[#^block-id]]` 复制到剪贴板；
   - **精准块级跳转 (`[[doc#^block]]`)**：渲染为专属锚点双链，点击秒级精准穿梭至对应段落并触发青色微光脉冲；
   - **块级内联卡片嵌入 (`![[doc#^block]]`)**：在正文中无缝渲染优雅的引用卡片，右上角带有出处溯源链接；
   - **实时联想补全**：在源码编辑中键入 `[[#^` 或 `[[文档#^` 时，自动弹出候选块摘要，支持回车一键补全。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`KnowSpace-1.9.0.msi`** | Windows 标准安装包 | Windows Installer 官方安装格式，自动创建桌面与开始菜单快捷方式（推荐） |
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
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-1.9.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace 1.9.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64\release\KnowSpace-1.9.0.msi",
    ]
    for p in msi_candidates:
        if os.path.exists(p):
            msi_path = p
            break

    portable_zip_path = r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64-portable.zip"

    assets_to_upload = [
        (
            msi_path,
            "KnowSpace-1.9.0.msi",
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
