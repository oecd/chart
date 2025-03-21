/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import { fetchJson } from '../utils/fetchUtil';
import { apiUrl } from '../constants/chart';
import ControlFallback from './ControlFallback';
import StandaloneControlWithConfig from './StandaloneControlWithConfig';
import { possibleVariables } from '../utils/configUtil';

const StandaloneControl = ({
  controlId,
  dataComponentId = '',
  hideTitle = false,
  initialValue = null,
  language = null,
  ...otherProps
}) => {
  const [prevControlId, setPrevControlId] = useState(null);
  const [prevLanguage, setPrevLanguage] = useState(null);
  const [controlConfigData, setControlConfigData] = useState({
    controlConfig: null,
    isLoading: true,
    hasFetchFailed: false,
  });
  const lastRequestedConfig = useRef(null);

  useEffect(() => {
    setPrevControlId(controlId);
  }, [controlId]);

  useEffect(() => {
    setPrevLanguage(language);
  }, [language]);

  const getControlConfig = useCallback(async (id, lang) => {
    try {
      setControlConfigData(
        R.compose(R.assoc('controlConfig', null), R.assoc('isLoading', true)),
      );

      const langParam = lang ? `?lang=${R.toLower(lang)}` : '';
      const configParams = `${id}${langParam}`;

      lastRequestedConfig.current = configParams;
      const config = await fetchJson(
        `${apiUrl}/api/public/control/${configParams}`,
      );

      // discard result from outdated request(s)
      if (configParams === lastRequestedConfig.current) {
        setControlConfigData(
          R.compose(
            R.assoc('hasFetchFailed', false),
            R.assoc('controlConfig', config),
            R.assoc('isLoading', false),
          ),
        );
      }
    } catch {
      setControlConfigData(
        R.compose(R.assoc('hasFetchFailed', true), R.assoc('isLoading', false)),
      );
    }
  }, []);

  useEffect(() => {
    if (!controlId) {
      return;
    }
    if (prevControlId !== controlId || prevLanguage !== language) {
      getControlConfig(controlId, language);
    }
  }, [prevControlId, controlId, prevLanguage, language, getControlConfig]);

  const finalHideTitle = useMemo(
    () => hideTitle === true || hideTitle === 'true' || hideTitle === '',
    [hideTitle],
  );

  if (!controlId) {
    return null;
  }

  if (controlConfigData.isLoading || controlConfigData.hasFetchFailed) {
    return <ControlFallback hideTitle={finalHideTitle} isStandalone />;
  }

  return (
    <StandaloneControlWithConfig
      id={controlId}
      dataComponentId={dataComponentId}
      hideTitle={finalHideTitle}
      initialValue={initialValue}
      {...controlConfigData.controlConfig}
      {...otherProps}
    />
  );
};

StandaloneControl.propTypes = {
  controlId: PropTypes.string.isRequired,
  dataComponentId: PropTypes.string,
  hideTitle: PropTypes.bool,
  initialValue: PropTypes.string,
  language: PropTypes.string,
  ...R.fromPairs(
    R.map((varName) => [varName, PropTypes.string], possibleVariables),
  ),
};

export default StandaloneControl;
