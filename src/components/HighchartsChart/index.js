/* eslint-disable react/jsx-props-no-spreading, react/no-this-in-sfc  */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  memo,
  lazy,
  Suspense,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons/faExpandArrowsAlt';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons/faInfoCircle';
import { FloatingPortal } from '@floating-ui/react';
import striptags from 'striptags';
import * as R from 'ramda';

import {
  apiUrl,
  chartTypes,
  dataSourceTypes,
  decimalPointTypes,
  sortByOptions,
  sortOrderOptions,
} from '../../constants/chart';
import Radar from './Radar';
import Line from './Line';
import Bar from './Bar';
import Stacked from './Stacked';
import Scatter from './Scatter';
import Pie from './Pie';
import NullComponent from '../NullComponent';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import {
  createDataFromSdmxJson,
  createDotStatUrl,
  fetchDotStatData,
  isSdmxJsonEmpty,
} from '../../utils/sdmxJsonUtil';
import { emptyData, createDataFromCSV } from '../../utils/csvUtil';
import Spinner from '../Spinner';
import {
  replaceVarsNameByVarsValueUsingCodeLabelMapping,
  replaceVarsNameByVarsValue,
  doesStringContainVar,
} from '../../utils/chartUtil';
import { createFormatters } from '../../utils/highchartsUtil';
import useTooltipState from '../../hooks/useTooltipState';
import CenteredContainer from '../CenteredContainer';
import { fetchJson } from '../../utils/fetchUtil';
import ExportButton from './ExportButton';

// dynamic import for code splitting
const MapChart = lazy(() => import('./MapChart'));

const minChartHeightForFooterDisplay = 280;

const chartByType = {
  [chartTypes.line]: { component: Line, props: {} },
  [chartTypes.bar]: { component: Bar, props: {} },
  [chartTypes.row]: { component: Bar, props: { horizontal: true } },
  [chartTypes.stackedBar]: { component: Stacked, props: {} },
  [chartTypes.stackedRow]: { component: Stacked, props: { horizontal: true } },
  [chartTypes.stackedArea]: { component: Stacked, props: { area: true } },
  [chartTypes.map]: { component: MapChart, props: {} },
  [chartTypes.symbol]: { component: Scatter, props: { symbolLayout: true } },
  [chartTypes.scatter]: { component: Scatter, props: {} },
  [chartTypes.radar]: { component: Radar, props: {} },
  [chartTypes.pie]: { component: Pie, props: {} },
};

const getChartForType = R.propOr(
  { component: NullComponent, props: {} },
  R.__,
  chartByType,
);

