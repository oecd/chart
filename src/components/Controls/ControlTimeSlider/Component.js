import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Slider from 'rc-slider';
import * as R from 'ramda';

import { getSteps } from '../../../utils/dateUtil';
import { isNilOrEmpty } from '../../../utils/ramdaUtil';

const ControlTimeSlider = ({
  label = null,
  frequency,
  isRange,
  minVarName,
  maxVarName,
  vars,
  changeVar,
  lang,
  codeLabelMapping,
}) => {
  const steps = useMemo(
    () => getSteps(frequency || {}, lang),
    [frequency, lang],
  );

  const [currentRange, setCurrentRange] = useState({
    minCode: vars[minVarName],
    minIndex: R.findIndex(R.equals(vars[minVarName]), steps.codes) || 0,
    ...(isRange
      ? {
          maxCode: vars[maxVarName],
          maxIndex:
            R.findIndex(R.equals(vars[maxVarName]), steps.codes) ||
            R.length(steps.codes),
        }
      : {}),
  });

  const onRangeChange = useCallback(
    (value) => {
      if (isRange) {
        const [min, max] = value;
        setCurrentRange({
          minCode: R.nth(min, steps.codes),
          minIndex: min,
          maxCode: R.nth(max, steps.codes),
          maxIndex: max,
        });
      } else {
        setCurrentRange({
          minCode: R.nth(value, steps.codes),
          minIndex: value,
        });
      }
    },
    [isRange, steps.codes],
  );

  const onAfterRangeChange = useCallback(
    (value) => {
      if (isRange) {
        const [min, max] = value;
        changeVar(minVarName, R.nth(min, steps.codes));
        changeVar(maxVarName, R.nth(max, steps.codes));
      } else {
        changeVar(minVarName, R.nth(value, steps.codes));
      }
    },
    [isRange, steps.codes, minVarName, maxVarName, changeVar],
  );

  const getLabel = (code) =>
    R.propOr(R.propOr('', code, steps.labelByCode), code, codeLabelMapping);

  return (
    <div
      className="cb-control cb-control-time-slider"
      style={{ flex: '1', padding: '5px 10px', minWidth: '200px' }}
    >
      {!isNilOrEmpty(label) && <div className="cb-control-label">{label}</div>}
      <Slider
        onChange={onRangeChange}
        onAfterChange={onAfterRangeChange}
        range={isRange}
        min={0}
        max={R.isEmpty(steps.codes) ? 0 : R.length(steps.codes) - 1}
        value={
          isRange
            ? [currentRange.minIndex, currentRange.maxIndex]
            : currentRange.minIndex
        }
        draggableTrack
        pushable={1}
        allowCross={false}
        disabled={R.isEmpty(steps.codes)}
        trackStyle={{ backgroundColor: '#156DF9' }}
        railStyle={{ backgroundColor: '#DEE5ED' }}
        handleStyle={{
          opacity: 1,
          border: '1px solid #156DF9',
          backgroundColor: '#156DF9',
        }}
      />
      <div
        className="cb-control-label"
        style={{
          marginTop: '5px',
          marginBottom: '0px',
          justifyContent: 'space-between',
        }}
      >
        {!R.isEmpty(steps.codes) && (
          <>
            <div>{getLabel(currentRange.minCode)}</div>
            {isRange && <div>{getLabel(currentRange.maxCode)}</div>}
          </>
        )}
      </div>
    </div>
  );
};

ControlTimeSlider.propTypes = {
  label: PropTypes.string,
  frequency: PropTypes.object.isRequired,
  isRange: PropTypes.bool.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  codeLabelMapping: PropTypes.object.isRequired,
};

export default ControlTimeSlider;
