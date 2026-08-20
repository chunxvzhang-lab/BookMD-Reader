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
    tag = "v1.4.1"
    title = "BookMD Reader v1.4.1 - 修复分屏批量选择乱滚与搜索跳转高亮"
    
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
    body_md = """# 🚀 BookMD Reader v1.4.1

BookMD Reader v1.4.1 现已正式发布！本次更新重点优化了**分屏编辑模式下的选区同步与滚动体验**，并集成了**搜索卡片精准跳转与呼吸微光高亮**。

---

### ✨ 核心更新亮点

1. **⚡ 修复分屏模式下批量选择代码乱滚问题**：
   - **解耦选区与滚动竞争**：彻底重构 `useSyncSelection`，移除了选区变动时与 `useSyncScroll` 产生冲突的强制外部平滑滚动指令。
   - **`requestAnimationFrame` 批量高亮调度**：鼠标大跨度连续拖拽选择或 Shift 连选时，高亮更新统一合入帧渲染周期，彻底根除视口来回拉扯与跳跃乱滚现象。
   - **大跨度代码块选区精准覆盖**：支持跨段落、代码块、列表的多行连续批量选择与预览实时高亮。

2. **🔍 搜索结果卡片点击精准跳转与呼吸辉光高亮**：
   - **精准行号与 AST 节点定位**：点击左侧搜索结果卡片即可平滑导航至文档精确段落/代码块并舒适居中。
   - **呼吸微光聚焦（`searchPulse`）**：目标内容自动触发 1.8 秒专属极客电光蓝呼吸微光，一眼锁定目标。
   - **搜索卡片交互增强**：展示行号徽标（如 `L4`）、关键词精准高亮匹配、匹配总数与一键清空。

3. **🖥️ 全屏沉浸阅读与写作模式**：
   - 全局支持 `F11` 沉浸全屏与 `Esc` 退出，双端工具栏全屏按键实时状态同步。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`BookMD-Reader-1.4.1.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
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
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.1.msi" if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.4.1.msi") else (r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.1.msi" if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-1.4.1.msi") else r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64\release\BookMD-Reader-1.4.1.msi"),
            "BookMD-Reader-1.4.1.msi",
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
