const getOptionPadding = (isMulti, isStandalone) => {
  if (isMulti) {
    return '0px';
  }

  return isStandalone ? '8px 17px' : '4px 7px';
};

const getBasicStylingConfigs = (isStandalone) => {
  const customSelectTheme = (theme) => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral80: '#101D40',
      primary: '#E0F2FF',
      primary50: '#E0F2FF',
    },
  });

  const getOptionBackgroundColor = (state) => {
    if (!state.isMulti && state.isSelected) {
      return '#156DF9';
    }
    if (state.isFocused) {
      return '#E0F2FF';
    }
    return '#E8EDF2';
  };

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      padding: isStandalone ? '10px' : '0px',
      backgroundColor: '#E8EDF2',
      boxShadow: 'none',
      fontSize: '14px',
      minHeight: '33px',
      borderColor: state.isFocused ? '#156DF9' : '#E8EDF2',
      '&:hover': {
        borderColor: '#156DF9',
      },
      '.cb-control-select-magnifying-glass svg': {
        fill: state.isFocused ? 'hsl(0, 0%, 40%)' : 'hsl(0, 0%, 80%)',
        transition: 'fill 150ms',
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#E8EDF2',
      marginBottom: 1,
      marginTop: 1,
      boxShadow: 'none',
      borderRadius: '4px',
      zIndex: 2,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: getOptionBackgroundColor(state),
      color: !state.isMulti && state.isSelected ? '#ffffff' : '#101D40',
      fontSize: '14px',
      padding: getOptionPadding(state.isMulti, isStandalone),
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: '4px',
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      padding: state.isMulti ? '7px 8px 8px 8px' : '4px 8px 4px 8px',
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      position: 'relative',
      padding: state.isMulti && state.hasValue ? '1px 6px' : '1px 4px',
      textOverflow: 'ellipsis',
      maxWidth: '90%',
      minHeight: '23px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      display: `${state.hasValue && state.isMulti ? 'initial' : 'grid'}`,
    }),
    input: (provided, state) =>
      state.isMulti
        ? {
            ...provided,
            position: 'absolute',
            paddingTop: '0px',
            paddingLeft: state.hasValue ? '4px' : '0px',
            left: '0px',
            top: '0px',
          }
        : { ...provided, paddingTop: '0px' },
  };

  return { customSelectTheme, customSelectStyles };
};

export default getBasicStylingConfigs;
