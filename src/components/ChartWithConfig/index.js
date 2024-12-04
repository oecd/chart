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
  var6 = null,
  var7 = null,
  var8 = null,
  var9 = null,
  var10 = null,
  var1DefaultValue = null,
  var2DefaultValue = null,
  var3DefaultValue = null,
  var4DefaultValue = null,
  var5DefaultValue = null,
  var6DefaultValue = null,
  var7DefaultValue = null,
  var8DefaultValue = null,
  var9DefaultValue = null,
  var10DefaultValue = null,
  ...otherProps
}) => {
  const ChartWithConfigComponent = height
    ? ChartWithConfigFixedChartHeight
    : ChartWithConfigNonFixedChartHeight;

  const [vars, setVars] = useState({
    var1: isNilOrEmpty(var1) ? (var1DefaultValue ?? '') : decodeURI(var1),
    var2: isNilOrEmpty(var2) ? (var2DefaultValue ?? '') : decodeURI(var2),
    var3: isNilOrEmpty(var3) ? (var3DefaultValue ?? '') : decodeURI(var3),
    var4: isNilOrEmpty(var4) ? (var4DefaultValue ?? '') : decodeURI(var4),
    var5: isNilOrEmpty(var5) ? (var5DefaultValue ?? '') : decodeURI(var5),
    var6: isNilOrEmpty(var6) ? (var6DefaultValue ?? '') : decodeURI(var6),
    var7: isNilOrEmpty(var7) ? (var7DefaultValue ?? '') : decodeURI(var7),
    var8: isNilOrEmpty(var8) ? (var8DefaultValue ?? '') : decodeURI(var8),
    var9: isNilOrEmpty(var9) ? (var9DefaultValue ?? '') : decodeURI(var9),
    var10: isNilOrEmpty(var10) ? (var10DefaultValue ?? '') : decodeURI(var10),
  });

  useEffect(() => {
    setVars({
      var1: isNilOrEmpty(var1) ? (var1DefaultValue ?? '') : decodeURI(var1),
      var2: isNilOrEmpty(var2) ? (var2DefaultValue ?? '') : decodeURI(var2),
      var3: isNilOrEmpty(var3) ? (var3DefaultValue ?? '') : decodeURI(var3),
      var4: isNilOrEmpty(var4) ? (var4DefaultValue ?? '') : decodeURI(var4),
      var5: isNilOrEmpty(var5) ? (var5DefaultValue ?? '') : decodeURI(var5),
      var6: isNilOrEmpty(var6) ? (var6DefaultValue ?? '') : decodeURI(var6),
      var7: isNilOrEmpty(var7) ? (var7DefaultValue ?? '') : decodeURI(var7),
      var8: isNilOrEmpty(var8) ? (var8DefaultValue ?? '') : decodeURI(var8),
      var9: isNilOrEmpty(var9) ? (var9DefaultValue ?? '') : decodeURI(var9),
      var10: isNilOrEmpty(var10) ? (var10DefaultValue ?? '') : decodeURI(var10),
    });
  }, [
    var1,
    var2,
    var3,
    var4,
    var5,
    var6,
    var7,
    var8,
    var9,
    var10,
    var1DefaultValue,
    var2DefaultValue,
    var3DefaultValue,
    var4DefaultValue,
    var5DefaultValue,
    var6DefaultValue,
    var7DefaultValue,
    var8DefaultValue,
    var9DefaultValue,
    var10DefaultValue,
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
  var6: PropTypes.string,
  var7: PropTypes.string,
  var8: PropTypes.string,
  var9: PropTypes.string,
  var10: PropTypes.string,
  var1DefaultValue: PropTypes.string,
  var2DefaultValue: PropTypes.string,
  var3DefaultValue: PropTypes.string,
  var4DefaultValue: PropTypes.string,
  var5DefaultValue: PropTypes.string,
  var6DefaultValue: PropTypes.string,
  var7DefaultValue: PropTypes.string,
  var8DefaultValue: PropTypes.string,
  var9DefaultValue: PropTypes.string,
  var10DefaultValue: PropTypes.string,
};

export default ChartWithConfig;
