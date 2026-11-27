//  @ts-check
import { chartTypes } from '../../constants/chart';
import { getReferenceLetter } from './getReferenceLetter';
import { referenceCssStyles } from './referenceSymbolStyles';

/**
 * The distance the reference symbol keeps from its data point
 */
const distance = 10;

/**
 * @typedef {typeof chartTypes[keyof typeof chartTypes] | 'default'} chartTypesKey
 * @typedef {(annotation: import('./annotation').PositionedPointAnnotation, opts: any) => import('highcharts').AnnotationsLabelOptions} positioningFunc
 *
 * @type {{ [key in chartTypesKey]: positioningFunc }}
 */
const positioningForChartType = {
  [chartTypes.line]: () => {
    return {
      align: 'center',
      verticalAlign: 'bottom',
      x: 0,
      y: -1 * distance,
    };
  },
  [chartTypes.bar]: () => {
    return {
      align: 'center',
      verticalAlign: 'bottom',
      x: 0,
      y: -1 * distance,
    };
  },
  [chartTypes.row]: () => {
    return {
      align: 'left',
      verticalAlign: 'middle',
      x: distance,
      y: 0,
    };
  },
  [chartTypes.stackedBar]: () => {
    return {
      align: 'center',
      verticalAlign: 'middle',
      x: 0,
      y: 0,
    };
  },
  [chartTypes.stackedRow]: () => {
    return {
      align: 'center',
      verticalAlign: 'middle',
      x: 0,
      y: 0,
    };
  },
  [chartTypes.stackedArea]: () => {
    return {
      align: 'center',
      verticalAlign: 'bottom',
      x: 0,
      y: -distance,
    };
  },
  [chartTypes.symbol]: (_, { onlyOneSeries }) => {
    return onlyOneSeries
      ? {
          align: 'center',
          verticalAlign: 'bottom',
          x: 0,
          y: -distance,
        }
      : {
          align: 'left',
          verticalAlign: 'middle',
          x: distance,
          y: 0,
        };
  },
  [chartTypes.scatter]: (_, { onlyOneSeries }) => {
    return onlyOneSeries
      ? {
          align: 'center',
          verticalAlign: 'bottom',
          x: 0,
          y: -distance,
        }
      : {
          align: 'left',
          verticalAlign: 'middle',
          x: distance,
          y: 0,
        };
  },
  [chartTypes.radar]: () => {
    return {
      align: 'center',
      verticalAlign: 'bottom',
      x: 0,
      y: 0,
    };
  },
  default: () => {
    return {
      align: 'left',
      verticalAlign: 'middle',
      x: 0,
      y: 0,
    };
  },
};

/**
 * @param {import('./annotation').PositionedPointAnnotation[]} positionedPointAnnotations
 * @param {typeof chartTypes[keyof typeof chartTypes] | 'default'} chartType
 * @param {boolean} onlyOneSeries
 */
export const createAnnotationPointsForChartType = (
  positionedPointAnnotations,
  chartType,
  onlyOneSeries = false,
) => {
  const positioningFunc =
    positioningForChartType[chartType] ?? positioningForChartType['default'];

  const points = positionedPointAnnotations.map((annotation) => {
    const referenceLetter = getReferenceLetter(annotation.referenceIndex);
    const point =
      chartType === chartTypes.radar
        ? annotation.point
        : {
            x: annotation.x,
            y: annotation.y,
            xAxis: 0,
            yAxis: 0,
          };
    return {
      text: `<span style="${referenceCssStyles()}">${referenceLetter}</span>`,
      point: point,
      ...positioningFunc(annotation, {
        onlyOneSeries,
      }),
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
      },
      draggable: '',
      // allowOverlap: true,
      labels: points,
    },
  ];
  return result;
};
