import React, { useMemo, forwardRef, memo } from 'react';
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
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
  makeColorReadableOnBackgroundColor,
} from '../../utils/chartUtil';
import { fakeMemberLatest } from '../../constants/chart';
import { isNilOrEmpty, mapWithIndex } from '../../utils/ramdaUtil';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  BrokenAxisModule(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  OfflineExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const Line = forwardRef(
  (
    {
      data,
      title = '',
      subtitle = '',
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
      optionsOverride = {},
    },
    ref,
  ) => {
    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

    const series = useMemo(
      () =>
        mapWithIndex((s, xIdx) => {
          const highlightOrBaselineColor = getBaselineOrHighlightColor(
            s,
            parsedHighlight,
            baseline,
            highlightColors,
          );
          const color =
            highlightOrBaselineColor ||
            getListItemAtTurningIndex(xIdx, colorPalette);

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
            dataLabels: {
              style: {
                color: dataLabelColor,
                textShadow:
                  '0px -1px 3px white, 1px 0px 3px white, 0px 1px 3px white, -1px 0px 3px white, -1px -1px 3px white, 1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white',
                textOutline: 'none',
              },
            },
            ...(highlightOrBaselineColor ? { zIndex: 1 } : {}),
            showInLegend: s.code !== fakeMemberLatest.code,
          };
        }, data.series),
      [data, colorPalette, highlightColors, parsedHighlight, baseline],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
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
          },
        },

        colors: [R.head(colorPalette)],

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
            step: 1,
            rotation: -45,
            style: { color: '#0c0c0c', fontSize: '12px' },
            ...(hideXAxisLabels ? { enabled: false } : {}),
          },
          gridLineColor: '#cbcbcb',
          lineColor: 'transparent',
          left: '5%',
          width: '90%',
        },

        yAxis: {
          title: {
            enabled: false,
          },
          startOnTick: false,
          gridLineColor: '#cbcbcb',
          lineColor: '#cbcbcb',
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
          sourceWidth: 600,
          sourceHeight: 400,
          filename: `export-${new Date(Date.now()).toISOString()}`,
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
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

Line.propTypes = {
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
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  optionsOverride: PropTypes.object,
};

export default memo(Line);
