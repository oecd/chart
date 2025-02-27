import React, { useMemo, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/annotations';
import 'highcharts/modules/exporting';
import 'highcharts/modules/offline-exporting';
import 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import { mapWithIndex } from '../../utils/ramdaUtil';
import {
  calcChartSpacing,
  createShadesFromColor,
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
} from '../../utils/chartUtil';

const createDatapoint = (d) => ({ y: d.value, __metadata: d.metadata });

const Pie = forwardRef(
  (
    {
      title = '',
      subtitle = '',
      data,
      highlight = null,
      baseline = null,
      hideLegend = false,
      hideXAxisLabels = false,
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
    const finalColorPalette = useMemo(
      () =>
        R.length(colorPalette) === 1
          ? createShadesFromColor(R.head(colorPalette))
          : colorPalette,
      [colorPalette],
    );

    const series = useMemo(
      () =>
        R.map(
          (s) => ({
            name: s.label,
            data: mapWithIndex((d, xIdx) => {
              const category = R.nth(xIdx, data.categories);

              const color =
                getBaselineOrHighlightColor(
                  category,
                  highlight,
                  baseline,
                  highlightColors,
                ) || getListItemAtTurningIndex(xIdx, finalColorPalette);

              const dataPoint = createDatapoint(d);

              return { name: category.label, ...dataPoint, color };
            }, s.data),
          }),
          R.isEmpty(data.series) ? [] : [R.head(data.series)],
        ),
      [data, finalColorPalette, highlightColors, highlight, baseline],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          type: 'pie',
          style: {
            fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
          },
          height,
          animation: false,
          spacing: calcChartSpacing(isFullScreen),
          marginLeft: 10,
          marginRight: 10,
          events: { fullscreenClose },
        },

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

        legend: {
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
          margin: isSmall ? 16 : 24,
        },

        plotOptions: {
          series: {
            animation: false,
            borderWidth: 0.3,
            borderColor: '#ffffff',
            borderRadius: 0,
          },
          pie: {
            dataLabels: {
              enabled: !hideXAxisLabels,
              style: {
                fontSize: isSmall ? '13px' : '16px',
                color: '#586179',
                fontWeight: 'normal',
              },
            },
            showInLegend: !hideLegend,
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
        series,
        width,
        height,
        isSmall,
        hideLegend,
        hideXAxisLabels,
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

Pie.propTypes = {
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

export default memo(Pie);
