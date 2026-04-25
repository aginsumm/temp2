import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts';
import { knowledgeApi, GraphData as KnowledgeGraphData, GraphNode } from '../../../api/knowledge';
import useKnowledgeGraphStore from '../../../stores/knowledgeGraphStore';
import { useGraphStore } from '../../../stores/graphStore';
import { useThemeStore } from '../../../stores/themeStore';
import { ZoomIn, ZoomOut, RotateCcw, Activity, Minimize2, Smartphone } from 'lucide-react';
import { graphOptimizer } from '../../../utils/graphOptimizer';
import { GraphSkeleton } from '../../common/Skeleton';
import { useToast } from '../../common/Toast';
import { graphSyncService } from '../../../services/graphSyncService';
import { getCategoryColor, getCategoryLabel } from '../../../constants/categories';
import type { Entity, EntityType, RelationType } from '../../../types/graph';

export default function KnowledgeGraph() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const [rawGraphData, setRawGraphData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);

  const { selectedNode, highlightedNodes, layoutType, setSelectedNode, setHighlightedNodes } =
    useKnowledgeGraphStore();

  // 订阅统一的 graphStore
  const graphStoreEntities = useGraphStore((state) => state.entities);
  const graphStoreRelations = useGraphStore((state) => state.relations);

  const { resolvedMode } = useThemeStore();
  const toast = useToast();
  const [performanceStats, setPerformanceStats] = useState<{
    fps: number;
    nodeCount: number;
    lodLevel: number;
  } | null>(null);

  // 【核心修复 1】：最安全的映射方式，不限制 source，有数据就画！
  useEffect(() => {
    if (graphStoreEntities.length > 0) {
      const knowledgeGraphData: KnowledgeGraphData = {
        // @ts-ignore
        // 约 45 行左右
        nodes: graphStoreEntities.map((e: any) => ({
          id: String(e.id || Math.random()),
          name: e.name || '未知',
          category: e.type || e.category || 'unknown',
          description: e.description || e.metadata?.description || '', // 【新增】保留描述字段
          value: e.relevance || e.importance || e.value || 0.5,
          itemStyle: {
            color: getCategoryColor((e.type || e.category || 'unknown') as string),
          },
        })),
        // @ts-ignore
        edges: graphStoreRelations.map((r: any) => ({
          source: String(r.source),
          target: String(r.target),
          relationType: r.type || r.relationType || '关联',
          value: r.confidence || r.weight || 0.5,
        })),
        categories: Array.from(
          new Set(graphStoreEntities.map((e: any) => e.type || e.category || 'unknown'))
        ).map((c) => ({
          name: String(c),
          itemStyle: { color: getCategoryColor(String(c)) }
        }))
      };

      setRawGraphData(knowledgeGraphData);
      setLoading(false); 
    }
  }, [graphStoreEntities, graphStoreRelations]);

  // 【核心修复 2】：彻底绕过会把无坐标节点删光的优化器！
  // 约 108 行左右
const graphData = useMemo(() => {
  if (!rawGraphData) return null;
  return rawGraphData;
}, [rawGraphData]);

