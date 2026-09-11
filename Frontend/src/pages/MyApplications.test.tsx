import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { getMyApplications } from "../api/application";
import { getMySavedJobs } from "../api/savedJobs";
import MyApplications from "./MyApplications";

vi.mock("../api/application", () => ({ getMyApplications: vi.fn() }));
vi.mock("../api/savedJobs", () => ({ getMySavedJobs: vi.fn(), toggleSaveJob: vi.fn() }));

afterEach(() => cleanup());

it("shows the job title for an applied job", async () => {
  vi.mocked(getMyApplications).mockResolvedValue([{
    id: 8,
    job_id: 2,
    job_title: "Senior Backend Engineer",
    status: "applied",
    created_at: "2026-09-12T00:00:00Z",
    user_id: 4,
  }]);
  vi.mocked(getMySavedJobs).mockResolvedValue([]);

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><MyApplications /></MemoryRouter>
    </QueryClientProvider>,
  );

  expect(await screen.findByRole("heading", { name: "Senior Backend Engineer" })).toBeTruthy();
  expect(screen.queryByText("Position ID: #2")).toBeNull();
});
