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
  label = null,
  frequencies,
  isRange,
  minVarName,
  maxVarName,
  frequencyVarName,
  vars,
  changeVar,
  lang,
  hideTitle,
  isStandalone,
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
    [isRange, steps.codes],
  );

  const onRangeChangeComplete = useCallback(
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
          disabled={R.isEmpty(steps.codes)}
          trackStyle={{ backgroundColor: '#156DF9' }}
          railStyle={{
            backgroundColor: '#DEE5ED',
            left: '-7px',
            width: 'calc(100% + 14px)',
          }}
          handleStyle={{
            opacity: 1,
            border: 'none',
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
  label: PropTypes.string,
  frequencies: PropTypes.array.isRequired,
  isRange: PropTypes.bool.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string.isRequired,
  frequencyVarName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool.isRequired,
  isStandalone: PropTypes.bool.isRequired,
};

export default ControlTimeSlider;
