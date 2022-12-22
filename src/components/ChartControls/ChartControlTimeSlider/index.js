import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import Component from './Component';
import { generatePseudoRandomString } from '../../../utils/generalUtil';

const ChartControlTimeSlider = ({
  label,
  frequencies,
  isRange,
  minVarName,
  maxVarName,
  vars,
  changeVar,
}) => {
  // later multiple frenquencies could be supported, but for now simply take the first one
  const frequency = useMemo(
    () => R.head(frequencies || [{}]) || {},
    [frequencies],
  );

  const [componentKey, setComponentKey] = useState(
    generatePseudoRandomString(),
  );
  const isFirstRenderDone = useRef(false);

  useEffect(() => {
    if (isFirstRenderDone.current) {
      // re-init Component (useful when config is changed in chart-builder)
      setComponentKey(generatePseudoRandomString());
    } else {
      isFirstRenderDone.current = true;
    }
  }, [
    isRange,
    frequency.frequencyTypeCode,
    frequency.minCode,
    frequency.maxCode,
    minVarName,
    maxVarName,
  ]);

  return (
    <Component
      key={componentKey}
      label={label}
      frequency={frequency}
      isRange={isRange}
      minVarName={minVarName}
      maxVarName={maxVarName}
      vars={vars}
      changeVar={changeVar}
    />
  );
};

ChartControlTimeSlider.propTypes = {
  label: PropTypes.string,
  frequencies: PropTypes.array.isRequired,
  isRange: PropTypes.bool.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
};

ChartControlTimeSlider.defaultProps = {
  label: null,
  maxVarName: '',
};

export default ChartControlTimeSlider;
