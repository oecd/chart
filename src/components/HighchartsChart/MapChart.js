/* eslint-disable react/display-name */
import React, {
  useMemo,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts/es-modules/masters/highcharts.src';
import 'highcharts/es-modules/masters/modules/accessibility.src';
import 'highcharts/es-modules/masters/modules/annotations.src';
import 'highcharts/es-modules/masters/modules/map.src';
import 'highcharts/es-modules/masters/modules/exporting.src';
import 'highcharts/es-modules/masters/modules/export-data.src';
import HighchartsReact from 'highcharts-react-official';
import { debounce } from 'throttle-debounce';
import * as R from 'ramda';
import { numericSymbols } from '../../utils/highchartsUtil';

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
  Highcharts.addEvent(
    Highcharts.Axis,
    'afterInit',
    allowNegativeOnLogarithmicAxis,
  );

  // !! all Highcharts extensions below are duplicated in GenericChart.js + Chart.builder
  // backoffice as "custom code" for exports. any change made here must be reported
  // in these 2 other places
  Highcharts.dateFormats = {
    q: (timestamp) => {
      const date = new Date(timestamp);
      const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
      return quarter;
    },
  };

  Highcharts.Templating.helpers.shorten = (value) => {
    if (
      value == null ||
      `${value}`.trim() === '' ||
      Number.isNaN(Number(value))
    ) {
      return value;
    }

    if (numericSymbols == null || numericSymbols.length === 0) {
      return value;
    }

    const comparisonNumbers = numericSymbols.map((_, i) => 1000 ** (i + 1));

    let i = comparisonNumbers.length - 1;
    let relevantIndex = -1;

    while (i >= 0 && relevantIndex === -1) {
      if (Math.abs(value) >= comparisonNumbers[i]) {
        relevantIndex = i;
      }
      i -= 1;
    }

    if (relevantIndex === -1) {
      return value;
    }

    return value / comparisonNumbers[relevantIndex];
  };

  Highcharts.Templating.helpers.ns = (value) => {
    if (
      value == null ||
      `${value}`.trim() === '' ||
      Number.isNaN(Number(value))
    ) {
      return '';
    }

    if (numericSymbols == null || numericSymbols.length === 0) {
      return '';
    }

    const comparisonNumbers = numericSymbols.map((_, i) => 1000 ** (i + 1));

    let i = comparisonNumbers.length - 1;
    let relevantIndex = -1;

    while (i >= 0 && relevantIndex === -1) {
      if (Math.abs(value) >= comparisonNumbers[i]) {
        relevantIndex = i;
      }
      i -= 1;
    }

    if (relevantIndex === -1) {
      return '';
    }

    return numericSymbols[relevantIndex];
  };

  Highcharts.Templating.helpers.rtz = (value) => {
    if (
      value == null ||
      `${value}`.trim() === '' ||
      Number.isNaN(Number(`${value}`.replace(',', '.')))
    ) {
      return value;
    }

    if (`${value}`.includes(',')) {
      const n = parseFloat(`${value}`.replace(',', '.'));
      return `${n}`.replace('.', ',');
    }

    return parseFloat(value);
  };
}

const MapChart = forwardRef(({ options, isFullScreen = false }, ref) => {
  const optionalDottedMapLines = useMemo(
    () =>
      R.compose(R.find(R.propEq('mapline', 'type')), R.prop('series'))(options),
    [options],
  );

  const zoomRef = useRef(null);

  const afterSetView = useCallback(function afterSetView() {
    if (zoomRef.current !== this.chart?.mapView.zoom) {
      R.forEach(
        (s) => {
          s.update({});
        },
        R.filter(R.propEq('mapline', 'type'), this.chart.series),
      );
      zoomRef.current = this.chart?.mapView.zoom;
    }
  }, []);

  const debouncedAfterSetView = useMemo(
    () => debounce(200, afterSetView),
    [afterSetView],
  );

  useEffect(() => {
    if (ref.current?.chart && optionalDottedMapLines) {
      const { chart } = ref.current;
      Highcharts.removeEvent(chart.mapView, 'afterSetView');

      Highcharts.addEvent(chart.mapView, 'afterSetView', debouncedAfterSetView);
    }
  }, [ref, debouncedAfterSetView, zoomRef, optionalDottedMapLines]);

  return (
    <HighchartsReact
      ref={ref}
      constructorType="mapChart"
      highcharts={Highcharts}
      options={options}
      immutable={!isFullScreen}
      updateArgs={[true, true, false]}
    />
  );
});

MapChart.propTypes = {
  options: PropTypes.object.isRequired,
  isFullScreen: PropTypes.bool,
};

export default memo(MapChart);
