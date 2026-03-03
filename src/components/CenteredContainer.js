import PropTypes from 'prop-types';

const CenteredContainer = ({
  minHeight = 'inherit',
  height = '100%',
  children = null,
}) => (
  <div
    style={{
      minHeight: minHeight || 'inherit',
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
  minHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

export default CenteredContainer;
