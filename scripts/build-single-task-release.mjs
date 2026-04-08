import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const releaseDir = path.join(rootDir, "release");
const inputPath = path.join(outDir, "tasks.html");
const outputPath = path.join(releaseDir, "tasks.html");

async function ensureFile(filePath) {
  await fs.access(filePath);
  return filePath;
}

function resolveAssetPath(assetPath) {
  const normalized = assetPath.replace(/^\.\//, "").replace(/\//g, path.sep);
  return path.join(outDir, normalized);
}

function escapeInlineScript(source) {
  return source.replace(/<\/script/gi, "<\\/script");
}

function escapeInlineStyle(source) {
  return source.replace(/<\/style/gi, "<\\/style");
}

async function inlineAssets() {
  await ensureFile(inputPath);

  const html = await fs.readFile(inputPath, "utf8");

  let inlined = html.replace(
    /<link\s+rel="stylesheet"\s+href="([^"]+)"([^>]*)\/>/gi,
    (_match, href, rest) => {
      const assetPath = resolveAssetPath(href);
      const css = escapeInlineStyle(
        readFileSync(assetPath, "utf8")
      );

      return `<style data-inline-href="${href}"${rest}>${css}</style>`;
    }
  );

  inlined = inlined.replace(
    /<link\s+rel="preload"\s+as="script"[^>]*href="[^"]+"[^>]*\/>/gi,
    ""
  );

  inlined = inlined.replace(
    /<script([^>]*?)\ssrc="([^"]+)"([^>]*)><\/script>/gi,
    (_match, beforeSrc, src, afterSrc) => {
      const assetPath = resolveAssetPath(src);
      const script = escapeInlineScript(
        readFileSync(assetPath, "utf8")
      );
      const attributes = `${beforeSrc}${afterSrc}`.replace(/\sasync(="")?/gi, "");

      return `<script${attributes} data-inline-src="${src}">${script}</script>`;
    }
  );

  await fs.rm(releaseDir, { recursive: true, force: true });
  await fs.mkdir(releaseDir, { recursive: true });
  await fs.writeFile(outputPath, inlined, "utf8");
}

await inlineAssets();
