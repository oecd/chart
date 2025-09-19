/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from 'react';
import { components } from 'react-select';
import * as R from 'ramda';

import StarIcon from '../../Icons/StarIcon';
import CheckIcon from '../../Icons/CheckIcon';
import MagnifyingGlassIcon from '../../Icons/MagnifyingGlassIcon';

export const MultiValueContainer = ({ selectProps, data }) => {
  if (selectProps.inputValue !== '') {
    return '';
  }

  if (data.disabled) {
    return '';
  }

  const { label } = data;
  const lastValue = R.prop(
    'value',
    R.last(R.reject(R.propEq(true, 'disabled'), selectProps.value)),
  );

  return `${label}${lastValue === data.value ? '' : ', '}`;
};

export const DropdownIndicator = (props) => {
  return (
    <components.DropdownIndicator {...props}>
      <div className="cb-control-select-magnifying-glass">
        <MagnifyingGlassIcon />
      </div>
    </components.DropdownIndicator>
  );
};

export const OptionLabelSingle = ({ label, disabled }) => (
  <span
    style={disabled ? { color: '#c2cbd6' } : {}}
    dangerouslySetInnerHTML={{ __html: label }}
  />
);

const OptionLabelMultiple = ({
  value,
  label,
  selectedOptionValues,
  isStandalone,
  disabled,
  children,
}) => (
  <div
    style={{ display: 'flex' }}
    className={
      isStandalone
        ? 'cb-control-select-option-multi-standalone'
        : `cb-control-select-option-multi ${disabled ? 'disabled' : ''}`
    }
  >
    <div className="cb-control-select-option-multi-check">
      {R.includes(value, selectedOptionValues) && (
        <CheckIcon color={disabled ? '#dee3e9' : '#156df9'} />
      )}
    </div>
    <div style={{ flex: 1, marginLeft: '5px' }}>
      <OptionLabelSingle label={label} />
    </div>
    {children}
  </div>
);

export const createOptionLabelMultiple =
  (selectedOptionValues, isStandalone) =>
  ({ value, label, disabled }) => (
    <OptionLabelMultiple
      value={value}
      label={label}
      selectedOptionValues={selectedOptionValues}
      isStandalone={isStandalone}
      disabled={disabled}
    />
  );

export const createOptionLabelMultipleWithStar =
  (selectedOptionValues, starSelectedOptionChanged, starValues, isStandalone) =>
  ({ value, label, disabled }) => (
    <OptionLabelMultiple
      value={value}
      label={label}
      selectedOptionValues={selectedOptionValues}
      isStandalone={isStandalone}
      disabled={disabled}
    >
      <div
        role="button"
        aria-label="select star"
        tabIndex={0}
        className="cb-star-container"
        onClick={(e) => {
          starSelectedOptionChanged(value);
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            starSelectedOptionChanged(value);
            e.stopPropagation();
          }
        }}
      >
        <StarIcon selected={R.includes(value, starValues)} />
      </div>
    </OptionLabelMultiple>
  );
