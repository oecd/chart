/* eslint-disable react/jsx-props-no-spreading, , jsx-a11y/control-has-associated-label */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import Toolbox from './Toolbox';
import InfoIcon from '../Icons/InfoIcon';
import ActionIcon from '../Icons/ActionIcon';
import { Tooltip, TooltipTrigger, TooltipContent } from '../floating/Tooltip';

const Header = ({
  title,
  subtitle,
  definition = null,
  noteAndSource = null,
  canTitleAndSubtitleBeDisplayed,
  noteAndSourceShouldBeDisplayedInTooltip,
  hideToolbox,
  exportDisabled,
  onDownloadData = null,
  onExpandChart = null,
  hideExpand,
  openChartFullScreen,
  tooltipContainerId,
  displayActionButton,
  actionButtonLabel,
  onActionButtonClick,
  isSmall,
  isFontLoaded,
  chartRef,
}) => {
  const [isInIframe, setIsInIframe] = useState(false);
  useEffect(() => {
    setIsInIframe(window.location !== window.parent.location);
  }, []);

  return (
    <div style={{ display: 'flex', marginBottom: isSmall ? '2px' : '5px' }}>
      <div style={{ flex: '1 1 auto' }}>
        {!R.isEmpty(title) && canTitleAndSubtitleBeDisplayed && (
          <div
            className={`cb-title ${isFontLoaded ? 'cb-font-loaded' : ''}`}
            dangerouslySetInnerHTML={{
              __html: title,
            }}
          />
        )}
        {!R.isEmpty(subtitle) && canTitleAndSubtitleBeDisplayed && (
          <div
            className={`cb-subtitle ${isFontLoaded ? 'cb-font-loaded' : ''}`}
            dangerouslySetInnerHTML={{
              __html: subtitle,
            }}
          />
        )}
      </div>
      {!hideToolbox && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            flexWrap: 'nowrap',
          }}
        >
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
              <Tooltip placement="bottom-end">
                <TooltipTrigger>
                  <div
                    aria-label="Info"
                    className="cb-tool"
                    style={{ marginLeft: '8px' }}
                    role="button"
                    tabIndex={0}
                  >
                    <InfoIcon />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  tooltipContainerId={tooltipContainerId}
                  className="cb-floating cb-tooltip"
                  dangerouslySetInnerHTML={{
                    __html: noteAndSourceShouldBeDisplayedInTooltip
                      ? R.join('', [definition, noteAndSource])
                      : definition,
                  }}
                />
              </Tooltip>
            )}
          <Toolbox
            chartRef={chartRef}
            parsedTitle={title}
            parsedSubtitle={subtitle}
            onDownloadData={onDownloadData}
            onExpandChart={onExpandChart}
            isInIframe={isInIframe}
            hideExpand={hideExpand}
            openChartFullScreen={openChartFullScreen}
            definition={definition}
            noteAndSource={noteAndSource}
            noteAndSourceShouldBeDisplayedInTooltip={
              noteAndSourceShouldBeDisplayedInTooltip
            }
            tooltipContainerId={tooltipContainerId}
            isSmall={isSmall}
            exportDisabled={exportDisabled}
          />
        </div>
      )}
    </div>
  );
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  definition: PropTypes.string,
  noteAndSource: PropTypes.string,
  canTitleAndSubtitleBeDisplayed: PropTypes.bool.isRequired,
  noteAndSourceShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  hideToolbox: PropTypes.bool.isRequired,
  exportDisabled: PropTypes.bool.isRequired,
  onDownloadData: PropTypes.func,
  onExpandChart: PropTypes.func,
  hideExpand: PropTypes.bool.isRequired,
  openChartFullScreen: PropTypes.func.isRequired,
  tooltipContainerId: PropTypes.string,
  displayActionButton: PropTypes.bool.isRequired,
  actionButtonLabel: PropTypes.string.isRequired,
  onActionButtonClick: PropTypes.func.isRequired,
  isSmall: PropTypes.bool.isRequired,
  isFontLoaded: PropTypes.bool.isRequired,
  chartRef: PropTypes.object.isRequired,
};

export default Header;
