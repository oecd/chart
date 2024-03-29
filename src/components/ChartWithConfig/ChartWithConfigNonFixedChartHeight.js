/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useResizeDetector } from 'react-resize-detector';
import * as R from 'ramda';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import Controls from '../Controls';
import { trackChartView } from '../../utils/trackingUtil';

const minChartHeightForControlsDisplay = 280;

const ChartWithConfigNonFixedChartHeight = ({
  width = null,
  vars,
  changeVar,
  controls = [],
  hideControls = false,
  lang = 'default',
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

  const [codeLabelMapping, setCodeLabelMapping] = useState(null);

  const onDataReady = useMemo(
    () =>
      !isNilOrEmpty(controls) && !hideControls
        ? (data) => {
            setCodeLabelMapping(R.prop('codeLabelMapping', data));
          }
        : null,
    [controls, hideControls],
  );

  useEffect(() => {
    trackChartView(otherProps.id);
  }, [otherProps.id]);

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
              lang={lang}
              onDataReady={onDataReady}
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
          <Controls
            controls={controls}
            vars={vars}
            changeVar={changeVar}
            codeLabelMapping={codeLabelMapping}
            lang={lang}
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
  controls: PropTypes.array,
  hideControls: PropTypes.bool,
  lang: PropTypes.string,
};

export default ChartWithConfigNonFixedChartHeight;
