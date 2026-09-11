import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getJobById } from "../api/jobs";
import { getMyApplications } from "../api/application";
import { getMySavedJobs } from "../api/savedJobs";
import ApplyJob from "./ApplyJob";
import JobDetail from "./JobDetail";

const profileMock = vi.hoisted(() => ({
  data: undefined as undefined | {
    name: string;
    email: string;
    company_membership?: { company_id: number; role: "owner" | "manager" };
  },
}));

vi.mock("../hooks/useProfile", () => ({
  useProfile: () => ({ data: profileMock.data, isLoading: false }),
}));
vi.mock("../api/jobs", () => ({ getJobById: vi.fn() }));
vi.mock("../api/application", () => ({
  applyToJob: vi.fn(),
  getMyApplications: vi.fn(),
}));
vi.mock("../api/savedJobs", () => ({
  getMySavedJobs: vi.fn(),
  toggleSaveJob: vi.fn(),
}));

const job = {
  id: 12,
  title: "Platform Engineer",
  description: "Build reliable services.",
  company: "Acme",
  company_id: 7,
  created_at: "2026-08-20T00:00:00Z",
  is_active: true,
};

function renderRoute(element: React.ReactNode, path: string, url: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path={path} element={element} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  profileMock.data = undefined;
});

describe("application eligibility UI", () => {
  it("keeps Quick Apply available on a company manager's own job", async () => {
    localStorage.setItem("token", "test-token");
    profileMock.data = {
      name: "manager",
      email: "manager@example.com",
      company_membership: { company_id: 7, role: "manager" },
    };
    vi.mocked(getJobById).mockResolvedValue(job);
    vi.mocked(getMyApplications).mockResolvedValue([]);
    vi.mocked(getMySavedJobs).mockResolvedValue([]);

    renderRoute(<JobDetail />, "/jobs/:id", "/jobs/12");

    const applyButton = await screen.findByRole("button", { name: "Quick Apply" });
    expect(applyButton.hasAttribute("disabled")).toBe(false);
  });

  it("keeps Apply available for jobs at other companies", async () => {
    localStorage.setItem("token", "test-token");
    profileMock.data = {
      name: "owner",
      email: "owner@example.com",
      company_membership: { company_id: 8, role: "owner" },
    };
    vi.mocked(getJobById).mockResolvedValue(job);
    vi.mocked(getMyApplications).mockResolvedValue([]);
    vi.mocked(getMySavedJobs).mockResolvedValue([]);

    renderRoute(<JobDetail />, "/jobs/:id", "/jobs/12");

    expect((await screen.findByRole("button", { name: "Quick Apply" })).hasAttribute("disabled")).toBe(false);
  });

  it("shows the application form but disables submission for the managed company", async () => {
    profileMock.data = {
      name: "owner",
      email: "owner@example.com",
      company_membership: { company_id: 7, role: "owner" },
    };
    vi.mocked(getJobById).mockResolvedValue(job);

    renderRoute(<ApplyJob />, "/jobs/:id/apply", "/jobs/12/apply");

    expect(await screen.findByText("You manage this company, so you can’t apply to this job.")).toBeTruthy();
    expect(document.querySelector("input#resume")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit application" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows the direct application form for another company's job", async () => {
    profileMock.data = {
      name: "owner",
      email: "owner@example.com",
      company_membership: { company_id: 8, role: "owner" },
    };
    vi.mocked(getJobById).mockResolvedValue(job);

    renderRoute(<ApplyJob />, "/jobs/:id/apply", "/jobs/12/apply");

    expect(await screen.findByText("Platform Engineer")).toBeTruthy();
    expect(document.querySelector("input#resume")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit application" }).hasAttribute("disabled")).toBe(false);
  });
});
