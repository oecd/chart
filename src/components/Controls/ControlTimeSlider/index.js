import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import Component from './Component';
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
  hideTitle = false,
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

  return R.isNil(codeLabelMapping) ? (
    <ControlFallback
      label={label}
      hideTitle={hideTitle}
      isStandalone={isStandalone}
    />
  ) : (
    <Component
      label={finalLabel}
      frequency={frequency}
      isRange={isRange}
      minVarName={minVarName}
      maxVarName={maxVarName}
      vars={vars}
      changeVar={changeVar}
      lang={lang}
      codeLabelMapping={codeLabelMapping}
      hideTitle={hideTitle}
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
  hideTitle: PropTypes.bool,
  isStandalone: PropTypes.bool,
};

export default ControlTimeSlider;
