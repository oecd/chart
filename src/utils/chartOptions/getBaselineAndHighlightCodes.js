// @ts-check
import * as R from 'ramda';
import { codeOrLabelEquals } from '../configUtil';
import { getIdentifyCodeOrLabel } from './getIdentifyCodeOrLabel';

/**
 * @typedef {{
 * seriesCodes: Set<string>;
 * categoryCodes: Set<string>;
 * baselineCodes: string[];
 * highlightCodes: string[];
 * highlightSeriesCodes: string[];
 * highlightCategoryCodes: string[];
 * }} BaselineAndHighlightCodes
 */

/**
 * Returns the baseline and highlight codes in lowercase.
 *
 * @param {{
 * series: { label: string, code: string }[];
 * categories: { label: string, code: string }[];
 * }} data
 * @param {string[]} baseline
 * @param {string[]} highlight
 * @returns {BaselineAndHighlightCodes}
 */
export const getBaselineAndHighlightCodes = (data, baseline, highlight) => {
  const seriesAndCategories = R.concat(data.series, data.categories);
  const baselineEntities = R.filter(
    (series) => R.any(codeOrLabelEquals(series), baseline),
    seriesAndCategories,
  );
  const getLowercaseCode = R.compose(R.toLower, R.prop('code'));
  const baselineCodes = R.map(getLowercaseCode, baselineEntities);

  // Determine series and category codes while preserving the original order

  const seriesCodes = new Set(R.map(getLowercaseCode, data.series));
  const categoryCodes = new Set(R.map(getLowercaseCode, data.categories));

  const identify = getIdentifyCodeOrLabel(data.series, data.categories);

  // List of highlight codes.
  // This is different from `highlight` which might contain codes *or* labels
  // whether or not they are in the data.
  /** @type {string[]} */
  const highlightCodes = [];
  /** @type {string[]} */
  const highlightSeriesCodes = [];
  /** @type {string[]} */
  const highlightCategoryCodes = [];

  highlight.forEach((codeOrLabel) => {
    const result = identify(codeOrLabel);

    if (!result) return;
    const { type, code } = result;

    if (type === 'series') {
      highlightCodes.push(code);
      highlightSeriesCodes.push(code);
      return;
    }

    if (type === 'category') {
      highlightCodes.push(code);
      highlightCategoryCodes.push(code);
      return;
    }
  });

  return {
    seriesCodes,
    categoryCodes,
    baselineCodes,
    highlightCodes,
    highlightSeriesCodes,
    highlightCategoryCodes,
  };
};
