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

import ChartWithConfig from '../ChartWithConfig';
import Spinner from '../Spinner';
import { possibleVariables } from '../../utils/configUtil';
import { fetchJson } from '../../utils/fetchUtil';
import CenteredContainer from '../CenteredContainer';
import { apiUrl } from '../../constants/chart';
import { isNilOrEmpty } from '../../utils/ramdaUtil';

const Chart = ({ chartId, language, ...otherProps }) => {
  const [prevChartId, setPrevChartId] = useState(null);
  const [prevLanguage, setPrevLanguage] = useState(null);
  const [chartConfigData, setChartConfigData] = useState({
    chartConfig: null,
    isLoading: true,
    hasFetchFailed: false,
  });
  const lastRequestedConfig = useRef(null);

  useEffect(() => {
    setPrevChartId(chartId);
  }, [chartId]);

  useEffect(() => {
    setPrevLanguage(language);
  }, [language]);

  const propsVars = useMemo(
    () =>
      R.reduce(
        (acc, varName) =>
          R.isNil(R.prop(varName, otherProps))
            ? acc
            : R.assoc(varName, R.prop(varName, otherProps), acc),
        {},
        possibleVariables,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...R.map(R.prop(R.__, otherProps), possibleVariables)],
  );

  const getChartConfig = useCallback(async (id, lang, vars) => {
    try {
      setChartConfigData(
        R.compose(R.assoc('chartConfig', null), R.assoc('isLoading', true)),
      );

      const varsParam = R.compose(
        R.join('/'),
        R.dropLastWhile((value) => value === '-'),
        R.map((varName) =>
          isNilOrEmpty(R.prop(varName, vars)) ? '-' : R.prop(varName, vars),
        ),
      )(possibleVariables);

      const langParam = lang ? `?lang=${R.toLower(lang)}` : '';
      const configParams = `${id}${
        R.isEmpty(varsParam) ? '' : `/${varsParam}`
      }${langParam}`;

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
    if (prevChartId !== chartId || prevLanguage !== language) {
      getChartConfig(chartId, language, propsVars);
    }
  }, [
    prevChartId,
    chartId,
    prevLanguage,
    language,
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
            R.isNil(R.prop(varName, propsVars))
              ? R.propOr(null, varName, chartConfigData.chartConfig)
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
      <CenteredContainer>
        {chartConfigData.isLoading ? (
          <Spinner />
        ) : (
          <div className="cb-container">Something went wrong :(</div>
        )}
      </CenteredContainer>
    );
  }

  return (
    <ChartWithConfig
      {...R.omit(possibleVariables, chartConfigData.chartConfig)}
      {...finalVars}
      {...R.omit([...possibleVariables], otherProps)}
    />
  );
};

Chart.propTypes = {
  chartId: PropTypes.string.isRequired,
  ...R.fromPairs(
    R.map((varName) => [varName, PropTypes.string], possibleVariables),
  ),
};

export default Chart;
