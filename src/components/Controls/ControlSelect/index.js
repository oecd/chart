import React, { useCallback, useMemo, useId } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import * as R from 'ramda';

import getBasicStylingConfigs from '../../../utils/reactSelectUtil';
import { isNilOrEmpty, toggleArrayItem } from '../../../utils/ramdaUtil';
import ControlFallback from '../../ControlFallback';
import {
  controlTypes,
  selectControlSortByOptions,
} from '../../../constants/chart';
import { parseCSVWithoutCleanUp } from '../../../utils/csvUtil';
import { possibleVariables } from '../../../utils/configUtil';
import {
  MultiValueContainer,
  DropdownIndicator,
  OptionLabelSingle,
  createOptionLabelMultiple,
  createOptionLabelMultipleWithStar,
} from './SubComponents';

const noOptionsMessage = () => '';

const ControlSelect = ({
  label = null,
  options,
  placeholder,
  multiple,
  noOptionMeansAllOptions = false,
  displayClearAllOptions = true,
  varName,
  displayStars = false,
  starsVarName = 'n/a',
  vars,
  changeVar,
  codeLabelMapping = null,
  type,
  hideTitle = false,
  isStandalone = false,
  sortBy,
}) => {
  const selectInstanceId = useId();

  const finalOptions = useMemo(
    () =>
      R.compose(
        R.when(
          () => sortBy === selectControlSortByOptions.label.value,
          R.sortBy(R.prop('label')),
        ),
        R.map((o) => {
          const codeThatCanContainVars =
            type === controlTypes.selectChart.value
              ? R.join('|', R.head(parseCSVWithoutCleanUp(R.prop('value', o))))
              : R.prop('value', o);

          const codeLabelMappingThatCanContainVars =
            type === controlTypes.selectChart.value
              ? R.compose(
                  R.fromPairs,
                  R.map(([c, l]) => [
                    R.join('|', R.head(parseCSVWithoutCleanUp(c))),
                    l,
                  ]),
                  R.toPairs,
                )(codeLabelMapping)
              : codeLabelMapping;

          return R.compose(
            R.assoc('value', codeThatCanContainVars),
            R.assoc(
              'label',
              R.propOr(
                codeThatCanContainVars,
                R.toUpper(codeThatCanContainVars),
                codeLabelMappingThatCanContainVars,
              ),
            ),
          )(o);
        }),
      )(R.reject(R.compose(isNilOrEmpty, R.prop('value')), options || [])),
    [options, codeLabelMapping, type, sortBy],
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

  const starValues = useMemo(
    () =>
      !displayStars || isNilOrEmpty(vars[starsVarName])
        ? []
        : R.split('|', vars[starsVarName]),
    [vars, starsVarName, displayStars],
  );

  const selectedOptionChanged = useCallback(
    (value) => {
      if (multiple) {
        if (noOptionMeansAllOptions && R.isEmpty(value)) {
          changeVar(varName, R.join('|', R.map(R.prop('value'), finalOptions)));
        } else {
          const newValues = R.map(R.prop('value'), value);
          changeVar(varName, R.join('|', newValues));

          if (displayStars) {
            const newStarValues = R.compose(
              (starsToBeDeleted) => R.without(starsToBeDeleted, starValues),
              R.difference(starValues),
            )(newValues);

            changeVar(starsVarName, R.join('|', newStarValues));
          }
        }
      } else {
        changeVar(varName, value.value);
      }
    },
    [
      changeVar,
      varName,
      multiple,
      noOptionMeansAllOptions,
      finalOptions,
      starValues,
      displayStars,
      starsVarName,
    ],
  );

  const selectedOption = useMemo(() => {
    if (multiple) {
      const optionsFromVar = R.split('|', vars[varName] ?? '');
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
  }, [vars, varName, finalOptions, multiple, type]);

  const starSelectedOptionChanged = useCallback(
    (value) => {
      if (displayStars) {
        const selectedValues = isNilOrEmpty(vars[varName])
          ? []
          : R.split('|', vars[varName]);
        if (
          !R.includes(value, starValues) &&
          !R.includes(value, selectedValues)
        ) {
          changeVar(varName, R.join('|', R.append(value, selectedValues)));
        }

        changeVar(
          starsVarName,
          R.compose(R.join('|'), toggleArrayItem(value))(starValues),
        );
      }
    },
    [displayStars, starValues, varName, starsVarName, vars, changeVar],
  );

  const formatOptionLabel = useMemo(() => {
    if (!multiple) {
      return OptionLabelSingle;
    }

    const selectedOptionValues = R.map(R.prop('value'), selectedOption);
    if (displayStars) {
      return createOptionLabelMultipleWithStar(
        selectedOptionValues,
        starSelectedOptionChanged,
        starValues,
        isStandalone,
      );
    }
    return createOptionLabelMultiple(selectedOptionValues, isStandalone);
  }, [
    multiple,
    displayStars,
    starSelectedOptionChanged,
    starValues,
    selectedOption,
    isStandalone,
  ]);

  const selectComponents = useMemo(
    () => ({
      MultiValueContainer,
      ...(displayClearAllOptions && !noOptionMeansAllOptions
        ? {}
        : { ClearIndicator: null }),
      ...(!multiple ||
      !displayClearAllOptions ||
      R.isEmpty(selectedOption) ||
      noOptionMeansAllOptions
        ? { IndicatorSeparator: null }
        : {}),
      ...(multiple ? { DropdownIndicator } : {}),
    }),
    [displayClearAllOptions, noOptionMeansAllOptions, multiple, selectedOption],
  );

  const { customSelectTheme, customSelectStyles } = useMemo(
    () => getBasicStylingConfigs(isStandalone),
    [isStandalone],
  );

  return R.isNil(codeLabelMapping) ? (
    <ControlFallback
      label={label}
      hideTitle={hideTitle}
      isStandalone={isStandalone}
    />
  ) : (
    <div className={isStandalone ? 'cb-control-standalone' : 'cb-control'}>
      {!isNilOrEmpty(finalLabel) && !hideTitle && (
        <div className="cb-control-label">{finalLabel}</div>
      )}
      <Select
        instanceId={selectInstanceId}
        value={selectedOption}
        options={finalOptions}
        onChange={selectedOptionChanged}
        formatOptionLabel={formatOptionLabel}
        hideSelectedOptions={false}
        components={selectComponents}
        menuPlacement="auto"
        isMulti={multiple}
        closeMenuOnSelect={!multiple}
        placeholder={finalPlaceholder || ''}
        noOptionsMessage={noOptionsMessage}
        theme={customSelectTheme}
        styles={customSelectStyles}
        aria-label={finalLabel || ''}
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
  varName: PropTypes.string.isRequired,
  displayStars: PropTypes.bool,
  starsVarName: PropTypes.string,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  codeLabelMapping: PropTypes.object,
  type: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool,
  isStandalone: PropTypes.bool,
  sortBy: PropTypes.string,
};

export default ControlSelect;
