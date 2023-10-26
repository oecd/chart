/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useState,
  useMemo,
  createContext,
  useContext,
  forwardRef,
  cloneElement,
} from 'react';
import PropTypes from 'prop-types';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  useMergeRefs,
  FloatingPortal,
  FloatingFocusManager,
  useTransitionStyles,
} from '@floating-ui/react';
import * as R from 'ramda';

export const usePopover = ({
  placement = 'bottom',
  modal,
  offsetConfig = 0,
  open: controlledOpen,
  setOpen: setControlledOpen,
}) => {
  const [open, setOpen] = useState(false);
  const data = useFloating({
    placement,
    open: controlledOpen ?? open,
    onOpenChange: setControlledOpen ?? setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetConfig),
      flip({
        crossAxis: R.includes('-', placement),
        fallbackAxisSideDirection: 'end',
      }),
      shift(),
    ],
  });
  const { context } = data;

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const interactions = useInteractions([click, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
      modal,
      transitionStyles,
      isMounted,
    }),
    [open, setOpen, interactions, data, modal, transitionStyles, isMounted],
  );
};

const PopoverContext = createContext(null);

export const Popover = ({ children, modal = true, ...restOptions }) => {
  const popover = usePopover({ modal, ...restOptions });
  return (
    <PopoverContext.Provider value={popover}>
      {children}
    </PopoverContext.Provider>
  );
};

Popover.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
  modal: PropTypes.bool,
};

export const PopoverTrigger = forwardRef(({ children, ...props }, propRef) => {
  const context = useContext(PopoverContext);
  const childrenRef = children.ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  return cloneElement(
    children,
    context.getReferenceProps({
      ref,
      ...props,
      ...children.props,
      'data-state': context.open ? 'open' : 'closed',
    }),
  );
});

PopoverTrigger.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};

export const PopoverContent = forwardRef(
  ({ style = {}, tooltipContainerId, ...props }, propRef) => {
    const { context: floatingContext, ...context } = useContext(PopoverContext);
    const ref = useMergeRefs([context.refs.setFloating, propRef]);

    return context.isMounted ? (
      <FloatingPortal id={tooltipContainerId}>
        <FloatingFocusManager
          context={floatingContext}
          modal={context.modal}
          order={['reference', 'content']}
        >
          <div
            ref={ref}
            style={{
              ...context.floatingStyles,
              ...style,
            }}
            {...context.getFloatingProps(props)}
          >
            <div style={{ ...context.transitionStyles }}>{props.children}</div>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    ) : null;
  },
);

PopoverContent.propTypes = {
  tooltipContainerId: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};
