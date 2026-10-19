// @ts-check
import { format } from 'highcharts';
import { fontFamilies, fontWeights } from '../../constants/styling';

/**
 * Formats series/category labels in the legend, rendering them bold when highlighted.
 *
 * @param {string | number} name Visible label
 * @param {string} code Lowercase code
 * @param {string | undefined} labelFormat Format string for Highcharts formatter (https://www.highcharts.com/docs/chart-concepts/templating)
 * @param {string[]} highlightCodes Lowercase codes of highlighted series/categories
 * @returns {string}
 */
export const highlightLabelFormatter = (
  name,
  code,
  labelFormat,
  highlightCodes,
) => {
  // Apply regular formatting with formatting string
  const formattedValue = labelFormat
    ? format(labelFormat, { value: name, name })
    : String(name);

  if (highlightCodes.length === 0) {
    return formattedValue;
  }

  // Is the code highlighted?
  const isHighlighted = highlightCodes.includes(code);

  // Add bold text
  // https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting#html-in-highcharts
  const highlightedValue = isHighlighted
    ? // Highcharts translates the `b` to an SVG `tspan` element
      `<span style="font-weight: ${fontWeights.extraBold}; font-family: ${fontFamilies.condensed}">${formattedValue}</span>`
    : formattedValue;

  return highlightedValue;
};
