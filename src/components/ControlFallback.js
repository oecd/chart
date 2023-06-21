import React from 'react';
import PropTypes from 'prop-types';

import { isNilOrEmpty } from '../utils/ramdaUtil';

const ControlFallback = ({ label = null }) => (
  <div
    style={{
      flex: '1',
      padding: '0px 10px',
      minWidth: '200px',
      minHeight: isNilOrEmpty(label) ? '43px' : '61px',
    }}
  />
);

ControlFallback.propTypes = {
  label: PropTypes.string,
};

export default ControlFallback;
