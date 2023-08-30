import React, { useMemo, useRef, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import BrokenAxisModule from 'highcharts/modules/broken-axis';
import AnnotationsModule from 'highcharts/modules/annotations';
import ExportingModule from 'highcharts/modules/exporting';
import OfflineExportingModule from 'highcharts/modules/offline-exporting';
import ExportDataModule from 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import {
  forEachWithIndex,
  isNilOrEmpty,
  mapWithIndex,
} from '../../utils/ramdaUtil';
import {
  addColorAlpha,
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
} from '../../utils/chartUtil';
import { fakeMemberLatest } from '../../constants/chart';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  BrokenAxisModule(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  OfflineExportingModule(Highcharts);
  ExportDataModule(Highcharts);
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

const Scatter = forwardRef(
  (
    {
      symbolLayout = false,
      title = '',
      subtitle = '',
      data,
      highlight = '',
      baseline = null,
      hideLegend = false,
      hideXAxisLabels = false,
      hideYAxisLabels = false,
      colorPalette,
      highlightColors,
      width,
      height,
      formatters = {},
      fullscreenClose = null,
      isFullScreen = false,
      csvExportcolumnHeaderFormatter,
      optionsOverride = {},
    },
    ref,
  ) => {
    const minMaxLines = useRef([]);

    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

    const firstPaletteColor = R.head(colorPalette);

    const series = useMemo(
      () =>
        mapWithIndex((s, yIdx) => {
          const symbol = getListItemAtTurningIndex(yIdx, symbols);

          const seriesBaselineOrHighlightColor = getBaselineOrHighlightColor(
            s,
            parsedHighlight,
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
                parsedHighlight,
                baseline,
                highlightColors,
              );

              const dataPoint =
                data.areCategoriesDates || data.areCategoriesNumbers
                  ? { x: R.head(d), y: R.nth(1, d) }
                  : { y: d };

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
            showInLegend: s.code !== fakeMemberLatest.code,
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
        colorPalette,
        highlightColors,
        parsedHighlight,
        baseline,
      ],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          type: 'scatter',
          style: {
            fontFamily: 'Segoe UI',
          },
          marginTop:
            isNilOrEmpty(title) && isNilOrEmpty(subtitle) ? 22 : undefined,
          height,
          animation: false,
          spacingBottom: 5,
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
                      parsedHighlight,
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
            color: '#333333',
            fontWeight: 'bold',
          },
        },
        subtitle: {
          text: subtitle,
          align: 'left',
          style: {
            color: '#737373',
            fontWeight: 'bold',
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
            style: { color: '#0c0c0c', fontSize: '12px' },
            ...R.prop('xAxisLabels', formatters),
            ...(hideXAxisLabels ? { enabled: false } : {}),
          },
          gridLineColor: '#e6e6e6',
          lineColor: 'transparent',
          width: '90%',
          left: '7%',
          tickWidth: 0,
        },

        yAxis: {
          title: {
            enabled: false,
          },
          gridLineColor: '#e6e6e6',
          lineColor: '#e6e6e6',
          labels: {
            style: { fontSize: '12px', color: '#0c0c0c' },
            enabled: !hideYAxisLabels,
            align: 'left',
            x: 0,
            y: -4,
          },
        },

        legend: {
          enabled: !hideLegend,
          itemDistance: 10,
          margin: 10,
          itemStyle: {
            fontWeight: 'normal',
            color: '#0c0c0c',
          },
          align: 'left',
          squareSymbol: false,
          symbolRadius: 0,
          symbolWidth: 18,
          x: -7,
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
          outside: !isFullScreen,
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
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
        formatters,
        fullscreenClose,
        isFullScreen,
        csvExportcolumnHeaderFormatter,
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
  highlight: PropTypes.string,
  baseline: PropTypes.string,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  hideYAxisLabels: PropTypes.bool,
  colorPalette: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Scatter);
