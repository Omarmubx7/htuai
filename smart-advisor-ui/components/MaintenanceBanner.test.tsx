import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

// vi.mock is hoisted above imports, so the spy must be created with vi.hoisted.
const { useSitePolicy } = vi.hoisted(() => ({ useSitePolicy: vi.fn() }));

vi.mock("@/lib/use-site-policy", () => ({ useSitePolicy }));

import MaintenanceBanner from "./MaintenanceBanner";

const basePolicy = {
  upload: {
    maxFileSizeMb: DEFAULT_SETTINGS.upload.maxFileSizeMb,
    maxFilesPerBatch: DEFAULT_SETTINGS.upload.maxFilesPerBatch,
    maxUploadsPerDay: DEFAULT_SETTINGS.upload.maxUploadsPerDay,
    allowedExtensions: DEFAULT_SETTINGS.upload.allowedExtensions,
  },
  resources: {
    enabled: DEFAULT_SETTINGS.resources.enabled,
    uploadsEnabled: DEFAULT_SETTINGS.resources.uploadsEnabled,
    reportHideThreshold: DEFAULT_SETTINGS.resources.reportHideThreshold,
  },
  content: DEFAULT_SETTINGS.content,
};

describe("MaintenanceBanner", () => {
  beforeEach(() => {
    useSitePolicy.mockReset();
  });

  it("renders nothing when maintenance mode is disabled", () => {
    useSitePolicy.mockReturnValue({
      ...basePolicy,
      maintenance: { enabled: false, message: "Down for maintenance" },
    });

    const { container } = render(<MaintenanceBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the configured message when maintenance mode is enabled", () => {
    useSitePolicy.mockReturnValue({
      ...basePolicy,
      maintenance: { enabled: true, message: "Back at 14:00 UTC" },
    });

    render(<MaintenanceBanner />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Back at 14:00 UTC");
  });

  it("renders a single banner element", () => {
    useSitePolicy.mockReturnValue({
      ...basePolicy,
      maintenance: { enabled: true, message: "Scheduled maintenance" },
    });

    render(<MaintenanceBanner />);

    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
