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

export const createOptionsForPieChart = ({
  data,
  formatters = {},
  colorPalette,
  fixedColorIndexBySeries = null,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
  categoriesAreDatesOrNumberForDataParsing,
  categoriesFrequency,
  seriesFrequency,
  disableLegendInteraction = false,
}) => {
  const series = R.map(
    (s) => ({
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(s.label).getTime()
        : s.label,
      data: mapWithIndex((d, xIdx) => {
        const category = R.nth(xIdx, data.categories);

        const color =
          getBaselineOrHighlightColor(
            category,
            highlight,
            baseline,
            highlightColors,
          ) ||
          getSeriesColor({
            colorPalette,
            seriesIndex: xIdx,
            seriesCode: category.code,
            fixedColorIndexBySeries,
          });

        const dataPoint = createDatapoint(
          d,
          categoriesAreDatesOrNumberForDataParsing,
        );

        return {
          name: data.areCategoriesDates
            ? categoriesFrequency.tryParse(category.label).getTime()
            : category.label,
          ...dataPoint,
          color,
        };
      }, s.data),
    }),
    R.isEmpty(data.series) ? [] : [R.head(data.series)],
  );

  return {
    chart: {
      type: 'pie',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
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
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: isSmall ? 16 : 24,
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
          ...R.prop('xAxisLabels', formatters),
          style: {
            fontSize: isSmall ? '13px' : '16px',
            color: '#586179',
            fontWeight: 'normal',
          },
        },
        showInLegend: !hideLegend,
      },
    },

    series,
  };
};
