import React, { useMemo, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/broken-axis';
import 'highcharts/modules/annotations';
import 'highcharts/modules/exporting';
import 'highcharts/modules/offline-exporting';
import 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import {
  calcChartSpacing,
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
  makeColorReadableOnBackgroundColor,
} from '../../utils/chartUtil';
import { isNilOrEmpty, mapWithIndex } from '../../utils/ramdaUtil';

const createDatapoint = (d, areCategoriesDatesOrNumber) =>
  areCategoriesDatesOrNumber
    ? { x: d.metadata.parsedX, y: d.value, __metadata: d.metadata }
    : { y: d.value, __metadata: d.metadata };

const calcMarginTop = (title, subtitle, isSmall) => {
  if (isNilOrEmpty(title) && isNilOrEmpty(subtitle)) {
    return isSmall ? 20 : 32;
  }

  return undefined;
};

const Line = forwardRef(
  (
    {
      data,
      title = '',
      subtitle = '',
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
      formatters = {},
      fullscreenClose = null,
      isFullScreen = false,
      tooltipOutside,
      csvExportcolumnHeaderFormatter,
      optionsOverride = {},
    },
    ref,
  ) => {
    const areCategoriesDatesOrNumber =
      data.areCategoriesDates || data.areCategoriesNumbers;

    const series = useMemo(
      () =>
        mapWithIndex((s, yIdx) => {
          const highlightOrBaselineColor = getBaselineOrHighlightColor(
            s,
            highlight,
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
              const dataPoint = createDatapoint(d, areCategoriesDatesOrNumber);

              return dataPoint;
            }, s.data),
            type: 'spline',
            lineWidth: 2.5,
            marker: {
              symbol: 'circle',
              radius: 3,
              lineWidth: 2,
            },
            states: {
              hover: {
                lineWidth: 2.5,
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
            showInLegend: true,
          };
        }, data.series),
      [
        data,
        areCategoriesDatesOrNumber,
        colorPalette,
        highlightColors,
        highlight,
        baseline,
      ],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          style: {
            fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
          },
          marginTop: hideLegend
            ? calcMarginTop(title, subtitle, isSmall)
            : undefined,
          height,
          animation: false,
          spacing: calcChartSpacing(isFullScreen),
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
            data.areCategoriesDates || data.areCategoriesNumbers
              ? null
              : R.map(R.prop('label'), data.categories),
          ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
          labels: {
            style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
            ...R.prop('xAxisLabels', formatters),
            ...(hideXAxisLabels ? { enabled: false } : {}),
          },
          gridLineColor: '#c2cbd6',
          lineColor: 'transparent',
          left:
            data.areCategoriesDates || data.areCategoriesNumbers ? '10%' : '5%',
          width:
            data.areCategoriesDates || data.areCategoriesNumbers
              ? '85%'
              : '95%',
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
            enabled: !hideYAxisLabels,
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
            fontSize: isSmall ? '13px' : '16px',
          },
          align: 'left',
          symbolWidth: 18,
          x: -7,
          verticalAlign: 'top',
          margin: isSmall ? 26 : 34,
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

Line.propTypes = {
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
  formatters: PropTypes.object,
  fullscreenClose: PropTypes.func,
  isFullScreen: PropTypes.bool,
  tooltipOutside: PropTypes.bool,
  csvExportcolumnHeaderFormatter: PropTypes.func.isRequired,
  optionsOverride: PropTypes.object,
};

export default memo(Line);
