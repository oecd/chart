import React, { useMemo, useRef, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import BrokenAxisModule from 'highcharts/modules/broken-axis';
import AnnotationsModule from 'highcharts/modules/annotations';
import ExportingModule from 'highcharts/modules/exporting';
import ExportDataModule from 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import {
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
} from '../../utils/chartUtil';
import { fakeMemberLatest } from '../../utils/sdmxJsonUtil';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  BrokenAxisModule(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const Line = forwardRef(
  (
    {
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
      formatters,
      optionsOverride,
    },
    ref,
  ) => {
    const series = useMemo(
      () =>
        R.map((s) => {
          const highlightOrBaselineColor = getBaselineOrHighlightColor(
            s,
            highlight,
            baseline,
            highlightColors,
          );
          const color = highlightOrBaselineColor || R.head(colorPalette);

          return {
            name: s.label,
            data: s.data,
            type: 'line',
            marker: {
              symbol: 'circle',
              radius: 3,
              lineWidth: 2,
            },
            states: {
              hover: {
                lineWidth: 2,
              },
            },
            color,
            dataLabels: { color },
            ...(highlightOrBaselineColor ? { zIndex: 1 } : {}),
            showInLegend: s.code !== fakeMemberLatest.code,
          };
        }, data.series),
      [data, colorPalette, highlightColors, highlight, baseline],
    );

    const updateNeededAfterChartHasBeenRenderedOnceDone = useRef(false);

    useEffect(() => {
      updateNeededAfterChartHasBeenRenderedOnceDone.current = false;
    }, [width]);

    const defaultOptions = useMemo(
      () => ({
        chart: {
          style: {
            fontFamily: 'Segoe UI',
          },
          marginTop: 22,
          height,
          animation: false,
          spacingBottom: 5,
          events: data.areCategoriesNumbersOrDates
            ? {}
            : {
                render: ({ target: chart }) => {
                  if (
                    !hideXAxisLabels &&
                    !updateNeededAfterChartHasBeenRenderedOnceDone.current
                  ) {
                    // TODO:
                    // show/hide depending on height as well (chart is more important than legend)
                    updateNeededAfterChartHasBeenRenderedOnceDone.current = true;
                    // WARNING: calling update in render can easily cause an infinite loop
                    // without a stopping condition
                    chart.xAxis[0].update(
                      {
                        labels: { enabled: chart.xAxis[0]?.tickInterval === 1 },
                      },
                      true,
                      false,
                      false,
                    );
                  }
                },
              },
        },

        colors: [R.head(colorPalette)],

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
            ...(hideXAxisLabels ? { enabled: false } : {}),
          },
          gridLineColor: '#cbcbcb',
          lineColor: '#cbcbcb',
        },

        yAxis: {
          title: {
            enabled: false,
          },
          startOnTick: false,
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
          symbolWidth: 18,
          x: -7,
        },

        plotOptions: {
          series: {
            animation: false,
            events: {
              mouseOver: (e) => {
                e.target.data.forEach((p) => {
                  p.update(
                    {
                      dataLabels: {
                        enabled: true,
                        ...R.propOr({}, 'dataLabels', formatters),
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
        data,
        series,
        colorPalette,
        width,
        height,
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
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

Line.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
    areCategoriesNumbersOrDates: PropTypes.bool.isRequired,
  }).isRequired,
  highlight: PropTypes.array,
  baseline: PropTypes.string,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  hideYAxisLabels: PropTypes.bool,
  colorPalette: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  formatters: PropTypes.object,
  optionsOverride: PropTypes.object,
};

Line.defaultProps = {
  highlight: [],
  baseline: null,
  hideLegend: false,
  hideXAxisLabels: false,
  hideYAxisLabels: false,
  formatters: {},
  optionsOverride: {},
};

export default Line;
