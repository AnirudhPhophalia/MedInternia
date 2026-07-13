import React from "react";
import { render, screen } from "@testing-library/react";
import BadgeCard from "./BadgeCard";

// Mock next/link to prevent router issues in tests
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("BadgeCard Component", () => {
  const mockBadge = {
    name: "Medical Hero",
    description: "Awarded for exceptional care",
    _idx: 0,
  };

  it("renders the badge name", () => {
    render(<BadgeCard badge={mockBadge} />);
    
    // The component renders the badge name inside a Typography component
    expect(screen.getByText("Medical Hero")).toBeInTheDocument();
  });

  it("renders the badge description", () => {
    render(<BadgeCard badge={mockBadge} />);
    
    expect(screen.getByText("Awarded for exceptional care")).toBeInTheDocument();
  });
});
