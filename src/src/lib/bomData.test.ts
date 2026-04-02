import { describe, it, expect } from 'vitest';
import { searchTree, INITIAL_BOM_TREE } from './bomData';

describe('searchTree', () => {
  it('should return an empty set for an empty query', () => {
    const result = searchTree(INITIAL_BOM_TREE, '');
    expect(result.size).toBe(0);
  });

  it('should return an empty set for a whitespace-only query', () => {
    const result = searchTree(INITIAL_BOM_TREE, '   ');
    expect(result.size).toBe(0);
  });

  it('should match nodes by name (case-insensitive)', () => {
    const result = searchTree(INITIAL_BOM_TREE, 'Brake block');
    // "Brake Block" has id "38111001", its ancestors are "38111000" (Brake System), "38110000" (Bogie Assembly), "38100000" (WAP7 Locomotive)
    expect(result.has('38111001')).toBe(true);
    expect(result.has('38111000')).toBe(true);
    expect(result.has('38110000')).toBe(true);
    expect(result.has('38100000')).toBe(true);
    expect(result.size).toBe(4);
  });

  it('should match nodes by ID', () => {
    const result = searchTree(INITIAL_BOM_TREE, '38160002');
    // "38160002" (Bearing Replacement Kit), ancestors: "38160000", "38100000"
    expect(result.has('38160002')).toBe(true);
    expect(result.has('38160000')).toBe(true);
    expect(result.has('38100000')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should match nodes by tag', () => {
    const result = searchTree(INITIAL_BOM_TREE, 'Consumable');
    // "Consumable" tag is on "38160001" (Gasket Set), ancestors: "38160000", "38100000"
    expect(result.has('38160001')).toBe(true);
    expect(result.has('38160000')).toBe(true);
    expect(result.has('38100000')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should return an empty set if no matches are found', () => {
    const result = searchTree(INITIAL_BOM_TREE, 'NonExistentItemXYZ123');
    expect(result.size).toBe(0);
  });

  it('should include ancestors if a child matches', () => {
    const result = searchTree(INITIAL_BOM_TREE, 'pantograph frame');
    // "38150002" (Pantograph Frame) matches. Ancestors: "38150000", "38100000".
    expect(result.has('38150002')).toBe(true);
    expect(result.has('38150000')).toBe(true);
    expect(result.has('38100000')).toBe(true);
    // Should not include siblings
    expect(result.has('38150001')).toBe(false);
  });
});
