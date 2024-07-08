/* eslint-disable react/no-this-in-sfc  */
import React, { useMemo, forwardRef, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import AccessibilityModule from 'highcharts/modules/accessibility';
import AnnotationsModule from 'highcharts/modules/annotations';
import HighchartsMap from 'highcharts/modules/map';
import map from '@highcharts/map-collection/custom/world-robinson-lowres.geo.json';
import proj4 from 'proj4';
import ExportingModule from 'highcharts/modules/exporting';
import OfflineExportingModule from 'highcharts/modules/offline-exporting';
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
  calcChartSpacing,
} from '../../utils/chartUtil';
import { mapTypes } from '../../constants/chart';
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
  OfflineExportingModule(Highcharts);
  ExportDataModule(Highcharts);
  Highcharts.addEvent(
    Highcharts.Axis,
    'afterInit',
    allowNegativeOnLogarithmicAxis,
  );
}

const createDatapoint = (d, mapType, version) => {
  if (version !== '2') {
    return mapType === mapTypes.normal.value ? { value: d } : { z: d };
  }

  return mapType === mapTypes.normal.value
    ? { value: d.value, __metadata: d.metadata }
    : { z: d.value, __metadata: d.metadata };
};

const overrideCountriesLabel = (codeLabelMapping) => {
  if (isNilOrEmpty(codeLabelMapping)) {
    return map;
  }

  return R.modify(
    ['features'],
    R.map((c) => {
      const code = R.path(['properties', 'iso-a3'], c);
      const label = R.prop(code, codeLabelMapping);

      if (R.has(code, codeLabelMapping) && code !== label) {
        return R.assocPath(['properties', 'name'], label, c);
      }

      return c;
    }),
    map,
  );
};

const MapChart = forwardRef(
  (
    {
      title = '',
      subtitle = '',
      data,
      mapType = mapTypes.normal.value,
      mapDisplayCountriesName = false,
      mapAutoShade = true,
      mapColorValueSteps = [],
      highlight = null,
      baseline = null,
      hideLegend = false,
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

    const finalMap = useMemo(
      // eslint-disable-next-line react/prop-types
      () => overrideCountriesLabel(data.codeLabelMapping),
      [data],
    );

    const getLabelFromMap = useCallback(
      (code) =>
        R.pathOr(
          code,
          ['properties', 'name'],
          R.find(
            R.pathEq(code, ['properties', 'iso-a3']),
            finalMap.features || [],
          ),
        ),
      [finalMap],
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

            showInLegend: true,

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
                  R.map(R.toUpper, highlight),
                  R.map(R.toUpper, baseline),
                  highlightColors,
                );

                return R.append(
                  {
                    code: R.toUpper(`${R.nth(xIdx, data.categories)?.code}`),
                    ...createDatapoint(d, mapType, data.version),
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
        highlight,
        baseline,
        getLabelFromMap,
      ],
    );

    const defaultOptions = useMemo(
      () => ({
        chart: {
          map: finalMap,
          proj4,
          style: {
            fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
          },
          height,
          animation: !isFullScreen,
          spacing: calcChartSpacing(isFullScreen),
          events: { fullscreenClose },
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
                labels: {
                  style: {
                    color: '#586179',
                    fontSize: isSmall ? '13px' : '16px',
                  },
                },
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
          enabled: !hideLegend,
          itemDistance: 10,
          verticalAlign: 'top',
          x: -7,
          margin: isSmall ? 16 : 24,
          itemStyle: {
            fontWeight: 'normal',
            color: '#586179',
            fontSize: isSmall ? '13px' : '16px',
          },
          align: 'left',
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
              ...R.prop('dataLabels', formatters),
              color: '#586179',
            },
            borderColor: '#bbbbbb',
          },
        },

        tooltip: {
          ...R.prop('tooltip', formatters),
          outside: tooltipOutside,
        },

        mapNavigation: {
          enabled: true,
          buttonOptions: {
            verticalAlign: 'bottom',
          },

          buttons: {
            zoomIn: {
              y: -29,
            },
            zoomOut: {
              y: -1,
            },
          },
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
        mapType,
        mapAutoShade,
        mapColorValueSteps,
        stepsHaveLabels,
        finalColorPalette,
        width,
        height,
        isSmall,
        hideLegend,
        formatters,
        fullscreenClose,
        isFullScreen,
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
        constructorType="mapChart"
        highcharts={Highcharts}
        options={mergedOptions}
        immutable={!isFullScreen}
      />
    );
  },
);

MapChart.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  data: PropTypes.shape({
    categories: PropTypes.array.isRequired,
    series: PropTypes.array.isRequired,
    version: PropTypes.string,
  }).isRequired,
  mapType: PropTypes.string,
  mapDisplayCountriesName: PropTypes.bool,
  mapAutoShade: PropTypes.bool,
  mapColorValueSteps: PropTypes.array,
  highlight: PropTypes.array,
  baseline: PropTypes.array,
  hideLegend: PropTypes.bool,
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

export default memo(MapChart);
