/* eslint-disable react/no-this-in-sfc  */
import React, { useMemo, forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import AnnotationsModule from 'highcharts/modules/annotations';
import HighchartsMap from 'highcharts/modules/map';
import map from '@highcharts/map-collection/custom/world-robinson-lowres.geo.json';
import proj4 from 'proj4';
import ExportingModule from 'highcharts/modules/exporting';
import ExportDataModule from 'highcharts/modules/export-data';
import HighchartsReact from 'highcharts-react-official';
import * as R from 'ramda';

import {
  deepMergeUserOptionsWithDefaultOptions,
  getListItemAtTurningIndex,
  createLighterColor,
  convertColorToHex,
  createMapDataClasses,
  getBaselineOrHighlightColor,
  createShadesFromColor,
} from '../../utils/chartUtil';
import { mapTypes, fakeMemberLatest } from '../../constants/chart';
import {
  isNilOrEmpty,
  mapWithIndex,
  reduceWithIndex,
} from '../../utils/ramdaUtil';

// inspired example about "Logarithmic color axis with extension to emulate negative values"
// https://api.highcharts.com/highmaps/colorAxis.type
function allowNegativeOnLogarithmicAxis() {
  const { logarithmic } = this;

  if (logarithmic && this.options.allowNegativeLog) {
    // avoid errors on negative numbers on a log axis
    this.positiveValuesOnly = false;

    // override the converter functions
    logarithmic.log2lin = (num) => {
      const isNegative = num < 0;

      const absoluteNum = Math.abs(num);
      const adjustedNum =
        absoluteNum < 10 ? absoluteNum + (10 - absoluteNum) / 10 : absoluteNum;

      const result = Math.log(adjustedNum) / Math.LN10;
      return isNegative ? -result : result;
    };

    logarithmic.lin2log = (num) => {
      const isNegative = num < 0;

      const exp = 10 ** Math.abs(num);
      const result = exp < 10 ? (10 * (exp - 1)) / (10 - 1) : exp;

      return isNegative ? -result : result;
    };
  }
}

if (typeof Highcharts === 'object') {
  HighchartsMap(Highcharts);
  AnnotationsModule(Highcharts);
  AccessibilityModule(Highcharts);
  ExportingModule(Highcharts);
  ExportDataModule(Highcharts);
  Highcharts.addEvent(
    Highcharts.Axis,
    'afterInit',
    allowNegativeOnLogarithmicAxis,
  );
}

const MapChart = forwardRef(
  (
    {
      data,
      mapType,
      mapDisplayCountriesName,
      mapAutoShade,
      mapColorValueSteps,
      highlight,
      baseline,
      hideLegend,
      colorPalette,
      highlightColors,
      width,
      height,
      formatters,
      optionsOverride,
    },
    ref,
  ) => {
    const parsedHighlight = useMemo(() => R.split('|', highlight), [highlight]);

    const stepsHaveLabels = useMemo(
      () =>
        !isNilOrEmpty(mapColorValueSteps) &&
        R.all(R.compose(R.equals(2), R.length), mapColorValueSteps),
      [mapColorValueSteps],
    );

    const finalColorPalette = useMemo(
      () =>
        R.when(
          (cp) =>
            R.equals(1, R.length(cp)) &&
            !mapAutoShade &&
            !isNilOrEmpty(mapColorValueSteps),
          (cp) => {
            const nbShadesToCreate = R.min(6, R.length(mapColorValueSteps) + 1);
            return R.compose(
              R.reverse,
              R.take(nbShadesToCreate),
              createShadesFromColor,
              R.head,
            )(cp);
          },
        )(colorPalette),
      [colorPalette, mapAutoShade, mapColorValueSteps],
    );

    const getLabelFromMap = (code) =>
      R.pathOr(
        code,
        ['properties', 'name'],
        R.find(R.pathEq(['properties', 'iso-a3'], code), map.features || []),
      );

    const series = useMemo(
      () => [
        {
          type: 'map',
          enableMouseTracking: false,
          showInLegend: false,
          dataLabels: {
            enabled: mapDisplayCountriesName,
            format: '{point.name}',
          },
          allAreas: true,
          nullColor: '#bbbbbb',
        },
        ...mapWithIndex(
          (s, yIdx) => ({
            name: s.label,
            type: mapType === mapTypes.normal.value ? 'map' : 'mapbubble',
            joinBy: ['iso-a3', 'code'],
            color: getListItemAtTurningIndex(yIdx, finalColorPalette),
            ...(mapType !== mapTypes.normal.value
              ? {
                  minSize: 8,
                  maxSize: mapType === mapTypes.point.value ? 8 : '10%',
                }
              : {}),

            showInLegend: s.code !== fakeMemberLatest.code,

            data: reduceWithIndex(
              (acc, d, xIdx) => {
                if (isNilOrEmpty(d)) {
                  return acc;
                }

                const countryCode = R.toUpper(
                  `${R.nth(xIdx, data.categories)?.code}`,
                );

                const baselineOrHighlightColor = getBaselineOrHighlightColor(
                  { code: countryCode, label: getLabelFromMap(countryCode) },
                  R.map(R.toUpper, parsedHighlight),
                  R.toUpper(baseline),
                  highlightColors,
                );

                return R.append(
                  {
                    code: R.toUpper(`${R.nth(xIdx, data.categories)?.code}`),
                    ...(mapType === mapTypes.normal.value
                      ? { value: d }
                      : { z: d }),
                    ...(baselineOrHighlightColor
                      ? { color: baselineOrHighlightColor }
                      : {}),
                  },
                  acc,
                );
              },
              [],
              s.data,
            ),
          }),
          data.series,
        ),
      ],
      [
        mapDisplayCountriesName,
        mapType,
        data,
        finalColorPalette,
        highlightColors,
        parsedHighlight,
        baseline,
      ],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          map,
          proj4,

          style: {
            fontFamily: 'Segoe UI',
          },
          height,
          animation: true,
          spacingBottom: 5,
        },

        colors: finalColorPalette,

        colorAxis: R.cond([
          [
            R.always(mapAutoShade),
            R.always([
              {
                type: 'logarithmic',
                allowNegativeLog: true,
                minColor: createLighterColor(R.head(finalColorPalette), 90),
                maxColor: convertColorToHex(R.head(finalColorPalette)),
              },
            ]),
          ],
          [
            R.always(!isNilOrEmpty(mapColorValueSteps)),
            R.always([
              {
                dataClassColor: 'category',
                dataClasses: createMapDataClasses(
                  mapColorValueSteps,
                  stepsHaveLabels,
                ),
              },
            ]),
          ],
          [R.T, R.always([])],
        ])(),

        title: {
          text: '',
        },

        credits: {
          enabled: false,
        },

        legend: {
          enabled: !hideLegend,
          itemDistance: 10,
          margin: 10,
          itemStyle: {
            fontWeight: 'normal',
            color: '#0c0c0c',
          },
          squareSymbol: false,
          symbolRadius: mapType === mapTypes.normal.value ? 0 : undefined,
          symbolWidth:
            R.includes(mapType, [
              mapTypes.point.value,
              mapTypes.bubble.value,
            ]) && !mapAutoShade
              ? 12
              : undefined,
        },

        plotOptions: {
          map: {
            allAreas: false,
          },
          series: {
            animation: false,
            dataLabels: {
              ...R.propOr({}, 'dataLabels', formatters),
              color: '#333333',
            },
            borderColor: '#bbbbbb',
          },
        },

        tooltip: { ...R.propOr({}, 'tooltip', formatters), outside: true },

        mapNavigation: {
          enabled: true,
          buttonOptions: {
            verticalAlign: 'top',
          },
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
        mapType,
        mapAutoShade,
        mapColorValueSteps,
        stepsHaveLabels,
        finalColorPalette,
        width,
        height,
        hideLegend,
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
        constructorType="mapChart"
        highcharts={Highcharts}
        options={mergedOptions}
        immutable
      />
    );
  },
);

MapChart.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
    areCategoriesNumbersOrDates: PropTypes.bool.isRequired,
  }).isRequired,
  mapType: PropTypes.string,
  mapDisplayCountriesName: PropTypes.bool,
  mapAutoShade: PropTypes.bool,
  mapColorValueSteps: PropTypes.array,
  highlight: PropTypes.string,
  baseline: PropTypes.string,
  hideLegend: PropTypes.bool,
  colorPalette: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  formatters: PropTypes.object,
  optionsOverride: PropTypes.object,
};

MapChart.defaultProps = {
  mapType: mapTypes.normal.value,
  mapDisplayCountriesName: false,
  mapAutoShade: true,
  mapColorValueSteps: [],
  highlight: '',
  baseline: null,
  hideLegend: false,
  formatters: {},
  optionsOverride: {},
};

export default memo(MapChart);
