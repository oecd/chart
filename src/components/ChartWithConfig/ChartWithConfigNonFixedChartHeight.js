import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useResizeDetector } from 'react-resize-detector';
import * as R from 'ramda';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import Controls from '../Controls';
import { calcChartSize } from '../../utils/stylingUtil';
import {
  chartSizes,
  minChartHeightForControlsDisplayBelow,
  minChartWidthForControlsDisplayOnRightSide,
} from '../../constants/chart';
import ChartSizeContext from '../../contexts/ChartSizeContext';
import { fontColors, fontFamilies } from '../../constants/styling';
import useIsFontLoaded from '../../hook/useIsFontLoaded';

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
    width: chartWithControlsBelowContainerWidth,
    height: chartWithControlsBelowContainerHeight,
    ref: chartWithControlsBelowContainerRef,
  } = useResizeDetector();
  const {
    width: chartOnlyContainerWidth,
    height: chartOnlyContainerHeight,
    ref: chartOnlyContainerRef,
  } = useResizeDetector();

  const { height: controlsAutoSizerHeight, ref: controlsRef } =
    useResizeDetector();

  const controlsCanFitOnRightSide = useMemo(
    () =>
      fullContainerWidth
        ? fullContainerWidth >= minChartWidthForControlsDisplayOnRightSide
        : false,
    [fullContainerWidth],
  );

  const finalChartHeight = useMemo(() => {
    if (!chartWithControlsBelowContainerHeight) {
      return null;
    }
    if (
      !controlsCanFitOnRightSide &&
      chartWithControlsBelowContainerHeight - controlsAutoSizerHeight >
        minChartHeightForControlsDisplayBelow
    ) {
      return chartWithControlsBelowContainerHeight - controlsAutoSizerHeight;
    }
    return chartWithControlsBelowContainerHeight;
  }, [
    chartWithControlsBelowContainerHeight,
    controlsAutoSizerHeight,
    controlsCanFitOnRightSide,
  ]);

  const chartSize = useMemo(
    () => calcChartSize(fullContainerWidth, fullContainerHeight),
    [fullContainerWidth, fullContainerHeight],
  );
  const isLarge = useMemo(() => chartSize === chartSizes.large, [chartSize]);

  const isFontLoaded = useIsFontLoaded();

  return (
    <ChartSizeContext.Provider value={chartSize}>
      <div
        ref={fullContainerRef}
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: width || '100%',
          height: '100%',
        }}
      >
        <div
          ref={chartWithControlsBelowContainerRef}
          style={{
            flex: '2',
            position: 'relative',
            height: '100%',
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
            {finalChartHeight && (
              <div
                className={`cb-container ${!isLarge ? 'cb-small' : ''} ${isFontLoaded ? 'cb-font-loaded' : ''}`}
                style={{
                  fontFamily: fontFamilies.normal,
                  color: fontColors.normal,
                  width: chartWithControlsBelowContainerWidth,
                  height: finalChartHeight,
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
                      getControlsWithAvailability={getControlsWithAvailability}
                      {...R.omit(['height'], otherProps)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          {!controlsCanFitOnRightSide && (
            <div
              ref={controlsRef}
              style={{
                position: 'relative',
                top:
                  finalChartHeight &&
                  chartWithControlsBelowContainerHeight !== finalChartHeight
                    ? finalChartHeight
                    : '-1000px',
                visibility:
                  finalChartHeight &&
                  chartWithControlsBelowContainerHeight !== finalChartHeight
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
                />
              )}
            </div>
          )}
        </div>
        {controlsCanFitOnRightSide &&
          !isNilOrEmpty(controls) &&
          !hideControls && (
            <div
              style={{
                flex: '1',
                minWidth: '300px',
                maxWidth: '430px',
              }}
            >
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
                isDisplayedOnRightSide
              />
            </div>
          )}
      </div>
    </ChartSizeContext.Provider>
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
