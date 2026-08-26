// @ts-check
import * as R from 'ramda';
import { codeOrLabelEquals } from '../configUtil';

/**
 * Returns the baseline and highlight codes,
 * determines flags used in the highlighting logic.
 *
 * @param {{
 * data: {
 *   series: { label: string, code: string }[];
 *   categories: { label: string, code: string }[];
 * },
 * baseline: string[];
 * highlight: string[];
 * }} options
 * @returns {{
 *   baselineCodes: string[];
 *   highlightCodes: string[];
 *   highlightSeriesCodes: string[];
 *   highlightCategoryCodes: string[];
 *   isGroupedChart: boolean;
 *   isCategoryGroupHighlighted: boolean;
 * }}
 */
export const getBaselineAndHighlightCodes = ({ data, baseline, highlight }) => {
  const entities = R.concat(data.series, data.categories);
  const baselineEntities = R.filter(
    (series) => R.any(codeOrLabelEquals(series), baseline),
    entities,
  );
  const baselineCodes = R.map(R.prop('code'), baselineEntities);

  // Determine series and category codes while preserving the original order

  const seriesCodes = new Set(R.map(R.prop('code'), data.series));
  const seriesCodesByLabel = new Map(
    R.map((s) => [s.label, s.code], data.series),
  );
  const categoryCodes = new Set(R.map(R.prop('code'), data.categories));
  const categoryCodesByLabel = new Map(
    R.map((s) => [s.label, s.code], data.categories),
  );

  // List of highlight codes.
  // This is different from `highlight` which might contain codes *or* labels
  /** @type {string[]} */
  const highlightCodes = [];
  /** @type {string[]} */
  const highlightSeriesCodes = [];
  /** @type {string[]} */
  const highlightCategoryCodes = [];

  highlight.forEach((codeOrLabel) => {
    // Is it a series code?
    if (seriesCodes.has(codeOrLabel)) {
      highlightCodes.push(codeOrLabel);
      highlightSeriesCodes.push(codeOrLabel);
      return;
    }
    // Is it a series label?
    const seriesCode = seriesCodesByLabel.get(codeOrLabel);
    if (seriesCode) {
      highlightCodes.push(seriesCode);
      highlightSeriesCodes.push(seriesCode);
      return;
    }
    // Is it a category code?
    if (categoryCodes.has(codeOrLabel)) {
      highlightCodes.push(codeOrLabel);
      highlightCategoryCodes.push(codeOrLabel);
      return;
    } // Is it a category label?
    const categoryCode = categoryCodesByLabel.get(codeOrLabel);
    if (categoryCode) {
      highlightCodes.push(categoryCode);
      highlightCategoryCodes.push(categoryCode);
      return;
    }
  });

  const isBaselineACategory = R.any(
    (baselineCode) => categoryCodes.has(baselineCode),
    baselineCodes,
  );

  const isGroupedChart =
    data.series.length > 1 && data.series[0].data.length > 1;

  /**
   * Whether a category is baseline/highlighted that contains several points
   * and can be highlighted as a visual group, not as individual points.
   */
  const isCategoryGroupHighlighted =
    isGroupedChart &&
    (isBaselineACategory || highlightCategoryCodes.length > 0);

  return {
    baselineCodes,
    highlightCodes,
    highlightSeriesCodes,
    highlightCategoryCodes,
    isGroupedChart,
    isCategoryGroupHighlighted,
  };
};
