import React from 'react';
import PropTypes from 'prop-types';

import { isNilOrEmpty } from '../utils/ramdaUtil';

const getMinHeight = (label, hideTitle, isStandalone) => {
  if (isStandalone) {
    return isNilOrEmpty(label) || hideTitle ? '51px' : '69px';
  }

  return isNilOrEmpty(label) ? '43px' : '61px';
};

const ControlFallback = ({
  label = null,
  hideTitle = false,
  isStandalone = false,
}) => (
  <div
    style={{
      flex: '1',
      minWidth: '200px',
      minHeight: getMinHeight(label, hideTitle, isStandalone),
    }}
  />
);

ControlFallback.propTypes = {
  label: PropTypes.string,
  hideTitle: PropTypes.bool,
  isStandalone: PropTypes.bool,
};

export default ControlFallback;
