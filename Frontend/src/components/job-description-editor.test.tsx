import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobDescriptionEditor } from "./job-description-editor";

// jsdom has no layout implementation; ProseMirror measures selections on focus.
Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() });

afterEach(cleanup);

describe("JobDescriptionEditor", () => {
  it("loads existing content and emits formatted HTML without submitting the form", async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<form onSubmit={onSubmit}><JobDescriptionEditor value="Role Overview" onChange={onChange} /></form>);
    await screen.findByRole("textbox", { name: "Job Description" });
    fireEvent.click(screen.getByRole("button", { name: "Heading" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("<h2>Role Overview</h2>"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Heading" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("updates loaded content and disables editing during save", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<JobDescriptionEditor value="Old text" onChange={onChange} />);
    rerender(<JobDescriptionEditor value="<h2>Requirements</h2><ul><li>Python</li></ul>" onChange={onChange} disabled />);
    await waitFor(() => expect(screen.getByRole("textbox").querySelector("h2")?.textContent).toBe("Requirements"));
    expect(screen.getByRole("textbox").getAttribute("contenteditable")).toBe("false");
    expect(screen.getByRole("button", { name: "Bold" }).hasAttribute("disabled")).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
