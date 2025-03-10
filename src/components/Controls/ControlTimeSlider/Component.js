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

    const newMinCode = R.compose((minCode) => {
      const prevMinDate = dateUtilFrequency.tryParse(minCode)
        ? dateUtilFrequency.getStartPeriod(dateUtilFrequency.tryParse(minCode))
        : false;

      const newMinDate =
        !prevMinDate ||
        newDateUtilFrequency.getStartPeriod(prevMinDate) <
          newDateUtilFrequency.getStartPeriod(
            newDateUtilFrequency.tryParse(newFrequency.minCode),
          )
          ? newDateUtilFrequency.getStartPeriod(
              newDateUtilFrequency.tryParse(newFrequency.minCode),
            )
          : newDateUtilFrequency.getStartPeriod(prevMinDate);

      return newDateUtilFrequency.formatToCode(newMinDate);
    })(vars[minVarName]);

    if (newMinCode !== vars[minVarName]) {
      changeVar(minVarName, newMinCode);
    }

    const newMinIndex =
      R.findIndex(R.equals(newMinCode), newSteps.codes) === -1
        ? 0
        : R.findIndex(R.equals(newMinCode), newSteps.codes);

    if (isRange) {
      const newMaxCode = R.compose((maxCode) => {
        const prevMaxDate = dateUtilFrequency.tryParse(maxCode)
          ? dateUtilFrequency.getEndPeriod(dateUtilFrequency.tryParse(maxCode))
          : false;

        const newMaxDate =
          !prevMaxDate ||
          newDateUtilFrequency.getEndPeriod(prevMaxDate) >
            newDateUtilFrequency.getEndPeriod(
              newDateUtilFrequency.tryParse(newFrequency.maxCode),
            )
            ? newDateUtilFrequency.getEndPeriod(
                newDateUtilFrequency.tryParse(newFrequency.maxCode),
              )
            : newDateUtilFrequency.getEndPeriod(prevMaxDate);

        return newDateUtilFrequency.formatToCode(newMaxDate);
      })(vars[maxVarName]);

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

      const finalMinIndex = R.when(
        () =>
          newSteps.minIndexFromAvailability &&
          newSteps.minIndexFromAvailability > newMinIndex,
        () => newSteps.minIndexFromAvailability,
      )(newMinIndex);
      const finalMaxIndex = R.when(
        () =>
          newSteps.maxIndexFromAvailability &&
          newSteps.maxIndexFromAvailability < newMaxIndex,
        () => newSteps.maxIndexFromAvailability,
      )(newMaxIndex);

      setCurrentRange({
        minCode: R.nth(finalMinIndex, newSteps.codes),
        minIndex: finalMinIndex,
        maxCode: R.nth(finalMaxIndex, newSteps.codes),
        maxIndex: finalMaxIndex,
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
        const finalMin = R.when(
          () =>
            steps.minIndexFromAvailability &&
            steps.minIndexFromAvailability > min,
          () => steps.minIndexFromAvailability,
        )(min);
        const finalMax = R.when(
          () =>
            steps.maxIndexFromAvailability &&
            steps.maxIndexFromAvailability < max,
          () => steps.maxIndexFromAvailability,
        )(max);

        setCurrentRange({
          minCode: R.nth(finalMin, steps.codes),
          minIndex: finalMin,
          maxCode: R.nth(finalMax, steps.codes),
          maxIndex: finalMax,
        });
      } else {
        const finalMin = R.compose(
          R.when(
            () =>
              steps.maxIndexFromAvailability &&
              steps.maxIndexFromAvailability < value,
            () => steps.maxIndexFromAvailability,
          ),
          R.when(
            () =>
              steps.minIndexFromAvailability &&
              steps.minIndexFromAvailability > value,
            () => steps.minIndexFromAvailability,
          ),
        )(value);

        setCurrentRange({
          minCode: R.nth(finalMin, steps.codes),
          minIndex: finalMin,
        });
      }
    },
    [isRange, steps],
  );

  const onRangeChangeComplete = useCallback(
    (value) => {
      if (isRange) {
        const [min, max] = value;

        if (steps.minIndexFromAvailability) {
          const currentMinVarValue = vars[minVarName];
          const currentMinVarIndex = R.findIndex(
            R.equals(currentMinVarValue),
            steps.codes,
          );

          if (
            !(
              currentMinVarIndex <= steps.minIndexFromAvailability &&
              min === steps.minIndexFromAvailability
            )
          ) {
            changeVar(minVarName, R.nth(min, steps.codes));
            if (onControlChange) {
              onControlChange(id);
            }
          }
        } else if (vars[minVarName] !== R.nth(min, steps.codes)) {
          changeVar(minVarName, R.nth(min, steps.codes));
          if (onControlChange) {
            onControlChange(id);
          }
        }

        if (steps.maxIndexFromAvailability) {
          const currentMaxVarValue = vars[maxVarName];
          const currentMaxVarIndex = R.findIndex(
            R.equals(currentMaxVarValue),
            steps.codes,
          );

          if (
            !(
              currentMaxVarIndex >= steps.maxIndexFromAvailability &&
              max === steps.maxIndexFromAvailability
            )
          ) {
            changeVar(maxVarName, R.nth(max, steps.codes));
            if (onControlChange) {
              onControlChange(id);
            }
          }
        } else if (vars[maxVarName] !== R.nth(max, steps.codes)) {
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
                  changeVar(
                    frequencyVarName,
                    dateUtilFrequencies[f.frequencyTypeCode].dotStatId,
                  );
                }}
                className={`cb-frequency-button ${f.frequencyTypeCode === currentFrequency.frequencyTypeCode ? 'cb-frequency-button-selected' : ''}`}
                type="button"
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
