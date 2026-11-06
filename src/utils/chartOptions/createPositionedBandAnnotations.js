// @ts-check
import * as R from 'ramda';

/**
 * @typedef {{
 *   data: {
 *     value: number;
 *     metadata?: { parsedX: number }
 *   }[]
 * }} Series
 */

/** @type {never[]} */
const NO_ANNOTATIONS = [];

/**
 * Adds from/to to annotations for numerical categories
 * (when areCategoriesNumbers is true).
 * Plot bands are defined with the numerical category code.
 *
 * @param {{
 * annotations: import('./annotation').BandAnnotation[];
 * }} options
 * @returns {import('./annotation').PositionedBandAnnotation[]}
 */
const getContinuousBandAnnotations = ({ annotations }) => {
  return annotations
    .map((annotation) => {
      const { fromCategoryCode, toCategoryCode } = annotation;
      if (!(
        typeof fromCategoryCode === 'number' &&
        typeof toCategoryCode === 'number'
      )) {
        return;
      }
      // Pass-through numerical category code
      return {
        ...annotation,
        from: fromCategoryCode,
        to: toCategoryCode,
      };
    })
    .filter(R.isNotNil);
};

/**
 * Adds from/to to annotations for qualitative categories.
 * Plot bands are defined with indices.
 *
 * @param {{
 * annotations: import('./annotation').BandAnnotation[];
 * categories: { code: string }[];
 * }} options
 * @returns {import('./annotation').PositionedBandAnnotation[]}
 */
const getQualitativeBandAnnotations = ({ annotations, categories }) => {
  return annotations
    .map((annotation) => {
      let from = -1;
      let to = -1;
      from = R.findIndex(
        R.compose(R.equals(annotation.fromCategoryCode), R.prop('code')),
        categories,
      );
      if (from === -1) return;
      to = R.findIndex(
        R.compose(R.equals(annotation.toCategoryCode), R.prop('code')),
        categories,
      );
      if (to === -1) return;
      // Start/end one half before/after the categories so they are enclosed with padding
      from -= 0.5;
      to += 0.5;
      return { ...annotation, from, to };
    })
    .filter(R.isNotNil);
};

/**
 * Adds from/to to annotations for time categories.
 * Plot bands are defined with time stamps.
 *
 * @param {{
 * annotations: import('./annotation').BandAnnotation[];
 * series: Series[];
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * };
 * }} options
 * @returns {import('./annotation').PositionedBandAnnotation[]}
 */
const getTimeBandAnnotations = ({
  annotations,
  series,
  categoriesFrequency,
}) => {
  const firstSeries = series[0];
  if (!firstSeries) return NO_ANNOTATIONS;

  return annotations
    .map((annotation) => {
      const { fromCategoryCode, toCategoryCode } = annotation;
      if (
        typeof fromCategoryCode === 'number' ||
        typeof toCategoryCode === 'number'
      ) {
        return;
      }

      let from = -1;
      let to = -1;

      const fromDate = categoriesFrequency.tryParse(fromCategoryCode);
      if (!fromDate) return;
      // Start one half before the from date
      from = categoriesFrequency.getMiddle(fromDate, -1).getTime();

      const toDate = categoriesFrequency.tryParse(toCategoryCode);
      if (!toDate) return;
      // End one half after the to date
      to = categoriesFrequency.getMiddle(toDate, 1).getTime();

      return { ...annotation, from, to };
    })
    .filter(R.isNotNil);
};

/**
 * @param {{
 * annotations: import('./annotation').BandAnnotation[];
 * series: {
 *   data: {
 *     value: number;
 *     metadata: { parsedX: number }
 *   }[]
 * }[];
 * categories: { code: string }[];
 * areCategoriesNumbers: boolean;
 * areCategoriesDates: boolean;
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * } | null;
 * }} options
 * @returns {import('./annotation').PositionedBandAnnotation[]}
 */
export const createPositionedBandAnnotations = ({
  annotations,
  series,
  categories,
  areCategoriesNumbers,
  areCategoriesDates,
  categoriesFrequency,
}) => {
  const bandAnnotations = annotations.filter(({ type }) => type === 'band');

  if (areCategoriesNumbers) {
    return getContinuousBandAnnotations({ annotations: bandAnnotations });
  }

  if (areCategoriesDates && categoriesFrequency) {
    return getTimeBandAnnotations({
      annotations: bandAnnotations,
      series,
      categoriesFrequency,
    });
  }

  return getQualitativeBandAnnotations({
    annotations: bandAnnotations,
    categories,
  });
};
