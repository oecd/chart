// @ts-check
import * as R from 'ramda';
import { createPositionedBandAnnotations } from './createPositionedBandAnnotations';
import { createPositionedPointAnnotations } from './createPositionedPointAnnotations';

/**
 * Adds positions for Highcharts to the annotations.
 *
 * @param {{
 * data: {
 *   series: { code: string; data: { value: number | null }[] }[];
 *   categories: { code: string }[];
 *   areCategoriesDates: boolean;
 *   areCategoriesNumbers: boolean;
 * };
 * annotations: import('./annotation').Annotation[];
 * categoriesFrequency: {
 *   tryParse: (str: string) => Date | false;
 *   getMiddle: (date: Date, step: number) => Date;
 * } | null;
 * chartType: keyof typeof import('../../constants/chart').chartTypes;
 * chartType: import('./annotation').ChartType;
 * }} options
 * @return {{
 * positionedBandAnnotations: import('./annotation').PositionedBandAnnotation[];
 * positionedPointAnnotations: import('./annotation').PositionedPointAnnotation[];
 * }}
 */
export const createPositionedAnnotations = ({
  data,
  annotations,
  categoriesFrequency,
  chartType,
}) => {
  if (data.series.length === 0) {
    return {
      positionedBandAnnotations: [],
      positionedPointAnnotations: [],
    };
  }

  // Add an index so that the numbering of the reference symbols
  // is equal in plot and footer.
  const referencedAnnotations = annotations.filter((annotation) =>
    annotation.type === 'band' ? !annotation.showLabelInline : true,
  );
  const indexedAnnotations = annotations.map((annotation) => ({
    ...annotation,
    referenceIndex: referencedAnnotations.indexOf(annotation),
  }));

  const groupedAnnotations = R.groupBy(R.prop('type'), indexedAnnotations);
  const bandAnnotations =
    /** @type {import('./annotation').IndexedBandAnnotation[] | undefined} */ (
      groupedAnnotations.band
    );
  const pointAnnotations =
    /** @type {import('./annotation').IndexedPointAnnotation[] | undefined} */ (
      groupedAnnotations.point
    );

  const positionedBandAnnotations = bandAnnotations
    ? createPositionedBandAnnotations({
        annotations: bandAnnotations,
        categories: data.categories,
        areCategoriesNumbers: data.areCategoriesNumbers,
        areCategoriesDates: data.areCategoriesDates,
        categoriesFrequency,
      })
    : [];

  const positionedPointAnnotations = pointAnnotations
    ? createPositionedPointAnnotations({
        annotations: pointAnnotations,
        data,
        categoriesFrequency,
        areCategoriesDates: data.areCategoriesDates,
        chartType,
      })
    : [];

  return { positionedBandAnnotations, positionedPointAnnotations };
};
