import { renderHook, waitFor, act } from "@testing-library/react";
import { useNotifications } from "./useNotifications";

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockOn = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("../utils/api", () => ({
  __esModule: true,
  default: { get: (...args: any[]) => mockGet(...args), patch: (...args: any[]) => mockPatch(...args) },
  getSocketUrl: () => "http://localhost:3000",
}));

jest.mock("socket.io-client", () => ({
  io: () => ({
    on: mockOn,
    disconnect: mockDisconnect,
  }),
}));

describe("useNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "Notification", {
      value: { permission: "default" },
      writable: true,
      configurable: true,
    });
  });

  it("reads notifications from res.data.data.notifications", async () => {
    const fakeNotifications = [
      { _id: "1", type: "comment", message: "Hello", isRead: false, createdAt: "2025-01-01T00:00:00Z" },
      { _id: "2", type: "badge", message: "Badge earned", isRead: true, createdAt: "2025-01-02T00:00:00Z" },
    ];

    mockGet.mockResolvedValue({
      data: { success: true, data: { notifications: fakeNotifications } },
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    expect(result.current.notifications[0]._id).toBe("1");
    expect(result.current.unreadCount).toBe(1);
  });

  it("sets empty notifications when API returns empty array", async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: { notifications: [] } },
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("keeps notifications empty when API call fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useNotifications());

    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.notifications).toHaveLength(0);
  });

  it("does not read from res.data.notifications (wrong path)", async () => {
    const fakeNotifications = [
      { _id: "1", type: "webinar", message: "Webinar", isRead: false, createdAt: "2025-01-01T00:00:00Z" },
    ];

    mockGet.mockResolvedValue({
      data: {
        success: true,
        notifications: fakeNotifications,
        data: { notifications: fakeNotifications },
      },
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    expect(result.current.notifications[0]._id).toBe("1");
  });

  it("marks a single notification as read", async () => {
    const fakeNotifications = [
      { _id: "1", type: "comment", message: "Hi", isRead: false, createdAt: "2025-01-01T00:00:00Z" },
    ];

    mockGet.mockResolvedValue({
      data: { success: true, data: { notifications: fakeNotifications } },
    });
    mockPatch.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markAsRead("1");
    });

    expect(result.current.notifications[0].isRead).toBe(true);
    expect(mockPatch).toHaveBeenCalledWith("/notifications/1/read");
  });

  it("marks all notifications as read", async () => {
    const fakeNotifications = [
      { _id: "1", type: "comment", message: "A", isRead: false, createdAt: "2025-01-01T00:00:00Z" },
      { _id: "2", type: "badge", message: "B", isRead: false, createdAt: "2025-01-02T00:00:00Z" },
    ];

    mockGet.mockResolvedValue({
      data: { success: true, data: { notifications: fakeNotifications } },
    });
    mockPatch.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(mockPatch).toHaveBeenCalledWith("/notifications/read-all");
  });
});
