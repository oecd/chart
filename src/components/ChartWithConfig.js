/* eslint-disable react/jsx-props-no-spreading  */
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';
import PropTypes from 'prop-types';

import HighchartsChart from './HighchartsChart';

const ChartWithConfig = ({ width, height, ...otherProps }) => {
  const {
    width: autoSizerWidth,
    height: autoSizerHeight,
    ref,
  } = useResizeDetector();

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: width || '100%',
        height: '100%',
        maxHeight: height || '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '0px',
          height: '0px',
          overflow: 'visible',
        }}
      >
        {autoSizerWidth && (
          <div
            style={{
              width: autoSizerWidth,
              height: autoSizerHeight,
            }}
          >
            <HighchartsChart
              width={autoSizerWidth}
              height={autoSizerHeight}
              {...otherProps}
            />
          </div>
        )}
      </div>
    </div>
  );
};

ChartWithConfig.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

ChartWithConfig.defaultProps = {
  width: null,
  height: null,
};

export default ChartWithConfig;
