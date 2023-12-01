/* eslint-disable react/jsx-props-no-spreading, react/prop-types, jsx-a11y/control-has-associated-label */
import React from 'react';
import { components } from 'react-select';
import * as R from 'ramda';

export const MultiValueContainer = ({ selectProps, data }) => {
  if (selectProps.inputValue !== '') {
    return '';
  }
  const { label } = data;
  const lastValue = R.prop('value', R.last(selectProps.value));
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

export const OptionLabelSingle = ({ label }) => (
  <span dangerouslySetInnerHTML={{ __html: label }} />
);

const OptionLabelMultiple = ({
  value,
  label,
  selectedOptionValues,
  isStandalone,
  children,
}) => (
  <div
    style={{ display: 'flex' }}
    className={
      isStandalone
        ? 'cb-control-select-option-multi-standalone'
        : 'cb-control-select-option-multi'
    }
  >
    <div className="cb-control-select-option-multi-check">
      {R.includes(value, selectedOptionValues) && <CheckIcon />}
    </div>
    <div style={{ flex: 1, marginLeft: '5px' }}>
      <OptionLabelSingle label={label} />
    </div>
    {children}
  </div>
);

export const createOptionLabelMultiple =
  (selectedOptionValues, isStandalone) =>
  ({ value, label }) => (
    <OptionLabelMultiple
      value={value}
      label={label}
      selectedOptionValues={selectedOptionValues}
      isStandalone={isStandalone}
    />
  );

export const createOptionLabelMultipleWithStar =
  (selectedOptionValues, starSelectedOptionChanged, starValues, isStandalone) =>
  ({ value, label }) => (
    <OptionLabelMultiple
      value={value}
      label={label}
      selectedOptionValues={selectedOptionValues}
      isStandalone={isStandalone}
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
