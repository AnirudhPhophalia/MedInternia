import { render, screen} from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

const ThrowError = ({ message = "Test error" }: { message?: string }) => {
    throw new Error(message);
};

describe("ErrorBoundary", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("renders children normally when there is no error", () => {
        render(
            <ErrorBoundary>
                <div>Healthy content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText("Healthy content")).toBeInTheDocument();
        expect(
            screen.queryByText("Oops, something went wrong!")
        ).not.toBeInTheDocument();
    });

    it("renders fallback UI when a child throws an error", () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(
            screen.getByText("Oops, something went wrong!")
        ).toBeInTheDocument();

        expect(
            screen.getByText(/We could not load this part of MedInternia safely/i)
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: /try again/i })
        ).toBeInTheDocument();
    });

    it("renders the fallback with alert accessibility semantics", () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        const alert = screen.getByRole("alert");

        expect(alert).toBeInTheDocument();
        expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("logs the caught error", () => {
        const errorMessage = "Something broke";

        render(
            <ErrorBoundary>
                <ThrowError message={errorMessage} />
            </ErrorBoundary>
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "ErrorBoundary caught:",
            expect.objectContaining({
                message: errorMessage,
            }),
            expect.anything()
        );
    });

});