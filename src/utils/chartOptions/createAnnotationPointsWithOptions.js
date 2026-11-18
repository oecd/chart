//  @ts-check
import { getReferenceLetter } from './getReferenceLetter';
import { referenceCssStyles } from './referenceSymbolStyles';

/**
 * @param {import('./annotation').PositionedPointAnnotation[]} positionedPointAnnotations
 * @returns {import('highcharts').AnnotationsOptions[]}
 */
export const createAnnotationPointsWithOptions = (
  positionedPointAnnotations,
) => {
  const points = positionedPointAnnotations.map((annotation) => {
    const referenceLetter = getReferenceLetter(annotation.referenceIndex);
    /** @type {import('highcharts').AnnotationsLabelsOptions} */
    return {
      text: `<span style="${referenceCssStyles()}">${referenceLetter}</span>`,
      point: {
        x: annotation.x,
        y: annotation.y,
        xAxis: 0,
        yAxis: 0,
      },
    };
  });
  return [
    {
      labelOptions: {
        useHTML: true,
        shape: 'rect',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        distance: 0,
        verticalAlign: 'middle',
      },
      draggable: '',
      labels: points,
    },
  ];
};
