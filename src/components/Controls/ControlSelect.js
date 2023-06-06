import React, { useCallback, useMemo, useId } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';
import Select from 'react-select';
import getBasicStylingConfigs from '../../utils/reactSelectUtil';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import ControlFallback from '../ControlFallback';

const { customSelectTheme, customSelectStyles } = getBasicStylingConfigs();
const noOptionsMessage = () => '';

const ControlSelect = ({
  label,
  options,
  placeholder,
  multiple,
  noOptionMeansAllOptions,
  varName,
  vars,
  changeVar,
  codeLabelMapping,
}) => {
  const selectInstanceId = useId();

  const finalOptions = useMemo(
    () =>
      R.map(
        (o) =>
          R.assoc(
            'label',
            R.propOr(
              R.prop('value', o),
              R.toUpper(R.prop('value', o)),
              codeLabelMapping,
            ),
            o,
          ),
        R.reject(R.compose(isNilOrEmpty, R.prop('value')), options || []),
      ),
    [options, codeLabelMapping],
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
        if (R.length(optionsFromVar) === R.length(finalOptions)) {
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

    return R.has(varName, vars)
      ? R.find(
          R.compose(
            R.equals(R.toUpper(vars[varName])),
            R.toUpper,
            R.prop('value'),
          ),
          finalOptions,
        )
      : null;
  }, [vars, varName, finalOptions, multiple, noOptionMeansAllOptions]);

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
  varName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  codeLabelMapping: PropTypes.object,
};

ControlSelect.defaultProps = {
  label: null,
  noOptionMeansAllOptions: false,
  codeLabelMapping: null,
};

export default ControlSelect;
