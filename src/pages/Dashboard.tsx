import { useState, useMemo } from 'react';
import { Warehouse, Box, AlertTriangle, TrendingUp, Package, Snowflake, ArrowDownCircle, ArrowUpCircle, BarChart3, ArrowUpDown, ShieldAlert, TrendingDown, CheckCircle2, Hash } from 'lucide-react';
import type { OperationType, RiskScore } from '@/types';
import { useInventoryStore } from '@/store/useInventoryStore';
import { OperationTabs } from '@/components/OperationPanel/OperationTabs';
import { InboundForm } from '@/components/OperationPanel/InboundForm';
import { OutboundForm } from '@/components/OperationPanel/OutboundForm';
import { FreezeForm } from '@/components/OperationPanel/FreezeForm';
import { SKUCard } from '@/components/InventoryDashboard/SKUCard';
import { AlertCenter } from '@/components/InventoryDashboard/AlertCenter';
import { OperationLogList } from '@/components/common/OperationLogList';
import { previewFIFOAllocation } from '@/utils/fifoEngine';
import { calculateRiskScore } from '@/utils/inventoryCalculator';

type SortType = 'default' | 'riskDesc' | 'riskAsc' | 'stockDesc' | 'stockAsc';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<OperationType>('outbound');
  const [outboundSku, setOutboundSku] = useState('');
  const [outboundQuantity, setOutboundQuantity] = useState('');
  const [sortType, setSortType] = useState<SortType>('riskDesc');
  const [prevOutboundSku, setPrevOutboundSku] = useState('');
  const [riskChangeInfo, setRiskChangeInfo] = useState<{
    prevName: string;
    newName: string;
    prevScore: number;
    newScore: number;
    diff: number;
  } | null>(null);
  
  const { skus, batches, alerts } = useInventoryStore();

  const previewAllocations = useMemo(() => {
    if (activeTab !== 'outbound' || !outboundSku || !outboundQuantity) return null;
    const qty = parseInt(outboundQuantity);
    if (qty <= 0) return null;
    const result = previewFIFOAllocation(outboundSku, qty, batches);
    return result.allocations;
  }, [activeTab, outboundSku, outboundQuantity, batches]);

  const skuRiskMap = useMemo(() => {
    const map = new Map<string, RiskScore>();
    skus.forEach(sku => {
      const risk = calculateRiskScore(sku.id, sku.category, batches);
      map.set(sku.id, risk);
    });
    return map;
  }, [skus, batches]);

  const sortedSkus = useMemo(() => {
    const skuList = [...skus];
    switch (sortType) {
      case 'riskDesc':
        return skuList.sort((a, b) => (skuRiskMap.get(b.id)?.total || 0) - (skuRiskMap.get(a.id)?.total || 0));
      case 'riskAsc':
        return skuList.sort((a, b) => (skuRiskMap.get(a.id)?.total || 0) - (skuRiskMap.get(b.id)?.total || 0));
      case 'stockDesc':
        return skuList.sort((a, b) => b.totalStock - a.totalStock);
      case 'stockAsc':
        return skuList.sort((a, b) => a.totalStock - b.totalStock);
      default:
        return skuList;
    }
  }, [skus, sortType, skuRiskMap]);

  const selectedSkuRank = useMemo(() => {
    if (!outboundSku) return -1;
    return sortedSkus.findIndex(s => s.id === outboundSku) + 1;
  }, [sortedSkus, outboundSku]);

  const selectedSkuRisk = useMemo(() => {
    if (!outboundSku) return null;
    return skuRiskMap.get(outboundSku) || null;
  }, [outboundSku, skuRiskMap]);

  const selectedSkuName = useMemo(() => {
    if (!outboundSku) return '';
    return skus.find(s => s.id === outboundSku)?.name || '';
  }, [outboundSku, skus]);

  const totalStock = useMemo(() => {
    return skus.reduce((sum, s) => sum + s.totalStock, 0);
  }, [skus]);

  const handleSkuChange = (skuId: string) => {
    if (skuId && prevOutboundSku && skuId !== prevOutboundSku) {
      const prevSku = skus.find(s => s.id === prevOutboundSku);
      const newSku = skus.find(s => s.id === skuId);
      if (prevSku && newSku) {
        const prevRisk = skuRiskMap.get(prevOutboundSku)?.total || 0;
        const newRisk = skuRiskMap.get(skuId)?.total || 0;
        const diff = newRisk - prevRisk;
        setRiskChangeInfo({
          prevName: prevSku.name,
          newName: newSku.name,
          prevScore: prevRisk,
          newScore: newRisk,
          diff,
        });
      }
    }
    setPrevOutboundSku(skuId);
    setOutboundSku(skuId);
  };

  const totalSKUs = skus.length;
  const totalBatches = batches.length;
  const activeAlerts = alerts.filter(a => !a.isRead).length;
  const warningBatches = batches.filter(b => b.status === 'warning' && !b.isFrozen).length;
  const frozenBatches = batches.filter(b => b.isFrozen).length;

  const stats = [
    { label: '总库存', value: totalStock, icon: Package, color: 'cyan' },
    { label: '商品种类', value: totalSKUs, icon: Box, color: 'emerald' },
    { label: '批次总数', value: totalBatches, icon: BarChart3, color: 'slate' },
    { label: '临期批次', value: warningBatches, icon: AlertTriangle, color: 'orange' },
    { label: '冻结批次', value: frozenBatches, icon: Snowflake, color: 'cyan' },
    { label: '未读告警', value: activeAlerts, icon: AlertTriangle, color: 'red' },
  ];

  const renderForm = () => {
    switch (activeTab) {
      case 'inbound':
        return <InboundForm />;
      case 'outbound':
        return (
          <OutboundForm
            onStateChange={(skuId, qty) => {
              if (skuId !== outboundSku) {
                handleSkuChange(skuId);
              } else {
                setOutboundSku(skuId);
              }
              setOutboundQuantity(qty);
            }}
          />
        );
      case 'freeze':
        return <FreezeForm />;
      default:
        return null;
    }
  };

  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    slate: 'text-slate-400 bg-slate-700/50 border-slate-600/50',
    orange: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    red: 'text-red-400 bg-red-500/20 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[linear-gradient(180deg,#0f172a_0%,#020617_100%)">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Warehouse size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  盲盒仓管
                  <span className="text-xs font-normal px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    进销存演练器
                  </span>
                </h1>
                <p className="text-sm text-slate-400">批次维度 · 先进先出 · 规则固化</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp size={16} className="text-emerald-400" />
                <span className="text-sm text-emerald-400">演练模式</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-6 gap-4 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const colors = colorClasses[stat.color as keyof typeof colorClasses];
            return (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">{stat.label}</span>
                  <div className={`p-1.5 rounded-lg border ${colors}`}>
                    <Icon size={14} />
                  </div>
                </div>
                <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums">
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-10 gap-6">
          <div className="col-span-4 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700 backdrop-blur-sm">
              <div className="mb-6">
                <OperationTabs activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
              {renderForm()}
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <BarChart3 size={20} className="text-slate-400" />
                  操作日志
                </h3>
              </div>
              <OperationLogList />
            </div>
          </div>

          <div className="col-span-6 space-y-6">
            <AlertCenter />
            
            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Warehouse size={20} className="text-cyan-400" />
                  全局库存大屏
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>低风险</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span>中风险</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      <span>高风险</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span>极高风险</span>
                    </div>
                  </div>
                  <div className="h-4 w-px bg-slate-600" />
                  <div className="flex items-center gap-2">
                    <ArrowUpDown size={14} className="text-slate-400" />
                    <select
                      value={sortType}
                      onChange={(e) => setSortType(e.target.value as SortType)}
                      className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500"
                    >
                      <option value="riskDesc">风险 ↓</option>
                      <option value="riskAsc">风险 ↑</option>
                      <option value="stockDesc">库存 ↓</option>
                      <option value="stockAsc">库存 ↑</option>
                    </select>
                  </div>
                </div>
              </div>

              {selectedSkuRisk && selectedSkuName && (
                <div className={`mb-4 p-3 rounded-lg border transition-all duration-500 ${
                  riskChangeInfo
                    ? riskChangeInfo.diff > 0
                      ? 'bg-red-500/10 border-red-500/30'
                      : riskChangeInfo.diff < 0
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-700/30 border-slate-600/50'
                    : selectedSkuRisk.level === 'safe'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : selectedSkuRisk.level === 'attention'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : selectedSkuRisk.level === 'danger'
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldAlert size={18} className={`${
                        selectedSkuRisk.level === 'safe' ? 'text-emerald-400' :
                        selectedSkuRisk.level === 'attention' ? 'text-yellow-400' :
                        selectedSkuRisk.level === 'danger' ? 'text-orange-400' : 'text-red-400'
                      }`} />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">
                          当前: <span className="font-semibold text-slate-100">{selectedSkuName}</span>
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                          selectedSkuRisk.level === 'safe' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          selectedSkuRisk.level === 'attention' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          selectedSkuRisk.level === 'danger' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {selectedSkuRisk.levelLabel}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Hash size={12} />
                          第 {selectedSkuRank} / {sortedSkus.length} 位
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-0.5">风险分</div>
                        <div className={`font-mono text-xl font-bold tabular-nums ${
                          selectedSkuRisk.level === 'safe' ? 'text-emerald-400' :
                          selectedSkuRisk.level === 'attention' ? 'text-yellow-400' :
                          selectedSkuRisk.level === 'danger' ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {selectedSkuRisk.total}
                        </div>
                      </div>
                      {riskChangeInfo && (
                        <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded ${
                          riskChangeInfo.diff > 0
                            ? 'bg-red-500/10 text-red-400'
                            : riskChangeInfo.diff < 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-700/30 text-slate-400'
                        }`}>
                          {riskChangeInfo.diff > 0 ? (
                            <><TrendingUp size={14} /> +{riskChangeInfo.diff}</>
                          ) : riskChangeInfo.diff < 0 ? (
                            <><TrendingDown size={14} /> {riskChangeInfo.diff}</>
                          ) : (
                            <><CheckCircle2 size={14} /> 持平</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {riskChangeInfo && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs text-slate-400">
                      切换: <span className="text-slate-300">{riskChangeInfo.prevName}</span>
                      {' → '}
                      <span className="text-slate-200 font-medium">{riskChangeInfo.newName}</span>
                      {' · '}
                      <span className="font-mono">{riskChangeInfo.prevScore}</span>
                      {' → '}
                      <span className={`font-mono font-semibold ${
                        riskChangeInfo.diff > 0 ? 'text-red-400' : riskChangeInfo.diff < 0 ? 'text-emerald-400' : 'text-slate-400'
                      }`}>{riskChangeInfo.newScore}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 max-h-[calc(100vh-520px)] overflow-y-auto pr-2 custom-scrollbar">
                {sortedSkus.map((sku, index) => (
                  <SKUCard
                    key={sku.id}
                    sku={sku}
                    batches={batches}
                    isSelected={outboundSku === sku.id}
                    rankIndex={index + 1}
                    previewAllocations={
                      activeTab === 'outbound' && previewAllocations && outboundSku === sku.id
                        ? previewAllocations
                        : []
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 flex flex-col gap-2 text-xs text-slate-500 font-mono opacity-50">
        <div className="flex items-center gap-2">
          <ArrowDownCircle size={12} />
          <span>入库</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpCircle size={12} />
          <span>出库</span>
        </div>
        <div className="flex items-center gap-2">
          <Snowflake size={12} />
          <span>冻结</span>
        </div>
      </div>
    </div>
  );
}
