import { GraphData, GraphNode, GraphEdge } from '../api/knowledge';

const MAX_NODES = 1000;
const MAX_EDGES = 2000;
const VIRTUAL_RENDER_MARGIN = 200;
const CHUNK_SIZE = 100;

const LOD_THRESHOLDS = {
  ultra: { zoom: 2.0, nodeLimit: 50, edgeOpacity: 1.0, labelShow: true },
  high: { zoom: 1.5, nodeLimit: 100, edgeOpacity: 0.8, labelShow: true },
  medium: { zoom: 1.0, nodeLimit: 300, edgeOpacity: 0.5, labelShow: true },
  low: { zoom: 0.5, nodeLimit: 500, edgeOpacity: 0.3, labelShow: false },
  ultraLow: { zoom: 0.3, nodeLimit: 800, edgeOpacity: 0.2, labelShow: false },
};

interface Viewport {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
}

interface NodePosition {
  x: number;
  y: number;
}

interface SpatialIndex {
  grid: Map<string, Set<string>>;
  cellSize: number;
}

const nodePositions = new Map<string, NodePosition>();
const spatialIndex: SpatialIndex = { grid: new Map(), cellSize: 100 };
const nodeDegreeCache = new Map<string, number>();
const clusterCache = new Map<string, string[]>();

export function updateNodePosition(nodeId: string, position: NodePosition): void {
  nodePositions.set(nodeId, position);
  updateSpatialIndex(nodeId, position);
}

export function getNodePosition(nodeId: string): NodePosition | undefined {
  return nodePositions.get(nodeId);
}

export function clearNodePositions(): void {
  nodePositions.clear();
  spatialIndex.grid.clear();
  nodeDegreeCache.clear();
  clusterCache.clear();
}

function updateSpatialIndex(nodeId: string, position: NodePosition): void {
  const cellX = Math.floor(position.x / spatialIndex.cellSize);
  const cellY = Math.floor(position.y / spatialIndex.cellSize);
  const cellKey = `${cellX},${cellY}`;

  if (!spatialIndex.grid.has(cellKey)) {
    spatialIndex.grid.set(cellKey, new Set());
  }
  spatialIndex.grid.get(cellKey)!.add(nodeId);
}

export function getNodesInRadius(center: NodePosition, radius: number): string[] {
  const result: string[] = [];
  const cellRadius = Math.ceil(radius / spatialIndex.cellSize);
  const centerCellX = Math.floor(center.x / spatialIndex.cellSize);
  const centerCellY = Math.floor(center.y / spatialIndex.cellSize);

  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      const cellKey = `${centerCellX + dx},${centerCellY + dy}`;
      const cellNodes = spatialIndex.grid.get(cellKey);
      if (cellNodes) {
        for (const nodeId of cellNodes) {
          const pos = nodePositions.get(nodeId);
          if (pos) {
            const distance = Math.sqrt(
              Math.pow(pos.x - center.x, 2) + Math.pow(pos.y - center.y, 2)
            );
            if (distance <= radius) {
              result.push(nodeId);
            }
          }
        }
      }
    }
  }

  return result;
}

export function optimizeGraphData(data: GraphData): GraphData {
  let { nodes, edges } = data;

  if (nodes.length > MAX_NODES) {
    nodes = prioritizeNodes(nodes, edges);
    nodes = nodes.slice(0, MAX_NODES);
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  edges = edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  if (edges.length > MAX_EDGES) {
    edges = prioritizeEdges(edges);
    edges = edges.slice(0, MAX_EDGES);
  }

  return { ...data, nodes, edges };
}

function prioritizeNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const degrees = calculateNodeDegree({ nodes, edges } as GraphData);

  return nodes.sort((a, b) => {
    const scoreA = (a.value || 0) * 0.5 + (degrees.get(a.id) || 0) * 0.5;
    const scoreB = (b.value || 0) * 0.5 + (degrees.get(b.id) || 0) * 0.5;
    return scoreB - scoreA;
  });
}

function prioritizeEdges(edges: GraphEdge[]): GraphEdge[] {
  return edges.sort((a, b) => {
    const weightA = a.weight || a.lineStyle?.width || 1;
    const weightB = b.weight || b.lineStyle?.width || 1;
    return weightB - weightA;
  });
}

export function virtualizeGraphData(data: GraphData, viewport: Viewport): GraphData {
  const { width, height, offsetX, offsetY, zoom } = viewport;

  const visibleNodes: GraphNode[] = [];
  const visibleNodeIds = new Set<string>();

  const scaledMargin = VIRTUAL_RENDER_MARGIN / zoom;
  const viewLeft = -offsetX / zoom - scaledMargin;
  const viewRight = (-offsetX + width) / zoom + scaledMargin;
  const viewTop = -offsetY / zoom - scaledMargin;
  const viewBottom = (-offsetY + height) / zoom + scaledMargin;

  for (const node of data.nodes) {
    const pos = nodePositions.get(node.id) || { x: node.x || 0, y: node.y || 0 };

    if (pos.x >= viewLeft && pos.x <= viewRight && pos.y >= viewTop && pos.y <= viewBottom) {
      visibleNodes.push(node);
      visibleNodeIds.add(node.id);
    }
  }

  const visibleEdges = data.edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );

  return {
    ...data,
    nodes: visibleNodes,
    edges: visibleEdges,
  };
}

