/* eslint-disable react/jsx-props-no-spreading  */
import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import ChartWithConfigFixedChartHeight from './ChartWithConfigFixedChartHeight';
import ChartWithConfigNonFixedChartHeight from './ChartWithConfigNonFixedChartHeight';
import { isNilOrEmpty } from '../../utils/ramdaUtil';

const ChartWithConfig = ({
  height = null,
  var1 = null,
  var2 = null,
  var3 = null,
  var4 = null,
  var5 = null,
  var1DefaultValue = null,
  var2DefaultValue = null,
  var3DefaultValue = null,
  var4DefaultValue = null,
  var5DefaultValue = null,
  ...otherProps
}) => {
  const ChartWithConfigComponent = height
    ? ChartWithConfigFixedChartHeight
    : ChartWithConfigNonFixedChartHeight;

  const [vars, setVars] = useState({
    var1: isNilOrEmpty(var1) ? var1DefaultValue ?? '' : var1,
    var2: isNilOrEmpty(var2) ? var2DefaultValue ?? '' : var2,
    var3: isNilOrEmpty(var3) ? var3DefaultValue ?? '' : var3,
    var4: isNilOrEmpty(var4) ? var4DefaultValue ?? '' : var4,
    var5: isNilOrEmpty(var5) ? var5DefaultValue ?? '' : var5,
  });

  useEffect(() => {
    setVars({
      var1: isNilOrEmpty(var1) ? var1DefaultValue ?? '' : var1,
      var2: isNilOrEmpty(var2) ? var2DefaultValue ?? '' : var2,
      var3: isNilOrEmpty(var3) ? var3DefaultValue ?? '' : var3,
      var4: isNilOrEmpty(var4) ? var4DefaultValue ?? '' : var4,
      var5: isNilOrEmpty(var5) ? var5DefaultValue ?? '' : var5,
    });
  }, [
    var1,
    var2,
    var3,
    var4,
    var5,
    var1DefaultValue,
    var2DefaultValue,
    var3DefaultValue,
    var4DefaultValue,
    var5DefaultValue,
  ]);

  const changeVar = useCallback((varName, varValue) => {
    setVars(R.assoc(varName, varValue));
  }, []);

  return (
    <ChartWithConfigComponent
      height={height}
      vars={vars}
      changeVar={changeVar}
      {...otherProps}
    />
  );
};

ChartWithConfig.propTypes = {
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  var1: PropTypes.string,
  var2: PropTypes.string,
  var3: PropTypes.string,
  var4: PropTypes.string,
  var5: PropTypes.string,
  var1DefaultValue: PropTypes.string,
  var2DefaultValue: PropTypes.string,
  var3DefaultValue: PropTypes.string,
  var4DefaultValue: PropTypes.string,
  var5DefaultValue: PropTypes.string,
};

export default ChartWithConfig;
