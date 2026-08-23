const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile, exec } = require("node:child_process");
const { promisify } = require("node:util");

const root = path.resolve(__dirname, "..");
const releaseRoot = path.join(root, "release");
const winUnpacked = path.join(releaseRoot, "win-unpacked");
const appDir = path.join(releaseRoot, "KnowSpace-win-x64");
const portableZip = path.join(releaseRoot, "KnowSpace-win-x64-portable.zip");
const execPromise = promisify(exec);
const execFileAsync = promisify(execFile);

async function main() {
  console.log("1. Ensuring dist is built...");
  await assertExists(path.join(root, "dist", "index.html"), "dist is missing. Run npm run build first.");

  console.log("2. Generating unpacked application via electron-builder with custom icon...");
  await execPromise("npx electron-builder --win dir", { cwd: root });

  console.log("3. Copying unpacked binaries into release/KnowSpace-win-x64...");
  await fs.mkdir(releaseRoot, { recursive: true });

  // Clean old target folder
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.rm(appDir, { recursive: true, force: true });
      break;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  await copyDirectory(winUnpacked, appDir);

  console.log("3.5 Embedding icon & PE version info into KnowSpace.exe...");
  const pkg = require("../package.json");
  const appVersion = pkg.version || "1.5.0";
  const rcedit = path.join(root, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");
  const targetExe = path.join(appDir, "KnowSpace.exe");
  const iconIco = path.join(root, "build", "icon.ico");
  try {
    await execFileAsync(rcedit, [
      targetExe,
      "--set-icon", iconIco,
      "--set-file-version", appVersion,
      "--set-product-version", appVersion,
      "--set-version-string", "CompanyName", "摸鱼Lab",
      "--set-version-string", "LegalCopyright", "Copyright © 2026 摸鱼Lab",
      "--set-version-string", "FileDescription", "KnowSpace · Personal Knowledge Workspace",
      "--set-version-string", "ProductName", "KnowSpace",
    ]);
    console.log(`Successfully embedded icon and PE metadata (v${appVersion}) into KnowSpace.exe.`);
  } catch (err) {
    console.warn("rcedit notice:", err.message);
  }

  console.log("4. Organizing subfolders (release, docs, assets)...");
  const releaseSubDir = path.join(appDir, "release");
  const assetsDir = path.join(appDir, "assets");
  const docsDir = path.join(appDir, "docs");

  await fs.mkdir(releaseSubDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });

  // Copy MSI if exists
  const possibleMsiSources = [
    path.join(releaseRoot, `KnowSpace ${appVersion}.msi`),
    path.join(releaseRoot, `KnowSpace-${appVersion}.msi`),
    path.join(releaseRoot, `BookMD Reader ${appVersion}.msi`),
    path.join(releaseRoot, `BookMD-Reader-${appVersion}.msi`),
  ];
  for (const src of possibleMsiSources) {
    try {
      await fs.copyFile(src, path.join(releaseSubDir, `KnowSpace-${appVersion}.msi`));
      console.log(`Included MSI installer: ${src} -> KnowSpace-${appVersion}.msi`);
      break;
    } catch (e) {}
  }

  // Copy assets and docs
  try {
    await fs.copyFile(path.join(root, "icon.png"), path.join(assetsDir, "icon.png"));
  } catch (e) {}
  try {
    await fs.copyFile(path.join(root, "screenshot.png"), path.join(assetsDir, "screenshot.png"));
  } catch (e) {}
  try {
    await fs.copyFile(path.join(root, "LICENSE"), path.join(docsDir, "LICENSE"));
  } catch (e) {}
  try {
    const readmeTxt = `KnowSpace v${appVersion}\nPersonal Knowledge Workspace (个人知识工作台)\n\nDirect Run: Double-click 'KnowSpace.exe'\nInstaller: Locate MSI in 'release/KnowSpace-${appVersion}.msi'\nGitHub: https://github.com/chunxvzhang-lab/BookMD-Reader\n`;
    await fs.writeFile(path.join(docsDir, "README.txt"), readmeTxt, "utf8");
  } catch (e) {}
  try {
    await fs.copyFile(path.join(root, "README.md"), path.join(appDir, "README.md"));
  } catch (e) {}

  console.log("5. Creating portable zip archive...");
  await createPortableZip();

  console.log(`\n🎉 Successfully packaged desktop app: ${appDir}`);
  console.log(`🎉 Portable zip: ${portableZip}`);
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
      const target = await fs.readlink(sourcePath);
      await fs.symlink(target, destinationPath).catch(() => {});
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function createPortableZip() {
  await fs.rm(portableZip, { force: true }).catch(() => {});
  const command = `Compress-Archive -Path '${appDir}\\*' -DestinationPath '${portableZip}' -Force`;
  await execPromise(`powershell -NoProfile -Command "${command}"`, { cwd: root });
}

async function assertExists(filePath, message) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(message);
  }
}

main().catch((err) => {
  console.error("Packaging error:", err);
  process.exit(1);
});
