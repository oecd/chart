/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line import/no-unresolved
import { useResizeDetector } from 'react-resize-detector';
import * as R from 'ramda';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import Controls from '../Controls';
import { calcIsSmall } from '../../utils/chartUtil';

const minChartHeightForControlsDisplay = 280;

const ChartWithConfigNonFixedChartHeight = ({
  width = null,
  vars,
  changeVar,
  controls,
  getControlsWithAvailability,
  codeLabelMappingForControls,
  noDataForControls,
  controlIdForWhichDataLoadingIsPending,
  setControlIdForWhichDataLoadingIsPending,
  onDataReady,
  hideControls = false,
  lang = 'default',
  ...otherProps
}) => {
  const {
    width: fullContainerWidth,
    height: fullContainerHeight,
    ref: fullContainerRef,
  } = useResizeDetector();
  const {
    width: innerContainerWidth,
    height: innerContainerHeight,
    ref: innerContainerRef,
  } = useResizeDetector();

  const { height: controlsAutoSizerHeight, ref: controlsRef } =
    useResizeDetector();

  const finalChartHeight = useMemo(() => {
    if (!fullContainerHeight) {
      return null;
    }
    if (
      fullContainerHeight - controlsAutoSizerHeight >
      minChartHeightForControlsDisplay
    ) {
      return fullContainerHeight - controlsAutoSizerHeight;
    }
    return fullContainerHeight;
  }, [fullContainerHeight, controlsAutoSizerHeight]);

  const isSmall = useMemo(
    () => calcIsSmall(fullContainerWidth, fullContainerHeight),
    [fullContainerWidth, fullContainerHeight],
  );

  return (
    <div
      ref={fullContainerRef}
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
            className={`cb-container ${isSmall ? 'cb-small' : ''}`}
            style={{
              width: fullContainerWidth,
              height: finalChartHeight,
              boxSizing: 'border-box',
            }}
          >
            <div
              ref={innerContainerRef}
              style={{ wdth: '100%', height: '100%' }}
            >
              {innerContainerHeight && (
                <HighchartsChart
                  width={innerContainerWidth}
                  height={innerContainerHeight}
                  vars={vars}
                  lang={lang}
                  onDataReady={onDataReady}
                  isSmall={isSmall}
                  getControlsWithAvailability={getControlsWithAvailability}
                  {...R.omit(['height'], otherProps)}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <div
        ref={controlsRef}
        style={{
          position: 'relative',
          top:
            finalChartHeight && fullContainerHeight !== finalChartHeight
              ? finalChartHeight
              : '-1000px',
          visibility:
            finalChartHeight && fullContainerHeight !== finalChartHeight
              ? 'visible'
              : 'hidden',
        }}
      >
        {!isNilOrEmpty(controls) && !hideControls && (
          <Controls
            controls={controls}
            vars={vars}
            changeVar={changeVar}
            codeLabelMapping={codeLabelMappingForControls}
            noData={noDataForControls}
            controlIdForWhichDataLoadingIsPending={
              controlIdForWhichDataLoadingIsPending
            }
            onControlChange={setControlIdForWhichDataLoadingIsPending}
            lang={lang}
            isSmall={isSmall}
          />
        )}
      </div>
    </div>
  );
};

ChartWithConfigNonFixedChartHeight.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  controls: PropTypes.array.isRequired,
  getControlsWithAvailability: PropTypes.func.isRequired,
  codeLabelMappingForControls: PropTypes.object.isRequired,
  noDataForControls: PropTypes.bool.isRequired,
  controlIdForWhichDataLoadingIsPending: PropTypes.string.isRequired,
  setControlIdForWhichDataLoadingIsPending: PropTypes.func.isRequired,
  onDataReady: PropTypes.func.isRequired,
  hideControls: PropTypes.bool,
  lang: PropTypes.string,
};

export default ChartWithConfigNonFixedChartHeight;
