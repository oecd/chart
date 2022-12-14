import React, { useMemo, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
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
  makeColorReadableOnBackgroundColor,
} from '../../utils/chartUtil';
import { fakeMemberLatest } from '../../constants/chart';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  BrokenAxisModule(Highcharts);
  HighchartsMore(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const Radar = forwardRef(
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
      height,
      formatters,
      optionsOverride,
    },
    ref,
  ) => {
    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

    const series = useMemo(
      () =>
        R.map((s) => {
          const highlightOrBaselineColor = getBaselineOrHighlightColor(
            s,
            parsedHighlight,
            baseline,
            highlightColors,
          );
          const color = highlightOrBaselineColor || R.head(colorPalette);

          const dataLabelColor = makeColorReadableOnBackgroundColor(
            color,
            'white',
          );

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
            showInLegend: s.code !== fakeMemberLatest.code,
            dataLabels: {
              color: dataLabelColor,
              textShadow:
                '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
              textOutline: 'none',
            },
            ...(highlightOrBaselineColor ? { zIndex: 1 } : {}),
          };
        }, data.series),
      [data, colorPalette, highlightColors, parsedHighlight, baseline],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          polar: true,
          style: {
            fontFamily: 'Segoe UI',
          },
          height,
          animation: false,
          spacingBottom: 5,
        },

        colors: colorPalette,

        title: {
          text: '',
        },

        credits: {
          enabled: false,
        },

        pane: {
          startAngle: 0,
          endAngle: 360,
          size: '90%',
        },

        xAxis: {
          categories: R.map(R.prop('label'), data.categories),
          labels: {
            style: {
              color: '#0c0c0c',
              fontSize: '12px',
            },
            enabled: !hideXAxisLabels,
          },
          gridLineColor: '#cbcbcb',
          lineColor: '#cbcbcb',
        },

        yAxis: {
          title: {
            enabled: false,
          },
          labels: {
            enabled: !hideYAxisLabels,
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
          symbolWidth: 18,
        },

        plotOptions: {
          series: {
            animation: false,
            pointPadding: 0,
            groupPadding: 0,
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
      [
        data,
        series,
        colorPalette,
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

Radar.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
  }).isRequired,
  highlight: PropTypes.string,
  baseline: PropTypes.string,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  hideYAxisLabels: PropTypes.bool,
  colorPalette: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  height: PropTypes.number.isRequired,
  formatters: PropTypes.object,
  optionsOverride: PropTypes.object,
};

Radar.defaultProps = {
  highlight: '',
  baseline: null,
  hideLegend: false,
  hideXAxisLabels: false,
  hideYAxisLabels: false,
  formatters: {},
  optionsOverride: {},
};

export default memo(Radar);
