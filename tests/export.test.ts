import { describe, expect, it } from "vitest";
import { buildSafeExportPayload } from "../src/lib/export";

describe("safe report export", () => {
  it("omits raw source HTML while retaining extracted evidence", () => {
    const report = {
      page: { finalUrl: "https://example.com/", html: "<script>public-source</script>", status: 200 },
      extracted: { title: "Example" },
      findings: []
    } as never;
    const payload = buildSafeExportPayload(report, null);
    expect("html" in payload.report.page).toBe(false);
    expect(payload.report.extracted.title).toBe("Example");
  });
});
