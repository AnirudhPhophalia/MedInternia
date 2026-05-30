import os
from openai import OpenAI
from google import genai

provider = os.getenv("AI_PROVIDER", "openai")

code = ""

for root, dirs, files in os.walk("."):
    for file in files:
        if file.endswith((".py", ".js", ".ts")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    code += f"\nFILE:{path}\n"
                    code += f.read()[:4000]
            except:
                pass

prompt = f"""
Review this code.
Find:
1 Bugs
2 Security issues
3 Performance problems
4 Refactoring ideas

Code:
{code}
"""

if provider == "openai":
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY is not set; skipping OpenAI review.")
        raise SystemExit(0)

    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt
        )
        print(response.output_text)
    except Exception as exc:
        print(f"OpenAI review failed: {exc}")
        raise SystemExit(0)

elif provider == "gemini":
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY is not set; skipping Gemini review.")
        raise SystemExit(0)

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        print(response.text)
    except Exception as exc:
        print(f"Gemini review failed: {exc}")
        raise SystemExit(0)