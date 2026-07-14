import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  checkLinks,
  createAuditSession,
  generateAiNarrative,
  getPublicConfig,
  runScan,
  translateAuditReport
} from "./lib/api";
import {
  buildAiEvidence,
  buildAuditReport,
  rebuildReportWithLinks,
  selectLinkDestinations
} from "./lib/audit";
import { exportJson, exportText, printReport } from "./lib/export";
import type {
  AiNarrative,
  AuditFormData,
  AuditReport,
  DailyUsage,
  Finding,
  PageSpeedDevice,
  PublicConfig,
  ScanResponse,
  Severity,
  TranslatedReportContent
} from "./types";

const DEFAULT_FORM: AuditFormData = {
  url: "",
  primaryKeyword: "",
  secondaryKeyword: "",
  country: "United States",
  pageLanguage: "English",
  pageType: "Article",
  evidenceMode: "auto"
};

const ENGLISH_LABELS = {
  caseOverview: "Case overview",
  articleIntelligence: "Article intelligence",
  simpleAuditResult: "Simple audit result",
  actionPlan: "Forensic action plan",
  performance: "Mobile and desktop performance",
  discovery: "Robots and sitemap evidence",
  links: "Link evidence ledger",
  aiNarrative: "Evidence-grounded consultant narrative",
  disclaimer: "Disclaimer"
};

const DISCLAIMER =
  "Auditicle provides automated diagnostic and educational information based on publicly accessible evidence and available third-party data. Results do not guarantee indexing, rankings, traffic, rich results, Core Web Vitals outcomes, AI Overview visibility, or citation by an AI system. Items labeled “Analysis by Auditicle” are internal interpretations and recommendations, not direct measurements or statements from Google. Review all technical, editorial, accessibility, legal, and business-critical changes before implementation.";


const REPORT_UI: Record<string, string> = {
  "nav.caseOverview": "Case overview",
  "nav.articleIntelligence": "Article intelligence",
  "nav.simpleAuditResult": "Simple audit result",
  "nav.actionPlan": "Forensic action plan",
  "nav.performance": "Mobile and desktop performance",
  "nav.discovery": "Robots and sitemap evidence",
  "nav.links": "Link evidence ledger",
  "nav.aiNarrative": "Evidence-grounded consultant narrative",
  "nav.disclaimer": "Disclaimer",
  "nav.contents": "CASE CONTENTS", "nav.viewing": "Viewing section", "nav.caseSummary": "↑ Case summary",
  "case.consultingAudit": "Consulting-grade single-page audit",
  "case.platform": "Platform",
  "case.renderedBrowser": "Rendered browser",
  "case.serverHtml": "Server HTML",
  "score.withheld": "withheld",
  "score.provisional": "provisional",
  "toolbar.writing": "Writing…",
  "toolbar.consultantNarrative": "Consultant narrative",
  "toolbar.translating": "Translating…",
  "toolbar.translate": "Translate",
  "toolbar.english": "English",
  "toolbar.newCase": "New case",
  "translation.sourceTitle": "English is the source report.",
  "translation.sourceNote": "Translation changes presentation only. Scores, severity, evidence, URLs and measurements remain unchanged.",
  "render.mode": "EVIDENCE MODE",
  "render.javascript": "JavaScript-rendered browser",
  "render.server": "Server-delivered HTML",
  "render.browserStatus": "BROWSER STATUS",
  "render.success": "Rendered successfully",
  "render.fallback": "Fallback used",
  "render.notRequired": "Not required",
  "render.autoDetected": "Auto mode detected a JavaScript-heavy page.",
  "render.noLimitation": "No additional rendering limitation recorded.",
  "render.renderedBytes": "Rendered {rendered} bytes after acquiring {server} bytes of server HTML.",
  "render.serverBytes": "{server} bytes acquired without browser rendering.",
  "integrity.final": "Evidence integrity protocol",
  "integrity.provisional": "Provisional score",
  "integrity.withheld": "Score withheld",
  "integrity.finalText": "Direct evidence and Auditicle interpretation remain separate. Rule set {ruleSet}.",
  "integrity.provisionalText": "Evidence coverage or rendering limitations require cautious interpretation.",
  "integrity.withheldText": "Evidence coverage is below 60%; Auditicle will not present a definitive score.",
  "integrity.coverage": "coverage",
  "limitations.title": "Evidence limitations",
  "article.kicker": "00 / ARTICLE INTELLIGENCE",
  "article.description": "Five evidence-based diagnostic views. These are readiness scores, not predicted rankings or AI citations.",
  "article.foundation": "FOUNDATION",
  "article.strengths": "Strengths",
  "article.gaps": "Gaps",
  "article.noneConfirmed": "None confirmed.",
  "article.noMaterialGap": "No material gap detected.",
  "article.crawlerEvidence": "AI crawler evidence",
  "article.crawlerDescription": "Search discovery, user retrieval and training controls are shown separately.",
  "crawler.searchDiscovery": "Search discovery",
  "crawler.userRetrieval": "User retrieval",
  "crawler.training": "Training control",
  "crawler.allowed": "Allowed",
  "crawler.blocked": "Blocked",
  "crawler.noRule": "No restrictive rule matched",
  "decision.allowed": "Allowed", "decision.disallowed": "Disallowed", "decision.unavailable": "Unavailable", "decision.unreachable": "Unreachable",
  "summary.critical": "Critical",
  "summary.warnings": "Warnings",
  "summary.notices": "Notices",
  "summary.information": "Information",
  "summary.checkedLinks": "Checked links",
  "findings.kicker": "01 / RESULT TABLE",
  "findings.description": "Confirmed evidence first, written for technical and non-technical reviewers.",
  "findings.area": "Area",
  "findings.status": "Status",
  "findings.found": "What Auditicle found",
  "findings.why": "Why it matters",
  "findings.action": "Recommended action",
  "severity.critical": "critical",
  "severity.warning": "warning",
  "severity.notice": "notice",
  "severity.info": "information",
  "severity.pass": "pass",
  "actions.kicker": "02 / PRIORITY LEDGER",
  "actions.impact": "Impact",
  "actions.effort": "Effort",
  "actions.owner": "Owner",
  "actions.recommended": "Recommended action",
  "actions.validate": "Validate",
  "impact.high": "High",
  "impact.medium": "Medium",
  "impact.low": "Low",
  "effort.high": "High",
  "effort.medium": "Medium",
  "effort.low": "Low",
  "performance.kicker": "03 / LAB EVIDENCE",
  "performance.description": "Mobile is the primary performance reference. Desktop is a comparison.",
  "performance.laboratory": "laboratory",
  "performance.lighthouse": "Lighthouse evidence",
  "performance.dataUnavailable": "Data unavailable",
  "performance.potential": "Potential {ms} ms",
  "performance.verifiedOpportunity": "Verified audit opportunity",
  "discovery.kicker": "04 / DISCOVERY",
  "discovery.fetched": "Fetched",
  "discovery.unavailable": "Unavailable",
  "discovery.crawlDecision": "Crawl decision",
  "discovery.matchedAgent": "Matched user agent",
  "discovery.matchedRule": "Matched rule",
  "discovery.declaredSitemaps": "Declared sitemaps",
  "discovery.groups": "Parsed user-agent groups",
  "discovery.noGroup": "No matching group",
  "discovery.noRule": "No restrictive rule",
  "discovery.openSource": "Open evidence source",
  "discovery.sitemaps": "Sitemaps",
  "discovery.collected": "Evidence collected",
  "links.kicker": "05 / DESTINATION CHECKS",
  "links.description": "Only destinations actually checked are classified as working or broken.",
  "links.destination": "Destination",
  "links.outcome": "Outcome",
  "links.http": "HTTP",
  "links.finalUrl": "Final URL",
  "links.noLinks": "No link destinations were available for checking.",
  "outcome.working": "working",
  "outcome.redirect": "redirect",
  "outcome.client-error": "client error",
  "outcome.server-error": "server error",
  "outcome.timeout": "timeout",
  "outcome.unavailable": "unavailable",
  "ai.kicker": "06 / ANALYSIS BY AUDITICLE",
  "ai.deterministicFallback": "Deterministic rule-set fallback",
  "ai.configuredFallback": "Configured provider fallback",
  "ai.primaryProvider": "Primary configured provider",
  "ai.strengths": "Strengths",
  "ai.gaps": "Gaps",
  "ai.optimizationActions": "Optimization actions",
  "ai.roadmap": "Priority optimization roadmap",
  "ai.findings": "Findings",
  "ai.expectedChange": "Expected evidence change",
  "ai.validate": "Validate",
  "ai.fix": "Fix",
  "disclaimer.accessibility": "Accessibility",
  "disclaimer.accessibilityText": "Automated diagnostics are not a WCAG conformance certification. Manual keyboard, screen-reader, cognitive and real-user testing remain necessary."
};