export function applyLOD(data: GraphData, zoom: number): GraphData & { lodLevel: string } {
  let lodLevel: keyof typeof LOD_THRESHOLDS = 'high';

  if (zoom < LOD_THRESHOLDS.ultraLow.zoom) {
    lodLevel = 'ultraLow';
  } else if (zoom < LOD_THRESHOLDS.low.zoom) {
    lodLevel = 'low';
  } else if (zoom < LOD_THRESHOLDS.medium.zoom) {
    lodLevel = 'medium';
  } else if (zoom < LOD_THRESHOLDS.high.zoom) {
    lodLevel = 'high';
  } else {
    lodLevel = 'ultra';
  }

  const config = LOD_THRESHOLDS[lodLevel];
  const nodeLimit = config.nodeLimit;

  if (data.nodes.length <= nodeLimit) {
    return {
      ...data,
      nodes: data.nodes.map((node) => ({
        ...node,
        label: config.labelShow ? { show: true } : { show: false },
      })),
      edges: data.edges.map((edge) => ({
        ...edge,
        lineStyle: {
          ...edge.lineStyle,
          opacity: config.edgeOpacity,
        },
      })),
      lodLevel,
    };
  }

  const degrees = calculateNodeDegree(data);
  const sortedNodes = [...data.nodes].sort(
    (a, b) => (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0)
  );

  const lodNodes = sortedNodes.slice(0, nodeLimit);
  const lodNodeIds = new Set(lodNodes.map((n) => n.id));

  const lodEdges = data.edges
    .filter((edge) => lodNodeIds.has(edge.source) && lodNodeIds.has(edge.target))
    .map((edge) => ({
      ...edge,
      lineStyle: {
        ...edge.lineStyle,
        width: lodLevel === 'low' || lodLevel === 'ultraLow' ? 1 : edge.lineStyle?.width || 2,
        opacity: config.edgeOpacity,
      },
    }));

  const processedNodes = lodNodes.map((node) => ({
    ...node,
    symbolSize:
      lodLevel === 'low' || lodLevel === 'ultraLow'
        ? Math.max((node.symbolSize || 30) * 0.7, 10)
        : node.symbolSize,
    label: config.labelShow ? { show: true } : { show: false },
  }));

  return {
    ...data,
    nodes: processedNodes,
    edges: lodEdges,
    lodLevel,
  };
}

export function calculateNodeDegree(data: GraphData): Map<string, number> {
  if (nodeDegreeCache.size > 0) {
    return nodeDegreeCache;
  }

  const degrees = new Map<string, number>();

  for (const node of data.nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of data.edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  }

  for (const [nodeId, degree] of degrees) {
    nodeDegreeCache.set(nodeId, degree);
  }

  return degrees;
}

export function detectClusters(data: GraphData): Map<string, string[]> {
  if (clusterCache.size > 0) {
    return clusterCache;
  }

  const adjacency = new Map<string, Set<string>>();

  for (const node of data.nodes) {
    adjacency.set(node.id, new Set());
  }

  for (const edge of data.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const clusters = new Map<string, string[]>();

  for (const node of data.nodes) {
    if (visited.has(node.id)) continue;

    const cluster: string[] = [];
    const queue = [node.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      cluster.push(current);

      const neighbors = adjacency.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }

    if (cluster.length > 0) {
      const clusterId = `cluster_${clusters.size}`;
      clusters.set(clusterId, cluster);
      clusterCache.set(clusterId, cluster);
    }
  }

  return clusters;
}

export function getTopKNodes(data: GraphData, k: number): GraphData {
  const degrees = calculateNodeDegree(data);

  const sortedNodes = [...data.nodes].sort((a, b) => {
    const scoreA = (a.value || 0) * 0.5 + (degrees.get(a.id) || 0) * 0.5;
    const scoreB = (b.value || 0) * 0.5 + (degrees.get(b.id) || 0) * 0.5;
    return scoreB - scoreA;
  });

  const topNodes = sortedNodes.slice(0, k);
  const topNodeIds = new Set(topNodes.map((n) => n.id));

  const topEdges = data.edges.filter(
    (edge) => topNodeIds.has(edge.source) && topNodeIds.has(edge.target)
  );

  return {
    ...data,
    nodes: topNodes,
    edges: topEdges,
  };
}

export function getConnectedNodes(
  data: GraphData,
  centerNodeId: string,
  maxDepth: number = 2
): GraphData {
  const connectedNodeIds = new Set<string>([centerNodeId]);
  const connectedEdges: GraphEdge[] = [];
  let currentLevel = new Set<string>([centerNodeId]);

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextLevel = new Set<string>();

    for (const edge of data.edges) {
      if (currentLevel.has(edge.source) && !connectedNodeIds.has(edge.target)) {
        nextLevel.add(edge.target);
        connectedNodeIds.add(edge.target);
        connectedEdges.push(edge);
      } else if (currentLevel.has(edge.target) && !connectedNodeIds.has(edge.source)) {
        nextLevel.add(edge.source);
        connectedNodeIds.add(edge.source);
        connectedEdges.push(edge);
      } else if (currentLevel.has(edge.source) || currentLevel.has(edge.target)) {
        if (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)) {
          connectedEdges.push(edge);
        }
      }
    }

    if (nextLevel.size === 0) break;
    currentLevel = nextLevel;
  }

  const connectedNodes = data.nodes.filter((node) => connectedNodeIds.has(node.id));

  return {
    ...data,
    nodes: connectedNodes,
    edges: connectedEdges,
  };
}

