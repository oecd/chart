import React from 'react';
import PropTypes from 'prop-types';

export default class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    const {
      state,
      props: { fallback, children },
    } = this;
    if (state.hasError) {
      return fallback;
    }

    return children;
  }
}

ChartErrorBoundary.propTypes = {
  fallback: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};
