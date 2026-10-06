// @ts-check
import { format } from 'highcharts';
import * as R from 'ramda';

/**
 * Formats x axis labels, rendering them bold when baseline or highlighted.
 *
 * @param {import('highcharts').AxisLabelsFormatterContextObject} context
 * @param {string | undefined} xAxisLabelFormat
 * @param {{ code: string; label: string; }[]} categories
 * @param {string[]} baselineCodes
 * @param {string[]} highlightCodes
 */
export const xAxisLabelFormatter = (
  context,
  xAxisLabelFormat,
  categories,
  baselineCodes,
  highlightCodes,
) => {
  const { chart, value } = context;
  // Apply regular formatting
  const formattedValue = xAxisLabelFormat
    ? format(xAxisLabelFormat, { value }, chart)
    : value;

  if (R.isEmpty(baselineCodes) && R.isEmpty(highlightCodes)) {
    return formattedValue;
  }

  // Find category code
  const valueLowercase = String(value).toLowerCase();
  const category = categories.find(
    (candidate) => candidate.label.toLowerCase() === valueLowercase,
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
