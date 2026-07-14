import { describe, expect, it } from "vitest";
import {
  classifyTargetStatus,
  detectBotChallenge,
  evaluateRobotsAccess,
  parseRobots,
  shouldAutoRender
} from "../worker/lib/evidence";
import { validatePublicUrl } from "../worker/lib/security";

describe("target response classification", () => {
  it("accepts successful HTML response statuses", () => {
    expect(classifyTargetStatus(200)).toBeNull();
  });

  it("classifies forbidden responses", () => {
    expect(classifyTargetStatus(403)?.code).toBe("TARGET_FORBIDDEN");
  });

  it("classifies not-found responses", () => {
    expect(classifyTargetStatus(404)?.code).toBe("TARGET_NOT_FOUND");
  });

  it("classifies rate-limited responses", () => {
    expect(classifyTargetStatus(429)?.code).toBe("TARGET_RATE_LIMITED");
  });

  it("classifies target server errors", () => {
    expect(classifyTargetStatus(503)?.code).toBe("TARGET_SERVER_ERROR");
  });
});

describe("bot challenge detection", () => {
  it("detects a common challenge page", () => {
    expect(detectBotChallenge("<html><title>Just a moment...</title><p>Checking your browser before accessing</p></html>", 200).detected).toBe(true);
  });

  it("does not flag ordinary content", () => {
    expect(detectBotChallenge("<html><title>Documentation</title><main>Useful public documentation content.</main></html>", 200).detected).toBe(false);
  });

  it("does not treat an ordinary page with an embedded CAPTCHA form as a challenge", () => {
    const article = Array.from({ length: 180 }, (_, index) => `article-word-${index}`).join(" ");
    expect(detectBotChallenge(`<html><main>${article}</main><form><div class="g-recaptcha"></div></form></html>`, 200).detected).toBe(false);
  });

  it("detects a thin CAPTCHA challenge response", () => {
    expect(detectBotChallenge('<html><main>Please verify you are human</main><div class="hcaptcha"></div></html>', 403).detected).toBe(true);
  });
});

describe("robots.txt evaluation", () => {
  it("uses an exact AuditicleBot group before wildcard", () => {
    const parsed = parseRobots("User-agent: *\nAllow: /\n\nUser-agent: AuditicleBot\nDisallow: /private/");
    const decision = evaluateRobotsAccess("https://example.com/private/report", parsed);
    expect(decision.allowed).toBe(false);
    expect(decision.matchedAgent).toBe("AuditicleBot");
  });

  it("falls back to the wildcard group", () => {
    const parsed = parseRobots("User-agent: *\nDisallow: /blocked/");
    expect(evaluateRobotsAccess("https://example.com/blocked/page", parsed).allowed).toBe(false);
  });

  it("uses the longest matching rule", () => {
    const parsed = parseRobots("User-agent: *\nDisallow: /folder/\nAllow: /folder/public/");
    expect(evaluateRobotsAccess("https://example.com/folder/public/page", parsed).allowed).toBe(true);
  });

  it("lets Allow win when specificity is tied", () => {
    const parsed = parseRobots("User-agent: *\nDisallow: /same\nAllow: /same");
    expect(evaluateRobotsAccess("https://example.com/same", parsed).allowed).toBe(true);
  });
});


describe("public URL safety", () => {
  it("rejects private IPv4 targets", () => {
    expect(() => validatePublicUrl("http://192.168.1.20/article")).toThrow(/Private or local network/);
  });

  it("rejects loopback and local hostnames", () => {
    expect(() => validatePublicUrl("http://localhost/article")).toThrow(/Private or local network/);
    expect(() => validatePublicUrl("http://service.internal/article")).toThrow(/Private or local network/);
  });

  it("allows a normal public HTTPS URL", () => {
    expect(validatePublicUrl("https://example.com/article#section").toString()).toBe("https://example.com/article");
  });
});

describe("rendering heuristic", () => {
  it("requests rendering for a JavaScript application shell", () => {
    expect(shouldAutoRender('<html><body><div id="root"></div><script src="/app.js"></script><script></script><script></script><script></script></body></html>')).toBe(true);
  });

  it("keeps substantial server-rendered content in server mode", () => {
    const words = Array.from({ length: 250 }, (_, index) => `word${index}`).join(" ");
    expect(shouldAutoRender(`<html><body><main>${words}</main></body></html>`)).toBe(false);
  });
});
