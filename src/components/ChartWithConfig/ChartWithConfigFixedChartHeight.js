/* eslint-disable react/jsx-props-no-spreading  */
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';
import PropTypes from 'prop-types';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import ChartControls from '../ChartControls';

const ChartWithConfigFixedChartHeight = ({
  width,
  height,
  vars,
  changeVar,
  controls,
  hideControls,
  ...otherProps
}) => {
  const {
    width: autoSizerWidth,
    height: autoSizerHeight,
    ref: chartContainerRef,
  } = useResizeDetector();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: width || '100%',
        height: 'unset',
      }}
    >
      <div
        ref={chartContainerRef}
        style={{
          position: 'relative',
          width: '100%',
          height,
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
          {autoSizerHeight && (
            <div
              style={{
                width: autoSizerWidth,
                height: autoSizerHeight,
              }}
            >
              <HighchartsChart
                width={autoSizerWidth}
                height={autoSizerHeight}
                vars={vars}
                {...otherProps}
              />
            </div>
          )}
        </div>
      </div>

      {!isNilOrEmpty(controls) && !hideControls && (
        <ChartControls controls={controls} vars={vars} changeVar={changeVar} />
      )}
    </div>
  );
};

ChartWithConfigFixedChartHeight.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  controls: PropTypes.array,
  hideControls: PropTypes.bool,
};

ChartWithConfigFixedChartHeight.defaultProps = {
  width: null,
  height: null,
  controls: [],
  hideControls: false,
};

export default ChartWithConfigFixedChartHeight;
