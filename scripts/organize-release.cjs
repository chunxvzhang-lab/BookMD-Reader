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
    console.log("Moved BookMD-Reader-1.0.0.msi into release/ subfolder.");
  } catch (err) {
    console.log("MSI root file not found or already moved:", err.message);
  }

  // Copy assets and docs
  try {
    await fs.copyFile(path.join(targetDir, "icon.png"), path.join(assetsDir, "icon.png"));
    await fs.copyFile(path.join(targetDir, "screenshot.png"), path.join(assetsDir, "screenshot.png"));
  } catch (e) {}

  try {
    await fs.copyFile(path.join(targetDir, "README.txt"), path.join(docsDir, "README.txt"));
    await fs.copyFile(path.join(targetDir, "LICENSE"), path.join(docsDir, "LICENSE"));
    await fs.copyFile(path.join(targetDir, "LICENSES.chromium.html"), path.join(docsDir, "LICENSES.chromium.html"));
  } catch (e) {}

  console.log("Release directory organization complete.");
}

main().catch(console.error);
