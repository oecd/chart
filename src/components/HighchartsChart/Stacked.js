import React, { useMemo, useEffect, useRef, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import BrokenAxisModule from 'highcharts/modules/broken-axis';
import AnnotationsModule from 'highcharts/modules/annotations';
import ExportingModule from 'highcharts/modules/exporting';
import ExportDataModule from 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import {
  createShadesFromColor,
  createStackedDatapoints,
  deepMergeUserOptionsWithDefaultOptions,
} from '../../utils/chartUtil';
import { stackingOptions, fakeMemberLatest } from '../../constants/chart';

if (typeof Highcharts === 'object') {
  AnnotationsModule(Highcharts);
  BrokenAxisModule(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  ExportDataModule(Highcharts);
}

const Stacked = forwardRef(
  (
    {
      horizontal,
      area,
      data,
      highlight,
      baseline,
      hideLegend,
      hideXAxisLabels,
      hideYAxisLabels,
      colorPalette,
      highlightColors,
      width,
      height,
      stacking,
      formatters,
      optionsOverride,
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

    const updateNeededAfterChartHasBeenRenderedOnceDone = useRef(false);

    useEffect(() => {
      updateNeededAfterChartHasBeenRenderedOnceDone.current = false;
    }, [width, height]);

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
          marginTop: horizontal ? 32 : 22,
          height,
          animation: false,
          spacingBottom: 5,
          events: data.areCategoriesNumbersOrDates
            ? {}
            : {
                render: ({ target: chart }) => {
                  if (!updateNeededAfterChartHasBeenRenderedOnceDone.current) {
                    // TODO:
                    // show/hide depending on height as well (chart is more important than legend)
                    updateNeededAfterChartHasBeenRenderedOnceDone.current = true;
                    if (
                      ((!horizontal && !hideXAxisLabels) ||
                        (horizontal && !hideYAxisLabels)) &&
                      !hideFakeMemberLatest
                    ) {
                      // WARNING: calling update in render can easily cause an infinite loop
                      // without a stopping condition
                      chart.xAxis[0].update(
                        {
                          labels: {
                            enabled: chart.xAxis[0]?.tickInterval === 1,
                          },
                        },
                        true,
                        false,
                        false,
                      );
                    }
                  }
                },
              },
        },

        colors: finalColorPalette,

        title: {
          text: '',
        },

        credits: {
          enabled: false,
        },

        xAxis: {
          categories: R.map(R.prop('label'), data.categories),
          labels: {
            style: { color: '#0c0c0c', fontSize: '12px' },
            ...((hideXAxisLabels && !horizontal) ||
            (hideYAxisLabels && horizontal) ||
            hideFakeMemberLatest
              ? { enabled: false }
              : {}),
          },
          gridLineColor: '#cbcbcb',
          lineColor: '#cbcbcb',
          ...(horizontal
            ? { height: '85%', top: '7%' }
            : { width: '90%', left: '7%' }),
        },

        yAxis: {
          title: {
            enabled: false,
          },
          startOnTick: false,
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
              ...R.propOr({}, 'dataLabels', formatters),
            },
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
        horizontal,
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

Stacked.propTypes = {
  horizontal: PropTypes.bool,
  area: PropTypes.bool,
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
    areCategoriesNumbersOrDates: PropTypes.bool.isRequired,
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
  optionsOverride: PropTypes.object,
};

Stacked.defaultProps = {
  horizontal: false,
  area: false,
  highlight: '',
  baseline: null,
  hideLegend: false,
  hideXAxisLabels: false,
  hideYAxisLabels: false,
  stacking: stackingOptions.percent.value,
  formatters: {},
  optionsOverride: {},
};

export default memo(Stacked);
