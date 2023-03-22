/* eslint-disable react/jsx-props-no-spreading  */
import React, { lazy, Suspense } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import PropTypes from 'prop-types';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import ChartControlsFallback from '../ChartControls/ChartControlsFallback';

// dynamic import for code splitting
const ChartControls = lazy(() => import('../ChartControls'));

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
        <Suspense fallback={<ChartControlsFallback controls={controls} />}>
          <ChartControls
            controls={controls}
            vars={vars}
            changeVar={changeVar}
          />
        </Suspense>
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
