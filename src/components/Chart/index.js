/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import LazyLoad from 'react-lazyload';
import * as R from 'ramda';

import Component from './Component';
import { possibleVariables } from '../../utils/configUtil';
import { isCastableToNumber } from '../../utils/chartUtil';
import CenteredContainer from '../CenteredContainer';
import ChartErrorBoundary from '../ChartErrorBoundary';

const Chart = ({
  width = null,
  height = null,
  lazyLoad = true,
  ...otherProps
}) => {
  const finalWidth = useMemo(
    () => (isCastableToNumber(width) ? Number(width) : width),
    [width],
  );

  const finalHeight = useMemo(
    () => (isCastableToNumber(height) ? Number(height) : null),
    [height],
  );

  if (lazyLoad === false || lazyLoad === 'false') {
    return (
      <ChartErrorBoundary
        fallback={
          <CenteredContainer>Something went wrong :(</CenteredContainer>
        }
      >
        <Component width={finalWidth} height={finalHeight} {...otherProps} />
      </ChartErrorBoundary>
    );
  }

  return (
    <ChartErrorBoundary
      fallback={<CenteredContainer>Something went wrong :(</CenteredContainer>}
    >
      <LazyLoad
        style={finalHeight ? { minHeight: finalHeight } : { height: '100%' }}
        once
        offset={100}
        resize
      >
        <Component width={finalWidth} height={finalHeight} {...otherProps} />
      </LazyLoad>
    </ChartErrorBoundary>
  );
};

Chart.propTypes = {
  chartId: PropTypes.string.isRequired,
  ...R.fromPairs(
    R.map((varName) => [varName, PropTypes.string], possibleVariables),
  ),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lazyLoad: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  language: PropTypes.string,
};

export default Chart;
