/* eslint-disable react/jsx-props-no-spreading  */
import React, { lazy, useMemo, Suspense } from 'react';
import PropTypes from 'prop-types';
import { useResizeDetector } from 'react-resize-detector';
import * as R from 'ramda';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import ChartControlsFallback from '../ChartControls/ChartControlsFallback';

// dynamic import for code splitting
const ChartControls = lazy(() => import('../ChartControls'));

const minChartHeightForControlsDisplay = 280;

const ChartWithConfigNonFixedChartHeight = ({
  width,
  vars,
  changeVar,
  controls,
  hideControls,
  ...otherProps
}) => {
  const {
    width: chartContainerAutoSizerWidth,
    height: chartContainerAutoSizerHeight,
    ref: chartContainerRef,
  } = useResizeDetector();

  const { height: controlsAutoSizerHeight, ref: controlsRef } =
    useResizeDetector();

  const finalChartHeight = useMemo(() => {
    if (!chartContainerAutoSizerHeight) {
      return null;
    }
    if (
      chartContainerAutoSizerHeight - controlsAutoSizerHeight >
      minChartHeightForControlsDisplay
    ) {
      return chartContainerAutoSizerHeight - controlsAutoSizerHeight;
    }
    return chartContainerAutoSizerHeight;
  }, [chartContainerAutoSizerHeight, controlsAutoSizerHeight]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: width || '100%',
        height: '100%',
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
        {finalChartHeight && (
          <div
            style={{
              width: chartContainerAutoSizerWidth,
              height: finalChartHeight,
            }}
          >
            <HighchartsChart
              width={chartContainerAutoSizerWidth}
              height={finalChartHeight}
              vars={vars}
              {...R.omit(['height'], otherProps)}
            />
          </div>
        )}
      </div>
      <div
        ref={controlsRef}
        style={{
          position: 'relative',
          top:
            finalChartHeight &&
            chartContainerAutoSizerHeight !== finalChartHeight
              ? finalChartHeight
              : '-1000px',
          visibility:
            finalChartHeight &&
            chartContainerAutoSizerHeight !== finalChartHeight
              ? 'visible'
              : 'hidden',
        }}
      >
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
    </div>
  );
};

ChartWithConfigNonFixedChartHeight.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  controls: PropTypes.array,
  hideControls: PropTypes.bool,
};

ChartWithConfigNonFixedChartHeight.defaultProps = {
  width: null,
  controls: [],
  hideControls: false,
};

export default ChartWithConfigNonFixedChartHeight;
