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
    tag = "v1.4.3"
    title = "BookMD Reader v1.4.3 - 代码高对比度语法高亮与分割线双击自适应"
    
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
    body_md = """# 🚀 BookMD Reader v1.4.3

BookMD Reader v1.4.3 现已正式发布！本次版本迭代重点带来了**代码高对比度语法高亮系统**、**正文行号最左侧一列整齐排版**、**分屏选中内容平滑上移**与**界面分割线双击自适应最佳宽度**。

---

### ✨ 核心更新亮点

1. **🎨 增强代码与正文高对比度语法高亮（High-Contrast Syntax Highlighting）**：
   - **全面告别暗黑模糊**：移除导致暗色背景下代码发黑的旧样式，全面引入色彩鲜明、高对比度的专业代码着色系统。
   - **清晰可辨的注释与关键词**：注释改为清晰明亮的银灰斜体（`#94a3b8`），关键词珊瑚红（`#ff7b72`），字符串天蓝（`#a5d6ff`），函数淡紫（`#d2a8ff`），变量翠绿（`#7ee787`），数字亮蓝（`#79c0ff`），在纯黑/暗色背景下极致清晰舒适。
   - **表格与行内代码对比度提升**：表格边框与表头采用高辨识度层次排版，行内代码高亮对比度显著增强。

2. **🔢 正文预览行号整齐放置在最左侧一列**：
   - 在左侧开辟独立固定行号槽位（`58px`）与垂直分割线，所有标题、段落、列表、代码块、引用块及表格的行号全部统一定位在最左侧同一竖列，消除嵌套缩进对行号的影响。

3. **🎯 修复分屏模式下选中高亮内容平滑移动到上部**：
   - 在左侧编辑器中选中文本或点击光标时，右侧预览区匹配的高亮块自动平滑滚动停靠在视口上部（约 15%~20% 偏上舒适区），并加入防抖去重锁，杜绝鼠标大跨度拖拽划选时发生抖动乱滚。

4. **📐 界面分割线双击自适应内容最佳位置**：
   - **目录栏分割线**：双击自动根据目录树文本宽度自适应最佳宽度（200px~380px）。
   - **侧栏分割线**：双击自动根据大纲/书签/搜索项自适应最佳宽度（220px~400px）。
   - **分屏中间分割线**：双击瞬间恢复 1:1（50%）等宽黄金平衡比例。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`BookMD-Reader-1.4.3.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
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
        r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.3.msi"
        if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.3.msi")
        else (
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.3.msi"
            if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.3.msi")
            else r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64\release\BookMD-Reader-1.4.3.msi"
        )
    )

    assets_to_upload = [
        (
            msi_path,
            "BookMD-Reader-1.4.3.msi",
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
