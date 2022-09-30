/* eslint-disable react/jsx-props-no-spreading  */
import React from 'react';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import PropTypes from 'prop-types';

import HighchartsChart from './HighchartsChart';

const ChartWithConfig = ({ width, height, ...otherProps }) => (
  <div
    style={{
      width: '100%',
      maxWidth: width || '100%',
      height: '100%',
      maxHeight: height || '100%',
    }}
  >
    <AutoSizer>
      {({ width: autoSizerWidth, height: autoSizerHeight }) => (
        <div
          style={{
            width: autoSizerWidth,
            height: autoSizerHeight,
          }}
        >
          {autoSizerWidth !== 0 && (
            <HighchartsChart
              width={autoSizerWidth}
              height={autoSizerHeight}
              {...otherProps}
            />
          )}
        </div>
      )}
    </AutoSizer>
  </div>
);

ChartWithConfig.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

ChartWithConfig.defaultProps = {
  width: null,
  height: null,
};

export default ChartWithConfig;
