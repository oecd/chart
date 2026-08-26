// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  baselineColor,
  chartSpacing,
  chartSpacingFullScreenAndExport,
  chartTypes,
  nonHighlightedOpacity,
  sortOrderOptions,
} from '../../constants/chart';
import { createDatapoint } from '../chartOptions/createDataPoint';
import { calcMarginTop } from '../chartUtil';
import {
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
  getSeriesColor,
} from '../chartUtilCommon';
import { isNilOrEmpty, mapWithIndex } from '../ramdaUtil';
import { getBaselineAndHighlightCodes } from './getBaselineAndHighlightCodes';
import { getSmallerPalette } from './getSmallerPalette';

const symbols = [
  'circle',
  'diamond',
  'cross',
  'square',
  'triangle',
  'triangle-down',
];

export const createOptionsForScatterChart = ({
  chartType,
  data,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  fixedColorIndexBySeries = null,
  highlight = null,
  baseline = null,
  highlightColors,
  smallerHighlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
  categoriesAreDatesOrNumberForDataParsing,
  categoriesFrequency,
  seriesFrequency,
  sortOrder,
  disableLegendInteraction = false,
}) => {
  const symbolMinMaxLayout = chartType === chartTypes.symbolMinMax;

  const getIsMinAvgOrMax =
    chartType !== chartTypes.symbolMinMax
      ? R.always(false)
      : (s) => {
          const firstDatumCustom = R.path(['data', 0, 'custom'], s);
          return (
            R.has('isMin', firstDatumCustom) ||
            R.has('isMax', firstDatumCustom) ||
            R.has('isAvg', firstDatumCustom)
          );
        };

  const { baselineCodes, highlightCodes } = getBaselineAndHighlightCodes({
    data,
    baseline,
    highlight,
  });
  const anyHighlighted = highlightCodes.length > 0;

  const matchingHighlightColors = getSmallerPalette(
    highlight,
    highlightColors,
    smallerHighlightColors,
  );

  const allSeries = mapWithIndex((series, seriesIndex) => {
    const isMinAvgOrMax = getIsMinAvgOrMax(series);
    const symbol = isMinAvgOrMax
      ? R.head(symbols)
      : getListItemAtTurningIndex(seriesIndex, symbols);

    const seriesCode = series.code;

    const seriesBaselineIndex = baselineCodes.indexOf(seriesCode);
    const isSeriesBaseline = seriesBaselineIndex !== -1;

    const seriesHighlightIndex = highlightCodes.indexOf(seriesCode);
    const isSeriesHighlighted = seriesHighlightIndex !== -1;

    const seriesColor = (() => {
      if (isSeriesBaseline) return baselineColor;
      if (isSeriesHighlighted) {
        return getListItemAtTurningIndex(
          seriesHighlightIndex,
          matchingHighlightColors,
        );
      }

      if (!isNilOrEmpty(fixedColorIndexBySeries)) {
        return getSeriesColor({
          colorPalette,
          seriesIndex,
          seriesCode,
          fixedColorIndexBySeries,
        });
      }

      const color = isMinAvgOrMax
        ? R.head(colorPalette)
        : getListItemAtTurningIndex(seriesIndex, colorPalette);

      // Reduce opacity of non-highlighted
      return anyHighlighted
        ? new TinyColor(color).setAlpha(nonHighlightedOpacity).toRgbString()
        : color;
    })();

    const lineColor =
      symbol === 'cross'
        ? null
        : isSeriesHighlighted
          ? // Highlighted points get a outline in the darkened highlight color
            new TinyColor(seriesColor).darken(20).toString()
          : 'white';
    const lineWidth = symbol === 'cross' ? 2 : isSeriesHighlighted ? 1.5 : 0.5;
    const hoverLineWidth = symbol === 'cross' ? 2 : isSeriesHighlighted ? 2 : 1;

    const symbolRadius = symbolMinMaxLayout ? 9 : 6;
    const finalRadius = symbol === 'cross' ? symbolRadius - 1 : symbolRadius;

    return {
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(series.label).getTime()
        : series.label,
      data: mapWithIndex((pointData, pointIndex) => {
        const category = R.nth(pointIndex, data.categories);

        const baselineOrHighlightColor = getBaselineOrHighlightColor(
          category,
          highlight,
          baseline,
          matchingHighlightColors,
        );

        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        return {
          name: category.label,
          ...dataPoint,
          color: baselineOrHighlightColor,
          marker: {
            fillColor: baselineOrHighlightColor,
          },
        };
      }, series.data),
      color: seriesColor,
      showInLegend: true,
      marker: {
        symbol,
        lineColor,
        lineWidth,
        radius: finalRadius,
        fillColor: seriesColor,
        states: {
          hover: {
            lineWidth: hoverLineWidth,
            radius: finalRadius,
          },
        },
      },
      ...(symbolMinMaxLayout
        ? {
            dataLabels: {
              y: isMinAvgOrMax ? 45 : -20,
            },
          }
        : undefined),
    };
  }, data.series);

  const symbolMinMaxData = symbolMinMaxLayout
    ? R.compose(
        (allSeriesFirstDatum) => {
          const min = R.find(
            R.pathEq(true, ['custom', 'isMin']),
            allSeriesFirstDatum,
          )?.value;
          const max = R.find(
            R.pathEq(true, ['custom', 'isMax']),
            allSeriesFirstDatum,
          )?.value;
          return { min, max };
        },
        R.reject(R.isNil),
        R.map(R.path(['data', 0])),
      )(data.series)
    : null;

  const calcXAxisLayout = () => {
    if (hideYAxisLabels) {
      return categoriesAreDatesOrNumberForDataParsing
        ? { left: '5%', width: '90%' }
        : { left: '3%', width: '97%' };
    }

    return categoriesAreDatesOrNumberForDataParsing
      ? { left: '10%', width: '85%' }
      : { left: '5%', width: '95%' };
  };

  return {
    chart: {
      type: 'scatter',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop:
        hideLegend && chartType !== chartTypes.symbolMinMax
          ? calcMarginTop(title, subtitle, isSmall)
          : undefined,
      ...(symbolMinMaxLayout ? { marginLeft: 12, marginRight: 12 } : {}),
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      events: {
        fullscreenClose,
      },
      inverted: symbolMinMaxLayout,
      className: disableLegendInteraction
        ? 'cb-disable-legend-pointer-events'
        : undefined,
    },

    colors: colorPalette,

    xAxis: {
      categories: categoriesAreDatesOrNumberForDataParsing
        ? null
        : R.map(
            R.compose(
              R.when(
                () => data.areCategoriesDates,
                (v) => categoriesFrequency.tryParse(v).getTime(),
              ),
              R.prop('label'),
            ),
            data.categories,
          ),
      ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        autoRotation: [-90, -45, 0],
        ...R.prop('xAxisLabels', formatters),
        ...(hideXAxisLabels || symbolMinMaxLayout ? { enabled: false } : {}),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      ...calcXAxisLayout(),
      tickWidth: 0,
    },

    yAxis: {
      title: {
        enabled: false,
      },
      gridLineWidth: symbolMinMaxLayout ? 0 : 1,
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        ...R.prop('yAxisLabels', formatters),
        enabled: !hideYAxisLabels && !symbolMinMaxLayout,
        align: 'left',
        x: 0,
        y: -4,
      },
      reversed: symbolMinMaxLayout && sortOrder === sortOrderOptions.desc.value,
      ...(!R.isNil(symbolMinMaxData?.min) && !R.isNil(symbolMinMaxData?.max)
        ? {
            tickPositions: [
              symbolMinMaxData.min,
              //avoids a bug in Hightcharts that do not always display the max value
              symbolMinMaxData.max + Math.abs(symbolMinMaxData.max * 0.001),
            ],
          }
        : {}),
    },

    legend: {
      enabled: !hideLegend && !symbolMinMaxLayout,
      ...R.prop('seriesLabels', formatters),
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      squareSymbol: false,
      symbolRadius: 0,
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: isSmall ? 26 : 34,
    },

    plotOptions: {
      series: {
        animation: false,
        dataLabels: {
          ...(symbolMinMaxLayout ? { enabled: true } : {}),
          ...R.prop('dataLabels', formatters),
        },
      },
    },

    series: allSeries,
  };
};
