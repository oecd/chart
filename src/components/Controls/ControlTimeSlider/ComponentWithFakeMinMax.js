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
  const [fakeValue, setFakeValue] = useState([0, 10, 20, 80, 90, 100]);

  return (
    <div className={isStandalone ? 'cb-control-standalone' : 'cb-control'}>
      <div style={{ margin: '0px 7px' }}>
        <Slider
          onChange={([
            dontMind1,
            dontMind2,
            fakeMin,
            fakeMax,
            dontMind3,
            dontMind4,
          ]) => {
            console.log(fakeMin, fakeMax);
            //setFakeValue([0, 10, fakeMin, fakeMax, 90, 100]);
            setFakeValue([0, fakeMin, fakeMin, fakeMax, fakeMax, 100]);
          }}
          onChangeComplete={(stuff) => {
            //console.log(stuff);
          }}
          range={{ draggableTrack: true }}
          min={0}
          max={100}
          value={fakeValue}
          pushable={1}
          allowCross={false}
          trackStyle={[
            { backgroundColor: 'transparent' },
            {
              height: '2px',
              marginTop: '5px',
              backgroundColor: 'green',
              border: '1px solid #DEE5ED',
            },
            { backgroundColor: 'green' },
            {
              height: '2px',
              marginTop: '5px',
              backgroundColor: 'green',
              border: '1px solid #DEE5ED',
            },
            { backgroundColor: 'transparent' },
          ]}
          railStyle={{
            backgroundColor: '#DEE5ED',
            left: '-7px',
            //right: '-7px',
            width: 'calc(100% + 14px)',
          }}
          handleStyle={[
            {
              display: 'none',
            },
            {
              display: 'none',
            },
            {
              opacity: 1,
              border: 'none',
              backgroundColor: '#156DF9',
            },
            {
              opacity: 1,
              border: 'none',
              backgroundColor: '#156DF9',
            },
            {
              display: 'none',
            },
            {
              display: 'none',
            },
          ]}
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
