import React, { useContext } from 'react';
import PropTypes from 'prop-types';

import * as R from 'ramda';

import { isNilOrEmpty } from '../../utils/ramdaUtil';
import CsvIcon from '../Icons/CsvIcon';
import DotsIcon from '../Icons/DotsIcon';
import PngIcon from '../Icons/PngIcon';
import SvgIcon from '../Icons/SvgIcon';
import ExpandIcon from '../Icons/ExpandIcon';
import InfoIcon from '../Icons/InfoIcon';
import ActionIcon from '../Icons/ActionIcon';
import { MenuContext, Menu, MenuItem, PopoverContent } from '../floating/Menu';

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
  parsedTitle,
  parsedSubtitle,
  onDownloadData = null,
  onExpandChart = null,
  isInIframe,
  hideExpand,
  openChartFullScreen,
  definition,
  noteAndSource,
  noteAndSourceShouldBeDisplayedInTooltip,
  tooltipContainerId,
  displayActionButton,
  actionButtonLabel,
  onActionButtonClick,
  isSmall,
  exportDisabled = false,
  debug = false,
}) => {
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
    R.when(
      () => debug,
      R.insert(1, {
        label: 'PNG',
        content: <PngIcon />,
        disabled: exportDisabled,
        onSelect: () => {
          chartRef.current?.chart.exportChartLocal(undefined, {
            title: {
              text: parsedTitle,
            },
            subtitle: {
              text: parsedSubtitle,
            },
            ...(!isNilOrEmpty(parsedTitle) || !isNilOrEmpty(parsedSubtitle)
              ? { chart: { marginTop: undefined } }
              : {}),
          });
          if (onDownloadData) {
            onDownloadData();
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
      label: 'SVG',
      content: <SvgIcon />,
      disabled: exportDisabled,
      onSelect: () => {
        chartRef.current?.chart.exportChartLocal(
          { type: 'image/svg+xml' },
          {
            title: {
              text: parsedTitle,
            },
            subtitle: {
              text: parsedSubtitle,
            },
            ...(!isNilOrEmpty(parsedTitle) || !isNilOrEmpty(parsedSubtitle)
              ? { chart: { marginTop: undefined } }
              : {}),
          },
        );
        if (onDownloadData) {
          onDownloadData();
        }
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

      {(noteAndSourceShouldBeDisplayedInTooltip || !R.isNil(definition)) &&
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
                  __html: noteAndSourceShouldBeDisplayedInTooltip
                    ? R.join('', [definition, noteAndSource])
                    : definition,
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
          {(noteAndSourceShouldBeDisplayedInTooltip || !R.isNil(definition)) &&
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
                      __html: noteAndSourceShouldBeDisplayedInTooltip
                        ? R.join('', [definition, noteAndSource])
                        : definition,
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
  parsedTitle: PropTypes.string.isRequired,
  parsedSubtitle: PropTypes.string.isRequired,
  onDownloadData: PropTypes.func,
  onExpandChart: PropTypes.func,
  isInIframe: PropTypes.bool.isRequired,
  hideExpand: PropTypes.bool.isRequired,
  openChartFullScreen: PropTypes.func.isRequired,
  definition: PropTypes.string,
  noteAndSource: PropTypes.string,
  noteAndSourceShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  tooltipContainerId: PropTypes.string,
  displayActionButton: PropTypes.bool.isRequired,
  actionButtonLabel: PropTypes.string.isRequired,
  onActionButtonClick: PropTypes.func.isRequired,
  isSmall: PropTypes.bool.isRequired,
  exportDisabled: PropTypes.bool,
  debug: PropTypes.bool,
};

export default Toolbox;
