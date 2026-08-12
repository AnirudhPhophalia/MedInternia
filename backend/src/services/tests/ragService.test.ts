import { ingestCase, deleteCaseVectors, suggestCases } from "../ragService";
import { clearCircuitBreakers } from "../../utils/resilientHttpClient";

describe("ragService with Circuit Breaker and Retry logic", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearCircuitBreakers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearCircuitBreakers();
  });

  describe("ingestCase", () => {
    it("should successfully ingest case vectors when service responds 200 OK", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      await ingestCase("case-123", "Sample medical text", { tag: "cardiology" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/ingest-case");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        case_id: "case-123",
        text: "Sample medical text",
        metadata: { tag: "cardiology" },
      });
    });

    it("should retry transient 500 errors and succeed on retry", async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });
      global.fetch = mockFetch;

      await ingestCase("case-124", "Text requiring retry");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should log error if non-transient 400 is returned without retry loop", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });
      global.fetch = mockFetch;

      await ingestCase("case-125", "Invalid data");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("RAG ingest failed for case case-125 (400): Bad Request")
      );
      consoleSpy.mockRestore();
    });
  });

  describe("deleteCaseVectors", () => {
    it("should successfully delete case vectors", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      await deleteCaseVectors("case-999");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/delete-case");
      expect(JSON.parse(options.body)).toEqual({ case_id: "case-999" });
    });
  });

  describe("suggestCases", () => {
    it("should return suggested cases on 200 OK response", async () => {
      const mockResults = [
        { case_id: "c1", score: 0.95, metadata: {}, text_snippet: "Snippet 1" },
        { case_id: "c2", score: 0.88, metadata: {}, text_snippet: "Snippet 2" },
      ];
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: mockResults }),
      });
      global.fetch = mockFetch;

      const suggestions = await suggestCases("symptoms of fever", 2);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(suggestions).toEqual(mockResults);
    });

    it("should return empty array on service failure", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      global.fetch = mockFetch;

      const suggestions = await suggestCases("symptoms of fever", 2);

      expect(suggestions).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe("Circuit Breaker Behavior", () => {
    it("should trip circuit breaker after repeated failures and fast-fail subsequent calls", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const consoleErrSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = jest.fn().mockRejectedValue(new Error("Service Unavailable"));
      global.fetch = mockFetch;

      // Make repeated calls to trigger failure volume and error percentage threshold
      for (let i = 0; i < 5; i++) {
        await suggestCases("query", 1);
      }

      const callsBeforeOpen = mockFetch.mock.calls.length;

      // Next call should fast-fail due to OPEN circuit breaker without invoking fetch
      await suggestCases("query", 1);

      expect(mockFetch.mock.calls.length).toBe(callsBeforeOpen);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[CircuitBreaker] Circuit OPEN for service: python-rag-service")
      );

      consoleWarnSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });
});
