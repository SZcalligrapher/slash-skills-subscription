import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || readFlag("--port") || 8787);

function readFlag(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  return JSON.parse(await fs.readFile(fullPath, "utf8"));
}

async function writeJson(relativePath, value) {
  const fullPath = safeJoin(root, relativePath);
  await fs.writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeJoin(base, relativePath) {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(base, normalized);
  if (!fullPath.startsWith(base)) {
    throw new Error("Path escapes repository root.");
  }
  return fullPath;
}

async function listDirectories(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!(await exists(fullPath))) return [];
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const metadata = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([^:]+):\s*(.*)$/);
    if (pair) metadata[pair[1].trim()] = pair[2].trim().replace(/^["']|["']$/g, "");
  }
  return metadata;
}

async function hashFile(filePath) {
  const content = await fs.readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function hashDirectory(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!(await exists(fullPath))) return null;
  const hashes = [];

  async function visit(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === ".git") continue;
      const entryPath = path.join(dir, entry.name);
      const rel = path.relative(fullPath, entryPath);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        hashes.push(`${rel}:${await hashFile(entryPath)}`);
      }
    }
  }

  await visit(fullPath);
  return createHash("sha256").update(hashes.join("\n")).digest("hex");
}

async function getSourceSkills() {
  const lines = await listDirectories("skills");
  const skills = [];
  for (const line of lines) {
    for (const slug of await listDirectories(`skills/${line}`)) {
      const skillPath = `skills/${line}/${slug}`;
      const skillMdPath = `${skillPath}/SKILL.md`;
      const content = (await exists(path.join(root, skillMdPath)))
        ? await fs.readFile(path.join(root, skillMdPath), "utf8")
        : "";
      skills.push({
        line,
        slug,
        path: skillPath,
        skillMdPath,
        metadata: parseFrontmatter(content),
        content
      });
    }
  }
  return skills;
}

async function getPacks() {
  const plugins = await listDirectories("plugins");
  const packs = [];
  for (const name of plugins) {
    const codexPath = `plugins/${name}/.codex-plugin/plugin.json`;
    const claudePath = `plugins/${name}/.claude-plugin/plugin.json`;
    const codexManifest = (await exists(path.join(root, codexPath))) ? await readJson(codexPath) : null;
    const claudeManifest = (await exists(path.join(root, claudePath))) ? await readJson(claudePath) : null;
    const skillsPath = `plugins/${name}/skills`;
    packs.push({
      name,
      codexPath,
      claudePath,
      codexManifest,
      claudeManifest,
      skills: await listDirectories(skillsPath)
    });
  }
  return packs;
}

function inferSourcePathForPluginSkill(pluginName, skillName) {
  const line = pluginName.replace(/^slash-/, "");
  return `skills/${line}/${skillName}`;
}

async function validateRepository() {
  const marketplace = await readJson("marketplace.json");
  const sourceSkills = await getSourceSkills();
  const packs = await getPacks();
  const checks = [];

  const add = (ok, label, detail = "") => checks.push({ ok, label, detail });

  add(Boolean(marketplace.name), "marketplace.json has a name");
  add(Array.isArray(marketplace.plugins), "marketplace.json has plugins[]");

  for (const entry of marketplace.plugins || []) {
    const pluginPath = entry?.source?.path?.replace(/^\.\//, "");
    add(Boolean(entry.name), "marketplace plugin has a name", JSON.stringify(entry));
    add(Boolean(pluginPath) && await exists(path.join(root, pluginPath || "")), `${entry.name} source path exists`, pluginPath || "");
    add(Boolean(entry.policy?.installation), `${entry.name} has installation policy`);
    add(Boolean(entry.policy?.authentication), `${entry.name} has authentication policy`);
    add(Boolean(entry.category), `${entry.name} has category`);
  }

  for (const pack of packs) {
    add(Boolean(pack.codexManifest), `${pack.name} has .codex-plugin/plugin.json`);
    add(Boolean(pack.claudeManifest), `${pack.name} has .claude-plugin/plugin.json`);
    add(pack.codexManifest?.name === pack.name, `${pack.name} Codex manifest name matches folder`);
    add(pack.codexManifest?.skills === "./skills/", `${pack.name} Codex manifest points to ./skills/`);

    for (const skillName of pack.skills) {
      const sourcePath = inferSourcePathForPluginSkill(pack.name, skillName);
      const sourceHash = await hashDirectory(sourcePath);
      const pluginHash = await hashDirectory(`plugins/${pack.name}/skills/${skillName}`);
      add(Boolean(sourceHash), `${pack.name}/${skillName} source exists`, sourcePath);
      add(sourceHash === pluginHash, `${pack.name}/${skillName} plugin copy is synced`, sourcePath);
    }
  }

  for (const skill of sourceSkills) {
    add(Boolean(skill.metadata.name), `${skill.path} SKILL.md has name`);
    add(Boolean(skill.metadata.description), `${skill.path} SKILL.md has description`);
  }

  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}

async function getState() {
  return {
    marketplace: await readJson("marketplace.json"),
    sourceSkills: await getSourceSkills(),
    packs: await getPacks(),
    validation: await validateRepository()
  };
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function runSyncScript() {
  return new Promise((resolve) => {
    const child = spawn("bash", ["scripts/sync-plugin-skills.sh"], { cwd: root });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ ok: code === 0, code, stdout, stderr }));
  });
}

