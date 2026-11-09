#!/usr/bin/env node
// Checks this repo without spending anything or needing a key:
//   1. Each SKILL.md follows the Agent Skills format (https://agentskills.io/specification).
//   2. Every manifest parses, and they all carry the same name and version.
//   3. The layo skill matches Layo's public API contract: its MCP tools, endpoints, paid operations, error codes and
//      Generation states.
//
// Usage: node scripts/check.mjs [openapi.json path or URL]
// The default contract is https://docs.layo.co/openapi.json.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const plugin = join(root, "plugins", "layo");
const problems = [];
const fail = message => problems.push(message);

// --- 1. Skill format -------------------------------------------------------------------------------------------------

function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return fail(`${file}: no YAML frontmatter`), null;
  const fields = {};
  let parent = null;
  for (const line of match[1].split("\n")) {
    const nested = line.match(/^ {2}([\w-]+):\s*(.*)$/);
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (nested && parent) fields[parent][nested[1]] = unquote(nested[2]);
    else if (top) {
      parent = top[2] === "" ? top[1] : null;
      fields[top[1]] = top[2] === "" ? {} : unquote(top[2]);
    }
  }
  return { fields, body: match[2] };
}
const unquote = value => value.replace(/^"(.*)"$/, "$1");

const skillsDir = join(plugin, "skills");
const skills = {};
for (const dir of readdirSync(skillsDir)) {
  const file = join(skillsDir, dir, "SKILL.md");
  if (!existsSync(file)) { fail(`${dir}: no SKILL.md`); continue; }
  const parsed = frontmatter(file);
  if (!parsed) continue;
  const { name, description, compatibility } = parsed.fields;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? "") || name.length > 64) fail(`${dir}: invalid name "${name}"`);
  if (name !== dir) fail(`${dir}: name "${name}" must match its folder`);
  if (!description || description.length > 1024) fail(`${dir}: description must be 1-1024 characters`);
  if (compatibility && compatibility.length > 500) fail(`${dir}: compatibility must be at most 500 characters`);
  if (parsed.body.split("\n").length > 500) fail(`${dir}: keep SKILL.md under 500 lines`);
  skills[dir] = parsed;
}
if (!skills.layo) fail("the layo skill is missing");

// --- 2. Manifests ----------------------------------------------------------------------------------------------------

const json = path => {
  try { return JSON.parse(readFileSync(join(root, path), "utf8")); }
  catch (error) { fail(`${path}: ${error.message}`); return {}; }
};
const manifests = {
  "plugins/layo/plugin.json": json("plugins/layo/plugin.json"),
  "plugins/layo/.claude-plugin/plugin.json": json("plugins/layo/.claude-plugin/plugin.json"),
  "plugins/layo/.cursor-plugin/plugin.json": json("plugins/layo/.cursor-plugin/plugin.json"),
};
const marketplaces = {
  ".claude-plugin/marketplace.json": json(".claude-plugin/marketplace.json"),
  ".cursor-plugin/marketplace.json": json(".cursor-plugin/marketplace.json"),
  ".agents/plugins/marketplace.json": json(".agents/plugins/marketplace.json"),
};
json("plugins/layo/mcp.json");
json("plugins/layo/.mcp.json");

const version = manifests["plugins/layo/plugin.json"].version;
for (const [path, manifest] of Object.entries(manifests)) {
  if (manifest.name !== "layo") fail(`${path}: name should be "layo"`);
  if (manifest.version !== version) fail(`${path}: version ${manifest.version} differs from ${version}`);
}
for (const [path, marketplace] of Object.entries(marketplaces)) {
  if (!marketplace.plugins?.some(entry => entry.name === "layo")) fail(`${path}: no "layo" plugin entry`);
}
const claudeEntry = marketplaces[".claude-plugin/marketplace.json"].plugins?.find(entry => entry.name === "layo");
if (claudeEntry?.version && claudeEntry.version !== version) fail(`Claude marketplace entry version differs from ${version}`);
if (skills.layo && skills.layo.fields.metadata?.version !== version) fail(`layo SKILL.md metadata.version differs from ${version}`);

// No credentials anywhere in the repo's text files.
const secretLike = /(Bearer\s+(?!\$)[A-Za-z0-9._-]{20,})|((sk|pk|rk)_(live|test)_[A-Za-z0-9]{10,})/;
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.name === ".git" || entry.name === "node_modules" ? [] :
  entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
