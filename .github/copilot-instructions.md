# Copilot Instructions for OECD Chart Library

## Project Overview

- This is a modular React charting library for embedding OECD charts in web applications.
- Main entry: `src/index.js` (ESM build), `src/index-browser.js` (browser bundle).
- Core component: `Chart` (`src/components/Chart/Component.js`), used via `<Chart chartId="..." />`.
- Charts are lazy-loaded by default and support multiple languages, variable parameters, and web component export.

## Build & Development

- **Build:** `npm run build` (uses Rollup, see `rollup.config.js`).
- **Lint:** `npm run lint` (ESLint, Prettier, Husky pre-commit hooks).
- **Testing:** Jest with React Testing Library configured (`jest.config.js`, `src/setupTests.js`).
- **Environment:** API endpoint set via `.env` (`API_URL`).

## Key Patterns & Conventions

- All React code is in `src/components/`, organized by feature (e.g., `Chart`, `Controls`, `HighchartsChart`).
- Utility functions are in `src/utils/` (e.g., `chartUtil.js`, `configUtil.js`).
- Constants in `src/constants/`.
- Hooks in `src/hook/`.
- Follows functional React patterns, minimal class components.
- Uses `highcharts`, `highcharts-react-official`, and other visualization dependencies.
- Styling via `index.css` and component-level CSS.
- Uses Babel for transpilation (see Rollup config for details).
- Prefer destructuring for React props and state.

## Integration & Usage

- Designed for use as a React component or as a web component (see README for usage).
- External consumers must provide `chartId` and may pass up to 10 variable props (`var1`...`var10`).
- Supports hiding UI elements via props (e.g., `hideTitle`, `hideToolbox`).
- Web component bundle: `dist/browser/oecd-chart-latest.js`.

## Notable Project-Specific Details

- Controls and chart sizing: see README for sizing strategies and how controls affect layout.
- API URL is injected at build time via Rollup plugin and `.env`.
- Peer dependencies: React 18+ required in host app.
- Testing setup with Jest, React Testing Library, and comprehensive mocks for Highcharts and browser APIs.

## Testing Framework

- **Test Runner:** Jest with JSDOM environment for React component testing.
- **Testing Library:** React Testing Library for component interaction testing.
- **Test Scripts:**
  - `npm test` - Run all tests
  - `npm run test:watch` - Run tests in watch mode
  - `npm run test:coverage` - Run tests with coverage report
  - `npm run test:ci` - CI-friendly test command
- **Test Structure:** Tests organized in `__tests__` directories alongside components and utilities.
- **Mocking:** Highcharts, browser APIs (IntersectionObserver, ResizeObserver, matchMedia) pre-configured.
- **Coverage:** 70% thresholds set for statements, branches, functions, and lines.
- **Documentation:** See `TESTING.md` for comprehensive testing guidelines and examples.

## Examples

- See `README.md` for usage and sizing strategies.
- Example import:
  ```jsx
  import { Chart } from '@oecd-pac/chart';
  <Chart chartId="xxxxxxx" var1="FRA" />;
  ```
- Example web component:
  ```html
  <oecd-chart chart-id="xxxxxxx"></oecd-chart>
  ```

---

For more, see `README.md`, `rollup.config.js`, `src/components/Chart/Component.js`, and `TESTING.md`.
