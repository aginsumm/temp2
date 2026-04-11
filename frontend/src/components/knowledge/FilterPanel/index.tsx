import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { knowledgeApi } from '../../../api/knowledge';
import useKnowledgeGraphStore from '../../../stores/knowledgeGraphStore';

interface ExpandedSections {
  region: boolean;
  period: boolean;
}

export default function FilterPanel() {
  const [regions, setRegions] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    region: true,
    period: true,
  });

  const {
    region: selectedRegions,
    period: selectedPeriods,
    setRegion,
    setPeriod,
    filterPanelCollapsed,
    toggleFilterPanel,
  } = useKnowledgeGraphStore();

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [regionsData, periodsData] = await Promise.all([
        knowledgeApi.getRegions(),
        knowledgeApi.getPeriods(),
      ]);
      setRegions(regionsData);
      setPeriods(periodsData);
    } catch (error) {
      console.error('加载筛选选项失败:', error);
    }
  };

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRegionToggle = (region: string) => {
    const newRegions = selectedRegions.includes(region)
      ? selectedRegions.filter((r) => r !== region)
      : [...selectedRegions, region];
    setRegion(newRegions);
  };

  const handlePeriodToggle = (period: string) => {
    const newPeriods = selectedPeriods.includes(period)
      ? selectedPeriods.filter((p) => p !== period)
      : [...selectedPeriods, period];
    setPeriod(newPeriods);
  };

  if (filterPanelCollapsed) {
    return (
      <motion.button
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -100, opacity: 0 }}
        onClick={toggleFilterPanel}
        whileHover={{ width: 64 }}
        className="w-12 h-32 backdrop-blur-xl rounded-r-2xl shadow-2xl flex flex-col items-center justify-center gap-2 group transition-all"
        style={{
          background: 'var(--gradient-card)',
          borderRight: '1px solid var(--color-border)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronRight
            size={24}
            style={{ color: 'var(--color-primary)' }}
            className="transition-colors"
          />
        </motion.div>
        <span
          className="text-xs writing-mode-vertical opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
        >
          筛选
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-80 backdrop-blur-xl h-full flex flex-col relative overflow-hidden"
      style={{
        background: 'var(--gradient-card)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, var(--color-primary), var(--color-secondary), var(--color-accent))',
          opacity: 0.03,
        }}
      />

      <div className="relative z-10">
        <div className="p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Filter size={18} style={{ color: 'var(--color-text-inverse)' }} />
              </div>
              <div>
                <span>筛选条件</span>
                <p className="text-xs font-normal mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  按地域和时期筛选
                </p>
              </div>
            </h2>
            <motion.button
              onClick={toggleFilterPanel}
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-xl transition-all group"
              style={{ background: 'var(--color-surface)' }}
            >
              <ChevronLeft
                size={20}
                style={{ color: 'var(--color-text-muted)' }}
                className="transition-colors"
              />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <motion.button
            onClick={() => toggleSection('region')}
            whileHover={{ x: 4 }}
            className="w-full flex items-center justify-between text-sm font-medium mb-3 group"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: 'var(--color-primary)' }} />
              地域
            </span>
            <motion.div
              animate={{ rotate: expandedSections.region ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown
                size={16}
                style={{ color: 'var(--color-text-muted)' }}
                className="transition-colors"
              />
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {expandedSections.region && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {regions &&
                  regions.length > 0 &&
                  regions.map((region, index) => (
                    <motion.label
                      key={region}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedRegions.includes(region)}
                          onChange={() => handleRegionToggle(region)}
                          className="sr-only"
                        />
                        <div
                          className="w-5 h-5 rounded-md border-2 transition-all"
                          style={{
                            background: selectedRegions.includes(region) ? 'var(--gradient-primary)' : 'transparent',
                            borderColor: selectedRegions.includes(region) ? 'var(--color-primary)' : 'var(--color-border)',
                          }}
                        >
                          {selectedRegions.includes(region) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-full h-full flex items-center justify-center"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 12 12"
                                style={{ color: 'var(--color-text-inverse)' }}
                              >
                                <path d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 00-1.06-1.06z" />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                        {region}
                      </span>
                    </motion.label>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <motion.button
            onClick={() => toggleSection('period')}
            whileHover={{ x: 4 }}
            className="w-full flex items-center justify-between text-sm font-medium mb-3 group"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: 'var(--color-secondary)' }} />
              时期
            </span>
            <motion.div
              animate={{ rotate: expandedSections.period ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown
                size={16}
                style={{ color: 'var(--color-text-muted)' }}
                className="transition-colors"
              />
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {expandedSections.period && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {periods &&
                  periods.length > 0 &&
                  periods.map((period, index) => (
                    <motion.label
                      key={period}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedPeriods.includes(period)}
                          onChange={() => handlePeriodToggle(period)}
                          className="sr-only"
                        />
                        <div
                          className="w-5 h-5 rounded-md border-2 transition-all"
                          style={{
                            background: selectedPeriods.includes(period) ? 'var(--gradient-secondary)' : 'transparent',
                            borderColor: selectedPeriods.includes(period) ? 'var(--color-secondary)' : 'var(--color-border)',
                          }}
                        >
                          {selectedPeriods.includes(period) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-full h-full flex items-center justify-center"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 12 12"
                                style={{ color: 'var(--color-text-inverse)' }}
                              >
                                <path d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 00-1.06-1.06z" />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                        {period}
                      </span>
                    </motion.label>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-10 p-6" style={{ borderTop: '1px solid var(--color-border)' }}>
        <motion.button
          onClick={() => {
            setRegion([]);
            setPeriod([]);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 px-4 rounded-xl transition-all text-sm font-medium"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          清除筛选
        </motion.button>
      </div>
    </motion.div>
  );
}
