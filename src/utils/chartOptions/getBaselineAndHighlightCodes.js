// @ts-check
import * as R from 'ramda';
import { codeOrLabelEquals } from '../configUtil';

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
  /** @param {{ label: string; code: string }} s */
  const getCodeAndLabelLowercase = (s) => [
    R.toLower(s.label),
    R.toLower(s.code),
  ];
  const seriesCodesByLabel = new Map(
    R.map(getCodeAndLabelLowercase, data.series),
  );
  const categoryCodes = new Set(R.map(getLowercaseCode, data.categories));
  const categoryCodesByLabel = new Map(
    R.map(getCodeAndLabelLowercase, data.categories),
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
    const codeOrLabelLowercase = R.toLower(codeOrLabel);

    // Is it a series code?
    if (seriesCodes.has(codeOrLabelLowercase)) {
      highlightCodes.push(codeOrLabelLowercase);
      highlightSeriesCodes.push(codeOrLabelLowercase);
      return;
    }

    // Is it a series label?
    const seriesCode = seriesCodesByLabel.get(codeOrLabelLowercase);
    if (seriesCode) {
      highlightCodes.push(seriesCode);
      highlightSeriesCodes.push(seriesCode);
      return;
    }

    // Is it a category code?
    if (categoryCodes.has(codeOrLabelLowercase)) {
      highlightCodes.push(codeOrLabelLowercase);
      highlightCategoryCodes.push(codeOrLabelLowercase);
      return;
    }

    // Is it a category label?
    const categoryCode = categoryCodesByLabel.get(codeOrLabelLowercase);
    if (categoryCode) {
      highlightCodes.push(categoryCode);
      highlightCategoryCodes.push(categoryCode);
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
