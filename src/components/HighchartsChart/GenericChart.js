import React, { forwardRef, memo } from 'react';
import PropTypes from 'prop-types';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/broken-axis';
import 'highcharts/modules/annotations';
import 'highcharts/modules/export-data';
import 'highcharts/modules/exporting';
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
