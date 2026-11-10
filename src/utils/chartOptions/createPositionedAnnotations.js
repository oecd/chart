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

  // Add an index so that the numbering of the reference symbols
  // is equal in plot and footer.
  const referencedAnnotations = annotations.filter(
    (annotation) => !annotation.showLabelInline,
  );
  const indexedAnnotations = annotations.map((annotation) => ({
    ...annotation,
    referenceIndex: referencedAnnotations.indexOf(annotation),
  }));
  console.log('indexedAnnotations', indexedAnnotations);

  const groupedAnnotations = R.groupBy(R.prop('type'), indexedAnnotations);
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
    ? createPositionedPointAnnotations(
        point,
        data,
        categoriesFrequency,
        data.areCategoriesDates,
      )
    : null;

  return { positionedBandAnnotations, positionedPointAnnotations };
};
