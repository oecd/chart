# Testing Setup

This project uses Jest as the testing framework with React Testing Library for component testing.

## Test Scripts

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode (automatically re-runs when files change)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests in CI mode (no watch, with coverage)

## Test Structure

Tests are organized using the following pattern:

```
src/
  components/
    ComponentName/
      __tests__/
        Component.test.js
  utils/
    __tests__/
      utilFunction.test.js
```

## Writing Tests

### Component Tests

Use React Testing Library for component testing:

```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Utility Function Tests

For pure functions and utilities:

```javascript
import { myUtilFunction } from '../myUtil';

describe('myUtilFunction', () => {
  test('returns expected result', () => {
    expect(myUtilFunction('input')).toBe('expected output');
  });
});
```

## Mocking

### Highcharts

Highcharts is automatically mocked in the test setup (`src/setupTests.js`).

### API Calls

Mock fetch utilities in individual tests:

```javascript
jest.mock('../../../utils/fetchUtil', () => ({
  fetchJson: jest.fn(),
}));
```

## Coverage

Coverage thresholds are set to 70% for:

- Statements
- Branches
- Functions
- Lines

The coverage report is generated in the `coverage/` directory when running `npm run test:coverage`.

## Browser APIs

Common browser APIs are mocked in `src/setupTests.js`:

- IntersectionObserver
- ResizeObserver
- window.matchMedia

## ESLint Configuration

Test files are configured to recognize Jest globals. Use these eslint comments in test files if needed:

```javascript
/* eslint-env jest */
/* global jest, describe, test, beforeEach, expect */
```
