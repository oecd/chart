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
  safePolygon,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  useMergeRefs,
  FloatingPortal,
} from '@floating-ui/react';
import * as R from 'ramda';

export const useTooltip = ({ placement = 'top', offsetConfig = 8 }) => {
  const [open, setOpen] = useState(false);

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetConfig),
      flip({
        crossAxis: R.includes('-', placement),
        fallbackAxisSideDirection: 'start',
      }),
      shift(),
    ],
  });

  const { context } = data;

  const hover = useHover(context, {
    handleClose: safePolygon(),
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data],
  );
};

const TooltipContext = createContext(null);

export const Tooltip = ({ children, ...options }) => {
  const tooltip = useTooltip(options);
  return (
    <TooltipContext.Provider value={tooltip}>
      {children}
    </TooltipContext.Provider>
  );
};

Tooltip.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};

export const TooltipTrigger = forwardRef(({ children, ...props }, propRef) => {
  const context = useContext(TooltipContext);
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

TooltipTrigger.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};

export const TooltipContent = forwardRef(
  ({ style = {}, tooltipContainerId, ...props }, propRef) => {
    const context = useContext(TooltipContext);
    const ref = useMergeRefs([context.refs.setFloating, propRef]);

    return context.open ? (
      <FloatingPortal id={tooltipContainerId}>
        <div
          ref={ref}
          style={{
            ...context.floatingStyles,
            ...style,
          }}
          {...context.getFloatingProps(props)}
        />
      </FloatingPortal>
    ) : null;
  },
);

TooltipContent.propTypes = {
  style: PropTypes.object,
  tooltipContainerId: PropTypes.string,
};
