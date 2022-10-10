import React, { useMemo, forwardRef } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import AnnotationsModule from 'highcharts/modules/annotations';
import ExportingModule from 'highcharts/modules/exporting';
import ExportDataModule from 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import { mapWithIndex } from '../../utils/ramdaUtil';
import {
  createShadesFromColor,
  deepMergeUserOptionsWithDefaultOptions,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
} from '../../utils/chartUtil';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const Pie = forwardRef(
  (
    {
      data,
      highlight,
      baseline,
      hideLegend,
      hideXAxisLabels,
      colorPalette,
      highlightColors,
      width,
      height,
      formatters,
      optionsOverride,
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

              return { name: category.label, y: d, color };
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
            fontFamily: 'Segoe UI',
          },
          height,
          animation: false,
        },

        title: {
          text: '',
        },

        credits: {
          enabled: false,
        },

        legend: {
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
          },
          pie: {
            dataLabels: {
              enabled: !hideXAxisLabels,
              style: { color: '#0c0c0c', fontSize: '12px' },
            },
            showInLegend: !hideLegend,
          },
        },

        tooltip: {
          ...R.propOr({}, 'tooltip', formatters),
          outside: true,
        },

        series,

        exporting: {
          enabled: false,
          filename: `export-${new Date(Date.now()).toISOString()}`,
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        data,
        series,
        colorPalette,
        width,
        height,
        hideLegend,
        hideXAxisLabels,
        formatters,
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
        immutable
      />
    );
  },
);

Pie.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
  }).isRequired,
  highlight: PropTypes.array,
  baseline: PropTypes.string,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  colorPalette: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  formatters: PropTypes.object,
  optionsOverride: PropTypes.object,
};

Pie.defaultProps = {
  highlight: [],
  baseline: null,
  hideLegend: false,
  hideXAxisLabels: false,
  formatters: {},
  optionsOverride: {},
};

export default Pie;
