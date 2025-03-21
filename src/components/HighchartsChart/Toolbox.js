import React, { useState } from 'react';
import PropTypes from 'prop-types';

import * as R from 'ramda';

import { isNilOrEmpty } from '../../utils/ramdaUtil';
import CsvIcon from '../Icons/CsvIcon';
import DotsIcon from '../Icons/DotsIcon';
// import PngIcon from '../Icons/PngIcon';
import SvgIcon from '../Icons/SvgIcon';
import ExpandIcon from '../Icons/ExpandIcon';
import InfoIcon from '../Icons/InfoIcon';
import { Popover, PopoverTrigger, PopoverContent } from '../floating/Popover';

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
  isSmall,
  exportDisabled = false,
}) => {
  const [open, setOpen] = useState(false);

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
          setOpen(false);
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
        setOpen(false);
      },
    },
    // {
    //   label: 'PNG',
    //   content: <PngIcon />,
    //   disabled: exportDisabled,
    //   onSelect: () => {
    //     chartRef.current?.chart.exportChartLocal(undefined, {
    //       title: {
    //         text: parsedTitle,
    //       },
    //       subtitle: {
    //         text: parsedSubtitle,
    //       },
    //       ...(!isNilOrEmpty(parsedTitle) || !isNilOrEmpty(parsedSubtitle)
    //         ? { chart: { marginTop: undefined } }
    //         : {}),
    //     });
    //     if (onDownloadData) {
    //       onDownloadData();
    //     }
    //     setOpen(false);
    //   },
    // },
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
        setOpen(false);
      },
    },
  ]);

  return (
    <Popover
      placement="bottom-end"
      offsetConfig={isSmall ? 4 : 8}
      open={open}
      setOpen={setOpen}
    >
      <PopoverTrigger>
        <div
          className="cb-tool"
          style={{ marginLeft: isSmall ? '4px' : '8px' }}
          role="button"
          tabIndex={0}
          aria-label="Toolbox"
        >
          <div
            style={{
              display: 'flex',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'all 250ms',
            }}
          >
            <DotsIcon />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent tooltipContainerId={tooltipContainerId}>
        <div className={`cb-toolbox ${isSmall ? 'cb-small' : ''}`}>
          {(noteAndSourceShouldBeDisplayedInTooltip || !R.isNil(definition)) &&
            isSmall && (
              <Popover
                placement="left-start"
                offsetConfig={isSmall ? 4 : 8}
                openTrigger="hover"
              >
                <PopoverTrigger>
                  <div
                    aria-label="Info"
                    className="cb-tool"
                    role="button"
                    tabIndex={0}
                  >
                    <InfoIcon />
                  </div>
                </PopoverTrigger>
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
              </Popover>
            )}
          {R.map(
            (i) => (
              <div
                key={i.label}
                aria-label={i.label}
                className={`cb-tool ${i.disabled ? 'cb-disabled' : ''}`}
                disabled
                role="button"
                tabIndex={0}
                onClick={i.onSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    i.onSelect();
                  }
                }}
              >
                {i.content}
              </div>
            ),
            menuItems,
          )}
        </div>
      </PopoverContent>
    </Popover>
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
  isSmall: PropTypes.bool.isRequired,
  exportDisabled: PropTypes.bool,
};

export default Toolbox;