for (const file of walk(root)) {
  if (!/\.(md|json|mjs|js|ts|txt|ya?ml)$/.test(file) || basename(file) === "check.mjs") continue;
  if (secretLike.test(readFileSync(file, "utf8"))) fail(`${file}: looks like it contains a credential`);
}

// --- 3. The layo skill against the API contract ----------------------------------------------------------------------

const source = process.argv[2] ?? "https://docs.layo.co/openapi.json";
const contract = /^https?:/.test(source)
  ? await (await fetch(source)).json()
  : JSON.parse(readFileSync(source, "utf8"));

if (skills.layo) {
  const body = skills.layo.body;
  const operations = Object.entries(contract.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({ method: method.toUpperCase(), path, operation })));
  const shape = path => path.replace(/\{[^}]+\}/g, "{}");

  // Every tool and endpoint the contract offers is in the skill, and the skill names nothing else.
  const tools = new Set(operations.map(o => o["operation"]["x-mcp-tool"]).filter(Boolean));
  for (const tool of tools) if (!body.includes(`\`${tool}\``)) fail(`skill doesn't mention MCP tool ${tool}`);
  const table = body.split("\n").filter(line => line.startsWith("| ") && /`(GET|POST) /.test(line));
  for (const line of table) {
    for (const [, tool] of line.split("|")[2].matchAll(/`([a-z_]+)`/g)) {
      if (!tools.has(tool)) fail(`skill names MCP tool ${tool}, which the API doesn't have`);
    }
    for (const [, method, path] of line.matchAll(/`(GET|POST) (\/v1\/[^`]+)`/g)) {
      if (!operations.some(o => o.method === method && shape(o.path) === shape(path))) {
        fail(`skill names ${method} ${path}, which the API doesn't have`);
      }
    }
  }
  for (const { method, path } of operations) {
    if (!table.some(line => line.split("`").some(part => part === `${method} ${path}` ||
      shape(part) === shape(`${method} ${path}`)))) fail(`skill's table is missing ${method} ${path}`);
  }

  // The "Spends credits" column matches the contract's paid operations.
  for (const { operation } of operations) {
    const tool = operation["x-mcp-tool"];
    const row = table.find(line => line.split("|")[2].includes(`\`${tool}\``));
    if (!row) continue;
    const paid = row.trim().endsWith("**yes** |");
    if (paid !== Boolean(operation["x-paid"])) fail(`${tool}: skill says paid=${paid}, the API says ${Boolean(operation["x-paid"])}`);
  }

  // Every error code is explained, and the skill explains no others.
  const codes = new Set(operations.flatMap(o => Object.values(o.operation.responses ?? {}))
    .flatMap(response => (response["x-errors"] ?? []).map(error => error.code)));
  const errorSection = body.split("## Errors")[1]?.split("\n## ")[0] ?? "";
  const explained = new Set([...errorSection.matchAll(/^\| `([a-z_]+)` \|/gm)].map(match => match[1]));
  for (const code of codes) if (!explained.has(code)) fail(`skill doesn't explain error ${code}`);
  for (const code of explained) if (!codes.has(code)) fail(`skill explains error ${code}, which the API doesn't return`);

  // Generation states and failure reasons.
  const generation = contract.components.schemas.Generation.properties;
  for (const state of generation.state.enum) if (!body.includes(`\`${state}\``)) fail(`skill doesn't mention state ${state}`);
  const reasons = generation.failure.anyOf.find(option => option.enum)?.enum ?? [];
  for (const reason of reasons) if (!body.includes(`\`${reason}\``)) fail(`skill doesn't mention failure ${reason}`);

  // Scopes named in the skill exist.
  const scopes = new Set(operations.flatMap(o => (o.operation.security ?? []).flatMap(rule => Object.values(rule).flat())));
  for (const scope of scopes) if (!body.includes(`\`${scope}\``)) fail(`skill doesn't mention the ${scope} scope`);
}

if (problems.length) {
  console.error(problems.map(problem => `✘ ${problem}`).join("\n"));
  process.exit(1);
}
console.log(`✔ ${Object.keys(skills).length} skill(s), ${Object.keys(manifests).length} manifests and ${Object.keys(marketplaces).length} marketplaces check out against ${source}`);
