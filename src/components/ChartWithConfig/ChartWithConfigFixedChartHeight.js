/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import HighchartsChart from '../HighchartsChart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import Controls from '../Controls';

const ChartWithConfigFixedChartHeight = ({
  width = null,
  height = null,
  vars,
  changeVar,
  controls = [],
  hideControls = false,
  lang = 'default',
  ...otherProps
}) => {
  const {
    width: autoSizerWidth,
    height: autoSizerHeight,
    ref: chartContainerRef,
  } = useResizeDetector();

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
                lang={lang}
                onDataReady={onDataReady}
                {...otherProps}
              />
            </div>
          )}
        </div>
      </div>

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
  );
};

ChartWithConfigFixedChartHeight.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  controls: PropTypes.array,
  hideControls: PropTypes.bool,
  lang: PropTypes.string,
};

export default ChartWithConfigFixedChartHeight;
