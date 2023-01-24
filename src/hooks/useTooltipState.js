import { useMemo, useState } from 'react';
import {
  useFloating,
  autoUpdate,
  autoPlacement,
  offset,
  shift,
  useHover,
  safePolygon,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
} from '@floating-ui/react';

const useTooltipState = () => {
  const [open, setOpen] = useState(false);

  const data = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: 'fixed',
    placement: 'bottom',
    whileElementsMounted: autoUpdate,
    middleware: [offset(5), autoPlacement(), shift()],
  });

  const { context } = data;

  const hover = useHover(context, { handleClose: safePolygon() });
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

export default useTooltipState;
