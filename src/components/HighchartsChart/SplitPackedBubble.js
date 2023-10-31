import React, { useMemo, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import BrokenAxisModule from 'highcharts/modules/broken-axis';
import AnnotationsModule from 'highcharts/modules/annotations';
import ExportingModule from 'highcharts/modules/exporting';
import OfflineExportingModule from 'highcharts/modules/offline-exporting';
import ExportDataModule from 'highcharts/modules/export-data';
import HighchartsMore from 'highcharts/highcharts-more';
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
  HighchartsMore(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  OfflineExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const calcMarginTop = (title, subtitle) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    return 32;
  }

  return undefined;
};

const calcXAxisLayout = (areCategoriesDatesOrNumbers) =>
  areCategoriesDatesOrNumbers
    ? { left: '8%', width: '89%' }
    : { left: '9%', width: '87%' };

const SplitPackedBubble = forwardRef(
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
      width,
      height,
      pivotValue = 0,
      formatters = {},
      fullscreenClose = null,
      isFullScreen = false,
      csvExportcolumnHeaderFormatter,
      optionsOverride = {},
    },
    ref,
  ) => {
    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

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

              const dataPoint =
                data.areCategoriesDates || data.areCategoriesNumbers
                  ? { x: R.head(d), value: R.nth(1, d) }
                  : { value: d };

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
      [data, colorPalette, highlightColors, parsedHighlight, baseline],
    );

    const maxValue = useMemo(
      () =>
        R.compose(
          (values) => Math.max(...values),
          R.unnest,
          R.map(R.compose(R.map(R.prop('value')), R.prop('data'))),
        )(series),
      [series],
    );

    //TODO: never treat categories as num or date (does not makes sense)
    // console.log(data);
    // console.log(series);

    const defaultOptions = useMemo(
      () => ({
        chart: {
          type: 'packedbubble',
          style: {
            fontFamily: "'Noto Sans Display', sans-serif",
          },
          marginTop: hideLegend ? calcMarginTop(title, subtitle) : undefined,
          height,
          animation: false,
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
            style: { color: '#586179', fontSize: '16px' },
            //...R.prop('xAxisLabels', formatters),
            // ...((hideXAxisLabels && !horizontal) ||
            // (hideYAxisLabels && horizontal)
            //   ? { enabled: false }
            //   : {}),
          },
          gridLineColor: '#c2cbd6',
          lineColor: 'transparent',
          ...calcXAxisLayout(
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
          labels: {
            style: { fontSize: '16px', color: '#586179' },
            // enabled:
            //   (!horizontal && !hideYAxisLabels) ||
            //   (horizontal && !hideXAxisLabels),

            align: 'left',
            x: 0,
            y: -4,
          },
        },

        legend: {
          enabled: !hideLegend,
          itemDistance: 10,
          itemStyle: {
            fontWeight: 'normal',
            color: '#586179',
            fontSize: '16px',
          },
          align: 'left',
          squareSymbol: false,
          symbolRadius: 0,
          symbolWidth: 18,
          x: -7,
          margin: 10,
        },

        plotOptions: {
          packedbubble: {
            animation: false,
            draggable: false,
            minSize: '10%',
            maxSize: '70%',
            zMin: 0,
            zMax: maxValue * 1.5,
            layoutAlgorithm: {
              //enableSimulation: false,

              dragBetweenSeries: false,

              // all mixed
              // splitSeries: false,
              // seriesInteraction: true,

              // within parents
              splitSeries: true,
              seriesInteraction: false,
              parentNodeLimit: true,
            },
          },
        },

        tooltip: {
          //...R.prop('tooltip', formatters),
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
        pivotValue,
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

SplitPackedBubble.propTypes = {
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
  pivotValue: PropTypes.number,
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(SplitPackedBubble);
