export interface RiskWeights {
  warningRatio: number;
  frozenQuantity: number;
  expiredBatches: number;
  lowStock: number;
}

export interface LowStockThreshold {
  category: string;
  threshold: number;
}

export interface FrozenThreshold {
  category: string;
  threshold: number;
}

export interface RiskLevelConfig {
  level: string;
  minScore: number;
  maxScore: number;
  label: string;
  color: string;
}

export const riskWeights: RiskWeights = {
  warningRatio: 0.3,
  frozenQuantity: 0.25,
  expiredBatches: 0.25,
  lowStock: 0.2,
};

export const lowStockThresholds: LowStockThreshold[] = [
  { category: '乳品', threshold: 100 },
  { category: '禽蛋', threshold: 150 },
  { category: '烘焙', threshold: 50 },
  { category: '肉类', threshold: 30 },
  { category: '饮料', threshold: 80 },
  { category: '生鲜', threshold: 40 },
];

export const frozenThresholds: FrozenThreshold[] = [
  { category: '乳品', threshold: 50 },
  { category: '禽蛋', threshold: 80 },
  { category: '烘焙', threshold: 20 },
  { category: '肉类', threshold: 15 },
  { category: '饮料', threshold: 40 },
  { category: '生鲜', threshold: 25 },
];

export const riskLevels: RiskLevelConfig[] = [
  { level: 'safe', minScore: 0, maxScore: 30, label: '低风险', color: 'emerald' },
  { level: 'attention', minScore: 30, maxScore: 60, label: '中风险', color: 'orange' },
  { level: 'danger', minScore: 60, maxScore: 85, label: '高风险', color: 'red' },
  { level: 'critical', minScore: 85, maxScore: 100, label: '极高风险', color: 'red' },
];

export const getLowStockThreshold = (category: string): number => {
  const config = lowStockThresholds.find(t => t.category === category);
  return config?.threshold ?? 50;
};

export const getFrozenThreshold = (category: string): number => {
  const config = frozenThresholds.find(t => t.category === category);
  return config?.threshold ?? 30;
};

export const getRiskLevel = (score: number): RiskLevelConfig => {
  const level = riskLevels.find(l => score >= l.minScore && score < l.maxScore);
  return level ?? riskLevels[riskLevels.length - 1];
};
