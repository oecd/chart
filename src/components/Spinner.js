import React from 'react';
import PropTypes from 'prop-types';

const sizeMapping = {
  small: { size: '15px', borderSize: '3px' },
  medium: { size: '25px', borderSize: '4px' },
  large: { size: '50px', borderSize: '5px' },
};

const Spinner = ({ size = 'medium' }) => (
  <div
    style={{
      borderRadius: '50%',
      width: sizeMapping[size].size,
      height: sizeMapping[size].size,
      maxWidth: sizeMapping[size].size,
      maxHeight: sizeMapping[size].size,
      border: `${sizeMapping[size].borderSize} solid rgba(189,189,189,0.25)`,
      borderLeftColor: '#002060',
      borderTopColor: '#002060',
    }}
    className="cb-spinner-animation"
  />
);

Spinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default Spinner;
