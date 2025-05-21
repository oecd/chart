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
  errorMessages,
  maxSupprortedNumberOfDataPoint,
  sortByOptions,
  sortOrderOptions,
} from '../../constants/chart';
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
  doesStringContainVar,
  deepMergeUserOptionsWithDefaultOptions,
  createChartOptions,
} from '../../utils/chartUtil';
import CenteredContainer from '../CenteredContainer';
import { fetchJson } from '../../utils/fetchUtil';
import Header from './Header';
import useIsFontLoaded from '../../hook/useIsFontLoaded';
import { trackChartError } from '../../utils/trackingUtil';
import GenericChart from './GenericChart';
import ScatterChart from './ScatterChart';

// dynamic import for code splitting
const MapChart = lazy(() => import('./MapChart'));

const minChartHeightForFooterDisplay = 280;

const chartByType = {
  [chartTypes.line]: GenericChart,
  [chartTypes.bar]: GenericChart,
  [chartTypes.row]: GenericChart,
  [chartTypes.stackedBar]: GenericChart,
  [chartTypes.stackedRow]: GenericChart,
  [chartTypes.stackedArea]: GenericChart,
  [chartTypes.map]: MapChart,
  [chartTypes.symbol]: ScatterChart,
  [chartTypes.scatter]: ScatterChart,
  [chartTypes.radar]: GenericChart,
  [chartTypes.pie]: GenericChart,
};

