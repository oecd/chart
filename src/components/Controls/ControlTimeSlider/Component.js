/* eslint-disable react/jsx-props-no-spreading  */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
  hideTitle,
  isStandalone,
}) => {
  const steps = useMemo(
    () => getSteps(frequency || {}, lang),
    [frequency, lang],
  );

  const [currentRange, setCurrentRange] = useState(() => ({
    minCode: vars[minVarName],
    minIndex:
      R.findIndex(R.equals(vars[minVarName]), steps.codes) === -1
        ? 0
        : R.findIndex(R.equals(vars[minVarName]), steps.codes),
    ...(isRange
      ? {
          maxCode: vars[maxVarName],
          maxIndex:
            R.findIndex(R.equals(vars[maxVarName]), steps.codes) === -1
              ? R.length(steps.codes) - 1
              : R.findIndex(R.equals(vars[maxVarName]), steps.codes),
        }
      : {}),
  }));

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

  useEffect(() => {
    const min =
      R.findIndex(R.equals(vars[minVarName]), steps.codes) === -1
        ? 0
        : R.findIndex(R.equals(vars[minVarName]), steps.codes);
    if (isRange) {
      const max =
        R.findIndex(R.equals(vars[maxVarName]), steps.codes) === -1
          ? R.length(steps.codes) - 1
          : R.findIndex(R.equals(vars[maxVarName]), steps.codes);

      setCurrentRange({
        minCode: R.nth(min, steps.codes),
        minIndex: min,
        maxCode: R.nth(max, steps.codes),
        maxIndex: max,
      });
    } else {
      setCurrentRange({
        minCode: R.nth(min, steps.codes),
        minIndex: min,
      });
    }
  }, [vars, isRange, steps.codes, minVarName, maxVarName]);

  const onChangeComplete = useCallback(
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
    <div className={isStandalone ? 'cb-control-standalone' : 'cb-control'}>
      {!isNilOrEmpty(label) && !hideTitle && (
        <div className="cb-control-label">{label}</div>
      )}
      <Slider
        onChange={onRangeChange}
        onChangeComplete={onChangeComplete}
        range={isRange}
        min={0}
        max={R.isEmpty(steps.codes) ? 0 : R.length(steps.codes) - 1}
        value={
          isRange
            ? [currentRange.minIndex, currentRange.maxIndex]
            : currentRange.minIndex
        }
        {...(isRange ? {} : { startPoint: currentRange.minIndex })}
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
        ariaLabelForHandle={
          isRange
            ? [
                `${label ? `${label} - ` : ''}min`,
                `${label ? `${label} - ` : ''}max`,
              ]
            : label || ''
        }
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
  hideTitle: PropTypes.bool.isRequired,
  isStandalone: PropTypes.bool.isRequired,
};

export default ControlTimeSlider;
