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
import * as R from 'ramda';

import {
  apiUrl,
  chartTypes,
  dataSourceTypes,
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
import { fixDotStatUrl, parseSdmxJson } from '../../utils/sdmxJsonUtil';
import {
  parseData,
  sortCSV,
  sortParsedDataOnYAxis,
  emptyData,
  addAreCategoriesNumbersOrDates,
  createDataFromCSV,
  pivotCSV,
} from '../../utils/csvUtil';
import Spinner from '../Spinner';
import {
  doesStringContainVariable,
  possibleVariables,
} from '../../utils/configUtil';
import {
  replaceVarsNameByVarsValueUsingCodeLabelMapping,
  replaceVarsNameByVarsValue,
  createFormatters,
} from '../../utils/chartUtil';
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

const createDotStatHeaders = (lang) => ({
  Accept: 'application/vnd.sdmx.data+json',
  'Accept-Language': isNilOrEmpty(lang) ? 'en' : R.toLower(lang),
});

const HighchartsChart = ({
  id,
  dataSourceType,
  dotStatUrl,
  dotStatLang,
  latestAvailableData,
  staticCsvData,
  csvCodeLabelMappingProjectLevel,
  csvCodeLabelMapping,
  dotStatCodeLabelMapping,
  preParsedData,
  pivotData,
  chartType,
  width,
  height,
  title,
  subtitle,
  definition,
  note,
  source,
  highlight,
  baseline,
  colorPalette,
  paletteColorsOverride,
  highlightColors,
  highlightColorsOverride,
  sortBy,
  sortOrder,
  sortSeries,
  yAxisOrderOverride,
  maxNumberOfDecimals,
  mapCountryDimension,
  onTitleParsed,
  displayFooterAsTooltip,
  onExpandChart,
  hideExpand,
  onDownloadData,
  onDataChange,
  vars,
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

  const finalDotStatUrl = useMemo(
    () =>
      R.reduce(
        (acc, varName) => {
          const varValue = R.prop(varName, vars);

          return R.replace(
            new RegExp(`{${varName}}`, 'gi'),
            R.toUpper(R.replace(/\|/g, '+', varValue)),
            acc,
          );
        },
        dotStatUrl,
        possibleVariables,
      ),
    [dotStatUrl, vars],
  );

  useEffect(() => {
    if (
      isNilOrEmpty(finalDotStatUrl) ||
      dataSourceType === dataSourceTypes.csv.value
    ) {
      setIsFetching(false);
      setErrorMessage(null);
      setNoDataMessage(null);
      setSdmxJson(null);
    } else {
      setIsFetching(true);
      setErrorMessage(null);
      setNoDataMessage(null);

      const getDotStatData = async () => {
        try {
          lastRequestedDataKey.current = `${finalDotStatUrl}|${dotStatLang}`;

          const newSdmxJson = await fetchJson(fixDotStatUrl(finalDotStatUrl), {
            headers: createDotStatHeaders(dotStatLang),
          });

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
  }, [dataSourceType, finalDotStatUrl, dotStatLang]);

  const parsedSDMXData = useMemo(() => {
    if (dataSourceType === dataSourceTypes.csv.value) {
      return null;
    }

    try {
      const isEmpty = R.isEmpty(
        R.path(['structure', 'dimensions', 'observation'], sdmxJson),
      );
      if (sdmxJson && isEmpty) {
        setNoDataMessage('No data available');
        return emptyData;
      }
      return sdmxJson
        ? R.compose(
            addAreCategoriesNumbersOrDates,
            sortParsedDataOnYAxis(yAxisOrderOverride),
            parseData,
            sortCSV(sortBy, sortOrder, sortSeries),
            pivotCSV(chartType, dataSourceType, pivotData),
            parseSdmxJson({
              chartType,
              pivotData,
              mapCountryDimension,
              latestAvailableData,
              dotStatCodeLabelMapping,
            }),
          )(sdmxJson)
        : emptyData;
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
  ]);

  const [preParsedDataInternal, setPreParsedDataInternal] =
    useState(preParsedData);

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

    if (onDataChange && parsedCSVData !== emptyData) {
      onDataChange(
        R.pick(['categories', 'series', 'otherDimensions'], parsedCSVData),
      );
    }

    return parsedCSVData;
  }, [dataSourceType, parsedSDMXData, parsedCSVData, onDataChange]);

  useEffect(() => {
    if (dataSourceType === dataSourceTypes.csv.value && preParsedDataInternal) {
      const { varUsedForCSVFiltering, varValueUsedForCSVFiltering } =
        preParsedDataInternal;
      if (
        R.toUpper(varValueUsedForCSVFiltering ?? '') !==
        R.toUpper(vars[varUsedForCSVFiltering] ?? '')
      ) {
        const varsParam = R.join('/', R.reject(R.isEmpty, R.values(vars)));
        const configParams = `${id}${
          R.isEmpty(varsParam) ? '' : `/${varsParam}`
        }`;

        setIsFetching(true);
        setErrorMessage(null);
        setNoDataMessage(null);

        const getCsvData = async () => {
          try {
            lastRequestedDataKey.current = configParams;

            const newPreParsedData = await fetchJson(
              `${apiUrl}/api/public/chartConfig/${configParams}?preParsedDataOnly`,
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
        getCsvData();
      }
    }
  }, [id, dataSourceType, vars, preParsedDataInternal]);

  const [headerHeight, setHeaderHeight] = useState(null);
  const [footerHeight, setFooterHeight] = useState(null);
  const [chartHeight, setChartHeight] = useState(height);

  const codeLabelMappingFromData = useMemo(() => {
    const doesAnyTextualDataContainVar = R.any(doesStringContainVariable, [
      title,
      subtitle,
      definition,
      note,
      source,
    ]);

    return doesAnyTextualDataContainVar
      ? R.compose(
          R.fromPairs,
          R.map(({ code, label }) => [R.toUpper(code), label]),
        )(
          R.reduce(
            (acc, el) => R.concat(acc, el),
            [],
            [
              R.prop('categories', parsedData),
              R.prop('series', parsedData),
              R.prop('otherDimensions', parsedData),
            ],
          ),
        )
      : {};
  }, [title, subtitle, definition, note, source, parsedData]);

  const parsedNoteAndSource = useMemo(() => {
    const nonEmpyItems = R.reject(R.either(R.equals('<p></p>'), isNilOrEmpty), [
      replaceVarsNameByVarsValueUsingCodeLabelMapping(
        note,
        vars,
        codeLabelMappingFromData,
      ),
      replaceVarsNameByVarsValueUsingCodeLabelMapping(
        source,
        vars,
        codeLabelMappingFromData,
      ),
    ]);
    return R.isEmpty(nonEmpyItems) ? null : R.join('', nonEmpyItems);
  }, [note, source, vars, codeLabelMappingFromData]);

  const parsedDefinition = useMemo(() => {
    const definitionWithVars = replaceVarsNameByVarsValueUsingCodeLabelMapping(
      definition,
      vars,
      codeLabelMappingFromData,
    );

    return R.either(R.equals('<p></p>'), isNilOrEmpty)(definitionWithVars)
      ? null
      : definitionWithVars;
  }, [definition, vars, codeLabelMappingFromData]);

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
        codeLabelMappingFromData,
      ),
    [title, vars, codeLabelMappingFromData],
  );

  const parsedSubtitle = useMemo(
    () =>
      replaceVarsNameByVarsValueUsingCodeLabelMapping(
        subtitle,
        vars,
        codeLabelMappingFromData,
      ),
    [subtitle, vars, codeLabelMappingFromData],
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
        latestYByXCode: parsedData.latestYByXCode,
        latestYByXLabel: parsedData.latestYByXLabel,
      }),
    [
      chartType,
      mapColorValueSteps,
      maxNumberOfDecimals,
      parsedData.latestYByXCode,
      parsedData.latestYByXLabel,
    ],
  );

  useEffect(() => {
    if (onTitleParsed) {
      onTitleParsed(parsedTitle);
    }
  }, [onTitleParsed, parsedTitle]);

  const chartRef = useRef(null);

  const chartCanBedisplayed =
    !isFetching && R.isNil(noDataMessage) && R.isNil(errorMessage);

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
            {!R.isEmpty(parsedTitle) && (
              <div
                className="cb-title"
                dangerouslySetInnerHTML={{
                  __html: parsedTitle,
                }}
              />
            )}
            {!R.isEmpty(parsedSubtitle) && (
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
                  ref={tooltipState.reference}
                  {...tooltipState.getReferenceProps()}
                >
                  <FontAwesomeIcon icon={faInfoCircle} />
                </div>
                <FloatingPortal>
                  {tooltipState.open && (
                    <div
                      ref={tooltipState.floating}
                      {...tooltipState.getFloatingProps()}
                      style={{
                        position: tooltipState.strategy,
                        top: tooltipState.y ?? 0,
                        left: tooltipState.x ?? 0,
                        visibility: R.isNil(tooltipState.x)
                          ? 'hidden'
                          : 'visible',
                      }}
                      className="cb-floating cb-tooltip"
                      dangerouslySetInnerHTML={{
                        __html: noteAndSourceShouldBeDisplayedInTooltip
                          ? R.join('', [parsedDefinition, parsedNoteAndSource])
                          : parsedDefinition,
                      }}
                    />
                  )}
                </FloatingPortal>
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
  onDataChange: PropTypes.func,
  vars: PropTypes.object.isRequired,
  controls: PropTypes.array,
};

HighchartsChart.defaultProps = {
  id: 'temp-id',
  dataSourceType: dataSourceTypes.csv.value,
  dotStatUrl: '',
  dotStatLang: 'en',
  latestAvailableData: false,
  staticCsvData: '',
  csvCodeLabelMappingProjectLevel: null,
  csvCodeLabelMapping: null,
  dotStatCodeLabelMapping: null,
  preParsedData: null,
  pivotData: false,
  title: null,
  subtitle: null,
  definition: null,
  note: null,
  source: null,
  highlight: '',
  baseline: '',
  sortBy: sortByOptions.none.value,
  sortOrder: sortOrderOptions.asc.value,
  sortSeries: '',
  yAxisOrderOverride: '',
  maxNumberOfDecimals: '',
  mapCountryDimension: '',
  onTitleParsed: null,
  displayFooterAsTooltip: false,
  onExpandChart: null,
  hideExpand: false,
  onDownloadData: null,
  onDataChange: null,
  controls: [],
};

export default memo(HighchartsChart);
