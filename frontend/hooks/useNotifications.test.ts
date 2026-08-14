import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotifications, Notification } from "./useNotifications";
import api from "../utils/api";
import { io } from "socket.io-client";

const mockNotification = jest.fn();

const setNotificationMock = (
    permission: "default" | "granted" | "denied",
    requestPermission = jest.fn()
) => {
    mockNotification.mockClear();

    Object.defineProperty(mockNotification, "permission", {
        configurable: true,
        value: permission,
    });

    Object.defineProperty(mockNotification, "requestPermission", {
        configurable: true,
        value: requestPermission,
    });

    Object.defineProperty(window, "Notification", {
        configurable: true,
        writable: true,
        value: mockNotification,
    });
};

jest.mock("../utils/api", () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        patch: jest.fn(),
    },
    getSocketUrl: jest.fn(() => "http://localhost:3000"),
    getAuthToken: jest.fn(() => "authenticated"),
}));

jest.mock("socket.io-client", () => ({
    io: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockIo = io as jest.Mock;
const originalNotification = globalThis.Notification;

describe("useNotifications", () => {
    let socket: {
        on: jest.Mock;
        disconnect: jest.Mock;
    };

    const notifications: Notification[] = [
        {
            _id: "1",
            type: "comment",
            message: "New comment",
            isRead: false,
            createdAt: "2026-01-01T10:00:00.000Z",
        },
        {
            _id: "2",
            type: "job_status",
            message: "Job application updated",
            isRead: true,
            createdAt: "2026-01-01T09:00:00.000Z",
        },
    ];

    function mockBrowserNotification(
        permission: NotificationPermission,
        requestPermission?: jest.Mock
    ) {
        class MockNotification {
            static permission = permission;
            static requestPermission =
                requestPermission || jest.fn().mockResolvedValue(permission);

            constructor(
                public title: string,
                public options?: NotificationOptions
            ) { }
        }

        Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            writable: true,
            value: MockNotification,
        });

        return MockNotification;
    }

    beforeEach(() => {
        jest.clearAllMocks();

        socket = {
            on: jest.fn(),
            disconnect: jest.fn(),
        };

        mockIo.mockReturnValue(socket);

        mockApi.get.mockResolvedValue({
            data: {
                success: true,
                notifications,
            },
        });

        // Keep Notification defined for every test.
        // This prevents tests that trigger socket events from crashing.
        setNotificationMock("default");
    });

    afterEach(() => {
        jest.restoreAllMocks();

        Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            writable: true,
            value: originalNotification,
        });
    });

    it("loads notifications from the API", async () => {
        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        expect(mockApi.get).toHaveBeenCalledWith("/notifications");
    });

    it("calculates the unread notification count", async () => {
        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.unreadCount).toBe(1);
        });
    });

    it("connects to Socket.IO when the hook mounts", async () => {
        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        expect(mockIo).toHaveBeenCalledWith(
            "http://localhost:3000",
            expect.objectContaining({
                withCredentials: true,
                transports: ["websocket", "polling"],
                reconnectionAttempts: 5,
            })
        );

        expect(socket.on).toHaveBeenCalledWith(
            "new_notification",
            expect.any(Function)
        );
    });

    it("disconnects the socket when the hook unmounts", async () => {
        const { result, unmount } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        unmount();

        expect(socket.disconnect).toHaveBeenCalledTimes(1);
    });

    it("adds a real-time notification and creates a toast", async () => {
        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        const newNotification: Notification = {
            _id: "3",
            type: "webinar",
            message: "New webinar available",
            isRead: false,
            createdAt: "2026-01-01T11:00:00.000Z",
        };

        const socketHandler = socket.on.mock.calls.find(
            ([event]) => event === "new_notification"
        )?.[1];

        expect(socketHandler).toBeDefined();

        act(() => {
            socketHandler(newNotification);
        });

        expect(result.current.notifications[0]).toEqual(newNotification);
        expect(result.current.newToast).toEqual(newNotification);
    });

    it("triggers a native browser notification when permission is granted", async () => {
        setNotificationMock("granted");

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        const newNotification: Notification = {
            _id: "4",
            type: "badge",
            message: "You earned a badge",
            isRead: false,
            createdAt: "2026-01-01T12:00:00.000Z",
        };

        const socketHandler = socket.on.mock.calls.find(
            ([event]) => event === "new_notification"
        )?.[1];

        act(() => {
            socketHandler(newNotification);
        });

        expect(mockNotification).toHaveBeenCalledWith(
            "MedInternia Alert",
            {
                body: "You earned a badge",
                icon: "/favicon.ico",
            }
        );
    });

    it("marks a notification as read optimistically", async () => {
        mockApi.patch.mockResolvedValue({ data: { success: true } });

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        await act(async () => {
            await result.current.markAsRead("1");
        });

        expect(result.current.notifications[0].isRead).toBe(true);
        expect(result.current.notifications[1].isRead).toBe(true);

        expect(mockApi.patch).toHaveBeenCalledWith("/notifications/1/read");
    });

    it("restores the previous notification state when markAsRead fails", async () => {
        mockApi.get.mockResolvedValueOnce({
            data: {
                success: true,
                notifications,
            },
        });

        mockApi.patch.mockRejectedValueOnce(new Error("Network error"));

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });

        const { result } = renderHook(() => useNotifications());

        // Wait specifically for the initial GET to populate state.
        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(2);
        });

        expect(result.current.notifications).toEqual(notifications);

        await act(async () => {
            await result.current.markAsRead("1");
        });

        // The failed request should restore the exact previous state.
        expect(result.current.notifications).toEqual(notifications);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Failed to mark notification as read:",
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it("restores all notifications when markAllAsRead fails", async () => {
        mockApi.get.mockResolvedValueOnce({
            data: {
                success: true,
                notifications,
            },
        });

        mockApi.patch.mockRejectedValueOnce(new Error("Network error"));

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(2);
        });

        expect(result.current.notifications).toEqual(notifications);
        expect(result.current.unreadCount).toBe(1);

        await act(async () => {
            await result.current.markAllAsRead();
        });

        expect(result.current.notifications).toEqual(notifications);
        expect(result.current.unreadCount).toBe(1);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Failed to mark all notifications as read:",
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it("clears the current toast", async () => {
        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        const newNotification: Notification = {
            _id: "5",
            type: "peer_review",
            message: "Your review was received",
            isRead: false,
            createdAt: "2026-01-01T13:00:00.000Z",
        };

        const socketHandler = socket.on.mock.calls.find(
            ([event]) => event === "new_notification"
        )?.[1];

        act(() => {
            socketHandler(newNotification);
        });

        expect(result.current.newToast).toEqual(newNotification);

        act(() => {
            result.current.clearToast();
        });

        expect(result.current.newToast).toBeNull();
    });

    it("requests notification permission only when explicitly invoked", async () => {
        const requestPermission = jest
            .fn()
            .mockResolvedValue("granted");

        setNotificationMock("default", requestPermission);

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        expect(requestPermission).not.toHaveBeenCalled();

        await act(async () => {
            await result.current.requestNotificationPermission();
        });

        expect(requestPermission).toHaveBeenCalledTimes(1);
    });

    it("does not request permission when notifications are already granted", async () => {
        const requestPermission = jest.fn();

        setNotificationMock("granted", requestPermission);

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        await act(async () => {
            await result.current.requestNotificationPermission();
        });

        expect(requestPermission).not.toHaveBeenCalled();
    });

    it("disconnects socket and resets state when user logs out", async () => {
        const { notifyAuthChange } = await import("../context/AuthContext");

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        act(() => {
            notifyAuthChange(null);
        });

        await waitFor(() => {
            expect(socket.disconnect).toHaveBeenCalled();
            expect(result.current.notifications).toEqual([]);
            expect(result.current.unreadCount).toBe(0);
        });
    });

    it("re-initializes socket and fetches notifications when user logs in", async () => {
        const { notifyAuthChange } = await import("../context/AuthContext");

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toEqual(notifications);
        });

        const initialSocketCount = mockIo.mock.calls.length;

        act(() => {
            notifyAuthChange("user-123");
        });

        await waitFor(() => {
            expect(mockIo).toHaveBeenCalledTimes(initialSocketCount + 1);
        });
    });

});