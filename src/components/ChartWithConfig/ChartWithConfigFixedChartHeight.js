/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo } from 'react';
// eslint-disable-next-line import/no-unresolved
import { useResizeDetector } from 'react-resize-detector';
import PropTypes from 'prop-types';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import Controls from '../Controls';
import { calcIsSmall } from '../../utils/chartUtil';
import { minChartWidthForControlsDisplayOnRightSide } from '../../constants/chart';

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
    width: chartWithControlsBelowContainerWidth,
    ref: chartWithControlsBelowContainerRef,
  } = useResizeDetector();
  const {
    width: chartOnlyContainerWidth,
    height: chartOnlyContainerHeight,
    ref: chartOnlyContainerRef,
  } = useResizeDetector();

  const controlsCanFitOnRightSide = useMemo(
    () =>
      fullContainerWidth
        ? fullContainerWidth >= minChartWidthForControlsDisplayOnRightSide
        : false,
    [fullContainerWidth],
  );

  const isSmall = useMemo(
    () => calcIsSmall(fullContainerWidth, fullContainerHeight),
    [fullContainerWidth, fullContainerHeight],
  );

  return (
    <>
      <div
        ref={fullContainerRef}
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: width || '100%',
          height: 'unset',
        }}
      >
        <div
          ref={chartWithControlsBelowContainerRef}
          style={{
            flex: '2',
            position: 'relative',
            height,
            maxWidth: '100%',
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
                  width: chartWithControlsBelowContainerWidth,
                  height: fullContainerHeight,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  ref={chartOnlyContainerRef}
                  style={{ wdth: '100%', height: '100%' }}
                >
                  {chartOnlyContainerHeight && (
                    <HighchartsChart
                      width={chartOnlyContainerWidth}
                      height={chartOnlyContainerHeight}
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
        {controlsCanFitOnRightSide &&
          !isNilOrEmpty(controls) &&
          !hideControls && (
            <div style={{ flex: '1', minWidth: '300px', maxWidth: '430px' }}>
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
                isDisplayedOnRightSide
              />
            </div>
          )}
      </div>
      {fullContainerHeight &&
        !controlsCanFitOnRightSide &&
        !isNilOrEmpty(controls) &&
        !hideControls && (
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
    </>
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
