/* eslint-disable react/jsx-props-no-spreading, , jsx-a11y/control-has-associated-label */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import Toolbox from './Toolbox';

const Header = ({
  chartType,
  title,
  subtitle,
  definition = null,
  note = null,
  source = null,
  lang,
  canTitleAndSubtitleBeDisplayed,
  displayNoteAsTooltip,
  noteShouldBeDisplayedInTooltip,
  sourceShouldBeDisplayedInTooltip,
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
          <Toolbox
            chartRef={chartRef}
            chartType={chartType}
            parsedTitle={title}
            parsedSubtitle={subtitle}
            onDownloadData={onDownloadData}
            onExpandChart={onExpandChart}
            isInIframe={isInIframe}
            hideExpand={hideExpand}
            openChartFullScreen={openChartFullScreen}
            definition={definition}
            note={note}
            source={source}
            lang={lang}
            displayNoteAsTooltip={displayNoteAsTooltip}
            noteShouldBeDisplayedInTooltip={noteShouldBeDisplayedInTooltip}
            sourceShouldBeDisplayedInTooltip={sourceShouldBeDisplayedInTooltip}
            tooltipContainerId={tooltipContainerId}
            displayActionButton={displayActionButton}
            actionButtonLabel={actionButtonLabel}
            onActionButtonClick={onActionButtonClick}
            isSmall={isSmall}
            exportDisabled={exportDisabled}
          />
        </div>
      )}
    </div>
  );
};

Header.propTypes = {
  chartType: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  definition: PropTypes.string,
  note: PropTypes.string,
  source: PropTypes.string,
  lang: PropTypes.string.isRequired,
  canTitleAndSubtitleBeDisplayed: PropTypes.bool.isRequired,
  displayNoteAsTooltip: PropTypes.bool.isRequired,
  noteShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
  sourceShouldBeDisplayedInTooltip: PropTypes.bool.isRequired,
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
