//  @ts-check
import { chartTypes } from '../../constants/chart';
import { getReferenceLetter } from './getReferenceLetter';
import { referenceCssStyles } from './referenceSymbolStyles';

/**
 * @param {import('./annotation').PositionedPointAnnotation[]} positionedPointAnnotations
 * @returns {import('highcharts').AnnotationsOptions[]}
 */

/**
 * The distance the reference symbol keeps from its data point
 */
const distance = 10;

/**
 * @type {{[key in typeof chartTypes[keyof typeof chartTypes] | 'default']: import('highcharts').AnnotationsLabelOptions}}
 */
const positioningForChartType = {
  [chartTypes.line]: {
    align: 'center',
    verticalAlign: 'bottom',
    x: 0,
    y: -1 * distance,
  },
  [chartTypes.bar]: {
    align: 'center',  
    verticalAlign: 'bottom',
    x: 0,
    y: -1 * distance,
  },
  [chartTypes.row]: {
    align: 'left',
    verticalAlign: 'middle',
    x: distance,
    y: 0,
  },
  [chartTypes.stackedBar]: {
    align: 'center',
    verticalAlign: 'bottom',
    x: 0,
    y: distance,
  },
  'default': {
    align: 'left',
    verticalAlign: 'middle',
    x: 0,
    y: 0,
  },
};

/**
 * @param {import('./annotation').PositionedPointAnnotation[]} positionedPointAnnotations,
 * @param {typeof chartTypes[keyof typeof chartTypes] | 'default'} chartType
 */

export const createAnnotationPointsForChartType = (
  positionedPointAnnotations,
  chartType,
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

  let result = [
    {
      labelOptions: {
        useHTML: true,
        shape: 'rect',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        distance: 0,
        ...(positioningForChartType[chartType] ??
          positioningForChartType['default']),
      },
      draggable: '',
      labels: points,
    },
  ];
  return result;
};
