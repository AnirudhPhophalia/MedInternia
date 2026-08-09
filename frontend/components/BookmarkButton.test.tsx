import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BookmarkButton from "./BookmarkButton";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

jest.mock("../utils/api");
jest.mock("../context/AuthContext");

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("BookmarkButton", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockedUseAuth.mockReturnValue({
            userId: "user-1",
            user: {
                _id: "user-1",
                savedCases: [],
                savedJobs: [],
                savedWebinars: [],
            },
            isAuthenticated: true,
            isLoading: false,
            login: jest.fn(),
            logout: jest.fn(),
            refreshUser: jest.fn(),
        });

        mockedApi.get.mockResolvedValue({
            data: {
                user: {
                    savedCases: [],
                    savedJobs: [],
                    savedWebinars: [],
                },
            },
        } as any);
    });

    it("renders bookmark button", async () => {
        render(<BookmarkButton itemType="case" itemId="123" />);

        expect(await screen.findByRole("button")).toBeInTheDocument();
    });

    it("shows bookmarked state when already saved", async () => {
        mockedUseAuth.mockReturnValue({
            userId: "user-1",
            user: {
                _id: "user-1",
                savedCases: ["123"],
                savedJobs: [],
                savedWebinars: [],
            },
            isAuthenticated: true,
            isLoading: false,
            login: jest.fn(),
            logout: jest.fn(),
            refreshUser: jest.fn(),
        });

        render(<BookmarkButton itemType="case" itemId="123" />);

        await waitFor(() => {
            expect(
                screen.getByLabelText(/remove from saved items/i)
            ).toBeInTheDocument();
        });
    });

    it("toggles bookmark on click", async () => {
        mockedApi.post.mockResolvedValue({
            data: {
                success: true,
                data: {
                    isBookmarked: true,
                },
            },
        } as any);

        render(<BookmarkButton itemType="case" itemId="123" />);

        const button = await screen.findByRole("button");

        fireEvent.click(button);

        await waitFor(() => {
            expect(mockedApi.post).toHaveBeenCalledWith(
                "/users/user-1/save/case/123"
            );
        });
    });

    it("does nothing when no authenticated user exists", async () => {
        mockedUseAuth.mockReturnValue({
            userId: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            login: jest.fn(),
            logout: jest.fn(),
            refreshUser: jest.fn(),
        });

        render(<BookmarkButton itemType="case" itemId="123" />);

        const button = await screen.findByRole("button");

        fireEvent.click(button);

        expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it("handles API failures gracefully", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => { });

        mockedApi.post.mockRejectedValue(new Error("failed"));

        render(<BookmarkButton itemType="case" itemId="123" />);

        fireEvent.click(await screen.findByRole("button"));

        await waitFor(() => {
            expect(errorSpy).toHaveBeenCalled();
        });

        errorSpy.mockRestore();
    });
});