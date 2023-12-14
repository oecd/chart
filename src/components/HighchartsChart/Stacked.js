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
  calcChartSpacing,
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

const calcMarginTop = (title, subtitle, horizontal, isSmall) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    if (isSmall) {
      return 22;
    }
    return horizontal ? 22 : 32;
  }

  return undefined;
};

const calcLegendMargin = (horizontal, isSmall) => {
  if (isSmall) {
    return horizontal ? 10 : 26;
  }

  return horizontal ? 14 : 34;
};

const calcXAxisLayout = (horizontal, area, areCategoriesDatesOrNumbers) => {
  if (area) {
    return areCategoriesDatesOrNumbers
      ? { left: '10%', width: '85%' }
      : { left: '5%', width: '95%' };
  }

  return horizontal
    ? { top: '8%', height: '88%' }
    : { left: '9%', width: '87%' };
};

const Stacked = forwardRef(
  (
    {
      horizontal = false,
      area = false,
      title = '',
      subtitle = '',
      data,
      highlight = null,
      baseline = null,
      hideLegend = false,
      hideXAxisLabels = false,
      hideYAxisLabels = false,
      colorPalette,
      highlightColors,
      width,
      height,
      isSmall,
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
          highlight,
          baseline,
        ),
      [data, finalColorPalette, highlightColors, highlight, baseline],
    );

    const chartType = R.cond([
      [R.always(area), R.always('areaspline')],
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
            fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
          },
          marginTop: hideLegend
            ? calcMarginTop(title, subtitle, horizontal, isSmall)
            : undefined,
          height,
          animation: false,
          spacing: calcChartSpacing(isFullScreen),
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
            color: '#101d40',
            fontWeight: 'bold',
            fontSize: '18px',
          },
        },
        subtitle: {
          text: subtitle,
          align: 'left',
          style: {
            color: '#586179',
            fontSize: '17px',
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
            style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
            ...R.prop('xAxisLabels', formatters),
            ...((hideXAxisLabels && !horizontal) ||
            (hideYAxisLabels && horizontal) ||
            hideFakeMemberLatest
              ? { enabled: false }
              : {}),
          },
          gridLineColor: '#c2cbd6',
          lineColor: 'transparent',
          ...calcXAxisLayout(
            horizontal,
            area,
            data.areCategoriesDates || data.areCategoriesNumbers,
          ),
          tickWidth: 0,
        },

        yAxis: {
          title: {
            enabled: false,
          },
          startOnTick: false,
          gridLineColor: '#c2cbd6',
          lineColor: '#c2cbd6',
          labels: {
            style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
            enabled:
              (!horizontal && !hideYAxisLabels) ||
              (horizontal && !hideXAxisLabels),
            align: 'left',
            ...(horizontal ? { x: 4, y: isSmall ? 28 : 35 } : { x: 0, y: -4 }),
          },
          opposite: horizontal,
          reversedStacks: false,
        },

        legend: {
          enabled: !hideLegend,
          reversed: false,
          itemDistance: 10,
          itemStyle: {
            fontWeight: 'normal',
            color: '#586179',
            fontSize: isSmall ? '13px' : '16px',
          },
          align: 'left',
          squareSymbol: false,
          symbolRadius: 0,
          symbolWidth: 18,
          x: -7,
          verticalAlign: 'top',
          margin: calcLegendMargin(horizontal, isSmall),
        },

        plotOptions: {
          series: {
            animation: false,
            stacking: stacking || stackingOptions.percent.value,
            pointPadding: 0.1,
            groupPadding: 0.1,
            borderWidth: 0.3,
            borderColor: '#ffffff',
            borderRadius: 0,
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
        isSmall,
        height,
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
        stacking,
        formatters,
        fullscreenClose,
        tooltipOutside,
        csvExportcolumnHeaderFormatter,
        area,
        chartType,
        hideFakeMemberLatest,
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
  highlight: PropTypes.array,
  baseline: PropTypes.array,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  hideYAxisLabels: PropTypes.bool,
  colorPalette: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  isSmall: PropTypes.bool.isRequired,
  stacking: PropTypes.string,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  tooltipOutside: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Stacked);
