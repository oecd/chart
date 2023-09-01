import React from 'react';
import PropTypes from 'prop-types';

import { isNilOrEmpty } from '../utils/ramdaUtil';

const getMinHeight = (label, isStandalone) => {
  if (isStandalone) {
    return isNilOrEmpty(label) ? '61px' : '79px';
  }

  return isNilOrEmpty(label) ? '43px' : '61px';
};

const ControlFallback = ({ label = null, isStandalone = false }) => (
  <div
    style={{
      flex: '1',
      minWidth: '200px',
      minHeight: getMinHeight(label, isStandalone),
    }}
  />
);

ControlFallback.propTypes = {
  label: PropTypes.string,
  isStandalone: PropTypes.bool,
};

export default ControlFallback;
