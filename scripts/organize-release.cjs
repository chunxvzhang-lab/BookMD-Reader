const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const pkg = require("../package.json");
  const appVersion = pkg.version || "1.2.0";
  const releaseRoot = path.join(rootDir, "release");
  const targetDir = path.join(releaseRoot, "BookMD-Reader-win-x64");
  const releaseSubDir = path.join(targetDir, "release");
  const assetsDir = path.join(targetDir, "assets");
  const docsDir = path.join(targetDir, "docs");

  await fs.mkdir(releaseSubDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });

  // Move newly built MSI to release subdirectory
  const possibleMsiSources = [
    path.join(releaseRoot, `BookMD Reader ${appVersion}.msi`),
    path.join(releaseRoot, `BookMD-Reader-${appVersion}.msi`),
    path.join(targetDir, `BookMD-Reader-${appVersion}.msi`),
    path.join(targetDir, `BookMD Reader ${appVersion}.msi`),
    path.join(releaseRoot, "BookMD Reader 1.0.0.msi"),
    path.join(releaseRoot, "BookMD-Reader-1.0.0.msi"),
  ];

  const targetMsi = path.join(releaseSubDir, `BookMD-Reader-${appVersion}.msi`);
  for (const src of possibleMsiSources) {
    try {
      await fs.copyFile(src, targetMsi);
      console.log(`Copied MSI from ${src} to ${targetMsi}`);
      break;
    } catch (e) {}
  }

  // Copy icon and screenshot into assets
  try {
    await fs.copyFile(path.join(rootDir, "icon.png"), path.join(assetsDir, "icon.png"));
  } catch (e) {}
  try {
    await fs.copyFile(path.join(rootDir, "screenshot.png"), path.join(assetsDir, "screenshot.png"));
  } catch (e) {}

  // Docs
  try {
    await fs.copyFile(path.join(rootDir, "LICENSE"), path.join(docsDir, "LICENSE"));
  } catch (e) {}
  try {
    const readmeTxt = `BookMD Reader v${appVersion}\nModern Local-First Markdown Reader & Editor\n\nDirect Run: Double-click 'BookMD Reader.exe'\nInstaller: Locate MSI in 'release/BookMD-Reader-${appVersion}.msi'\nGitHub: https://github.com/chunxvzhang-lab/BookMD-Reader\n`;
    await fs.writeFile(path.join(docsDir, "README.txt"), readmeTxt, "utf8");
  } catch (e) {}

  // Delete redundant root duplicate files in win-x64
  const redundantFiles = [
    "LICENSES.chromium.html",
    "README.txt",
    "LICENSE",
    "screenshot.png",
    "icon.png",
  ];

  for (const file of redundantFiles) {
    try {
      await fs.rm(path.join(targetDir, file), { force: true });
    } catch (e) {}
  }

  console.log(`Organized ${targetDir} for release v${appVersion}`);
}

main().catch(console.error);
