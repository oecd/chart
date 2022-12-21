import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Slider from 'rc-slider';
import * as R from 'ramda';

import { getSteps } from '../../../utils/dateUtil';
import { isNilOrEmpty } from '../../../utils/ramdaUtil';

const ChartControlTimeSlider = ({
  label,
  frequency,
  minVarName,
  maxVarName,
  vars,
  changeVar,
}) => {
  const steps = useMemo(() => getSteps(frequency || {}), [frequency]);

  const [currentRange, setCurrentRange] = useState({
    minCode: vars[minVarName],
    minIndex: R.findIndex(R.equals(vars[minVarName]), steps) || 0,
    maxCode: vars[maxVarName],
    maxIndex: R.findIndex(R.equals(vars[maxVarName]), steps) || R.length(steps),
  });

  const onRangeChange = useCallback(
    ([min, max]) => {
      setCurrentRange({
        minCode: R.nth(min, steps),
        minIndex: min,
        maxCode: R.nth(max, steps),
        maxIndex: max,
      });
    },
    [steps],
  );

  const onAfterRangeChange = useCallback(
    ([min, max]) => {
      changeVar(minVarName, R.nth(min, steps));
      changeVar(maxVarName, R.nth(max, steps));
    },
    [steps, minVarName, maxVarName, changeVar],
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
        range
        min={0}
        max={R.isEmpty(steps) ? 0 : R.length(steps) - 1}
        value={[currentRange.minIndex, currentRange.maxIndex]}
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
          : `${currentRange.minCode || ''} - ${currentRange.maxCode || ''}`}
      </div>
    </div>
  );
};

ChartControlTimeSlider.propTypes = {
  label: PropTypes.string,
  frequency: PropTypes.object.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
};

ChartControlTimeSlider.defaultProps = {
  label: null,
};

export default ChartControlTimeSlider;
