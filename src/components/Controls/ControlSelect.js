import React, { useCallback, useMemo, useId } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';
import Select from 'react-select';
import getBasicStylingConfigs from '../../utils/reactSelectUtil';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import ControlFallback from '../ControlFallback';
import { controlTypes } from '../../constants/chart';
import { parseCSVWithoutCleanUp } from '../../utils/csvUtil';
import { possibleVariables } from '../../utils/configUtil';

const { customSelectTheme, customSelectStyles } = getBasicStylingConfigs();
const noOptionsMessage = () => '';

const ControlSelect = ({
  label = null,
  options,
  placeholder,
  multiple,
  noOptionMeansAllOptions = false,
  displayClearAllOptions = true,
  displayOptionsWhenAllOptions = false,
  varName,
  vars,
  changeVar,
  codeLabelMapping = null,
  type,
}) => {
  const selectInstanceId = useId();

  const finalOptions = useMemo(
    () =>
      R.map((o) => {
        const codeThatCanContainVars =
          type === controlTypes.selectChart.value
            ? R.join('|', R.head(parseCSVWithoutCleanUp(R.prop('value', o))))
            : R.prop('value', o);

        return R.compose(
          R.assoc('value', codeThatCanContainVars),
          R.assoc(
            'label',
            R.propOr(
              codeThatCanContainVars,
              R.toUpper(codeThatCanContainVars),
              codeLabelMapping,
            ),
          ),
        )(o);
      }, R.reject(R.compose(isNilOrEmpty, R.prop('value')), options || [])),
    [options, codeLabelMapping, type],
  );

  const finalLabel = useMemo(() => {
    if (isNilOrEmpty(label) || R.isNil(codeLabelMapping)) {
      return null;
    }

    return R.propOr(label, R.toUpper(label), codeLabelMapping);
  }, [label, codeLabelMapping]);

  const finalPlaceholder = useMemo(() => {
    if (isNilOrEmpty(placeholder) || R.isNil(codeLabelMapping)) {
      return null;
    }

    return R.propOr(placeholder, R.toUpper(placeholder), codeLabelMapping);
  }, [placeholder, codeLabelMapping]);

  const selectedOptionChanged = useCallback(
    (value) => {
      if (multiple) {
        if (noOptionMeansAllOptions && R.isEmpty(value)) {
          changeVar(varName, R.join('|', R.map(R.prop('value'), finalOptions)));
        } else {
          changeVar(varName, R.join('|', R.map(R.prop('value'), value)));
        }
      } else {
        changeVar(varName, value.value);
      }
    },
    [changeVar, varName, multiple, noOptionMeansAllOptions, finalOptions],
  );

  const selectedOption = useMemo(() => {
    if (multiple) {
      const optionsFromVar = R.split('|', vars[varName] ?? '');
      if (noOptionMeansAllOptions) {
        if (
          !displayOptionsWhenAllOptions &&
          R.length(optionsFromVar) === R.length(finalOptions)
        ) {
          return [];
        }
      }

      return R.reduce(
        (acc, item) => {
          const option = R.find(
            R.compose(R.equals(R.toUpper(item)), R.toUpper, R.prop('value')),
            finalOptions,
          );

          return option ? R.append(option, acc) : acc;
        },
        [],
        optionsFromVar,
      );
    }

    if (!R.has(varName, vars)) {
      return null;
    }

    const optionValue =
      type === controlTypes.selectChart.value
        ? R.compose(
            R.toUpper,
            R.join('|'),
            R.prepend(vars[varName]),
            R.values,
            R.pick(possibleVariables),
          )(vars)
        : R.toUpper(vars[varName]);

    return R.find(
      R.compose(R.equals(optionValue), R.toUpper, R.prop('value')),
      finalOptions,
    );
  }, [
    vars,
    varName,
    finalOptions,
    multiple,
    noOptionMeansAllOptions,
    displayOptionsWhenAllOptions,
    type,
  ]);

  return R.isNil(codeLabelMapping) ? (
    <ControlFallback label={label} />
  ) : (
    <div
      className="cb-control cb-control-select"
      style={{ flex: '1', padding: '5px 10px', minWidth: '200px' }}
    >
      {!isNilOrEmpty(finalLabel) && (
        <div className="cb-control-label">{finalLabel}</div>
      )}
      <Select
        instanceId={selectInstanceId}
        value={selectedOption}
        options={finalOptions}
        onChange={selectedOptionChanged}
        // eslint-disable-next-line react/no-unstable-nested-components
        formatOptionLabel={(o) => (
          <span dangerouslySetInnerHTML={{ __html: o.label }} />
        )}
        components={displayClearAllOptions ? {} : { ClearIndicator: null }}
        menuPlacement="auto"
        isMulti={multiple}
        closeMenuOnSelect={!multiple}
        placeholder={finalPlaceholder || ''}
        noOptionsMessage={noOptionsMessage}
        theme={customSelectTheme}
        styles={customSelectStyles}
      />
    </div>
  );
};

ControlSelect.propTypes = {
  label: PropTypes.string,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.string.isRequired,
  multiple: PropTypes.bool.isRequired,
  noOptionMeansAllOptions: PropTypes.bool,
  displayClearAllOptions: PropTypes.bool,
  displayOptionsWhenAllOptions: PropTypes.bool,
  varName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  codeLabelMapping: PropTypes.object,
  type: PropTypes.string.isRequired,
};

export default ControlSelect;
