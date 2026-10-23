// @ts-check
import { format } from 'highcharts';
import { fontFamilies, fontWeights } from '../../constants/styling';

/**
 * Formats x axis category labels, rendering them bold when baseline or highlighted.
 *
 * @param {string | number} value
 * @param {string | undefined} xAxisLabelFormat
 * @param {{ code: string; label: string; parsedLabel: string | number; }[]} parsedCategories
 * @param {string[]} baselineCodes
 * @param {string[]} highlightCodes
 * @returns {string}
 */
export const xAxisLabelFormatter = (
  value,
  xAxisLabelFormat,
  parsedCategories,
  baselineCodes,
  highlightCodes,
) => {
  // Apply regular formatting with formatting string
  const formattedValue = xAxisLabelFormat
    ? format(
        xAxisLabelFormat,
        // In pie charts, the formatting string refers to the point name
        { value, name: value },
      )
    : String(value);

  if (baselineCodes.length === 0 && highlightCodes.length === 0) {
    return formattedValue;
  }

  // Find category code
  const category = parsedCategories.find(
    ({ parsedLabel }) =>
      (typeof parsedLabel === 'number' ? parsedLabel : parsedLabel) === value,
  );
  if (!category) {
    return formattedValue;
  }
  const categoryCode = category.code.toLowerCase();

  // Is the code baseline or highlighted?
  const isHighlighted =
    baselineCodes.includes(categoryCode) ||
    highlightCodes.includes(categoryCode);

  // Add bold text
  // https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting#html-in-highcharts
  const highlightedValue = isHighlighted
    ? // Highcharts translates the `span` to an SVG `tspan` element
      `<span style="font-weight: ${fontWeights.extraBold}; font-family: ${fontFamilies.condensed}">${formattedValue}</span>`
    : formattedValue;

  return highlightedValue;
};
