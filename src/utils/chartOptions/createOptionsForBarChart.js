// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  baselineColor,
  chartSizes,
  chartSpacing,
  chartSpacingFullScreenAndExport,
  chartTypes,
  nonHighlightedOpacity,
} from '../../constants/chart';
import { textElementTypes } from '../../constants/styling';
import { createDatapoint } from '../chartOptions/createDataPoint';
import { getListItemAtTurningIndex, getSeriesColor } from '../chartUtilCommon';
import { mapWithIndex } from '../ramdaUtil';
import {
  calcLegendMarginForBarAndStacked,
  calcMarginTopForBarAndStacked,
  calcYAxisCoordinatesForBarAndStacked,
  fontStyleForTextElement,
} from '../stylingUtil';
import { createAnnotationPlotBands } from './createAnnotationPlotBands';
import { xAxisLabelFormatter } from './xAxisLabelFormatter';

/**
 * @param {import("./getBaselineAndHighlightCodes").BaselineAndHighlightCodes} options
 */
export const createOptionsForBarChart = ({
  chartType,
  data,
  categoryCodes,
  baselineCodes,
  highlightCodes,
  highlightSeriesCodes,
  highlightCategoryCodes,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  fixedColorIndexBySeries = null,
  matchingHighlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  pivotValue = 0,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  categoriesAreDatesOrNumberForDataParsing,
  categoriesFrequency,
  seriesFrequency,
  disableLegendInteraction = false,
  chartSize,
  positionedAnnotations,
}) => {
  const horizontal = chartType === chartTypes.row;

  const calcXAxisLayout = () => {
    if (horizontal) {
      if (hideXAxisLabels) {
        return categoriesAreDatesOrNumberForDataParsing
          ? { top: '5.5%', height: '91%' }
          : { top: '6%', height: '90%' };
      }

      return categoriesAreDatesOrNumberForDataParsing
        ? { top: '7.5%', height: '88.9%' }
        : { top: '8%', height: '88%' };
    }

    if (hideYAxisLabels) {
      return categoriesAreDatesOrNumberForDataParsing
        ? { left: '6%', width: '91%' }
        : { left: '7%', width: '89%' };
    }

    return categoriesAreDatesOrNumberForDataParsing
      ? { left: '8%', width: '89%' }
      : { left: '9%', width: '87%' };
  };

  /** Whether there are multiple series */
  const isGroupedChart = data.series.length > 1;

  const isBaselineACategory = !R.isEmpty(
    R.intersection(Array.from(categoryCodes), baselineCodes),
  );

  const anySeriesHighlighted = highlightSeriesCodes.length > 0;
  const anyCategoryHighlighted = highlightCategoryCodes.length > 0;

  /**
   * Whether a category is baseline/highlighted that contains several points
   * and can be highlighted as a visual group, not as individual points.
   */
  const isCategoryGroupHighlighted =
    isGroupedChart && (isBaselineACategory || anyCategoryHighlighted);

  /** Custom chart options used by the baseline/highlight render callbacks */
  const customChartOptions = {
    baselineCodes,
    highlightCodes,
    highlightCategoryCodes,
    highlightColors: matchingHighlightColors,
    isCategoryGroupHighlighted,
  };

  const xAxisLabelFormatters = formatters.xAxisLabels;
  const xAxisLabelFormat = xAxisLabelFormatters?.format;

  // const showAnnotationLabelsInline = annotations.length > 0 && !horizontal;
  const showAnnotationLabelsInline = true;
  const plotBands = createAnnotationPlotBands({
    positionedAnnotations,
    isSmall: chartSize === chartSizes.small,
    showLabelsInline: showAnnotationLabelsInline,
  });

  const labelStyle = fontStyleForTextElement(
    textElementTypes.legend,
    chartSize,
  );

  const marginTop = (() => {
    /** @type {number | undefined} */
    let marginTop;
    if (hideLegend) {
      marginTop = calcMarginTopForBarAndStacked(
        title,
        subtitle,
        horizontal,
        chartSize,
      );
    }
    if (typeof marginTop === 'number' && showAnnotationLabelsInline) {
      marginTop += parseFloat(labelStyle.fontSize);
    }
    return marginTop;
  })();

  return {
    custom: customChartOptions,

    chart: {
      type: horizontal ? 'bar' : 'column',
      marginTop,
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      events: { fullscreenClose },
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
      ...(data.areCategoriesDates ? { type: 'datetime' } : null),
      labels: {
        style: labelStyle,
        autoRotation: [-90, -45, 0],
        ...xAxisLabelFormatters,
        /** @type {import('highcharts').AxisLabelsFormatterCallbackFunction} */
        formatter: ({ chart, value }) =>
          xAxisLabelFormatter(
            chart,
            value,
            xAxisLabelFormat,
            data.categories,
            baselineCodes,
            highlightCodes,
          ),
        ...((hideXAxisLabels && !horizontal) || (hideYAxisLabels && horizontal)
          ? { enabled: false }
          : null),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      ...calcXAxisLayout(),
      tickWidth: 0,
      plotBands,
    },

    yAxis: {
      title: {
        text: '',
      },
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: fontStyleForTextElement(textElementTypes.legend, chartSize),
        ...R.prop('yAxisLabels', formatters),
        enabled:
          (!horizontal && !hideYAxisLabels) || (horizontal && !hideXAxisLabels),

        align: 'left',
        ...calcYAxisCoordinatesForBarAndStacked(horizontal, chartSize),
      },
      opposite: horizontal,
    },

    legend: {
      enabled: !hideLegend,
      ...R.prop('seriesLabels', formatters),
      itemDistance: 10,
      itemStyle: fontStyleForTextElement(textElementTypes.legend, chartSize),
      align: 'left',
      squareSymbol: false,
      symbolRadius: 0,
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: calcLegendMarginForBarAndStacked(chartSize, horizontal),
    },

    plotOptions: {
      series: {
        animation: false,
        pointPadding: 0.1,
        groupPadding: 0.1,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
        threshold: parseFloat(pivotValue) || 0,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
        },
      },
    },

    series: mapWithIndex((series, seriesIndex) => {
      const seriesCodeLowercase = series.code.toLowerCase();

      const isSeriesBaseline = baselineCodes.includes(seriesCodeLowercase);

      const seriesHighlightIndex = highlightCodes.indexOf(seriesCodeLowercase);
      const isSeriesHighlighted = seriesHighlightIndex !== -1;

      const seriesColor = (() => {
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
          seriesCode: seriesCodeLowercase,
          fixedColorIndexBySeries,
        });
        if (anySeriesHighlighted) {
          return new TinyColor(colorFromPalette)
            .setAlpha(nonHighlightedOpacity)
            .toRgbString();
        }
        return colorFromPalette;
      })();

      const customSeriesOptions = {
        seriesCodeLowercase,
        isBaseline: isSeriesBaseline,
        isHighlighted: isSeriesHighlighted,
      };

      return {
        custom: customSeriesOptions,
        name: data.areSeriesDates
          ? seriesFrequency.tryParse(series.label).getTime()
          : series.label,
        color: seriesColor,
        showInLegend: true,
        data: mapWithIndex((pointData, pointIndex) => {
          const category = R.nth(pointIndex, data.categories);
          const categoryCodeLowercase = category.code.toLowerCase();

          const dataPoint = createDatapoint(
            pointData,
            categoriesAreDatesOrNumberForDataParsing,
          );

          // Baseline
          const isCategoryBaseline = baselineCodes.includes(
            categoryCodeLowercase,
          );
          const finalIsBaseline = isSeriesBaseline || isCategoryBaseline;

          // Highlight
          const categoryHighlightIndex = highlightCodes.indexOf(
            categoryCodeLowercase,
          );
          const isCategoryHighlighted = categoryHighlightIndex !== -1;

          const finalIsHighlighted =
            isSeriesHighlighted || isCategoryHighlighted;
          const finalHighlightIndex = isSeriesHighlighted
            ? seriesHighlightIndex
            : isCategoryHighlighted
              ? categoryHighlightIndex
              : -1;

          // Highlight colors

          const highlightColor = finalIsHighlighted
            ? getListItemAtTurningIndex(
                finalHighlightIndex,
                matchingHighlightColors,
              )
            : null;

          // Category highlight colors

          const categoryHighlightColor = isCategoryHighlighted
            ? getListItemAtTurningIndex(
                categoryHighlightIndex,
                matchingHighlightColors,
              )
            : null;

          // Only color the bar in a grouped bar chart since we draw an outline
          // around baseline/highlight bar groups then.
          const pointColor = (() => {
            if (!isGroupedChart) {
              return null;
            }

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
              anyCategoryHighlighted
            ) {
              return new TinyColor(seriesColor)
                .setAlpha(nonHighlightedOpacity)
                .toRgbString();
            }
            return null;
          })();

          const customPointOptions = {
            ...dataPoint.custom,
            categoryCodeLowercase,
            // Baseline
            isBaseline: finalIsBaseline,
            isSeriesBaseline,
            isCategoryBaseline,
            // Highlight
            isHighlighted: finalIsHighlighted,
            isSeriesHighlighted,
            isCategoryHighlighted,
            highlightColor,
            categoryHighlightColor,
          };

          return {
            ...dataPoint,
            custom: customPointOptions,
            name: category.label,
            color: pointColor,
          };
        }, series.data),
      };
    }, data.series),
  };
};
