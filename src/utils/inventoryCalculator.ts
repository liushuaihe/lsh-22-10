import type { Batch, RiskScore, RiskLevel } from '@/types';
import { riskWeights, getLowStockThreshold, getRiskLevel, getFrozenThreshold } from '@/data/riskConfig';

export function calculateDaysRemaining(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function calculateExpiryStatus(expiryDate: string): 'normal' | 'warning' | 'expired' {
  const daysRemaining = calculateDaysRemaining(expiryDate);
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'warning';
  if (daysRemaining <= 30) return 'warning';
  return 'normal';
}

export function calculateExpiryPercentage(productionDate: string, expiryDate: string): number {
  const production = new Date(productionDate).getTime();
  const expiry = new Date(expiryDate).getTime();
  const today = Date.now();
  
  if (today >= expiry) return 100;
  if (today <= production) return 0;
  
  const totalShelfLife = expiry - production;
  const elapsed = today - production;
  return Math.round((elapsed / totalShelfLife) * 100);
}

export function getSkuTotalStock(skuId: string, batches: Batch[]): number {
  return batches
    .filter(b => b.skuId === skuId && !b.isFrozen && b.status !== 'expired')
    .reduce((sum, b) => sum + b.availableQuantity, 0);
}

export function getSkuFrozenStock(skuId: string, batches: Batch[]): number {
  return batches
    .filter(b => b.skuId === skuId && b.isFrozen)
    .reduce((sum, b) => sum + b.availableQuantity, 0);
}

export function getSkuExpiredStock(skuId: string, batches: Batch[]): number {
  return batches
    .filter(b => b.skuId === skuId && b.status === 'expired')
    .reduce((sum, b) => sum + b.availableQuantity, 0);
}

export function getSkuWarningStock(skuId: string, batches: Batch[]): number {
  return batches
    .filter(b => b.skuId === skuId && b.status === 'warning' && !b.isFrozen)
    .reduce((sum, b) => sum + b.availableQuantity, 0);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBatchNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `B${dateStr}${random}`;
}

export function getSkuTotalStockAll(skuId: string, batches: Batch[]): number {
  return batches
    .filter(b => b.skuId === skuId)
    .reduce((sum, b) => sum + b.quantity, 0);
}

export function getSkuExpiredBatchCount(skuId: string, batches: Batch[]): number {
  return batches.filter(b => b.skuId === skuId && b.status === 'expired').length;
}

export function getSkuBatchCount(skuId: string, batches: Batch[]): number {
  return batches.filter(b => b.skuId === skuId).length;
}

export function calculateRiskScore(
  skuId: string,
  category: string,
  batches: Batch[]
): RiskScore {
  const totalStock = getSkuTotalStockAll(skuId, batches);
  const warningStock = getSkuWarningStock(skuId, batches);
  const frozenStock = getSkuFrozenStock(skuId, batches);
  const expiredBatchCount = getSkuExpiredBatchCount(skuId, batches);
  const totalBatchCount = getSkuBatchCount(skuId, batches);
  const availableStock = getSkuTotalStock(skuId, batches);
  const lowStockThreshold = getLowStockThreshold(category);

  const warningRatioScore = totalStock > 0
    ? Math.min(100, (warningStock / totalStock) * 100)
    : 0;

  const frozenThreshold = getFrozenThreshold(category);
  const frozenScore = frozenThreshold > 0
    ? Math.min(100, (frozenStock / frozenThreshold) * 100)
    : 0;

  const expiredScore = totalBatchCount > 0
    ? Math.min(100, (expiredBatchCount / totalBatchCount) * 100)
    : 0;

  const lowStockScore = lowStockThreshold > 0
    ? Math.min(100, Math.max(0, (1 - availableStock / lowStockThreshold) * 100))
    : 0;

  const total = Math.round(
    warningRatioScore * riskWeights.warningRatio +
    frozenScore * riskWeights.frozenQuantity +
    expiredScore * riskWeights.expiredBatches +
    lowStockScore * riskWeights.lowStock
  );

  const riskLevelConfig = getRiskLevel(total);

  return {
    total,
    warningRatioScore: Math.round(warningRatioScore),
    frozenScore: Math.round(frozenScore),
    expiredScore: Math.round(expiredScore),
    lowStockScore: Math.round(lowStockScore),
    level: riskLevelConfig.level as RiskLevel,
    levelLabel: riskLevelConfig.label,
  };
}
