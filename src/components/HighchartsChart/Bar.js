import React, { useMemo, useRef, useEffect, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import BrokenAxisModule from 'highcharts/modules/broken-axis';
import AnnotationsModule from 'highcharts/modules/annotations';
import ExportingModule from 'highcharts/modules/exporting';
import ExportDataModule from 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import { mapWithIndex } from '../../utils/ramdaUtil';
import {
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
} from '../../utils/chartUtil';
import { fakeMemberLatest } from '../../constants/chart';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  BrokenAxisModule(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const Bar = forwardRef(
  (
    {
      horizontal,
      data,
      highlight,
      baseline,
      hideLegend,
      hideXAxisLabels,
      hideYAxisLabels,
      colorPalette,
      highlightColors,
      width,
      height,
      pivotValue,
      formatters,
      optionsOverride,
    },
    ref,
  ) => {
    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

    const series = useMemo(
      () =>
        R.map((s) => {
          const seriesColor =
            getBaselineOrHighlightColor(
              s,
              parsedHighlight,
              baseline,
              highlightColors,
            ) || R.head(colorPalette);

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
          marginTop: horizontal ? 32 : 22,
          height,
          animation: false,
          spacingBottom: 5,
          events: data.areCategoriesNumbersOrDates
            ? {}
            : {
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
          text: '',
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
            groupPadding: 0,
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
          filename: `export-${new Date(Date.now()).toISOString()}`,
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        horizontal,
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
        immutable
      />
    );
  },
);

Bar.propTypes = {
  horizontal: PropTypes.bool,
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
  optionsOverride: PropTypes.object,
};

Bar.defaultProps = {
  horizontal: false,
  highlight: '',
  baseline: null,
  hideLegend: false,
  hideXAxisLabels: false,
  hideYAxisLabels: false,
  pivotValue: 0,
  formatters: {},
  optionsOverride: {},
};

export default memo(Bar);
