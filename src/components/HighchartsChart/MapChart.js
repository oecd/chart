/* eslint-disable react/no-this-in-sfc  */
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
