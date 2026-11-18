// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  animationConfig,
  baselineColor,
  chartSpacing,
  chartSpacingFullScreenAndExport,
  nonHighlightedOpacity,
} from '../../constants/chart';
import { textElementTypes } from '../../constants/styling';
import {
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
  getSeriesColor,
} from '../chartUtilCommon';
import { makeColorReadableOnBackgroundColor } from '../colorUtil';
import { isNilOrEmpty, mapWithIndex } from '../ramdaUtil';
import {
  calcLegendMarginDefault,
  calcLegendMarginInlineLabels,
  calcMarginTopDefault,
  fontStyleForTextElement,
} from '../stylingUtil';
import { createAnnotationPlotBands } from './createAnnotationPlotBands';
import { createAnnotationPointsWithOptions } from './createAnnotationPointsWithOptions';
import { createDatapoint } from './createDataPoint';
import { highlightSymbols } from './highlightSymbols';
import { parseCategories } from './parseCategories';

const SYMBOL_RADIUS = 3;
const HIGHLIGHTED_SYMBOL_RADIUS = 3.5;
const HIGHLIGHTED_SYMBOL_LINE_WIDTH = 1.5;

/**
 * @param {import("./getBaselineAndHighlightCodes").BaselineAndHighlightCodes} options
 */
