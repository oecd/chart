/* eslint-disable react/display-name */
import {
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

const MapChart = forwardRef(({ options }, ref) => {
  const optionalDottedMapLines = useMemo(
    () =>
      R.compose(R.find(R.propEq('mapline', 'type')), R.prop('series'))(options),
    [options],
  );

  const zoomRef = useRef(null);

  const afterSetView = useCallback(function afterSetView() {
    if (!this.chart?.mapView) {
      return;
    }

    if (zoomRef.current !== this.chart.mapView.zoom) {
      R.forEach(
        (s) => {
          s.update({});
        },
        R.filter(R.propEq('mapline', 'type'), this.chart.series),
      );
      zoomRef.current = this.chart.mapView.zoom;
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
      immutable
      updateArgs={[true, true, false]}
    />
  );
});

MapChart.propTypes = {
  options: PropTypes.object.isRequired,
};

export default memo(MapChart);
