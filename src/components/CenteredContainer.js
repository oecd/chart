import React from 'react';
import PropTypes from 'prop-types';

const CenteredContainer = ({ height, children }) => (
  <div
    style={{
      minHeight: 'inherit',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height,
    }}
  >
    {children}
  </div>
);

CenteredContainer.propTypes = {
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

CenteredContainer.defaultProps = {
  height: '100%',
  children: null,
};

export default CenteredContainer;
