import { apiClient } from './client';
import type {
  Entity,
  Relation,
  GraphData,
  GraphNode,
  GraphEdge,
  EntityType,
  RelationType,
} from '../types/chat';

const getEntityColor = (type: EntityType): string => {
  const colors: Record<EntityType, string> = {
    inheritor: '#FF6B6B',
    technique: '#4ECDC4',
    work: '#45B7D1',
    pattern: '#96CEB4',
    region: '#FFEAA7',
    period: '#DDA0DD',
    material: '#98D8C8',
  };
  return colors[type] || '#666666';
};

const getRelationColor = (type: RelationType): string => {
  const colors: Record<RelationType, string> = {
    inherits: '#FF6B6B',
    origin: '#4ECDC4',
    creates: '#45B7D1',
    flourished_in: '#96CEB4',
    located_in: '#FFEAA7',
    uses_material: '#DDA0DD',
    has_pattern: '#98D8C8',
    related_to: '#888888',
    influenced_by: '#FFB6C1',
    contains: '#87CEEB',
  };
  return colors[type] || '#888888';
};

export interface EntityWithRelations extends Entity {
  relations?: Array<{
    target: Entity;
    type: RelationType;
    confidence: number;
  }>;
}

export interface GraphFilter {
  entityTypes?: EntityType[];
  relationTypes?: RelationType[];
  minConfidence?: number;
  searchQuery?: string;
}

export interface GraphLayoutOptions {
  type: 'force' | 'circular' | 'hierarchical' | 'radial';
  nodeSpacing?: number;
  linkDistance?: number;
  gravity?: number;
}

