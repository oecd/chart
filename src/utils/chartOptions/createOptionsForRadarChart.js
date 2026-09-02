// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
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
}) => {
  const { baselineCodes, highlightSeriesCodes, highlightCodes } =
    getBaselineAndHighlightCodes({
      data,
      baseline,
      highlight,
    });

  const anySeriesHighlighted = highlightSeriesCodes.length > 0;

  const allSeries = mapWithIndex((series, seriesIndex) => {
    const seriesCode = series.code;

    const seriesBaselineIndex = baselineCodes.indexOf(seriesCode);
    const isSeriesBaseline = seriesBaselineIndex !== -1;

    const seriesHighlightIndex = highlightCodes.indexOf(seriesCode);
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
        seriesCode,
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

    return {
      name: data.areSeriesDates
        ? seriesFrequency.tryParse(series.label).getTime()
        : series.label,
      data: mapWithIndex((pointData) => {
        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        // Ignore when category is baseline/highlighted,
        // only support series as baseline/highlight

        const markerLineColor = isSeriesHighlighted
          ? getListItemAtTurningIndex(
              seriesHighlightIndex,
              matchingHighlightOutlineColors,
            )
          : null;

        return {
          ...dataPoint,
          marker: {
            lineColor: markerLineColor,
            lineWidth: isSeriesHighlighted ? 1.5 : null,
            fillColor: seriesColor,
          },
        };
      }, series.data),
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