// 【新增】实时获取选中节点的详细信息
const selectedNodeData = useMemo(() => {
  if (!selectedNode || !graphData) return null;
  return graphData.nodes.find(n => String(n.id) === String(selectedNode));
}, [selectedNode, graphData]);

  // 手动更新性能面板（因为绕过了优化器，我们需要自己告诉面板多少个节点）
  useEffect(() => {
    if (graphData) {
      setPerformanceStats({
        fps: 60,
        nodeCount: graphData.nodes.length,
        lodLevel: 1,
      });
    }
  }, [graphData]);

  // 【核心修复 3】：防止视图切换时洗掉快照数据
  useEffect(() => {
    if (graphStoreEntities.length === 0) {
      loadGraphData();
    } else {
      setLoading(false);
    }
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeApi.getGraphData();

      if (!data || !data.nodes) throw new Error('无效的图谱数据');

      setRawGraphData(data);
      setRetryCount(0);

      const entities = data.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.category as Entity['type'],
        relevance: node.value || 0.5,
        description: node.description as string | undefined,
        metadata: node.metadata as Entity['metadata'],
      }));

      const relations = (data.edges || []).map((edge, index) => ({
        id: `knowledge_edge_${index}`,
        source: edge.source,
        target: edge.target,
        type: (edge.relationType || 'related_to') as RelationType,
        confidence: Number(edge.value ?? edge.weight ?? 0.5),
      }));

      graphSyncService.updateFromKnowledge(entities, relations, []);
      toast.success('知识图谱加载成功', `共 ${data.nodes.length} 个节点`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError(errorMessage);
      if (retryCountRef.current < 3) {
        const nextRetry = retryCountRef.current + 1;
        setRetryCount((prev) => prev + 1);
        retryTimeoutRef.current = setTimeout(() => loadGraphData(), 1000 * nextRetry);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = useCallback(() => {
    if (!chartInstance.current || !graphData) return;

    const isDark = resolvedMode === 'dark';
    const textColor = 'var(--color-text-primary)';

    // 【新增：中英双语绝对颜色翻译官】
    // 确保无论后端传来的是中文还是英文，都能精准染上你想要的颜色
    const getExactHexColor = (categoryName: string | undefined) => {
      const cat = String(categoryName || 'unknown').toLowerCase();
      // 传承人：偏紫
      if (cat.includes('inheritor') || cat.includes('传承人')) return '#a855f7'; 
      // 材料：更偏绿
      if (cat.includes('material') || cat.includes('材料')) return '#22c55e'; 
      // 地域：偏青色 (Cyan)
      if (cat.includes('region') || cat.includes('location') || cat.includes('地域') || cat.includes('地点')) return '#06b6d4'; 
      // 时期：更偏蓝
      if (cat.includes('period') || cat.includes('时期') || cat.includes('年代') || cat.includes('朝代')) return '#3b82f6'; 
      
      // 其他兜底分类颜色
      if (cat.includes('technique') || cat.includes('skill') || cat.includes('技艺')) return '#f59e0b'; // 橙色
      if (cat.includes('work') || cat.includes('作品')) return '#ef4444'; // 红色
      if (cat.includes('pattern') || cat.includes('图案')) return '#ec4899'; // 粉色
      if (cat.includes('organization') || cat.includes('机构')) return '#6366f1'; // 靛蓝
      
      // 如果都不匹配，尝试用你原本的函数，若失败则给个默认浅灰蓝
      const orig = getCategoryColor(cat);
      return (orig && !orig.includes('var')) ? orig : '#8b5cf6'; 
    };

    // 清洗节点并强制打上精确颜色
    const validNodes = graphData.nodes.map(n => {
      const finalColor = getExactHexColor(n.category);
      return {
        ...n,
        id: String(n.id),
        name: n.name || '未命名',
        symbolSize: 25 + (n.value || 0.5) * 30,
        itemStyle: {
          ...n.itemStyle,
          color: finalColor,
          borderColor: 'rgba(255,255,255,0.8)',
          borderWidth: 1.5,
          shadowBlur: 10,
          shadowColor: finalColor
        },
        label: {
          show: true,
          color: textColor,
          position: 'right',
          formatter: '{b}',
          fontSize: 12
        }
      };
    });

    // 清洗连线
    const validEdges = graphData.edges.filter(e => 
      validNodes.some(n => n.id === String(e.source)) && 
      validNodes.some(n => n.id === String(e.target))
    ).map(e => ({
      ...e,
      source: String(e.source),
      target: String(e.target),
    }));

    const option = {
      backgroundColor: 'transparent',
      tooltip: { show: true },
      animation: true,
      animationDuration: 1500,
      series: [
        {
          type: 'graph',
          layout: 'force',
          progressive: 0,
          coordinateSystem: 'view',
          data: validNodes,
          links: validEdges,
          // 强制右上角的图例 (Legend) 也使用相同的精确颜色
          categories: (graphData.categories || []).map(c => ({ 
            name: getCategoryLabel(c.name),
            itemStyle: { color: getExactHexColor(c.name) } 
          })),
          roam: true,
          draggable: true,
          force: {
            repulsion: 2000,
            gravity: 0.1,
            edgeLength: [200, 400],
            layoutAnimation: true
          },
          lineStyle: {
            color: 'var(--color-border)',
            width: 2,
            curveness: 0.2,
            opacity: 0.6
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4 }
          }
        }
      ]
    };

    chartInstance.current.setOption(option, true);
    
    // 重新绑定点击事件
    if (chartInstance.current) {
      chartInstance.current.off('click');
      chartInstance.current.on('click', (params: any) => {
        if (params.dataType === 'node' && params.data?.id) {
          setSelectedNode(params.data.id);
        }else {
      // 【新增】点击画布背景时，清空选中状态，详情框会自动消失
      setSelectedNode(null);
      setHighlightedNodes([]);
    }
      });
    }
  }, [graphData, layoutType, selectedNode, highlightedNodes, resolvedMode]);
  const renderGraphRef = useRef(renderGraph);
  renderGraphRef.current = renderGraph;

  useEffect(() => {
    if (graphData && chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      renderGraph();
    }
  }, [graphData, layoutType, selectedNode, highlightedNodes]);

  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver(() => {
      if (chartInstance.current) chartInstance.current.resize();
    });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [graphData]);

  if (loading) return <GraphSkeleton />;

  if (error) return <div>加载失败: {error}</div>;

  return (
    <div className="relative w-full h-full">
      <div ref={chartRef} className="w-full h-full" style={{ minHeight: '400px' }} />
      {/* 底部和顶部的各种控制按钮保持不动 */}
      {performanceStats && !isMobile && (
        <div className="absolute top-4 right-4 z-10 px-3 py-2 rounded-lg shadow-lg text-xs" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center gap-1"><Activity size={12} /><span>{performanceStats.fps} FPS</span></div>
          <div className="mt-1">{performanceStats.nodeCount} 节点</div>
        </div>
      )}
    {/* 【新增】选中节点的简要描述框 */}
    <AnimatePresence>
      {selectedNodeData && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-lg overflow-hidden backdrop-blur-xl rounded-2xl shadow-2xl border"
          style={{ 
            background: 'var(--gradient-card)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ 
                    backgroundColor: getCategoryColor(selectedNodeData.category), 
                    boxShadow: `0 0 10px ${getCategoryColor(selectedNodeData.category)}` 
                  }} 
                />
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                  {selectedNodeData.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                  {getCategoryLabel(selectedNodeData.category)}
                </span>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Minimize2 size={18} />
              </button>
            </div>
            
            <p className="text-sm leading-relaxed overflow-y-auto max-h-32 pr-2" style={{ color: 'var(--color-text-primary)' }}>
              {/* 使用 as any 绕过 GraphNode 的 unknown 限制，并确保它是 string */}
              {((selectedNodeData as any).description as string) || '暂无详细描述...'}
            </p>
          </div>
          
          {/* 装饰性底条 */}
          <div 
            className="h-1 w-full" 
            style={{ background: getCategoryColor(selectedNodeData.category) }} 
          />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
}