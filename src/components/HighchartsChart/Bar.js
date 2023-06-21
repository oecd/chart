import React, { useMemo, useRef, useEffect, forwardRef, memo } from 'react';
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

import { isNilOrEmpty, mapWithIndex } from '../../utils/ramdaUtil';
import {
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
}

const calcMarginTop = (title, subtitle, horizontal) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    return horizontal ? 32 : 22;
  }
  return undefined;
};

const Bar = forwardRef(
  (
    {
      horizontal = false,
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
      pivotValue = 0,
      formatters = {},
      fullscreenClose = null,
      isFullScreen = false,
      optionsOverride = {},
    },
    ref,
  ) => {
    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

    const series = useMemo(
      () =>
        mapWithIndex((s, xIdx) => {
          const seriesColor =
            getBaselineOrHighlightColor(
              s,
              parsedHighlight,
              baseline,
              highlightColors,
            ) || getListItemAtTurningIndex(xIdx, colorPalette);

          return {
            name: s.label,
            data: mapWithIndex((d, dIdx) => {
              const category = R.nth(dIdx, data.categories);

              const baselineOrHighlightColor = getBaselineOrHighlightColor(
                category,
                parsedHighlight,
                baseline,
                highlightColors,
              );

              return baselineOrHighlightColor
                ? {
                    name: category.label,
                    y: d,
                    color: baselineOrHighlightColor,
                  }
                : { name: category.label, y: d };
            }, s.data),
            color: seriesColor,
            showInLegend: s.code !== fakeMemberLatest.code,
          };
        }, data.series),
      [data, colorPalette, highlightColors, parsedHighlight, baseline],
    );

    const updateNeededAfterChartHasBeenRenderedOnceDone = useRef(false);

    useEffect(() => {
      updateNeededAfterChartHasBeenRenderedOnceDone.current = false;
    }, [width, height]);

    const defaultOptions = useMemo(
      () => ({
        chart: {
          type: horizontal ? 'bar' : 'column',
          style: {
            fontFamily: 'Segoe UI',
          },
          marginTop: calcMarginTop(title, subtitle, horizontal),
          height,
          animation: false,
          spacingBottom: 5,
          events: data.areCategoriesNumbersOrDates
            ? {
                fullscreenClose,
              }
            : {
                fullscreenClose,
                render: ({ target: chart }) => {
                  if (!updateNeededAfterChartHasBeenRenderedOnceDone.current) {
                    // TODO:
                    // show/hide depending on height as well (chart is more important than legend)
                    updateNeededAfterChartHasBeenRenderedOnceDone.current = true;
                    if (
                      (!horizontal && !hideXAxisLabels) ||
                      (horizontal && !hideYAxisLabels)
                    ) {
                      // WARNING: calling update in render can easily cause an infinite loop
                      // without a stopping condition
                      chart.xAxis[0].update(
                        {
                          labels: {
                            enabled: chart.xAxis[0]?.tickInterval === 1,
                          },
                        },
                        true,
                        false,
                        false,
                      );
                    }
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
          categories: R.map(R.prop('label'), data.categories),
          labels: {
            style: { color: '#0c0c0c', fontSize: '12px' },
            ...((hideXAxisLabels && !horizontal) ||
            (hideYAxisLabels && horizontal)
              ? { enabled: false }
              : {}),
          },
          gridLineColor: '#cbcbcb',
          lineColor: '#cbcbcb',
          ...(horizontal
            ? { height: '90%', top: '5%' }
            : { width: '90%', left: '7%' }),
        },

        yAxis: {
          title: {
            enabled: false,
          },
          labels: {
            style: { fontSize: '12px', color: '#0c0c0c' },
            enabled:
              (!horizontal && !hideYAxisLabels) ||
              (horizontal && !hideXAxisLabels),
            ...(horizontal ? {} : { align: 'left', x: 0, y: -4 }),
          },
          opposite: horizontal,
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
            pointPadding: 0.2,
            groupPadding: 0.1,
            borderWidth: 0,
            threshold: parseFloat(pivotValue) || 0,
            dataLabels: {
              ...R.propOr({}, 'dataLabels', formatters),
            },
          },
        },

        tooltip: {
          ...R.propOr({}, 'tooltip', formatters),
          outside: true,
        },

        series,

        exporting: {
          enabled: false,
          sourceWidth: 600,
          sourceHeight: 400,
          filename: `export-${new Date(Date.now()).toISOString()}`,
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        horizontal,
        title,
        subtitle,
        data,
        series,
        colorPalette,
        width,
        height,
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
        pivotValue,
        formatters,
        fullscreenClose,
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

Bar.propTypes = {
  horizontal: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
    areCategoriesNumbersOrDates: PropTypes.bool.isRequired,
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
  pivotValue: PropTypes.number,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  optionsOverride: PropTypes.object,
};

export default memo(Bar);