const INDONESIAN_REPORT_UI: Record<string, string> = {
  "nav.caseOverview": "Ringkasan kasus", "nav.articleIntelligence": "Intelijen artikel", "nav.simpleAuditResult": "Hasil audit sederhana", "nav.actionPlan": "Rencana tindakan forensik", "nav.performance": "Performa mobile dan desktop", "nav.discovery": "Bukti robots dan sitemap", "nav.links": "Buku besar bukti tautan", "nav.aiNarrative": "Narasi konsultan berbasis bukti", "nav.disclaimer": "Penafian",
  "nav.contents": "ISI KASUS", "nav.viewing": "Melihat bagian", "nav.caseSummary": "↑ Ringkasan kasus",
  "case.consultingAudit": "Audit satu halaman tingkat konsultasi", "case.platform": "Platform", "case.renderedBrowser": "Browser ter-render", "case.serverHtml": "HTML server", "score.withheld": "ditahan", "score.provisional": "provisional",
  "toolbar.writing": "Menyusun…", "toolbar.consultantNarrative": "Narasi konsultan", "toolbar.translating": "Menerjemahkan…", "toolbar.translate": "Terjemahkan", "toolbar.english": "Bahasa Inggris", "toolbar.newCase": "Kasus baru",
  "translation.sourceTitle": "Bahasa Inggris adalah laporan sumber.", "translation.sourceNote": "Terjemahan hanya mengubah penyajian. Skor, tingkat keparahan, bukti, URL, dan pengukuran tetap sama.",
  "render.mode": "MODE BUKTI", "render.javascript": "Browser dengan JavaScript ter-render", "render.server": "HTML yang dikirim server", "render.browserStatus": "STATUS BROWSER", "render.success": "Render berhasil", "render.fallback": "Fallback digunakan", "render.notRequired": "Tidak diperlukan", "render.autoDetected": "Mode Auto mendeteksi halaman yang sangat bergantung pada JavaScript.", "render.noLimitation": "Tidak ada keterbatasan rendering tambahan yang tercatat.", "render.renderedBytes": "Merender {rendered} byte setelah memperoleh {server} byte HTML server.", "render.serverBytes": "{server} byte diperoleh tanpa rendering browser.",
  "integrity.final": "Protokol integritas bukti", "integrity.provisional": "Skor provisional", "integrity.withheld": "Skor ditahan", "integrity.finalText": "Bukti langsung dan interpretasi Auditicle tetap dipisahkan. Rule set {ruleSet}.", "integrity.provisionalText": "Cakupan bukti atau keterbatasan rendering memerlukan interpretasi yang hati-hati.", "integrity.withheldText": "Cakupan bukti di bawah 60%; Auditicle tidak akan menampilkan skor definitif.", "integrity.coverage": "cakupan", "limitations.title": "Keterbatasan bukti",
  "article.kicker": "00 / INTELIJEN ARTIKEL", "article.description": "Lima pandangan diagnostik berbasis bukti. Ini adalah skor kesiapan, bukan prediksi peringkat atau sitasi AI.", "article.foundation": "FONDASI", "article.strengths": "Kekuatan", "article.gaps": "Kesenjangan", "article.noneConfirmed": "Belum ada yang terkonfirmasi.", "article.noMaterialGap": "Tidak ada kesenjangan material yang terdeteksi.", "article.crawlerEvidence": "Bukti crawler AI", "article.crawlerDescription": "Penemuan pencarian, pengambilan pengguna, dan kontrol pelatihan ditampilkan secara terpisah.",
  "crawler.searchDiscovery": "Penemuan pencarian", "crawler.userRetrieval": "Pengambilan pengguna", "crawler.training": "Kontrol pelatihan", "crawler.allowed": "Diizinkan", "crawler.blocked": "Diblokir", "crawler.noRule": "Tidak ada aturan pembatas yang cocok",
  "decision.allowed": "Diizinkan", "decision.disallowed": "Dilarang", "decision.unavailable": "Tidak tersedia", "decision.unreachable": "Tidak dapat dijangkau",
  "summary.critical": "Kritis", "summary.warnings": "Peringatan", "summary.notices": "Catatan", "summary.information": "Informasi", "summary.checkedLinks": "Tautan diperiksa",
  "findings.kicker": "01 / TABEL HASIL", "findings.description": "Bukti terkonfirmasi terlebih dahulu, ditulis untuk peninjau teknis dan nonteknis.", "findings.area": "Area", "findings.status": "Status", "findings.found": "Temuan Auditicle", "findings.why": "Mengapa ini penting", "findings.action": "Tindakan yang direkomendasikan",
  "severity.critical": "kritis", "severity.warning": "peringatan", "severity.notice": "catatan", "severity.info": "informasi", "severity.pass": "lulus",
  "actions.kicker": "02 / BUKU BESAR PRIORITAS", "actions.impact": "Dampak", "actions.effort": "Upaya", "actions.owner": "Penanggung jawab", "actions.recommended": "Tindakan yang direkomendasikan", "actions.validate": "Validasi", "impact.high": "Tinggi", "impact.medium": "Sedang", "impact.low": "Rendah", "effort.high": "Tinggi", "effort.medium": "Sedang", "effort.low": "Rendah",
  "performance.kicker": "03 / BUKTI LAB", "performance.description": "Mobile adalah referensi performa utama. Desktop menjadi pembanding.", "performance.laboratory": "laboratorium", "performance.lighthouse": "Bukti Lighthouse", "performance.dataUnavailable": "Data tidak tersedia", "performance.potential": "Potensi {ms} ms", "performance.verifiedOpportunity": "Peluang audit terverifikasi",
  "discovery.kicker": "04 / PENEMUAN", "discovery.fetched": "Berhasil diambil", "discovery.unavailable": "Tidak tersedia", "discovery.crawlDecision": "Keputusan crawl", "discovery.matchedAgent": "User agent yang cocok", "discovery.matchedRule": "Aturan yang cocok", "discovery.declaredSitemaps": "Sitemap yang dideklarasikan", "discovery.groups": "Grup user-agent yang diurai", "discovery.noGroup": "Tidak ada grup yang cocok", "discovery.noRule": "Tidak ada aturan pembatas", "discovery.openSource": "Buka sumber bukti", "discovery.sitemaps": "Sitemap", "discovery.collected": "Bukti dikumpulkan",
  "links.kicker": "05 / PEMERIKSAAN TUJUAN", "links.description": "Hanya tujuan yang benar-benar diperiksa yang diklasifikasikan berfungsi atau rusak.", "links.destination": "Tujuan", "links.outcome": "Hasil", "links.http": "HTTP", "links.finalUrl": "URL akhir", "links.noLinks": "Tidak ada tujuan tautan yang tersedia untuk diperiksa.", "outcome.working": "berfungsi", "outcome.redirect": "pengalihan", "outcome.client-error": "kesalahan klien", "outcome.server-error": "kesalahan server", "outcome.timeout": "waktu habis", "outcome.unavailable": "tidak tersedia",
  "ai.kicker": "06 / ANALISIS OLEH AUDITICLE", "ai.deterministicFallback": "Fallback rule-set deterministik", "ai.configuredFallback": "Fallback provider terkonfigurasi", "ai.primaryProvider": "Provider utama terkonfigurasi", "ai.strengths": "Kekuatan", "ai.gaps": "Kesenjangan", "ai.optimizationActions": "Tindakan optimasi", "ai.roadmap": "Peta jalan optimasi prioritas", "ai.findings": "Temuan", "ai.expectedChange": "Perubahan bukti yang diharapkan", "ai.validate": "Validasi", "ai.fix": "Perbaikan",
  "disclaimer.accessibility": "Aksesibilitas", "disclaimer.accessibilityText": "Diagnostik otomatis bukan sertifikasi kesesuaian WCAG. Pengujian manual dengan keyboard, pembaca layar, aspek kognitif, dan pengguna nyata tetap diperlukan."
};

function formatUi(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template);
}

type ThemeMode = "system" | "dark" | "light";

const RETRYABLE_ERROR_CODES = new Set(["NETWORK_INTERRUPTED", "TARGET_TIMEOUT", "TARGET_NETWORK_ERROR", "TARGET_RATE_LIMITED", "TARGET_SERVER_ERROR", "ROBOTS_UNREACHABLE", "BOT_CHALLENGE"]);

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    shield: <><path d="M12 3 5 6v5c0 5 3.3 8.4 7 10 3.7-1.6 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
    file: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 13h6M9 17h6M9 9h2"/></>,
    scan: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M8 12h8M12 8v8"/></>,
    pulse: <><path d="M3 12h4l2-5 4 10 2-5h6"/></>,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8"/><path d="M4 3v5h5"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    alert: <><path d="M12 3 2.7 20h18.6L12 3Z"/><path d="M12 9v4M12 17h.01"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></>,
    message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.8 6.8 0 0 0 21 12.8Z"/>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function ThemeSelector({ mode, onChange }: { mode: ThemeMode; onChange: (mode: ThemeMode) => void }) {
  const options: Array<{ mode: ThemeMode; label: string; icon: string }> = [
    { mode: "system", label: "System", icon: "monitor" },
    { mode: "dark", label: "Dark", icon: "moon" },
    { mode: "light", label: "Light", icon: "sun" }
  ];
  return <div className="app-theme-control" role="group" aria-label="Color theme">{options.map(option => <button key={option.mode} type="button" className={mode === option.mode ? "is-active" : ""} aria-pressed={mode === option.mode} onClick={() => onChange(option.mode)} title={`${option.label} theme`}><Icon name={option.icon} size={15}/><span>{option.label}</span></button>)}</div>;
}

