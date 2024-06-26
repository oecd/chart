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
  createShadesFromColor,
  createStackedDatapoints,
  deepMergeUserOptionsWithDefaultOptions,
} from '../../utils/chartUtil';
import { stackingOptions, fakeMemberLatest } from '../../constants/chart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';

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

const Stacked = forwardRef(
  (
    {
      horizontal = false,
      area = false,
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
      stacking = stackingOptions.percent.value,
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

    const finalColorPalette = useMemo(
      () =>
        R.when(
          R.compose(R.equals(1), R.length),
          R.compose(createShadesFromColor, R.head),
        )(colorPalette),

      [colorPalette],
    );

    const series = useMemo(
      () =>
        createStackedDatapoints(
          data,
          finalColorPalette,
          highlightColors,
          parsedHighlight,
          baseline,
        ),
      [data, finalColorPalette, highlightColors, parsedHighlight, baseline],
    );

    const chartType = R.cond([
      [R.always(area), R.always('area')],
      [R.always(horizontal), R.always('bar')],
      [R.T, R.always('column')],
    ])();

    const hideFakeMemberLatest = useMemo(
      () =>
        R.length(data.categories) === 1 &&
        R.head(data.categories).code === fakeMemberLatest.code,
      [data.categories],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          type: chartType,
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

        colors: finalColorPalette,

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
            area && (data.areCategoriesDates || data.areCategoriesNumbers)
              ? null
              : R.map(R.prop('label'), data.categories),
          ...(data.areCategoriesDates
            ? {
                type: 'datetime',
              }
            : {}),
          labels: {
            style: { color: '#0c0c0c', fontSize: '12px' },
            ...R.prop('xAxisLabels', formatters),
            ...((hideXAxisLabels && !horizontal) ||
            (hideYAxisLabels && horizontal) ||
            hideFakeMemberLatest
              ? { enabled: false }
              : {}),
          },
          gridLineColor: '#e6e6e6',
          lineColor: 'transparent',
          ...(horizontal
            ? { height: '85%', top: '7%' }
            : { width: '90%', left: '7%' }),
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
            enabled:
              (!horizontal && !hideYAxisLabels) ||
              (horizontal && !hideXAxisLabels),
            ...(horizontal ? {} : { align: 'left', x: 0, y: -4 }),
          },
          opposite: horizontal,
          reversedStacks: false,
        },

        legend: {
          enabled: !hideLegend,
          reversed: false,
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
            stacking: stacking || stackingOptions.percent.value,
            pointPadding: 0,
            groupPadding: 0,
            borderWidth: 1.5,
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
        finalColorPalette,
        width,
        height,
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
        stacking,
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

Stacked.propTypes = {
  horizontal: PropTypes.bool,
  area: PropTypes.bool,
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
  stacking: PropTypes.string,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  tooltipOutside: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Stacked);
