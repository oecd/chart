/* eslint-disable react/display-name */
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
import { numericSymbols } from '../../utils/highchartsUtil';

// !! all Highcharts extensions below are duplicated in MapChart.js and in Chart.builder
// backoffice as "custom code" for exports. any change made here must be reported
// in these 2 other places
if (typeof Highcharts === 'object') {
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
