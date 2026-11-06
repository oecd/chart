// @ts-check
import * as R from 'ramda';
import { createPositionedBandAnnotations } from './createPositionedBandAnnotations';
import { createPositionedPointAnnotations } from './createPositionedPointAnnotations';

/**
 * @param {{
 * data: {
 *   series: unknown[];
 *   categories: { code: string }[];
 *   areCategoriesDates: boolean;
 * };
 * annotations: import('./annotation').Annotation[];
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * } | null;
 * }} options
 * @return {{
 * positionedBandAnnotations: import('./annotation').PositionedBandAnnotation[] | null;
 * positionedPointAnnotations: import('./annotation').PositionedPointAnnotation[] | null;
 * }}
 */
export const createPositionedAnnotations = ({
  data,
  annotations,
  categoriesFrequency,
}) => {
  if (data.series.length === 0)
    return {
      positionedBandAnnotations: [],
      positionedPointAnnotations: [],
    };

  const groupedAnnotations = R.groupBy(R.prop('type'), annotations);
  const { band, point } = groupedAnnotations;

  const positionedBandAnnotations = band
    ? createPositionedBandAnnotations({
        annotations: band,
        categories: data.categories,
        areCategoriesDates: data.areCategoriesDates,
        categoriesFrequency,
      })
    : null;

  const positionedPointAnnotations = point
    ? createPositionedPointAnnotations(point, data, categoriesFrequency)
    : null;

  return { positionedBandAnnotations, positionedPointAnnotations };
};
