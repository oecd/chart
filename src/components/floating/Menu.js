/* eslint-disable react/display-name */
import React, {
  useRef,
  createContext,
  useState,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingList,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useHover,
  useInteractions,
  useListItem,
  useListNavigation,
  useMergeRefs,
  useRole,
  useTransitionStyles,
} from '@floating-ui/react';
import * as R from 'ramda';

export const MenuContext = createContext({
  getItemProps: () => ({}),
  activeIndex: null,
  setActiveIndex: () => {},
  isOpen: false,
  isMounted: false,
  transitionStyles: {},
  parentContext: {},
  parentGetFloatingProps: () => ({}),
});

export const MenuComponent = forwardRef(
  (
    {
      label,
      placement = 'bottom',
      isSmall,
      containsPopover = false,
      tooltipContainerId,
      className = '',
      style = {},
      children,
      ...otherProps
    },
    forwardedRef,
  ) => {
    const [isOpen, setIsOpen] = useState(false);

    const onOpenChange = useCallback((open, event) => {
      if (!open) {
        event.target.blur();
      }

      setIsOpen(open);
    }, []);

    const [activeIndex, setActiveIndex] = useState(null);

    const elementsRef = useRef([]);
    const labelsRef = useRef([]);
    const parent = useContext(MenuContext);

    const tree = useFloatingTree();
    const nodeId = useFloatingNodeId();
    const parentId = useFloatingParentNodeId();
    const item = useListItem();

    const isNested = parentId != null;

    const { floatingStyles, refs, context } = useFloating({
      nodeId,
      open: isOpen,
      onOpenChange,
      placement,
      middleware: [
        offset(isSmall ? 4 : 8),
        flip({
          crossAxis: R.includes('-', placement),
          fallbackAxisSideDirection: 'end',
        }),
        shift(),
      ],
      whileElementsMounted: autoUpdate,
    });

    const hover = useHover(context, {
      handleClose: safePolygon({ blockPointerEvents: true }),
    });
    const click = useClick(context, {
      event: 'mousedown',
    });
    const role = useRole(context, { role: 'menu' });
    const dismiss = useDismiss(context);
    const { isMounted, styles: transitionStyles } =
      useTransitionStyles(context);

    const listNavigation = useListNavigation(context, {
      listRef: elementsRef,
      activeIndex,
      nested: isNested,
      onNavigate: setActiveIndex,
    });

    const { getReferenceProps, getFloatingProps, getItemProps } =
      useInteractions([hover, click, role, dismiss, listNavigation]);

    useEffect(() => {
      if (!tree) {
        return null;
      }

      const handleTreeClick = () => {
        setIsOpen(false);
      };

      const onSubMenuOpen = (event) => {
        if (event.nodeId !== nodeId && event.parentId === parentId) {
          setIsOpen(false);
        }
      };

      tree.events.on('click', handleTreeClick);
      tree.events.on('menuopen', onSubMenuOpen);

      return () => {
        tree.events.off('click', handleTreeClick);
        tree.events.off('menuopen', onSubMenuOpen);
      };
    }, [tree, nodeId, parentId]);

    useEffect(() => {
      if (isOpen && tree) {
        tree.events.emit('menuopen', { parentId, nodeId });
      }
    }, [tree, isOpen, nodeId, parentId]);

    const focusManagerProps = containsPopover
      ? {
          order: ['reference', 'content'],
        }
      : {
          initialFocus: isNested ? -1 : 0,
          returnFocus: !isNested,
        };

    const contextValue = useMemo(
      () => ({
        getItemProps,
        isOpen,
        isMounted,
        transitionStyles,
        parentContext: context,
        parentGetFloatingProps: getFloatingProps,
      }),
      [
        getItemProps,
        isOpen,
        isMounted,
        transitionStyles,
        context,
        getFloatingProps,
      ],
    );

    const tabIndex = useMemo(
      () =>
        R.ifElse(
          () => isNested,
          () => (parent.activeIndex === item.index ? 0 : -1),
          () => undefined,
        )(),
      [isNested, item.index, parent.activeIndex],
    );

    return (
      <MenuContext.Provider value={contextValue}>
        <FloatingNode id={nodeId}>
          <button
            ref={useMergeRefs([refs.setReference, item.ref, forwardedRef])}
            tabIndex={tabIndex}
            type="button"
            className={className}
            {...getReferenceProps(
              parent.getItemProps({
                ...otherProps,
                onFocus(event) {
                  otherProps.onFocus?.(event);
                },
              }),
            )}
            style={style}
          >
            {label}
          </button>
          <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
            {isMounted && (
              <FloatingPortal id={tooltipContainerId}>
                <FloatingFocusManager
                  context={context}
                  modal={false}
                  {...focusManagerProps}
                >
                  <div
                    ref={refs.setFloating}
                    style={{ outline: 0, ...floatingStyles }}
                    {...getFloatingProps()}
                  >
                    <div style={{ ...transitionStyles }}>{children}</div>
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            )}
          </FloatingList>
        </FloatingNode>
      </MenuContext.Provider>
    );
  },
);

MenuComponent.propTypes = {
  placement: PropTypes.string,
  label: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
    PropTypes.string,
  ]).isRequired,
  isSmall: PropTypes.string.isRequired,
  containsPopover: PropTypes.bool,
  tooltipContainerId: PropTypes.string,
  className: PropTypes.stgring,
  style: PropTypes.object,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
};

export const MenuItem = forwardRef(
  ({ disabled, className = '', children, ...otherProps }, forwardedRef) => {
    const menu = useContext(MenuContext);
    const item = useListItem();
    const tree = useFloatingTree();
    const isActive = item.index === menu.activeIndex;

    return (
      <button
        {...otherProps}
        ref={useMergeRefs([item.ref, forwardedRef])}
        type="button"
        role="menuitem"
        className={className}
        tabIndex={isActive ? 0 : -1}
        disabled={disabled}
        {...menu.getItemProps({
          onClick(event) {
            otherProps.onClick?.(event);
            tree?.events.emit('click');
          },
          onFocus(event) {
            otherProps.onFocus?.(event);
          },
        })}
      >
        {children}
      </button>
    );
  },
);

MenuItem.propTypes = {
  disabled: PropTypes.bool,
  className: PropTypes.stgring,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
    PropTypes.string,
  ]).isRequired,
};

export const PopoverContent = forwardRef(
  (
    { style = {}, tooltipContainerId, children, ...otherProps },
    forwardedRef,
  ) => {
    const {
      parentContext,
      parentGetFloatingProps,
      isMounted,
      transitionStyles,
    } = useContext(MenuContext);

    const ref = useMergeRefs([parentContext.refs.setFloating, forwardedRef]);

    return isMounted ? (
      <FloatingPortal id={tooltipContainerId}>
        <FloatingFocusManager
          context={parentContext}
          modal
          order={['reference', 'content']}
        >
          <div
            ref={ref}
            style={{
              ...parentContext.floatingStyles,
              ...style,
            }}
            {...parentGetFloatingProps(otherProps)}
          >
            <div style={{ ...transitionStyles }}>{children}</div>
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
    PropTypes.string,
  ]).isRequired,
};

export const Menu = forwardRef((props, forwardedRef) => {
  const parentId = useFloatingParentNodeId();

  if (parentId === null) {
    return (
      <FloatingTree>
        <MenuComponent {...props} ref={forwardedRef} />
      </FloatingTree>
    );
  }

  return <MenuComponent {...props} ref={forwardedRef} />;
});
