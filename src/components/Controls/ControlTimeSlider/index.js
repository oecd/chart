import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import Component from './Component';
import { generatePseudoRandomString } from '../../../utils/generalUtil';
import { isNilOrEmpty } from '../../../utils/ramdaUtil';
import ControlFallback from '../../ControlFallback';

const ControlTimeSlider = ({
  label = null,
  frequencies,
  isRange,
  minVarName,
  maxVarName = '',
  vars,
  changeVar,
  codeLabelMapping = null,
  lang,
  isStandalone = false,
}) => {
  const finalLabel = useMemo(() => {
    if (isNilOrEmpty(label) || R.isNil(codeLabelMapping)) {
      return null;
    }

    return R.propOr(label, R.toUpper(label), codeLabelMapping);
  }, [label, codeLabelMapping]);

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

  return R.isNil(codeLabelMapping) ? (
    <ControlFallback label={label} isStandalone={isStandalone} />
  ) : (
    <Component
      key={componentKey}
      label={finalLabel}
      frequency={frequency}
      isRange={isRange}
      minVarName={minVarName}
      maxVarName={maxVarName}
      vars={vars}
      changeVar={changeVar}
      lang={lang}
      codeLabelMapping={codeLabelMapping}
      isStandalone={isStandalone}
    />
  );
};

ControlTimeSlider.propTypes = {
  label: PropTypes.string,
  frequencies: PropTypes.array.isRequired,
  isRange: PropTypes.bool.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  codeLabelMapping: PropTypes.object,
  lang: PropTypes.string.isRequired,
  isStandalone: PropTypes.bool,
};

export default ControlTimeSlider;
