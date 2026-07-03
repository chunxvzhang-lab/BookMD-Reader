const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const root = path.resolve(__dirname, "..");
const releaseRoot = path.join(root, "release");
const appDir = path.join(releaseRoot, "BookMD-Reader-win-x64");
const resourcesApp = path.join(appDir, "resources", "app");
const portableZip = path.join(releaseRoot, "BookMD-Reader-win-x64-portable.zip");
const execFileAsync = promisify(execFile);

async function main() {
  const electronDist = await resolveElectronRuntime();
  await assertExists(path.join(electronDist, "electron.exe"), "Electron runtime is missing.");
  await assertExists(path.join(root, "dist", "index.html"), "dist is missing. Run npm run build first.");

  await fs.rm(appDir, { recursive: true, force: true });
  await fs.rm(portableZip, { force: true });
  await fs.mkdir(releaseRoot, { recursive: true });

  await copyDirectory(electronDist, appDir);
  await fs.rename(path.join(appDir, "electron.exe"), path.join(appDir, "BookMD Reader.exe"));
  await fs.rm(path.join(appDir, "resources", "default_app.asar"), { force: true });

  const rceditPath = path.join(root, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");
  const iconIcoPath = path.join(root, "electron", "icon.ico");
  try {
    await fs.access(rceditPath);
    await fs.access(iconIcoPath);
    console.log("Applying icon to executable using rcedit...");
    const targetExe = path.join(appDir, "BookMD Reader.exe");
    let success = false;
    for (let i = 0; i < 5; i++) {
      try {
        await execFileAsync(rceditPath, [targetExe, "--set-icon", iconIcoPath]);
        success = true;
        break;
      } catch (err) {
        if (i === 4) throw err;
        console.log(`rcedit failed (attempt ${i + 1}/5), retrying in 500ms...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (success) {
      console.log("Successfully applied icon to executable.");
    }
  } catch (err) {
    console.warn("Could not apply icon to executable:", err.message);
  }

  await fs.mkdir(resourcesApp, { recursive: true });
  await copyDirectory(path.join(root, "dist"), path.join(resourcesApp, "dist"));
  await copyDirectory(path.join(root, "electron"), path.join(resourcesApp, "electron"));
  await fs.copyFile(path.join(root, "package.json"), path.join(resourcesApp, "package.json"));
  await fs.copyFile(path.join(root, "README.md"), path.join(resourcesApp, "README.md"));
  await fs.copyFile(path.join(root, "README.md"), path.join(appDir, "README.md"));
  await fs.copyFile(path.join(root, "icon.png"), path.join(resourcesApp, "icon.png"));
  await fs.copyFile(path.join(root, "icon.png"), path.join(appDir, "icon.png"));
  await fs.copyFile(path.join(root, "screenshot.png"), path.join(resourcesApp, "screenshot.png"));
  await fs.copyFile(path.join(root, "screenshot.png"), path.join(appDir, "screenshot.png"));
  await writePortableReadme();
  await validatePortableApp();
  await createPortableZip();

  console.log(`Packaged desktop app: ${appDir}`);
  console.log(`Portable zip: ${portableZip}`);
}

async function resolveElectronRuntime() {
  const candidates = [
    path.join(root, "node_modules", "electron", "dist"),
    path.join(releaseRoot, "win-unpacked.tmp"),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "electron.exe"));
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  throw new Error("Electron runtime is missing.");
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else if (entry.isSymbolicLink()) {
      const link = await fs.readlink(sourcePath);
      await fs.symlink(link, destinationPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function assertExists(filePath, message) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(message);
  }
}

async function writePortableReadme() {
  const content = `BookMD Reader Portable / BookMD 阅读器便携版

中文
====

这是免安装版本。请保留整个 BookMD-Reader-win-x64 文件夹，双击其中的 BookMD Reader.exe 即可运行。

使用方式：
1. 直接双击 BookMD Reader.exe。
2. 点击“打开”读取单个 .md / .markdown 文件。
3. 点击“目录”读取包含多个 Markdown 文件的文件夹。
4. 也可以在 Windows 中右键 Markdown 文件，选择“打开方式”，指定 BookMD Reader.exe。

注意：
- 不需要安装 Node.js、npm、Electron 或其他运行环境。
- 不要只复制 BookMD Reader.exe。程序需要同目录下的 resources、locales 和 dll 文件。
- 如果 Windows SmartScreen 提示，请选择“更多信息”后继续运行；这是便携应用常见提示。

English
=======

This is the install-free portable build. Keep the whole BookMD-Reader-win-x64 folder together and run BookMD Reader.exe.

How to use:
1. Double-click BookMD Reader.exe.
2. Use "Open" to load a single .md / .markdown file.
3. Use "Directory" to load a folder of Markdown files.
4. You can also right-click a Markdown file in Windows, choose "Open with", and select BookMD Reader.exe.

Notes:
- Node.js, npm, Electron, and development tools are not required on the target computer.
- Do not copy only BookMD Reader.exe. The app needs the resources, locales, and dll files next to it.
- If Windows SmartScreen appears, choose "More info" and continue if you trust this build.
`;
  await fs.writeFile(path.join(appDir, "README.txt"), content, "utf8");
}

async function validatePortableApp() {
  const requiredFiles = [
    "BookMD Reader.exe",
    path.join("resources", "app", "dist", "index.html"),
    path.join("resources", "app", "electron", "main.cjs"),
    path.join("resources", "app", "electron", "preload.cjs"),
    "icudtl.dat",
    "ffmpeg.dll",
    "v8_context_snapshot.bin",
  ];

  for (const relativePath of requiredFiles) {
    await assertExists(path.join(appDir, relativePath), `Portable package is incomplete: ${relativePath}`);
  }
}

async function createPortableZip() {
  if (process.platform !== "win32") {
    console.warn("Skipping zip creation: portable zip generation currently uses Windows PowerShell.");
    return;
  }

  const command = `Compress-Archive -Path ${quotePowerShell(appDir)} -DestinationPath ${quotePowerShell(portableZip)} -Force`;
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    command,
  ]);
}

function quotePowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
