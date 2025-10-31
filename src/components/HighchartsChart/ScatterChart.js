/* eslint-disable react/display-name */
import React, { forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts/es-modules/masters/highcharts.src';
import 'highcharts/es-modules/masters/modules/accessibility.src';
import 'highcharts/es-modules/masters/modules/broken-axis.src';
import 'highcharts/es-modules/masters/modules/annotations.src';
import 'highcharts/es-modules/masters/modules/exporting.src';
import 'highcharts/es-modules/masters/modules/export-data.src';
import HighchartsReact from 'highcharts-react-official';

if (typeof Highcharts === 'object') {
  Highcharts.SVGRenderer.prototype.symbols.cross = (x, y, w, h) => [
    'M',
    x,
    y,
    'L',
    x + w,
    y + h,
    'M',
    x + w,
    y,
    'L',
    x,
    y + h,
    'z',
  ];
  if (Highcharts.VMLRenderer) {
    Highcharts.VMLRenderer.prototype.symbols.cross =
      Highcharts.SVGRenderer.prototype.symbols.cross;
  }
}

const ScatterChart = forwardRef(({ options }, ref) => (
  <HighchartsReact
    ref={ref}
    highcharts={Highcharts}
    options={options}
    immutable
  />
));

ScatterChart.propTypes = {
  options: PropTypes.object.isRequired,
};

export default memo(ScatterChart);
