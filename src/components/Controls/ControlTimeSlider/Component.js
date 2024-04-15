/* eslint-disable react/jsx-props-no-spreading  */
import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Slider from 'rc-slider';
import * as R from 'ramda';

import {
  getSteps,
  frequencies as frequencyTypes,
} from '../../../utils/dateUtil';
import { isNilOrEmpty } from '../../../utils/ramdaUtil';

const ControlTimeSlider = ({
  label = null,
  frequencies,
  isRange,
  minVarName,
  maxVarName,
  frequencyVarName,
  defaultFrequency,
  vars,
  changeVar,
  lang,
  codeLabelMapping,
  hideTitle,
  isStandalone,
}) => {
  const [currentFrequencyTypeCode, setCurrentFrequencyTypeCode] =
    useState(defaultFrequency);

  const [prevDefaultFrequencyTypeCode, setPrevDefaultFrequencyTypeCode] =
    useState(defaultFrequency);

  useEffect(() => {
    setPrevDefaultFrequencyTypeCode(defaultFrequency);
  }, [defaultFrequency]);

  const getFrequency = useCallback(
    (code) => R.find(R.propEq(code, 'frequencyTypeCode'), frequencies),
    [frequencies],
  );

  const [steps, setSteps] = useState(() =>
    getSteps(getFrequency(defaultFrequency), lang),
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

  const onFrequencyChange = useCallback(
    (value) => {
      setCurrentFrequencyTypeCode(value);

      const newFrequency = getFrequency(value);
      const newSteps = getSteps(newFrequency, lang);
      setSteps(newSteps);

      changeVar(frequencyVarName, frequencyTypes[value].varValue);

      const currentMinDate = frequencyTypes[currentFrequencyTypeCode].tryParse(
        vars[minVarName],
      );

      if (isRange) {
        const currentMaxDate = frequencyTypes[
          currentFrequencyTypeCode
        ].tryParse(vars[maxVarName]);

        if (currentMinDate && currentMaxDate) {
          const newMinDate =
            frequencyTypes[currentFrequencyTypeCode].getStartPeriod(
              currentMinDate,
            );
          const newMinCode = frequencyTypes[value].formatToCode(newMinDate);
          changeVar(minVarName, newMinCode);

          const newMaxDate =
            frequencyTypes[currentFrequencyTypeCode].getEndPeriod(
              currentMaxDate,
            );
          const newMaxCode = frequencyTypes[value].formatToCode(newMaxDate);
          changeVar(maxVarName, newMaxCode);

          const newMinStepIndex = R.findIndex(
            R.equals(newMinCode),
            newSteps.codes,
          );
          const newMaxStepIndex = R.findIndex(
            R.equals(newMaxCode),
            newSteps.codes,
          );
          setCurrentRange({
            minCode: R.nth(newMinStepIndex, newSteps.codes),
            minIndex: newMinStepIndex,
            maxCode: R.nth(newMaxStepIndex, newSteps.codes),
            maxIndex: newMaxStepIndex,
          });
        }
      } else if (currentMinDate) {
        const newMinDate =
          frequencyTypes[currentFrequencyTypeCode].getStartPeriod(
            currentMinDate,
          );
        const newMinCode = frequencyTypes[value].formatToCode(newMinDate);
        changeVar(minVarName, newMinCode);
        const newMinStepIndex = R.findIndex(
          R.equals(newMinCode),
          newSteps.codes,
        );
        setCurrentRange({
          minCode: R.nth(newMinStepIndex, newSteps.codes),
          minIndex: newMinStepIndex,
        });
      }
    },
    [
      isRange,
      changeVar,
      frequencyVarName,
      currentFrequencyTypeCode,
      minVarName,
      maxVarName,
      vars,
      lang,
      getFrequency,
    ],
  );

  useEffect(() => {
    if (prevDefaultFrequencyTypeCode !== defaultFrequency) {
      onFrequencyChange(defaultFrequency);
    }
  }, [prevDefaultFrequencyTypeCode, defaultFrequency, onFrequencyChange]);

  const getLabel = (code) =>
    R.propOr(R.propOr('', code, steps.labelByCode), code, codeLabelMapping);

  return (
    <div className={isStandalone ? 'cb-control-standalone' : 'cb-control'}>
      {!isNilOrEmpty(label) && !hideTitle && (
        <div className="cb-control-label">{label}</div>
      )}

      <div style={{ margin: '0px 7px' }}>
        <Slider
          onChange={onRangeChange}
          onChangeComplete={onRangeChangeComplete}
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
      {R.length(frequencies) > 1 && (
        <div
          style={{
            display: 'flex',
            marginTop: '5px',
            justifyContent: 'center',
          }}
        >
          {R.map((f) => {
            return (
              <button
                key={f.frequencyTypeCode}
                onClick={() => onFrequencyChange(f.frequencyTypeCode)}
                className={`cb-frequency-button ${f.frequencyTypeCode === currentFrequencyTypeCode ? 'cb-frequency-button-selected' : ''}`}
                type="button"
              >
                {frequencyTypes[f.frequencyTypeCode].getLabel(lang)}
              </button>
            );
          }, frequencies)}
        </div>
      )}
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
  defaultFrequency: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  codeLabelMapping: PropTypes.object.isRequired,
  hideTitle: PropTypes.bool.isRequired,
  isStandalone: PropTypes.bool.isRequired,
};

export default ControlTimeSlider;