export const createOptionsForLineChart = ({
  data,
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
  matchingHighlightOutlineColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  categoriesAreDatesOrNumberForDataParsing,
  categoriesFrequency,
  seriesFrequency,
  inlineLabels = false,
  disableLegendInteraction = false,
  hideLineSymbols = false,
  chartSize,
  disableAnimation = false,
  positionedBandAnnotations,
  positionedPointAnnotations,
}) => {
  const anySeriesHighlighted = highlightSeriesCodes.length > 0;

  const showAnnotationLabelsInline = positionedBandAnnotations
    ? R.any(R.prop('showLabelInline'), positionedBandAnnotations)
    : false;

  const allSeries = mapWithIndex((series, seriesIndex) => {
    const seriesCodeLowercase = series.code.toLowerCase();
    const isSeriesBaseline = baselineCodes.includes(seriesCodeLowercase);
    const seriesHighlightIndex = highlightCodes.indexOf(seriesCodeLowercase);
    const isSeriesHighlighted = seriesHighlightIndex !== -1;

    const seriesColor = (() => {
      const baselineOrHighlightColor = getBaselineOrHighlightColor(
        seriesCodeLowercase,
        baselineCodes,
        highlightCodes,
        matchingHighlightColors,
      );
      if (baselineOrHighlightColor) {
        return baselineOrHighlightColor;
      }

      const colorFromPalette = getSeriesColor({
        colorPalette,
        seriesIndex,
        seriesCode: seriesCodeLowercase,
        fixedColorIndexBySeries,
      });
      // Reduce opacity of non-highlighted lines
      if (anySeriesHighlighted) {
        return new TinyColor(colorFromPalette)
          .setAlpha(nonHighlightedOpacity)
          .toRgbString();
      }
      return colorFromPalette;
    })();

    const seriesMarkerLineColor = isSeriesHighlighted
      ? getListItemAtTurningIndex(
          seriesHighlightIndex,
          matchingHighlightOutlineColors,
        )
      : null;

    const dataLabelColor = makeColorReadableOnBackgroundColor(
      seriesColor,
      'white',
    );

    const lastDataPointWithDataIndex = R.findLastIndex(
      (d) => !isNilOrEmpty(d.value),
      series.data,
    );

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
      data: mapWithIndex((pointData, pointIndex) => {
        const category = R.nth(pointIndex, data.categories);
        const categoryCodeLowercase = category.code.toLowerCase();

        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        const isCategoryBaseline = baselineCodes.includes(
          categoryCodeLowercase,
        );

        const categoryHighlightIndex = highlightCodes.indexOf(
          categoryCodeLowercase,
        );
        const isCategoryHighlighted = categoryHighlightIndex !== -1;

        // The category highlight prevails for the marker point styling
        const finalHighlightIndex = isCategoryHighlighted
          ? categoryHighlightIndex
          : isSeriesHighlighted
            ? seriesHighlightIndex
            : -1;

        const finalIsHighlighted = isSeriesHighlighted || isCategoryHighlighted;

        const highlightColor = isCategoryBaseline
          ? baselineColor
          : finalIsHighlighted
            ? getListItemAtTurningIndex(
                finalHighlightIndex,
                matchingHighlightColors,
              )
            : null;

        const lineColor = isCategoryBaseline
          ? baselineColor
          : finalIsHighlighted
            ? getListItemAtTurningIndex(
                finalHighlightIndex,
                matchingHighlightOutlineColors,
              )
            : null;

        const customPointOptions = {
          ...dataPoint.custom,
          // For time scales, `point.category` contains timestamps,
          // so we pass the original code here.
          categoryCodeLowercase,
          isCategoryBaseline,
          // Highlight
          isHighlighted: finalIsHighlighted,
          isBaseline: isSeriesBaseline,
          isSeriesHighlighted,
          isCategoryHighlighted,
          highlightColor,
        };

        return {
          ...dataPoint,
          /** Custom options used by the highlight render callbacks */
          custom: customPointOptions,
          color: highlightColor,
          dataLabels:
            inlineLabels &&
            pointIndex === lastDataPointWithDataIndex &&
            lastDataPointWithDataIndex !== -1
              ? // Show inline label on last data point
                {
                  enabled: true,
                  align: 'left',
                  verticalAlign: 'middle',
                  x: 10,
                  y: 1,
                  crop: false,
                  overflow: 'allow',
                  allowOverlap: true,
                  ...R.prop('dataLabelForInlineLabels', formatters),
                  style: fontStyleForTextElement(
                    textElementTypes.legend,
                    chartSize,
                  ),
                }
              : null,
          marker: {
            radius: isCategoryHighlighted ? HIGHLIGHTED_SYMBOL_RADIUS : null,
            lineWidth: isCategoryHighlighted
              ? HIGHLIGHTED_SYMBOL_LINE_WIDTH
              : null,
            lineColor,
            fillColor: highlightColor,
          },
        };
      }, series.data),
      type: 'spline',
      lineWidth: 2.5,
      marker: {
        enabled: !hideLineSymbols,
        symbol: isSeriesHighlighted
          ? getListItemAtTurningIndex(seriesHighlightIndex, highlightSymbols)
          : 'circle',
        radius: isSeriesHighlighted ? HIGHLIGHTED_SYMBOL_RADIUS : SYMBOL_RADIUS,
        lineWidth: isSeriesHighlighted ? HIGHLIGHTED_SYMBOL_LINE_WIDTH : null,
        lineColor: seriesMarkerLineColor,
        fillColor: seriesColor,
      },
      states: {
        hover: {
          lineWidth: 2.5,
        },
      },
      color: seriesColor,

      dataLabels: inlineLabels
        ? null
        : {
            ...R.prop('dataLabels', formatters),
            style: {
              ...fontStyleForTextElement(textElementTypes.legend, chartSize),
              color: dataLabelColor,
              textShadow:
                '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
              textOutline: 'none',
            },
          },
      ...(isSeriesHighlighted ? { zIndex: 1 } : null),
    };
  }, data.series);

  const legend = R.ifElse(
    () => inlineLabels,
    // legend is enabled but hidden so that Highcharts reserves the space needed for last data points data label (hack)
    () => ({
      enabled: true,
      ...R.prop('seriesLabels', formatters),
      margin: calcLegendMarginInlineLabels(chartSize),
      symbolWidth: 0,
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      itemStyle: {
        visibility: 'hidden',
        ...fontStyleForTextElement(textElementTypes.legend, chartSize),
      },
    }),
    () => ({
      enabled: !hideLegend,
      ...R.prop('seriesLabels', formatters),
      itemDistance: 10,
      itemStyle: fontStyleForTextElement(textElementTypes.legend, chartSize),
      align: 'left',
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin:
        calcLegendMarginDefault(chartSize) +
        (showAnnotationLabelsInline ? 15 : 0),
    }),
  )();

  const calcXAxisLayout = () => {
    if (hideYAxisLabels) {
      return categoriesAreDatesOrNumberForDataParsing
        ? { left: '5%', width: '90%' }
        : { left: '3%', width: '98%' };
    }

    return categoriesAreDatesOrNumberForDataParsing
      ? { left: '10%', width: '85%' }
      : { left: '5%', width: '95%' };
  };

  const parsedCategories = parseCategories(
    data.categories,
    data.areCategoriesDates,
    categoriesFrequency,
  );

  /** Custom chart options used by the baseline/highlight render callbacks */
  const customChartOptions = {
    highlightCodes,
    baselineCodes,
    highlightCategoryCodes,
    categories: data.categories.map((category) => category.code.toLowerCase()),
    parsedCategories,
    areCategoriesDates: data.areCategoriesDates,
  };

  const xAxisCategories = categoriesAreDatesOrNumberForDataParsing
    ? null
    : R.map(R.prop('parsedLabel'), parsedCategories);

  const plotBands = positionedBandAnnotations
    ? createAnnotationPlotBands({
        positionedAnnotations: positionedBandAnnotations,
        chartSize,
        showLabelsInline: showAnnotationLabelsInline,
        position: 'top',
      })
    : null;

  const annotationPoints = positionedPointAnnotations
    ? createAnnotationPointsWithOptions(positionedPointAnnotations)
    : null;

  const labelStyle = fontStyleForTextElement(
    textElementTypes.legend,
    chartSize,
  );

  const marginTop = (() => {
    /** @type {number | undefined} */
    let marginTop;
    if (hideLegend || inlineLabels) {
      marginTop = calcMarginTopDefault(title, subtitle, chartSize);
    }
    if (typeof marginTop === 'number' && showAnnotationLabelsInline) {
      marginTop += parseFloat(labelStyle.fontSize);
    }
    return marginTop;
  })();

  return {
    annotations: annotationPoints,

    custom: customChartOptions,

    chart: {
      marginTop,
      height,
      animation: disableAnimation ? false : animationConfig,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      events: {
        fullscreenClose,
      },
      className:
        inlineLabels || disableLegendInteraction
          ? 'cb-disable-legend-pointer-events'
          : undefined,
    },

    colors: [R.head(colorPalette)],

    xAxis: {
      custom: { isXAxis: true },
      categories: xAxisCategories,
      ...(categoriesAreDatesOrNumberForDataParsing && data.areCategoriesDates
        ? { type: 'datetime' }
        : null),
      labels: {
        style: labelStyle,
        autoRotation: [-90, -45, 0],
        ...R.prop('xAxisLabels', formatters),
        ...(hideXAxisLabels ? { enabled: false } : null),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      ...calcXAxisLayout(),
      tickWidth: 0,
      plotBands,
    },

    yAxis: {
      title: {
        enabled: false,
      },
      startOnTick: false,
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: fontStyleForTextElement(textElementTypes.legend, chartSize),
        ...R.prop('yAxisLabels', formatters),
        enabled: !hideYAxisLabels,
        align: 'left',
        x: 0,
        y: -4,
      },
    },

    legend,

    plotOptions: {
      series: {
        animation: disableAnimation ? false : animationConfig,

        events: {
          mouseOver: inlineLabels
            ? null
            : (e) => {
                e.target.data.forEach((p) => {
                  p.update(
                    {
                      dataLabels: { enabled: true },
                    },
                    false,
                    false,
                    false,
                  );
                });
                e.target.chart.redraw();
              },
          mouseOut: inlineLabels
            ? null
            : (e) => {
                e.target.data.forEach((p) => {
                  p.update(
                    {
                      dataLabels: { enabled: false },
                    },
                    false,
                    false,
                    false,
                  );
                });
                e.target.chart.redraw();
              },
        },
      },
    },

    series: allSeries,
  };
};
