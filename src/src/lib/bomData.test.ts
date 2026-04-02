import { describe, it, expect } from 'vitest';
import { searchTree, BOMNode } from './bomData';

const mockTree: BOMNode[] = [
  {
    id: "10000000",
    name: "Main Assembly",
    type: "assembly",
    revision: "A",
    tags: ["Core", "Structural"],
    quantity: 1,
    findNumber: "—",
    unitOfMeasure: "EA",
    children: [
      {
        id: "10000001",
        name: "Sub Assembly 1",
        type: "sub-assembly",
        revision: "A",
        tags: ["Mechanical"],
        quantity: 2,
        findNumber: "10",
        unitOfMeasure: "EA",
        children: [
          {
            id: "10000011",
            name: "Part A",
            type: "part",
            revision: "A",
            tags: ["Wear Part"],
            quantity: 4,
            findNumber: "10",
            unitOfMeasure: "EA",
            children: []
          },
          {
            id: "10000012",
            name: "Part B",
            type: "part",
            revision: "B",
            tags: ["Fastener"],
            quantity: 10,
            findNumber: "20",
            unitOfMeasure: "EA",
            children: []
          }
        ]
      },
      {
        id: "10000002",
        name: "Electrical Module",
        type: "sub-assembly",
        revision: "B",
        tags: ["Electrical", "High Voltage"],
        quantity: 1,
        findNumber: "20",
        unitOfMeasure: "EA",
        children: [
          {
            id: "10000021",
            name: "Controller Board",
            type: "part",
            revision: "C",
            tags: ["Electronics", "PCB"],
            quantity: 1,
            findNumber: "10",
            unitOfMeasure: "EA",
            children: []
          }
        ]
      }
    ]
  }
];

describe('searchTree', () => {
  it('should return an empty set if the query is empty', () => {
    const result = searchTree(mockTree, "");
    expect(result.size).toBe(0);

    const resultWithSpaces = searchTree(mockTree, "   ");
    expect(resultWithSpaces.size).toBe(0);
  });

  it('should match a node by name and include ancestors', () => {
    // "Part A" should match ID "10000011", and its ancestors "10000001" and "10000000"
    const result = searchTree(mockTree, "Part A");
    expect(result.has("10000011")).toBe(true);
    expect(result.has("10000001")).toBe(true);
    expect(result.has("10000000")).toBe(true);
    expect(result.size).toBe(3); // no other nodes should be matched
  });

  it('should match a node by id and include ancestors', () => {
    // Match "10000021", and ancestors "10000002" and "10000000"
    const result = searchTree(mockTree, "10000021");
    expect(result.has("10000021")).toBe(true);
    expect(result.has("10000002")).toBe(true);
    expect(result.has("10000000")).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should match a node by tags and include ancestors', () => {
    // Match "Fastener", which is a tag on "10000012", ancestors "10000001", "10000000"
    const result = searchTree(mockTree, "Fastener");
    expect(result.has("10000012")).toBe(true);
    expect(result.has("10000001")).toBe(true);
    expect(result.has("10000000")).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should be case-insensitive for search queries', () => {
    const result = searchTree(mockTree, "pArT B");
    expect(result.has("10000012")).toBe(true);
    expect(result.has("10000001")).toBe(true);
    expect(result.has("10000000")).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should return multiple branches if there are multiple matches', () => {
    // "Assembly" should match "Main Assembly" and "Sub Assembly 1"
    const result = searchTree(mockTree, "Assembly");
    expect(result.has("10000000")).toBe(true);
    expect(result.has("10000001")).toBe(true);
    // Note: It shouldn't match "10000002" or "10000011", etc unless they contain "Assembly"
    expect(result.has("10000002")).toBe(false);
    expect(result.size).toBe(2);
  });

  it('should match all paths containing a generic term like "part"', () => {
    const result = searchTree(mockTree, "part");
    // "Part A", "Part B", "Wear Part"
    // ID 10000011 matched by name & tag
    // ID 10000012 matched by name
    expect(result.has("10000011")).toBe(true);
    expect(result.has("10000012")).toBe(true);
    expect(result.has("10000001")).toBe(true); // ancestor
    expect(result.has("10000000")).toBe(true); // ancestor

    // Nothing in Electrical Module matches "part"
    expect(result.has("10000002")).toBe(false);
    expect(result.has("10000021")).toBe(false);
    expect(result.size).toBe(4);
  });
});
