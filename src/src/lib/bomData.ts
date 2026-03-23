// ═══════════════════════════════════════════════════════════════════════════════
// LDO-2 EDMS — BOM Data Model, Mock Data, and Tree Utilities
// Every node (assembly → sub-assembly → part) is identified by 8-digit PL number.
// Documents and drawings are linked via PL number.
// ═══════════════════════════════════════════════════════════════════════════════

export type NodeType = 'assembly' | 'sub-assembly' | 'part';
export type LifecycleState = 'Production' | 'Prototyping' | 'In Development' | 'End of Life' | 'Active' | 'Obsolete';
export type DocType = 'Drawing' | 'Specification' | 'Test Report' | 'Procedure' | 'CAD Model' | 'Datasheet' | 'Certificate';

export interface LinkedDocument {
  docId: string;
  title: string;
  type: DocType;
  revision: string;
  status: 'Approved' | 'In Review' | 'Draft' | 'Obsolete';
  fileType: string;
  size: string;
  date: string;
}

export interface LinkedDrawing {
  drawingId: string;
  title: string;
  sheetNo: string;
  revision: string;
  status: 'Released' | 'Preliminary' | 'Superseded';
  format: string;
}

export interface WhereUsedEntry {
  parentPL: string;
  parentName: string;
  quantity: number;
  findNumber: string;
}

export interface ChangeHistoryEntry {
  changeId: string;
  type: 'ECO' | 'ECN' | 'DCR';
  title: string;
  date: string;
  status: 'Implemented' | 'Pending' | 'Cancelled';
  author: string;
}

export interface PLRecord {
  plNumber: string;          // 8-digit PL number
  name: string;
  description: string;
  type: NodeType;
  revision: string;
  lifecycleState: LifecycleState;
  owner: string;
  department: string;
  material?: string;
  weight?: string;
  unitOfMeasure: string;
  classification: string;
  safetyVital: boolean;
  source: 'Make' | 'Buy' | 'Make/Buy';
  supplier?: string;
  supplierPartNo?: string;
  alternates: string[];       // alternate PL numbers
  substitutes: string[];      // substitute PL numbers
  effectivity: {
    serialFrom?: string;
    serialTo?: string;
    dateFrom: string;
    dateTo?: string;
    lotNumbers?: string[];
  };
  linkedDocuments: LinkedDocument[];
  linkedDrawings: LinkedDrawing[];
  whereUsed: WhereUsedEntry[];
  changeHistory: ChangeHistoryEntry[];
  tags: string[];
  lastModified: string;
  createdDate: string;
}

export interface BOMNode {
  id: string;               // 8-digit PL number
  name: string;
  type: NodeType;
  revision: string;
  tags: string[];
  quantity: number;
  findNumber: string;        // sequence/position number
  unitOfMeasure: string;
  referenceDesignator?: string;
  children: BOMNode[];
}

export interface BOMVersion {
  version: number;
  label: string;
  timestamp: string;
  tree: BOMNode[];
}

// ─── TREE UTILITIES ──────────────────────────────────────────────────────────

export function cloneTree(nodes: BOMNode[]): BOMNode[] {
  return JSON.parse(JSON.stringify(nodes));
}

export function findNode(nodes: BOMNode[], id: string): BOMNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(nodes: BOMNode[], id: string, parent: BOMNode | null = null): BOMNode | null {
  for (const node of nodes) {
    if (node.id === id) return parent;
    if (node.children.length > 0) {
      const found = findParent(node.children, id, node);
      if (found) return found;
    }
  }
  return null;
}

export function isDescendant(nodes: BOMNode[], sourceId: string, targetId: string): boolean {
  const sourceNode = findNode(nodes, sourceId);
  if (!sourceNode) return false;
  if (sourceNode.id === targetId) return true;
  for (const child of sourceNode.children) {
    if (isDescendant([child], child.id, targetId) || child.id === targetId) return true;
  }
  return false;
}

export function removeNode(nodes: BOMNode[], id: string): { tree: BOMNode[], removed: BOMNode | null } {
  const tree = cloneTree(nodes);
  let removed: BOMNode | null = null;
  function remove(arr: BOMNode[]): boolean {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].id === id) { removed = arr.splice(i, 1)[0]; return true; }
      if (remove(arr[i].children)) return true;
    }
    return false;
  }
  remove(tree);
  return { tree, removed };
}

export function addNodeToParent(nodes: BOMNode[], parentId: string, node: BOMNode): BOMNode[] {
  const tree = cloneTree(nodes);
  const parent = findNode(tree, parentId);
  if (parent) parent.children.push(JSON.parse(JSON.stringify(node)));
  return tree;
}

export function moveNode(nodes: BOMNode[], nodeId: string, newParentId: string): BOMNode[] | null {
  if (nodeId === newParentId) return null;
  if (isDescendant(nodes, nodeId, newParentId)) return null;
  const { tree, removed } = removeNode(nodes, nodeId);
  if (!removed) return null;
  return addNodeToParent(tree, newParentId, removed);
}

export function getAllIds(nodes: BOMNode[]): string[] {
  const ids: string[] = [];
  function collect(arr: BOMNode[]) {
    for (const n of arr) { ids.push(n.id); collect(n.children); }
  }
  collect(nodes);
  return ids;
}

export function searchTree(nodes: BOMNode[], query: string): Set<string> {
  const matches = new Set<string>();
  if (!query.trim()) return matches;
  const q = query.toLowerCase();
  function search(arr: BOMNode[], ancestors: string[]): boolean {
    let found = false;
    for (const node of arr) {
      const match = node.name.toLowerCase().includes(q) ||
        node.id.toLowerCase().includes(q) ||
        node.tags.some(t => t.toLowerCase().includes(q));
      let childFound = node.children.length > 0 ? search(node.children, [...ancestors, node.id]) : false;
      if (match || childFound) {
        matches.add(node.id);
        ancestors.forEach(a => matches.add(a));
        found = true;
      }
    }
    return found;
  }
  search(nodes, []);
  return matches;
}

export function countNodes(nodes: BOMNode[]): { assemblies: number; parts: number; total: number } {
  let assemblies = 0, parts = 0;
  function count(arr: BOMNode[]) {
    for (const n of arr) {
      if (n.type === 'part') parts++; else assemblies++;
      count(n.children);
    }
  }
  count(nodes);
  return { assemblies, parts, total: assemblies + parts };
}

// Flatten BOM for flat view with rolled-up quantities
export interface FlatBOMEntry {
  plNumber: string;
  name: string;
  type: NodeType;
  revision: string;
  totalQty: number;
  tags: string[];
  level: number;
  parentPath: string;
}

