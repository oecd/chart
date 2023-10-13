/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useMemo,
  useCallback,
  useEffect,
  useState,
  lazy,
  Suspense,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import ControlFallback from './ControlFallback';
import { controlTypes } from '../constants/chart';
import { parseCSV, parseCSVWithoutCleanUp } from '../utils/csvUtil';
import { createCodeLabelMap } from '../utils/generalUtil';
import { isNilOrEmpty, reduceWithIndex } from '../utils/ramdaUtil';
import { possibleVariables } from '../utils/configUtil';

// dynamic import for code splitting
const ControlTimeSlider = lazy(() => import('./Controls/ControlTimeSlider'));
const ControlSelect = lazy(() => import('./Controls/ControlSelect'));

const controlByType = {
  [controlTypes.select.value]: ControlSelect,
  [controlTypes.selectChart.value]: ControlSelect,
  [controlTypes.timeSlider.value]: ControlTimeSlider,
};

const getControlForType = R.prop(R.__, controlByType);

const calcVarsForSelectChartOptionValue = (value) => {
  const [chartId, ...vars] = R.unnest(parseCSVWithoutCleanUp(value));

  return R.compose(
    reduceWithIndex(
      (acc, v, i) => R.assoc(R.nth(i, possibleVariables), v, acc),
      R.__,
      vars,
    ),
    R.assoc('chartId', chartId),
  )({});
};

const StandaloneControlWithConfig = ({
  id = '',
  initialValue = null,
  type,
  codeLabelMapping,
  hideTitle = false,
  ...otherProps
}) => {
  const ControlComponent = getControlForType(type);

  const parsedCodeLabelMapping = useMemo(() => {
    if (isNilOrEmpty(codeLabelMapping)) {
      return {};
    }

    if (type === controlTypes.selectChart.value) {
      const codeLabelWithCodeThatCanContainVars = R.map((item) => {
        if (R.length(item) <= 2) {
          return item;
        }

        return [R.join('|', R.init(item)), R.last(item)];
      }, parseCSVWithoutCleanUp(codeLabelMapping));

      return createCodeLabelMap(codeLabelWithCodeThatCanContainVars);
    }

    return createCodeLabelMap(parseCSV(codeLabelMapping));
  }, [codeLabelMapping, type]);

  const [vars, setVars] = useState(
    R.cond([
      [
        R.equals(controlTypes.select.value),
        R.always({
          [otherProps.varName]:
            initialValue || otherProps.varDefaultValue || '',
        }),
      ],
      [
        R.equals(controlTypes.selectChart.value),
        R.always(
          calcVarsForSelectChartOptionValue(otherProps.varDefaultValue || ''),
        ),
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

  const changeVar = useCallback(
    (varName, varValue) => {
      if (type === controlTypes.selectChart.value) {
        setVars(calcVarsForSelectChartOptionValue(varValue));
        return;
      }

      setVars(R.assoc(varName, varValue));
    },
    [type],
  );

  const isInitialChange = useRef(true);

  useEffect(() => {
    R.forEach(([varName, varValue]) => {
      if (varValue || type !== controlTypes.selectChart.value) {
        document.dispatchEvent(
          new CustomEvent('cbControlValueChange', {
            detail: {
              controlId: id || '',
              varName,
              varValue: varValue === '-' ? '' : varValue,
              isInitialChange: isInitialChange.current,
            },
          }),
        );
      }
    }, R.toPairs(vars));
    isInitialChange.current = false;
  }, [id, vars, type]);

  return (
    <Suspense
      fallback={
        <ControlFallback {...otherProps} hideTitle={hideTitle} isStandalone />
      }
    >
      <ControlComponent
        vars={vars}
        changeVar={changeVar}
        codeLabelMapping={parsedCodeLabelMapping}
        type={type}
        {...R.omit(['codeLabelMapping'], otherProps)}
        hideTitle={hideTitle}
        isStandalone
      />
    </Suspense>
  );
};

StandaloneControlWithConfig.propTypes = {
  id: PropTypes.string,
  hideTitle: PropTypes.bool,
  initialValue: PropTypes.string,
  type: PropTypes.string.isRequired,
  codeLabelMapping: PropTypes.string.isRequired,
};

export default StandaloneControlWithConfig;
