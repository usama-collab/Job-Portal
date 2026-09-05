import { describe, expect, it } from "vitest";
import { descriptionHtml, descriptionText } from "./job-description";

describe("job descriptions", () => {
  it("preserves supported formatting", () => {
    const html = "<h2>Role Overview</h2><p><strong>Build</strong> <em>products</em></p><h3>Requirements</h3><ul><li>Python</li></ul><ol><li>Apply</li></ol>";
    expect(descriptionHtml(html)).toBe(html);
    expect(descriptionText(html)).toBe("Role Overview Build products Requirements Python Apply");
  });
  it("removes executable markup and all attributes", () => {
    expect(descriptionHtml('<p onclick="alert(1)" style="color:red">Safe<img src=x onerror="alert(1)"></p><script>alert(1)</script><svg onload="alert(1)"></svg>')).toBe("<p>Safe</p>");
  });
  it("escapes legacy plain text and keeps line breaks", () => {
    expect(descriptionHtml("R&D\n2 < 5")).toBe("<p>R&amp;D<br>2 &lt; 5</p>");
    expect(descriptionText("R&D\n2 < 5")).toBe("R&D\n2 < 5");
  });
  it("recognizes visually empty HTML", () => {
    expect(descriptionText("<p>&nbsp;<br></p>").trim()).toBe("");
  });
});
