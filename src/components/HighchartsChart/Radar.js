import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import AccessibilityModule from 'highcharts/modules/accessibility';
import BrokenAxisModule from 'highcharts/modules/broken-axis';
import AnnotationsModule from 'highcharts/modules/annotations';
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
  HighchartsMore(Highcharts);
  AccessibilityModule(Highcharts);
}

const Radar = ({
  data,
  title,
  subtitle,
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
}) => {
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
          showInLegend: s.code !== fakeMemberLatest.code,
          dataLabels: { color },
          ...(highlightOrBaselineColor ? { zIndex: 1 } : {}),
        };
      }, data.series),
    [data, colorPalette, highlightColors, highlight, baseline],
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
        text: title,
        useHTML: true,
        align: 'left',
        style: {
          color: '#333333',
          fontSize: '14px',
          fontWeight: 'bold',
        },
      },

      subtitle: {
        text: subtitle,
        useHTML: true,
        align: 'left',
        style: {
          color: '#737373',
          fontSize: '12px',
          fontWeight: 'bold',
        },
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
    }),
    [
      data,
      series,
      title,
      subtitle,
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
      highcharts={Highcharts}
      options={mergedOptions}
      immutable
    />
  );
};

Radar.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
  }).isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  highlight: PropTypes.array,
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
  title: null,
  subtitle: null,
  highlight: [],
  baseline: null,
  hideLegend: false,
  hideXAxisLabels: false,
  hideYAxisLabels: false,
  formatters: {},
  optionsOverride: {},
};

export default Radar;
