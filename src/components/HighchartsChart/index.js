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
import striptags from 'striptags';
import * as R from 'ramda';

import {
  apiUrl,
  chartTypes,
  dataSourceTypes,
  debugInfoTypes,
  decimalPointTypes,
  maxSupprortedNumberOfDataPoint,
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
import {
  emptyData,
  createDataFromCSV,
  createCodeLabelMapping,
} from '../../utils/csvUtil';
import Spinner from '../Spinner';
import {
  replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax,
  replaceVarsNameByVarsValue,
  doesStringContainVar,
} from '../../utils/chartUtil';
import { createFormatters } from '../../utils/highchartsUtil';
import CenteredContainer from '../CenteredContainer';
import { fetchJson } from '../../utils/fetchUtil';
import { getFinalPalette } from '../../utils/configUtil';
import Header from './Header';
import useIsFontLoaded from '../../hook/useIsFontLoaded';

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

const sendDebugInfo = ({ type, data }) => {
  document.dispatchEvent(
    new CustomEvent('cbDebugInfoSent', {
      detail: { type, data },
    }),
  );
};

const HighchartsChart = ({
  id = 'temp-id',
  dataSourceType = dataSourceTypes.csv.value,
  dotStatUrl = '',
  dotStatLang = 'en',
  latestAvailableData = false,
  staticCsvData = '',
  forceXAxisToBeTreatedAsCategories = false,
  csvCodeLabelMappingProjectLevel = null,
  csvCodeLabelMapping = null,
  dotStatCodeLabelMapping = null,
  dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember = null,
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
  smallerColorPalettes = [],
  paletteStartingColor = null,
  paletteStartingColorOverride = null,
  highlightColors,
  highlightColorsOverride,
  sortBy = sortByOptions.none.value,
  sortOrder = sortOrderOptions.asc.value,
  sortSeries = '',
  yAxisOrderOverride = '',
  maxNumberOfDecimals = '',
  mapCountryDimension = '',
  displayFooterAsTooltip = false,
  displayActionButton = false,
  actionButtonLabel = '',
  onExpandChart = null,
  hideExpand = false,
  onDownloadData = null,
  onDataReady = null,
  vars,
  lang,
  hideTitle = false,
  hideSubtitle = false,
  hideToolbox = false,
  tooltipContainerId,
  isSmall,
  debug = false,
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

  const dotStatUrlHasLastNObservationsEqOne = useMemo(() => {
    if (
      isNilOrEmpty(finalDotStatUrl) ||
      dataSourceType === dataSourceTypes.csv.value
    ) {
      return false;
    }
    const parsedUrl = new URL(finalDotStatUrl);
    return parsedUrl.searchParams.get('lastNObservations') === '1';
  }, [finalDotStatUrl, dataSourceType]);

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
          setIsFetching(false);
          setErrorMessage('An error occured :-(');
          setSdmxJson(null);
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
      return {
        ...emptyData,
        codeLabelMapping: preParsedDataInternal.codeLabelMapping,
      };
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

        const codeLabelMapping = createCodeLabelMapping(
          csvCodeLabelMappingProjectLevel,
          dotStatCodeLabelMapping,
        );

        return {
          ...emptyData,
          codeLabelMapping,
        };
      }

      setErrorMessage(null);
      setNoDataMessage(null);

      return createDataFromSdmxJson({
        sdmxJson,
        dotStatCodeLabelMapping,
        csvCodeLabelMappingProjectLevel,
        dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
        latestAvailableData,
        dotStatUrlHasLastNObservationsEqOne,
        mapCountryDimension,
        pivotData,
        chartType,
        dataSourceType,
        sortBy,
        sortOrder,
        sortSeries,
        yAxisOrderOverride,
        forceXAxisToBeTreatedAsCategories,
        version: '2',
      });
    } catch (e) {
      setErrorMessage('An error occured :-(');
      return emptyData;
    }
  }, [
    dataSourceType,
    chartType,
    latestAvailableData,
    dotStatUrlHasLastNObservationsEqOne,
    mapCountryDimension,
    pivotData,
    sdmxJson,
    sortBy,
    sortOrder,
    sortSeries,
    yAxisOrderOverride,
    dotStatCodeLabelMapping,
    csvCodeLabelMappingProjectLevel,
    dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
    preParsedDataInternal,
    forceXAxisToBeTreatedAsCategories,
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
        forceXAxisToBeTreatedAsCategories,
        vars,
        lang,
        version: '2',
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
    forceXAxisToBeTreatedAsCategories,
    lang,
  ]);

  const parsedData = useMemo(
    () =>
      dataSourceType === dataSourceTypes.dotStat.value
        ? parsedSDMXData
        : parsedCSVData,
    [dataSourceType, parsedSDMXData, parsedCSVData],
  );

  useEffect(() => {
    if (onDataReady && parsedData) {
      onDataReady(parsedData);
    }

    if (isNilOrEmpty(parsedData)) {
      return;
    }

    if (isFetching) {
      setErrorMessage(null);
      if (debug) {
        sendDebugInfo({
          type: debugInfoTypes.empty,
          data: {},
        });
      }

      return;
    }

    const numberOfCategory = R.length(parsedData.categories);
    const numberOfSeries = R.length(parsedData.series);
    if (numberOfCategory * numberOfSeries > maxSupprortedNumberOfDataPoint) {
      setErrorMessage('An error occured :-(');
      if (debug) {
        sendDebugInfo({
          type: debugInfoTypes.tooManyDataPoint,
          data: { numberOfCategory, numberOfSeries },
        });
      }

      return;
    }

    if (!debug) {
      return;
    }

    if (isNilOrEmpty(parsedData?.dotStatInfo)) {
      sendDebugInfo({
        type: debugInfoTypes.empty,
        data: {},
      });

      return;
    }

    sendDebugInfo({
      type: debugInfoTypes.dotStatInfo,
      data: parsedData.dotStatInfo,
    });
  }, [parsedData, onDataReady, debug, isFetching]);

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
              )}&version=2`,
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
      replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
        string: note,
        vars,
        latestMin: parsedData?.latestYMin,
        latestMax: parsedData?.latestYMax,
        mapping: parsedData?.codeLabelMapping,
      }),
      replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
        string: source,
        vars,
        latestMin: parsedData?.latestYMin,
        latestMax: parsedData?.latestYMax,
        mapping: parsedData?.codeLabelMapping,
      }),
    ]);
    return R.isEmpty(nonEmpyItems) ? null : R.join('', nonEmpyItems);
  }, [
    note,
    source,
    vars,
    parsedData?.latestYMin,
    parsedData?.latestYMax,
    parsedData?.codeLabelMapping,
  ]);

  const parsedDefinition = useMemo(() => {
    const definitionWithVars =
      replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
        string: definition,
        vars,
        latestMin: parsedData?.latestYMin,
        latestMax: parsedData?.latestYMax,
        mapping: parsedData?.codeLabelMapping,
      });

    return R.either(R.equals('<p></p>'), isNilOrEmpty)(definitionWithVars)
      ? null
      : definitionWithVars;
  }, [
    definition,
    vars,
    parsedData?.latestYMin,
    parsedData?.latestYMax,
    parsedData?.codeLabelMapping,
  ]);

  const headerRef = useRef(null);
  const footerRef = useRef(null);

  const parsedTitle = useMemo(
    () =>
      hideTitle
        ? ''
        : replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
            string: title,
            vars,
            latestMin: parsedData?.latestYMin,
            latestMax: parsedData?.latestYMax,
            mapping: parsedData?.codeLabelMapping,
            replaceMissingVarByBlank: true,
          }),
    [
      title,
      vars,
      parsedData?.latestYMin,
      parsedData?.latestYMax,
      parsedData?.codeLabelMapping,
      hideTitle,
    ],
  );

  const parsedSubtitle = useMemo(
    () =>
      hideSubtitle
        ? ''
        : replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
            string: subtitle,
            vars,
            latestMin: parsedData?.latestYMin,
            latestMax: parsedData?.latestYMax,
            mapping: parsedData?.codeLabelMapping,
            replaceMissingVarByBlank: true,
          }),
    [
      subtitle,
      vars,
      parsedData?.latestYMin,
      parsedData?.latestYMax,
      parsedData?.codeLabelMapping,
      hideSubtitle,
    ],
  );

  const doesTitleOrSubtitleContainVar = useMemo(
    () => doesStringContainVar(title) || doesStringContainVar(subtitle),
    [title, subtitle],
  );

  const canTitleAndSubtitleBeDisplayed = !(
    doesTitleOrSubtitleContainVar && isFetching
  );

  const isFontLoaded = useIsFontLoaded();

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
        R.reject(R.isEmpty),
        R.split('|'),
      )(replaceVarsNameByVarsValue(highlight, vars)),
    [highlight, vars],
  );

  const parsedBaseline = useMemo(
    () =>
      R.compose(
        R.reject(R.isEmpty),
        R.split('|'),
      )(replaceVarsNameByVarsValue(baseline, vars)),
    [baseline, vars],
  );

  const { mapColorValueSteps } = otherProps;

  const formatters = useMemo(
    () =>
      createFormatters({
        chartType,
        mapColorValueSteps,
        maxNumberOfDecimals,
        codeLabelMapping: parsedData?.codeLabelMapping,
        decimalPoint,
        areCategoriesNumbers: parsedData?.areCategoriesNumbers,
        areCategoriesDates: parsedData?.areCategoriesDates,
        categoriesDateFomat: parsedData?.categoriesDateFomat,
        lang,
      }),
    [
      chartType,
      mapColorValueSteps,
      maxNumberOfDecimals,
      parsedData?.codeLabelMapping,
      decimalPoint,
      parsedData?.areCategoriesNumbers,
      parsedData?.areCategoriesDates,
      parsedData?.categoriesDateFomat,
      lang,
    ],
  );

  const chartRef = useRef(null);

  const numberOfDataPoint =
    R.length(parsedData?.categories || []) * R.length(parsedData?.series || []);

  const chartCanBedisplayed =
    !isFetching &&
    R.isNil(noDataMessage) &&
    R.isNil(errorMessage) &&
    !R.isNil(parsedData) &&
    numberOfDataPoint <= maxSupprortedNumberOfDataPoint;

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [screenHeight, setScreenHeight] = useState(0);
  useEffect(() => {
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

  const finalColorPalette = useMemo(
    () =>
      getFinalPalette(
        colorPalette,
        smallerColorPalettes,
        R.length(parsedData?.series || []),
        paletteStartingColor,
        paletteStartingColorOverride,
      ),
    [
      colorPalette,
      smallerColorPalettes,
      parsedData?.series,
      paletteStartingColor,
      paletteStartingColorOverride,
    ],
  );

  const actionButtonClick = useCallback(() => {
    document.dispatchEvent(
      new CustomEvent('cbChartActionButtonClicked', {
        detail: {
          chartId: id || '',
        },
      }),
    );
  }, [id]);

  const tooltipOutside = !(isFullScreen || !isNilOrEmpty(tooltipContainerId));

  return (
    <div>
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
        {!(
          isNilOrEmpty(parsedTitle) &&
          isNilOrEmpty(parsedSubtitle) &&
          hideToolbox
        ) && (
          <Header
            title={parsedTitle}
            subtitle={parsedSubtitle}
            definition={parsedDefinition}
            noteAndSource={parsedNoteAndSource}
            canTitleAndSubtitleBeDisplayed={canTitleAndSubtitleBeDisplayed}
            noteAndSourceShouldBeDisplayedInTooltip={
              noteAndSourceShouldBeDisplayedInTooltip
            }
            hideToolbox={hideToolbox}
            exportDisabled={!chartCanBedisplayed}
            onDownloadData={onDownloadData}
            onExpandChart={onExpandChart}
            hideExpand={hideExpand}
            openChartFullScreen={openChartFullScreen}
            displayActionButton={displayActionButton}
            actionButtonLabel={actionButtonLabel}
            onActionButtonClick={actionButtonClick}
            tooltipContainerId={tooltipContainerId}
            isSmall={isSmall}
            isFontLoaded={isFontLoaded}
            chartRef={chartRef}
          />
        )}
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
            colorPalette={finalColorPalette}
            highlightColors={
              R.isEmpty(highlightColorsOverride)
                ? highlightColors
                : highlightColorsOverride
            }
            formatters={formatters}
            fullscreenClose={fullscreenClose}
            isFullScreen={isFullScreen}
            tooltipOutside={tooltipOutside}
            csvExportcolumnHeaderFormatter={csvExportcolumnHeaderFormatter}
            isSmall={isSmall}
            {...otherProps}
          />
        </Suspense>
      )}

      <div
        ref={footerRef}
        className={`cb-footer ${isFontLoaded ? 'cb-font-loaded' : ''}`}
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
  forceXAxisToBeTreatedAsCategories: PropTypes.bool,
  csvCodeLabelMappingProjectLevel: PropTypes.string,
  csvCodeLabelMapping: PropTypes.string,
  dotStatCodeLabelMapping: PropTypes.string,
  dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember: PropTypes.string,
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
  smallerColorPalettes: PropTypes.array,
  paletteStartingColor: PropTypes.string,
  paletteStartingColorOverride: PropTypes.string,
  highlightColors: PropTypes.array.isRequired,
  highlightColorsOverride: PropTypes.array.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortSeries: PropTypes.string,
  yAxisOrderOverride: PropTypes.string,
  maxNumberOfDecimals: PropTypes.string,
  mapCountryDimension: PropTypes.string,
  displayFooterAsTooltip: PropTypes.bool,
  displayActionButton: PropTypes.bool,
  actionButtonLabel: PropTypes.string,
  onExpandChart: PropTypes.func,
  hideExpand: PropTypes.bool,
  onDownloadData: PropTypes.func,
  onDataReady: PropTypes.func,
  vars: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool,
  hideSubtitle: PropTypes.bool,
  hideToolbox: PropTypes.bool,
  tooltipContainerId: PropTypes.string,
  isSmall: PropTypes.bool.isRequired,
  debug: PropTypes.bool,
};

export default memo(HighchartsChart);
