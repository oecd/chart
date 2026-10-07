// @ts-check
import { format } from 'highcharts';
import * as R from 'ramda';

/**
 * Formats x axis labels, rendering them bold when baseline or highlighted.
 *
 * @param {import('highcharts').Chart} chart
 * @param {string | number} value
 * @param {string | undefined} xAxisLabelFormat
 * @param {{ code: string; label: string; }[]} categories
 * @param {string[]} baselineCodes
 * @param {string[]} highlightCodes
 * @returns {string}
 */
export const xAxisLabelFormatter = (
  chart,
  value,
  xAxisLabelFormat,
  categories,
  baselineCodes,
  highlightCodes,
) => {
  // Apply regular formatting with formatting string
  const formattedValue = xAxisLabelFormat
    ? format(
        xAxisLabelFormat,
        // In pie charts, the formatting string refers to the point name
        { value, name: value },
        chart,
      )
    : String(value);

  if (R.isEmpty(baselineCodes) && R.isEmpty(highlightCodes)) {
    return formattedValue;
  }

  // Find category code
  const categoryValueLowercase = String(
    typeof value === 'number' ? formattedValue : value,
  ).toLowerCase();
  const category = categories.find(
    (candidate) => candidate.label.toLowerCase() === categoryValueLowercase,
  );
  const categoryCode = category?.code.toLowerCase();

  // Is the code baseline or highlighted?
  const isHighlighted =
    categoryCode &&
    (baselineCodes.includes(categoryCode) ||
      highlightCodes.includes(categoryCode));

  // Add bold text
  // https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting#html-in-highcharts
  const highlightedValue = isHighlighted
    ? // Highcharts translates the `span` to an SVG `tspan` element
      `<span style="font-weight: bolder">${formattedValue}</span>`
    : formattedValue;

  return highlightedValue;
};
