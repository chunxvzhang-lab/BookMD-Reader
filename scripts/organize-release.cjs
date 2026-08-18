const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const targetDir = path.resolve(__dirname, "..", "release", "BookMD-Reader-win-x64");
  const releaseSubDir = path.join(targetDir, "release");
  const assetsDir = path.join(targetDir, "assets");
  const docsDir = path.join(targetDir, "docs");

  await fs.mkdir(releaseSubDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });

  // Move MSI to release subdirectory
  const rootMsi = path.join(targetDir, "BookMD-Reader-1.0.0.msi");
  const targetMsi = path.join(releaseSubDir, "BookMD-Reader-1.0.0.msi");
  try {
    await fs.copyFile(rootMsi, targetMsi);
    await fs.rm(rootMsi, { force: true });
  } catch (err) {}

  // Copy necessary assets and docs into their respective folders
  try {
    await fs.copyFile(path.join(targetDir, "icon.png"), path.join(assetsDir, "icon.png"));
  } catch (e) {}
  try {
    await fs.copyFile(path.join(targetDir, "screenshot.png"), path.join(assetsDir, "screenshot.png"));
  } catch (e) {}
  try {
    await fs.copyFile(path.join(targetDir, "README.txt"), path.join(docsDir, "README.txt"));
  } catch (e) {}
  try {
    await fs.copyFile(path.join(targetDir, "LICENSE"), path.join(docsDir, "LICENSE"));
  } catch (e) {}
  try {
    await fs.copyFile(path.join(targetDir, "LICENSES.chromium.html"), path.join(docsDir, "LICENSES.chromium.html"));
  } catch (e) {}

  // Delete redundant root duplicate files to keep root directory clean and concise
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
      console.log(`Removed redundant root file: ${file}`);
    } catch (e) {}
  }

  console.log("Cleaned and organized release directory.");
}

main().catch(console.error);
