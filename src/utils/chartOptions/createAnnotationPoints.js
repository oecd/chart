//  @ts-check
import { getReferenceLetter } from './getReferenceLetter';
import { referenceCssStyles } from './referenceSymbolStyles';

/**
 *
 * @param {import('./annotation').PositionedPointAnnotation[]} positionedPointAnnotations
 * @returns {import('./annotation').PositionedPointAnnotation[]}
 */
export const createAnnotationPoints = (positionedPointAnnotations) => {
  return positionedPointAnnotations.map((annotation) => {
    const referenceLetter = getReferenceLetter(annotation.referenceIndex);
    /** @type {import('highcharts').AnnotationsLabelsOptions} */
    const highchartsAnnotation = {
      useHTML: true,
      shape: 'rect',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      distance: 0,
      verticalAlign: 'middle',

      text: `<span style="${referenceCssStyles()}">${referenceLetter}</span>`,
    };
    return highchartsAnnotation;
  });
};