function TurnstileBox({ config, onToken }: { config: PublicConfig | null; onToken: (token: string) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!config?.turnstileRequired || !config.turnstileSiteKey) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !boxRef.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(boxRef.current, {
        sitekey: config.turnstileSiteKey,
        theme: "auto",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken("")
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src*="turnstile/v0/api.js"]');
    if (existing) {
      const interval = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(interval);
          render();
        }
      }, 100);
      return () => { cancelled = true; window.clearInterval(interval); };
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
    return () => { cancelled = true; };
  }, [config, onToken]);

  if (!config?.turnstileRequired) {
    return <div className="security-ready"><Icon name="shield" size={18}/> Security check is optional in this deployment.</div>;
  }
  return <div className="turnstile-wrap"><div ref={boxRef}/></div>;
}

function ScoreRing({ value, status, ui }: { value: number; status: AuditReport["scoreStatus"]; ui: Record<string, string> }) {
  const visibleValue = status === "withheld" ? 0 : value;
  const label = status === "withheld" ? ui["score.withheld"] : status === "provisional" ? ui["score.provisional"] : "/100";
  return <div className={`score-ring score-${status}`} style={{ "--score": `${visibleValue * 3.6}deg` } as React.CSSProperties}><div><strong>{status === "withheld" ? "—" : value}</strong><span>{label}</span></div></div>;
}

function SeverityBadge({ value, ui }: { value: Severity; ui: Record<string, string> }) {
  return <span className={`severity severity-${value}`}>{ui[`severity.${value}`] || value}</span>;
}

function Metric({ label, value, unavailable }: { label: string; value: string | number | null; unavailable: string }) {
  return <div className="metric"><span>{label}</span><strong>{value === null ? unavailable : value}</strong></div>;
}

function formatMs(value: number | null) {
  if (value === null) return null;
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

type TranslatedDevice = NonNullable<NonNullable<TranslatedReportContent["performance"]>["mobile"]>;

function DevicePanel({ data, translated, ui }: { data: PageSpeedDevice; translated?: TranslatedDevice; ui: Record<string, string> }) {
  const translatedById = new Map((translated?.opportunities || []).map(item => [item.id, item]));
  return <div className="evidence-card device-panel"><div className="card-head"><div><span className="label">{data.strategy} {ui["performance.laboratory"]}</span><h3>{data.available ? ui["performance.lighthouse"] : ui["performance.dataUnavailable"]}</h3></div><strong className="device-score">{data.performance === null ? "—" : Math.round(data.performance * 100)}</strong></div>{data.available ? <><div className="metric-grid compact"><Metric label="LCP" value={formatMs(data.metrics.lcp)} unavailable={ui["performance.dataUnavailable"]}/><Metric label="FCP" value={formatMs(data.metrics.fcp)} unavailable={ui["performance.dataUnavailable"]}/><Metric label="TBT" value={formatMs(data.metrics.tbt)} unavailable={ui["performance.dataUnavailable"]}/><Metric label="CLS" value={data.metrics.cls === null ? null : data.metrics.cls.toFixed(3)} unavailable={ui["performance.dataUnavailable"]}/></div>{data.opportunities.length > 0 && <div className="opportunity-list">{data.opportunities.slice(0,4).map(item=>{const copy=translatedById.get(item.id);return <div key={item.id}><span>{copy?.title || item.title}</span>{copy?.description && <p>{copy.description}</p>}<small>{item.savingsMs ? formatUi(ui["performance.potential"],{ms:Math.round(item.savingsMs)}) : ui["performance.verifiedOpportunity"]}</small></div>;})}</div>}</> : <p className="muted">{translated?.error || data.error || ui["performance.dataUnavailable"]}</p>}</div>;
}

function FindingTable({ findings, ui }: { findings: Finding[]; ui: Record<string, string> }) {
  return <div className="table-shell finding-table"><table><thead><tr><th>{ui["findings.area"]}</th><th>{ui["findings.status"]}</th><th>{ui["findings.found"]}</th><th>{ui["findings.why"]}</th><th>{ui["findings.action"]}</th></tr></thead><tbody>{findings.map(item=><tr key={item.id}><td data-label={ui["findings.area"]}><strong>{item.area}</strong><small>{item.title}</small></td><td data-label={ui["findings.status"]}><SeverityBadge value={item.severity} ui={ui}/></td><td data-label={ui["findings.found"]}>{item.found}</td><td data-label={ui["findings.why"]}>{item.why}</td><td data-label={ui["findings.action"]}>{item.action}</td></tr>)}</tbody></table></div>;
}

function FindingsCards({ findings, ui }: { findings: Finding[]; ui: Record<string, string> }) {
  return <div className="finding-cards">{findings.filter(item=>item.severity!=="pass").map((item,index)=><article className="finding-card" key={item.id}><div className="finding-index">{String(index+1).padStart(2,"0")}</div><div className="finding-body"><div className="finding-title"><SeverityBadge value={item.severity} ui={ui}/><h3>{item.title}</h3></div><p>{item.found}</p><div className="action-strip"><span>{ui["actions.impact"]}<b>{ui[`impact.${item.impact.toLowerCase()}`] || item.impact}</b></span><span>{ui["actions.effort"]}<b>{ui[`effort.${item.effort.toLowerCase()}`] || item.effort}</b></span><span>{ui["actions.owner"]}<b>{item.owner}</b></span></div><div className="recommendation"><strong>{ui["actions.recommended"]}</strong><p>{item.action}</p><small>{ui["actions.validate"]}: {item.validation}</small></div></div></article>)}</div>;
}

function ArticleIntelligencePanel({ report, translated, ui }: { report: AuditReport; translated: TranslatedReportContent | null; ui: Record<string, string> }) {
  const translatedByKey = new Map((translated?.articleIntelligence?.dimensions || []).map(item => [item.key, item]));
  const dimensions = report.articleIntelligence.dimensions.map(item => ({ ...item, ...(translatedByKey.get(item.key) || {}) }));
  const methodology = translated?.articleIntelligence?.methodologyNote || report.articleIntelligence.methodologyNote;
  const purposeLabel = (purpose: string) => ui[`crawler.${purpose.replaceAll("-", "")}`] || ({ "search-discovery": ui["crawler.searchDiscovery"], "user-retrieval": ui["crawler.userRetrieval"], "training": ui["crawler.training"] } as Record<string,string>)[purpose] || purpose.replaceAll("-", " ");
  return <section className="report-section article-intelligence" id="article-intelligence"><div className="section-title"><span>{ui["article.kicker"]}</span><h2>{translated?.labels.articleIntelligence || ENGLISH_LABELS.articleIntelligence}</h2><p>{ui["article.description"]}</p></div><div className="dimension-grid">{dimensions.map(item=><article className={`dimension-card status-${item.status}`} key={item.key}><div className="dimension-score"><strong>{item.status === "withheld" ? "—" : item.score}</strong><span>/100</span></div><div><small>{item.key === "technicalSeo" ? ui["article.foundation"] : item.key.toUpperCase()}</small><h3>{item.label}</h3><p>{item.summary}</p></div><div className="dimension-evidence"><div><b>{ui["article.strengths"]}</b>{item.strengths.length ? <ul>{item.strengths.slice(0,3).map(value=><li key={value}>{value}</li>)}</ul> : <span>{ui["article.noneConfirmed"]}</span>}</div><div><b>{ui["article.gaps"]}</b>{item.gaps.length ? <ul>{item.gaps.slice(0,4).map(value=><li key={value}>{value}</li>)}</ul> : <span>{ui["article.noMaterialGap"]}</span>}</div></div></article>)}</div><div className="crawler-ledger"><div><strong>{ui["article.crawlerEvidence"]}</strong><span>{ui["article.crawlerDescription"]}</span></div>{report.articleIntelligence.aiCrawlerAccess.map(item=><div key={item.crawler} className={item.allowed ? "crawler-allowed" : "crawler-blocked"}><b>{item.crawler}</b><span>{purposeLabel(item.purpose)}</span><strong>{item.allowed ? ui["crawler.allowed"] : ui["crawler.blocked"]}</strong><small>{item.matchedRule || ui["crawler.noRule"]}</small></div>)}</div><p className="methodology-note">{methodology}</p></section>;
}

function Modal({ title, icon, onClose, children }: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event)=>{ if(event.currentTarget===event.target) onClose(); }}><section className="support-modal" role="dialog" aria-modal="true" aria-label={title}><button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close"/></button><div className="modal-icon"><Icon name={icon} size={26}/></div><h2>{title}</h2>{children}</section></div>;
}


