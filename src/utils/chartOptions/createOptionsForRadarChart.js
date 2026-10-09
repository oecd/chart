// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  baselineColor,
  chartSpacing,
  chartSpacingFullScreenAndExport,
  nonHighlightedOpacity,
} from '../../constants/chart';
import { createDatapoint } from '../chartOptions/createDataPoint';
import {
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
  getSeriesColor,
} from '../chartUtilCommon';
import { makeColorReadableOnBackgroundColor } from '../colorUtil';
import { mapWithIndex } from '../ramdaUtil';
import { getBaselineAndHighlightCodes } from './getBaselineAndHighlightCodes';
import { highlightSymbols } from './highlightSymbols';
import { xAxisLabelFormatter } from './xAxisLabelFormatter';
import { textElementTypes } from '../../constants/styling';
import { fontStyleForTextElement } from '../stylingUtil';

const SYMBOL_RADIUS = 3;
const HIGHLIGHTED_SYMBOL_RADIUS = 3.5;
const HIGHLIGHTED_SYMBOL_LINE_WIDTH = 1.5;

export const createOptionsForRadarChart = ({
  data,
  formatters = {},
  colorPalette,
  fixedColorIndexBySeries = null,
  highlight = null,
  baseline = null,
  matchingHighlightColors,
  matchingHighlightOutlineColors,
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
  disableLegendInteraction = false,
  chartSize,
}) => {
  const { baselineCodes, highlightCodes, highlightSeriesCodes } =
    getBaselineAndHighlightCodes({
      data,
      baseline,
      highlight,
    });

  const seenCategories = new Set();

  const anySeriesHighlighted = highlightSeriesCodes.length > 0;

  const allSeries = mapWithIndex((series, seriesIndex) => {
    const seriesCodeLowercase = series.code.toLowerCase();

    const seriesHighlightIndex = highlightCodes.indexOf(seriesCodeLowercase);
    const isSeriesHighlighted = seriesHighlightIndex !== -1;

    const seriesColor = (() => {
      const baselineOrHighlightColor = getBaselineOrHighlightColor(
        series,
        highlight,
        baseline,
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

    const dataLabelColor = makeColorReadableOnBackgroundColor(
      seriesColor,
      'white',
    );

    const seriesMarkerLineColor = isSeriesHighlighted
      ? getListItemAtTurningIndex(
          seriesHighlightIndex,
          matchingHighlightOutlineColors,
        )
      : null;

    return {
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(series.label).getTime()
        : series.label,
      data: mapWithIndex((pointData, pointIndex) => {
        const category = R.nth(pointIndex, data.categories);
        const categoryCodeLowercase = category.code.toLowerCase();

        seenCategories.add(categoryCodeLowercase);

        const isCategoryHighlighted = highlightCodes.includes(
          categoryCodeLowercase,
        );

        const point = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );
        return {
          ...point,
          marker: {
            radius: isSeriesHighlighted ? HIGHLIGHTED_SYMBOL_RADIUS : null,
            lineWidth: isCategoryHighlighted
              ? HIGHLIGHTED_SYMBOL_LINE_WIDTH
              : null,
          },
        };
      }, series.data),
      type: 'line',
      lineWidth: 2.5,
      marker: {
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
      showInLegend: true,
      dataLabels: {
        color: dataLabelColor,
        textShadow:
          '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
        textOutline: 'none',
      },
      ...(isSeriesHighlighted ? { zIndex: 1 } : {}),
    };
  }, data.series);

  const calcPaneSize = () => {
    if (hideXAxisLabels) {
      return '100%';
    }

    return isSmall ? '70%' : '85%';
  };

  // Create a plot band for each category highlight
  // https://www.highcharts.com/docs/chart-concepts/plot-bands-and-plot-lines
  const categories = Array.from(seenCategories);
  /** @type {import('highcharts').XAxisPlotBandsOptions[]} */
  const plotBands = categories
    .map((category, index) => {
      const isBaseline = baselineCodes.includes(category);

      const highlightIndex = highlightCodes.indexOf(category);
      const isHighlighted = highlightIndex !== -1;

      if (!(isBaseline || isHighlighted)) return;
      const color = isBaseline
        ? baselineColor
        : getListItemAtTurningIndex(highlightIndex, matchingHighlightColors);

      const from = index - 0.5;
      const to = from + 1;
      // Two plot bands are needed to highlight the first segment
      // because `from: 0` is actually in the middle of the first segment,
      // on the line on which the points sit, and we cannot set `from: -0.5`
      if (index === 0) {
        const from2 = categories.length - 0.5;
        const to2 = categories.length;
        /** @type {import('highcharts').XAxisPlotBandsOptions} */
        const firstHalf = { color, from: from2, to: to2, zIndex: 2 };
        /** @type {import('highcharts').XAxisPlotBandsOptions} */
        const secondHalf = { color, from, to };
        return [firstHalf, secondHalf];
      }
      /** @type {import('highcharts').XAxisPlotBandsOptions} */
      const plotBand = { color, from, to };
      return plotBand;
    })
    .flat()
    .filter((plotBand) => plotBand !== undefined);

  const xAxisLabelFormatters = formatters.xAxisLabels;
  const xAxisLabelFormat = xAxisLabelFormatters?.format;

  return {
    chart: {
      polar: true,
      type: 'line',
      height,
      animation: false,
      margin: hideLegend ? 40 : undefined,
      marginBottom: !hideLegend && isSmall ? 5 : undefined,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      events: { fullscreenClose },
      className: disableLegendInteraction
        ? 'cb-disable-legend-pointer-events'
        : undefined,
    },

    colors: colorPalette,

    pane: {
      startAngle: 0,
      endAngle: 360,
      size: calcPaneSize(),
    },

    xAxis: {
      plotBands,
      categories: R.map(
        R.compose(
          R.when(
            () => data.areCategoriesDates,
            (v) => categoriesFrequency.tryParse(v).getTime(),
          ),
          R.prop('label'),
        ),
        data.categories,
      ),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
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
        enabled: !hideXAxisLabels,
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
    },

    yAxis: {
      title: {
        enabled: false,
      },
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        ...R.prop('yAxisLabels', formatters),
        enabled: !hideYAxisLabels,
      },
    },

    legend: {
      enabled: !hideLegend,
      ...R.prop('seriesLabels', formatters),
      itemDistance: 10,
      itemStyle: fontStyleForTextElement(
        textElementTypes.legendRegular,
        chartSize,
      ),
      align: 'left',
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: isSmall ? 16 : 24,
    },

    plotOptions: {
      series: {
        animation: false,
        pointPadding: 0,
        groupPadding: 0,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
        },
        events: {
          mouseOver: (e) => {
            e.target.data.forEach((p) => {
              p.update(
                {
                  dataLabels: {
                    enabled: true,
                  },
                },
                false,
                false,
                false,
              );
            });
            e.target.chart.redraw();
          },
          mouseOut: (e) => {
            e.target.data.forEach((p) => {
              p.update(
                {
                  dataLabels: {
                    enabled: false,
                  },
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
