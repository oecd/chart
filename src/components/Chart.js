/* eslint-disable react/jsx-props-no-spreading  */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import { isNilOrEmpty } from '../utils/ramdaUtil';
import ChartWithConfig from './ChartWithConfig';
import Spinner from './Spinner';
import { possibleVariables } from '../utils/configUtil';
import { fetchJson } from '../utils/fetchUtil';

const apiUrl =
  process.env.NEXT_PUBLIC_CHART_LIB_API_URL ||
  process.env.API_URL ||
  'https://oecdch.art';

const Chart = ({ chartId, ...otherProps }) => {
  const [prevChartId, setPrevChartId] = useState(null);
  const [chartConfigData, setChartConfigData] = useState({
    chartConfig: null,
    isLoading: true,
    hasFetchFailed: false,
  });
  const [prevPropsVars, setPrevPropsVars] = useState(null);
  const lastRequestedConfig = useRef(null);

  useEffect(() => {
    setPrevChartId(chartId);
  }, [chartId]);

  const propsVars = useMemo(
    () =>
      R.reduce(
        (acc, varName) =>
          isNilOrEmpty(R.prop(varName, otherProps))
            ? acc
            : R.assoc(varName, R.prop(varName, otherProps), acc),
        {},
        possibleVariables,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...R.map(R.prop(R.__, otherProps), possibleVariables)],
  );

  useEffect(() => {
    setPrevPropsVars(propsVars);
  }, [propsVars]);

  const getChartConfig = useCallback(async (id, vars) => {
    try {
      setChartConfigData(
        R.compose(R.assoc('chartConfig', null), R.assoc('isLoading', true)),
      );

      const varsParam = R.join('/', R.values(vars));
      const configParams = `${id}${
        R.isEmpty(varsParam) ? '' : `/${varsParam}`
      }`;

      lastRequestedConfig.current = configParams;
      const config = await fetchJson(
        `${apiUrl}/api/public/chartConfig/${configParams}`,
      );

      // discard result from outdated request(s)
      if (configParams === lastRequestedConfig.current) {
        setChartConfigData(
          R.compose(
            R.assoc('hasFetchFailed', false),
            R.assoc('chartConfig', config),
            R.assoc('isLoading', false),
          ),
        );
      }
    } catch {
      setChartConfigData(
        R.compose(R.assoc('hasFetchFailed', true), R.assoc('isLoading', false)),
      );
    }
  }, []);

  useEffect(() => {
    if (!chartId) {
      return;
    }
    if (prevChartId !== chartId) {
      getChartConfig(chartId, propsVars);
    } else if (prevPropsVars !== propsVars) {
      const varNameUsedForCSVFiltering = R.path(
        ['preParsedData', 'varUsedForCSVFiltering'],
        chartConfigData.chartConfig,
      );
      if (varNameUsedForCSVFiltering) {
        const prevPropValue = R.toUpper(
          R.propOr('', varNameUsedForCSVFiltering, prevPropsVars),
        );
        const propValue = R.toUpper(
          R.propOr('', varNameUsedForCSVFiltering, propsVars),
        );
        const currentConfigValue = R.toUpper(
          R.propOr('', varNameUsedForCSVFiltering, chartConfigData.chartConfig),
        );

        if (prevPropValue !== propValue && propValue !== currentConfigValue) {
          getChartConfig(chartId, propsVars);
        }
      }
    }
  }, [
    prevChartId,
    chartId,
    prevPropsVars,
    propsVars,
    getChartConfig,
    chartConfigData.chartConfig,
  ]);

  const finalVars = useMemo(
    () =>
      R.reduce(
        (acc, varName) =>
          R.assoc(
            varName,
            isNilOrEmpty(R.prop(varName, propsVars))
              ? R.prop(varName, chartConfigData.chartConfig)
              : R.replace(/\+/g, '|', R.prop(varName, propsVars)),
            acc,
          ),
        {},
        possibleVariables,
      ),
    [chartConfigData.chartConfig, propsVars],
  );

  if (!chartId) {
    return null;
  }

  if (chartConfigData.isLoading || chartConfigData.hasFetchFailed) {
    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {chartConfigData.isLoading ? <Spinner /> : 'Something went wrong :('}
      </div>
    );
  }

  return (
    <ChartWithConfig
      {...R.omit(possibleVariables, chartConfigData.chartConfig)}
      {...finalVars}
      {...R.omit(possibleVariables, otherProps)}
    />
  );
};

Chart.propTypes = {
  chartId: PropTypes.string.isRequired,
  ...R.fromPairs(
    R.map((varName) => [varName, PropTypes.string], possibleVariables),
  ),
};

Chart.defaultProps = R.fromPairs(
  R.map((varName) => [varName, null], possibleVariables),
);

export default Chart;