type ResultNavItem = { id: string; label: string };

function HeroScanner() {
  return <div className="hero-board scanner-board" aria-hidden="true">
    <div className="scanner-board-label"><span>LIVE EVIDENCE SCAN</span><b>ARTICLE INTELLIGENCE</b></div>
    <div className="scanner-stage">
      <svg className="scanner-orbit-copy" viewBox="0 0 360 360" role="presentation">
        <defs><path id="auditicle-scanner-path" d="M180,180 m-142,0 a142,142 0 1,1 284,0 a142,142 0 1,1 -284,0"/></defs>
        <text><textPath href="#auditicle-scanner-path" startOffset="0%">TECHNICAL SEO • GEO • AEO • RAG RETRIEVAL • LLMO • EVIDENCE INTEGRITY • </textPath></text>
      </svg>
      <div className="scanner-radar">
        <span className="scanner-sweep"/>
        <span className="scanner-crosshair scanner-crosshair-x"/>
        <span className="scanner-crosshair scanner-crosshair-y"/>
        <span className="scanner-ring scanner-ring-one"/>
        <span className="scanner-ring scanner-ring-two"/>
        <span className="scanner-blip blip-one"/>
        <span className="scanner-blip blip-two"/>
        <span className="scanner-blip blip-three"/>
        <div className="scanner-core"><Icon name="scan" size={48}/><strong>SCANNING</strong><small>PUBLIC EVIDENCE</small></div>
      </div>
      <span className="scanner-node node-html">HTML</span>
      <span className="scanner-node node-robots">ROBOTS</span>
      <span className="scanner-node node-schema">SCHEMA</span>
      <span className="scanner-node node-links">LINKS</span>
    </div>
    <div className="scanner-status"><span><i/> Deterministic engine</span><b>05 READINESS LAYERS</b></div>
  </div>;
}

