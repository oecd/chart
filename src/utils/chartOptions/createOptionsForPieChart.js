// @ts-check
import * as R from 'ramda';
import {
  animationConfig,
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
  disableAnimation = false,
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
          isHighlighted: highlightCodes.includes(categoryCodeLowercase),
          isBaseline: baselineCodes.includes(categoryCodeLowercase),
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

  return {
    chart: {
      type: 'pie',
      height,
      animation: disableAnimation ? false : animationConfig,
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
        animation: disableAnimation ? false : animationConfig,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
      },
      pie: {
        dataLabels: {
          enabled: !hideXAxisLabels,
          ...R.prop('xAxisLabels', formatters),
          style: fontStyleForTextElement(textElementTypes.legend, chartSize),
        },
        showInLegend: !hideLegend,
      },
    },

    series: allSeries,
  };
};
