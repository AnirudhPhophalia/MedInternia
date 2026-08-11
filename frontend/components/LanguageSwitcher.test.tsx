import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LanguageSwitcher from "./LanguageSwitcher";

const mockChangeLanguage = jest.fn();

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        i18n: {
            resolvedLanguage: "en",
            changeLanguage: mockChangeLanguage,
        },
    }),
}));

describe("LanguageSwitcher", () => {
    jest.setTimeout(20000);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the language switcher after mounting", async () => {
        render(<LanguageSwitcher />);

        expect(
            await screen.findByRole("button")
        ).toBeInTheDocument();
    });

    it("opens the language menu when clicked", async () => {
        render(<LanguageSwitcher />);

        const button = await screen.findByRole("button");

        fireEvent.click(button);

        expect(await screen.findByText("English")).toBeInTheDocument();
        expect(screen.getByText("Español")).toBeInTheDocument();
        expect(screen.getByText("Français")).toBeInTheDocument();
    });

    it("shows English as the selected language", async () => {
        render(<LanguageSwitcher />);

        fireEvent.click(await screen.findByRole("button"));

        const english = await screen.findByText("English");

        expect(english.closest('[role="menuitem"]')).toHaveClass(
            "Mui-selected"
        );
    });

    it("changes the language when Spanish is selected", async () => {
        render(<LanguageSwitcher />);

        fireEvent.click(await screen.findByRole("button"));

        fireEvent.click(await screen.findByText("Español"));

        expect(mockChangeLanguage).toHaveBeenCalledWith("es");
    });

    it("changes the language when French is selected", async () => {
        render(<LanguageSwitcher />);

        fireEvent.click(await screen.findByRole("button"));

        fireEvent.click(await screen.findByText("Français"));

        expect(mockChangeLanguage).toHaveBeenCalledWith("fr");
    });

    it("closes the menu after selecting a language", async () => {
        render(<LanguageSwitcher />);

        fireEvent.click(await screen.findByRole("button"));

        expect(await screen.findByText("Español")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Español"));

        await waitFor(() => {
            expect(screen.queryByText("Español")).not.toBeInTheDocument();
        });
    });
});