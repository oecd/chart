/* eslint-disable react/jsx-props-no-spreading, , jsx-a11y/control-has-associated-label */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FloatingPortal } from '@floating-ui/react';
import * as R from 'ramda';

import InfoIcon from '../Icons/InfoIcon';
import ExpandIcon from '../Icons/ExpandIcon';
import ExportButton from './ExportButton';
import useTooltipState from '../../hooks/useTooltipState';

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
  chartRef,
}) => {
  const tooltipState = useTooltipState();

  const [isInIframe, setIsInIframe] = useState(false);
  useEffect(() => {
    setIsInIframe(window.location !== window.parent.location);
  }, []);

  const fakeTooltipButton =
    R.isNil(noteAndSource) && R.isNil(definition) ? null : (
      <div style={{ width: '20px' }} />
    );

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: '1 1 auto' }}>
        {!R.isEmpty(title) && canTitleAndSubtitleBeDisplayed && (
          <div
            className="cb-title"
            dangerouslySetInnerHTML={{
              __html: title,
            }}
          />
        )}
        {!R.isEmpty(subtitle) && canTitleAndSubtitleBeDisplayed && (
          <div
            className="cb-subtitle"
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
            minHeight: '21px',
          }}
        >
          {noteAndSourceShouldBeDisplayedInTooltip || !R.isNil(definition) ? (
            <>
              <div
                className="cb-toolbar"
                style={{ margin: '2px 0px 0px 4px' }}
                ref={tooltipState.refs.setReference}
                {...tooltipState.getReferenceProps()}
              >
                <InfoIcon />
              </div>
              {tooltipState.open && (
                <FloatingPortal id={tooltipContainerId}>
                  <div
                    ref={tooltipState.refs.setFloating}
                    style={tooltipState.floatingStyles}
                    {...tooltipState.getFloatingProps()}
                    className="cb-floating cb-tooltip"
                    dangerouslySetInnerHTML={{
                      __html: noteAndSourceShouldBeDisplayedInTooltip
                        ? R.join('', [definition, noteAndSource])
                        : definition,
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
            parsedTitle={title}
            parsedSubtitle={subtitle}
            onDownloadData={onDownloadData}
            disabled={exportDisabled}
            style={{ margin: '2px 0px 0px 4px' }}
            tooltipContainerId={tooltipContainerId}
          />
          {(onExpandChart || !isInIframe) && !hideExpand && (
            <div
              style={{ margin: '2px 0px 0px 4px' }}
              className={exportDisabled ? 'cb-toolbar-disabled' : 'cb-toolbar'}
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
              <ExpandIcon />
            </div>
          )}
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
  chartRef: PropTypes.object.isRequired,
};

export default Header;
