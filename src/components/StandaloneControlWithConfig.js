/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useMemo,
  useCallback,
  useEffect,
  useState,
  lazy,
  Suspense,
} from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import ControlFallback from './ControlFallback';
import { controlTypes } from '../constants/chart';
import { parseCSV } from '../utils/csvUtil';
import { createCodeLabelMap } from '../utils/generalUtil';
import { isNilOrEmpty } from '../utils/ramdaUtil';

// dynamic import for code splitting
const ControlTimeSlider = lazy(() => import('./Controls/ControlTimeSlider'));
const ControlSelect = lazy(() => import('./Controls/ControlSelect'));

const controlByType = {
  [controlTypes.select.value]: ControlSelect,
  [controlTypes.selectChart.value]: ControlSelect,
  [controlTypes.timeSlider.value]: ControlTimeSlider,
};

const getControlForType = R.prop(R.__, controlByType);

const StandaloneControlWithConfig = ({
  id = '',
  type,
  codeLabelMapping,
  ...otherProps
}) => {
  const ControlComponent = getControlForType(type);

  const parsedCodeLabelMapping = useMemo(
    () =>
      isNilOrEmpty(codeLabelMapping)
        ? {}
        : createCodeLabelMap(parseCSV(codeLabelMapping)),
    [codeLabelMapping],
  );

  const [vars, setVars] = useState(
    R.cond([
      [
        R.either(
          R.equals(controlTypes.select.value),
          R.equals(controlTypes.selectChart.value),
        ),
        R.always({ [otherProps.varName]: otherProps.varDefaultValue || '' }),
      ],
      [
        R.equals(controlTypes.timeSlider.value),
        R.always({
          [otherProps.minVarName]: otherProps.minVarDefaultValue || '',
          [otherProps.maxVarName]: otherProps.maxVarDefaultValue || '',
        }),
      ],
      [R.T, R.always({})],
    ])(type),
  );

  const changeVar = useCallback((varName, varValue) => {
    setVars(R.assoc(varName, varValue));
  }, []);

  useEffect(() => {
    R.forEach(([varName, varValue]) => {
      document.dispatchEvent(
        new CustomEvent('cbControlValueChange', {
          detail: { controlId: id || '', varName, varValue },
        }),
      );
    }, R.toPairs(vars));
  }, [id, vars]);

  return (
    <Suspense fallback={<ControlFallback {...otherProps} />}>
      <ControlComponent
        vars={vars}
        changeVar={changeVar}
        codeLabelMapping={parsedCodeLabelMapping}
        {...R.omit(['codeLabelMapping'], otherProps)}
      />
    </Suspense>
  );
};

StandaloneControlWithConfig.propTypes = {
  id: PropTypes.string,
  type: PropTypes.string.isRequired,
  codeLabelMapping: PropTypes.string.isRequired,
};

export default StandaloneControlWithConfig;
