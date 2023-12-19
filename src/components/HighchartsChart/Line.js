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

const createDatapoint = (d, areCategoriesDatesOrNumber, version) => {
  if (version !== '2') {
    return areCategoriesDatesOrNumber ? d : { y: d };
  }

  return areCategoriesDatesOrNumber
    ? { x: d.metadata.parsedX, y: d.value, __metadata: d.metadata }
    : { y: d.value, __metadata: d.metadata };
};

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
        mapWithIndex((s, yIdx) => {
          const highlightOrBaselineColor = getBaselineOrHighlightColor(
            s,
            parsedHighlight,
            baseline,
            highlightColors,
          );
          const color =
            highlightOrBaselineColor ||
            getListItemAtTurningIndex(yIdx, colorPalette);

          const dataLabelColor = makeColorReadableOnBackgroundColor(
            color,
            'white',
          );

          return {
            name: s.label,
            data: R.map((d) => {
              const dataPoint = createDatapoint(
                d,
                areCategoriesDatesOrNumber,
                data.version,
              );

              return dataPoint;
            }, s.data),
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
          left: '5%',
          width: '90%',
          tickWidth: 0,
        },

        yAxis: {
          title: {
            enabled: false,
          },
          startOnTick: false,
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

Line.propTypes = {
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
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Line);
