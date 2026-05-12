import * as R from 'ramda';

import { mapWithIndex } from './ramdaUtil';

export const createFromToPoints = (data) =>
  R.compose(
    R.unnest,
    R.map((s) =>
      mapWithIndex(
        (c, i) => ({
          from: c.code,
          to: s.code,
          weight: R.path([i, 'value'], s.data),
          custom: R.path([i, 'custom'], s.data),
        }),
        data.categories,
      ),
    ),
  )(data.series);

const createKeyFromFromToPoint = ({ from, to }) => `${from}|${to}`;

const getAllNodes = (fromToPoints) =>
  R.union(
    R.map(R.prop('from'), fromToPoints),
    R.map(R.prop('to'), fromToPoints),
  );

// propagates newAncestors to startNode and all its descendants (BFS), stopping a branch
// early when a node's ancestor set does not change (no new information to propagate).
const propagateAncestorsToDescendants = (
  newAncestors,
  startNode,
  ancestorsByNode,
  childrenByNode,
) =>
  R.until(
    (acc) => R.isEmpty(acc.queue),
    (acc) => {
      const currentQueueItem = R.head(acc.queue);
      const queueTail = R.tail(acc.queue);
      const currentAncestors = R.propOr(
        [],
        currentQueueItem,
        acc.ancestorsByNode,
      );
      const updatedAncestors = R.union(currentAncestors, newAncestors);
      const hasChanged =
        R.length(updatedAncestors) > R.length(currentAncestors);

      return {
        queue: hasChanged
          ? R.union(
              queueTail,
              R.propOr([], currentQueueItem, acc.childrenByNode),
            )
          : queueTail,
        ancestorsByNode: hasChanged
          ? R.assoc(currentQueueItem, updatedAncestors, acc.ancestorsByNode)
          : acc.ancestorsByNode,
        childrenByNode: acc.childrenByNode,
      };
    },
    { queue: [startNode], ancestorsByNode, childrenByNode },
  );

const rejectFromToPointsThatCreateParentChildLoops = (fromToPoints) => {
  const { filteredFromToPoints } = R.reduce(
    (acc, ftp) => {
      const fromToKey = createKeyFromFromToPoint(ftp);
      const toFromKey = createKeyFromFromToPoint({
        from: ftp.to,
        to: ftp.from,
      });
      const ancestorsOfFrom = R.propOr([], ftp.from, acc.ancestorsByNode);

      if (
        R.includes(fromToKey, acc.existingKeys) ||
        R.includes(toFromKey, acc.existingKeys) ||
        R.includes(ftp.to, ancestorsOfFrom)
      ) {
        return acc;
      }

      const { ancestorsByNode: newAncestorsByNode } =
        propagateAncestorsToDescendants(
          R.append(ftp.from, ancestorsOfFrom),
          ftp.to,
          acc.ancestorsByNode,
          acc.childrenByNode,
        );

      return {
        filteredFromToPoints: R.append(ftp, acc.filteredFromToPoints),
        existingKeys: R.append(fromToKey, acc.existingKeys),
        ancestorsByNode: newAncestorsByNode,
        childrenByNode: R.assoc(
          ftp.from,
          R.append(ftp.to, R.propOr([], ftp.from, acc.childrenByNode)),
          acc.childrenByNode,
        ),
      };
    },
    {
      filteredFromToPoints: [],
      existingKeys: [],
      ancestorsByNode: {},
      childrenByNode: {},
    },
    fromToPoints,
  );

  return filteredFromToPoints;
};

// it is not mentionned in the documentation but Highcharts relies on ordered data for Sankey charts
// and generates buggy charts if data is not ordered as expected.
// the correct ordering can only be achived once the from and to "columns" are known
// but the from and to "columns" can only be calculated once the potential infinite parent-child loops are removed,
// hence the need to do so before calculating the from and to "columns"
// https://github.com/highcharts/highcharts/issues/9818
export const rejectInvalidFromToPoints = (fromToPoints) =>
  R.compose(
    rejectFromToPointsThatCreateParentChildLoops,
    R.reject(
      (ftp) =>
        ftp.from === ftp.to ||
        R.isNil(ftp.weight) ||
        ftp.weight === 0 ||
        R.isNil(ftp.from) ||
        R.isNil(ftp.to),
    ),
  )(fromToPoints);

const calcColumnByNode = (fromToPoints) => {
  const allNodes = getAllNodes(fromToPoints);

  const { parentsByNode, childrenByNode } = R.reduce(
    (acc, { from, to }) => ({
      parentsByNode: R.evolve({ [to]: R.append(from) }, acc.parentsByNode),
      childrenByNode: R.evolve({ [from]: R.append(to) }, acc.childrenByNode),
    }),
    {
      parentsByNode: R.fromPairs(R.map((n) => [n, []], allNodes)),
      childrenByNode: R.fromPairs(R.map((n) => [n, []], allNodes)),
    },
    fromToPoints,
  );

  const parentCountByNode = R.compose(
    R.fromPairs,
    R.map((node) => [node, R.length(R.prop(node, parentsByNode))]),
  )(allNodes);

  const rootNodes = R.filter(
    (node) => R.equals(R.prop(node, parentCountByNode), 0),
    allNodes,
  );

  const processQueue = (acc) => {
    const currentQueueItem = R.head(acc.queue);
    const queueTail = R.tail(acc.queue);
    const currentDepth = R.prop(currentQueueItem, acc.depths);
    const children = R.prop(currentQueueItem, childrenByNode);

    return R.reduce(
      (innerAcc, child) => {
        const newDepth = Math.max(
          R.prop(child, innerAcc.depths) || 0,
          currentDepth + 1,
        );
        const newParentCount = R.prop(child, innerAcc.parentCountByNode) - 1;

        return {
          queue:
            newParentCount === 0
              ? R.append(child, innerAcc.queue)
              : innerAcc.queue,
          depths: R.assoc(child, newDepth, innerAcc.depths),
          parentCountByNode: R.assoc(
            child,
            newParentCount,
            innerAcc.parentCountByNode,
          ),
        };
      },
      {
        queue: queueTail,
        depths: acc.depths,
        parentCountByNode: acc.parentCountByNode,
      },
      children,
    );
  };

  const result = R.until((acc) => R.isEmpty(acc.queue), processQueue, {
    queue: rootNodes,
    depths: R.fromPairs(R.map((n) => [n, 0], rootNodes)),
    parentCountByNode,
  });

  return result.depths;
};

export const addFromAndToColumns = (fromToPoints) => {
  const columnByNode = calcColumnByNode(fromToPoints);

  return {
    data: R.map(
      (ftp) => ({
        ...ftp,
        fromColumn: R.prop(ftp.from, columnByNode),
        toColumn: R.prop(ftp.to, columnByNode),
      }),
      fromToPoints,
    ),
    columnByNode,
  };
};
