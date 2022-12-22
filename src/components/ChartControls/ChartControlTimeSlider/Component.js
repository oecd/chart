import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Slider from 'rc-slider';
import * as R from 'ramda';

import { getSteps } from '../../../utils/dateUtil';
import { isNilOrEmpty } from '../../../utils/ramdaUtil';

const ChartControlTimeSlider = ({
  label,
  frequency,
  isRange,
  minVarName,
  maxVarName,
  vars,
  changeVar,
}) => {
  const steps = useMemo(() => getSteps(frequency || {}), [frequency]);

  const [currentRange, setCurrentRange] = useState({
    minCode: vars[minVarName],
    minIndex: R.findIndex(R.equals(vars[minVarName]), steps) || 0,
    ...(isRange
      ? {
          maxCode: vars[maxVarName],
          maxIndex:
            R.findIndex(R.equals(vars[maxVarName]), steps) || R.length(steps),
        }
      : {}),
  });

  const onRangeChange = useCallback(
    (value) => {
      if (isRange) {
        const [min, max] = value;
        setCurrentRange({
          minCode: R.nth(min, steps),
          minIndex: min,
          maxCode: R.nth(max, steps),
          maxIndex: max,
        });
      } else {
        setCurrentRange({
          minCode: R.nth(value, steps),
          minIndex: value,
        });
      }
    },
    [isRange, steps],
  );

  const onAfterRangeChange = useCallback(
    (value) => {
      if (isRange) {
        const [min, max] = value;
        changeVar(minVarName, R.nth(min, steps));
        changeVar(maxVarName, R.nth(max, steps));
      } else {
        changeVar(minVarName, R.nth(value, steps));
      }
    },
    [isRange, steps, minVarName, maxVarName, changeVar],
  );

  return (
    <div
      className="cb-controls-time-slider"
      style={{ flex: '1', padding: '5px 10px', minWidth: '200px' }}
    >
      {!isNilOrEmpty(label) && <div className="cb-controls-label">{label}</div>}
      <Slider
        onChange={onRangeChange}
        onAfterChange={onAfterRangeChange}
        range={isRange}
        min={0}
        max={R.isEmpty(steps) ? 0 : R.length(steps) - 1}
        value={
          isRange
            ? [currentRange.minIndex, currentRange.maxIndex]
            : currentRange.minIndex
        }
        draggableTrack
        allowCross={false}
        disabled={R.isEmpty(steps)}
        trackStyle={{ backgroundColor: '#b3b3b3' }}
        railStyle={{ backgroundColor: '#d5d5d5' }}
        handleStyle={{
          opacity: 1,
          border: '1px solid #959595',
          backgroundColor: '#bbbbbb',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {R.isEmpty(steps)
          ? '-'
          : `${currentRange.minCode || ''}${
              isRange ? ` - ${currentRange.maxCode || ''}` : ''
            }`}
      </div>
    </div>
  );
};

ChartControlTimeSlider.propTypes = {
  label: PropTypes.string,
  frequency: PropTypes.object.isRequired,
  isRange: PropTypes.bool.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
};

ChartControlTimeSlider.defaultProps = {
  label: null,
};

export default ChartControlTimeSlider;
