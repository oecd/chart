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

const createDatapoint = (d, areCategoriesDatesOrNumber, version) => {
  if (version !== '2') {
    return areCategoriesDatesOrNumber
      ? { x: R.head(d), y: R.nth(1, d) }
      : { y: d };
  }

  return areCategoriesDatesOrNumber
    ? { x: d.metadata.parsedX, y: d.value, __metadata: d.metadata }
    : { y: d.value, __metadata: d.metadata };
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

              const dataPoint = createDatapoint(
                d,
                areCategoriesDatesOrNumber,
                data.version,
              );

              return baselineOrHighlightColor
                ? {
                    name: category.label,
                    color: baselineOrHighlightColor,
                    ...dataPoint,
                  }
                : { name: category.label, ...dataPoint };
            }, s.data),
            color: seriesColor,
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
          type: horizontal ? 'bar' : 'column',
          style: {
            fontFamily: 'Segoe UI',
          },
          marginTop: calcMarginTop(title, subtitle, horizontal),
          height,
          animation: false,
          spacingBottom: 5,
          events: {
            fullscreenClose,
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
            ...((hideXAxisLabels && !horizontal) ||
            (hideYAxisLabels && horizontal)
              ? { enabled: false }
              : {}),
          },
          gridLineColor: '#e6e6e6',
          lineColor: 'transparent',
          ...(horizontal
            ? { height: '90%', top: '5%' }
            : { width: '90%', left: '7%' }),
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
              ...R.prop('dataLabels', formatters),
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

Bar.propTypes = {
  horizontal: PropTypes.bool,
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
  pivotValue: PropTypes.number,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  tooltipOutside: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Bar);
