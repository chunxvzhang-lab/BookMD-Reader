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
    tag = "v1.3.0"
    title = "BookMD Reader v1.3.0 - 21st.dev Twitter 极客主题与主图重构"
    
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

    # 2. Check and delete existing release if present
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "BookMD-Release-Script"
    }

    try:
        req = urllib.request.Request(
            f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}",
            headers=headers
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            rel_id = data.get("id")
            if rel_id:
                print(f"Deleting existing release {rel_id}...")
                del_req = urllib.request.Request(
                    f"https://api.github.com/repos/{owner}/{repo}/releases/{rel_id}",
                    headers=headers,
                    method="DELETE"
                )
                urllib.request.urlopen(del_req)
                print("Existing release deleted.")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print("Notice checking existing release:", e)

    # 3. Create Release Body
    body_md = """# 🚀 BookMD Reader v1.3.0

BookMD Reader v1.3.0 正式发布！本次更新精简并重构主题视觉体系，去除了黑曜暗主题，全面升级为极客暗黑与日光浅色精选双主题，并移除了顶部多余的主题切换按键。

---

### ✨ 核心更新内容

1. **🎨 极客暗黑 & 日光浅色 双主题体系**：
   - 采用 Lights Out 纯黑底色 (`#000000`)、电光蓝高亮 (`#1D9BF0`) 与发丝微边框 (`#2F3336`)。
   - 左侧 Activity Bar 支持在 **☀️ 日光浅色 / ✨ 极客暗黑** 双重主题间平滑切换。
   - 去除右上角冗余主题按钮，界面更加清爽专注。
2. **📸 2400×1350 超高清主图重构**：
   - 融合深黑网格背景、电光蓝径向辉光、AST 动态时序图与现代化悬浮卡片构型。
3. **⚡ 核心性能与体验优化**：
   - CodeMirror 6 极客编辑模式与渲染画布自适应极黑高对比度。
   - AST 双向零延迟精准同步滚动与双侧联动高亮。
4. **🛡️ 事务级安全原子落盘与外部文件监控**。

---

### 📦 安装包与便携版下载

| 文件名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **`BookMD-Reader-1.3.0.msi`** | Windows 安装包 | 支持自动创建桌面快捷方式与程序菜单（推荐） |
| **`BookMD-Reader-win-x64-portable.zip`** | Windows 便携绿色版 | 解压后直接双击 `BookMD Reader.exe` 即可运行 |

---

### 🖥️ 系统要求

- Windows 10 / 11 (x64)
- 摸鱼Lab 研发出品
"""

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
        upload_url_template = rel_data["upload_url"]
        upload_base_url = upload_url_template.split("{")[0]
        html_url = rel_data["html_url"]
        print(f"Release created: {html_url}")

    # 4. Upload Assets
    assets_to_upload = [
        (
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.3.0.msi" if os.path.exists(r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD Reader 1.3.0.msi") else r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64\release\BookMD-Reader-1.3.0.msi",
            "BookMD-Reader-1.3.0.msi",
            "application/x-msi"
        ),
        (
            r"C:\Users\chunxvzhang\Desktop\codex\release\BookMD-Reader-win-x64-portable.zip",
            "BookMD-Reader-win-x64-portable.zip",
            "application/zip"
        )
    ]

    for file_path, name, content_type in assets_to_upload:
        if not os.path.exists(file_path):
            print(f"Warning: file not found {file_path}")
            continue
        size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"Uploading asset: {name} ({size_mb:.2f} MB)...")
        upload_url = f"{upload_base_url}?name={urllib.parse.quote(name)}"
        with open(file_path, "rb") as f:
            file_data = f.read()
        
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
        with urllib.request.urlopen(up_req) as up_resp:
            up_data = json.loads(up_resp.read().decode("utf-8"))
            print(f"Uploaded {name} successfully! Asset URL: {up_data.get('browser_download_url')}")

    print("\n[SUCCESS] Release v1.3.0 published successfully!")
    print(f"View Release: {html_url}")

if __name__ == "__main__":
    main()
