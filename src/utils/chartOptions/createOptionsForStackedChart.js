// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  baselineColor,
  chartSpacing,
  chartSpacingFullScreenAndExport,
  chartTypes,
  nonHighlightedOpacity,
  stackingOptions,
} from '../../constants/chart';
import { calcMarginTopWithHorizontal } from '../chartUtil';
import { getListItemAtTurningIndex, getSeriesColor } from '../chartUtilCommon';
import { mapWithIndex } from '../ramdaUtil';
import { createDatapoint } from './createDataPoint';
import { getBaselineHighlightCodes } from './getBaselineHighlightCodes';

/**
 * @param {{
 * data: {
 *   code: string;
 *   label: string;
 *   data: { value: number }[];
 * }
 * }} options
 */
const createStackedDatapoints = ({
  data,
  colorPalette,
  fixedColorIndexBySeries,
  highlightColors,
  smallerHighlightColors,
  categoriesAreDatesOrNumberForDataParsing,
  seriesFrequency,
  baselineCodes,
  highlightedCodes,
  highlightedSeriesCodes,
  highlightedCategoryCodes,
}) => {
  // Find a matching highlight color palette
  const matchingHighlightColors =
    R.find(
      R.propEq(highlightedCodes.length, 'length'),
      smallerHighlightColors,
    ) || highlightColors;

  const anyCategoriesHighlighted = highlightedCategoryCodes.length > 0;

  return mapWithIndex((series, seriesIndex) => {
    const seriesCode = series.code;

    const seriesBaselineIndex = baselineCodes.indexOf(seriesCode);
    const isSeriesBaseline = seriesBaselineIndex !== -1;

    const seriesHighlightIndex = highlightedCodes.indexOf(seriesCode);
    const isSeriesHighlighted = seriesHighlightIndex !== -1;

    const getFinalSeriesColor = () => {
      if (isSeriesBaseline) return baselineColor;
      if (isSeriesHighlighted) {
        return getListItemAtTurningIndex(
          seriesHighlightIndex,
          matchingHighlightColors,
        );
      }
      const colorFromPalette = getSeriesColor({
        colorPalette,
        seriesIndex,
        seriesCode,
        fixedColorIndexBySeries,
      });
      if (highlightedSeriesCodes.length > 0) {
        return new TinyColor(colorFromPalette)
          .setAlpha(nonHighlightedOpacity)
          .toRgbString();
      }
      return colorFromPalette;
    };
    const seriesColor = getFinalSeriesColor();

    return {
      custom: {
        isBaseline: isSeriesBaseline,
        isHighlighted: isSeriesHighlighted,
      },
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(series.label).getTime()
        : series.label,
      color: seriesColor,
      marker: {
        enabled: false,
        symbol: 'circle',
        radius: 3,
        lineWidth: 2,
        states: {
          hover: {
            enabled: true,
          },
        },
      },
      showInLegend: true,
      data: mapWithIndex((pointData, pointIndex) => {
        const category = R.nth(pointIndex, data.categories);
        const categoryCode = category.code;

        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        // Same baseline/highlighting code as in `createOptionsForBarChart`

        // Baseline

        const categoryBaselineIndex = baselineCodes.indexOf(categoryCode);
        const isCategoryBaseline = categoryBaselineIndex !== -1;

        const isBaseline = isSeriesBaseline || isCategoryBaseline;

        // Highlight

        const categoryHighlightIndex = highlightedCodes.indexOf(categoryCode);
        const isCategoryHighlighted = categoryHighlightIndex !== -1;

        const finalIsHighlighted = isSeriesHighlighted || isCategoryHighlighted;
        const finalHighlightIndex = isSeriesHighlighted
          ? seriesHighlightIndex
          : isCategoryHighlighted
            ? categoryHighlightIndex
            : -1;

        // Colors

        const highlightColor = finalIsHighlighted
          ? getListItemAtTurningIndex(
              finalHighlightIndex,
              matchingHighlightColors,
            )
          : null;

        const getPointColor = () => {
          // Only color the bar segment if the series is baseline or highlighted.
          // If the category is highlighted, we draw an outline around all segments.

          if (isSeriesBaseline) {
            return baselineColor;
          }
          if (isSeriesHighlighted) {
            return getListItemAtTurningIndex(
              seriesHighlightIndex,
              matchingHighlightColors,
            );
          }
          // Reduce opacity for non-baseline/non-highlighted background categories
          if (
            !isCategoryBaseline &&
            !isCategoryHighlighted &&
            anyCategoriesHighlighted
          ) {
            return new TinyColor(seriesColor)
              .setAlpha(nonHighlightedOpacity)
              .toRgbString();
          }
          return null;
        };
        const pointColor = getPointColor();

        return {
          ...dataPoint,
          custom: {
            ...dataPoint.custom,
            // Baseline
            isBaseline,
            isSeriesBaseline,
            isCategoryBaseline,
            // Highlight
            isHighlighted: finalIsHighlighted,
            isSeriesHighlighted,
            isCategoryHighlighted,
            highlightColor,
          },
          name: category.label,
          color: pointColor,
        };
      }, series.data),
    };
  }, data.series);
};

