import React, { useMemo, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
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
import { mapWithIndex } from '../../utils/ramdaUtil';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  BrokenAxisModule(Highcharts);
  HighchartsMore(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  OfflineExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const createDatapoint = (d, areCategoriesDatesOrNumber, version) => {
  if (version !== '2') {
    return areCategoriesDatesOrNumber ? R.nth(1, d) : d;
  }

  return { y: d.value, __metadata: d.metadata };
};

const Radar = forwardRef(
  (
    {
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
      height,
      formatters = {},
      fullscreenClose = null,
      isFullScreen = false,
      tooltipOutside,
      csvExportcolumnHeaderFormatter,
      optionsOverride = {},
    },
    ref,
  ) => {
    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

    const areCategoriesDatesOrNumber =
      data.areCategoriesDates || data.areCategoriesNumbers;

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
            data: R.map(
              (d) =>
                createDatapoint(d, areCategoriesDatesOrNumber, data.version),
              s.data,
            ),
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
      [
        data,
        areCategoriesDatesOrNumber,
        colorPalette,
        highlightColors,
        parsedHighlight,
        baseline,
      ],
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
          events: { fullscreenClose },
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
          gridLineColor: '#e6e6e6',
          lineColor: 'transparent',
        },

        yAxis: {
          title: {
            enabled: false,
          },
          gridLineColor: '#e6e6e6',
          lineColor: '#e6e6e6',
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
                        ...R.prop('dataLabels', formatters),
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
      [
        title,
        subtitle,
        data,
        series,
        colorPalette,
        height,
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
        formatters,
        fullscreenClose,
        tooltipOutside,
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

Radar.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
    areCategoriesDates: PropTypes.bool.isRequired,
    areCategoriesNumbers: PropTypes.bool.isRequired,
    version: PropTypes.string,
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
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  tooltipOutside: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Radar);
