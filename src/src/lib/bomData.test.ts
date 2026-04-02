import { describe, it, expect } from 'vitest';
import { removeNode, BOMNode, cloneTree } from './bomData';

describe('removeNode', () => {
  const createMockTree = (): BOMNode[] => [
    {
      id: 'PL-1000',
      name: 'Assembly A',
      type: 'assembly',
      revision: '1.0',
      tags: [],
      quantity: 1,
      findNumber: '1',
      unitOfMeasure: 'ea',
      children: [
        {
          id: 'PL-1001',
          name: 'Sub-assembly B',
          type: 'sub-assembly',
          revision: '1.0',
          tags: [],
          quantity: 2,
          findNumber: '2',
          unitOfMeasure: 'ea',
          children: [
            {
              id: 'PL-1002',
              name: 'Part C',
              type: 'part',
              revision: '1.0',
              tags: [],
              quantity: 4,
              findNumber: '3',
              unitOfMeasure: 'ea',
              children: []
            }
          ]
        },
        {
          id: 'PL-1003',
          name: 'Part D',
          type: 'part',
          revision: '1.0',
          tags: [],
          quantity: 1,
          findNumber: '4',
          unitOfMeasure: 'ea',
          children: []
        }
      ]
    }
  ];

  it('should remove a root-level node and return it', () => {
    const tree = createMockTree();
    const result = removeNode(tree, 'PL-1000');

    expect(result.removed).toBeDefined();
    expect(result.removed?.id).toBe('PL-1000');
    expect(result.tree).toEqual([]);

    // Ensure original tree is untouched
    expect(tree[0].id).toBe('PL-1000');
  });

  it('should remove a nested node and return it', () => {
    const tree = createMockTree();
    const result = removeNode(tree, 'PL-1002');

    expect(result.removed).toBeDefined();
    expect(result.removed?.id).toBe('PL-1002');

    // Check if the tree was modified correctly
    expect(result.tree[0].children[0].children).toEqual([]);

    // Ensure original tree is untouched
    expect(tree[0].children[0].children.length).toBe(1);
    expect(tree[0].children[0].children[0].id).toBe('PL-1002');
  });

  it('should return null for removed if node is not found', () => {
    const tree = createMockTree();
    const result = removeNode(tree, 'PL-9999');

    expect(result.removed).toBeNull();
    // Tree should be structurally identical
    expect(result.tree).toEqual(tree);
  });

  it('should handle an empty array', () => {
    const tree: BOMNode[] = [];
    const result = removeNode(tree, 'PL-1000');

    expect(result.removed).toBeNull();
    expect(result.tree).toEqual([]);
  });

  it('should not mutate the original tree', () => {
    const tree = createMockTree();
    const originalTreeCopy = cloneTree(tree);

    removeNode(tree, 'PL-1001');

    expect(tree).toEqual(originalTreeCopy);
  });
});