const HighchartsChart = ({
  id = 'temp-id',
  dataSourceType = dataSourceTypes.csv.value,
  dotStatUrl = '',
  dotStatLang = 'en',
  latestAvailableData = false,
  staticCsvData = '',
  csvCodeLabelMappingProjectLevel = null,
  csvCodeLabelMapping = null,
  dotStatCodeLabelMapping = null,
  decimalPoint = decimalPointTypes.point.value,
  preParsedData = null,
  pivotData = false,
  chartType,
  width,
  height,
  title = null,
  subtitle = null,
  definition = null,
  note = null,
  source = null,
  highlight = '',
  baseline = '',
  colorPalette,
  paletteColorsOverride,
  highlightColors,
  highlightColorsOverride,
  sortBy = sortByOptions.none.value,
  sortOrder = sortOrderOptions.asc.value,
  sortSeries = '',
  yAxisOrderOverride = '',
  maxNumberOfDecimals = '',
  mapCountryDimension = '',
  onTitleParsed = null,
  displayFooterAsTooltip = false,
  onExpandChart = null,
  hideExpand = false,
  onDownloadData = null,
  onDataReady = null,
  vars,
  lang,
  ...otherProps
}) => {
  const chartForType = getChartForType(chartType);
  const ChartForTypeComponent = chartForType.component;

  const lastRequestedDataKey = useRef(null);
  const [sdmxJson, setSdmxJson] = useState(null);
  const [isFetching, setIsFetching] = useState(
    dataSourceType === dataSourceTypes.dotStat.value &&
      !isNilOrEmpty(dotStatUrl),
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);

  const [preParsedDataInternal, setPreParsedDataInternal] =
    useState(preParsedData);

  const finalDotStatUrl = useMemo(
    () => createDotStatUrl(dotStatUrl, vars),
    [dotStatUrl, vars],
  );

  useEffect(() => {
    if (
      isNilOrEmpty(finalDotStatUrl) ||
      dataSourceType === dataSourceTypes.csv.value
    ) {
      if (!preParsedDataInternal) {
        setIsFetching(false);
        setErrorMessage(null);
        setNoDataMessage(null);
        setSdmxJson(null);
      }
    } else {
      setIsFetching(true);
      setErrorMessage(null);
      setNoDataMessage(null);

      const getDotStatData = async () => {
        try {
          lastRequestedDataKey.current = `${finalDotStatUrl}|${dotStatLang}`;

          const newSdmxJson = await fetchDotStatData(
            finalDotStatUrl,
            dotStatLang,
          );

          // discard result from outdated request(s)
          if (
            lastRequestedDataKey.current === `${finalDotStatUrl}|${dotStatLang}`
          ) {
            setSdmxJson(newSdmxJson);
            setIsFetching(false);
          }
        } catch (e) {
          setErrorMessage('An error occured :-(');
          setIsFetching(false);
        }
      };
      getDotStatData();
    }
  }, [dataSourceType, finalDotStatUrl, dotStatLang, preParsedDataInternal]);

  const parsedSDMXData = useMemo(() => {
    if (dataSourceType === dataSourceTypes.csv.value) {
      return null;
    }

    if (preParsedDataInternal?.dotStatServerFetchFailed === true) {
      setErrorMessage('An error occured :-(');
      return null;
    }

    if (preParsedDataInternal?.dotStatResponseWasEmpty === true) {
      setNoDataMessage('No data available');
      return emptyData;
    }

    if (!R.isNil(preParsedDataInternal)) {
      return preParsedDataInternal;
    }

    try {
      if (!sdmxJson) {
        return null;
      }

      if (isSdmxJsonEmpty(sdmxJson)) {
        setNoDataMessage('No data available');
        return emptyData;
      }

      return createDataFromSdmxJson({
        sdmxJson,
        dotStatCodeLabelMapping,
        latestAvailableData,
        mapCountryDimension,
        pivotData,
        chartType,
        dataSourceType,
        sortBy,
        sortOrder,
        sortSeries,
        yAxisOrderOverride,
      });
    } catch (e) {
      setErrorMessage('An error occured :-(');
      return emptyData;
    }
  }, [
    dataSourceType,
    chartType,
    latestAvailableData,
    mapCountryDimension,
    pivotData,
    sdmxJson,
    sortBy,
    sortOrder,
    sortSeries,
    yAxisOrderOverride,
    dotStatCodeLabelMapping,
    preParsedDataInternal,
  ]);

  const parsedCSVData = useMemo(() => {
    if (dataSourceType === dataSourceTypes.dotStat.value) {
      return null;
    }
    if (
      !isNilOrEmpty(preParsedDataInternal) &&
      dataSourceType === dataSourceTypes.csv.value
    ) {
      return preParsedDataInternal;
    }

    try {
      const data = createDataFromCSV({
        staticCsvData,
        chartType,
        dataSourceType,
        pivotData,
        csvCodeLabelMappingProjectLevel,
        csvCodeLabelMapping,
        sortBy,
        sortOrder,
        sortSeries,
        yAxisOrderOverride,
        vars,
      });

      setErrorMessage(null);
      setNoDataMessage(null);

      return data;
    } catch (e) {
      setErrorMessage('An error occured :-(');
      return emptyData;
    }
  }, [
    dataSourceType,
    preParsedDataInternal,
    chartType,
    csvCodeLabelMapping,
    csvCodeLabelMappingProjectLevel,
    pivotData,
    sortBy,
    sortOrder,
    sortSeries,
    staticCsvData,
    vars,
    yAxisOrderOverride,
  ]);

  const parsedData = useMemo(() => {
    if (dataSourceType === dataSourceTypes.dotStat.value) {
      return parsedSDMXData;
    }

    return parsedCSVData;
  }, [dataSourceType, parsedSDMXData, parsedCSVData]);

  useEffect(() => {
    if (onDataReady && parsedData) {
      onDataReady(parsedData);
    }
  }, [parsedData, onDataReady]);

  useEffect(() => {
    if (preParsedDataInternal) {
      const { varsThatCauseNewPreParsedDataFetch } = preParsedDataInternal;

      if (isNilOrEmpty(varsThatCauseNewPreParsedDataFetch)) {
        return;
      }

      const anyVarHasChanged = R.compose(
        R.any(R.equals(true)),
        R.map(
          (varName) =>
            R.toUpper(varsThatCauseNewPreParsedDataFetch[varName] ?? '') !==
            R.toUpper(vars[varName] ?? ''),
        ),
      )(R.keys(varsThatCauseNewPreParsedDataFetch));

      if (anyVarHasChanged) {
        const varsParam = R.compose(
          R.join('/'),
          R.dropLastWhile((v) => v === '-'),
          R.map((v) => (R.isEmpty(v) ? '-' : v)),
          R.values,
        )(vars);

        const configParams = `${id}${
          R.isEmpty(varsParam) ? '' : `/${varsParam}`
        }`;

        setIsFetching(true);
        setErrorMessage(null);
        setNoDataMessage(null);

        const getNewPreParsedData = async () => {
          try {
            lastRequestedDataKey.current = configParams;

            const newPreParsedData = await fetchJson(
              `${apiUrl}/api/public/chartConfig/${configParams}?preParsedDataOnly&lang=${R.toLower(
                lang,
              )}`,
            );

            // discard result from outdated request(s)
            if (lastRequestedDataKey.current === configParams) {
              setPreParsedDataInternal(
                R.prop('preParsedData', newPreParsedData),
              );
              setIsFetching(false);
            }
          } catch (e) {
            setErrorMessage('An error occured :-(');
            setIsFetching(false);
          }
        };
        getNewPreParsedData();
      }
    }
  }, [id, vars, lang, preParsedDataInternal]);

  const [headerHeight, setHeaderHeight] = useState(null);
  const [footerHeight, setFooterHeight] = useState(null);
  const [chartHeight, setChartHeight] = useState(height);

  const parsedNoteAndSource = useMemo(() => {
    const nonEmpyItems = R.reject(R.either(R.equals('<p></p>'), isNilOrEmpty), [
      replaceVarsNameByVarsValueUsingCodeLabelMapping(
        note,
        vars,
        parsedData?.codeLabelMapping,
      ),
      replaceVarsNameByVarsValueUsingCodeLabelMapping(
        source,
        vars,
        parsedData?.codeLabelMapping,
      ),
    ]);
    return R.isEmpty(nonEmpyItems) ? null : R.join('', nonEmpyItems);
  }, [note, source, vars, parsedData?.codeLabelMapping]);

  const parsedDefinition = useMemo(() => {
    const definitionWithVars = replaceVarsNameByVarsValueUsingCodeLabelMapping(
      definition,
      vars,
      parsedData?.codeLabelMapping,
    );

    return R.either(R.equals('<p></p>'), isNilOrEmpty)(definitionWithVars)
      ? null
      : definitionWithVars;
  }, [definition, vars, parsedData?.codeLabelMapping]);

  const fakeTooltipButton =
    R.isNil(parsedNoteAndSource) && R.isNil(parsedDefinition) ? null : (
      <div style={{ width: '20px' }} />
    );

  const headerRef = useRef(null);
  const footerRef = useRef(null);

  const parsedTitle = useMemo(
    () =>
      replaceVarsNameByVarsValueUsingCodeLabelMapping(
        title,
        vars,
        parsedData?.codeLabelMapping,
        true,
      ),
    [title, vars, parsedData?.codeLabelMapping],
  );

  const parsedSubtitle = useMemo(
    () =>
      replaceVarsNameByVarsValueUsingCodeLabelMapping(
        subtitle,
        vars,
        parsedData?.codeLabelMapping,
        true,
      ),
    [subtitle, vars, parsedData?.codeLabelMapping],
  );

  const doesTitleOrSubtitleContainVar = useMemo(
    () => doesStringContainVar(title) || doesStringContainVar(subtitle),
    [title, subtitle],
  );

  const canTitleAndSubtitleBeDisplayed = !(
    doesTitleOrSubtitleContainVar && isFetching
  );

  useEffect(() => {
    const isThereEnoughSpaceForFooter = displayFooterAsTooltip
      ? false
      : height - footerRef.current.clientHeight >=
        minChartHeightForFooterDisplay;

    setHeaderHeight(headerRef.current.clientHeight);

    setFooterHeight(
      isThereEnoughSpaceForFooter ? footerRef.current.clientHeight : 0,
    );

    setChartHeight(
      isThereEnoughSpaceForFooter
        ? height -
            headerRef.current.clientHeight -
            footerRef.current.clientHeight
        : height - headerRef.current.clientHeight,
    );
  }, [
    width,
    height,
    parsedTitle,
    parsedSubtitle,
    note,
    source,
    displayFooterAsTooltip,
  ]);

  const parsedHighlight = useMemo(
    () =>
      R.compose(
        R.join('|'),
        R.reject(R.isEmpty),
        R.split('|'),
      )(replaceVarsNameByVarsValue(highlight, vars)),
    [highlight, vars],
  );

  const parsedBaseline = useMemo(
    () => replaceVarsNameByVarsValue(baseline, vars),
    [baseline, vars],
  );

  const { mapColorValueSteps } = otherProps;

  const formatters = useMemo(
    () =>
      createFormatters({
        chartType,
        mapColorValueSteps,
        maxNumberOfDecimals,
        latestYByXCode: parsedData?.latestYByXCode,
        latestYByXLabel: parsedData?.latestYByXLabel,
        decimalPoint,
      }),
    [
      chartType,
      mapColorValueSteps,
      maxNumberOfDecimals,
      parsedData?.latestYByXCode,
      parsedData?.latestYByXLabel,
      decimalPoint,
    ],
  );

  useEffect(() => {
    if (onTitleParsed) {
      onTitleParsed(parsedTitle);
    }
  }, [onTitleParsed, parsedTitle]);

  const chartRef = useRef(null);

  const chartCanBedisplayed =
    !isFetching &&
    R.isNil(noDataMessage) &&
    R.isNil(errorMessage) &&
    !R.isNil(parsedData);

  const tooltipState = useTooltipState();

  const [isInIframe, setIsInIframe] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [screenHeight, setScreenHeight] = useState(0);
  useEffect(() => {
    setIsInIframe(window.location !== window.parent.location);
    setScreenHeight(window.screen.height);
  }, []);
  const openChartFullScreen = () => {
    setIsFullScreen(true);
    chartRef.current?.chart.fullscreen.open();
  };
  const fullscreenClose = useCallback(() => {
    setIsFullScreen(false);
  }, []);

  const noteAndSourceShouldBeDisplayedInTooltip =
    !R.isNil(parsedNoteAndSource) &&
    (footerHeight === 0 || displayFooterAsTooltip);

  const csvExportcolumnHeaderFormatter = useMemo(() => {
    if (isNilOrEmpty(parsedTitle) && isNilOrEmpty(parsedSubtitle)) {
      return () => false;
    }

    return (item) => {
      if (item?.coll === 'xAxis' || (chartType === chartTypes.pie && !item)) {
        if (isNilOrEmpty(parsedSubtitle)) {
          return `${striptags(parsedTitle)}"\n"Category`;
        }
        if (isNilOrEmpty(parsedTitle)) {
          return `${striptags(parsedSubtitle)}"\n"Category`;
        }
        return `${striptags(parsedTitle)}"\n"${striptags(
          parsedSubtitle,
        )}"\n"Category`;
      }
      return false;
    };
  }, [parsedTitle, parsedSubtitle, chartType]);

  return (
    <div className="cb-container" style={{ backgroundColor: '#fff' }}>
      <div
        ref={headerRef}
        style={
          R.isNil(headerHeight)
            ? {
                width,
                position: 'fixed',
                visibility: 'hidden',
              }
            : {}
        }
      >
        <div style={{ display: 'flex', padding: '7px 10px 5px 10px' }}>
          <div style={{ flex: '1 1 auto' }}>
            {!R.isEmpty(parsedTitle) && canTitleAndSubtitleBeDisplayed && (
              <div
                className="cb-title"
                dangerouslySetInnerHTML={{
                  __html: parsedTitle,
                }}
              />
            )}
            {!R.isEmpty(parsedSubtitle) && canTitleAndSubtitleBeDisplayed && (
              <div
                className="cb-subtitle"
                dangerouslySetInnerHTML={{
                  __html: parsedSubtitle,
                }}
              />
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              flexWrap: 'nowrap',
              minHeight: '21px',
            }}
          >
            {noteAndSourceShouldBeDisplayedInTooltip ||
            !R.isNil(parsedDefinition) ? (
              <>
                <div
                  className="cb-toolbar"
                  style={{ marginLeft: '4px' }}
                  ref={tooltipState.refs.setReference}
                  {...tooltipState.getReferenceProps()}
                >
                  <FontAwesomeIcon icon={faInfoCircle} />
                </div>
                {tooltipState.open && (
                  <FloatingPortal>
                    <div
                      ref={tooltipState.refs.setFloating}
                      style={tooltipState.floatingStyles}
                      {...tooltipState.getFloatingProps()}
                      className="cb-floating cb-tooltip"
                      dangerouslySetInnerHTML={{
                        __html: noteAndSourceShouldBeDisplayedInTooltip
                          ? R.join('', [parsedDefinition, parsedNoteAndSource])
                          : parsedDefinition,
                      }}
                    />
                  </FloatingPortal>
                )}
              </>
            ) : (
              fakeTooltipButton
            )}
            <ExportButton
              chartRef={chartRef}
              parsedTitle={parsedTitle}
              parsedSubtitle={parsedSubtitle}
              onDownloadData={onDownloadData}
              disabled={!chartCanBedisplayed}
              style={{ marginLeft: '8px' }}
            />
            {(onExpandChart || !isInIframe) && !hideExpand && (
              <div
                style={{ marginLeft: '8px' }}
                className={
                  chartCanBedisplayed ? 'cb-toolbar' : 'cb-toolbar-disabled'
                }
                role="button"
                tabIndex={0}
                onClick={onExpandChart || openChartFullScreen}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (onExpandChart) {
                      onExpandChart();
                    } else {
                      openChartFullScreen();
                    }
                  }
                }}
              >
                <FontAwesomeIcon icon={faExpandArrowsAlt} />
              </div>
            )}
          </div>
        </div>
      </div>

      {!chartCanBedisplayed && (
        <CenteredContainer height={chartHeight}>
          {isFetching && <Spinner />}
          {!R.isNil(errorMessage) && errorMessage}
          {!R.isNil(noDataMessage) && noDataMessage}
        </CenteredContainer>
      )}

      {!R.isNil(footerHeight) && chartHeight && chartCanBedisplayed && (
        <Suspense
          fallback={
            <CenteredContainer height={chartHeight}>
              <Spinner />
            </CenteredContainer>
          }
        >
          <ChartForTypeComponent
            {...chartForType.props}
            ref={chartRef}
            width={width}
            height={isFullScreen ? screenHeight : chartHeight}
            title={isFullScreen ? parsedTitle : ''}
            subtitle={isFullScreen ? parsedSubtitle : ''}
            data={parsedData}
            highlight={parsedHighlight}
            baseline={parsedBaseline}
            colorPalette={
              R.isEmpty(paletteColorsOverride)
                ? colorPalette
                : paletteColorsOverride
            }
            highlightColors={
              R.isEmpty(highlightColorsOverride)
                ? highlightColors
                : highlightColorsOverride
            }
            formatters={formatters}
            fullscreenClose={fullscreenClose}
            isFullScreen={isFullScreen}
            csvExportcolumnHeaderFormatter={csvExportcolumnHeaderFormatter}
            {...otherProps}
          />
        </Suspense>
      )}

      <div
        ref={footerRef}
        className="cb-footer"
        style={
          R.isNil(footerHeight) || footerHeight === 0
            ? {
                width,
                position: 'fixed',
                visibility: 'hidden',
              }
            : {}
        }
      >
        <div
          dangerouslySetInnerHTML={{
            __html: parsedNoteAndSource,
          }}
        />
      </div>
    </div>
  );
};

