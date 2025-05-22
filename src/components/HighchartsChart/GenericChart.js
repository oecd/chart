import React, { forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts/es-modules/masters/highcharts.src';
import 'highcharts/es-modules/masters/highcharts-more.src';
import 'highcharts/es-modules/masters/modules/accessibility.src';
import 'highcharts/es-modules/masters/modules/broken-axis.src';
import 'highcharts/es-modules/masters/modules/annotations.src';
import 'highcharts/es-modules/masters/modules/exporting.src';
import 'highcharts/es-modules/masters/modules/export-data.src';
import HighchartsReact from 'highcharts-react-official';

const GenericChart = forwardRef(({ options, isFullScreen = false }, ref) => (
  <HighchartsReact
    ref={ref}
    highcharts={Highcharts}
    options={options}
    immutable={!isFullScreen}
  />
));

GenericChart.propTypes = {
  options: PropTypes.object.isRequired,
  isFullScreen: PropTypes.bool,
};

export default memo(GenericChart);
