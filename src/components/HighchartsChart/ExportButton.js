/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faFileImage } from '@fortawesome/free-solid-svg-icons/faFileImage';
import { faFileCsv } from '@fortawesome/free-solid-svg-icons/faFileCsv';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  useClick,
  useDismiss,
  useRole,
  useListNavigation,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react';
import * as R from 'ramda';

import { isNilOrEmpty, mapWithIndex } from '../../utils/ramdaUtil';

const ExportButton = ({
  chartRef,
  parsedTitle,
  parsedSubtitle,
  onDownloadData = null,
  disabled = false,
  style = {},
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  const { x, y, strategy, refs, context } = useFloating({
    placement: 'bottom-end',
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset({
        mainAxis: 2,
        crossAxis: 6,
      }),
      flip({ padding: 10 }),
    ],
  });

  const listRef = useRef([]);

  const click = useClick(context, { event: 'mousedown' });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, role, listNav],
  );

  const options = [
    {
      label: 'CSV',
      icon: faFileCsv,
      onSelect: () => {
        if (chartRef.current?.chart.downloadCSV) {
          chartRef.current?.chart.downloadCSV();
        }
      },
    },
    {
      label: 'PNG',
      icon: faFileImage,
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
      },
    },
  ];

  const handleSelect = (index) => {
    R.nth(index, options).onSelect();
    setOpen(false);
    if (onDownloadData) {
      onDownloadData();
    }
  };

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={disabled ? 'cb-toolbar-disabled' : 'cb-toolbar'}
        style={style}
        role="button"
        tabIndex={0}
      >
        <FontAwesomeIcon icon={faDownload} />
      </div>
      {!disabled && (
        <FloatingPortal>
          {open && (
            <FloatingFocusManager
              context={context}
              modal={false}
              initialFocus={-1}
            >
              <div
                ref={refs.setFloating}
                className="cb-floating"
                style={{
                  position: strategy,
                  top: y ?? 0,
                  left: x ?? 0,
                  overflowY: 'auto',
                  outline: 0,
                }}
                {...getFloatingProps()}
              >
                {mapWithIndex(
                  (o, i) => (
                    <div
                      key={o.label}
                      ref={(el) => {
                        listRef.current[i] = el;
                      }}
                      tabIndex={i === activeIndex ? 0 : -1}
                      className={`cb-toolbar-menu-item ${
                        i === activeIndex ? 'cb-toolbar-menu-item-active' : ''
                      }`}
                      {...getItemProps({
                        onClick() {
                          handleSelect(i);
                        },
                        onKeyDown(event) {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleSelect(i);
                          }
                        },
                      })}
                    >
                      <FontAwesomeIcon
                        icon={o.icon}
                        className="cb-toolbar-menu-item-icon"
                      />
                      {o.label}
                    </div>
                  ),
                  options,
                )}
              </div>
            </FloatingFocusManager>
          )}
        </FloatingPortal>
      )}
    </>
  );
};

ExportButton.propTypes = {
  chartRef: PropTypes.object.isRequired,
  parsedTitle: PropTypes.string.isRequired,
  parsedSubtitle: PropTypes.string.isRequired,
  onDownloadData: PropTypes.func,
  disabled: PropTypes.bool,
  style: PropTypes.object,
};

export default ExportButton;
