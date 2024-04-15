import React from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import { isNilOrEmpty } from '../utils/ramdaUtil';

const getMinHeight = (label, hideTitle, isStandalone, hasFrequencyButtons) => {
  if (isStandalone) {
    return R.compose(
      (h) => `${h}px`,
      R.when(() => hasFrequencyButtons, R.add(33)),
      R.when(() => !hideTitle && !isNilOrEmpty(label), R.add(18)),
    )(51);
  }

  return R.compose(
    (h) => `${h}px`,
    R.when(() => hasFrequencyButtons, R.add(33)),
    R.when(() => !isNilOrEmpty(label), R.add(18)),
  )(43);
};

const ControlFallback = ({
  label = null,
  hideTitle = false,
  isStandalone = false,
  frequencies = [],
}) => (
  <div
    style={{
      flex: '1',
      minWidth: '200px',
      minHeight: getMinHeight(
        label,
        hideTitle,
        isStandalone,
        R.length(frequencies) > 1,
      ),
    }}
  />
);

ControlFallback.propTypes = {
  label: PropTypes.string,
  hideTitle: PropTypes.bool,
  isStandalone: PropTypes.bool,
  frequencies: PropTypes.array,
};

export default ControlFallback;
