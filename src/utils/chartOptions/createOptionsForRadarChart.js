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
import { makeColorReadableOnBackgroundColor } from '../colorUtil';
import { mapWithIndex } from '../ramdaUtil';
import { getMatchingHighlightColors } from './getMatchingHighlightColors';

export const createOptionsForRadarChart = ({
  data,
  formatters = {},
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
  disableLegendInteraction = false,
}) => {
  const matchingHighlightColors = getMatchingHighlightColors({
    highlight,
    highlightColors,
    smallerHighlightColors,
  });

  const allSeries = mapWithIndex((series, seriesIndex) => {
    const highlightOrBaselineColor = getBaselineOrHighlightColor(
      series,
      highlight,
      baseline,
      matchingHighlightColors,
    );
    const color =
      highlightOrBaselineColor ||
      getSeriesColor({
        colorPalette,
        seriesIndex,
        seriesCode: series.code,
        fixedColorIndexBySeries,
      });
    const dataLabelColor = makeColorReadableOnBackgroundColor(color, 'white');

    return {
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(series.label).getTime()
        : series.label,
      data: R.map(
        (pointData) =>
          createDatapoint(pointData, categoriesAreDatesOrNumberForDataParsing),
        series.data,
      ),
      type: 'line',
      lineWidth: 2.5,
      marker: {
        symbol: 'circle',
        radius: 3,
        lineWidth: 2,
      },
      states: {
        hover: {
          lineWidth: 2.5,
        },
      },
      color,
      showInLegend: true,
      dataLabels: {
        color: dataLabelColor,
        textShadow:
          '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
        textOutline: 'none',
      },
      ...(highlightOrBaselineColor ? { zIndex: 1 } : {}),
    };
  }, data.series);

  const calcPaneSize = () => {
    if (hideXAxisLabels) {
      return '100%';
    }

    return isSmall ? '70%' : '85%';
  };

  return {
    chart: {
      polar: true,
      type: 'line',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
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
        ...R.prop('xAxisLabels', formatters),
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
