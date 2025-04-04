/* eslint-disable react/jsx-props-no-spreading  */
import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Slider from 'rc-slider';
import * as R from 'ramda';

import {
  getSteps,
  frequencies as dateUtilFrequencies,
} from '../../../utils/dateUtil';
import { isNilOrEmpty } from '../../../utils/ramdaUtil';

const getFrequency = (dotStatId, frequencies) => {
  if (!dotStatId) {
    return R.head(frequencies);
  }

  const dateUtilFrequency = R.compose(
    R.find(R.propEq(R.toUpper(dotStatId), 'dotStatId')),
    R.values,
  )(dateUtilFrequencies);

  const frequency = R.find(
    R.propEq(dateUtilFrequency?.frequencyTypeCode, 'frequencyTypeCode'),
    frequencies,
  );

  return frequency || R.head(frequencies);
};

const calcNewMinCodeForNonRange = (
  prevDateUtilFrequency,
  newDateUtilFrequency,
  minCode,
  newFrequencyMinCode,
  newFrequencyMaxCode,
) => {
  const prevMinDate = prevDateUtilFrequency.tryParse(minCode)
    ? prevDateUtilFrequency.getStartPeriod(
        prevDateUtilFrequency.tryParse(minCode),
      )
    : false;

  const newFrequencyStartPeriod = newDateUtilFrequency.getStartPeriod(
    newDateUtilFrequency.tryParse(newFrequencyMinCode),
  );

  if (!prevMinDate) {
    return newDateUtilFrequency.formatToCode(newFrequencyStartPeriod);
  }

  const newFrequencyEndPeriod = newDateUtilFrequency.getEndPeriod(
    newDateUtilFrequency.tryParse(newFrequencyMaxCode),
  );

  const newMinDate = R.cond([
    [
      () =>
        newDateUtilFrequency.getStartPeriod(prevMinDate) <
        newFrequencyStartPeriod,
      () =>
        newDateUtilFrequency.getStartPeriod(
          newDateUtilFrequency.tryParse(newFrequencyMinCode),
        ),
    ],
    [
      () =>
        newDateUtilFrequency.getEndPeriod(prevMinDate) > newFrequencyEndPeriod,
      () =>
        newDateUtilFrequency.getEndPeriod(
          newDateUtilFrequency.tryParse(newFrequencyMaxCode),
        ),
    ],
    [R.T, () => newDateUtilFrequency.getStartPeriod(prevMinDate)],
  ])();

  return newDateUtilFrequency.formatToCode(newMinDate);
};

const calcNewMinCodeForRange = (
  prevDateUtilFrequency,
  newDateUtilFrequency,
  minCode,
  newFrequencyMinCode,
) => {
  const prevMinDate = prevDateUtilFrequency.tryParse(minCode)
    ? prevDateUtilFrequency.getStartPeriod(
        prevDateUtilFrequency.tryParse(minCode),
      )
    : false;

  const newFrequencyStartPeriod = newDateUtilFrequency.getStartPeriod(
    newDateUtilFrequency.tryParse(newFrequencyMinCode),
  );

  if (!prevMinDate) {
    return newDateUtilFrequency.formatToCode(newFrequencyStartPeriod);
  }

  const newMinDate =
    newDateUtilFrequency.getStartPeriod(prevMinDate) < newFrequencyStartPeriod
      ? newDateUtilFrequency.getStartPeriod(
          newDateUtilFrequency.tryParse(newFrequencyMinCode),
        )
      : newDateUtilFrequency.getStartPeriod(prevMinDate);

  return newDateUtilFrequency.formatToCode(newMinDate);
};

const calcNewMaxCodeForRange = (
  prevDateUtilFrequency,
  newDateUtilFrequency,
  maxCode,
  newFrequencyMaxCode,
) => {
  const prevMaxDate = prevDateUtilFrequency.tryParse(maxCode)
    ? prevDateUtilFrequency.getEndPeriod(
        prevDateUtilFrequency.tryParse(maxCode),
      )
    : false;

  const newFrequencyEndPeriod = newDateUtilFrequency.getEndPeriod(
    newDateUtilFrequency.tryParse(newFrequencyMaxCode),
  );

  if (!prevMaxDate) {
    return newDateUtilFrequency.formatToCode(newFrequencyEndPeriod);
  }

  const newMaxDate =
    newDateUtilFrequency.getEndPeriod(prevMaxDate) > newFrequencyEndPeriod
      ? newDateUtilFrequency.getEndPeriod(
          newDateUtilFrequency.tryParse(newFrequencyMaxCode),
        )
      : newDateUtilFrequency.getEndPeriod(prevMaxDate);

  return newDateUtilFrequency.formatToCode(newMaxDate);
};

