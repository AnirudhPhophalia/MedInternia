import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Chatbot from "./Chatbot";
import api from "../utils/api";

jest.mock("../utils/api");
jest.mock("next/router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe("Chatbot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends the user message to the /chatbot endpoint", async () => {
    mockedApi.post.mockResolvedValue({
      data: { reply: "The AI generated answer." },
    } as any);

    render(<Chatbot initialOpen />);

    fireEvent.change(screen.getByLabelText(/ask the medinternia assistant/i), {
      target: { value: "What is pneumonia?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/chatbot", {
        message: "What is pneumonia?",
      });
    });

    expect(
      await screen.findByText("The AI generated answer.")
    ).toBeInTheDocument();
  });

  it("shows a typing indicator while waiting for the response", async () => {
    let resolvePost: (value: any) => void;
    mockedApi.post.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    render(<Chatbot initialOpen />);

    fireEvent.change(screen.getByLabelText(/ask the medinternia assistant/i), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByLabelText(/ai is typing/i)).toBeInTheDocument();

    resolvePost!({ data: { reply: "Hi there!" } } as any);
    expect(
      await screen.findByText("Hi there!")
    ).toBeInTheDocument();
  });

  it("renders a fallback message when the API call fails", async () => {
    mockedApi.post.mockRejectedValue(new Error("network error"));

    render(<Chatbot initialOpen />);

    fireEvent.change(screen.getByLabelText(/ask the medinternia assistant/i), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/couldn't reach the ai service/i)
    ).toBeInTheDocument();
  });

  it("does not call the API for empty input", () => {
    render(<Chatbot initialOpen />);

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});
