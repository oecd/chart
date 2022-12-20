const getBasicStylingConfigs = () => {
  const customSelectTheme = (theme) => ({
    ...theme,
    colors: {
      ...theme.colors,
      primary: '#b3b3b3',
      primary25: '#d5d5d5',
      primary50: '#d5d5d5',
    },
  });

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      boxShadow: 'none',
      fontSize: '14px',
      minHeight: '33px',
    }),
    menu: (provided) => ({
      ...provided,
      marginBottom: 2,
      marginTop: 2,
    }),
    option: (provided) => ({
      ...provided,
      fontSize: '14px',
      padding: '4px 7px',
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: '4px',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: '4px',
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '1px 4px',
    }),
  };

  return { customSelectTheme, customSelectStyles };
};

export default getBasicStylingConfigs;
