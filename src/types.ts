export type Severity = "critical" | "warning" | "notice" | "info" | "pass";
export type Impact = "High" | "Medium" | "Low";
export type Effort = "Low" | "Medium" | "High";
export type EvidenceModeRequest = "auto" | "server" | "rendered";
export type EvidenceModeUsed = "server-html" | "rendered-browser";
export type ScoreStatus = "final" | "provisional" | "withheld";
export type ArticleDimensionKey = "technicalSeo" | "geo" | "aeo" | "rag" | "llmo";

export interface AuditFormData {
  url: string;
  primaryKeyword: string;
  secondaryKeyword: string;
  country: string;
  pageLanguage: string;
  pageType: string;
  evidenceMode: EvidenceModeRequest;
}

export interface DailyUsage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  global?: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
  };
}

export interface PublicConfig {
  version: string;
  siteUrl: string;
  contactEmail: string;
  donationUrl: string | null;
  turnstileRequired: boolean;
  turnstileSiteKey: string | null;
  pageSpeedEnabled: boolean;
  aiProviders: string[];
  deterministicNarrativeAvailable: boolean;
  dailyAuditLimit: number;
  globalDailyAuditLimit: number;
  renderedBrowserDailyLimit: number;
  aiDailyRequestLimit: number;
  defaultEvidenceMode: "auto" | "server" | "rendered";
  evidenceCache: {
    pageSpeedSeconds: number;
    robotsSeconds: number;
    sitemapSeconds: number;
  };
  translationLanguages: string[];
  maxLinks: number;
  linkBatchSize: number;
  maxLinkBatches: number;
  renderedBrowserEnabled: boolean;
  renderedBrowserDailyAllowance: string;
}

export interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

export interface RenderingEvidence {
  requestedMode: EvidenceModeRequest;
  usedMode: EvidenceModeUsed;
  attempted: boolean;
  available: boolean;
  autoTriggered: boolean;
  reason?: string;
  finalUrl?: string;
  renderedAt?: string;
  browserMsUsed?: number | null;
}

export interface PageEvidence {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  statusText: string;
  contentType: string;
  bytes: number;
  serverBytes: number;
  fetchedAt: string;
  headers: Record<string, string>;
  redirects: RedirectHop[];
  html: string;
  evidenceMode: EvidenceModeUsed;
  rendering: RenderingEvidence;
}

export interface RobotsAccessDecision {
  userAgent: string;
  matchedAgent: string | null;
  matchedRule: string | null;
  allowed: boolean;
  decision: "allowed" | "disallowed" | "unavailable" | "unreachable";
}

export interface RobotsEvidence {
  url: string;
  status: number | null;
  available: boolean;
  content: string;
  sitemapUrls: string[];
  groups: Array<{
    agents: string[];
    allow: string[];
    disallow: string[];
  }>;
  access: RobotsAccessDecision;
  error?: string;
  cached?: boolean;
  fetchedAt?: string;
}

export interface SitemapEvidence {
  url: string;
  status: number | null;
  available: boolean;
  type: "urlset" | "index" | "unknown";
  urlCount: number;
  lastmodCount: number;
  sampleUrls: string[];
  containsSubmittedUrl: boolean | null;
  truncated?: boolean;
  error?: string;
  cached?: boolean;
  fetchedAt?: string;
}

export interface DiscoveryEvidence {
  robots: RobotsEvidence;
  sitemaps: SitemapEvidence[];
}

export interface PageSpeedMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  speedIndex: number | null;
  inp: number | null;
  ttfb: number | null;
}

export interface PageSpeedOpportunity {
  id: string;
  title: string;
  description: string;
  savingsMs: number | null;
  savingsBytes: number | null;
}

export interface PageSpeedDevice {
  available: boolean;
  strategy: "mobile" | "desktop";
  fetchedAt: string;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  metrics: PageSpeedMetrics;
  fieldData: Record<string, string | number | null>;
  opportunities: PageSpeedOpportunity[];
  error?: string;
  cached?: boolean;
}

export interface ScanResponse {
  page: PageEvidence;
  discovery: DiscoveryEvidence;
  pageSpeed: {
    mobile: PageSpeedDevice;
    desktop: PageSpeedDevice;
  };
  errors: string[];
  usage: DailyUsage;
}

export interface LinkCandidate {
  destination: string;
  anchor: string;
  internal: boolean;
  rel: string;
}

export interface CheckedLink {
  destination: string;
  finalUrl: string | null;
  status: number | null;
  statusText: string;
  contentType: string | null;
  redirects: RedirectHop[];
  outcome: "working" | "redirect" | "client-error" | "server-error" | "timeout" | "unavailable";
  error?: string;
  checkedAt: string;
}