export function* chunkGraphData(
  data: GraphData,
  chunkSize: number = CHUNK_SIZE
): Generator<GraphData> {
  for (let i = 0; i < data.nodes.length; i += chunkSize) {
    const chunkNodes = data.nodes.slice(i, i + chunkSize);
    const chunkNodeIds = new Set(chunkNodes.map((n) => n.id));

    const chunkEdges = data.edges.filter(
      (edge) => chunkNodeIds.has(edge.source) && chunkNodeIds.has(edge.target)
    );

    yield {
      ...data,
      nodes: chunkNodes,
      edges: chunkEdges,
    };
  }
}

export function filterByCategory(data: GraphData, categories: Set<string>): GraphData {
  const filteredNodes = data.nodes.filter((node) => categories.has(node.category));
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  const filteredEdges = data.edges.filter(
    (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );

  return {
    ...data,
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

export function searchNodes(data: GraphData, query: string): GraphData {
  const lowerQuery = query.toLowerCase();
  const matchedNodes = data.nodes.filter((node) => node.name.toLowerCase().includes(lowerQuery));

  if (matchedNodes.length === 0) {
    return { ...data, nodes: [], edges: [] };
  }

  const matchedNodeIds = new Set(matchedNodes.map((n) => n.id));
  const relatedNodeIds = new Set(matchedNodeIds);

  for (const edge of data.edges) {
    if (matchedNodeIds.has(edge.source)) {
      relatedNodeIds.add(edge.target);
    }
    if (matchedNodeIds.has(edge.target)) {
      relatedNodeIds.add(edge.source);
    }
  }

  const resultNodes = data.nodes.filter((node) => relatedNodeIds.has(node.id));
  const resultEdges = data.edges.filter(
    (edge) => relatedNodeIds.has(edge.source) && relatedNodeIds.has(edge.target)
  );

  return {
    ...data,
    nodes: resultNodes.map((node) => ({
      ...node,
      highlighted: matchedNodeIds.has(node.id),
    })),
    edges: resultEdges,
  };
}

export function calculateGraphStats(data: GraphData): {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  maxDegree: number;
  density: number;
  clusterCount: number;
} {
  const degrees = calculateNodeDegree(data);
  const degreeValues = Array.from(degrees.values());
  const clusters = detectClusters(data);

  const avgDegree = degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length || 0;
  const maxDegree = Math.max(...degreeValues, 0);
  const density =
    data.nodes.length > 1
      ? (2 * data.edges.length) / (data.nodes.length * (data.nodes.length - 1))
      : 0;

  return {
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    avgDegree,
    maxDegree,
    density,
    clusterCount: clusters.size,
  };
}

export function preloadNodePositions(data: GraphData, layoutType: string = 'force'): void {
  if (layoutType === 'force') {
    const centerX = 0;
    const centerY = 0;
    const radius = Math.sqrt(data.nodes.length) * 50;

    data.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / data.nodes.length;
      const r = radius * (0.5 + Math.random() * 0.5);
      updateNodePosition(node.id, {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      });
    });
  } else if (layoutType === 'circular') {
    const radius = Math.max(200, data.nodes.length * 2);
    data.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / data.nodes.length;
      updateNodePosition(node.id, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    });
  } else if (layoutType === 'hierarchical') {
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const bfs = (startId: string, level: number) => {
      const queue = [{ id: startId, level }];
      while (queue.length > 0) {
        const { id, level: currentLevel } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        levels.set(id, currentLevel);

        for (const edge of data.edges) {
          if (edge.source === id && !visited.has(edge.target)) {
            queue.push({ id: edge.target, level: currentLevel + 1 });
          } else if (edge.target === id && !visited.has(edge.source)) {
            queue.push({ id: edge.source, level: currentLevel + 1 });
          }
        }
      }
    };

    if (data.nodes.length > 0) {
      bfs(data.nodes[0].id, 0);
    }

    const levelGroups = new Map<number, string[]>();
    for (const [nodeId, level] of levels) {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(nodeId);
    }

    const levelHeight = 100;
    for (const [level, nodeIds] of levelGroups) {
      const y = level * levelHeight;
      nodeIds.forEach((nodeId, index) => {
        updateNodePosition(nodeId, {
          x: (index - nodeIds.length / 2) * 80,
          y,
        });
      });
    }
  }
}
