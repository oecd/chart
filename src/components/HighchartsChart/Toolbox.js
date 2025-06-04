import React, { useCallback, useContext } from 'react';
import PropTypes from 'prop-types';

import * as R from 'ramda';

import CsvIcon from '../Icons/CsvIcon';
import DotsIcon from '../Icons/DotsIcon';
import PngIcon from '../Icons/PngIcon';
import SvgIcon from '../Icons/SvgIcon';
import ExpandIcon from '../Icons/ExpandIcon';
import InfoIcon from '../Icons/InfoIcon';
import ActionIcon from '../Icons/ActionIcon';
import { MenuContext, Menu, MenuItem, PopoverContent } from '../floating/Menu';
import { postJson } from '../../utils/fetchUtil';
import { apiUrl } from '../../constants/chart';
import { createExportFileName } from '../../utils/chartUtilCommon';

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
  noteShouldBeDisplayedInTooltip,
  sourceShouldBeDisplayedInTooltip,
  tooltipContainerId,
  displayActionButton,
  actionButtonLabel,
  onActionButtonClick,
  isSmall,
  exportDisabled = false,
}) => {
  const exportImage = useCallback(
    async (chartOptions, format) => {
      const options = R.compose(
        R.when((o) => !R.has('map', o.chart), R.omit(['colorAxis'])),
        R.assocPath(['subtitle', 'text'], parsedSubtitle),
        R.assocPath(['title', 'text'], parsedTitle),
      )(chartOptions);

      try {
        const { exportId } = await postJson(`${apiUrl}/api/public/export`, {
          chartOptions: options,
          format,
          fileName: createExportFileName(),
          chartType,
        });

        window.location.href = `${apiUrl}/api/public/export/${exportId}`;

        if (onDownloadData) {
          onDownloadData();
        }
      } catch {
        // too bad, the export has failed but there is no elegant way to notify the user
      }
    },
    [chartType, onDownloadData, parsedSubtitle, parsedTitle],
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
  )([
    {
      label: 'CSV',
      content: <CsvIcon />,
      disabled: exportDisabled,
      onSelect: () => {
        if (chartRef.current?.chart.downloadCSV) {
          chartRef.current?.chart.downloadCSV();
          if (onDownloadData) {
            onDownloadData();
          }
        }
      },
    },
    {
      label: 'PNG',
      content: <PngIcon />,
      disabled: exportDisabled,
      onSelect: async () => {
        exportImage(chartRef.current?.chart.options, 'png');
      },
    },
    {
      label: 'SVG',
      content: <SvgIcon />,
      disabled: exportDisabled,
      onSelect: () => {
        exportImage(chartRef.current?.chart.options, 'svg');
      },
    },
  ]);

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
          style={{ marginLeft: '4px' }}
        >
          <ActionIcon />
        </div>
      )}

      {(noteShouldBeDisplayedInTooltip ||
        sourceShouldBeDisplayedInTooltip ||
        !R.isNil(definition)) &&
        !isSmall && (
          <Menu
            label={<InfoIcon />}
            placement="bottom-end"
            className="cb-tool"
            isSmall={false}
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
        isSmall={isSmall}
        tooltipContainerId={tooltipContainerId}
        style={{ marginLeft: isSmall ? '4px' : '8px' }}
      >
        <div className={`cb-toolbox ${isSmall ? 'cb-small' : ''}`}>
          {(noteShouldBeDisplayedInTooltip ||
            sourceShouldBeDisplayedInTooltip ||
            !R.isNil(definition)) &&
            isSmall && (
              <Menu
                label={<InfoIcon />}
                placement="left"
                className="cb-tool"
                isSmall={isSmall}
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
  noteShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  sourceShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  tooltipContainerId: PropTypes.string,
  displayActionButton: PropTypes.bool.isRequired,
  actionButtonLabel: PropTypes.string.isRequired,
  onActionButtonClick: PropTypes.func.isRequired,
  isSmall: PropTypes.bool.isRequired,
  exportDisabled: PropTypes.bool,
};

export default Toolbox;
