/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons/faExpandArrowsAlt';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons/faInfoCircle';
import { FloatingPortal } from '@floating-ui/react';
import * as R from 'ramda';

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
    <div
      style={{
        display: 'flex',
        padding: '7px 10px 5px 10px',
      }}
    >
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
                style={{ marginLeft: '4px' }}
                ref={tooltipState.refs.setReference}
                {...tooltipState.getReferenceProps()}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
              </div>
              {tooltipState.open && (
                <FloatingPortal>
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
            style={{ marginLeft: '8px' }}
          />
          {(onExpandChart || !isInIframe) && !hideExpand && (
            <div
              style={{ marginLeft: '8px' }}
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
              <FontAwesomeIcon icon={faExpandArrowsAlt} />
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
  chartRef: PropTypes.object.isRequired,
};

export default Header;
