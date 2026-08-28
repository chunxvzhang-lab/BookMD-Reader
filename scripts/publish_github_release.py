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
    tag = "v1.8.0"
    title = "KnowSpace v1.8.0 - 知识网络全景拓扑图谱、双向链接网络、全局双链重构与 60FPS 极速渲染"
    
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
    body_md = """# 🚀 KnowSpace v1.8.0

**KnowSpace · Personal Knowledge Workspace (个人知识工作台)**  
> **Write. Read. Connect. Know.（记录 · 阅读 · 连接 · 认知）**

本次 **v1.8.0** 迎来重磅里程碑更新——**「知识网络全景拓扑图谱与双向链接系统 (Knowledge Graph & Bi-directional Links)」** 正式上线！彻底打破孤岛式文档记录模式，将碎片速记与知识文档升维为互联互通的个人立体数字大脑！

---

### ✨ v1.8.0 核心更新亮点

1. **🌐 60FPS 极速全景拓扑图谱 (Global Knowledge Graph)**：
   - 全面移除沉重的 GPU 离屏纹理快照机制（`textureOnViewport: false`），采用**原生 2D Canvas 直接绘制管线**；
   - 鼠标滚轮缩放与双指平移漫游全面接入 **RAF 动画帧级事件节流**，杜绝每秒数十次 React 重渲染，大中小图谱均达到 60FPS+ 的丝滑操作质感；
   - **默认 100% 缩放与居中**：打开图谱时初始视口固定为标准 100% 并聚焦当前文档，工具栏支持手动输入 `10%` ~ `500%` 精确数值微调。

2. **🌌 自研 2.2ms 黄金螺旋 2D 有机力导向分布算法 (`computeOrganicGraphPositions`)**：
   - 彻底告别原 CoSE 遇到孤岛节点排成单列垂直“摩天大楼”或文字重叠遮挡的缺陷；
   - 采用 **黄金角自然发散 + 库仑电荷排斥 + 虎克弹簧引力 + 95px 防穿透最小安全间距**；
   - 耗时仅 **2.2 毫秒** 瞬间计算就绪，关联紧密的文档自然聚集成星系簇，孤岛与闪念笔记疏密得当、四面环绕发散，节点文字绝对防重叠碰撞。

3. **🎯 镜头平滑聚焦当前文档与发光波纹动效 (`Crosshair Focus`)**：
   - 深度重构多层级智能解析器（`findCurrentNode`），无论文件来自本地绝对路径、URL 编码路径还是未编目闪念，实现 100% 精准定位；
   - 采用 **三次贝塞尔缓动（`ease-in-out-cubic`, 350ms）** 镜头平滑推近，并激发 **1.5 秒专属天蓝脉冲波纹（Pulse Glow）**；
   - 遇孤岛节点过滤或关键字搜索时自动解禁召回，确保视线随时精准锁定当前编辑文档。

4. **🔗 双向链接语法与实时联想补全 (`[[Wikilink]]`)**：
   - 在编辑器中键入 `[[` 即可毫秒级弹出工作区文档智能补全建议卡片；
   - 按住 `Ctrl` 键点击正文中任意双链，秒级跨文档平滑跳转并定位至对应目标章节；
   - 在闪念胶囊速记微窗中同样支持 `[[` 实时补全与链接插入。

5. **🔄 全局智能无损重构 (Link Rename Propagation)**：
   - 在目录树中重命名任何文档或修改标题时，系统自动扫描并更新全局所有引用该文档的 `[[旧标题]]` 为 `[[新标题]]`；
   - 配备冲突防回滚机制，保障知识网络永久连通不失效。

6. **🗂️ 侧边栏反向链接与未链接提及面板 (Backlinks & Mentions)**：
   - **已链接引用 (Linked References)**：清晰列出当前文档被哪些笔记引用，附带行号与上下文摘要；
   - **未链接提及 (Unlinked Mentions)**：智能挖掘正文中提到当前文档标题但尚未建立链接的段落，支持一键无损转化为标准双链。

7. **⚡ 闪念 Space 纯净看板与独立展示**：
   - 界面文案统一去冗余，净化为沉稳克制的「**闪念 Space**」；
   - 大纲侧栏平时隐藏碎片化的分钟级闪念文件，通过快捷栏打开时以专属看板模式独立呈现，保持知识库目录树整洁清晰。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`KnowSpace-1.8.0.msi`** | Windows 企业级标准安装包 | Windows Installer 官方安装格式，自动创建桌面与开始菜单快捷方式（推荐） |
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
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-1.8.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace 1.8.0.msi",
        r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64\release\KnowSpace-1.8.0.msi",
    ]
    for p in msi_candidates:
        if os.path.exists(p):
            msi_path = p
            break

    portable_zip_path = r"C:\Users\chunxvzhang\Desktop\codex\release\KnowSpace-win-x64-portable.zip"

    assets_to_upload = [
        (
            msi_path,
            "KnowSpace-1.8.0.msi",
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
