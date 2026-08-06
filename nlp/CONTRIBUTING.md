
```markdown
# Contributing to MedInternia NLP Service

Thank you for your interest in contributing to the **NLP (Biomedical NER) microservice** — especially for GSSoC! This service is built with **FastAPI** and uses HuggingFace biomedical NER models. Please follow the guidelines below.

> 📖 Refer to [`nlp/README.md`](./README.md) for full API documentation, architecture details, and model information before you start.

---

## 1. Dev Environment Setup

1. Fork the repository and clone your fork:
```bash
git clone https://github.com/<your-username>/MedInternia.git
cd MedInternia/nlp
```

2. Create a virtual environment:
```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy the environment file:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# Linux/macOS
cp .env.example .env
```

5. Start the server:
```bash
uvicorn app.main:app --reload --port 8001
```

Service will be live at **http://localhost:8001** (docs at `/docs`).

---

## 2. Finding an Issue to Work On

- Look for issues labeled `good first issue` or `help wanted` under the NLP service.
- Comment on the issue to let maintainers know you're working on it, before starting.
- If you'd like to work on something not yet listed as an issue, open a new issue first to discuss it.

---

## 3. Branch Naming Conventions

Create a new branch from `main` before starting work. Use this format:

```
<type>/<short-description>
```

| Type | Use case | Example |
|------|----------|---------|
| `feat/` | New feature | `feat/add-batch-endpoint` |
| `fix/` | Bug fix | `fix/entity-overlap-bug` |
| `docs/` | Documentation changes | `docs/update-readme` |
| `test/` | Adding/updating tests | `test/ner-edge-cases` |
| `refactor/` | Code cleanup, no behavior change | `refactor/pipeline-loader` |

Example:
```bash
git checkout -b feat/add-batch-endpoint
```

---

## 4. Coding Standards / Style Guide

- Follow **PEP 8** for Python code.
- Use **type hints** for all function signatures.
- Keep functions small and focused — one responsibility per function.
- Use descriptive variable names (avoid `x`, `temp`, `data1`, etc.).
- (Optional) Format code with `black` before committing, if the project adopts it:
```bash
pip install black
black app/
```
- Add docstrings to public functions/classes explaining purpose, parameters, and return values.
- Avoid hardcoding values — use environment variables (see `.env.example`).

---

## 5. Testing Requirements Before PR

All contributions **must** include or update relevant tests before a PR is opened.

1. Run the full test suite locally:
```bash
pytest tests/ -v
```

2. Make sure all tests pass — mocked pipelines are used, so **no model download is required**.

3. If you added a new endpoint or feature, add corresponding test cases in `tests/test_ner_service.py`.

4. Do not open a PR with failing tests or reduced test coverage.

---

## 6. How to Raise a Pull Request

1. Commit your changes with a clear, descriptive message:
```bash
git add .
git commit -m "feat: add batch extraction endpoint"
```

2. Push your branch to your fork:
```bash
git push origin feat/add-batch-endpoint
```

3. Open a pull request against the `main` branch of the upstream repo.

4. In your PR description, include:
   - What the change does
   - Why it's needed
   - Link to the related issue (e.g. `Closes #1084`)
   - Screenshots/output if applicable (e.g. API response)

5. Respond to review comments promptly and update your branch as needed.

---

## Code of Conduct

- Be respectful and constructive in all discussions and reviews.
- Assume good intent — everyone is here to learn and contribute.
- No harassment, discrimination, or disrespectful language will be tolerated.
- Ask questions if something is unclear — maintainers and the community are here to help.
- Give credit where due and be patient with new contributors.

---

Maintainers will review your PR and provide feedback. Thank you for helping improve MedInternia! 🚀
```