const ControlTimeSlider = ({
  id,
  label = null,
  frequencies,
  isRange,
  minVarName,
  maxVarName,
  frequencyVarName,
  vars,
  changeVar,
  noData,
  onControlChange = null,
  lang,
  hideTitle,
  isStandalone,
  disabled,
}) => {
  const [stateFrequencies, setStateFrequencies] = useState(frequencies);
  useEffect(() => {
    setStateFrequencies(frequencies);
  }, [frequencies]);

  const [statePrevFrequencies, setStatePrevFrequencies] =
    useState(stateFrequencies);
  useEffect(() => {
    setStatePrevFrequencies(stateFrequencies);
  }, [stateFrequencies]);

  const [currentFrequency, setCurrentFrequency] = useState(
    getFrequency(vars[frequencyVarName], stateFrequencies),
  );

  const [prevVars, setPrevVars] = useState(vars);
  useEffect(() => {
    setPrevVars(vars);
  }, [vars]);

  const [steps, setSteps] = useState(() => getSteps(currentFrequency, lang));

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

  useEffect(() => {
    const newFrequency = getFrequency(vars[frequencyVarName], stateFrequencies);
    const prevFrequency = getFrequency(
      prevVars[frequencyVarName],
      statePrevFrequencies,
    );
    const newSteps = getSteps(newFrequency, lang);

    const frequencyTypeHasChanged =
      prevFrequency.frequencyTypeCode !== newFrequency.frequencyTypeCode;

    const rangeHasChanged =
      prevVars[minVarName] !== vars[minVarName] ||
      prevVars[maxVarName] !== vars[maxVarName];

    const newDateUtilFrequency =
      dateUtilFrequencies[newFrequency.frequencyTypeCode];
    const prevDateUtilFrequency =
      dateUtilFrequencies[prevFrequency.frequencyTypeCode];

    const dateUtilFrequency =
      frequencyTypeHasChanged && !rangeHasChanged
        ? prevDateUtilFrequency
        : newDateUtilFrequency;

    const newMinCode = isRange
      ? calcNewMinCodeForRange(
          dateUtilFrequency,
          newDateUtilFrequency,
          vars[minVarName],
          newFrequency.minCode,
        )
      : calcNewMinCodeForNonRange(
          dateUtilFrequency,
          newDateUtilFrequency,
          vars[minVarName],
          newFrequency.minCode,
          newFrequency.maxCode,
        );

    if (newMinCode !== vars[minVarName]) {
      changeVar(minVarName, newMinCode);
    }

    const newMinIndex =
      R.findIndex(R.equals(newMinCode), newSteps.codes) === -1
        ? 0
        : R.findIndex(R.equals(newMinCode), newSteps.codes);

    if (isRange) {
      const newMaxCode = calcNewMaxCodeForRange(
        dateUtilFrequency,
        newDateUtilFrequency,
        vars[maxVarName],
        newFrequency.maxCode,
      );

      if (newMaxCode !== vars[maxVarName]) {
        changeVar(maxVarName, newMaxCode);
      }

      const newMaxIndex =
        R.findIndex(R.equals(newMaxCode), newSteps.codes) === -1
          ? 0
          : R.findIndex(R.equals(newMaxCode), newSteps.codes);

      if (noData) {
        setCurrentRange({
          minCode: R.nth(newMinIndex, newSteps.codes),
          minIndex: newMinIndex,
          maxCode: R.nth(newMaxIndex, newSteps.codes),
          maxIndex: newMaxIndex,
        });
        return;
      }

      setCurrentRange({
        minCode: R.nth(newMinIndex, newSteps.codes),
        minIndex: newMinIndex,
        maxCode: R.nth(newMaxIndex, newSteps.codes),
        maxIndex: newMaxIndex,
      });
    } else {
      setCurrentRange({
        minCode: R.nth(newMinIndex, newSteps.codes),
        minIndex: newMinIndex,
      });
    }

    setCurrentFrequency(newFrequency);
    setSteps(newSteps);
  }, [
    changeVar,
    vars,
    prevVars,
    lang,
    isRange,
    frequencyVarName,
    minVarName,
    maxVarName,
    stateFrequencies,
    statePrevFrequencies,
    noData,
  ]);

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
    [isRange, steps],
  );

  const onRangeChangeComplete = useCallback(
    (value) => {
      if (isRange) {
        const [min, max] = value;

        if (vars[minVarName] !== R.nth(min, steps.codes)) {
          changeVar(minVarName, R.nth(min, steps.codes));
          if (onControlChange) {
            onControlChange(id);
          }
        }

        if (vars[maxVarName] !== R.nth(max, steps.codes)) {
          changeVar(maxVarName, R.nth(max, steps.codes));
          if (onControlChange) {
            onControlChange(id);
          }
        }

        return;
      }

      if (vars[minVarName] !== R.nth(value, steps.codes)) {
        changeVar(minVarName, R.nth(value, steps.codes));
        if (onControlChange) {
          onControlChange(id);
        }
      }
    },
    [
      isRange,
      steps,
      minVarName,
      maxVarName,
      vars,
      changeVar,
      onControlChange,
      id,
    ],
  );

  const onChangeFrequency = (dotStatId) => {
    changeVar(frequencyVarName, dotStatId);

    const prevFrequency = getFrequency(
      vars[frequencyVarName],
      stateFrequencies,
    );
    const newFrequency = getFrequency(dotStatId, stateFrequencies);

    const prevDateUtilFrequency =
      dateUtilFrequencies[prevFrequency.frequencyTypeCode];
    const newDateUtilFrequency =
      dateUtilFrequencies[newFrequency.frequencyTypeCode];

    const newMinCode = isRange
      ? calcNewMinCodeForRange(
          prevDateUtilFrequency,
          newDateUtilFrequency,
          vars[minVarName],
          newFrequency.minCode,
        )
      : calcNewMinCodeForNonRange(
          prevDateUtilFrequency,
          newDateUtilFrequency,
          vars[minVarName],
          newFrequency.minCode,
          newFrequency.maxCode,
        );

    changeVar(minVarName, newMinCode);

    if (isRange) {
      const newMaxCode = calcNewMaxCodeForRange(
        prevDateUtilFrequency,
        newDateUtilFrequency,
        vars[maxVarName],
        newFrequency.maxCode,
      );

      changeVar(maxVarName, newMaxCode);
    }

    onControlChange(id);
  };

  const getLabel = (code) => R.propOr('', code, steps.labelByCode);

  return (
    <div className={isStandalone ? 'cb-control-standalone' : 'cb-control'}>
      {!isNilOrEmpty(label) && !hideTitle && (
        <div className="cb-control-label">{label}</div>
      )}

      {R.length(frequencies) > 1 && (
        <div
          style={{
            display: 'flex',
            padding: isStandalone ? '10px 0px 15px 0px' : '5px 0px 15px 0px',
            justifyContent: 'flex-start',
            overflow: 'hidden',
          }}
        >
          {R.map((f) => {
            return (
              <button
                key={f.frequencyTypeCode}
                onClick={() => {
                  onChangeFrequency(
                    dateUtilFrequencies[f.frequencyTypeCode].dotStatId,
                  );
                }}
                className={`cb-frequency-button ${f.frequencyTypeCode === currentFrequency.frequencyTypeCode ? 'cb-frequency-button-selected' : ''} ${R.isEmpty(steps.codes) || disabled ? 'disabled' : ''}`}
                type="button"
                disabled={R.isEmpty(steps.codes) || disabled}
              >
                {dateUtilFrequencies[f.frequencyTypeCode].getLabel(lang)}
              </button>
            );
          }, frequencies)}
        </div>
      )}

      <div style={{ margin: '0px 7px' }}>
        <Slider
          onChange={onRangeChange}
          onChangeComplete={onRangeChangeComplete}
          range={isRange ? { draggableTrack: true } : false}
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
          disabled={R.isEmpty(steps.codes) || disabled}
          trackStyle={{ backgroundColor: '#156DF9' }}
          railStyle={{
            backgroundColor: '#DEE5ED',
            left: '-7px',
            width: 'calc(100% + 14px)',
          }}
          handleStyle={{
            opacity: 1,
            border: 'none',
            backgroundColor: disabled ? '#dee3e9' : '#156DF9',
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
      </div>
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
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  frequencies: PropTypes.array.isRequired,
  isRange: PropTypes.bool.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string.isRequired,
  frequencyVarName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  noData: PropTypes.bool.isRequired,
  onControlChange: PropTypes.func,
  lang: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool.isRequired,
  isStandalone: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default ControlTimeSlider;
