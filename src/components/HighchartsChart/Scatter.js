import React, { useMemo, useRef, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/broken-axis';
import 'highcharts/modules/annotations';
import 'highcharts/modules/exporting';
import 'highcharts/modules/offline-exporting';
import 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import {
  forEachWithIndex,
  isNilOrEmpty,
  mapWithIndex,
} from '../../utils/ramdaUtil';
import {
  addColorAlpha,
  calcChartSpacing,
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
} from '../../utils/chartUtil';

if (typeof Highcharts === 'object') {
  Highcharts.SVGRenderer.prototype.symbols.cross = (x, y, w, h) => [
    'M',
    x,
    y,
    'L',
    x + w,
    y + h,
    'M',
    x + w,
    y,
    'L',
    x,
    y + h,
    'z',
  ];
  if (Highcharts.VMLRenderer) {
    Highcharts.VMLRenderer.prototype.symbols.cross =
      Highcharts.SVGRenderer.prototype.symbols.cross;
  }
}

const symbols = [
  'circle',
  'diamond',
  'cross',
  'square',
  'triangle',
  'triangle-down',
];

const createDatapoint = (d, areCategoriesDatesOrNumber) =>
  areCategoriesDatesOrNumber
    ? { x: d.metadata.parsedX, y: d.value, __metadata: d.metadata }
    : { y: d.value, __metadata: d.metadata };

const calcMarginTop = (title, subtitle, isSmall) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    return isSmall ? 20 : 32;
  }

  return undefined;
};