/**
 * @param {{
 * highlight?: string[];
 * baseline?: string[];
 * }} options
 */
export const createOptionsForStackedChart = ({
  chartType,
  data,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  fixedColorIndexBySeries = null,
  baseline = null,
  highlight = null,
  highlightColors,
  smallerHighlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
  stacking = stackingOptions.percent.value,
  categoriesAreDatesOrNumberForDataParsing,
  categoriesFrequency,
  seriesFrequency,
  disableLegendInteraction = false,
}) => {
  const horizontal = chartType === chartTypes.stackedRow;
  const area = chartType === chartTypes.stackedArea;

  const highChartsChartType = R.cond([
    [R.always(area), R.always('areaspline')],
    [R.always(horizontal), R.always('bar')],
    [R.T, R.always('column')],
  ])();

  const calcXAxisLayout = () => {
    if (area) {
      if (hideYAxisLabels) {
        return categoriesAreDatesOrNumberForDataParsing
          ? { left: '5%', width: '90%' }
          : { left: '2%', width: '98%' };
      }

      return categoriesAreDatesOrNumberForDataParsing
        ? { left: '10%', width: '85%' }
        : { left: '5%', width: '95%' };
    }

    if (horizontal) {
      return hideXAxisLabels
        ? { top: '5%', height: '91%' }
        : { top: '8%', height: '88%' };
    }

    return hideYAxisLabels
      ? { left: '6%', width: '90%' }
      : { left: '9%', width: '87%' };
  };

  const calcLegendMargin = () => {
    if (isSmall) {
      return horizontal ? 10 : 26;
    }

    return horizontal ? 14 : 34;
  };

  const {
    baselineCodes,
    highlightedCodes,
    highlightedSeriesCodes,
    highlightedCategoryCodes,
    matchingHighlightColors,
    isCategoryGroupHighlighted,
  } = getBaselineHighlightCodes({
    data,
    baseline,
    highlight,
    smallerHighlightColors,
    highlightColors,
  });

  const allSeries = createStackedDatapoints({
    data,
    colorPalette,
    fixedColorIndexBySeries,
    highlightColors,
    smallerHighlightColors,
    categoriesAreDatesOrNumberForDataParsing,
    seriesFrequency,
    baselineCodes,
    highlightedCodes,
    highlightedSeriesCodes,
    highlightedCategoryCodes,
  });

  /** Custom chart options used by the baseline/highlighting render callbacks */
  const customChartOptions = {
    baselineCodes,
    highlightedCodes,
    highlightedCategoryCodes,
    highlightColors: matchingHighlightColors,
    isCategoryGroupHighlighted,
  };

  return {
    custom: customChartOptions,

    chart: {
      type: highChartsChartType,
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop: hideLegend
        ? calcMarginTopWithHorizontal(title, subtitle, horizontal, isSmall)
        : undefined,
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      events: {
        fullscreenClose,
      },
      className: disableLegendInteraction
        ? 'cb-disable-legend-pointer-events'
        : undefined,
    },

    colors: colorPalette,

    xAxis: {
      categories:
        area && categoriesAreDatesOrNumberForDataParsing
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
      ...(data.areCategoriesDates
        ? {
            type: 'datetime',
          }
        : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        autoRotation: [-90, -45, 0],
        ...R.prop('xAxisLabels', formatters),
        ...((hideXAxisLabels && !horizontal) || (hideYAxisLabels && horizontal)
          ? { enabled: false }
          : {}),
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
      startOnTick: false,
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        ...R.prop('yAxisLabels', formatters),
        enabled:
          (!horizontal && !hideYAxisLabels) || (horizontal && !hideXAxisLabels),
        align: 'left',
        ...(horizontal ? { x: 4, y: isSmall ? 28 : 35 } : { x: 0, y: -4 }),
      },
      opposite: horizontal,
      reversedStacks: false,
    },

    legend: {
      enabled: !hideLegend,
      ...R.prop('seriesLabels', formatters),
      reversed: false,
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
      margin: calcLegendMargin(),
    },

    plotOptions: {
      series: {
        animation: false,
        stacking: stacking || stackingOptions.percent.value,
        pointPadding: 0.1,
        groupPadding: 0.1,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
        },
      },
    },

    series: allSeries,
  };
};
