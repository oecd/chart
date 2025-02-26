/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import PropTypes from 'prop-types';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import Controls from '../Controls';
import { calcIsSmall } from '../../utils/chartUtil';

const ChartWithConfigFixedChartHeight = ({
  width = null,
  height = null,
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

  const isSmall = useMemo(
    () => calcIsSmall(fullContainerWidth, fullContainerHeight),
    [fullContainerWidth, fullContainerHeight],
  );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: width || '100%',
        height: 'unset',
      }}
    >
      <div
        ref={fullContainerRef}
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
          {fullContainerHeight && (
            <div
              className={`cb-container ${isSmall ? 'cb-small' : ''}`}
              style={{
                width: fullContainerWidth,
                height: fullContainerHeight,
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
                    {...otherProps}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
  );
};

ChartWithConfigFixedChartHeight.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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

export default ChartWithConfigFixedChartHeight;
