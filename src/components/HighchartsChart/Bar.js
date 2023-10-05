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
  calcChartSpacing,
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

const calcMarginTop = (title, subtitle, horizontal, isSmall) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    if (isSmall) {
      return 22;
    }
    return horizontal ? 42 : 32;
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

const calcLegendMargin = (horizontal, isSmall) => {
  if (isSmall) {
    return horizontal ? 0 : 16;
  }

  return horizontal ? 4 : 24;
};

const calcXAxisLayout = (horizontal, areCategoriesDatesOrNumbers) => {
  if (horizontal) {
    return areCategoriesDatesOrNumbers
      ? { top: '6%', height: '87%' }
      : { top: '7%', height: '85%' };
  }

  return areCategoriesDatesOrNumbers
    ? { left: '8%', width: '89%' }
    : { left: '9%', width: '87%' };
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
      isSmall,
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
            fontFamily: "'Noto Sans', sans-serif",
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

        colors: colorPalette,

        title: {
          text: title,
          align: 'left',
          margin: 20,
          style: {
            color: '#101d40',
            fontSize: '18px',
            fontWeight: 'bold',
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
            data.areCategoriesDates || data.areCategoriesNumbers
              ? null
              : R.map(R.prop('label'), data.categories),
          ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
          labels: {
            style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
            ...R.prop('xAxisLabels', formatters),
            ...((hideXAxisLabels && !horizontal) ||
            (hideYAxisLabels && horizontal)
              ? { enabled: false }
              : {}),
          },
          gridLineColor: '#c2cbd6',
          lineColor: 'transparent',
          ...calcXAxisLayout(
            horizontal,
            data.areCategoriesDates || data.areCategoriesNumbers,
          ),
          tickWidth: 0,
        },

        yAxis: {
          title: {
            enabled: false,
          },
          gridLineColor: '#c2cbd6',
          lineColor: '#c2cbd6',
          ...(horizontal ? { width: '96%' } : {}),
          labels: {
            style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
            enabled:
              (!horizontal && !hideYAxisLabels) ||
              (horizontal && !hideXAxisLabels),
            ...(horizontal ? { y: 10 } : { align: 'left', x: 0, y: -4 }),
          },
          opposite: horizontal,
        },

        legend: {
          enabled: !hideLegend,
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
            pointPadding: 0.1,
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
        isSmall,
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
  isSmall: PropTypes.bool.isRequired,
  pivotValue: PropTypes.number,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  tooltipOutside: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Bar);
