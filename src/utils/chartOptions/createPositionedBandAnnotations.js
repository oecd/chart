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

/** @type {readonly never[]} */
const NO_ANNOTATIONS = Object.freeze([]);

/**
 * Adds from/to to annotations for time categories.
 * Plot bands are defined with time stamps.
 *
 * @param {{
 * annotations: import('./annotation').Annotation[];
 * series: Series[];
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * };
 * }} options
 * @returns {import('./annotation').PositionedAnnotation[]}
 */
const getTimeBandAnnotations = ({
  annotations,
  series,
  categoriesFrequency,
}) => {
  const firstSeries = series[0];
  if (!firstSeries) return NO_ANNOTATIONS;

  const parsedCategories = R.compose(
    R.filter(R.isNotNil),
    R.map((point) => point.metadata?.parsedX),
  )(firstSeries.data);
  if (parsedCategories.length === 0) return NO_ANNOTATIONS;
  let firstTimestamp = parsedCategories ? R.head(parsedCategories) : undefined;
  let lastTimestamp = parsedCategories ? R.last(parsedCategories) : undefined;

  if (firstTimestamp === undefined || lastTimestamp === undefined) {
    return NO_ANNOTATIONS;
  }

  return annotations
    .map((annotation) => {
      let from = -1;
      let to = -1;

      const fromDate = categoriesFrequency.tryParse(
        annotation.fromCategoryCode,
      );
      if (!fromDate) return;
      // Start one half before the from date
      from = categoriesFrequency.getMiddle(fromDate, -1).getTime();

      const toDate = categoriesFrequency.tryParse(annotation.toCategoryCode);
      if (!toDate) return;
      // End one half after the to date
      to = categoriesFrequency.getMiddle(toDate, 1).getTime();

      return { ...annotation, from, to };
    })
    .filter(R.isNotNil);
};

/**
 * Adds from/to to annotations for discrete categories.
 * Plot bands are defined with indices.
 *
 * @param {{
 * annotations: import('./annotation').BandAnnotation[];
 * categories: { code: string }[];
 * }} options
 * @returns {import('./annotation').PositionedAnnotation[]}
 */
const getDiscreteBandAnnotations = ({ annotations, categories }) =>
  annotations
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
 * areCategoriesDates: boolean;
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * } | null;
 * }} options
 * @returns {import('./annotation').PositionedAnnotation[]}
 */
export const createPositionedBandAnnotations = ({
  annotations,
  series,
  categories,
  areCategoriesDates,
  categoriesFrequency,
}) => {
  const bandAnnotations = annotations.filter(({ type }) => type === 'band');

  return areCategoriesDates && categoriesFrequency
    ? getTimeBandAnnotations({
        annotations: bandAnnotations,
        series,
        categoriesFrequency,
      })
    : getDiscreteBandAnnotations({ annotations: bandAnnotations, categories });
};
