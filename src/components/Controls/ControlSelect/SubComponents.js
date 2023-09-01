/* eslint-disable react/jsx-props-no-spreading, react/prop-types */
import React from 'react';
import { components } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';
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
      <FontAwesomeIcon icon={faMagnifyingGlass} />
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
    <div>
      <FontAwesomeIcon
        icon={faCheck}
        border
        className="cb-control-select-option-multi-icon"
        style={{
          color: R.includes(value, selectedOptionValues)
            ? '#156DF9'
            : '#E8EDF2',
        }}
      />
    </div>
    <div style={{ flex: 1, marginLeft: '5px' }}>
      <OptionLabelSingle label={label} />
    </div>
    {children}
  </div>
);

export const createOptionLabelMultiple =
  (selectedOptionValues, isStandalone) =>
  ({ value, label }) =>
    (
      <OptionLabelMultiple
        value={value}
        label={label}
        selectedOptionValues={selectedOptionValues}
        isStandalone={isStandalone}
      />
    );

export const createOptionLabelMultipleWithStar =
  (selectedOptionValues, starSelectedOptionChanged, starValues, isStandalone) =>
  ({ value, label }) =>
    (
      <OptionLabelMultiple
        value={value}
        label={label}
        selectedOptionValues={selectedOptionValues}
        isStandalone={isStandalone}
      >
        <div
          role="button"
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
          <span className="fa-layers">
            <FontAwesomeIcon icon={faStar} className="cb-star-border" />
            <FontAwesomeIcon
              icon={faStar}
              transform="shrink-4"
              className={`cb-star${
                R.includes(value, starValues) ? '-selected' : ''
              }`}
            />
          </span>
        </div>
      </OptionLabelMultiple>
    );
