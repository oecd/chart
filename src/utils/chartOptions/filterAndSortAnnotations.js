// @ts-check
import * as R from 'ramda';
import { mapWithIndex } from '../../utils/ramdaUtil';
import { frequencies } from '../dateUtil';

/** @type {[undefined, undefined]} */
const noMinMax = [undefined, undefined];

/**
 * @param {{ code: string }[]} categories
 * @param {{ tryParse: (str: string) => Date | false } | null} categoriesFrequency
 * @returns {[number, number] | [undefined, undefined]}
 */
const getTimeRange = (categories, categoriesFrequency) => {
  if (!categoriesFrequency) return noMinMax;
  const firstCategory = R.head(categories);
  const lastCategory = R.last(categories);
  if (!(firstCategory && lastCategory)) return noMinMax;
  const minDateRaw = categoriesFrequency.tryParse(firstCategory.code);
  if (!minDateRaw) return noMinMax;
  const maxDateRaw =
    firstCategory !== lastCategory
      ? categoriesFrequency.tryParse(lastCategory.code)
      : minDateRaw;
  if (!maxDateRaw) return noMinMax;
  return [minDateRaw.getTime(), maxDateRaw.getTime()];
};

/**
 * @param {{
 * series: { code: string }[];
 * categories: { code: string }[];
 * areCategoriesDates: boolean;
 * categoriesDateFormat: keyof import('../../constants/chart').frequencyTypes
 * }} data
 * @param {import('./annotation').Annotation[]} annotations
 * @returns {import('./annotation').Annotation[]}
 */
export const filterAndSortAnnotations = (data, annotations) => {
  if (!data || !data.categories || data.categories.length === 0) {
    return [];
  }

  // Determine category time frequency
  const categoriesFrequency = data.areCategoriesDates
    ? R.prop(data.categoriesDateFormat, frequencies)
    : null;

  // For time categories, determine min/max timestamps to determine
  // whether a band annotation lies within the time range of the data.
  const [minTimestamp, maxTimestamp] = getTimeRange(
    data.categories,
    categoriesFrequency,
  );

  /** @type {Map<string, number>} */
  const categoryCodeToIndex = new Map(
    mapWithIndex(({ code }, index) => [code, index], data.categories),
  );

  return R.compose(
    // Sort annotations so alphabetical references appear left-to-right (A, B, C etc.)
    R.sortBy(
      data.areCategoriesDates
        ? // Date: Sort by string representation (e.g. "2020-Q4")
          ({ categoryCode, fromCategoryCode }) =>
            categoryCode ?? fromCategoryCode
        : // String: Sort by index so the annotation order equals the category order
          ({ categoryCode, fromCategoryCode }) =>
            categoryCodeToIndex.get(categoryCode ?? fromCategoryCode),
    ),
    // Filter annotations allowing annotations whose category/categories
    // appear in the data range.
    R.filter((annotation) => {
      const { categoryCode, fromCategoryCode, toCategoryCode } = annotation;
      // Point annotation: Point needs to appear in the data explicitly
      if (categoryCode) {
        return categoryCodeToIndex.has(categoryCode);
      }
      // Band annotation, categories are dates: from and to categories
      // need to appear in the time range implicitly.
      // Given there are data point for 2010 and 2020 only and the
      // band annotation reaches from 2015 to 2016, it is permitted.
      if (
        categoriesFrequency &&
        minTimestamp !== undefined &&
        maxTimestamp !== undefined
      ) {
        const fromTimestamp = categoriesFrequency.tryParse(fromCategoryCode);
        const toTimestamp = categoriesFrequency.tryParse(toCategoryCode);
        if (!(fromTimestamp && toTimestamp)) return false;
        const inTimeRange =
          minTimestamp <= fromTimestamp && toTimestamp <= maxTimestamp;
        return inTimeRange;
      }
      // Band annotation, categories are strings: from and to need to appear in the data explicitly
      return (
        categoryCodeToIndex.has(fromCategoryCode) &&
        categoryCodeToIndex.has(toCategoryCode)
      );
    }),
  )(annotations);
};