export function flattenBOM(nodes: BOMNode[], parentPath: string = '', level: number = 0): FlatBOMEntry[] {
  const result: FlatBOMEntry[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath} > ${node.name}` : node.name;
    result.push({
      plNumber: node.id,
      name: node.name,
      type: node.type,
      revision: node.revision,
      totalQty: node.quantity,
      tags: node.tags,
      level,
      parentPath: parentPath || '—',
    });
    if (node.children.length > 0) {
      result.push(...flattenBOM(node.children, path, level + 1));
    }
  }
  return result;
}

// ─── PL RECORDS DATABASE (keyed by 8-digit PL number) ────────────────────────

export const PL_DATABASE: Record<string, PLRecord> = {
  // ── ROOT ASSEMBLY ──
  "38100000": {
    plNumber: "38100000",
    name: "WAP7 Locomotive",
    description: "Complete WAP7 class 25kV AC electric locomotive assembly for Indian Railways mainline passenger service. 6120 HP traction power with regenerative braking capability.",
    type: "assembly",
    revision: "D",
    lifecycleState: "Production",
    owner: "R. Krishnamurthy",
    department: "Locomotive Design Bureau",
    weight: "123,000 kg",
    unitOfMeasure: "EA",
    classification: "Rolling Stock — Electric Locomotive",
    safetyVital: true,
    source: "Make",
    alternates: [],
    substitutes: [],
    effectivity: { dateFrom: "2024-01-01", serialFrom: "WAP7-30601", serialTo: "WAP7-30650" },
    linkedDocuments: [
      { docId: "DOC-2026-0001", title: "WAP7 General Arrangement Drawing", type: "Drawing", revision: "D.2", status: "Approved", fileType: "PDF", size: "24.5 MB", date: "2025-11-15" },
      { docId: "DOC-2026-0002", title: "Type Test Certificate — WAP7 Locomotive", type: "Certificate", revision: "C.1", status: "Approved", fileType: "PDF", size: "8.2 MB", date: "2025-08-20" },
      { docId: "DOC-2026-0003", title: "WAP7 Maintenance Manual Volume I", type: "Procedure", revision: "D.0", status: "Approved", fileType: "PDF", size: "156 MB", date: "2026-01-10" },
    ],
    linkedDrawings: [
      { drawingId: "DWG-WAP7-GA-001", title: "General Arrangement — Side Elevation", sheetNo: "1/4", revision: "D.2", status: "Released", format: "A0" },
      { drawingId: "DWG-WAP7-GA-002", title: "General Arrangement — Plan View", sheetNo: "2/4", revision: "D.2", status: "Released", format: "A0" },
      { drawingId: "DWG-WAP7-GA-003", title: "General Arrangement — End Elevation", sheetNo: "3/4", revision: "D.2", status: "Released", format: "A0" },
      { drawingId: "DWG-WAP7-WD-001", title: "Main Wiring Diagram", sheetNo: "1/12", revision: "C.4", status: "Released", format: "A1" },
    ],
    whereUsed: [],
    changeHistory: [
      { changeId: "ECO-2025-1102", type: "ECO", title: "Upgrade traction motor insulation class to H", date: "2025-09-15", status: "Implemented", author: "A. Sharma" },
      { changeId: "ECN-2026-0034", type: "ECN", title: "Rev D release for serial 30601+ batch", date: "2026-01-10", status: "Implemented", author: "R. Krishnamurthy" },
    ],
    tags: ["Railway", "Production", "Electric", "25kV AC"],
    lastModified: "2026-03-20",
    createdDate: "2022-04-01",
  },

  // ── BOGIE ASSEMBLY ──
  "38110000": {
    plNumber: "38110000",
    name: "Bogie Assembly",
    description: "Complete bogie frame assembly with primary/secondary suspension, wheelsets, brake rigging, and traction motor mounting. Fabricated steel construction with bolster and transom design.",
    type: "sub-assembly",
    revision: "C",
    lifecycleState: "Production",
    owner: "D. Mukherjee",
    department: "Bogie Design Division",
    material: "IS 2062 Grade E350 Steel",
    weight: "12,800 kg",
    unitOfMeasure: "EA",
    classification: "Underframe — Bogie",
    safetyVital: true,
    source: "Make",
    alternates: ["38110500"],
    substitutes: [],
    effectivity: { dateFrom: "2024-01-01", serialFrom: "WAP7-30601" },
    linkedDocuments: [
      { docId: "DOC-2026-1101", title: "Bogie Frame Stress Analysis Report", type: "Test Report", revision: "C.0", status: "Approved", fileType: "PDF", size: "34.2 MB", date: "2025-06-10" },
      { docId: "DOC-2026-1102", title: "Bogie Assembly Procedure", type: "Procedure", revision: "B.3", status: "Approved", fileType: "PDF", size: "18.5 MB", date: "2025-09-22" },
      { docId: "DOC-2026-1103", title: "Bogie Dimensional Inspection Spec", type: "Specification", revision: "C.1", status: "Approved", fileType: "PDF", size: "6.8 MB", date: "2025-11-05" },
    ],
    linkedDrawings: [
      { drawingId: "DWG-BOG-ASM-001", title: "Bogie Assembly — General Arrangement", sheetNo: "1/6", revision: "C.0", status: "Released", format: "A0" },
      { drawingId: "DWG-BOG-FRM-001", title: "Bogie Frame — Fabrication Drawing", sheetNo: "1/4", revision: "C.2", status: "Released", format: "A0" },
    ],
    whereUsed: [{ parentPL: "38100000", parentName: "WAP7 Locomotive", quantity: 2, findNumber: "10" }],
    changeHistory: [
      { changeId: "ECO-2025-0887", type: "ECO", title: "Modify bogie frame gusset plate thickness", date: "2025-03-20", status: "Implemented", author: "D. Mukherjee" },
    ],
    tags: ["Structural", "Safety Vital", "Fabricated"],
    lastModified: "2026-02-15",
    createdDate: "2022-06-15",
  },

  // ── BRAKE SYSTEM ──
  "38111000": {
    plNumber: "38111000",
    name: "Brake System",
    description: "Complete pneumatic-hydraulic braking assembly including brake cylinders, brake rigging, slack adjuster, and brake blocks. Dual pipe graduated release system.",
    type: "sub-assembly",
    revision: "B.2",
    lifecycleState: "Production",
    owner: "S. Patel",
    department: "Brake Systems Division",
    weight: "1,450 kg",
    unitOfMeasure: "EA",
    classification: "Safety System — Braking",
    safetyVital: true,
    source: "Make",
    alternates: [],
    substitutes: [],
    effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [
      { docId: "DOC-2026-1201", title: "Brake System Type Test Report", type: "Test Report", revision: "B.2", status: "Approved", fileType: "PDF", size: "42.1 MB", date: "2025-04-18" },
      { docId: "DOC-2026-1202", title: "Brake Block Material Specification", type: "Specification", revision: "A.5", status: "Approved", fileType: "PDF", size: "3.2 MB", date: "2025-01-12" },
      { docId: "DOC-2026-1203", title: "Brake Rigging Adjustment Procedure", type: "Procedure", revision: "B.1", status: "Approved", fileType: "PDF", size: "9.4 MB", date: "2025-08-30" },
    ],
    linkedDrawings: [
      { drawingId: "DWG-BRK-ASM-001", title: "Brake Rigging Assembly", sheetNo: "1/3", revision: "B.2", status: "Released", format: "A1" },
      { drawingId: "DWG-BRK-CYL-001", title: "Brake Cylinder Installation", sheetNo: "1/2", revision: "B.0", status: "Released", format: "A1" },
    ],
    whereUsed: [{ parentPL: "38110000", parentName: "Bogie Assembly", quantity: 1, findNumber: "10" }],
    changeHistory: [
      { changeId: "ECO-2025-0912", type: "ECO", title: "Change brake block composite material", date: "2025-06-22", status: "Implemented", author: "S. Patel" },
    ],
    tags: ["Safety Vital", "Hydraulic", "Pneumatic"],
    lastModified: "2026-01-18",
    createdDate: "2022-08-10",
  },

  // ── BRAKE BLOCK (Part) ──
  "38111001": {
    plNumber: "38111001",
    name: "Brake Block",
    description: "Composite brake block for tread braking. L-type high-friction composition material per RDSO specification. Service life 60,000 km.",
    type: "part",
    revision: "C",
    lifecycleState: "Production",
    owner: "S. Patel",
    department: "Brake Systems Division",
    material: "L-Type Composite (RDSO Spec C-9814)",
    weight: "4.2 kg",
    unitOfMeasure: "EA",
    classification: "Wear Part — Brake",
    safetyVital: true,
    source: "Buy",
    supplier: "Hindustan Composites Ltd.",
    supplierPartNo: "HCL-BRK-L42C",
    alternates: ["38111010"],
    substitutes: ["38111011"],
    effectivity: { dateFrom: "2024-06-01", lotNumbers: ["LOT-2024-A", "LOT-2025-B"] },
    linkedDocuments: [
      { docId: "DOC-2026-1301", title: "Brake Block Material Test Certificate", type: "Certificate", revision: "C.0", status: "Approved", fileType: "PDF", size: "2.1 MB", date: "2025-06-22" },
      { docId: "DOC-2026-1302", title: "Brake Block Inspection Procedure", type: "Procedure", revision: "B.4", status: "Approved", fileType: "PDF", size: "4.6 MB", date: "2025-03-10" },
    ],
    linkedDrawings: [
      { drawingId: "DWG-BRK-BLK-001", title: "Brake Block — Detail Drawing", sheetNo: "1/1", revision: "C.0", status: "Released", format: "A3" },
    ],
    whereUsed: [{ parentPL: "38111000", parentName: "Brake System", quantity: 8, findNumber: "10" }],
    changeHistory: [
      { changeId: "ECO-2025-0912", type: "ECO", title: "Change to L-type composite", date: "2025-06-22", status: "Implemented", author: "S. Patel" },
    ],
    tags: ["Safety Vital", "Wear Part", "RDSO Approved"],
    lastModified: "2025-12-01",
    createdDate: "2022-08-15",
  },

  // ── BRAKE LEVER ──
  "38111002": {
    plNumber: "38111002",
    name: "Brake Lever",
    description: "Forged steel brake lever arm for brake rigging force multiplication. Heat treated to 280-320 BHN.",
    type: "part",
    revision: "B",
    lifecycleState: "Production",
    owner: "S. Patel",
    department: "Brake Systems Division",
    material: "EN24 Forged Steel",
    weight: "12.5 kg",
    unitOfMeasure: "EA",
    classification: "Structural — Brake Rigging",
    safetyVital: true,
    source: "Make",
    alternates: [],
    substitutes: [],
    effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [
      { docId: "DOC-2026-1311", title: "Brake Lever Forging Specification", type: "Specification", revision: "B.0", status: "Approved", fileType: "PDF", size: "3.8 MB", date: "2024-11-20" },
    ],
    linkedDrawings: [
      { drawingId: "DWG-BRK-LVR-001", title: "Brake Lever — Detail Drawing", sheetNo: "1/1", revision: "B.1", status: "Released", format: "A2" },
    ],
    whereUsed: [{ parentPL: "38111000", parentName: "Brake System", quantity: 4, findNumber: "20" }],
    changeHistory: [],
    tags: ["Safety Vital", "Forged"],
    lastModified: "2025-08-10",
    createdDate: "2022-09-01",
  },

  "38111003": {
    plNumber: "38111003", name: "Brake Cylinder", description: "10\" pneumatic brake cylinder with built-in slack adjuster. Operating pressure 3.5 kg/cm2.", type: "part", revision: "A.3",
    lifecycleState: "Production", owner: "S. Patel", department: "Brake Systems Division", material: "SG Iron Grade 500/7", weight: "38 kg", unitOfMeasure: "EA",
    classification: "Pneumatic — Brake", safetyVital: true, source: "Buy", supplier: "Escorts Ltd.", supplierPartNo: "ESC-BC-10SA",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-1321", title: "Brake Cylinder Type Test", type: "Test Report", revision: "A.3", status: "Approved", fileType: "PDF", size: "12.4 MB", date: "2025-02-28" }],
    linkedDrawings: [{ drawingId: "DWG-BRK-CYL-002", title: "Brake Cylinder Detail", sheetNo: "1/2", revision: "A.3", status: "Released", format: "A2" }],
    whereUsed: [{ parentPL: "38111000", parentName: "Brake System", quantity: 2, findNumber: "30" }],
    changeHistory: [], tags: ["Safety Vital", "Pneumatic"], lastModified: "2025-10-15", createdDate: "2023-01-20",
  },

  "38111004": {
    plNumber: "38111004", name: "Brake Pad Retainer", description: "Spring-loaded retainer clip for holding brake blocks in the brake head.", type: "part", revision: "A",
    lifecycleState: "Production", owner: "S. Patel", department: "Brake Systems Division", material: "Spring Steel EN42J", weight: "0.8 kg", unitOfMeasure: "EA",
    classification: "Fastener — Brake", safetyVital: false, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-BRK-RET-001", title: "Brake Pad Retainer", sheetNo: "1/1", revision: "A.0", status: "Released", format: "A4" }],
    whereUsed: [{ parentPL: "38111000", parentName: "Brake System", quantity: 8, findNumber: "40" }],
    changeHistory: [], tags: ["Wear Part", "Spring Steel"], lastModified: "2024-06-10", createdDate: "2022-10-05",
  },

  // ── PRIMARY SUSPENSION ──
  "38112000": {
    plNumber: "38112000", name: "Primary Suspension", description: "Primary suspension system including coil springs, axle box guides, and hydraulic dampers.", type: "sub-assembly", revision: "A.4",
    lifecycleState: "Production", owner: "D. Mukherjee", department: "Bogie Design Division", weight: "680 kg", unitOfMeasure: "SET",
    classification: "Suspension System", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-1401", title: "Suspension Spring Rate Calculation", type: "Specification", revision: "A.4", status: "Approved", fileType: "PDF", size: "5.2 MB", date: "2025-05-14" }],
    linkedDrawings: [{ drawingId: "DWG-SUS-ASM-001", title: "Primary Suspension Assembly", sheetNo: "1/2", revision: "A.4", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38110000", parentName: "Bogie Assembly", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["Structural", "Suspension"], lastModified: "2025-11-20", createdDate: "2022-07-10",
  },

  "38112001": {
    plNumber: "38112001", name: "Coil Spring (Primary)", description: "Primary suspension coil spring. Hot coiled alloy steel, shot peened.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "D. Mukherjee", department: "Bogie Design Division", material: "55Si7 Spring Steel", weight: "42 kg", unitOfMeasure: "EA",
    classification: "Spring — Suspension", safetyVital: true, source: "Buy", supplier: "Sundaram Fasteners Ltd.", supplierPartNo: "SFL-CS-55-P",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-1411", title: "Spring Load Test Certificate", type: "Certificate", revision: "B.0", status: "Approved", fileType: "PDF", size: "1.8 MB", date: "2025-04-05" }],
    linkedDrawings: [{ drawingId: "DWG-SUS-SPR-001", title: "Primary Coil Spring", sheetNo: "1/1", revision: "B.0", status: "Released", format: "A3" }],
    whereUsed: [{ parentPL: "38112000", parentName: "Primary Suspension", quantity: 8, findNumber: "10" }],
    changeHistory: [], tags: ["Structural", "Spring Steel"], lastModified: "2025-09-01", createdDate: "2022-08-01",
  },

  "38112002": {
    plNumber: "38112002", name: "Axle Box Guide", description: "Axle box guide assembly providing lateral and longitudinal guidance.", type: "part", revision: "C",
    lifecycleState: "Production", owner: "D. Mukherjee", department: "Bogie Design Division", material: "Forged EN24 Steel", weight: "28 kg", unitOfMeasure: "EA",
    classification: "Guide — Suspension", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-SUS-ABG-001", title: "Axle Box Guide Detail", sheetNo: "1/1", revision: "C.0", status: "Released", format: "A2" }],
    whereUsed: [{ parentPL: "38112000", parentName: "Primary Suspension", quantity: 4, findNumber: "20" }],
    changeHistory: [], tags: ["Structural", "Forged"], lastModified: "2025-07-15", createdDate: "2022-08-05",
  },

  "38112003": {
    plNumber: "38112003", name: "Damper Unit", description: "Vertical hydraulic damper for primary suspension. Dual-tube telescopic design.", type: "part", revision: "A.1",
    lifecycleState: "Production", owner: "D. Mukherjee", department: "Bogie Design Division", material: "Steel/Hydraulic Fluid", weight: "15 kg", unitOfMeasure: "EA",
    classification: "Damper — Suspension", safetyVital: false, source: "Buy", supplier: "Koni BV", supplierPartNo: "KONI-RW-4120",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-1431", title: "Damper Performance Datasheet", type: "Datasheet", revision: "A.1", status: "Approved", fileType: "PDF", size: "2.4 MB", date: "2025-03-18" }],
    linkedDrawings: [{ drawingId: "DWG-SUS-DMP-001", title: "Damper Unit Installation", sheetNo: "1/1", revision: "A.1", status: "Released", format: "A3" }],
    whereUsed: [{ parentPL: "38112000", parentName: "Primary Suspension", quantity: 4, findNumber: "30" }],
    changeHistory: [], tags: ["Hydraulic", "Damper"], lastModified: "2025-06-10", createdDate: "2023-02-14",
  },

  // ── WHEELSET ASSEMBLY ──
  "38113000": {
    plNumber: "38113000", name: "Wheelset Assembly", description: "Complete wheelset assembly including wheel discs, axle, and roller bearings. Axle load 20.5 tonnes.", type: "sub-assembly", revision: "D",
    lifecycleState: "Production", owner: "V. Nair", department: "Wheelset Division", weight: "2,800 kg", unitOfMeasure: "SET",
    classification: "Rotating — Wheelset", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [
      { docId: "DOC-2026-1501", title: "Wheelset Ultrasonic Testing Procedure", type: "Procedure", revision: "D.0", status: "Approved", fileType: "PDF", size: "8.8 MB", date: "2025-07-20" },
      { docId: "DOC-2026-1502", title: "Wheel Profile Measurement Spec", type: "Specification", revision: "C.2", status: "Approved", fileType: "PDF", size: "4.1 MB", date: "2025-09-10" },
    ],
    linkedDrawings: [{ drawingId: "DWG-WHL-ASM-001", title: "Wheelset Assembly Drawing", sheetNo: "1/3", revision: "D.0", status: "Released", format: "A0" }],
    whereUsed: [{ parentPL: "38110000", parentName: "Bogie Assembly", quantity: 3, findNumber: "30" }],
    changeHistory: [{ changeId: "ECO-2025-1001", type: "ECO", title: "New wheel profile for improved curve negotiation", date: "2025-07-20", status: "Implemented", author: "V. Nair" }],
    tags: ["Safety Vital", "Rotating", "NDT Required"], lastModified: "2026-01-05", createdDate: "2022-06-20",
  },

  "38113001": {
    plNumber: "38113001", name: "Wheel Disc", description: "Forged and rolled solid wheel disc. IRS Class C wheel steel. Diameter 1092mm new.", type: "part", revision: "D",
    lifecycleState: "Production", owner: "V. Nair", department: "Wheelset Division", material: "IRS Class C Wheel Steel", weight: "460 kg", unitOfMeasure: "EA",
    classification: "Rotating — Wheel", safetyVital: true, source: "Buy", supplier: "RINL Visakhapatnam", supplierPartNo: "RINL-WHL-1092C",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-1511", title: "Wheel Chemical & Physical Test Certificate", type: "Certificate", revision: "D.0", status: "Approved", fileType: "PDF", size: "3.5 MB", date: "2025-08-10" }],
    linkedDrawings: [{ drawingId: "DWG-WHL-DSC-001", title: "Wheel Disc Detail Drawing", sheetNo: "1/1", revision: "D.0", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38113000", parentName: "Wheelset Assembly", quantity: 2, findNumber: "10" }],
    changeHistory: [], tags: ["Safety Vital", "Rotating", "Forged", "NDT Required"], lastModified: "2025-12-20", createdDate: "2022-07-01",
  },

  "38113002": {
    plNumber: "38113002", name: "Axle Shaft", description: "Forged alloy steel axle. Ultrasonically tested. BN pressure fitted.", type: "part", revision: "C",
    lifecycleState: "Production", owner: "V. Nair", department: "Wheelset Division", material: "EA1N Axle Steel (EN 13261)", weight: "520 kg", unitOfMeasure: "EA",
    classification: "Rotating — Axle", safetyVital: true, source: "Buy", supplier: "SAIL Durgapur", supplierPartNo: "SAIL-AXL-EA1N",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-06-01" },
    linkedDocuments: [{ docId: "DOC-2026-1521", title: "Axle Forging Inspection Report", type: "Test Report", revision: "C.0", status: "Approved", fileType: "PDF", size: "6.2 MB", date: "2025-05-15" }],
    linkedDrawings: [{ drawingId: "DWG-WHL-AXL-001", title: "Axle Shaft Detail", sheetNo: "1/2", revision: "C.1", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38113000", parentName: "Wheelset Assembly", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["Safety Vital", "Forged", "NDT Required"], lastModified: "2025-10-05", createdDate: "2022-07-05",
  },

  "38113003": {
    plNumber: "38113003", name: "Bearing Housing", description: "Precision machined bearing housing for cartridge-type roller bearings.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "V. Nair", department: "Wheelset Division", material: "SG Iron Grade 600/3", weight: "65 kg", unitOfMeasure: "EA",
    classification: "Precision — Bearing", safetyVital: false, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-WHL-BRG-001", title: "Bearing Housing Detail", sheetNo: "1/1", revision: "B.0", status: "Released", format: "A2" }],
    whereUsed: [{ parentPL: "38113000", parentName: "Wheelset Assembly", quantity: 2, findNumber: "30" }],
    changeHistory: [], tags: ["Precision", "Machined"], lastModified: "2025-04-20", createdDate: "2022-08-10",
  },

  // ── TRACTION MOTOR ──
  "38120000": {
    plNumber: "38120000", name: "Traction Motor", description: "3-phase squirrel cage induction traction motor. Rated 1020 kW continuous at 2180V. Axle-hung nose-suspended mounting.",
    type: "sub-assembly", revision: "B", lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division",
    weight: "3,200 kg", unitOfMeasure: "EA", classification: "Electrical — Traction", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [
      { docId: "DOC-2026-2001", title: "Traction Motor Type Test Report", type: "Test Report", revision: "B.0", status: "Approved", fileType: "PDF", size: "28.4 MB", date: "2025-04-10" },
      { docId: "DOC-2026-2002", title: "Motor Insulation Resistance Procedure", type: "Procedure", revision: "A.2", status: "Approved", fileType: "PDF", size: "5.6 MB", date: "2025-08-15" },
    ],
    linkedDrawings: [
      { drawingId: "DWG-TM-ASM-001", title: "Traction Motor Assembly", sheetNo: "1/4", revision: "B.0", status: "Released", format: "A0" },
      { drawingId: "DWG-TM-WD-001", title: "Motor Wiring Diagram", sheetNo: "1/2", revision: "B.1", status: "Released", format: "A1" },
    ],
    whereUsed: [{ parentPL: "38100000", parentName: "WAP7 Locomotive", quantity: 6, findNumber: "20" }],
    changeHistory: [{ changeId: "ECO-2025-1102", type: "ECO", title: "Upgrade insulation class to H", date: "2025-09-15", status: "Implemented", author: "A. Sharma" }],
    tags: ["Electrical", "High Voltage", "Rotating"], lastModified: "2026-02-28", createdDate: "2022-05-15",
  },

  "38121000": {
    plNumber: "38121000", name: "Rotor Assembly", description: "Squirrel cage rotor with laminated core and die-cast aluminum cage.", type: "sub-assembly", revision: "A.2",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", weight: "980 kg", unitOfMeasure: "EA",
    classification: "Electrical — Rotor", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-2101", title: "Rotor Balancing Report", type: "Test Report", revision: "A.2", status: "Approved", fileType: "PDF", size: "4.8 MB", date: "2025-06-28" }],
    linkedDrawings: [{ drawingId: "DWG-TM-ROT-001", title: "Rotor Assembly Drawing", sheetNo: "1/2", revision: "A.2", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38120000", parentName: "Traction Motor", quantity: 1, findNumber: "10" }],
    changeHistory: [], tags: ["Rotating", "Precision", "Balanced"], lastModified: "2025-11-15", createdDate: "2022-06-01",
  },

  "38121001": {
    plNumber: "38121001", name: "Rotor Shaft", description: "Forged alloy steel rotor shaft with integral pinion gear seat.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", material: "42CrMo4 Forged Steel", weight: "220 kg", unitOfMeasure: "EA",
    classification: "Rotating — Shaft", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-2111", title: "Rotor Shaft UT/MT Report", type: "Test Report", revision: "B.0", status: "Approved", fileType: "PDF", size: "3.2 MB", date: "2025-07-10" }],
    linkedDrawings: [{ drawingId: "DWG-TM-RSH-001", title: "Rotor Shaft Detail", sheetNo: "1/1", revision: "B.0", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38121000", parentName: "Rotor Assembly", quantity: 1, findNumber: "10" }],
    changeHistory: [], tags: ["Rotating", "Forged", "NDT Required"], lastModified: "2025-09-20", createdDate: "2022-06-10",
  },

  "38121002": {
    plNumber: "38121002", name: "Rotor Core Lamination", description: "Electrical silicon steel laminations, 0.5mm thick, laser cut and varnished.", type: "part", revision: "A",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", material: "M400-50A Electrical Steel", weight: "380 kg", unitOfMeasure: "SET",
    classification: "Electrical — Core", safetyVital: false, source: "Buy", supplier: "POSCO India", supplierPartNo: "POSCO-M400-RT",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-TM-RCL-001", title: "Rotor Core Lamination", sheetNo: "1/1", revision: "A.0", status: "Released", format: "A3" }],
    whereUsed: [{ parentPL: "38121000", parentName: "Rotor Assembly", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["Electrical", "Laminated"], lastModified: "2025-04-10", createdDate: "2022-07-01",
  },

  "38121003": {
    plNumber: "38121003", name: "Rotor Winding", description: "Die-cast aluminum squirrel cage bars and end rings.", type: "part", revision: "C",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", material: "High-purity Aluminum", weight: "85 kg", unitOfMeasure: "SET",
    classification: "Electrical — Winding", safetyVital: false, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-TM-RWD-001", title: "Rotor Cage Detail", sheetNo: "1/1", revision: "C.0", status: "Released", format: "A2" }],
    whereUsed: [{ parentPL: "38121000", parentName: "Rotor Assembly", quantity: 1, findNumber: "30" }],
    changeHistory: [], tags: ["Electrical", "Aluminum"], lastModified: "2025-08-22", createdDate: "2022-07-05",
  },

  // ── STATOR ASSEMBLY ──
  "38122000": {
    plNumber: "38122000", name: "Stator Assembly", description: "Stator frame with laminated core and Class H insulated windings.", type: "sub-assembly", revision: "B.1",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", weight: "1,800 kg", unitOfMeasure: "EA",
    classification: "Electrical — Stator", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-2201", title: "Stator Winding Resistance Test", type: "Test Report", revision: "B.1", status: "Approved", fileType: "PDF", size: "6.4 MB", date: "2025-10-05" }],
    linkedDrawings: [{ drawingId: "DWG-TM-STA-001", title: "Stator Assembly Drawing", sheetNo: "1/3", revision: "B.1", status: "Released", format: "A0" }],
    whereUsed: [{ parentPL: "38120000", parentName: "Traction Motor", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["Electrical", "High Voltage", "Class H"], lastModified: "2026-01-10", createdDate: "2022-06-05",
  },

  "38122001": {
    plNumber: "38122001", name: "Stator Frame", description: "Welded steel stator frame with mounting feet and terminal box.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", material: "IS 2062 E250 Steel", weight: "650 kg", unitOfMeasure: "EA",
    classification: "Structural — Motor Frame", safetyVital: false, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-TM-SFR-001", title: "Stator Frame Detail", sheetNo: "1/2", revision: "B.0", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38122000", parentName: "Stator Assembly", quantity: 1, findNumber: "10" }],
    changeHistory: [], tags: ["Structural", "Welded"], lastModified: "2025-06-15", createdDate: "2022-06-10",
  },

  "38122002": {
    plNumber: "38122002", name: "Stator Winding", description: "Form-wound copper coils with Class H VPI insulation.", type: "part", revision: "A.2",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", material: "Electrolytic Copper (Class H VPI)", weight: "320 kg", unitOfMeasure: "SET",
    classification: "Electrical — Winding", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-2221", title: "VPI Insulation Test Report", type: "Test Report", revision: "A.2", status: "Approved", fileType: "PDF", size: "4.2 MB", date: "2025-11-18" }],
    linkedDrawings: [{ drawingId: "DWG-TM-SWD-001", title: "Stator Winding Detail", sheetNo: "1/2", revision: "A.2", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38122000", parentName: "Stator Assembly", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["Electrical", "Copper", "High Voltage"], lastModified: "2025-12-01", createdDate: "2022-06-15",
  },

  "38122003": {
    plNumber: "38122003", name: "Insulation Sleeve", description: "Nomex/Kapton composite slot insulation sleeve.", type: "part", revision: "A",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", material: "Nomex-Kapton-Nomex (NKN)", weight: "2.5 kg", unitOfMeasure: "SET",
    classification: "Electrical — Insulation", safetyVital: false, source: "Buy", supplier: "DuPont India", supplierPartNo: "DPT-NKN-0508",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [], linkedDrawings: [],
    whereUsed: [{ parentPL: "38122000", parentName: "Stator Assembly", quantity: 1, findNumber: "30" }],
    changeHistory: [], tags: ["Electrical", "Thermal", "Insulation"], lastModified: "2024-12-10", createdDate: "2022-07-20",
  },

  "38120001": {
    plNumber: "38120001", name: "Motor Cooling Fan", description: "Axial flow cooling fan for forced ventilation of traction motor.", type: "part", revision: "A",
    lifecycleState: "Production", owner: "A. Sharma", department: "Electrical Design Division", material: "Aluminum Alloy LM6", weight: "12 kg", unitOfMeasure: "EA",
    classification: "Rotating — Cooling", safetyVital: false, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-TM-FAN-001", title: "Cooling Fan Detail", sheetNo: "1/1", revision: "A.0", status: "Released", format: "A3" }],
    whereUsed: [{ parentPL: "38120000", parentName: "Traction Motor", quantity: 1, findNumber: "30" }],
    changeHistory: [], tags: ["Rotating", "Cooling", "Aluminum"], lastModified: "2024-10-05", createdDate: "2022-08-01",
  },

  // ── MAIN TRANSFORMER ──
  "38130000": {
    plNumber: "38130000", name: "Main Transformer", description: "25kV / 2x1080V oil-cooled main power transformer. Core-type, ONAN/ONAF cooling.", type: "sub-assembly", revision: "C",
    lifecycleState: "Production", owner: "P. Gupta", department: "Transformer Division", weight: "9,200 kg", unitOfMeasure: "EA",
    classification: "Electrical — Transformer", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [
      { docId: "DOC-2026-3001", title: "Transformer Routine Test Certificate", type: "Certificate", revision: "C.0", status: "Approved", fileType: "PDF", size: "15.6 MB", date: "2025-10-28" },
      { docId: "DOC-2026-3002", title: "Oil Analysis Report", type: "Test Report", revision: "B.4", status: "Approved", fileType: "PDF", size: "3.8 MB", date: "2026-01-15" },
    ],
    linkedDrawings: [{ drawingId: "DWG-TRF-ASM-001", title: "Main Transformer Assembly", sheetNo: "1/6", revision: "C.0", status: "Released", format: "A0" }],
    whereUsed: [{ parentPL: "38100000", parentName: "WAP7 Locomotive", quantity: 1, findNumber: "30" }],
    changeHistory: [], tags: ["Electrical", "High Voltage", "Heavy", "Oil Cooled"], lastModified: "2026-02-10", createdDate: "2022-05-20",
  },

  "38130001": { plNumber: "38130001", name: "Transformer Core", description: "CRGO silicon steel laminated core, step-lap construction.", type: "part", revision: "C",
    lifecycleState: "Production", owner: "P. Gupta", department: "Transformer Division", material: "M3 CRGO Silicon Steel", weight: "4,200 kg", unitOfMeasure: "EA",
    classification: "Electrical — Core", safetyVital: true, source: "Make", alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-TRF-COR-001", title: "Transformer Core Detail", sheetNo: "1/2", revision: "C.0", status: "Released", format: "A0" }],
    whereUsed: [{ parentPL: "38130000", parentName: "Main Transformer", quantity: 1, findNumber: "10" }],
    changeHistory: [], tags: ["Electrical", "Heavy", "Laminated"], lastModified: "2025-11-10", createdDate: "2022-06-01",
  },

  "38130002": { plNumber: "38130002", name: "HV Winding (Primary)", description: "25kV primary winding, disc-type, paper insulated.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "P. Gupta", department: "Transformer Division", material: "Electrolytic Copper", weight: "680 kg", unitOfMeasure: "SET",
    classification: "Electrical — Winding", safetyVital: true, source: "Make", alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-TRF-HVW-001", title: "HV Winding Detail", sheetNo: "1/2", revision: "B.0", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38130000", parentName: "Main Transformer", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["High Voltage", "Copper"], lastModified: "2025-09-15", createdDate: "2022-06-10",
  },

  "38130003": { plNumber: "38130003", name: "LV Winding (Secondary)", description: "1080V secondary winding, helical type.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "P. Gupta", department: "Transformer Division", material: "Electrolytic Copper", weight: "520 kg", unitOfMeasure: "SET",
    classification: "Electrical — Winding", safetyVital: false, source: "Make", alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [], whereUsed: [{ parentPL: "38130000", parentName: "Main Transformer", quantity: 2, findNumber: "30" }],
    changeHistory: [], tags: ["Electrical", "Copper"], lastModified: "2025-09-15", createdDate: "2022-06-10",
  },

  "38130004": { plNumber: "38130004", name: "Transformer Oil Tank", description: "Welded steel tank with corrugated radiator panels.", type: "part", revision: "A.1",
    lifecycleState: "Production", owner: "P. Gupta", department: "Transformer Division", material: "IS 2062 E250 Steel", weight: "1,800 kg", unitOfMeasure: "EA",
    classification: "Structural — Tank", safetyVital: false, source: "Make", alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-TRF-TNK-001", title: "Oil Tank Fabrication", sheetNo: "1/3", revision: "A.1", status: "Released", format: "A0" }],
    whereUsed: [{ parentPL: "38130000", parentName: "Main Transformer", quantity: 1, findNumber: "40" }],
    changeHistory: [], tags: ["Cooling", "Heavy", "Welded"], lastModified: "2025-07-20", createdDate: "2022-06-15",
  },

  "38130005": { plNumber: "38130005", name: "Bushing Insulator", description: "25kV porcelain bushing insulator with oil-to-air interface.", type: "part", revision: "A",
    lifecycleState: "Production", owner: "P. Gupta", department: "Transformer Division", material: "High-alumina Porcelain", weight: "35 kg", unitOfMeasure: "EA",
    classification: "Electrical — Insulator", safetyVital: true, source: "Buy", supplier: "Aditya Birla Insulators", supplierPartNo: "ABI-BSH-25",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2023-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-3051", title: "Bushing Type Test Certificate", type: "Certificate", revision: "A.0", status: "Approved", fileType: "PDF", size: "5.2 MB", date: "2024-08-22" }],
    linkedDrawings: [{ drawingId: "DWG-TRF-BSH-001", title: "Bushing Insulator Detail", sheetNo: "1/1", revision: "A.0", status: "Released", format: "A2" }],
    whereUsed: [{ parentPL: "38130000", parentName: "Main Transformer", quantity: 2, findNumber: "50" }],
    changeHistory: [], tags: ["High Voltage", "Ceramic", "RDSO Approved"], lastModified: "2025-03-10", createdDate: "2022-07-01",
  },

  // ── CONTROL ELECTRONICS ──
  "38140000": {
    plNumber: "38140000", name: "Control Electronics Cabinet", description: "Main electronic control cubicle housing PLC, inverter control cards, and communication modules.", type: "sub-assembly", revision: "B.3",
    lifecycleState: "Production", owner: "K. Joshi", department: "Electronics Division", weight: "450 kg", unitOfMeasure: "EA",
    classification: "Electronics — Control", safetyVital: true, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-4001", title: "Control System Architecture Spec", type: "Specification", revision: "B.3", status: "Approved", fileType: "PDF", size: "22.1 MB", date: "2025-12-05" }],
    linkedDrawings: [{ drawingId: "DWG-CTL-ASM-001", title: "Control Cabinet Assembly", sheetNo: "1/4", revision: "B.3", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38100000", parentName: "WAP7 Locomotive", quantity: 1, findNumber: "40" }],
    changeHistory: [], tags: ["Electronics", "Control", "PLC"], lastModified: "2026-03-01", createdDate: "2022-05-25",
  },

  "38140001": { plNumber: "38140001", name: "Main Logic Controller (PLC)", description: "Redundant PLC with dual CPU for traction and auxiliary control.", type: "part", revision: "D",
    lifecycleState: "Production", owner: "K. Joshi", department: "Electronics Division", material: "—", weight: "8 kg", unitOfMeasure: "EA",
    classification: "Electronics — Controller", safetyVital: true, source: "Buy", supplier: "ABB India", supplierPartNo: "ABB-AC500-PM583",
    alternates: ["38140010"], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-4011", title: "PLC Configuration Manual", type: "Procedure", revision: "D.0", status: "Approved", fileType: "PDF", size: "8.4 MB", date: "2025-11-22" }],
    linkedDrawings: [], whereUsed: [{ parentPL: "38140000", parentName: "Control Electronics Cabinet", quantity: 1, findNumber: "10" }],
    changeHistory: [], tags: ["Electronics", "Control", "Safety Vital"], lastModified: "2026-01-15", createdDate: "2022-06-01",
  },

  "38140002": { plNumber: "38140002", name: "Traction Inverter Module", description: "IGBT-based 3-level traction inverter power module.", type: "part", revision: "C",
    lifecycleState: "Production", owner: "K. Joshi", department: "Electronics Division", material: "—", weight: "120 kg", unitOfMeasure: "EA",
    classification: "Electronics — Power", safetyVital: true, source: "Buy", supplier: "Medha Servo Drives", supplierPartNo: "MEDHA-TIM-3L",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-CTL-INV-001", title: "Inverter Module Installation", sheetNo: "1/2", revision: "C.0", status: "Released", format: "A2" }],
    whereUsed: [{ parentPL: "38140000", parentName: "Control Electronics Cabinet", quantity: 6, findNumber: "20" }],
    changeHistory: [], tags: ["Electronics", "High Voltage", "IGBT"], lastModified: "2025-12-10", createdDate: "2022-06-05",
  },

  "38140003": { plNumber: "38140003", name: "Speed Sensor Array", description: "Dual redundant speed sensors for each axle.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "K. Joshi", department: "Electronics Division", material: "—", weight: "1.2 kg", unitOfMeasure: "SET",
    classification: "Electronics — Sensor", safetyVital: true, source: "Buy", supplier: "Pepperl+Fuchs", supplierPartNo: "PF-INX360D",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [],
    whereUsed: [{ parentPL: "38140000", parentName: "Control Electronics Cabinet", quantity: 6, findNumber: "30" }],
    changeHistory: [], tags: ["Electronics", "Safety Vital", "Sensor"], lastModified: "2025-10-20", createdDate: "2022-07-01",
  },

  "38140004": { plNumber: "38140004", name: "Communication Gateway", description: "Train communication network gateway (TCN/MVB to Ethernet).", type: "part", revision: "A.1",
    lifecycleState: "Production", owner: "K. Joshi", department: "Electronics Division", material: "—", weight: "3.5 kg", unitOfMeasure: "EA",
    classification: "Electronics — Network", safetyVital: false, source: "Buy", supplier: "Duagon AG", supplierPartNo: "DGN-D200-TCN",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-06-01" },
    linkedDocuments: [], linkedDrawings: [],
    whereUsed: [{ parentPL: "38140000", parentName: "Control Electronics Cabinet", quantity: 1, findNumber: "40" }],
    changeHistory: [], tags: ["Electronics", "Network", "TCN"], lastModified: "2025-08-10", createdDate: "2023-01-15",
  },

  // ── PANTOGRAPH ──
  "38150000": {
    plNumber: "38150000", name: "Pantograph Assembly", description: "High-speed single-arm pantograph for 25kV OHE collection.", type: "sub-assembly", revision: "A.5",
    lifecycleState: "Production", owner: "M. Reddy", department: "Current Collection Division", weight: "280 kg", unitOfMeasure: "EA",
    classification: "Electrical — Current Collection", safetyVital: true, source: "Buy", supplier: "Schunk Carbon Technology",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [{ docId: "DOC-2026-5001", title: "Pantograph Type Test Report", type: "Test Report", revision: "A.5", status: "Approved", fileType: "PDF", size: "18.2 MB", date: "2025-05-20" }],
    linkedDrawings: [{ drawingId: "DWG-PAN-ASM-001", title: "Pantograph Assembly", sheetNo: "1/3", revision: "A.5", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38100000", parentName: "WAP7 Locomotive", quantity: 2, findNumber: "50" }],
    changeHistory: [], tags: ["High Voltage", "Current Collection"], lastModified: "2025-11-25", createdDate: "2022-05-30",
  },

  "38150001": { plNumber: "38150001", name: "Carbon Contact Strip", description: "Metalized carbon strip for OHE contact. 1450mm active length.", type: "part", revision: "A",
    lifecycleState: "Production", owner: "M. Reddy", department: "Current Collection Division", material: "Copper-impregnated Carbon", weight: "3.8 kg", unitOfMeasure: "EA",
    classification: "Wear Part — Current Collection", safetyVital: true, source: "Buy", supplier: "Schunk Carbon Technology", supplierPartNo: "SCT-CCS-1450",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-PAN-CCS-001", title: "Carbon Strip Detail", sheetNo: "1/1", revision: "A.0", status: "Released", format: "A3" }],
    whereUsed: [{ parentPL: "38150000", parentName: "Pantograph Assembly", quantity: 2, findNumber: "10" }],
    changeHistory: [], tags: ["Wear Part", "High Voltage", "Carbon"], lastModified: "2025-04-15", createdDate: "2022-06-05",
  },

  "38150002": { plNumber: "38150002", name: "Pantograph Frame", description: "Articulated single-arm frame with aerodynamic fairings.", type: "part", revision: "B",
    lifecycleState: "Production", owner: "M. Reddy", department: "Current Collection Division", material: "Aluminum Alloy 6082-T6", weight: "180 kg", unitOfMeasure: "EA",
    classification: "Structural — Pantograph", safetyVital: true, source: "Buy", supplier: "Schunk Carbon Technology",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [{ drawingId: "DWG-PAN-FRM-001", title: "Pantograph Frame Assembly", sheetNo: "1/2", revision: "B.0", status: "Released", format: "A1" }],
    whereUsed: [{ parentPL: "38150000", parentName: "Pantograph Assembly", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["Structural", "Aluminum"], lastModified: "2025-06-20", createdDate: "2022-06-10",
  },

  "38150003": { plNumber: "38150003", name: "Spring Mechanism", description: "Pneumatic raising/lowering mechanism with static force springs.", type: "part", revision: "A.2",
    lifecycleState: "Production", owner: "M. Reddy", department: "Current Collection Division", material: "Spring Steel / Pneumatic", weight: "25 kg", unitOfMeasure: "SET",
    classification: "Mechanical — Actuator", safetyVital: false, source: "Buy", supplier: "Schunk Carbon Technology",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-01-01" },
    linkedDocuments: [], linkedDrawings: [],
    whereUsed: [{ parentPL: "38150000", parentName: "Pantograph Assembly", quantity: 1, findNumber: "30" }],
    changeHistory: [], tags: ["Mechanical", "Pneumatic", "Spring"], lastModified: "2025-05-10", createdDate: "2022-07-01",
  },

  // ── MAINTENANCE KIT ──
  "38160000": {
    plNumber: "38160000", name: "Maintenance Kit Assembly", description: "Standard maintenance spares kit for scheduled depot overhauls.", type: "sub-assembly", revision: "A",
    lifecycleState: "Active", owner: "R. Das", department: "Maintenance Planning", weight: "85 kg", unitOfMeasure: "KIT",
    classification: "Spares — Maintenance", safetyVital: false, source: "Make",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-06-01" },
    linkedDocuments: [{ docId: "DOC-2026-6001", title: "Maintenance Kit BOM & Packing List", type: "Specification", revision: "A.0", status: "Approved", fileType: "PDF", size: "2.4 MB", date: "2025-06-01" }],
    linkedDrawings: [],
    whereUsed: [{ parentPL: "38100000", parentName: "WAP7 Locomotive", quantity: 1, findNumber: "60" }],
    changeHistory: [], tags: ["Maintenance", "Spares", "Kit"], lastModified: "2025-12-15", createdDate: "2023-06-01",
  },

  "38160001": { plNumber: "38160001", name: "Gasket Set", description: "Complete gasket set for transformer and brake cylinder overhaul.", type: "part", revision: "A",
    lifecycleState: "Active", owner: "R. Das", department: "Maintenance Planning", material: "NBR/Cork/Copper", weight: "2.5 kg", unitOfMeasure: "SET",
    classification: "Consumable — Gasket", safetyVital: false, source: "Buy", supplier: "Victor Gaskets India", supplierPartNo: "VGI-WAP7-GKT",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-06-01" },
    linkedDocuments: [], linkedDrawings: [],
    whereUsed: [{ parentPL: "38160000", parentName: "Maintenance Kit Assembly", quantity: 1, findNumber: "10" }],
    changeHistory: [], tags: ["Consumable", "Spares"], lastModified: "2025-06-10", createdDate: "2023-06-05",
  },

  "38160002": { plNumber: "38160002", name: "Bearing Replacement Kit", description: "Axle box bearing replacement set with seals and grease.", type: "part", revision: "A",
    lifecycleState: "Active", owner: "R. Das", department: "Maintenance Planning", material: "Bearing Steel / NBR", weight: "28 kg", unitOfMeasure: "SET",
    classification: "Spares — Bearing", safetyVital: false, source: "Buy", supplier: "SKF India", supplierPartNo: "SKF-WAP7-AXBK",
    alternates: [], substitutes: [], effectivity: { dateFrom: "2024-06-01" },
    linkedDocuments: [{ docId: "DOC-2026-6021", title: "Bearing Replacement Procedure", type: "Procedure", revision: "A.0", status: "Approved", fileType: "PDF", size: "6.8 MB", date: "2025-07-15" }],
    linkedDrawings: [],
    whereUsed: [{ parentPL: "38160000", parentName: "Maintenance Kit Assembly", quantity: 1, findNumber: "20" }],
    changeHistory: [], tags: ["Spares", "Bearing", "SKF"], lastModified: "2025-08-01", createdDate: "2023-06-05",
  },
};

// Helper to get PL record
export function getPLRecord(plNumber: string): PLRecord | undefined {
  return PL_DATABASE[plNumber];
}

// ─── BOM TREE (using 8-digit PL numbers) ─────────────────────────────────────

export const INITIAL_BOM_TREE: BOMNode[] = [
  {
    id: "38100000", name: "WAP7 Locomotive", type: "assembly", revision: "D", tags: ["Railway", "Production", "25kV AC"],
    quantity: 1, findNumber: "—", unitOfMeasure: "EA",
    children: [
      {
        id: "38110000", name: "Bogie Assembly", type: "sub-assembly", revision: "C", tags: ["Structural", "Safety Vital"],
        quantity: 2, findNumber: "10", unitOfMeasure: "EA",
        children: [
          {
            id: "38111000", name: "Brake System", type: "sub-assembly", revision: "B.2", tags: ["Safety Vital", "Hydraulic"],
            quantity: 1, findNumber: "10", unitOfMeasure: "EA",
            children: [
              { id: "38111001", name: "Brake Block", type: "part", revision: "C", tags: ["Safety Vital", "Wear Part"], quantity: 8, findNumber: "10", unitOfMeasure: "EA", children: [] },
              { id: "38111002", name: "Brake Lever", type: "part", revision: "B", tags: ["Safety Vital", "Forged"], quantity: 4, findNumber: "20", unitOfMeasure: "EA", children: [] },
              { id: "38111003", name: "Brake Cylinder", type: "part", revision: "A.3", tags: ["Safety Vital", "Pneumatic"], quantity: 2, findNumber: "30", unitOfMeasure: "EA", children: [] },
              { id: "38111004", name: "Brake Pad Retainer", type: "part", revision: "A", tags: ["Wear Part"], quantity: 8, findNumber: "40", unitOfMeasure: "EA", children: [] },
            ]
          },
          {
            id: "38112000", name: "Primary Suspension", type: "sub-assembly", revision: "A.4", tags: ["Structural"],
            quantity: 1, findNumber: "20", unitOfMeasure: "SET",
            children: [
              { id: "38112001", name: "Coil Spring (Primary)", type: "part", revision: "B", tags: ["Structural"], quantity: 8, findNumber: "10", unitOfMeasure: "EA", children: [] },
              { id: "38112002", name: "Axle Box Guide", type: "part", revision: "C", tags: ["Structural", "Forged"], quantity: 4, findNumber: "20", unitOfMeasure: "EA", children: [] },
              { id: "38112003", name: "Damper Unit", type: "part", revision: "A.1", tags: ["Hydraulic"], quantity: 4, findNumber: "30", unitOfMeasure: "EA", children: [] },
            ]
          },
          {
            id: "38113000", name: "Wheelset Assembly", type: "sub-assembly", revision: "D", tags: ["Safety Vital", "Rotating"],
            quantity: 3, findNumber: "30", unitOfMeasure: "SET",
            children: [
              { id: "38113001", name: "Wheel Disc", type: "part", revision: "D", tags: ["Safety Vital", "Rotating", "Forged"], quantity: 2, findNumber: "10", unitOfMeasure: "EA", children: [] },
              { id: "38113002", name: "Axle Shaft", type: "part", revision: "C", tags: ["Safety Vital", "Forged"], quantity: 1, findNumber: "20", unitOfMeasure: "EA", children: [] },
              { id: "38113003", name: "Bearing Housing", type: "part", revision: "B", tags: ["Precision"], quantity: 2, findNumber: "30", unitOfMeasure: "EA", children: [] },
            ]
          },
        ]
      },
      {
        id: "38120000", name: "Traction Motor", type: "sub-assembly", revision: "B", tags: ["Electrical", "High Voltage"],
        quantity: 6, findNumber: "20", unitOfMeasure: "EA",
        children: [
          {
            id: "38121000", name: "Rotor Assembly", type: "sub-assembly", revision: "A.2", tags: ["Rotating", "Precision"],
            quantity: 1, findNumber: "10", unitOfMeasure: "EA",
            children: [
              { id: "38121001", name: "Rotor Shaft", type: "part", revision: "B", tags: ["Rotating", "Forged"], quantity: 1, findNumber: "10", unitOfMeasure: "EA", children: [] },
              { id: "38121002", name: "Rotor Core Lamination", type: "part", revision: "A", tags: ["Electrical"], quantity: 1, findNumber: "20", unitOfMeasure: "SET", children: [] },
              { id: "38121003", name: "Rotor Winding", type: "part", revision: "C", tags: ["Electrical", "Aluminum"], quantity: 1, findNumber: "30", unitOfMeasure: "SET", children: [] },
            ]
          },
          {
            id: "38122000", name: "Stator Assembly", type: "sub-assembly", revision: "B.1", tags: ["Electrical", "High Voltage"],
            quantity: 1, findNumber: "20", unitOfMeasure: "EA",
            children: [
              { id: "38122001", name: "Stator Frame", type: "part", revision: "B", tags: ["Structural"], quantity: 1, findNumber: "10", unitOfMeasure: "EA", children: [] },
              { id: "38122002", name: "Stator Winding", type: "part", revision: "A.2", tags: ["Electrical", "Copper"], quantity: 1, findNumber: "20", unitOfMeasure: "SET", children: [] },
              { id: "38122003", name: "Insulation Sleeve", type: "part", revision: "A", tags: ["Electrical", "Thermal"], quantity: 1, findNumber: "30", unitOfMeasure: "SET", children: [] },
            ]
          },
          { id: "38120001", name: "Motor Cooling Fan", type: "part", revision: "A", tags: ["Rotating", "Cooling"], quantity: 1, findNumber: "30", unitOfMeasure: "EA", children: [] },
        ]
      },
      {
        id: "38130000", name: "Main Transformer", type: "sub-assembly", revision: "C", tags: ["Electrical", "High Voltage", "Heavy"],
        quantity: 1, findNumber: "30", unitOfMeasure: "EA",
        children: [
          { id: "38130001", name: "Transformer Core", type: "part", revision: "C", tags: ["Electrical", "Heavy"], quantity: 1, findNumber: "10", unitOfMeasure: "EA", children: [] },
          { id: "38130002", name: "HV Winding (Primary)", type: "part", revision: "B", tags: ["High Voltage", "Copper"], quantity: 1, findNumber: "20", unitOfMeasure: "SET", children: [] },
          { id: "38130003", name: "LV Winding (Secondary)", type: "part", revision: "B", tags: ["Electrical", "Copper"], quantity: 2, findNumber: "30", unitOfMeasure: "SET", children: [] },
          { id: "38130004", name: "Transformer Oil Tank", type: "part", revision: "A.1", tags: ["Cooling", "Heavy"], quantity: 1, findNumber: "40", unitOfMeasure: "EA", children: [] },
          { id: "38130005", name: "Bushing Insulator", type: "part", revision: "A", tags: ["High Voltage", "Ceramic"], quantity: 2, findNumber: "50", unitOfMeasure: "EA", children: [] },
        ]
      },
      {
        id: "38140000", name: "Control Electronics Cabinet", type: "sub-assembly", revision: "B.3", tags: ["Electronics", "Control"],
        quantity: 1, findNumber: "40", unitOfMeasure: "EA",
        children: [
          { id: "38140001", name: "Main Logic Controller (PLC)", type: "part", revision: "D", tags: ["Electronics", "Safety Vital"], quantity: 1, findNumber: "10", unitOfMeasure: "EA", children: [] },
          { id: "38140002", name: "Traction Inverter Module", type: "part", revision: "C", tags: ["Electronics", "High Voltage"], quantity: 6, findNumber: "20", unitOfMeasure: "EA", children: [] },
          { id: "38140003", name: "Speed Sensor Array", type: "part", revision: "B", tags: ["Electronics", "Safety Vital"], quantity: 6, findNumber: "30", unitOfMeasure: "SET", children: [] },
          { id: "38140004", name: "Communication Gateway", type: "part", revision: "A.1", tags: ["Electronics", "Network"], quantity: 1, findNumber: "40", unitOfMeasure: "EA", children: [] },
        ]
      },
      {
        id: "38150000", name: "Pantograph Assembly", type: "sub-assembly", revision: "A.5", tags: ["High Voltage", "Structural"],
        quantity: 2, findNumber: "50", unitOfMeasure: "EA",
        children: [
          { id: "38150001", name: "Carbon Contact Strip", type: "part", revision: "A", tags: ["Wear Part", "High Voltage"], quantity: 2, findNumber: "10", unitOfMeasure: "EA", children: [] },
          { id: "38150002", name: "Pantograph Frame", type: "part", revision: "B", tags: ["Structural"], quantity: 1, findNumber: "20", unitOfMeasure: "EA", children: [] },
          { id: "38150003", name: "Spring Mechanism", type: "part", revision: "A.2", tags: ["Mechanical"], quantity: 1, findNumber: "30", unitOfMeasure: "SET", children: [] },
        ]
      },
      {
        id: "38160000", name: "Maintenance Kit Assembly", type: "sub-assembly", revision: "A", tags: ["Maintenance", "Spares"],
        quantity: 1, findNumber: "60", unitOfMeasure: "KIT",
        children: [
          { id: "38160001", name: "Gasket Set", type: "part", revision: "A", tags: ["Consumable"], quantity: 1, findNumber: "10", unitOfMeasure: "SET", children: [] },
          { id: "38160002", name: "Bearing Replacement Kit", type: "part", revision: "A", tags: ["Spares"], quantity: 1, findNumber: "20", unitOfMeasure: "SET", children: [] },
        ]
      },
    ]
  }
];
