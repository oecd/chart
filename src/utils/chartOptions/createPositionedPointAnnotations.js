// @ts-check

import * as R from 'ramda';
import { chartTypes } from '../../constants/chart';

/**
 * @param {{
 *  category: string;
 *  value: number | null;
 * }[][]} lists
 * @returns {Map<string, number>}
 */
const maximaPerCategory = (lists) => {
  /** @type Map<string, number> */
  const maxima = new Map();
  for (const list of lists) {
    for (const { category, value } of list) {
      const current = maxima.get(category);
      if (value !== null && (current === undefined || value > current)) {
        maxima.set(category, value);
      }
    }
  }
  return maxima;
};

/**
 * @param {{
 * annotations: import('./annotation').IndexedPointAnnotation[];
 * data: {
 *   series: { code: string; data: { value: number | null }[] }[];
 *   categories: { code: string }[];
 * };
 * categoriesFrequency: { tryParse: (str: string) => Date | false } | null;
 * areCategoriesDates: boolean;
 * chartType: typeof chartTypes[keyof typeof chartTypes];
 *}} options
 * @returns {import('./annotation').PositionedPointAnnotation[]}
 */
export const createPositionedPointAnnotations = ({
  annotations,
  data,
  categoriesFrequency,
  areCategoriesDates,
  chartType,
}) => {
  const listOfSeries = R.pluck('data', data.series);

  /** @type {{category: string; value: number | null}[][]} */
  const listOfSeriesWithCategories = R.map(
    (series) =>
      R.zipWith(
        (category, point) => {
          return { category: category.code.toLowerCase(), value: point.value };
        },
        data.categories,
        series,
      ),
    listOfSeries,
  );

  const maxima = maximaPerCategory(listOfSeriesWithCategories);

  const positionedAnnotations = annotations
    .map((annotation) => {
      const categoryIndex = data.categories.findIndex(
        (category) => category.code.toLowerCase() === annotation.categoryCode,
      );
      if (categoryIndex === -1) {
        return;
      }

      const seriesForAnnotation = data.series.find(
        (series) => series.code.toLowerCase() == annotation.seriesCode,
      );
      if (!seriesForAnnotation) return;

      let yValue =
        chartType === chartTypes.bar || chartType === chartTypes.row
          ? (maxima.get(annotation.categoryCode) ?? 0)
          : (seriesForAnnotation.data[categoryIndex].value ?? 0);

      let xValue;
      const category = data.categories[categoryIndex];
      if (areCategoriesDates) {
        const date = categoriesFrequency?.tryParse(category.code);
        if (!date) return;
        xValue = date.getTime();
      } else {
        xValue = categoryIndex;
      }

      return {
        ...annotation,
        x: xValue,
        y: yValue,
      };
    })
    .filter(R.isNotNil);

  return positionedAnnotations;
};