class GraphService {
  private cache: Map<string, GraphData> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private getCacheKey(sessionId: string, messageId?: string): string {
    return messageId ? `${sessionId}:${messageId}` : sessionId;
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCache(key: string, data: GraphData): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  private getFromCache(key: string): GraphData | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key) || null;
    }
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  entitiesToGraphData(
    entities: Entity[],
    relations?: Relation[],
    options?: { maxNodes?: number; minRelevance?: number }
  ): GraphData {
    let filteredEntities = entities;

    if (options?.minRelevance) {
      filteredEntities = entities.filter((e) => (e.relevance || 1) >= options.minRelevance!);
    }

    if (options?.maxNodes && filteredEntities.length > options.maxNodes) {
      filteredEntities = filteredEntities
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
        .slice(0, options.maxNodes);
    }

    const nodes: GraphNode[] = filteredEntities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      category: entity.type,
      symbolSize: this.calculateNodeSize(entity.relevance || 1),
      value: entity.relevance || 1,
      description: entity.description,
      metadata: entity.metadata,
      itemStyle: {
        color: getEntityColor(entity.type),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    }));

    const edges: GraphEdge[] = [];
    if (relations) {
      const entityIds = new Set(filteredEntities.map((e) => e.id));
      relations.forEach((relation, index) => {
        if (entityIds.has(relation.source) && entityIds.has(relation.target)) {
          edges.push({
            id: relation.id || `edge_${index}`,
            source: relation.source,
            target: relation.target,
            relationType: relation.type,
            value: relation.confidence || 1,
            lineStyle: {
              color: getRelationColor(relation.type),
              width: Math.max(1, (relation.confidence || 1) * 3),
              curveness: 0.3,
              opacity: 0.6,
            },
          });
        }
      });
    }

    const categories = this.getCategories(filteredEntities);

    return { nodes, edges, categories };
  }

  private calculateNodeSize(relevance: number): number {
    const minSize = 20;
    const maxSize = 50;
    return minSize + (maxSize - minSize) * Math.min(1, relevance);
  }

  private getCategories(entities: Entity[]): Array<{ name: EntityType; baseColor: string }> {
    const typeSet = new Set<EntityType>(entities.map((e) => e.type));
    return Array.from(typeSet).map((type) => ({
      name: type,
      baseColor: getEntityColor(type),
    }));
  }

  async getGraphData(sessionId: string, messageId?: string): Promise<GraphData> {
    const cacheKey = this.getCacheKey(sessionId, messageId);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const endpoint = messageId
        ? `/graph/session/${sessionId}/message/${messageId}`
        : `/graph/session/${sessionId}`;

      const response = await apiClient.get<{
        nodes: GraphNode[];
        edges: GraphEdge[];
        categories?: Array<{ name: EntityType; baseColor: string }>;
      }>(endpoint);

      const graphData: GraphData = {
        nodes: response.nodes || [],
        edges: response.edges || [],
        categories: response.categories,
      };

      this.setCache(cacheKey, graphData);
      return graphData;
    } catch (error) {
      console.warn('Failed to fetch graph data, returning empty graph');
      return { nodes: [], edges: [] };
    }
  }

  async getEntityDetails(entityId: string): Promise<EntityWithRelations | null> {
    try {
      const response = await apiClient.get<EntityWithRelations>(`/graph/entity/${entityId}`);
      return response;
    } catch (error) {
      console.warn('Failed to fetch entity details:', error);
      return null;
    }
  }

  async searchEntities(query: string, types?: EntityType[]): Promise<Entity[]> {
    try {
      const response = await apiClient.post<Entity[]>('/graph/search', {
        query,
        types,
      });
      return response;
    } catch (error) {
      console.warn('Failed to search entities:', error);
      return [];
    }
  }

  async getRelatedEntities(entityId: string, depth: number = 1): Promise<Entity[]> {
    try {
      const response = await apiClient.get<Entity[]>(`/graph/entity/${entityId}/related`, {
        params: { depth },
      });
      return response;
    } catch (error) {
      console.warn('Failed to fetch related entities:', error);
      return [];
    }
  }

  async getEntityPath(
    sourceId: string,
    targetId: string
  ): Promise<Array<{ entity: Entity; relation?: Relation }>> {
    try {
      const response = await apiClient.get<Array<{ entity: Entity; relation?: Relation }>>(
        `/graph/path/${sourceId}/${targetId}`
      );
      return response;
    } catch (error) {
      console.warn('Failed to find entity path:', error);
      return [];
    }
  }

  filterGraphData(data: GraphData, filter: GraphFilter): GraphData {
    let filteredNodes = [...data.nodes];
    let filteredEdges = [...data.edges];

    if (filter.entityTypes && filter.entityTypes.length > 0) {
      filteredNodes = filteredNodes.filter((n) => filter.entityTypes!.includes(n.category));
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        (n) => n.name.toLowerCase().includes(query) || n.description?.toLowerCase().includes(query)
      );
    }

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    filteredEdges = filteredEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    if (filter.minConfidence) {
      filteredEdges = filteredEdges.filter((e) => (e.value || 1) >= filter.minConfidence!);
    }

    if (filter.relationTypes && filter.relationTypes.length > 0) {
      filteredEdges = filteredEdges.filter((e) => filter.relationTypes!.includes(e.relationType));
    }

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      categories: data.categories,
    };
  }

  mergeGraphData(...graphs: GraphData[]): GraphData {
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();
    const mergedEdges: GraphEdge[] = [];

    graphs.forEach((graph) => {
      graph.nodes.forEach((node) => {
        if (!nodeMap.has(node.id)) {
          nodeMap.set(node.id, node);
        }
      });

      graph.edges.forEach((edge) => {
        const edgeKey = `${edge.source}-${edge.target}-${edge.relationType}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          mergedEdges.push(edge);
        }
      });
    });

    const allCategories = graphs
      .flatMap((g) => g.categories || [])
      .reduce(
        (acc, cat) => {
          if (!acc.find((c) => c.name === cat.name)) {
            acc.push(cat);
          }
          return acc;
        },
        [] as Array<{ name: EntityType; baseColor: string }>
      );

    return {
      nodes: Array.from(nodeMap.values()),
      edges: mergedEdges,
      categories: allCategories,
    };
  }

  calculateGraphStats(data: GraphData): {
    nodeCount: number;
    edgeCount: number;
    avgConnections: number;
    density: number;
    typeDistribution: Record<EntityType, number>;
  } {
    const nodeCount = data.nodes.length;
    const edgeCount = data.edges.length;

    const connectionCounts = new Map<string, number>();
    data.edges.forEach((edge) => {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
    });

    const totalConnections = Array.from(connectionCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const avgConnections = nodeCount > 0 ? totalConnections / nodeCount : 0;

    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    const typeDistribution: Record<EntityType, number> = {
      inheritor: 0,
      technique: 0,
      work: 0,
      pattern: 0,
      region: 0,
      period: 0,
      material: 0,
    };
    data.nodes.forEach((node) => {
      typeDistribution[node.category]++;
    });

    return {
      nodeCount,
      edgeCount,
      avgConnections,
      density,
      typeDistribution,
    };
  }

  exportToJSON(data: GraphData): string {
    return JSON.stringify(data, null, 2);
  }

  exportToCSV(data: GraphData): { nodes: string; edges: string } {
    const nodesHeader = 'id,name,category,description,value\n';
    const nodesContent = data.nodes
      .map((n) => `"${n.id}","${n.name}","${n.category}","${n.description || ''}",${n.value || 1}`)
      .join('\n');

    const edgesHeader = 'source,target,relationType,value\n';
    const edgesContent = data.edges
      .map((e) => `"${e.source}","${e.target}","${e.relationType}",${e.value || 1}`)
      .join('\n');

    return {
      nodes: nodesHeader + nodesContent,
      edges: edgesHeader + edgesContent,
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const graphService = new GraphService();
export default graphService;
