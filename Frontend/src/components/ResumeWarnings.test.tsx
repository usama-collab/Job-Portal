import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ResumeWarnings } from "./ResumeWarnings";

afterEach(cleanup);

it("collapses old cached removal messages into a single concise warning", () => {
  const { container } = render(<ResumeWarnings warnings={Array.from({ length: 20 }, (_, i) => `Removed unsupported extraction: Skill ${i}`)} />);
  expect(screen.getByText(/Some items were omitted/)).toBeTruthy();
  expect(container.textContent).not.toContain("Removed unsupported extraction");
  expect(container.querySelectorAll("p")).toHaveLength(1);
});

it("deduplicates notes and places additional warnings in a closed disclosure", () => {
  const { container } = render(<ResumeWarnings warnings={["2 items were omitted.", "Dates are ambiguous.", "Dates are ambiguous.", "Check the project title."]} />);
  expect(screen.getByText("2 items were omitted.")).toBeTruthy();
  expect(screen.getByText("2 more notes")).toBeTruthy();
  expect(container.querySelector("details")?.open).toBe(false);
  expect(container.querySelectorAll("li")).toHaveLength(2);
});

it("renders nothing without warnings", () => {
  const { container } = render(<ResumeWarnings warnings={[]} />);
  expect(container.textContent).toBe("");
});
