# OWL Project Development Guidelines

## Build Commands
- Frontend: `cd frontend && npm run dev` (run development server)
- Frontend: `cd frontend && npm run build` (build for production)
- Frontend: `cd frontend && npm run lint` (run ESLint)
- Backend: `python owl_api/main.py` (start FastAPI backend)
- Run examples: `python examples/run_mini.py` (minimal example)
- Run examples: `python examples/run_test_browser.py` (browser test)

## Testing
- No formal test framework yet. Examples can be run as functional tests.
- When adding tests, follow pytest conventions.

## Code Style
- Python: PEP 8 compliant, use type hints
- TypeScript: Use strict types, interfaces for props
- Import order: standard library, third-party, local modules
- Error handling: Use try/except with specific exceptions in Python
- React components: Functional components with hooks
- Naming: camelCase for JS/TS, snake_case for Python

## Formatting
- Python: 4-space indentation, line length 79 chars
- TypeScript/React: 2-space indentation
- Use meaningful variable names and docstrings

## Architecture
- Follow MVC pattern in the API with routers and services
- Frontend uses React hooks and component composition
- Create pure functions when possible