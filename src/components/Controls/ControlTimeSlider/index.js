import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import Component from './Component';
import { isNilOrEmpty } from '../../../utils/ramdaUtil';
import ControlFallback from '../../ControlFallback';

const ControlTimeSlider = ({
  id,
  label = null,
  frequencies,
  isRange,
  minVarName,
  maxVarName = '',
  frequencyVarName = '',
  vars,
  changeVar,
  codeLabelMapping = null,
  noData,
  onControlChange = null,
  lang,
  hideTitle = false,
  isStandalone = false,
  disabled = false,
}) => {
  const finalLabel = useMemo(() => {
    if (isNilOrEmpty(label) || R.isNil(codeLabelMapping)) {
      return null;
    }

    return R.propOr(label, R.toUpper(label), codeLabelMapping);
  }, [label, codeLabelMapping]);

  return R.isNil(codeLabelMapping) ? (
    <ControlFallback
      label={label}
      hideTitle={hideTitle}
      isStandalone={isStandalone}
      frequencies={frequencies}
    />
  ) : (
    <Component
      id={id}
      label={finalLabel}
      frequencies={frequencies}
      isRange={isRange}
      minVarName={minVarName}
      maxVarName={maxVarName}
      frequencyVarName={frequencyVarName}
      vars={vars}
      changeVar={changeVar}
      noData={noData}
      onControlChange={onControlChange}
      lang={lang}
      hideTitle={hideTitle}
      isStandalone={isStandalone}
      disabled={disabled}
    />
  );
};

ControlTimeSlider.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  frequencies: PropTypes.array.isRequired,
  isRange: PropTypes.bool.isRequired,
  minVarName: PropTypes.string.isRequired,
  maxVarName: PropTypes.string,
  frequencyVarName: PropTypes.string,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  codeLabelMapping: PropTypes.object,
  noData: PropTypes.bool.isRequired,
  onControlChange: PropTypes.func,
  lang: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool,
  isStandalone: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default ControlTimeSlider;