const getChartForType = R.propOr(NullComponent, R.__, chartByType);

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
  dotStatXAxisDimension,
  dotStatYAxisDimension,
  dotStatStructure,
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
  setControls,
  getControlsWithAvailability,
  highlight = '',
  baseline = '',
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  mapColorValueSteps = null,
  colorPalette,
  smallerColorPalettes = null,
  paletteStartingColor = null,
  paletteStartingColorOverride = null,
  highlightColors,
  sortBy = sortByOptions.none.value,
  sortOrder = sortOrderOptions.asc.value,
  sortSeries = '',
  yAxisOrderOverride = '',
  maxNumberOfDecimals = '',
  noThousandsSeparator = false,
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
  optionsOverride = null,
  debug = false,
}) => {
  const ChartForType = getChartForType(chartType);

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

  const newControlWillCauseVarChange = useRef(false);

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
    } else if (dataSourceType === dataSourceTypes.dotStatSnapshot.value) {
      if (preParsedDataInternal) {
        return;
      }

      setIsFetching(true);
      setErrorMessage(null);
      setNoDataMessage(null);

      const getSnapshotData = async () => {
        try {
          const newPreParsedData = await fetchJson(
            `${apiUrl}/api/public/chartConfig/${id}?preParsedDataOnly&lang=${R.toLower(
              lang,
            )}`,
          );

          setPreParsedDataInternal(R.prop('preParsedData', newPreParsedData));
          setIsFetching(false);
        } catch (e) {
          setIsFetching(false);
          setErrorMessage(errorMessages.generic);
          setPreParsedDataInternal(null);
        }
      };
      getSnapshotData();
    } else {
      newControlWillCauseVarChange.current = false;

      setIsFetching(true);
      setErrorMessage(null);
      setNoDataMessage(null);

      const getDotStatData = async () => {
        try {
          lastRequestedDataKey.current = `${finalDotStatUrl}|${dotStatLang}`;

          if (debug) {
            sendDebugInfo({
              type: debugInfoTypes.empty,
              data: {},
            });
          }

          const controlsWithAvailabilityRequest = getControlsWithAvailability
            ? getControlsWithAvailability(finalDotStatUrl, vars)
            : null;

          const newSdmxJsonRequest = fetchDotStatData(
            finalDotStatUrl,
            dotStatLang,
          );

          if (getControlsWithAvailability) {
            try {
              const controlsWithAvailabilityResponse =
                await controlsWithAvailabilityRequest;

              if (
                lastRequestedDataKey.current !==
                `${finalDotStatUrl}|${dotStatLang}`
              ) {
                // discard result from outdated request(s)
                return;
              }
              if (
                controlsWithAvailabilityResponse.newControls &&
                !controlsWithAvailabilityResponse.error
              ) {
                newControlWillCauseVarChange.current = setControls(
                  controlsWithAvailabilityResponse.newControls,
                );

                if (newControlWillCauseVarChange.current) {
                  return;
                }
              }
            } catch {
              // too bad; no availability check can be done
            }
          }

          const newSdmxJson = await newSdmxJsonRequest;
          if (
            lastRequestedDataKey.current !== `${finalDotStatUrl}|${dotStatLang}`
          ) {
            // discard result from outdated request(s)
            return;
          }

          setPreParsedDataInternal(null);
          setSdmxJson(newSdmxJson);
          setIsFetching(false);
        } catch (e) {
          if (
            lastRequestedDataKey.current !== `${finalDotStatUrl}|${dotStatLang}`
          ) {
            return;
          }
          setIsFetching(false);
          setErrorMessage(errorMessages.generic);
          setSdmxJson(null);

          if (debug) {
            sendDebugInfo({
              type: debugInfoTypes.dotStatInfo,
              data: { error: e.message },
            });
          }
        }
      };
      getDotStatData();
    }
  }, [
    dataSourceType,
    finalDotStatUrl,
    dotStatLang,
    preParsedDataInternal,
    id,
    lang,
    debug,
    setControls,
    getControlsWithAvailability,
    vars,
  ]);

  const parsedSDMXData = useMemo(() => {
    if (dataSourceType === dataSourceTypes.csv.value) {
      return null;
    }

    if (preParsedDataInternal?.dotStatServerFetchFailed === true) {
      setErrorMessage(errorMessages.generic);

      trackChartError(
        id,
        R.pathOr('', ['dotStatInfo', 'error'], preParsedDataInternal),
      );

      return null;
    }

    if (preParsedDataInternal?.dotStatResponseWasEmpty === true) {
      setNoDataMessage(errorMessages.noData);
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
        setNoDataMessage(errorMessages.noData);

        const codeLabelMapping = createCodeLabelMapping(
          csvCodeLabelMappingProjectLevel,
          dotStatCodeLabelMapping,
          dotStatStructure,
          dotStatLang,
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
        lang: dotStatLang,
        dotStatStructure,
        dotStatCodeLabelMapping,
        csvCodeLabelMappingProjectLevel,
        dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
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
        dotStatXAxisDimension,
        dotStatYAxisDimension,
      });
    } catch (e) {
      setErrorMessage(errorMessages.generic);
      return emptyData;
    }
  }, [
    id,
    dataSourceType,
    chartType,
    dotStatUrlHasLastNObservationsEqOne,
    mapCountryDimension,
    pivotData,
    sdmxJson,
    dotStatLang,
    dotStatStructure,
    sortBy,
    sortOrder,
    sortSeries,
    yAxisOrderOverride,
    dotStatCodeLabelMapping,
    csvCodeLabelMappingProjectLevel,
    dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
    preParsedDataInternal,
    forceXAxisToBeTreatedAsCategories,
    dotStatXAxisDimension,
    dotStatYAxisDimension,
  ]);

  const parsedCSVData = useMemo(() => {
    if (
      dataSourceType === dataSourceTypes.dotStat.value ||
      dataSourceType === dataSourceTypes.dotStatSnapshot.value
    ) {
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
      });

      setErrorMessage(null);
      setNoDataMessage(null);

      return data;
    } catch (e) {
      setErrorMessage(errorMessages.generic);
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
      dataSourceType === dataSourceTypes.dotStat.value ||
      dataSourceType === dataSourceTypes.dotStatSnapshot.value
        ? parsedSDMXData
        : parsedCSVData,
    [dataSourceType, parsedSDMXData, parsedCSVData],
  );

  useEffect(() => {
    if (onDataReady && !isFetching) {
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
      setErrorMessage(errorMessages.generic);
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

  const [prevLang, setPrevLang] = useState(lang);

  useEffect(() => setPrevLang(lang), [lang]);

  useEffect(() => {
    if (preParsedDataInternal) {
      newControlWillCauseVarChange.current = false;

      const { varsThatCauseNewPreParsedDataFetch } = preParsedDataInternal;

      const varsThatHaveChanged = R.reduce(
        (acc, varName) => {
          if (
            R.toUpper(varsThatCauseNewPreParsedDataFetch[varName] ?? '') !==
            R.replace(/\+/g, '|', R.toUpper(vars[varName] ?? ''))
          ) {
            return R.append(varName, acc);
          }

          return acc;
        },
        [],
        R.keys(varsThatCauseNewPreParsedDataFetch || {}),
      );

      const anyVarHasChanged = !R.isEmpty(varsThatHaveChanged);

      if (anyVarHasChanged || lang !== prevLang) {
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

            if (newPreParsedData?.preParsedData?.dotStatServerFetchFailed) {
              trackChartError(
                id,
                R.pathOr(
                  '',
                  ['preParsedData', 'dotStatInfo', 'error'],
                  newPreParsedData,
                ),
              );
            }

            if (lastRequestedDataKey.current !== configParams) {
              // discard result from outdated request(s)
              return;
            }

            if (R.has('controls', newPreParsedData)) {
              newControlWillCauseVarChange.current = setControls(
                R.prop('controls', newPreParsedData),
              );
              if (newControlWillCauseVarChange.current) {
                return;
              }
            }

            setPreParsedDataInternal(R.prop('preParsedData', newPreParsedData));

            setIsFetching(false);
          } catch (e) {
            setErrorMessage(errorMessages.generic);
            setIsFetching(false);
          }
        };
        getNewPreParsedData();
      }
    }
  }, [id, vars, lang, prevLang, preParsedDataInternal, setControls]);

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

  const chartRef = useRef(null);

  const numberOfDataPoint =
    R.length(parsedData?.categories || []) * R.length(parsedData?.series || []);

  const [mergedOptions, setMergedOptions] = useState({});

  const chartCanBedisplayed =
    !isFetching &&
    R.isNil(noDataMessage) &&
    R.isNil(errorMessage) &&
    !R.isNil(parsedData) &&
    numberOfDataPoint <= maxSupprortedNumberOfDataPoint &&
    !R.isEmpty(mergedOptions);

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

  const csvExportColumnHeaderFormatter = useMemo(() => {
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

  useEffect(() => {
    if (!parsedData) {
      setMergedOptions({});
    } else {
      const getOptions = async () => {
        const defaultOptions = await createChartOptions({
          chartType,
          data: parsedData,
          vars,
          title: isFullScreen ? parsedTitle : '',
          subtitle: isFullScreen ? parsedSubtitle : '',
          colorPalette,
          smallerColorPalettes,
          paletteStartingColor,
          paletteStartingColorOverride,
          highlight,
          baseline,
          highlightColors,
          mapColorValueSteps,
          maxNumberOfDecimals,
          noThousandsSeparator,
          decimalPoint,
          height: isFullScreen ? screenHeight : chartHeight,
          isSmall,
          hideLegend,
          hideXAxisLabels,
          hideYAxisLabels,
          fullscreenClose,
          tooltipOutside,
          csvExportcolumnHeaderFormatter: csvExportColumnHeaderFormatter,
          isFullScreen,
        });

        setMergedOptions(
          deepMergeUserOptionsWithDefaultOptions(
            defaultOptions,
            optionsOverride || {},
          ),
        );
      };
      getOptions();
    }
  }, [
    baseline,
    chartHeight,
    chartType,
    colorPalette,
    csvExportColumnHeaderFormatter,
    decimalPoint,
    fullscreenClose,
    hideLegend,
    hideXAxisLabels,
    hideYAxisLabels,
    highlight,
    highlightColors,
    isFullScreen,
    isSmall,
    mapColorValueSteps,
    maxNumberOfDecimals,
    noThousandsSeparator,
    paletteStartingColor,
    paletteStartingColorOverride,
    parsedData,
    parsedSubtitle,
    parsedTitle,
    screenHeight,
    smallerColorPalettes,
    tooltipOutside,
    vars,
    optionsOverride,
  ]);

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
            chartType={chartType}
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
          <ChartForType
            ref={chartRef}
            options={mergedOptions}
            isFullScreen={isFullScreen}
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
  dotStatXAxisDimension: PropTypes.string,
  dotStatYAxisDimension: PropTypes.string,
  dotStatStructure: PropTypes.object,
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
  setControls: PropTypes.func.isRequired,
  getControlsWithAvailability: PropTypes.func.isRequired,
  highlight: PropTypes.string,
  baseline: PropTypes.string,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  hideYAxisLabels: PropTypes.bool,
  mapColorValueSteps: PropTypes.array,
  colorPalette: PropTypes.array.isRequired,
  smallerColorPalettes: PropTypes.array,
  paletteStartingColor: PropTypes.string,
  paletteStartingColorOverride: PropTypes.string,
  highlightColors: PropTypes.array.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortSeries: PropTypes.string,
  yAxisOrderOverride: PropTypes.string,
  maxNumberOfDecimals: PropTypes.string,
  noThousandsSeparator: PropTypes.bool,
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
  optionsOverride: PropTypes.object,
};

export default memo(HighchartsChart);