async function route(request, response) {
  const url = new URL(request.url, `http://${host}:${port}`);

  try {
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(pageHtml);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      await sendJson(response, 200, await getState());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/save-skill") {
      const body = await readRequestBody(request);
      if (!body.skillMdPath?.startsWith("skills/") || !body.skillMdPath.endsWith("/SKILL.md")) {
        throw new Error("Can only edit source skills/*/*/SKILL.md files.");
      }
      const fullPath = safeJoin(root, body.skillMdPath);
      await fs.writeFile(fullPath, String(body.content || ""), "utf8");
      await sendJson(response, 200, { ok: true, state: await getState() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/save-marketplace") {
      const body = await readRequestBody(request);
      const marketplace = await readJson("marketplace.json");
      marketplace.interface = marketplace.interface || {};
      marketplace.interface.displayName = String(body.displayName || marketplace.interface.displayName || marketplace.name);
      await writeJson("marketplace.json", marketplace);
      await sendJson(response, 200, { ok: true, state: await getState() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/save-pack") {
      const body = await readRequestBody(request);
      const packName = String(body.name || "");
      if (!/^[a-z0-9-]+$/.test(packName)) throw new Error("Invalid pack name.");

      const codexPath = `plugins/${packName}/.codex-plugin/plugin.json`;
      const claudePath = `plugins/${packName}/.claude-plugin/plugin.json`;
      const codex = await readJson(codexPath);
      const claude = await readJson(claudePath);

      codex.description = String(body.description || codex.description || "");
      codex.interface = codex.interface || {};
      codex.interface.displayName = String(body.displayName || codex.interface.displayName || packName);
      codex.interface.shortDescription = String(body.shortDescription || codex.interface.shortDescription || "");
      codex.interface.category = String(body.category || codex.interface.category || "Creativity");
      codex.interface.defaultPrompt = [String(body.defaultPrompt || codex.interface.defaultPrompt?.[0] || "")].filter(Boolean);

      claude.description = codex.description;
      claude.interface = claude.interface || {};
      claude.interface.displayName = codex.interface.displayName;
      claude.interface.shortDescription = codex.interface.shortDescription;
      claude.interface.category = codex.interface.category;

      const marketplace = await readJson("marketplace.json");
      const entry = marketplace.plugins?.find((plugin) => plugin.name === packName);
      if (entry) entry.category = codex.interface.category;

      await writeJson(codexPath, codex);
      await writeJson(claudePath, claude);
      await writeJson("marketplace.json", marketplace);
      await sendJson(response, 200, { ok: true, state: await getState() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/sync") {
      const result = await runSyncScript();
      await sendJson(response, result.ok ? 200 : 500, { ...result, state: await getState() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/validate") {
      await sendJson(response, 200, await validateRepository());
      return;
    }

    await sendJson(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    await sendJson(response, 500, { ok: false, error: error.message });
  }
}

const pageHtml = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Slash Skills Admin</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #202124;
      --muted: #6b6f76;
      --line: #d9dce1;
      --paper: #fafafa;
      --panel: #ffffff;
      --accent: #e14b2a;
      --blue: #2364aa;
      --green: #18875b;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--paper);
    }

    header {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 20px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }

    button {
      appearance: none;
      border: 1px solid var(--ink);
      background: var(--ink);
      color: #fff;
      height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      font: inherit;
      cursor: pointer;
    }

    button.secondary {
      background: #fff;
      color: var(--ink);
      border-color: var(--line);
    }

    main {
      display: grid;
      grid-template-columns: 320px 1fr;
      min-height: calc(100vh - 56px);
    }

    aside {
      border-right: 1px solid var(--line);
      background: #fff;
      padding: 16px;
      overflow: auto;
    }

    section {
      padding: 20px;
      overflow: auto;
    }

    .small {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .stack { display: grid; gap: 12px; }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

    .item {
      display: block;
      width: 100%;
      text-align: left;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 6px;
      min-height: 48px;
      padding: 10px;
    }

    .item.active {
      border-color: var(--accent);
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .label {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--muted);
    }

    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px;
      font: inherit;
      color: var(--ink);
      background: #fff;
    }

    textarea {
      min-height: 48vh;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .status {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 999px;
      padding: 0 10px;
      border: 1px solid var(--line);
      font-size: 13px;
      background: #fff;
    }

    .status.ok { color: var(--green); }
    .status.bad { color: var(--accent); }

    .checks {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .check {
      display: grid;
      grid-template-columns: 22px 1fr;
      align-items: start;
      padding: 8px 0;
      border-bottom: 1px solid #eceef2;
      font-size: 14px;
    }

    .check .mark.ok { color: var(--green); }
    .check .mark.bad { color: var(--accent); }

    @media (max-width: 860px) {
      main { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid var(--line); }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Slash Skills Admin</h1>
      <div class="small" id="subtitle">本地订阅合集管理台</div>
    </div>
    <div class="toolbar">
      <span id="globalStatus" class="status">Loading</span>
      <button class="secondary" id="refreshBtn">刷新</button>
      <button id="syncBtn">同步插件包</button>
    </div>
  </header>
  <main>
    <aside class="stack">
      <div class="stack">
        <strong>Skill Packs</strong>
        <div id="packList" class="stack"></div>
      </div>
      <div class="stack">
        <strong>Source Skills</strong>
        <div id="skillList" class="stack"></div>
      </div>
    </aside>
    <section id="detail" class="stack"></section>
  </main>

  <script>
    let state = null;
    let selected = { type: "overview" };

    const $ = (selector) => document.querySelector(selector);

    async function api(path, options = {}) {
      const response = await fetch(path, {
        headers: { "content-type": "application/json" },
        ...options
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.error || "Request failed");
      return payload;
    }

    async function load() {
      state = await api("/api/state");
      render();
    }

    function render() {
      const status = $("#globalStatus");
      status.textContent = state.validation.ok ? "验证通过" : "需要处理";
      status.className = "status " + (state.validation.ok ? "ok" : "bad");

      $("#subtitle").textContent = state.marketplace.interface?.displayName || state.marketplace.name;

      $("#packList").innerHTML = state.packs.map((pack) => buttonHtml(
        "pack",
        pack.name,
        pack.codexManifest?.interface?.displayName || pack.name,
        pack.codexManifest?.interface?.shortDescription || pack.codexManifest?.description || ""
      )).join("");

      $("#skillList").innerHTML = state.sourceSkills.map((skill) => buttonHtml(
        "skill",
        skill.skillMdPath,
        skill.metadata.name || skill.slug,
        skill.path
      )).join("");

      document.querySelectorAll("[data-type]").forEach((button) => {
        button.onclick = () => {
          selected = { type: button.dataset.type, id: button.dataset.id };
          render();
        };
      });

      if (selected.type === "pack") renderPack(selected.id);
      else if (selected.type === "skill") renderSkill(selected.id);
      else renderOverview();
    }

    function buttonHtml(type, id, title, subtitle) {
      const active = selected.type === type && selected.id === id ? " active" : "";
      return '<button class="item' + active + '" data-type="' + escapeHtml(type) + '" data-id="' + escapeHtml(id) + '">' +
        '<strong>' + escapeHtml(title) + '</strong><br><span class="small">' + escapeHtml(subtitle || "") + '</span></button>';
    }

    function renderOverview() {
      const checksHtml = state.validation.checks.map((check) => {
        const detail = check.detail ? '<br><span class="small">' + escapeHtml(check.detail) + '</span>' : '';
        return '<li class="check">' +
          '<span class="mark ' + (check.ok ? "ok" : "bad") + '">' + (check.ok ? "OK" : "!!") + '</span>' +
          '<span>' + escapeHtml(check.label) + detail + '</span>' +
        '</li>';
      }).join("");
      $("#detail").innerHTML =
        '<div class="stack">' +
          '<h2>验证面板</h2>' +
          '<div class="toolbar">' +
            '<button class="secondary" id="validateBtn">重新验证</button>' +
            '<button class="secondary" id="saveMarketplaceBtn">保存合集名称</button>' +
          '</div>' +
          '<label class="label">合集显示名称' +
            '<input id="marketplaceName" value="' + escapeAttr(state.marketplace.interface?.displayName || "") + '" />' +
          '</label>' +
          '<ul class="checks">' + checksHtml + '</ul>' +
        '</div>';
      $("#validateBtn").onclick = load;
      $("#saveMarketplaceBtn").onclick = async () => {
        const payload = await api("/api/save-marketplace", {
          method: "POST",
          body: JSON.stringify({ displayName: $("#marketplaceName").value })
        });
        state = payload.state;
        render();
      };
    }

    function renderPack(name) {
      const pack = state.packs.find((item) => item.name === name);
      if (!pack) return renderOverview();
      const manifest = pack.codexManifest || {};
      const ui = manifest.interface || {};
      $("#detail").innerHTML =
        '<div class="stack">' +
          '<h2>' + escapeHtml(name) + '</h2>' +
          '<div class="grid">' +
            '<label class="label">显示名称<input id="displayName" value="' + escapeAttr(ui.displayName || "") + '" /></label>' +
            '<label class="label">分类<input id="category" value="' + escapeAttr(ui.category || "Creativity") + '" /></label>' +
          '</div>' +
          '<label class="label">一句话简介<input id="shortDescription" value="' + escapeAttr(ui.shortDescription || "") + '" /></label>' +
          '<label class="label">描述<input id="description" value="' + escapeAttr(manifest.description || "") + '" /></label>' +
          '<label class="label">默认提示词<input id="defaultPrompt" value="' + escapeAttr(ui.defaultPrompt?.[0] || "") + '" /></label>' +
          '<div class="toolbar">' +
            '<button id="savePackBtn">保存 Pack 元数据</button>' +
          '</div>' +
          '<p class="small">保存会同时更新 Codex 和 Claude manifest，并同步 marketplace 的 category。</p>' +
        '</div>';
      $("#savePackBtn").onclick = async () => {
        const payload = await api("/api/save-pack", {
          method: "POST",
          body: JSON.stringify({
            name,
            displayName: $("#displayName").value,
            category: $("#category").value,
            shortDescription: $("#shortDescription").value,
            description: $("#description").value,
            defaultPrompt: $("#defaultPrompt").value
          })
        });
        state = payload.state;
        render();
      };
    }

    function renderSkill(skillMdPath) {
      const skill = state.sourceSkills.find((item) => item.skillMdPath === skillMdPath);
      if (!skill) return renderOverview();
      $("#detail").innerHTML =
        '<div class="stack">' +
          '<h2>' + escapeHtml(skill.metadata.name || skill.slug) + '</h2>' +
          '<p class="small">' + escapeHtml(skill.skillMdPath) + '</p>' +
          '<textarea id="skillContent">' + escapeHtml(skill.content || "") + '</textarea>' +
          '<div class="toolbar">' +
            '<button id="saveSkillBtn">保存 SKILL.md</button>' +
            '<button class="secondary" id="saveAndSyncBtn">保存并同步插件包</button>' +
          '</div>' +
        '</div>';
      $("#saveSkillBtn").onclick = () => saveSkill(false);
      $("#saveAndSyncBtn").onclick = () => saveSkill(true);
    }

    async function saveSkill(shouldSync) {
      const payload = await api("/api/save-skill", {
        method: "POST",
        body: JSON.stringify({
          skillMdPath: selected.id,
          content: $("#skillContent").value
        })
      });
      state = payload.state;
      if (shouldSync) {
        const syncPayload = await api("/api/sync", { method: "POST", body: "{}" });
        state = syncPayload.state;
      }
      render();
    }

    $("#refreshBtn").onclick = load;
    $("#syncBtn").onclick = async () => {
      const payload = await api("/api/sync", { method: "POST", body: "{}" });
      state = payload.state;
      render();
    };

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char]));
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(/\n/g, " ");
    }

    load().catch((error) => {
      $("#detail").innerHTML = '<p class="small">加载失败：' + escapeHtml(error.message) + '</p>';
    });
  </script>
</body>
</html>`;

if (process.argv.includes("--check")) {
  const result = await validateRepository();
  for (const check of result.checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.label}${check.detail ? ` (${check.detail})` : ""}`);
  }
  process.exit(result.ok ? 0 : 1);
}

createServer(route).listen(port, host, () => {
  console.log(`Slash Skills Admin running at http://${host}:${port}`);
});
