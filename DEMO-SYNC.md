# Unity WebGL Demo Sync Guide

This guide explains how to sync the Unity WebGL demo build to `wealthwars.fun/demo/`.

## Overview

The demo is served from the `public/demo/` directory in this repository. A GitHub Actions workflow (`sync-demo.yml`) automates copying Unity WebGL builds from a separate repository.

## Prerequisites

- Unity WebGL build must be exported and committed to a GitHub repository
- The build repository must contain:
  - `index.html` (Unity's main HTML file)
  - `Build/` folder (contains .data, .wasm, .loader.js, .framework.js files)
  - `TemplateData/` folder (Unity's template assets)
  - Optionally: `StreamingAssets/` folder

## How to Sync the Demo

### Step 1: Navigate to GitHub Actions

1. Go to https://github.com/SerStakeAlot/wealth-wars-landing/actions
2. Click on the **"Sync Demo Build"** workflow in the left sidebar
3. Click the **"Run workflow"** dropdown button (top right)

### Step 2: Configure Workflow Inputs

Provide the following parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `build_repo` | Owner and name of the Unity build repository | `SerStakeAlot/wealthwarsbuild` |
| `build_ref` | Branch, tag, or commit SHA to sync from | `main` |
| `build_path` | Path to the WebGL export folder (containing index.html) | `.` or `WebGL/` |

**Example Configuration:**
```
build_repo: SerStakeAlot/wealthwarsbuild
build_ref: main
build_path: WebGL/
```

### Step 3: Run the Workflow

1. Click **"Run workflow"** (green button)
2. Wait for the workflow to complete (~1-2 minutes)
3. The workflow will:
   - Clone the Unity build repository
   - Copy files to `public/demo/`
   - Convert absolute paths to relative paths in `index.html`
   - Commit and push changes to `main` branch
   - Trigger automatic deployment via GitHub Pages

### Step 4: Verify Deployment

1. Wait for GitHub Pages deployment to complete (usually 2-5 minutes after the workflow)
2. Visit https://wealthwars.fun/demo/
3. Verify the Unity WebGL application loads correctly
4. Check browser console for any 404 errors on assets

## Path Requirements

Unity WebGL builds must use **relative paths** for assets. The workflow automatically converts absolute paths like `/Build/` to relative paths like `./Build/`.

### Unity Export Settings

When building WebGL in Unity, ensure:
- **Compression Format**: Set to appropriate value (Gzip or Brotli recommended)
- **Data Caching**: Enabled for better performance
- The exported files are in a single folder (not nested deeply)

## Troubleshooting

### Issue: Assets not loading (404 errors)

**Solution:**
- Check that `Build/`, `TemplateData/` folders are present in the Unity export
- Verify paths in `public/demo/index.html` are relative (start with `./`)
- Ensure the `build_path` parameter points to the correct folder

### Issue: Workflow fails with "Source path does not exist"

**Solution:**
- Verify the `build_repo` name is correct (format: `owner/repo`)
- Check that `build_ref` (branch/tag) exists in the build repository
- Confirm `build_path` points to the folder containing `index.html`

### Issue: Demo page shows placeholder instead of game

**Solution:**
- Ensure the sync workflow ran successfully and committed files
- Check that files were pushed to the `main` branch
- Wait for GitHub Pages deployment to complete
- Clear browser cache and hard refresh (Ctrl+F5 / Cmd+Shift+R)

### Issue: File size limits

Unity WebGL builds can be large. GitHub has file size limits:
- Single file: 100 MB maximum
- Repository: 1 GB recommended maximum

**Solutions if limits are exceeded:**
- Use Git LFS for large binary files
- Enable Unity's compression options (Gzip or Brotli)
- Consider code splitting or asset optimization
- Report back if alternative hosting is needed

## Manual Sync (Alternative)

If you prefer to sync manually:

```bash
# 1. Clone both repos
git clone https://github.com/SerStakeAlot/wealth-wars-landing
git clone https://github.com/SerStakeAlot/wealthwarsbuild

# 2. Copy Unity files
cd wealth-wars-landing
rm -rf public/demo/Build public/demo/TemplateData public/demo/StreamingAssets
cp ../wealthwarsbuild/index.html public/demo/
cp -r ../wealthwarsbuild/Build public/demo/
cp -r ../wealthwarsbuild/TemplateData public/demo/

# 3. Fix paths in index.html (if needed)
sed -i 's|src="/Build/|src="./Build/|g' public/demo/index.html
sed -i 's|href="/Build/|href="./Build/|g' public/demo/index.html
sed -i 's|src="/TemplateData/|src="./TemplateData/|g' public/demo/index.html
sed -i 's|href="/TemplateData/|href="./TemplateData/|g' public/demo/index.html

# 4. Commit and push
git add public/demo/
git commit -m "Update Unity WebGL demo"
git push origin main
```

## File Structure

After a successful sync, the structure should be:

```
public/demo/
├── index.html              # Unity's main HTML file (with relative paths)
├── Build/
│   ├── demo.data           # Game data
│   ├── demo.framework.js   # Unity framework
│   ├── demo.loader.js      # Unity loader
│   └── demo.wasm          # WebAssembly binary
└── TemplateData/
    ├── favicon.ico
    ├── fullscreen-button.png
    ├── progress-bar-empty-dark.png
    ├── progress-bar-full-dark.png
    ├── unity-logo-dark.png
    └── webgl-logo.png
```

## Deployment Flow

```
Unity Build Repo → Sync Workflow → public/demo/ → Git Commit → GitHub Pages → wealthwars.fun/demo/
```

## Notes

- The `.nojekyll` file in `public/` prevents GitHub Pages from processing Unity's `_` prefixed files
- The workflow runs on-demand only (manual trigger)
- Each sync completely replaces previous demo files
- The placeholder `index.html` will be overwritten by Unity's `index.html`
- Homepage "Play Demo (Holders)" button should link to `/demo/` (already configured)

## Support

If you encounter issues:
1. Check the workflow run logs in GitHub Actions
2. Verify the Unity build exports correctly
3. Test the build locally before syncing
4. Review this guide's troubleshooting section
5. Open an issue if problems persist

---

**Last Updated:** October 11, 2025
