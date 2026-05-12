import { rejectInvalidFromToPoints, addFromAndToColumns } from '../sankeyUtil';

describe('rejectInvalidFromToPoints', () => {
  test('should remove all "easy to detect" invalid from-to points', () => {
    const fromToPoints = [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'A', to: 'A', weight: 1 },
      { from: 'B', to: 'C', weight: null },
      { from: 'B', to: 'C', weight: 0 },
      { from: null, to: 'C', weight: 1 },
      { from: 'B', to: null, weight: 1 },
    ];

    const result = rejectInvalidFromToPoints(fromToPoints);

    expect(result).toEqual([{ from: 'A', to: 'B', weight: 1 }]);
  });

  test('should remove from-to points that create parent-child infinite loops', () => {
    const fromToPoints = [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 2 },
      { from: 'C', to: 'D', weight: 3 },
      { from: 'D', to: 'A', weight: 4 },
      { from: 'E', to: 'F', weight: 5 },
      { from: 'F', to: 'E', weight: 6 },
    ];

    const result = rejectInvalidFromToPoints(fromToPoints);

    expect(result).toEqual([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 2 },
      { from: 'C', to: 'D', weight: 3 },
      { from: 'E', to: 'F', weight: 5 },
    ]);
  });

  test('should remove from-to points that create parent-child infinite loops across branches', () => {
    const fromToPoints = [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'A', to: 'C', weight: 1 },
      { from: 'B', to: 'D', weight: 1 },
      { from: 'C', to: 'E', weight: 1 },
      { from: 'D', to: 'A', weight: 1 },
      { from: 'E', to: 'A', weight: 1 },
    ];

    const result = rejectInvalidFromToPoints(fromToPoints);

    expect(result).toEqual([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'A', to: 'C', weight: 1 },
      { from: 'B', to: 'D', weight: 1 },
      { from: 'C', to: 'E', weight: 1 },
    ]);
  });
});

describe('addFromAndToColumns', () => {
  test('should add fromColumn and toColumn', () => {
    const fromToPoints = [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 1 },
      { from: 'A', to: 'C', weight: 1 },
    ];

    const result = addFromAndToColumns(fromToPoints);

    expect(result).toEqual({
      data: [
        { from: 'A', to: 'B', weight: 1, fromColumn: 0, toColumn: 1 },
        { from: 'B', to: 'C', weight: 1, fromColumn: 1, toColumn: 2 },
        { from: 'A', to: 'C', weight: 1, fromColumn: 0, toColumn: 2 },
      ],
      columnByNode: { A: 0, B: 1, C: 2 },
    });
  });
});
