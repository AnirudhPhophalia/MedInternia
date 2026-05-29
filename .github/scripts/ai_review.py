import os
from openai import OpenAI
import google.generativeai as genai

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
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY")
    )

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    print(response.output_text)

elif provider == "gemini":
    genai.configure(
        api_key=os.getenv("GEMINI_API_KEY")
    )

    model = genai.GenerativeModel(
        "gemini-2.5-flash"
    )

    response = model.generate_content(prompt)

    print(response.text)