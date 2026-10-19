// @ts-check
import * as R from 'ramda';
import {
  chartSpacing,
  chartSpacingFullScreenAndExport,
} from '../../constants/chart';
import { createDatapoint } from '../chartOptions/createDataPoint';
import {
  getBaselineOrHighlightColor,
  getSeriesColor,
} from '../chartUtilCommon';
import { mapWithIndex } from '../ramdaUtil';
import { xAxisLabelFormatter } from './xAxisLabelFormatter';
import { textElementTypes } from '../../constants/styling';
import {
  calcLegendMarginDefault,
  fontStyleForTextElement,
} from '../stylingUtil';

/**
 * @param {import("./getBaselineAndHighlightCodes").BaselineAndHighlightCodes} options
 */
export const createOptionsForPieChart = ({
  data,
  baselineCodes,
  highlightCodes,
  formatters = {},
  colorPalette,
  fixedColorIndexBySeries = null,
  matchingHighlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  categoriesAreDatesOrNumberForDataParsing,
  categoriesFrequency,
  seriesFrequency,
  disableLegendInteraction = false,
  chartSize,
}) => {
  const allSeries = R.map(
    (series) => ({
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(series.label).getTime()
        : series.label,
      data: mapWithIndex((pointData, pointIndex) => {
        const category = R.nth(pointIndex, data.categories);

        const color =
          getBaselineOrHighlightColor(
            category.code,
            baselineCodes,
            highlightCodes,
            matchingHighlightColors,
          ) ||
          getSeriesColor({
            colorPalette,
            seriesIndex: pointIndex,
            seriesCode: category.code,
            fixedColorIndexBySeries,
          });

        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        return {
          name: data.areCategoriesDates
            ? categoriesFrequency.tryParse(category.label).getTime()
            : category.label,
          ...dataPoint,
          color,
        };
      }, series.data),
    }),
    R.isEmpty(data.series) ? [] : [R.head(data.series)],
  );

  const xAxisLabelFormatters = formatters.xAxisLabels;
  const xAxisLabelFormat = xAxisLabelFormatters?.format;

  return {
    chart: {
      type: 'pie',
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      marginLeft: 10,
      marginRight: 10,
      events: { fullscreenClose },
      className: disableLegendInteraction
        ? 'cb-disable-legend-pointer-events'
        : undefined,
    },

    legend: {
      ...R.prop('seriesLabels', formatters),
      itemDistance: 10,
      itemStyle: fontStyleForTextElement(textElementTypes.legend, chartSize),
      align: 'left',
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: calcLegendMarginDefault(chartSize),
    },

    plotOptions: {
      series: {
        animation: false,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
      },
      pie: {
        dataLabels: {
          enabled: !hideXAxisLabels,
          // We can't use an arrow function `(context) => {}` here. For pie charts,
          // the `context` param does not carry the point value we need.
          /** @type {import('highcharts').DataLabelsFormatterCallbackFunction} */
          formatter: function () {
            const { name } = this;
            return xAxisLabelFormatter(
              name,
              xAxisLabelFormat,
              data.categories,
              baselineCodes,
              highlightCodes,
            );
          },
          style: fontStyleForTextElement(textElementTypes.legend, chartSize),
        },
        showInLegend: !hideLegend,
      },
    },

    series: allSeries,
  };
};
