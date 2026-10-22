// @ts-check
import * as R from 'ramda';

/**
 * @typedef {{ code: string; label: string }} Category
 */

/**
 * @param {Category[]} categories
 * @param {boolean} areCategoriesDates
 * @param {{ tryParse: (label: string) => Date }} categoriesFrequency
 * @returns {(Category & { parsedLabel: string | number })[]}
 */
export const parseCategories = (
  categories,
  areCategoriesDates,
  categoriesFrequency,
) =>
  R.map(
    (category) => ({
      ...category,
      parsedLabel: areCategoriesDates
        ? categoriesFrequency.tryParse(category.label).getTime()
        : category.label,
    }),
    categories,
  );
