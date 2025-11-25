import '@testing-library/jest-dom';

/* eslint-env jest */
/* global global, window, jest */

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}

  disconnect() {}

  observe() {}

  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}

  disconnect() {}

  observe() {}

  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Highcharts
jest.mock('highcharts', () => ({
  chart: jest.fn(),
  map: jest.fn(),
  setOptions: jest.fn(),
}));

jest.mock('highcharts/es-modules/masters/highcharts.src', () => ({
  __esModule: true,
  default: {
    chart: jest.fn(),
    map: jest.fn(),
    setOptions: jest.fn(),
  },
}));

jest.mock('highcharts-react-official', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
