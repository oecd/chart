// @ts-check
import * as R from 'ramda';
import {
  chartSpacing,
  chartSpacingFullScreenAndExport,
} from '../../constants/chart';
import { textElementTypes } from '../../constants/styling';
import { createDatapoint } from '../chartOptions/createDataPoint';
import {
  getBaselineOrHighlightColor,
  getSeriesColor,
} from '../chartUtilCommon';
import { mapWithIndex } from '../ramdaUtil';
import {
  calcLegendMarginDefault,
  fontStyleForTextElement,
} from '../stylingUtil';
import { legendLabelFormatter } from './legendLabelFormatter';
import { parseCategories } from './parseCategories';
import { xAxisLabelFormatter } from './xAxisLabelFormatter';

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
        const categoryCodeLowercase = category.code.toLowerCase();

        const color =
          getBaselineOrHighlightColor(
            categoryCodeLowercase,
            baselineCodes,
            highlightCodes,
            matchingHighlightColors,
          ) ||
          getSeriesColor({
            colorPalette,
            seriesIndex: pointIndex,
            seriesCode: categoryCodeLowercase,
            fixedColorIndexBySeries,
          });

        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        const customPointOptions = {
          ...dataPoint.custom,
          categoryCodeLowercase,
        };

        return {
          name: data.areCategoriesDates
            ? categoriesFrequency.tryParse(category.label).getTime()
            : category.label,
          ...dataPoint,
          color,
          custom: customPointOptions,
        };
      }, series.data),
    }),
    R.isEmpty(data.series) ? [] : [R.head(data.series)],
  );

  const xAxisLabelFormatters = formatters.xAxisLabels;
  const xAxisLabelFormat = xAxisLabelFormatters?.format;

  const seriesLabelFormatters = formatters.seriesLabels;
  const seriesLabelFormat = seriesLabelFormatters?.labelFormat;

  const parsedCategories = parseCategories(
    data.categories,
    data.areCategoriesDates,
    categoriesFrequency,
  );

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
      /**
       * @type {import('highcharts').FormatterCallbackFunction<import('highcharts').Point>}
       */
      labelFormatter: (point) =>
        point
          ? legendLabelFormatter(
              point.name,
              point.options.custom.categoryCodeLowercase,
              seriesLabelFormat,
              baselineCodes,
              highlightCodes,
            )
          : '',
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
          /**
           * This needs to be a function expression.
           * We can't use an arrow function `(context) => {}` here. For pie charts,
           * the `context` param does not carry the point value.
           * @see https://api.highcharts.com/highcharts/plotOptions.pie.dataLabels.formatter
           * @type {import('highcharts').DataLabelsFormatterCallbackFunction}
           */
          formatter: function () {
            const { name } = this;
            return xAxisLabelFormatter(
              name,
              xAxisLabelFormat,
              parsedCategories,
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
