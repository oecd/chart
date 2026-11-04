import PropTypes from 'prop-types';
import { useCallback, useContext } from 'react';

import * as R from 'ramda';

import { apiUrl, chartSizes } from '../../constants/chart';
import { fontColors, fontFamilies } from '../../constants/styling';
import { createFooter } from '../../utils/chartUtil';
import { createExportFileName } from '../../utils/chartUtilCommon';
import { postJson } from '../../utils/fetchUtil';
import { getSizeCssClass } from '../../utils/stylingUtil';
import ActionIcon from '../Icons/ActionIcon';
import CsvIcon from '../Icons/CsvIcon';
import DotsIcon from '../Icons/DotsIcon';
import ExpandIcon from '../Icons/ExpandIcon';
import InfoIcon from '../Icons/InfoIcon';
import PngIcon from '../Icons/PngIcon';
import SvgIcon from '../Icons/SvgIcon';
import { Menu, MenuContext, MenuItem, PopoverContent } from '../floating/Menu';

const RootTrigger = () => {
  const { isOpen } = useContext(MenuContext);

  return (
    <div
      style={{
        display: 'flex',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'all 250ms',
      }}
    >
      <DotsIcon />
    </div>
  );
};

const Toolbox = ({
  chartRef,
  chartType,
  inlineLabels,
  parsedTitle,
  parsedSubtitle,
  onDownloadData = null,
  onExpandChart = null,
  isInIframe,
  hideExpand,
  openChartFullScreen,
  definition,
  note,
  source,
  annotationsForFooter,
  displayNoteAsTooltip,
  noteShouldBeDisplayedInTooltip,
  sourceShouldBeDisplayedInTooltip,
  annotationsShouldBeDisplayedInTooltip,
  tooltipContainerId,
  displayActionButton,
  actionButtonLabel,
  onActionButtonClick,
  chartSize,
  exportDisabled = false,
}) => {
  const downloadCSV = useCallback(() => {
    if (chartRef.current?.chart.downloadCSV) {
      chartRef.current?.chart.downloadCSV();
      if (onDownloadData) {
        onDownloadData();
      }
    }
  }, [chartRef, onDownloadData]);

  const exportImage = useCallback(
    async (format) => {
      const chartOptions = chartRef.current?.chart.options;
      if (!chartOptions) {
        return;
      }

      const options = R.compose(
        R.when((o) => !R.has('map', o.chart), R.omit(['colorAxis'])),
        R.assocPath(
          ['caption', 'text'],
          createFooter({
            source,
            note: displayNoteAsTooltip ? '' : note,
            stripLinks: true,
          }),
        ),
        R.assocPath(['subtitle', 'text'], parsedSubtitle),
        R.assocPath(['title', 'text'], parsedTitle),
      )(chartOptions);

      try {
        const { exportId } = await postJson(`${apiUrl}/api/public/export`, {
          chartOptions: options,
          format,
          fileName: createExportFileName(),
          chartType,
          inlineLabels,
        });

        window.location.href = `${apiUrl}/api/public/export/${exportId}`;

        if (onDownloadData) {
          onDownloadData();
        }
      } catch {
        // too bad, the export has failed but there is no elegant way to notify the user
      }
    },
    [
      chartType,
      inlineLabels,
      displayNoteAsTooltip,
      note,
      onDownloadData,
      parsedSubtitle,
      parsedTitle,
      source,
      chartRef,
    ],
  );

  const menuItems = R.compose(
    R.when(
      () => (onExpandChart || !isInIframe) && !hideExpand,
      R.prepend({
        label: 'Expand',
        content: <ExpandIcon />,
        disabled: exportDisabled,
        onSelect: () => {
          if (onExpandChart) {
            onExpandChart();
          } else {
            openChartFullScreen();
          }
        },
      }),
    ),
    // eslint-disable-next-line react-hooks/refs
  )([
    {
      label: 'CSV',
      content: <CsvIcon />,
      disabled: exportDisabled,
      onSelect: downloadCSV,
    },
    {
      label: 'PNG',
      content: <PngIcon />,
      disabled: exportDisabled,
      onSelect: async () => {
        exportImage('png');
      },
    },
    {
      label: 'SVG',
      content: <SvgIcon />,
      disabled: exportDisabled,
      onSelect: () => {
        exportImage('svg');
      },
    },
  ]);

  const isLarge = chartSize === chartSizes.large;

  return (
    <>
      {displayActionButton && (
        <div
          role="button"
          aria-label={actionButtonLabel}
          className="cb-tool"
          tabIndex={0}
          onClick={onActionButtonClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onActionButtonClick();
              e.stopPropagation();
            }
          }}
          style={{ marginLeft: '6px' }}
        >
          <ActionIcon />
        </div>
      )}

      {(noteShouldBeDisplayedInTooltip ||
        sourceShouldBeDisplayedInTooltip ||
        !R.isNil(definition)) &&
        isLarge && (
          <Menu
            label={<InfoIcon />}
            placement="bottom-end"
            className="cb-tool"
            tooltipContainerId={tooltipContainerId}
            containsPopover
          >
            <PopoverContent tooltipContainerId={tooltipContainerId}>
              <div
                className="cb-floating cb-tooltip"
                style={{
                  fontFamily: fontFamilies.normal,
                  color: fontColors.normal,
                }}
                dangerouslySetInnerHTML={{
                  __html: R.compose(
                    R.join(''),
                    R.when(
                      () => sourceShouldBeDisplayedInTooltip,
                      R.append(source),
                    ),
                    R.when(
                      () => noteShouldBeDisplayedInTooltip,
                      R.append(note),
                    ),
                  )([definition]),
                }}
              />
            </PopoverContent>
          </Menu>
        )}
      <Menu
        label={<RootTrigger />}
        className="cb-tool"
        tooltipContainerId={tooltipContainerId}
        style={{ marginLeft: '6px' }}
      >
        <div className={`cb-toolbox ${getSizeCssClass(chartSize)}`}>
          {(noteShouldBeDisplayedInTooltip ||
            sourceShouldBeDisplayedInTooltip ||
            !R.isNil(definition)) &&
            !isLarge && (
              <Menu
                label={<InfoIcon />}
                placement="left"
                className="cb-tool"
                tooltipContainerId={tooltipContainerId}
                containsPopover
              >
                <PopoverContent tooltipContainerId={tooltipContainerId}>
                  <div
                    className="cb-floating cb-tooltip"
                    dangerouslySetInnerHTML={{
                      __html: R.compose(
                        R.join(''),
                        R.when(
                          () => annotationsShouldBeDisplayedInTooltip,
                          R.append(annotationsForFooter),
                        ),
                        R.when(
                          () => sourceShouldBeDisplayedInTooltip,
                          R.append(source),
                        ),
                        R.when(
                          () => noteShouldBeDisplayedInTooltip,
                          R.append(note),
                        ),
                      )([definition]),
                    }}
                  />
                </PopoverContent>
              </Menu>
            )}

          {R.map(
            (i) => (
              <MenuItem
                key={i.label}
                aria-label={i.label}
                onClick={i.onSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    i.onSelect();
                  }
                }}
                className={`cb-tool ${i.disabled ? 'cb-disabled' : ''}`}
                disabled={i.disabled}
              >
                {i.content}
              </MenuItem>
            ),
            menuItems,
          )}
        </div>
      </Menu>
    </>
  );
};

Toolbox.propTypes = {
  chartRef: PropTypes.object.isRequired,
  chartType: PropTypes.string.isRequired,
  inlineLabels: PropTypes.bool.isRequired,
  parsedTitle: PropTypes.string.isRequired,
  parsedSubtitle: PropTypes.string.isRequired,
  onDownloadData: PropTypes.func,
  onExpandChart: PropTypes.func,
  isInIframe: PropTypes.bool.isRequired,
  hideExpand: PropTypes.bool.isRequired,
  openChartFullScreen: PropTypes.func.isRequired,
  definition: PropTypes.string,
  note: PropTypes.string,
  source: PropTypes.string,
  annotationsForFooter: PropTypes.string,
  displayNoteAsTooltip: PropTypes.bool.isRequired,
  noteShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  sourceShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  annotationsShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  tooltipContainerId: PropTypes.string,
  displayActionButton: PropTypes.bool.isRequired,
  actionButtonLabel: PropTypes.string.isRequired,
  onActionButtonClick: PropTypes.func.isRequired,
  chartSize: PropTypes.string.isRequired,
  exportDisabled: PropTypes.bool,
};

export default Toolbox;