export interface ExtractedEvidence {
  title: string;
  metaDescription: string;
  canonical: string;
  robotsMeta: string;
  xRobotsTag: string;
  h1s: string[];
  h2s: string[];
  wordCount: number;
  lang: string;
  detectedLanguage: string;
  detectedLanguageConfidence: "high" | "medium" | "low";
  hreflangCodes: string[];
  ogLocale: string;
  viewport: string;
  authorSignals: string[];
  dateSignals: string[];
  platform: string;
  platformConfidence: "high" | "medium" | "low";
  images: {
    total: number;
    missingAlt: number;
    emptyAlt: number;
  };
  links: {
    total: number;
    internal: number;
    external: number;
    emptyAnchors: number;
    genericAnchors: number;
  };
  structuredData: {
    blocks: number;
    types: string[];
    invalidBlocks: number;
  };
  pageSignals: {
    navigationLinks: number;
    forms: number;
    buttons: number;
    codeBlocks: number;
    listItems: number;
    priceSignals: number;
    currencyCodes: string[];
  };
  accessibility: {
    unlabeledInputs: number;
    unnamedButtons: number;
    duplicateIds: number;
    headingOrderWarnings: number;
  };
  articleSignals: {
    paragraphCount: number;
    headingCount: number;
    questionHeadingCount: number;
    headingsWithIds: number;
    tableCount: number;
    blockquoteCount: number;
    referenceSectionDetected: boolean;
    externalSourceLinks: number;
    uniqueExternalDomains: number;
    citationMarkerCount: number;
    definitionPatternCount: number;
    introWordCount: number;
    shortParagraphCount: number;
    faqSchemaDetected: boolean;
  };
  articleContent: {
    introExcerpt: string;
    conclusionExcerpt: string;
    sectionSamples: Array<{ heading: string; excerpt: string }>;
    externalSources: Array<{ url: string; anchor: string }>;
    snapshotCharacters: number;
  };
  linkCandidates: LinkCandidate[];
}

export interface AiCrawlerDecision {
  crawler: "Googlebot" | "OAI-SearchBot" | "GPTBot" | "Claude-SearchBot" | "Claude-User" | "ClaudeBot";
  purpose: "search-discovery" | "training" | "user-retrieval";
  allowed: boolean;
  matchedAgent: string | null;
  matchedRule: string | null;
  confidence: "High" | "Medium";
}

export interface ArticleDimensionScore {
  key: ArticleDimensionKey;
  label: string;
  score: number;
  status: ScoreStatus;
  summary: string;
  strengths: string[];
  gaps: string[];
  evidenceIds: string[];
}

export interface ArticleIntelligence {
  applicable: boolean;
  overallScore: number;
  scoreStatus: ScoreStatus;
  dimensions: ArticleDimensionScore[];
  aiCrawlerAccess: AiCrawlerDecision[];
  methodologyNote: string;
}


export interface Finding {
  id: string;
  area: string;
  severity: Severity;
  title: string;
  found: string;
  why: string;
  action: string;
  evidenceIds: string[];
  impact: Impact;
  effort: Effort;
  owner: string;
  validation: string;
  currentValue?: string;
  recommendedValue?: string;
  confidence: "High" | "Medium" | "Low";
}

export interface AuditReport {
  id: string;
  createdAt: string;
  form: AuditFormData;
  page: PageEvidence;
  discovery: DiscoveryEvidence;
  pageSpeed: ScanResponse["pageSpeed"];
  extracted: ExtractedEvidence;
  checkedLinks: CheckedLink[];
  findings: Finding[];
  score: number;
  scoreStatus: ScoreStatus;
  evidenceCoverage: number;
  summary: {
    critical: number;
    warnings: number;
    notices: number;
    infos: number;
    passes: number;
  };
  ruleSet: string;
  limitations: string[];
  articleIntelligence: ArticleIntelligence;
}

export interface AiNarrative {
  provider: string;
  model: string;
  fallback: boolean;
  generatedAt: string;
  executiveSummary: string;
  dimensionAnalyses: Array<{
    key: ArticleDimensionKey;
    score: number;
    verdict: string;
    evidenceSummary: string;
    strengths: string[];
    gaps: string[];
    optimizationActions: string[];
  }>;
  priorityRoadmap: Array<{
    priority: "P0" | "P1" | "P2";
    findingIds: string[];
    action: string;
    expectedEvidenceChange: string;
    validation: string;
  }>;
  recommendations: Array<{
    findingId: string;
    explanation: string;
    fix: string;
    caution: string;
  }>;
}

export interface TranslatedReportContent {
  targetLanguage: string;
  provider: string;
  model: string;
  fallback: boolean;
  generatedAt: string;
  ui: Record<string, string>;
  labels: {
    caseOverview: string;
    articleIntelligence: string;
    simpleAuditResult: string;
    actionPlan: string;
    performance: string;
    discovery: string;
    links: string;
    aiNarrative: string;
    disclaimer: string;
  };
  findings: Array<{
    id: string;
    area: string;
    title: string;
    found: string;
    why: string;
    action: string;
    validation: string;
    owner?: string;
    currentValue?: string;
    recommendedValue?: string;
  }>;
  limitations: string[];
  messages?: {
    renderingReason: string;
  };
  performance?: {
    mobile?: {
      error: string;
      opportunities: Array<{ id: string; title: string; description: string }>;
    };
    desktop?: {
      error: string;
      opportunities: Array<{ id: string; title: string; description: string }>;
    };
  };
  linkErrors: Array<{
    destination: string;
    error: string;
  }>;
  articleIntelligence?: {
    methodologyNote: string;
    dimensions: Array<{
      key: ArticleDimensionKey;
      label: string;
      summary: string;
      strengths: string[];
      gaps: string[];
    }>;
  };
  aiNarrative?: {
    executiveSummary: string;
    dimensionAnalyses: Array<{
      key: ArticleDimensionKey;
      score: number;
      verdict: string;
      evidenceSummary: string;
      strengths: string[];
      gaps: string[];
      optimizationActions: string[];
    }>;
    priorityRoadmap: Array<{
      priority: "P0" | "P1" | "P2";
      findingIds: string[];
      action: string;
      expectedEvidenceChange: string;
      validation: string;
    }>;
    recommendations: Array<{
      findingId: string;
      explanation: string;
      fix: string;
      caution: string;
    }>;
  };
  disclaimer: string;
}
