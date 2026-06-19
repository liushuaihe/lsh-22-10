import { useState, useMemo } from 'react';
import { Package, ChevronDown, ChevronUp, Snowflake, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';
import type { SKU as SKUType, Batch, AllocationItem } from '@/types';
import { BatchQueue } from './BatchQueue';
import { getSkuFrozenStock, getSkuExpiredStock, getSkuWarningStock, calculateRiskScore } from '@/utils/inventoryCalculator';

interface SKUCardProps {
  sku: SKUType;
  batches: Batch[];
  previewAllocations?: AllocationItem[];
}

export function SKUCard({ sku, batches, previewAllocations = [] }: SKUCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const skuBatches = batches.filter(b => b.skuId === sku.id);
  const frozenStock = getSkuFrozenStock(sku.id, batches);
  const expiredStock = getSkuExpiredStock(sku.id, batches);
  const warningStock = getSkuWarningStock(sku.id, batches);
  
  const riskScore = useMemo(() => {
    return calculateRiskScore(sku.id, sku.category, batches);
  }, [sku.id, sku.category, batches]);
  
  const hasWarning = warningStock > 0 || frozenStock > 0 || expiredStock > 0;

  const getRiskColorClasses = () => {
    switch (riskScore.level) {
      case 'safe':
        return {
          bg: 'bg-gradient-to-br from-emerald-900/10 to-transparent',
          border: 'border-emerald-800/30',
          iconBg: 'bg-emerald-500/20 border-emerald-500/30',
          iconColor: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        };
      case 'attention':
        return {
          bg: 'bg-gradient-to-br from-yellow-900/10 to-transparent',
          border: 'border-yellow-800/30',
          iconBg: 'bg-yellow-500/20 border-yellow-500/30',
          iconColor: 'text-yellow-400',
          badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        };
      case 'danger':
        return {
          bg: 'bg-gradient-to-br from-orange-900/10 to-transparent',
          border: 'border-orange-800/30',
          iconBg: 'bg-orange-500/20 border-orange-500/30',
          iconColor: 'text-orange-400',
          badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        };
      case 'critical':
        return {
          bg: 'bg-gradient-to-br from-red-900/20 to-transparent',
          border: 'border-red-800/40',
          iconBg: 'bg-red-500/20 border-red-500/30',
          iconColor: 'text-red-400',
          badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
      default:
        return {
          bg: 'bg-slate-800/50',
          border: 'border-slate-700',
          iconBg: 'bg-cyan-500/20 border-cyan-500/30',
          iconColor: 'text-cyan-400',
          badgeBg: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
        };
    }
  };

  const riskColors = getRiskColorClasses();

  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${riskColors.bg} ${riskColors.border} hover:brightness-110`}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl border ${riskColors.iconBg}`}>
              <Package size={24} className={riskColors.iconColor} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-100">{sku.name}</h3>
                {riskScore.level !== 'safe' && (
                  <ShieldAlert size={14} className={`${riskColors.iconColor} animate-pulse`} />
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">{sku.skuCode}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-slate-700/50 text-slate-400">
                {sku.category}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${riskColors.badgeBg}`}>
                {riskScore.levelLabel}
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums">
              {sku.totalStock}
              <span className="text-sm text-slate-500 ml-1">件</span>
            </div>
            <div className="flex items-center justify-end gap-3 mt-1 text-xs">
              {warningStock > 0 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <AlertTriangle size={12} />
                  临期 {warningStock}
                </span>
              )}
              {frozenStock > 0 && (
                <span className="flex items-center gap-1 text-cyan-400">
                  <Snowflake size={12} />
                  冻结 {frozenStock}
                </span>
              )}
              {expiredStock > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle size={12} />
                  过期 {expiredStock}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>共 {skuBatches.length} 个批次</span>
              <span className="text-slate-600">|</span>
              <span>可用 {sku.totalStock} 件</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-0.5">风险分</div>
                <div className={`font-mono text-lg font-bold tabular-nums ${riskColors.iconColor}`}>
                  {riskScore.total}
                </div>
              </div>
              <button className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>
          
          <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                riskScore.level === 'safe' ? 'bg-emerald-500' :
                riskScore.level === 'attention' ? 'bg-yellow-500' :
                riskScore.level === 'danger' ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${riskScore.total}%` }}
            />
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-4">
          <BatchQueue batches={skuBatches} previewAllocations={previewAllocations} />
        </div>
      )}
    </div>
  );
}
