import { renderHook } from "@testing-library/react";
import { useRecentlyViewedInternships } from "./useRecentlyViewedInternships";

const STORAGE_KEY = "recentlyViewedInternships";

describe("useRecentlyViewedInternships", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads valid recently viewed internships from localStorage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          _id: "1",
          title: "Frontend Intern",
          company: "OpenAI",
          viewedAt: Date.now(),
        },
      ])
    );

    const { result } = renderHook(() => useRecentlyViewedInternships());

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]._id).toBe("1");
    expect(result.current.items[0].title).toBe("Frontend Intern");
  });

  it("filters malformed internship entries", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          _id: "1",
          title: "Frontend Intern",
          viewedAt: Date.now(),
        },
        {
          _id: "2",
        },
        null,
        "hello",
        123,
        {},
      ])
    );

    const { result } = renderHook(() => useRecentlyViewedInternships());

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]._id).toBe("1");
  });

  it("returns an empty array when localStorage contains invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{invalid json");

    const { result } = renderHook(() => useRecentlyViewedInternships());

    expect(result.current.items).toEqual([]);
  });

  it("returns an empty array when stored data is not an array", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        _id: "1",
        title: "Frontend Intern",
        viewedAt: Date.now(),
      })
    );

    const { result } = renderHook(() => useRecentlyViewedInternships());

    expect(result.current.items).toEqual([]);
  });
});