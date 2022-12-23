import React, { useCallback, useMemo, useId } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';
import Select from 'react-select';
import getBasicStylingConfigs from '../../utils/reactSelectUtil';

const { customSelectTheme, customSelectStyles } = getBasicStylingConfigs();
const noOptionsMessage = () => '';

const ChartControlSelect = ({
  label,
  options,
  placeholder,
  multiple,
  varName,
  vars,
  changeVar,
}) => {
  const selectInstanceId = useId();

  const selectedOptionChanged = useCallback(
    (value) => {
      if (multiple) {
        changeVar(varName, R.join('|', R.map(R.prop('value'), value)));
      } else {
        changeVar(varName, value.value);
      }
    },
    [changeVar, varName, multiple],
  );

  const selectedOption = useMemo(() => {
    if (multiple) {
      return R.reduce(
        (acc, item) => {
          const option = R.find(
            R.compose(R.equals(R.toUpper(item)), R.toUpper, R.prop('value')),
            options || [],
          );

          return option ? R.append(option, acc) : acc;
        },
        [],
        R.split('|', vars[varName] ?? ''),
      );
    }

    return R.find(
      R.compose(R.equals(R.toUpper(vars[varName])), R.toUpper, R.prop('value')),
      options || [],
    );
  }, [vars, varName, options, multiple]);

  return (
    <div
      className="cb-controls-select"
      style={{ flex: '1', padding: '5px 10px', minWidth: '200px' }}
    >
      <div className="cb-controls-label">{label}</div>
      <Select
        instanceId={selectInstanceId}
        value={selectedOption}
        options={options || []}
        onChange={selectedOptionChanged}
        // eslint-disable-next-line react/no-unstable-nested-components
        formatOptionLabel={(o) => (
          <span dangerouslySetInnerHTML={{ __html: o.label }} />
        )}
        menuPlacement="auto"
        isMulti={multiple}
        closeMenuOnSelect={!multiple}
        placeholder={placeholder}
        noOptionsMessage={noOptionsMessage}
        theme={customSelectTheme}
        styles={customSelectStyles}
      />
    </div>
  );
};

ChartControlSelect.propTypes = {
  label: PropTypes.string,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.string.isRequired,
  multiple: PropTypes.bool.isRequired,
  varName: PropTypes.string.isRequired,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
};

ChartControlSelect.defaultProps = {
  label: null,
};

export default ChartControlSelect;
