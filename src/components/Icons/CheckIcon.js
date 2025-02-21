import React from 'react';
import PropTypes from 'prop-types';

const CheckIcon = ({ color = '#156df9' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill={color}
    viewBox="0 0 256 256"
  >
    <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
  </svg>
);

CheckIcon.propTypes = {
  color: PropTypes.string,
};

export default CheckIcon;
