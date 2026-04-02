import { describe, it, expect } from 'vitest';
import { cloneTree, BOMNode } from './bomData';

describe('cloneTree', () => {
  it('should clone an empty array', () => {
    const nodes: BOMNode[] = [];
    const cloned = cloneTree(nodes);

    expect(cloned).toEqual([]);
    expect(cloned).not.toBe(nodes);
  });

  it('should clone a flat list of nodes', () => {
    const nodes: BOMNode[] = [
      {
        id: '1',
        name: 'Node 1',
        type: 'part',
        revision: 'A',
        tags: [],
        quantity: 1,
        findNumber: '10',
        unitOfMeasure: 'EA',
        children: []
      },
      {
        id: '2',
        name: 'Node 2',
        type: 'part',
        revision: 'A',
        tags: [],
        quantity: 2,
        findNumber: '20',
        unitOfMeasure: 'EA',
        children: []
      }
    ];

    const cloned = cloneTree(nodes);

    expect(cloned).toEqual(nodes);
    expect(cloned).not.toBe(nodes);
    expect(cloned[0]).not.toBe(nodes[0]);
    expect(cloned[1]).not.toBe(nodes[1]);
  });

  it('should clone a deeply nested tree', () => {
    const nodes: BOMNode[] = [
      {
        id: '1',
        name: 'Assembly 1',
        type: 'assembly',
        revision: 'A',
        tags: ['tag1'],
        quantity: 1,
        findNumber: '10',
        unitOfMeasure: 'EA',
        children: [
          {
            id: '2',
            name: 'Sub-assembly 1',
            type: 'sub-assembly',
            revision: 'A',
            tags: ['tag2'],
            quantity: 2,
            findNumber: '10',
            unitOfMeasure: 'EA',
            children: [
              {
                id: '3',
                name: 'Part 1',
                type: 'part',
                revision: 'B',
                tags: [],
                quantity: 4,
                findNumber: '10',
                unitOfMeasure: 'EA',
                children: []
              }
            ]
          }
        ]
      }
    ];

    const cloned = cloneTree(nodes);

    expect(cloned).toEqual(nodes);
    expect(cloned).not.toBe(nodes);
    expect(cloned[0]).not.toBe(nodes[0]);
    expect(cloned[0].children[0]).not.toBe(nodes[0].children[0]);
    expect(cloned[0].children[0].children[0]).not.toBe(nodes[0].children[0].children[0]);
    expect(cloned[0].tags).not.toBe(nodes[0].tags);
  });

  it('should be a deep clone (modifying clone does not affect original)', () => {
    const nodes: BOMNode[] = [
      {
        id: '1',
        name: 'Original',
        type: 'part',
        revision: 'A',
        tags: ['original-tag'],
        quantity: 1,
        findNumber: '10',
        unitOfMeasure: 'EA',
        children: [
           {
                id: '2',
                name: 'Original Child',
                type: 'part',
                revision: 'A',
                tags: [],
                quantity: 1,
                findNumber: '10',
                unitOfMeasure: 'EA',
                children: []
           }
        ]
      }
    ];

    const cloned = cloneTree(nodes);

    // Modify the clone
    cloned[0].name = 'Modified';
    cloned[0].tags.push('new-tag');
    cloned[0].children[0].name = 'Modified Child';
    cloned.push({
        id: '3',
        name: 'New Node',
        type: 'part',
        revision: 'A',
        tags: [],
        quantity: 1,
        findNumber: '20',
        unitOfMeasure: 'EA',
        children: []
    });

    // Check original remains unchanged
    expect(nodes[0].name).toBe('Original');
    expect(nodes[0].tags).toEqual(['original-tag']);
    expect(nodes[0].children[0].name).toBe('Original Child');
    expect(nodes.length).toBe(1);
  });

  it('should be a deep clone (modifying original does not affect clone)', () => {
    const nodes: BOMNode[] = [
      {
        id: '1',
        name: 'Original',
        type: 'part',
        revision: 'A',
        tags: ['original-tag'],
        quantity: 1,
        findNumber: '10',
        unitOfMeasure: 'EA',
        children: [
           {
                id: '2',
                name: 'Original Child',
                type: 'part',
                revision: 'A',
                tags: [],
                quantity: 1,
                findNumber: '10',
                unitOfMeasure: 'EA',
                children: []
           }
        ]
      }
    ];

    const cloned = cloneTree(nodes);

    // Modify the original
    nodes[0].name = 'Modified Original';
    nodes[0].tags.push('new-tag-on-original');
    nodes[0].children[0].name = 'Modified Original Child';
    nodes.push({
        id: '4',
        name: 'New Original Node',
        type: 'part',
        revision: 'A',
        tags: [],
        quantity: 1,
        findNumber: '30',
        unitOfMeasure: 'EA',
        children: []
    });

    // Check clone remains unchanged
    expect(cloned[0].name).toBe('Original');
    expect(cloned[0].tags).toEqual(['original-tag']);
    expect(cloned[0].children[0].name).toBe('Original Child');
    expect(cloned.length).toBe(1);
  });
});