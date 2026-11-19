// @ts-check
import * as R from 'ramda';
import { getIdentifyCodeOrLabel } from './getIdentifyCodeOrLabel';

/**
 * Transforms annotations from case-insensitive codes or labels
 * to lowercase codes.
 *
 * @param {{
 * series: { code: string; label: string; }[];
 * categories: { code: string; label: string; }[];
 * }} data
 * @param {import('./annotation').Annotation[]} annotations
 * @returns {import('./annotation').Annotation[]}
 */
export const normalizeAnnotationCodes = (data, annotations) => {
  const identify = getIdentifyCodeOrLabel(data.series, data.categories);

  return annotations
    .map((annotation) => {
      /** @type import('./annotation').Annotation */
      let annotationWithCodes;

      if (annotation.type === 'point') {
        // Point Annotation
        const { seriesCode, categoryCode } = annotation;

        const resultSeries = identify(seriesCode, 'series');
        if (!resultSeries) return;

        const resultCategory = identify(categoryCode, 'category');
        if (!resultCategory) return;

        /** @type {import('./annotation').PointAnnotation} */
        annotationWithCodes = {
          ...annotation,
          seriesCode: resultSeries.code,
          categoryCode: resultCategory.code,
        };
      } else {
        // Band Annotation
        const { fromCategoryCode, toCategoryCode } = annotation;

        const resultFromCategory = identify(fromCategoryCode, 'category');
        if (!resultFromCategory) return;
        const resultToCategory = identify(toCategoryCode, 'category');
        if (!resultToCategory) return;

        /** @type {import('./annotation').BandAnnotation} */
        annotationWithCodes = {
          ...annotation,
          fromCategoryCode: resultFromCategory.code,
          toCategoryCode: resultToCategory.code,
        };
      }

      return annotationWithCodes;
    })
    .filter(R.isNotNil);
};
