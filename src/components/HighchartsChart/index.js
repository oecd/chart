/* eslint-disable react/jsx-props-no-spreading, react/no-danger, react/no-this-in-sfc  */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  memo,
  lazy,
  Suspense,
} from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons/faExpandArrowsAlt';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons/faInfoCircle';
import { FloatingPortal } from '@floating-ui/react-dom-interactions';
import * as R from 'ramda';

import {
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
  onDownloadData,
  onDataChange,
  vars,
  ...otherProps
}) => {
  const chartForType = getChartForType(chartType);
  const ChartForTypeComponent = chartForType.component;

  const lastRequestedDotStatUrlKey = useRef(null);
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

      const getData = async () => {
        try {
          lastRequestedDotStatUrlKey.current = `${finalDotStatUrl}|${dotStatLang}`;

          const response = await fetch(fixDotStatUrl(finalDotStatUrl), {
            headers: createDotStatHeaders(dotStatLang),
          });

          // discard result from outdated request(s)
          if (
            lastRequestedDotStatUrlKey.current ===
            `${finalDotStatUrl}|${dotStatLang}`
          ) {
            if (R.prop('status', response) !== 200) {
              setErrorMessage('An error occured :-(');
            } else {
              setSdmxJson(await response.json());
            }
            setIsFetching(false);
          }
        } catch (e) {
          setErrorMessage('An error occured :-(');
          setIsFetching(false);
        }
      };
      getData();
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
  ]);

  const parsedCSVData = useMemo(() => {
    if (dataSourceType === dataSourceTypes.dotStat.value) {
      return null;
    }
    if (
      !isNilOrEmpty(preParsedData) &&
      dataSourceType === dataSourceTypes.csv.value
    ) {
      return preParsedData;
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
    preParsedData,
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
      onDataChange(R.pick(['categories', 'series'], parsedCSVData));
    }

    return parsedCSVData;
  }, [dataSourceType, parsedSDMXData, parsedCSVData, onDataChange]);

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
          R.concat(
            R.prop('categories', parsedData),
            R.prop('series', parsedData),
          ),
        )
      : {};
  }, [title, subtitle, definition, note, source, parsedData]);

  const footer = useMemo(() => {
    const nonEmpyFooterItems = R.reject(
      R.either(R.equals('<p></p>'), isNilOrEmpty),
      [
        replaceVarsNameByVarsValueUsingCodeLabelMapping(
          definition,
          vars,
          codeLabelMappingFromData,
        ),
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
      ],
    );
    return R.isEmpty(nonEmpyFooterItems)
      ? null
      : R.join('', nonEmpyFooterItems);
  }, [definition, note, source, vars, codeLabelMappingFromData]);

  const fakeFooterTooltip = R.isNil(footer) ? null : (
    <div style={{ width: '20px' }} />
  );

  const headerRef = useRef(null);
  const footerRef = useRef(null);

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
    title,
    subtitle,
    definition,
    note,
    source,
    displayFooterAsTooltip,
  ]);

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

  const downloadEnabled =
    !isFetching && R.isNil(noDataMessage) && R.isNil(errorMessage);

  const tooltipState = useTooltipState();

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
            className="cb-toolbar"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              flexWrap: 'nowrap',
              minHeight: '21px',
            }}
          >
            {!R.isNil(footer) &&
            (footerHeight === 0 || displayFooterAsTooltip) ? (
              <>
                <div
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
                      className="cb-tooltip"
                      dangerouslySetInnerHTML={{
                        __html: footer,
                      }}
                    />
                  )}
                </FloatingPortal>
              </>
            ) : (
              fakeFooterTooltip
            )}
            <div
              style={{
                marginLeft: '8px',
                cursor: downloadEnabled ? 'pointer' : 'default',
                color: downloadEnabled ? '' : '#ddd',
              }}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (downloadEnabled && chartRef.current?.chart.downloadCSV) {
                  chartRef.current?.chart.downloadCSV();

                  if (onDownloadData) {
                    onDownloadData();
                  }
                }
              }}
              onKeyDown={(e) => {
                if (
                  downloadEnabled &&
                  e.key === 'Enter' &&
                  chartRef.current?.chart.downloadCSV
                ) {
                  chartRef.current?.chart.downloadCSV();
                }
              }}
            >
              <FontAwesomeIcon icon={faDownload} />
            </div>
            {onExpandChart && (
              <div
                style={{ marginLeft: '8px', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onClick={onExpandChart}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onExpandChart();
                  }
                }}
              >
                <FontAwesomeIcon icon={faExpandArrowsAlt} />
              </div>
            )}
          </div>
        </div>
      </div>

      {(!R.isNil(noDataMessage) || !R.isNil(errorMessage) || isFetching) && (
        <CenteredContainer height={chartHeight}>
          {isFetching && <Spinner />}
          {!R.isNil(errorMessage) && errorMessage}
          {!R.isNil(noDataMessage) && noDataMessage}
        </CenteredContainer>
      )}

      {!R.isNil(footerHeight) &&
        chartHeight &&
        !isFetching &&
        R.isNil(errorMessage) &&
        R.isNil(noDataMessage) && (
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
              height={chartHeight}
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
            __html: footer,
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
  onDownloadData: PropTypes.func,
  onDataChange: PropTypes.func,
  vars: PropTypes.object.isRequired,
  controls: PropTypes.array,
  displayControls: PropTypes.bool,
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
  onDownloadData: null,
  onDataChange: null,
  controls: [],
  displayControls: true,
};

export default memo(HighchartsChart);