HighchartsChart.propTypes = {
  id: PropTypes.string,
  dataSourceType: PropTypes.string,
  dotStatUrl: PropTypes.string,
  dotStatLang: PropTypes.string,
  latestAvailableData: PropTypes.bool,
  staticCsvData: PropTypes.string,
  csvCodeLabelMappingProjectLevel: PropTypes.string,
  csvCodeLabelMapping: PropTypes.string,
  dotStatCodeLabelMapping: PropTypes.string,
  decimalPoint: PropTypes.string,
  preParsedData: PropTypes.object,
  pivotData: PropTypes.bool,
  chartType: PropTypes.oneOf(R.values(chartTypes)).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  definition: PropTypes.string,
  note: PropTypes.string,
  source: PropTypes.string,
  highlight: PropTypes.string,
  baseline: PropTypes.string,
  colorPalette: PropTypes.array.isRequired,
  paletteColorsOverride: PropTypes.array.isRequired,
  highlightColors: PropTypes.array.isRequired,
  highlightColorsOverride: PropTypes.array.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortSeries: PropTypes.string,
  yAxisOrderOverride: PropTypes.string,
  maxNumberOfDecimals: PropTypes.string,
  mapCountryDimension: PropTypes.string,
  onTitleParsed: PropTypes.func,
  displayFooterAsTooltip: PropTypes.bool,
  onExpandChart: PropTypes.func,
  hideExpand: PropTypes.bool,
  onDownloadData: PropTypes.func,
  onDataReady: PropTypes.func,
  vars: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
};

export default memo(HighchartsChart);
