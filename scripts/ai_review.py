import os
from pathlib import Path


PROVIDER_KEYS = {
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
}


def collect_code_snippets() -> str:
    code = []
    for path in Path(".").rglob("*"):
        if not path.is_file() or path.suffix not in {".py", ".js", ".ts"}:
            continue

        try:
            snippet = path.read_text(encoding="utf-8")[:4000]
            code.append(f"\nFILE:{path}\n{snippet}")
        except UnicodeDecodeError:
            continue

    return "".join(code)


def main() -> None:
    provider = os.getenv("AI_PROVIDER", "openai").lower()
    api_key_name = PROVIDER_KEYS.get(provider)

    if api_key_name is None:
        print(f"Skipping AI review: unsupported provider {provider!r}.")
        return

    api_key = os.getenv(api_key_name)
    if not api_key:
        print(f"Skipping {provider} AI review: {api_key_name} is not configured.")
        return

    prompt = f"""
Review this code.
Find:
1 Bugs
2 Security issues
3 Performance problems
4 Refactoring ideas

Code:
{collect_code_snippets()}
"""

    if provider == "openai":
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        response = client.responses.create(model="gpt-4.1-mini", input=prompt)
        print(response.output_text)
        return

    import google.generativeai as genai

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt)
    print(response.text)


if __name__ == "__main__":
    main()
