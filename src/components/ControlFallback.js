import React from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import { isNilOrEmpty } from '../utils/ramdaUtil';
import { controlTypes } from '../constants/chart';

const getMinHeight = (
  type,
  label,
  hideTitle,
  isStandalone,
  hasFrequencyButtons,
) => {
  if (isStandalone) {
    return R.compose(
      (h) => `${h}px`,
      R.when(() => hasFrequencyButtons, R.add(57)),
      R.when(() => !hideTitle && !isNilOrEmpty(label), R.add(18)),
    )(type === controlTypes.timeSlider.value ? 58 : 51);
  }

  return R.compose(
    (h) => `${h}px`,
    R.when(() => hasFrequencyButtons, R.add(47)),
    R.when(() => !isNilOrEmpty(label), R.add(18)),
  )(type === controlTypes.timeSlider.value ? 57 : 43);
};

const ControlFallback = ({
  type = controlTypes.select.value,
  label = null,
  hideTitle = false,
  isStandalone = false,
  frequencies = [],
}) => (
  <div
    style={{
      flex: '1',
      minWidth: '250px',
      minHeight: getMinHeight(
        type,
        label,
        hideTitle,
        isStandalone,
        R.length(frequencies) > 1,
      ),
    }}
  />
);

ControlFallback.propTypes = {
  type: PropTypes.string,
  label: PropTypes.string,
  hideTitle: PropTypes.bool,
  isStandalone: PropTypes.bool,
  frequencies: PropTypes.array,
};

export default ControlFallback;
