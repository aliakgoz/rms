import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "standalone", "tasks-single.template.html");
const cssPath = path.join(rootDir, "standalone", "tasks-single.css");
const jsPath = path.join(rootDir, "standalone", "tasks-single.js");
const releaseDir = path.join(rootDir, "release");
const targetPath = path.join(releaseDir, "tasks.html");

await Promise.all([fs.access(sourcePath), fs.access(cssPath), fs.access(jsPath)]);
const [template, css, js] = await Promise.all([
  fs.readFile(sourcePath, "utf8"),
  fs.readFile(cssPath, "utf8"),
  fs.readFile(jsPath, "utf8")
]);

const output = template
  .replace("/*__TASKS_CSS__*/", css)
  .replace("/*__TASKS_JS__*/", js);

await fs.rm(releaseDir, { recursive: true, force: true });
await fs.mkdir(releaseDir, { recursive: true });
await fs.writeFile(targetPath, output, "utf8");
