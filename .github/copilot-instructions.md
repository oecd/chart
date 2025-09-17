# Copilot Instructions for OECD Chart Library

## Project Overview

- This is a modular React charting library for embedding OECD charts in web applications.
- Main entry: `src/index.js` (ESM build), `src/index-browser.js` (browser bundle).
- Core component: `Chart` (`src/components/Chart/Component.js`), used via `<Chart chartId="..." />`.
- Charts are lazy-loaded by default and support multiple languages, variable parameters, and web component export.

## Build & Development

- **Build:** `npm run build` (uses Rollup, see `rollup.config.js`).
- **Dev server:** `npm run dev` (if defined; see package.json scripts).
- **Lint:** `npm run lint` (ESLint, Prettier, Husky pre-commit hooks).
- **No test scripts** are defined by default.
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

## Integration & Usage

- Designed for use as a React component or as a web component (see README for usage).
- External consumers must provide `chartId` and may pass up to 10 variable props (`var1`...`var10`).
- Supports hiding UI elements via props (e.g., `hideTitle`, `hideToolbox`).
- Web component bundle: `dist/browser/oecd-chart-latest.js`.

## Notable Project-Specific Details

- Controls and chart sizing: see README for sizing strategies and how controls affect layout.
- API URL is injected at build time via Rollup plugin and `.env`.
- Peer dependencies: React 17+ required in host app.
- No built-in test runner or test directory.

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

For more, see `README.md`, `rollup.config.js`, and `src/components/Chart/Component.js`.