const Scatter = forwardRef(
  (
    {
      symbolLayout = false,
      title = '',
      subtitle = '',
      data,
      highlight = null,
      baseline = null,
      hideLegend = false,
      hideXAxisLabels = false,
      hideYAxisLabels = false,
      colorPalette,
      highlightColors,
      width,
      height,
      isSmall,
      formatters = {},
      fullscreenClose = null,
      isFullScreen = false,
      tooltipOutside,
      csvExportcolumnHeaderFormatter,
      optionsOverride = {},
    },
    ref,
  ) => {
    const minMaxLines = useRef([]);

    const areCategoriesDatesOrNumber =
      data.areCategoriesDates || data.areCategoriesNumbers;

    const firstPaletteColor = R.head(colorPalette);

    const series = useMemo(
      () =>
        mapWithIndex((s, yIdx) => {
          const symbol = getListItemAtTurningIndex(yIdx, symbols);

          const seriesBaselineOrHighlightColor = getBaselineOrHighlightColor(
            s,
            highlight,
            baseline,
            highlightColors,
          );

          const seriesColor =
            seriesBaselineOrHighlightColor ||
            getListItemAtTurningIndex(yIdx, colorPalette);

          return {
            name: s.label,
            data: mapWithIndex((d, xIdx) => {
              const category = R.nth(xIdx, data.categories);

              const baselineOrHighlightColor = getBaselineOrHighlightColor(
                category,
                highlight,
                baseline,
                highlightColors,
              );

              const dataPoint = createDatapoint(d, areCategoriesDatesOrNumber);

              return baselineOrHighlightColor
                ? {
                    name: category.label,
                    ...dataPoint,
                    color: baselineOrHighlightColor,
                    marker: {
                      fillColor: !symbolLayout
                        ? addColorAlpha(baselineOrHighlightColor, -0.4)
                        : baselineOrHighlightColor,
                    },
                  }
                : {
                    name: category.label,
                    ...dataPoint,
                  };
            }, s.data),
            color: seriesColor,
            showInLegend: true,
            marker: {
              symbol,
              lineColor: symbol === 'cross' ? null : '#deeaf1',
              lineWidth: symbol === 'cross' ? 2 : 1,
              radius: symbol === 'cross' ? 5 : 6,
              fillColor: !symbolLayout
                ? addColorAlpha(seriesColor, -0.4)
                : seriesColor,
              states: {
                hover: {
                  lineWidth: symbol === 'cross' ? 2 : 1,
                  radius: symbol === 'cross' ? 5 : 6,
                },
              },
            },
          };
        }, data.series),
      [
        symbolLayout,
        data,
        areCategoriesDatesOrNumber,
        colorPalette,
        highlightColors,
        highlight,
        baseline,
      ],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          type: 'scatter',
          style: {
            fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
          },
          marginTop: hideLegend
            ? calcMarginTop(title, subtitle, isSmall)
            : undefined,
          height,
          animation: false,
          spacing: calcChartSpacing(isFullScreen),
          events: {
            fullscreenClose,
            render: ({ target: chart }) => {
              if (symbolLayout) {
                // remove previous lines (user can make series visible or not which requires to
                // redraw the lines)
                forEachWithIndex((l) => l?.destroy(), minMaxLines.current);

                const categoriesMinMax = R.compose(
                  (seriesData) =>
                    R.compose(
                      R.map((categoryData) => {
                        const validData = R.reject(R.isNil, categoryData);
                        return R.isEmpty(validData)
                          ? []
                          : [Math.min(...validData), Math.max(...validData)];
                      }),
                      R.map((idx) => R.map(R.nth(idx), seriesData)),
                    )(R.times(R.identity, R.length(data.categories))),

                  R.map(R.compose(R.map(R.prop('y')), R.prop('data'))),
                )(R.filter(R.propEq(true, 'visible'), chart.series));

                minMaxLines.current = mapWithIndex((category, idx) => {
                  if (R.isEmpty(categoriesMinMax[idx])) {
                    return null;
                  }

                  const x = R.path([0, 'data', idx, 'x'], chart.series);
                  const ax = chart.xAxis[0]?.toPixels(x);
                  const ay = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][0]);
                  const bx = ax;
                  const by = chart.yAxis[0]?.toPixels(categoriesMinMax[idx][1]);

                  const lineColor =
                    getBaselineOrHighlightColor(
                      category,
                      highlight,
                      baseline,
                      highlightColors,
                    ) || firstPaletteColor;

                  return chart.renderer
                    .path(['M', ax, ay, 'L', bx, by])
                    .attr({
                      stroke: addColorAlpha(lineColor, -0.6),
                      'stroke-width': 1,
                      zIndex: 1,
                    })
                    .add();
                }, data.categories);
              }
            },
          },
        },

        colors: colorPalette,

        title: {
          text: title,
          align: 'left',
          margin: 20,
          style: {
            color: '#101d40',
            fontWeight: 'bold',
            fontSize: '18px',
          },
        },
        subtitle: {
          text: subtitle,
          align: 'left',
          style: {
            color: '#586179',
            fontSize: '17px',
          },
        },

        credits: {
          enabled: false,
        },

        xAxis: {
          categories:
            data.areCategoriesDates || data.areCategoriesNumbers
              ? null
              : R.map(R.prop('label'), data.categories),
          ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
          labels: {
            style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
            ...R.prop('xAxisLabels', formatters),
            ...(hideXAxisLabels ? { enabled: false } : {}),
          },
          gridLineColor: '#c2cbd6',
          lineColor: 'transparent',
          left:
            data.areCategoriesDates || data.areCategoriesNumbers ? '10%' : '5%',
          width:
            data.areCategoriesDates || data.areCategoriesNumbers
              ? '85%'
              : '95%',
          tickWidth: 0,
        },

        yAxis: {
          title: {
            enabled: false,
          },
          gridLineColor: '#c2cbd6',
          lineColor: '#c2cbd6',
          labels: {
            style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
            enabled: !hideYAxisLabels,
            align: 'left',
            x: 0,
            y: -4,
          },
        },

        legend: {
          enabled: !hideLegend,
          itemDistance: 10,
          itemStyle: {
            fontWeight: 'normal',
            color: '#586179',
            fontSize: isSmall ? '13px' : '16px',
          },
          align: 'left',
          squareSymbol: false,
          symbolRadius: 0,
          symbolWidth: 18,
          x: -7,
          verticalAlign: 'top',
          margin: isSmall ? 26 : 34,
        },

        plotOptions: {
          series: {
            animation: false,
            dataLabels: {
              ...R.prop('dataLabels', formatters),
            },
          },
          scatter: {
            tooltip: { pointFormat: '{point.name}: {point.y}' },
          },
        },

        tooltip: {
          ...R.prop('tooltip', formatters),
          outside: tooltipOutside,
        },

        series,

        exporting: {
          enabled: false,
          sourceWidth: 600,
          sourceHeight: 400,
          filename: `export-${new Date(Date.now()).toISOString()}`,
          csv: {
            columnHeaderFormatter: csvExportcolumnHeaderFormatter,
          },
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        data,
        title,
        subtitle,
        series,
        colorPalette,
        width,
        height,
        isSmall,
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
        formatters,
        fullscreenClose,
        tooltipOutside,
        csvExportcolumnHeaderFormatter,
        baseline,
        firstPaletteColor,
        highlightColors,
        isSmall,
        highlight,
        symbolLayout,
      ],
    );

    const mergedOptions = useMemo(
      () =>
        deepMergeUserOptionsWithDefaultOptions(defaultOptions, optionsOverride),
      [defaultOptions, optionsOverride],
    );

    return (
      <HighchartsReact
        ref={ref}
        highcharts={Highcharts}
        options={mergedOptions}
        immutable={!isFullScreen}
      />
    );
  },
);

Scatter.propTypes = {
  symbolLayout: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
    areCategoriesDates: PropTypes.bool.isRequired,
    areCategoriesNumbers: PropTypes.bool.isRequired,
  }).isRequired,
  highlight: PropTypes.array,
  baseline: PropTypes.array,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  hideYAxisLabels: PropTypes.bool,
  colorPalette: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  isSmall: PropTypes.bool.isRequired,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  tooltipOutside: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Scatter);
