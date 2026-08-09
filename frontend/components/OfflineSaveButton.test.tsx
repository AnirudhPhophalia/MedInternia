import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OfflineSaveButton from "./OfflineSaveButton";

class MockResponse {
    body: string;

    constructor(body = "") {
        this.body = body;
    }
}

describe("OfflineSaveButton", () => {
    const caseId = "case-123";
    const caseData = {
        _id: caseId,
        title: "Test Medical Case",
        description: "Test case description",
    };

    let mockCache: {
        put: jest.Mock;
        add: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        Object.defineProperty(global, "Response", {
            configurable: true,
            value: MockResponse,
        });

        mockCache = {
            put: jest.fn().mockResolvedValue(undefined),
            add: jest.fn().mockResolvedValue(undefined),
        };

        Object.defineProperty(window, "caches", {
            configurable: true,
            value: {
                match: jest.fn().mockResolvedValue(undefined),
                open: jest.fn().mockResolvedValue(mockCache),
            },
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("renders the Save Offline button initially", () => {
        render(
            <OfflineSaveButton
                caseId={caseId}
                caseData={caseData}
            />
        );

        expect(
            screen.getByRole("button", { name: /save offline/i })
        ).toBeInTheDocument();
    });

    it("saves the case successfully for offline viewing", async () => {
        render(
            <OfflineSaveButton
                caseId={caseId}
                caseData={caseData}
            />
        );

        fireEvent.click(
            screen.getByRole("button", { name: /save offline/i })
        );

        await waitFor(() => {
            expect(window.caches.open).toHaveBeenCalledWith(
                "medinternia-offline-cases"
            );
        });

        expect(mockCache.put).toHaveBeenCalledWith(
            `/api/cases/${caseId}`,
            expect.anything()
        );

        expect(mockCache.add).toHaveBeenCalledWith(
            `/cases/${caseId}`
        );

        expect(
            await screen.findByText("Case saved for offline viewing!")
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: /saved offline/i })
        ).toBeDisabled();
    });

    it("shows Saved Offline when the case is already cached", async () => {
        (window.caches.match as jest.Mock).mockResolvedValue(
            new MockResponse("cached")
        );

        render(
            <OfflineSaveButton
                caseId={caseId}
                caseData={caseData}
            />
        );

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /saved offline/i })
            ).toBeInTheDocument();
        });

        expect(
            screen.getByRole("button", { name: /saved offline/i })
        ).toBeDisabled();
    });

    it("shows an error when Cache API is unavailable", async () => {
        const cachesDescriptor = Object.getOwnPropertyDescriptor(
            window,
            "caches"
        );

        Object.defineProperty(window, "caches", {
            configurable: true,
            value: undefined,
        });

        Reflect.deleteProperty(window, "caches");

        render(
            <OfflineSaveButton
                caseId={caseId}
                caseData={caseData}
            />
        );

        fireEvent.click(
            screen.getByRole("button", { name: /save offline/i })
        );

        expect(
            await screen.findByText(
                "Offline mode is not supported in this browser."
            )
        ).toBeInTheDocument();

        if (cachesDescriptor) {
            Object.defineProperty(window, "caches", cachesDescriptor);
        }
    });

    it("shows an error when saving to the cache fails", async () => {
        const errorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });

        mockCache.put.mockRejectedValue(new Error("Cache write failed"));

        render(
            <OfflineSaveButton
                caseId={caseId}
                caseData={caseData}
            />
        );

        fireEvent.click(
            screen.getByRole("button", { name: /save offline/i })
        );

        expect(
            await screen.findByText("Failed to save offline.")
        ).toBeInTheDocument();

        expect(errorSpy).toHaveBeenCalled();

        errorSpy.mockRestore();
    });

    it("disables the button while saving", async () => {
        let resolvePut: () => void = () => { };

        mockCache.put.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolvePut = resolve;
                })
        );

        render(
            <OfflineSaveButton
                caseId={caseId}
                caseData={caseData}
            />
        );

        fireEvent.click(
            screen.getByRole("button", { name: /save offline/i })
        );

        const savingButton = await screen.findByRole("button", {
            name: /saving/i,
        });

        expect(savingButton).toBeDisabled();

        resolvePut();

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /saved offline/i })
            ).toBeDisabled();
        });
    });

    it("does not perform another save when already saved", async () => {
        (window.caches.match as jest.Mock).mockResolvedValue(
            new MockResponse("cached")
        );

        render(
            <OfflineSaveButton
                caseId={caseId}
                caseData={caseData}
            />
        );

        const button = await screen.findByRole("button", {
            name: /saved offline/i,
        });

        fireEvent.click(button);

        expect(window.caches.open).not.toHaveBeenCalled();
    });
});
