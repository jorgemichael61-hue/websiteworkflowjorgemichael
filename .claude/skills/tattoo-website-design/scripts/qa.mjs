#!/usr/bin/env node
// QA para sites de tatuagem — screenshots + verificações automáticas.
// Uso:  node qa.mjs <url> [pasta-saida] [--stub-external]
//   --stub-external  troca imagens de outros domínios por um placeholder cinzento
//                    (útil sem internet; o layout é testado, as fotos não).
// Requer: npm i -D playwright && npx playwright install chromium

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const outDir = args.filter((a) => !a.startsWith("--"))[1] || "qa-output";
const stubExternal = args.includes("--stub-external");
if (!url) {
  console.error("Uso: node qa.mjs <url> [pasta-saida] [--stub-external]");
  process.exit(1);
}

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];
// PNG 1x1 cinzento para --stub-external
const GREY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN89+7dfwAI1gOuGGB6xQAAAABJRU5ErkJggg==",
  "base64"
);

await mkdir(outDir, { recursive: true });
const origin = new URL(url).origin;
const browser = await chromium.launch();
const report = { url, date: new Date().toISOString(), viewports: {} };

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  const failed = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => consoleMsgs.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

  if (stubExternal) {
    await page.route("**/*", (route) => {
      const req = route.request();
      if (!req.url().startsWith(origin) && req.resourceType() === "image") {
        return route.fulfill({ status: 200, contentType: "image/png", body: GREY_PNG });
      }
      if (!req.url().startsWith(origin) && !req.url().startsWith("data:")) return route.abort();
      return route.continue();
    });
  }

  await page.goto(url, { waitUntil: "networkidle" });
  // Rolar até ao fim para disparar lazy-loading e animações de entrada
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);

  const checks = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 1 && r.height > 1 && r.right > 0 && r.left < document.documentElement.clientWidth
        && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0" && !el.closest("[aria-hidden='true'], [hidden], dialog:not([open])");
    };
    const imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute("alt")).map((i) => i.currentSrc || i.src);
    const imgsNoSize = [...document.images].filter((i) => !i.getAttribute("width") && getComputedStyle(i).aspectRatio === "auto").map((i) => i.currentSrc || i.src).slice(0, 20);
    const smallTargets = [...document.querySelectorAll("a, button, input, select, textarea, summary")]
      .filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; })
      .filter((el) => !(el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p, li")))
      .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`).slice(0, 20);
    const emptyLinks = [...document.querySelectorAll('a[href="#"], a:not([href])')].map((a) => a.textContent.trim().slice(0, 30));
    const ids = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
    const brokenAnchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href").slice(1)).filter((id) => id && !ids.has(id));
    const unlabeled = [...document.querySelectorAll("input, select, textarea")].filter((f) => f.type !== "hidden" && !f.closest("[aria-hidden='true']") && !f.labels?.length && !f.getAttribute("aria-label") && !f.getAttribute("aria-labelledby")).map((f) => f.name || f.id);
    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content || null,
      lang: document.documentElement.lang || null,
      h1Count: document.querySelectorAll("h1").length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      imgsNoAlt, imgsNoSize, smallTargets, emptyLinks, brokenAnchors, unlabeled,
      internalLinks: [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin) && !h.includes("#")),
    };
  });

  const shot = path.join(outDir, `${vp.name}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  await page.screenshot({ path: path.join(outDir, `${vp.name}-fold.png`) });
  report.viewports[vp.name] = { ...checks, console: consoleMsgs, failedRequests: [...new Set(failed)] };
  await ctx.close();
}

// Links internos partidos (verificados uma vez)
const links = [...new Set(Object.values(report.viewports).flatMap((v) => v.internalLinks))];
const ctx = await browser.newContext();
report.brokenInternalLinks = [];
for (const l of links) {
  try { const r = await ctx.request.get(l); if (r.status() >= 400) report.brokenInternalLinks.push(`${r.status()} ${l}`); }
  catch (e) { report.brokenInternalLinks.push(`ERR ${l}`); }
}
await browser.close();
for (const v of Object.values(report.viewports)) delete v.internalLinks;

await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

// Resumo legível
const d = report.viewports.desktop;
const problems = [];
if (!d.title) problems.push("Sem <title>");
if (!d.metaDescription) problems.push("Sem meta description");
if (!d.lang) problems.push("Sem lang no <html>");
if (d.h1Count !== 1) problems.push(`h1 encontrados: ${d.h1Count} (deve ser 1)`);
for (const [name, v] of Object.entries(report.viewports)) {
  if (v.horizontalOverflow) problems.push(`[${name}] scroll horizontal`);
  if (v.console.length) problems.push(`[${name}] consola: ${v.console.length} → ${v.console.slice(0, 3).join(" | ")}`);
  if (v.failedRequests.length) problems.push(`[${name}] pedidos falhados: ${v.failedRequests.length} → ${v.failedRequests.slice(0, 3).join(" | ")}`);
  if (v.imgsNoAlt.length) problems.push(`[${name}] imagens sem alt: ${v.imgsNoAlt.length}`);
  if (v.smallTargets.length) problems.push(`[${name}] alvos de toque < 24px: ${v.smallTargets.join(", ")}`);
  if (v.emptyLinks.length) problems.push(`[${name}] links vazios/#: ${v.emptyLinks.length}`);
  if (v.brokenAnchors.length) problems.push(`[${name}] âncoras sem destino: ${v.brokenAnchors.join(", ")}`);
  if (v.unlabeled.length) problems.push(`[${name}] campos sem label: ${v.unlabeled.join(", ")}`);
}
if (report.brokenInternalLinks.length) problems.push(`Links internos partidos: ${report.brokenInternalLinks.join(", ")}`);

console.log(`\nQA ${url}\nScreenshots e report.json em: ${outDir}`);
console.log(problems.length ? `\n${problems.length} problema(s):\n- ${problems.join("\n- ")}` : "\nSem problemas automáticos. Agora revê os screenshots à mão.");
process.exitCode = problems.length ? 1 : 0;
