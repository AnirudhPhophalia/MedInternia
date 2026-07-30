import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InternshipCard from "./InternshipCard";

// Mock BookmarkButton & next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href || "#"}>{children}</a>
  );
});

jest.mock("./BookmarkButton", () => {
  return () => <button data-testid="bookmark-button">Bookmark</button>;
});

describe("InternshipCard Component", () => {
  it("renders default placeholder text and icons when no internship prop is supplied", () => {
    render(<InternshipCard />);

    // Default placeholders
    expect(screen.getByText("Clinical Cardiology Internship")).toBeInTheDocument();
    expect(screen.getByText("Metropolitan General Hospital")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("6 Months")).toBeInTheDocument();
    expect(screen.getByText("Apply Now")).toBeInTheDocument();
  });

  it("renders custom internship data supplied via props", () => {
    const customInternship = {
      _id: "int-101",
      title: "Pediatric Surgery Internship",
      hospitalName: "St. Jude Children's Hospital",
      specialty: "Pediatrics",
      duration: "12 Months",
      location: "Chicago, IL",
      status: "Open",
    };

    render(<InternshipCard internship={customInternship} />);

    expect(screen.getByText("Pediatric Surgery Internship")).toBeInTheDocument();
    expect(screen.getByText("St. Jude Children's Hospital")).toBeInTheDocument();
    expect(screen.getByText("Pediatrics")).toBeInTheDocument();
    expect(screen.getByText("12 Months")).toBeInTheDocument();
    expect(screen.getByText("Chicago, IL")).toBeInTheDocument();
  });

  it("calls onApply handler when the Apply Now button is clicked", () => {
    const handleApply = jest.fn();
    const customInternship = {
      _id: "int-102",
      title: "Neurology Internship",
    };

    render(<InternshipCard internship={customInternship} onApply={handleApply} />);

    const applyButton = screen.getByRole("button", { name: /apply now/i });
    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(customInternship);
  });

  it("renders Applied state and disables the button when isApplied is true", () => {
    render(<InternshipCard isApplied={true} />);

    const appliedBtn = screen.getByRole("button", { name: /applied/i });
    expect(appliedBtn).toBeInTheDocument();
    expect(appliedBtn).toBeDisabled();
  });
});
