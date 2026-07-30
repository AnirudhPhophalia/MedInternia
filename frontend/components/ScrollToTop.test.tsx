import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ScrollToTop from "./ScrollToTop";

describe("ScrollToTop Component", () => {
  const originalScrollTo = window.scrollTo;

  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  afterAll(() => {
    window.scrollTo = originalScrollTo;
  });

  it("does not render button when scroll position is below threshold", () => {
    render(<ScrollToTop threshold={300} />);
    const button = screen.queryByLabelText("Scroll to top");
    expect(button).not.toBeInTheDocument();
  });

  it("renders button when scroll Y is greater than threshold", () => {
    render(<ScrollToTop threshold={300} />);

    Object.defineProperty(window, "scrollY", {
      value: 500,
      writable: true,
      configurable: true,
    });

    fireEvent.scroll(window);

    const button = screen.getByLabelText("Scroll to top");
    expect(button).toBeInTheDocument();
  });

  it("calls window.scrollTo with top: 0 and smooth behavior when clicked", () => {
    render(<ScrollToTop threshold={300} />);

    Object.defineProperty(window, "scrollY", {
      value: 500,
      writable: true,
      configurable: true,
    });

    fireEvent.scroll(window);

    const button = screen.getByLabelText("Scroll to top");
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });
});