function ResultNavigation({ items, ui }: { items: ResultNavItem[]; ui: Record<string, string> }) {
  const [activeId, setActiveId] = useState(items[0]?.id || "overview");
  const navListRef = useRef<HTMLDivElement>(null);
  const itemKey = items.map(item => item.id).join("|");
  const activeIndex = Math.max(0, items.findIndex(item => item.id === activeId));

  useEffect(() => {
    const sections = items.map(item => document.getElementById(item.id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    if (!sections.some(section => section.id === activeId)) setActiveId(sections[0].id);

    const selectNearest = () => {
      const offset = window.innerWidth < 768 ? 154 : window.innerWidth < 1200 ? 146 : 118;
      const candidates = sections.map(section => ({ id: section.id, distance: Math.abs(section.getBoundingClientRect().top - offset) }));
      candidates.sort((a,b) => a.distance - b.distance);
      if (candidates[0]) setActiveId(candidates[0].id);
    };
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
    }, { rootMargin: "-18% 0px -68% 0px", threshold: [0, .08, .25, .5] });
    sections.forEach(section => observer.observe(section));
    window.addEventListener("scroll", selectNearest, { passive: true });
    window.addEventListener("resize", selectNearest);
    selectNearest();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", selectNearest);
      window.removeEventListener("resize", selectNearest);
    };
  }, [itemKey]);

  useEffect(() => {
    const activeButton = navListRef.current?.querySelector<HTMLElement>(`[data-result-section="${activeId}"]`);
    activeButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  function navigate(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  const previous = items[Math.max(0, activeIndex - 1)];
  const next = items[Math.min(items.length - 1, activeIndex + 1)];
  const progress = items.length ? ((activeIndex + 1) / items.length) * 100 : 0;

  return <aside className="case-nav result-navigation" aria-label="Audit result navigation">
    <div className="result-nav-heading"><div><span>{ui["nav.contents"] || "CASE CONTENTS"}</span><strong>{String(activeIndex + 1).padStart(2,"0")} / {String(items.length).padStart(2,"0")}</strong></div><div className="result-nav-meter" aria-hidden="true"><i style={{ width: `${progress}%` }}/></div></div>
    <div className="result-nav-list" ref={navListRef}>{items.map((item,index)=><button key={item.id} type="button" data-result-section={item.id} className={activeId === item.id ? "is-active" : ""} aria-current={activeId === item.id ? "location" : undefined} onClick={()=>navigate(item.id)}><span>{String(index+1).padStart(2,"0")}</span><b>{item.label}</b></button>)}</div>
    <div className="result-nav-mobile"><button type="button" aria-label="Previous result section" disabled={activeIndex === 0} onClick={()=>navigate(previous.id)}>‹</button><label><span>{ui["nav.viewing"] || "Viewing section"}</span><select value={activeId} onChange={event=>navigate(event.target.value)}>{items.map((item,index)=><option key={item.id} value={item.id}>{String(index+1).padStart(2,"0")} — {item.label}</option>)}</select></label><button type="button" aria-label="Next result section" disabled={activeIndex === items.length - 1} onClick={()=>navigate(next.id)}>›</button></div>
    <button type="button" className="result-nav-top" onClick={()=>document.getElementById("case-file")?.scrollIntoView({behavior:"smooth"})}>{ui["nav.caseSummary"] || "↑ Case summary"}</button>
  </aside>;
}

function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [form, setForm] = useState<AuditFormData>(DEFAULT_FORM);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [rawScan, setRawScan] = useState<ScanResponse | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [ai, setAi] = useState<AiNarrative | null>(null);
  const [translated, setTranslated] = useState<TranslatedReportContent | null>(null);
  const [translationLanguage, setTranslationLanguage] = useState("English");
  const [dailyUsage, setDailyUsage] = useState<DailyUsage | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [translationBusy, setTranslationBusy] = useState(false);
  const [stage, setStage] = useState("Ready for case intake");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [errorDetails, setErrorDetails] = useState<Record<string, unknown> | null>(null);
  const [limitReached, setLimitReached] = useState<DailyUsage | null>(null);
  const [donationOpen, setDonationOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("Suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const mode = window.auditicleTheme?.getMode() || document.documentElement.dataset.themeMode;
    return mode === "dark" || mode === "light" || mode === "system" ? mode : "system";
  });

  useEffect(() => {
    getPublicConfig().then(setConfig).catch((reason) => setError(reason instanceof Error ? reason.message : "Configuration could not be loaded."));
  }, []);

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: string }>).detail;
      const mode = detail?.mode;
      if (mode === "system" || mode === "dark" || mode === "light") setThemeMode(mode);
    };
    window.addEventListener("auditicle-theme-change", syncTheme);
    return () => window.removeEventListener("auditicle-theme-change", syncTheme);
  }, []);

  function changeTheme(mode: ThemeMode) {
    window.auditicleTheme?.setMode(mode);
    setThemeMode(mode);
  }

  const canSubmit = useMemo(() => Boolean(form.url.trim()) && !busy && (!config?.turnstileRequired || Boolean(turnstileToken)), [form.url, busy, config, turnstileToken]);
  const update = (key: keyof AuditFormData, value: string) => setForm(current => ({ ...current, [key]: value }));

  const reportUi = useMemo(() => ({
    ...REPORT_UI,
    ...(translated?.targetLanguage === "Indonesian" ? INDONESIAN_REPORT_UI : {}),
    ...(translated?.ui || {})
  }), [translated]);

  const displayFindings = useMemo(() => {
    if (!report || !translated) return report?.findings || [];
    const translations = new Map(translated.findings.map(item => [item.id, item]));
    return report.findings.map(item => ({ ...item, ...(translations.get(item.id) || {}) }));
  }, [report, translated]);

  const displayAi = useMemo(() => {
    if (!ai) return null;
    if (!translated?.aiNarrative) return ai;
    return { ...ai, ...translated.aiNarrative };
  }, [ai, translated]);

  const displayCheckedLinks = useMemo(() => {
    if (!report) return [];
    const errors = new Map((translated?.linkErrors || []).map(item => [item.destination, item.error]));
    return report.checkedLinks.map(item => ({ ...item, error: errors.get(item.destination) || item.error }));
  }, [report, translated]);

  const labels = translated?.labels || ENGLISH_LABELS;
  const displayDisclaimer = translated?.disclaimer || DISCLAIMER;
  const displayLimitations = translated?.limitations || report?.limitations || [];
  const renderingReason = translated?.messages?.renderingReason || report?.page.rendering.reason || "";


  async function performAudit(reuseExistingSession = false) {
    setError("");
    setErrorCode("");
    setErrorDetails(null);
    setAi(null);
    setTranslated(null);
    setTranslationLanguage("English");
    setReport(null);
    setRawScan(null);
    setBusy(true);
    try {
      let activeSessionId = reuseExistingSession ? sessionId : "";
      if (!activeSessionId) {
        setStage("Opening a secured case session…");
        const session = await createAuditSession(turnstileToken);
        activeSessionId = session.sessionId;
        setSessionId(activeSessionId);
        setDailyUsage(session.usage);
      } else {
        setStage("Retrying evidence collection in the secured case session…");
      }
      setStage("Checking robots.txt before collecting evidence…");
      const scan = await runScan(activeSessionId, { url: form.url.trim(), evidenceMode: form.evidenceMode });
      setDailyUsage(scan.usage);
      setRawScan(scan);
      let nextReport = buildAuditReport(scan, form);
      setReport(nextReport);
      setStage("Checking a limited sample of link destinations…");
      const maxLinks = Math.min(
        config?.maxLinks || 15,
        (config?.linkBatchSize || 10) * (config?.maxLinkBatches || 3)
      );
      const links = selectLinkDestinations(nextReport.extracted, maxLinks);
      if (links.length) {
        const batchSize = Math.max(1, Math.min(10, config?.linkBatchSize || 10));
        const maxBatches = Math.max(1, Math.min(3, config?.maxLinkBatches || 3));
        const batches: string[][] = [];
        for (let index = 0; index < links.length && batches.length < maxBatches; index += batchSize) {
          batches.push(links.slice(index, index + batchSize));
        }
        const checkedLinks = [];
        for (let index = 0; index < batches.length; index += 1) {
          setStage(`Checking link destinations — batch ${index + 1} of ${batches.length}…`);
          try {
            const checked = await checkLinks(activeSessionId, batches[index]);
            checkedLinks.push(...checked);
          } catch (linkError) {
            console.warn(`Link checker batch ${index + 1} unavailable`, linkError);
            break;
          }
        }
        if (checkedLinks.length) {
          nextReport = rebuildReportWithLinks(nextReport, scan, checkedLinks);
          setReport(nextReport);
        }
      }
      setStage("Case file complete");
      window.setTimeout(() => document.getElementById("case-file")?.scrollIntoView({ behavior: "smooth" }), 120);
    } catch (reason) {
      if (reason instanceof ApiError) {
        setErrorCode(reason.code || "");
        setErrorDetails(reason.details && typeof reason.details === "object" ? reason.details as Record<string, unknown> : null);
        if (reason.code === "DAILY_LIMIT_REACHED") {
          setLimitReached(reason.details as DailyUsage);
        }
        if (reason.code === "SESSION_EXPIRED" || reason.code === "SESSION_NOT_FOUND") {
          setSessionId("");
          setTurnstileToken("");
        }
      }
      setError(reason instanceof Error ? reason.message : "Audit failed.");
      setStage("Case intake stopped");
    } finally {
      setBusy(false);
    }
  }

  async function startAudit(event: React.FormEvent) {
    event.preventDefault();
    await performAudit();
  }

  async function requestAi() {
    if (!report || !sessionId) return;
    setAiBusy(true);
    setError("");
    try {
      const result = await generateAiNarrative(sessionId, buildAiEvidence(report));
      setAi(result);
      setTranslated(null);
      setTranslationLanguage("English");
      window.setTimeout(() => document.getElementById("ai-narrative")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI narrative is temporarily unavailable.");
    } finally {
      setAiBusy(false);
    }
  }

  async function requestTranslation() {
    if (!report || !sessionId) return;
    if (translationLanguage === "English") {
      setTranslated(null);
      return;
    }
    setTranslationBusy(true);
    setError("");
    try {
      const payload = {
        ui: REPORT_UI,
        labels: ENGLISH_LABELS,
        findings: report.findings.map(({ id, area, title, found, why, action, validation, owner, currentValue, recommendedValue }) => ({ id, area, title, found, why, action, validation, owner, currentValue, recommendedValue })),
        limitations: report.limitations,
        messages: {
          renderingReason: report.page.rendering.reason || (report.page.rendering.autoTriggered ? REPORT_UI["render.autoDetected"] : REPORT_UI["render.noLimitation"])
        },
        performance: {
          mobile: {
            error: report.pageSpeed.mobile.error || "No PageSpeed error was recorded.",
            opportunities: report.pageSpeed.mobile.opportunities.map(({ id, title, description }) => ({ id, title, description: description || "No additional opportunity description was provided." }))
          },
          desktop: {
            error: report.pageSpeed.desktop.error || "No PageSpeed error was recorded.",
            opportunities: report.pageSpeed.desktop.opportunities.map(({ id, title, description }) => ({ id, title, description: description || "No additional opportunity description was provided." }))
          }
        },
        linkErrors: report.checkedLinks.filter(item => item.error).map(item => ({ destination: item.destination, error: item.error || "Link validation was unavailable." })),
        articleIntelligence: {
          methodologyNote: report.articleIntelligence.methodologyNote,
          dimensions: report.articleIntelligence.dimensions.map(({ key, label, summary, strengths, gaps }) => ({ key, label, summary, strengths, gaps }))
        },
        ...(ai ? { aiNarrative: { executiveSummary: ai.executiveSummary, dimensionAnalyses: ai.dimensionAnalyses, priorityRoadmap: ai.priorityRoadmap, recommendations: ai.recommendations } } : {}),
        disclaimer: DISCLAIMER
      };
      const result = await translateAuditReport(sessionId, payload, translationLanguage);
      setTranslated(result);
      window.setTimeout(() => document.getElementById("findings")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Report translation is temporarily unavailable.");
    } finally {
      setTranslationBusy(false);
    }
  }

  function resetCase() {
    setReport(null); setRawScan(null); setAi(null); setTranslated(null); setTranslationLanguage("English"); setSessionId(""); setError(""); setErrorCode(""); setErrorDetails(null); setStage("Ready for case intake");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sendFeedback() {
    if (!config?.contactEmail || !feedbackMessage.trim()) return;
    const subject = encodeURIComponent(`[Auditicle ${feedbackCategory}] Website feedback`);
    const body = encodeURIComponent(`${feedbackMessage.trim()}\n\nPage: ${window.location.href}\nAuditicle version: ${config.version}`);
    window.location.href = `mailto:${config.contactEmail}?subject=${subject}&body=${body}`;
  }

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="/" aria-label="Auditicle home"><span className="brand-mark"><img src="/android-chrome-192x192.png" alt="" width="34" height="34"/></span><span><b>Auditicle</b><small>SEO FORENSICS LAB</small></span></a><nav className="desktop-app-nav" aria-label="Primary navigation"><a href="/features.html">Features</a><a href="/use-cases.html">Use cases</a><a href="/methodology.html">Methodology</a><a href="/docs.html">Docs</a><a href="/article-readiness-benchmark-2026">Research</a><a className="trust-link" href="/ai-transparency.html">Trust center</a><span className="live-dot">Evidence engine online</span><ThemeSelector mode={themeMode} onChange={changeTheme}/></nav><details className="app-mobile-menu"><summary>Menu</summary><div><a href="/features.html">Features</a><a href="/use-cases.html">Use cases</a><a href="/methodology.html">Methodology</a><a href="/docs.html">Docs</a><a href="/article-readiness-benchmark-2026">Research</a><a href="/ai-transparency.html">AI Transparency</a><a href="/data-sources.html">Data Sources</a><a href="/crawler-information.html">Crawler Info</a><a href="/system-status.html">System Info</a><ThemeSelector mode={themeMode} onChange={changeTheme}/></div></details></header>

    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span>CASE INTAKE // PUBLIC URL ANALYSIS</span></div><h1>Interrogate an article.<br/><em>Preserve the evidence.</em></h1><p>Run reproducible article audits across technical SEO, GEO, AEO, RAG retrieval and LLMO readiness. The core verdict is deterministic; AI may explain evidence but cannot invent it.</p><div className="trust-row"><span><Icon name="shield" size={17}/> SSRF-protected fetching</span><span><Icon name="eye" size={17}/> Source labels</span><span><Icon name="file" size={17}/> Exportable case file</span><span><Icon name="reset" size={17}/> Reproducible evidence</span></div></div><HeroScanner/></section>

      <section className="intake-panel" id="audit-form"><div className="panel-heading"><div><span className="label">New investigation</span><h2>Open a website case file</h2></div><div className="case-status"><span className={busy ? "pulse" : ""}/>{stage}</div></div>
        {dailyUsage && <div className={`usage-notice ${dailyUsage.remaining <= 2 || (dailyUsage.global && dailyUsage.global.remaining <= 10) ? "usage-warning" : ""}`}><Icon name="pulse" size={18}/><span><strong>{dailyUsage.remaining}</strong> of {dailyUsage.limit} personal-network audits remain today.</span>{dailyUsage.global && <small>Shared capacity: {dailyUsage.global.remaining} of {dailyUsage.global.limit} audits remain.</small>}<small>Resets {new Date(dailyUsage.resetsAt).toLocaleString()}.</small></div>}
        <form onSubmit={startAudit}><div className="field wide"><label htmlFor="url">Article URL *</label><div className="input-icon"><Icon name="search" size={19}/><input id="url" type="url" required placeholder="https://example.com/article" value={form.url} onChange={e=>update("url",e.target.value)}/></div></div>
          <div className="form-grid"><div className="field"><label htmlFor="primary">Primary keyword</label><input id="primary" placeholder="enterprise AI governance" value={form.primaryKeyword} onChange={e=>update("primaryKeyword",e.target.value)}/></div><div className="field"><label htmlFor="secondary">Secondary keyword</label><input id="secondary" placeholder="optional supporting query" value={form.secondaryKeyword} onChange={e=>update("secondaryKeyword",e.target.value)}/></div>
            <div className="field"><label htmlFor="market">Target market</label><select id="market" value={form.country} onChange={e=>update("country",e.target.value)}><option>Global</option><option>United States</option><option>Indonesia</option><option>United Kingdom</option><option>Australia</option><option>Singapore</option><option>Canada</option><option>India</option><option>Japan</option><option>Germany</option><option>France</option><option>Brazil</option></select><small>Used for hreflang, locale and product-currency checks.</small></div>
            <div className="field"><label htmlFor="language">Page language</label><select id="language" value={form.pageLanguage} onChange={e=>update("pageLanguage",e.target.value)}><option>English</option><option>Indonesian</option><option>Spanish</option><option>French</option><option>German</option><option>Portuguese</option><option>Italian</option><option>Dutch</option><option>Japanese</option><option>Korean</option><option>Simplified Chinese</option><option>Arabic</option><option>Hindi</option></select><small>Compared with html lang and a cautious content-language heuristic.</small></div>
            <div className="field"><label htmlFor="pageType">Page type</label><select id="pageType" value={form.pageType} onChange={e=>update("pageType",e.target.value)}><option>Article</option><option>Landing Page</option><option>Homepage</option><option>Product Page</option><option>Category Page</option><option>Documentation</option></select><small>Selects contextual schema, trust, content and conversion expectations.</small></div>
            <div className="field full-row"><label htmlFor="evidenceMode">Evidence collection mode</label><select id="evidenceMode" value={form.evidenceMode} onChange={e=>update("evidenceMode",e.target.value)}><option value="auto">Auto — render only when server HTML looks incomplete</option><option value="server">Server HTML only — fastest and lowest usage</option><option value="rendered">Rendered browser — execute JavaScript when available</option></select><small>Robots.txt is checked first. Rendered Browser uses Cloudflare Browser Run and gracefully falls back to server HTML if unavailable.</small></div>
          </div><div className="form-footer"><TurnstileBox config={config} onToken={setTurnstileToken}/><button className="primary-button" disabled={!canSubmit} type="submit">{busy ? <><span className="spinner"/> Investigating…</> : <><Icon name="scan"/> Generate forensic audit</>}</button></div></form>{error && <div className="error-banner"><Icon name="alert"/><div><strong>{errorCode ? errorCode.replaceAll("_", " ") : "Audit interrupted"}</strong><span>{error}</span>{RETRYABLE_ERROR_CODES.has(errorCode) && <button type="button" className="retry-button" disabled={busy} onClick={()=>performAudit(true)}>Retry evidence collection</button>}</div></div>}{errorCode === "ROBOTS_DISALLOWED" && <section className="blocked-case"><div><span className="label">LIMITED CASE FILE</span><h3>Audit not performed</h3><p>Auditicle respected the target website’s robots.txt instruction and did not fetch or score the page.</p></div><dl><div><dt>Target</dt><dd>{String(errorDetails?.targetUrl || form.url)}</dd></div><div><dt>Robots source</dt><dd>{String(errorDetails?.robotsUrl || "Unavailable")}</dd></div><div><dt>Matched user agent</dt><dd>{String(errorDetails?.matchedUserAgent || "*")}</dd></div><div><dt>Matched rule</dt><dd>{String(errorDetails?.matchedRule || "Disallow")}</dd></div></dl></section>}</section>

      {!report && <>
        <section className="home-section how-it-works" aria-labelledby="how-title"><div className="home-section-head"><span>HOW IT WORKS</span><h2 id="how-title">From public URL to evidence-led action plan</h2><p>Auditicle separates collection, deterministic diagnosis and optional AI explanation so every recommendation can be traced back to observable evidence.</p></div><div className="process-grid"><div><span>01</span><Icon name="file"/><h3>Acquire evidence</h3><p>Fetch public HTML, selected headers, robots.txt, sitemap data, PageSpeed evidence and rendered-browser snapshots when allowed.</p><i>›</i></div><div><span>02</span><Icon name="search"/><h3>Interrogate article signals</h3><p>Score technical SEO, GEO, AEO, RAG retrieval and LLMO readiness from bounded, source-labeled evidence.</p><i>›</i></div><div><span>03</span><Icon name="scan"/><h3>Build an optimization roadmap</h3><p>Prioritize confirmed findings by impact, effort, owner, expected evidence change and validation method.</p><i>›</i></div></div></section>
        <section className="home-section" id="features" aria-labelledby="features-title"><div className="home-section-head"><span>FEATURES</span><h2 id="features-title">An article audit built for search and AI discovery</h2><p>Each module is designed to produce a useful case file without presenting estimates as facts or allowing AI to rewrite deterministic scores.</p></div><div className="feature-grid"><article><Icon name="shield"/><h3>Robots-aware collection</h3><p>Checks AuditicleBot and wildcard robots rules before fetching, then validates redirect destinations and blocks private-network targets.</p><a href="/features.html#evidence">Explore evidence controls</a></article><article><Icon name="eye"/><h3>Rendered-browser audit</h3><p>Auto mode detects incomplete JavaScript shells and can use Cloudflare Browser Rendering while clearly disclosing fallback conditions.</p><a href="/features.html#rendering">See rendering modes</a></article><article><Icon name="pulse"/><h3>Five article scorecards</h3><p>Technical SEO, GEO, AEO, RAG retrieval and LLMO readiness are scored independently with strengths, gaps and confidence labels.</p><a href="/features.html#scorecards">Review the scorecards</a></article><article><Icon name="scan"/><h3>Performance and link evidence</h3><p>Combines mobile and desktop Lighthouse evidence with a bounded destination checker that runs in safe batches.</p><a href="/features.html#performance">Inspect technical evidence</a></article><article><Icon name="spark"/><h3>Evidence-grounded AI consultant</h3><p>AI receives only deterministic findings and a bounded article snapshot. It cannot invent measurements, change scores or create finding IDs.</p><a href="/features.html#ai">Understand the AI boundary</a></article><article><Icon name="download"/><h3>Translation and safe exports</h3><p>Translate the completed report while preserving IDs, scores and measurements, then export TXT, JSON or print-ready PDF without raw HTML.</p><a href="/features.html#exports">View output options</a></article></div></section>
        <section className="home-section" id="use-cases" aria-labelledby="use-cases-title"><div className="home-section-head"><span>USE CASES</span><h2 id="use-cases-title">Useful before publishing, during refreshes and after traffic changes</h2></div><div className="use-case-grid"><article><b>01</b><h3>Pre-publication article review</h3><p>Check metadata, indexability, schema, answer structure, sourcing and retrieval readiness before the article goes live.</p></article><article><b>02</b><h3>Content refresh planning</h3><p>Turn stale authorship, weak sections, missing source signals and performance issues into a prioritized revision backlog.</p></article><article><b>03</b><h3>AI search readiness review</h3><p>Inspect discovery crawler access, provenance, extractable sections and citation-supporting signals without promising AI visibility.</p></article><article><b>04</b><h3>Agency and editorial QA</h3><p>Share a source-labeled case file with writers, developers, SEO teams and clients using consistent validation steps.</p></article></div><div className="section-cta"><a className="secondary-cta" href="/use-cases.html">See all use cases</a><a className="primary-cta" href="#audit-form">Open a case file</a></div></section>
        <section className="home-section" id="audit-pathways" aria-labelledby="audit-pathways-title"><div className="home-section-head"><span>FOCUSED AUDIT PATHWAYS</span><h2 id="audit-pathways-title">Start with the investigation that matches your article</h2><p>Each guide explains a distinct audit intent, the evidence Auditicle checks, a worked finding, known limitations, and a direct path back to the case intake.</p></div><div className="landing-grid"><a href="/free-article-seo-audit-tool"><b>FREE TOOL</b><h3>Free Article SEO Audit Tool</h3><p>Full article-first investigation across five independent readiness dimensions.</p></a><a href="/article-seo-checker"><b>EDITORIAL QA</b><h3>Article SEO Checker</h3><p>Review metadata, authorship, dates, structure, sources, and page-type evidence.</p></a><a href="/technical-seo-article-audit"><b>TECHNICAL</b><h3>Technical SEO Article Audit</h3><p>Inspect crawlability, indexability, canonical, schema, rendering, and performance.</p></a><a href="/geo-readiness-audit"><b>GENERATIVE SEARCH</b><h3>GEO Readiness Audit</h3><p>Evaluate provenance, unique evidence, answer clarity, and source support.</p></a><a href="/aeo-readiness-checker"><b>ANSWER ENGINES</b><h3>AEO Readiness Checker</h3><p>Check direct answers, definitions, headings, lists, tables, and FAQ evidence.</p></a><a href="/rag-retrieval-readiness"><b>RETRIEVAL</b><h3>RAG Retrieval Readiness</h3><p>Assess chunk boundaries, context retention, entity clarity, and extractability.</p></a><a href="/ai-citation-readiness-checker"><b>ATTRIBUTION</b><h3>AI Citation Readiness Checker</h3><p>Inspect observable provenance and citation-support signals without guarantees.</p></a><a href="/rendered-html-seo-audit"><b>JAVASCRIPT</b><h3>Rendered HTML SEO Audit</h3><p>Compare server HTML with the post-JavaScript browser DOM and fallback evidence.</p></a></div></section>
        <section className="home-section research-callout" aria-labelledby="benchmark-title"><div><span>ORIGINAL RESEARCH // PROTOCOL PUBLISHED</span><h2 id="benchmark-title">Auditicle Article Readiness Benchmark 2026</h2><p>The transparent protocol targets 1,000 public articles and will measure visible authorship, dateModified, thin server HTML, citation links, median readiness scores, and descriptive CMS differences. Results remain withheld until collection and quality review are complete.</p><div className="section-cta"><a className="secondary-cta" href="/article-readiness-benchmark-2026">Read the methodology</a><a className="primary-cta" href="/data/article-readiness-benchmark-2026.json">View collection status</a></div></div><div className="research-meter" aria-label="Benchmark data collection status"><strong>0</strong><span>of 1,000 validated articles</span><i><b style={{width:"0%"}}/></i><small>No benchmark result has been fabricated or published.</small></div></section>
        <section className="trust-band"><span><Icon name="shield" size={28}/></span><div><h3>Evidence you can trust. Audits you can act on.</h3><p>Auditicle follows an evidence integrity protocol with source-labeled data, disclosed limitations and reproducible deterministic rules. No invented signals.</p></div><strong>100%<small>Deterministic core</small></strong><strong>Source-labeled<small>Claims tied to evidence</small></strong><strong>Reproducible<small>Same evidence, same score</small></strong></section>
      </>}

      {report && <section className="case-layout" id="case-file">
        <ResultNavigation ui={reportUi} items={[
          ["overview", reportUi["nav.caseOverview"]],
          ["article-intelligence", reportUi["nav.articleIntelligence"]],
          ["findings", reportUi["nav.simpleAuditResult"]],
          ["actions", reportUi["nav.actionPlan"]],
          ["performance", reportUi["nav.performance"]],
          ["discovery", reportUi["nav.discovery"]],
          ["links", reportUi["nav.links"]],
          ...(displayAi ? [["ai-narrative", reportUi["nav.aiNarrative"]]] : []),
          ["disclaimer", reportUi["nav.disclaimer"]]
        ].map(([id,label])=>({id,label}))}/>
        <div className="case-main">
          <section className="case-header" id="overview"><div><span className="case-id">CASE #{report.id.slice(0,8).toUpperCase()}</span><h2>{reportUi["case.consultingAudit"]}</h2><a href={report.page.finalUrl} target="_blank" rel="noreferrer">{report.page.finalUrl}</a><p>{new Date(report.createdAt).toLocaleString()} · HTTP {report.page.status} · {reportUi["case.platform"]} {report.extracted.platform} ({report.extracted.platformConfidence})</p><div className="context-chips"><span>{report.form.pageType}</span><span>{report.form.pageLanguage}</span><span>{report.form.country}</span><span className="mode-chip">{report.page.evidenceMode === "rendered-browser" ? reportUi["case.renderedBrowser"] : reportUi["case.serverHtml"]}</span>{translated && <span className="translated-chip"><Icon name="globe" size={13}/> {translated.targetLanguage}</span>}</div></div><ScoreRing value={report.score} status={report.scoreStatus} ui={reportUi}/></section>
          <div className="case-toolbar"><button onClick={()=>exportText(report,ai)}><Icon name="download" size={17}/> TXT</button><button onClick={()=>exportJson(report,ai)}><Icon name="download" size={17}/> JSON</button><button onClick={printReport}><Icon name="file" size={17}/> Print / PDF</button><button className="ai-button" onClick={requestAi} disabled={aiBusy}>{aiBusy ? <><span className="spinner"/> {reportUi["toolbar.writing"]}</> : <><Icon name="spark" size={17}/> {reportUi["toolbar.consultantNarrative"]}</>}</button><div className="translate-control"><select aria-label="Report translation language" value={translationLanguage} onChange={event=>setTranslationLanguage(event.target.value)}>{(config?.translationLanguages || ["English","Indonesian","Spanish","French","German","Portuguese"]).map(language=><option key={language}>{language}</option>)}</select><button onClick={requestTranslation} disabled={translationBusy || translationLanguage==="English" || !config?.aiProviders.length}>{translationBusy ? <><span className="spinner"/> {reportUi["toolbar.translating"]}</> : <><Icon name="globe" size={17}/> {reportUi["toolbar.translate"]}</>}</button>{translated && <button onClick={()=>{setTranslated(null);setTranslationLanguage("English");}}>{reportUi["toolbar.english"]}</button>}</div><button onClick={resetCase}><Icon name="reset" size={17}/> {reportUi["toolbar.newCase"]}</button></div>
          <section className="translation-note"><Icon name="globe"/><div><strong>{reportUi["translation.sourceTitle"]}</strong><span>{reportUi["translation.sourceNote"]}</span></div></section>
          <section className="rendering-evidence"><div><span className="label">{reportUi["render.mode"]}</span><strong>{report.page.evidenceMode === "rendered-browser" ? reportUi["render.javascript"] : reportUi["render.server"]}</strong><small>{report.page.evidenceMode === "rendered-browser" ? formatUi(reportUi["render.renderedBytes"],{rendered:report.page.bytes.toLocaleString(),server:report.page.serverBytes.toLocaleString()}) : formatUi(reportUi["render.serverBytes"],{server:report.page.serverBytes.toLocaleString()})}</small></div><div><span className="label">{reportUi["render.browserStatus"]}</span><strong>{report.page.rendering.attempted ? report.page.rendering.available ? reportUi["render.success"] : reportUi["render.fallback"] : reportUi["render.notRequired"]}</strong><small>{renderingReason || (report.page.rendering.autoTriggered ? reportUi["render.autoDetected"] : reportUi["render.noLimitation"])}</small></div></section>
          <section className={`integrity-banner status-${report.scoreStatus}`}><Icon name="shield"/><div><strong>{report.scoreStatus === "final" ? reportUi["integrity.final"] : report.scoreStatus === "provisional" ? reportUi["integrity.provisional"] : reportUi["integrity.withheld"]}</strong><span>{report.scoreStatus === "withheld" ? reportUi["integrity.withheldText"] : report.scoreStatus === "provisional" ? reportUi["integrity.provisionalText"] : formatUi(reportUi["integrity.finalText"],{ruleSet:report.ruleSet})}</span></div><b>{report.evidenceCoverage}% {reportUi["integrity.coverage"]}</b></section>
          {displayLimitations.length > 0 && <section className="limitations-panel"><div><Icon name="alert"/><strong>{reportUi["limitations.title"]}</strong></div><ul>{displayLimitations.map(item=><li key={item}>{item}</li>)}</ul></section>}
          <ArticleIntelligencePanel report={report} translated={translated} ui={reportUi}/>
          <section className="summary-grid summary-five"><div><span>{reportUi["summary.critical"]}</span><strong>{report.summary.critical}</strong></div><div><span>{reportUi["summary.warnings"]}</span><strong>{report.summary.warnings}</strong></div><div><span>{reportUi["summary.notices"]}</span><strong>{report.summary.notices}</strong></div><div><span>{reportUi["summary.information"]}</span><strong>{report.summary.infos}</strong></div><div><span>{reportUi["summary.checkedLinks"]}</span><strong>{report.checkedLinks.length}</strong></div></section>
          <section className="report-section" id="findings"><div className="section-title"><span>{reportUi["findings.kicker"]}</span><h2>{labels.simpleAuditResult}</h2><p>{reportUi["findings.description"]}</p></div><FindingTable findings={displayFindings} ui={reportUi}/></section>
          <section className="report-section" id="actions"><div className="section-title"><span>{reportUi["actions.kicker"]}</span><h2>{labels.actionPlan}</h2></div><FindingsCards findings={displayFindings} ui={reportUi}/></section>
          <section className="report-section" id="performance"><div className="section-title"><span>{reportUi["performance.kicker"]}</span><h2>{labels.performance}</h2><p>{reportUi["performance.description"]}</p></div><div className="two-col"><DevicePanel data={report.pageSpeed.mobile} translated={translated?.performance?.mobile} ui={reportUi}/><DevicePanel data={report.pageSpeed.desktop} translated={translated?.performance?.desktop} ui={reportUi}/></div></section>
          <section className="report-section" id="discovery"><div className="section-title"><span>{reportUi["discovery.kicker"]}</span><h2>{labels.discovery}</h2></div><div className="two-col"><div className="evidence-card"><div className="card-head"><div><span className="label">robots.txt</span><h3>{report.discovery.robots.available ? reportUi["discovery.fetched"] : reportUi["discovery.unavailable"]}</h3></div><b>{report.discovery.robots.status ?? "—"}</b></div><Metric label={reportUi["discovery.crawlDecision"]} value={reportUi[`decision.${report.discovery.robots.access.decision}`] || report.discovery.robots.access.decision} unavailable={reportUi["performance.dataUnavailable"]}/><Metric label={reportUi["discovery.matchedAgent"]} value={report.discovery.robots.access.matchedAgent || reportUi["discovery.noGroup"]} unavailable={reportUi["performance.dataUnavailable"]}/><Metric label={reportUi["discovery.matchedRule"]} value={report.discovery.robots.access.matchedRule || reportUi["discovery.noRule"]} unavailable={reportUi["performance.dataUnavailable"]}/><Metric label={reportUi["discovery.declaredSitemaps"]} value={report.discovery.robots.sitemapUrls.length} unavailable={reportUi["performance.dataUnavailable"]}/><Metric label={reportUi["discovery.groups"]} value={report.discovery.robots.groups.length} unavailable={reportUi["performance.dataUnavailable"]}/><a href={report.discovery.robots.url} target="_blank" rel="noreferrer">{reportUi["discovery.openSource"]}</a></div><div className="evidence-card"><div className="card-head"><div><span className="label">{reportUi["discovery.sitemaps"]}</span><h3>{report.discovery.sitemaps.some(item=>item.available) ? reportUi["discovery.collected"] : reportUi["performance.dataUnavailable"]}</h3></div><b>{report.discovery.sitemaps.length}</b></div>{report.discovery.sitemaps.slice(0,4).map(item=><div className="sitemap-row" key={item.url}><span>{item.type}</span><b>{item.urlCount}{item.truncated ? "+" : ""} URLs</b><small>{item.url}</small></div>)}</div></div></section>
          <section className="report-section" id="links"><div className="section-title"><span>{reportUi["links.kicker"]}</span><h2>{labels.links}</h2><p>{reportUi["links.description"]}</p></div>{displayCheckedLinks.length ? <div className="table-shell link-table"><table><thead><tr><th>{reportUi["links.destination"]}</th><th>{reportUi["links.outcome"]}</th><th>{reportUi["links.http"]}</th><th>{reportUi["links.finalUrl"]}</th></tr></thead><tbody>{displayCheckedLinks.map(item=><tr key={item.destination}><td data-label={reportUi["links.destination"]}>{item.destination}</td><td data-label={reportUi["links.outcome"]}><span className={`outcome outcome-${item.outcome}`}>{reportUi[`outcome.${item.outcome}`] || item.outcome}</span></td><td data-label={reportUi["links.http"]}>{item.status ?? "—"}</td><td data-label={reportUi["links.finalUrl"]}>{item.finalUrl || item.error || reportUi["performance.dataUnavailable"]}</td></tr>)}</tbody></table></div> : <div className="empty-evidence">{reportUi["links.noLinks"]}</div>}</section>
          {displayAi && <section className="report-section ai-section" id="ai-narrative"><div className="section-title"><span>{reportUi["ai.kicker"]}</span><h2>{labels.aiNarrative}</h2><p>{ai?.provider} · {ai?.model} · {ai?.provider === "Auditicle deterministic" ? reportUi["ai.deterministicFallback"] : ai?.fallback ? reportUi["ai.configuredFallback"] : reportUi["ai.primaryProvider"]}</p></div><div className="ai-summary"><Icon name="spark"/><p>{displayAi.executiveSummary}</p></div><div className="ai-dimension-grid">{displayAi.dimensionAnalyses.map(item=><article key={item.key}><header><span>{item.key.toUpperCase()}</span><strong>{item.score}/100</strong></header><h3>{item.verdict}</h3><p>{item.evidenceSummary}</p><div className="ai-mini-cols"><div><b>{reportUi["ai.strengths"]}</b><ul>{item.strengths.map(value=><li key={value}>{value}</li>)}</ul></div><div><b>{reportUi["ai.gaps"]}</b><ul>{item.gaps.map(value=><li key={value}>{value}</li>)}</ul></div></div><div className="ai-actions"><b>{reportUi["ai.optimizationActions"]}</b><ol>{item.optimizationActions.map(value=><li key={value}>{value}</li>)}</ol></div></article>)}</div>{displayAi.priorityRoadmap.length > 0 && <div className="roadmap"><h3>{reportUi["ai.roadmap"]}</h3>{displayAi.priorityRoadmap.map((item,index)=><article key={`${item.priority}-${index}`}><span>{item.priority}</span><div><b>{item.action}</b><small>{reportUi["ai.findings"]}: {item.findingIds.join(", ")}</small><p>{reportUi["ai.expectedChange"]}: {item.expectedEvidenceChange}</p><p>{reportUi["ai.validate"]}: {item.validation}</p></div></article>)}</div>}<div className="ai-recommendations">{displayAi.recommendations.map(item=><article key={`${item.findingId}-${item.fix}`}><span>{item.findingId}</span><p>{item.explanation}</p><strong>{reportUi["ai.fix"]}</strong><p>{item.fix}</p><small>{item.caution}</small></article>)}</div></section>}
          <section className="disclaimer" id="disclaimer"><h3>{labels.disclaimer}</h3><p>{displayDisclaimer}</p><p><strong>{reportUi["disclaimer.accessibility"]}:</strong> {reportUi["disclaimer.accessibilityText"]}</p></section>
        </div>
      </section>}
    </main>

    <div className="support-dock" aria-label="Support and feedback"><button className="donate-widget" onClick={()=>setDonationOpen(true)}><span><Icon name="heart"/></span><div><strong>Support Auditicle</strong><small>Keep the forensic lab free</small></div></button><button className="feedback-widget" onClick={()=>setFeedbackOpen(true)}><span><Icon name="message"/></span><div><strong>Suggestion & feedback</strong><small>Help improve the investigation</small></div></button></div>

    {limitReached && <Modal title="Daily audit limit reached" icon="alert" onClose={()=>setLimitReached(null)}><p>Your free allowance has been used for today. No API key or account data was exposed.</p><div className="limit-card"><strong>{limitReached.used} / {limitReached.limit}</strong><span>audits used</span><small>Resets at {new Date(limitReached.resetsAt).toLocaleString()}</small></div><button className="primary-button" onClick={()=>setLimitReached(null)}>Understood</button></Modal>}

    {donationOpen && <Modal title="Support the SEO Forensics Lab" icon="heart" onClose={()=>setDonationOpen(false)}><p>Donations help cover PageSpeed, infrastructure and AI explanation costs while keeping the core audit free.</p><div className="donation-evidence"><span>🔎 Independent evidence checks</span><span>🧪 Continuous test coverage</span><span>🛡️ Secure server-side integrations</span></div>{config?.donationUrl ? <a className="primary-button modal-link" href={config.donationUrl} target="_blank" rel="noopener noreferrer">Open secure donation page</a> : <a className="secondary-modal-link" href={`mailto:${config?.contactEmail || "hello@auditicle.site"}?subject=Supporting%20Auditicle`}>Contact Auditicle about support</a>}<small className="privacy-mini">Payment details are never collected by Auditicle.</small></Modal>}

    {feedbackOpen && <Modal title="Suggestion & feedback" icon="message" onClose={()=>setFeedbackOpen(false)}><p>Share a feature request, bug report or audit-quality suggestion. The message opens in your email app; Auditicle does not store it in the browser.</p><label className="modal-field">Category<select value={feedbackCategory} onChange={event=>setFeedbackCategory(event.target.value)}><option>Suggestion</option><option>Bug report</option><option>Audit quality</option><option>Translation</option><option>Other</option></select></label><label className="modal-field">Message<textarea rows={6} maxLength={3000} value={feedbackMessage} onChange={event=>setFeedbackMessage(event.target.value)} placeholder="Describe what happened or what would make Auditicle more useful…"/></label><button className="primary-button" disabled={!feedbackMessage.trim()} onClick={sendFeedback}>Open email draft</button><small className="privacy-mini">Do not include passwords, API keys, private URLs or personal data.</small></Modal>}

    <footer><div><strong>Auditicle</strong><span>Article-first technical SEO, GEO, AEO, RAG and LLMO readiness audits.</span></div><nav aria-label="Footer navigation"><button onClick={()=>setDonationOpen(true)}>Donate</button><button onClick={()=>setFeedbackOpen(true)}>Feedback</button><a href="/features.html">Features</a><a href="/use-cases.html">Use cases</a><a href="/methodology.html">Methodology</a><a href="/docs.html">Docs</a><a href="/article-readiness-benchmark-2026">Research</a><a href="/ai-transparency.html">AI Transparency</a><a href="/data-sources.html">Data Sources</a><a href="/crawler-information.html">Crawler Info</a><a href="/system-status.html">System Info</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/disclaimer.html">Disclaimer</a><a href="/accessibility.html">Accessibility</a><a href="/faq.html">FAQ</a><a href="/changelog.html">Changelog</a></nav></footer>
  </div>;
}

export default App;
