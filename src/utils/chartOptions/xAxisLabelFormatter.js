// @ts-check

import { format } from 'highcharts';

/**
 * Formats x axis labels, rendering them bold when highlighted.
 *
 * @param {import('highcharts').AxisLabelsFormatterContextObject} context
 * @param {string} xAxisLabelFormat
 * @param {string[]} highlightCodes
 */
export const xAxisLabelFormatter = (
  context,
  xAxisLabelFormat,
  highlightCodes,
) => {
  const { chart, value } = context;
  // Apply regular formatting
  const formattedValue = xAxisLabelFormat
    ? format(xAxisLabelFormat, { value }, chart)
    : value;
  // Add highlighting
  const highlightedValue =
    typeof formattedValue === 'string' &&
    highlightCodes.includes(formattedValue)
      ? // Highcharts translates this to an SVG `tspan` element
        `<span style="font-weight: bolder">${formattedValue}</span>`
      : formattedValue;
  return highlightedValue;
};
