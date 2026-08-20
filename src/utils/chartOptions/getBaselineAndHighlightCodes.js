// @ts-check
import * as R from 'ramda';
import { codeOrLabelEquals } from '../configUtil';

/**
 * Returns the baseline and highlight codes,
 * determines flags used in the highlighting logic.
 *
 * @returns {{
 *   baselineCodes: string[];
 *   highlightCodes: string[];
 *   highlightSeriesCodes: string[];
 *   highlightCategoryCodes: string[];
 *   matchingHighlightColors: string[];
 *   isGroupedChart: boolean;
 *   isCategoryGroupHighlighted: boolean;
 * }}
 */
export const getBaselineAndHighlightCodes = ({ data, baseline, highlight }) => {
  const entities = R.concat(data.series, data.categories);
  const allCategoryCodes = R.map(R.prop('code'), data.categories);

  const baselineEntities = R.filter(
    (series) => R.any(codeOrLabelEquals(series), baseline),
    entities,
  );
  const baselineCodes = R.map(R.prop('code'), baselineEntities);

  const highlightedSeries = R.filter(
    (series) => R.any(codeOrLabelEquals(series), highlight),
    data.series,
  );
  const highlightSeriesCodes = R.map(R.prop('code'), highlightedSeries);

  const highlightedCategories = R.filter(
    (category) => R.any(codeOrLabelEquals(category), highlight),
    data.categories,
  );
  const highlightCategoryCodes = R.map(R.prop('code'), highlightedCategories);

  // This is different from `highlight` which might contain codes or labels
  const highlightCodes = R.concat(highlightSeriesCodes, highlightCategoryCodes);

  const isBaselineACategory = R.any(
    R.includes(R.__, allCategoryCodes),
    baselineCodes,
  );

  const isGroupedChart =
    data.series.length > 1 && data.series[0].data.length > 1;

  /**
   * Whether a category is baseline/highlighted that contains several points
   * and can be highlighted as a visual group, not as individual points.
   */
  const isCategoryGroupHighlighted =
    isGroupedChart && (isBaselineACategory || highlightedCategories.length > 0);

  return {
    baselineCodes,
    highlightCodes,
    highlightSeriesCodes,
    highlightCategoryCodes,
    isGroupedChart,
    isCategoryGroupHighlighted,
  };
};
