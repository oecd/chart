// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  baselineColor,
  chartSpacing,
  chartSpacingFullScreenAndExport,
  nonHighlightedOpacity,
} from '../../constants/chart';
import { calcMarginTop } from '../chartUtil';
import {
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
  getSeriesColor,
} from '../chartUtilCommon';
import { makeColorReadableOnBackgroundColor } from '../colorUtil';
import { isNilOrEmpty, mapWithIndex } from '../ramdaUtil';
import { createDatapoint } from './createDataPoint';
import { getBaselineAndHighlightCodes } from './getBaselineAndHighlightCodes';

export const createOptionsForLineChart = ({
  data,
  formatters = {},
  title = '',
  subtitle = '',
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
  inlineLabels = false,
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

    const seriesName = data.areSeriesDates
      ? seriesFrequency.tryParse(series.label).getTime()
      : series.label;

    const lastDataPointWithDataIndex = R.findLastIndex(
      (d) => !isNilOrEmpty(d.value),
      series.data,
    );

    return {
      name: seriesName,
      data: mapWithIndex((pointData, pointIndex) => {
        const dataPoint = createDatapoint(
          pointData,
          categoriesAreDatesOrNumberForDataParsing,
        );

        const dataPointWithLabel =
          inlineLabels &&
          pointIndex === lastDataPointWithDataIndex &&
          lastDataPointWithDataIndex !== -1
            ? R.assoc(
                'dataLabels',
                {
                  enabled: true,
                  format: seriesName,
                  style: !R.isNil(isSeriesHighlighted)
                    ? { fontWeight: 800 }
                    : {},
                },
                dataPoint,
              )
            : dataPoint;

        // Ignore when category is baseline,
        // only support series as baseline
        const finalIsBaseline = isSeriesBaseline;

        const finalHighlightIndex = isSeriesHighlighted
          ? seriesHighlightIndex
          : -1;

        // Ignore when category is highlighted,
        // only support series as highlight
        const finalIsHighlighted = isSeriesHighlighted;

        const pointColor = finalIsBaseline
          ? baselineColor
          : finalIsHighlighted
            ? getListItemAtTurningIndex(
                finalHighlightIndex,
                matchingHighlightColors,
              )
            : null;

        const lineColor = finalIsHighlighted
          ? getListItemAtTurningIndex(
              finalHighlightIndex,
              matchingHighlightOutlineColors,
            )
          : null;

        return {
          ...dataPointWithLabel,
          color: pointColor,
          marker: {
            lineColor,
            lineWidth: finalIsHighlighted ? 1.5 : null,
            fillColor: pointColor,
          },
        };
      }, series.data),
      type: 'spline',
      lineWidth: 2.5,
      marker: {
        symbol: 'circle',
        radius: 3.5,
        lineWidth: 2,
      },
      states: {
        hover: {
          lineWidth: 2.5,
        },
      },
      color: seriesColor,
      dataLabels: {
        style: inlineLabels
          ? {}
          : {
              color: dataLabelColor,
              textShadow:
                '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
              textOutline: 'none',
            },
      },
      ...(isSeriesHighlighted ? { zIndex: 1 } : {}),
    };
  }, data.series);

  const legend = R.ifElse(
    () => inlineLabels,
    // legend is enabled but hidden so that Highcharts reserves the space needed for last data points data label (hack)
    () => ({
      enabled: true,
      margin: isSmall ? -5 : -25,
      symbolWidth: 10,
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      itemStyle: {
        visibility: 'hidden',
        fontSize: isSmall ? '13px' : '16px',
        fontWeight: 400,
      },
    }),
    () => ({
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
      margin: isSmall ? 26 : 34,
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

  return {
    chart: {
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop:
        hideLegend || inlineLabels
          ? calcMarginTop(title, subtitle, isSmall)
          : undefined,
      height,
      animation: false,
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
      ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        autoRotation: [-90, -45, 0],
        ...R.prop('xAxisLabels', formatters),
        ...(hideXAxisLabels ? { enabled: false } : {}),
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
        enabled: !hideYAxisLabels,
        align: 'left',
        x: 0,
        y: -4,
      },
    },

    legend,

    plotOptions: {
      series: {
        animation: false,
        dataLabels: inlineLabels
          ? {
              enabled: false,
              align: 'left',
              verticalAlign: 'middle',
              x: 10,
              y: 1,
              crop: false,
              overflow: 'allow',
              allowOverlap: true,
              style: {
                fontSize: isSmall ? '13px' : '16px',
                fontWeight: 400,
                color: '#101d40',
              },
            }
          : {
              ...R.prop('dataLabels', formatters),
            },
        events: {
          mouseOver: inlineLabels
            ? null
            : (e) => {
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
          mouseOut: inlineLabels
            ? null
            : (e) => {
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
