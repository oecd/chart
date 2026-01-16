/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chart from '../Component';

// Mock the fetch utility
jest.mock('../../../utils/fetchUtil', () => ({
  fetchJson: jest.fn(),
}));

// Mock the ChartWithConfig component
jest.mock('../../ChartWithConfig', () => {
  return function ({ title, var1, hideTitle }) {
    return (
      <div data-testid="chart-with-config">
        <div data-testid="chart-title">Chart Title: {title || 'No title'}</div>
        <div data-testid="chart-var1">var1: {var1 || 'none'}</div>
        <div data-testid="chart-hideTitle">
          hideTitle: {hideTitle ? 'true' : 'false'}
        </div>
      </div>
    );
  };
});

describe('Chart Component', () => {
  const mockFetchJson = require('../../../utils/fetchUtil').fetchJson;

  beforeEach(() => {
    mockFetchJson.mockClear();
  });

  test('renders loading spinner initially', () => {
    mockFetchJson.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Chart chartId="test-chart-id" />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  test('renders chart with config after successful fetch', async () => {
    const mockConfig = {
      title: 'Test Chart Title',
    };

    mockFetchJson.mockResolvedValue(mockConfig);

    render(<Chart chartId="test-chart-id" />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-with-config')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Chart Title: Test Chart Title'),
    ).toBeInTheDocument();
  });

  test('handles fetch error gracefully', async () => {
    const mockError = new Error('Fetch failed');
    mockFetchJson.mockRejectedValue(mockError);

    render(<Chart chartId="test-chart-id" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('passes through additional props to ChartWithConfig and ensure vars get overriden by Chart props', async () => {
    const mockConfig = {
      title: 'Test Chart',
      var1: 'varThatShouldBeOverridenByVar1PassedToChart',
    };
    mockFetchJson.mockResolvedValue(mockConfig);

    render(<Chart chartId="test-chart-id" var1="testVar" hideTitle />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-with-config')).toBeInTheDocument();
    });

    // Check that hideTitle prop is passed through
    expect(screen.getByTestId('chart-hideTitle')).toHaveTextContent(
      'hideTitle: true',
    );

    // Check that var1 from Chart component props overrides var1 from config
    expect(screen.getByTestId('chart-var1')).toHaveTextContent('var1: testVar');

    // Check that title from config is still passed through
    expect(screen.getByTestId('chart-title')).toHaveTextContent(
      'Chart Title: Test Chart',
    );
  });
});
