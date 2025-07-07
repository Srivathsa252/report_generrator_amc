import React, { useState } from 'react';
import { BarChart3, TrendingUp, Target, DollarSign, Calendar, Filter, Users, Package, MapPin, PieChart, Activity, FileText } from 'lucide-react';
import { Receipt, Target as TargetType } from '../types';
import { committees, months, commodities } from '../data/committees';
import { useLocalStorage } from '../hooks/useLocalStorage';
import SeedDataButton from '../components/SeedDataButton';

// Chart Components
import CustomBarChart from '../components/charts/BarChart';
import CustomLineChart from '../components/charts/LineChart';
import CustomPieChart from '../components/charts/PieChart';
import CustomAreaChart from '../components/charts/AreaChart';
import DonutChart from '../components/charts/DonutChart';
import ProgressChart from '../components/charts/ProgressChart';
import MetricCard from '../components/charts/MetricCard';
import HeatmapChart from '../components/charts/HeatmapChart';

const Analytics: React.FC = () => {
  const [receipts] = useLocalStorage<Receipt[]>('receipts', []);
  const [targets] = useLocalStorage<TargetType[]>('targets', []);
  const [selectedYear, setSelectedYear] = useState<'2024-25' | '2025-26'>('2025-26');
  const [selectedMonth, setSelectedMonth] = useState<string>('May');
  const [selectedCommittee, setSelectedCommittee] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  // Filter receipts based on selections
  const filteredReceipts = receipts.filter(r => {
    const matchesYear = r.financialYear === selectedYear;
    const matchesCommittee = selectedCommittee === 'all' || r.committeeId === selectedCommittee;
    return matchesYear && matchesCommittee;
  });

  const marketFeeReceipts = filteredReceipts.filter(r => r.natureOfReceipt === 'mf');

  // Calculate comprehensive analytics
  const calculateAnalytics = () => {
    const analytics = committees.map(committee => {
      const committeeReceipts = marketFeeReceipts.filter(r => 
        r.committeeId === committee.id && r.financialYear === selectedYear
      );
      
      // Monthly data
      const monthlyData = months.map(month => {
        const monthReceipts = committeeReceipts.filter(r => {
          const receiptDate = new Date(r.date);
          const receiptMonth = receiptDate.toLocaleString('default', { month: 'long' });
          return receiptMonth === month;
        });
        
        const collected = monthReceipts.reduce((sum, r) => sum + r.marketFee, 0);
        const target = targets.find(t => t.committeeId === committee.id && t.financialYear === selectedYear)?.monthlyTargets[month] || 0;
        
        return {
          month,
          collected,
          target,
          percentage: target > 0 ? (collected / target) * 100 : 0,
          receiptCount: monthReceipts.length
        };
      });

      // Cumulative calculations
      const monthIndex = months.indexOf(selectedMonth);
      const cumulativeMonths = monthIndex >= 0 ? months.slice(0, monthIndex + 1) : [selectedMonth];
      
      const cumulativeReceipts = marketFeeReceipts.filter(r => {
        if (r.committeeId !== committee.id || r.financialYear !== selectedYear) return false;
        const receiptDate = new Date(r.date);
        const receiptMonth = receiptDate.toLocaleString('default', { month: 'long' });
        return cumulativeMonths.includes(receiptMonth);
      });

      const achieved = cumulativeReceipts.reduce((sum, r) => sum + r.marketFee, 0);
      const yearlyTarget = targets.find(t => t.committeeId === committee.id && t.financialYear === selectedYear)?.yearlyTarget || 0;
      const cumulativeTarget = cumulativeMonths.reduce((sum, month) => {
        const t = targets.find(t => t.committeeId === committee.id && t.financialYear === selectedYear);
        return sum + (t?.monthlyTargets[month] || 0);
      }, 0);

      return {
        committee,
        achieved,
        yearlyTarget,
        cumulativeTarget,
        percentage: yearlyTarget > 0 ? (achieved / yearlyTarget) * 100 : 0,
        receiptCount: cumulativeReceipts.length,
        monthlyData,
        avgTransactionValue: cumulativeReceipts.length > 0 
          ? cumulativeReceipts.reduce((sum, r) => sum + r.transactionValue, 0) / cumulativeReceipts.length 
          : 0
      };
    });

    return analytics;
  };

  // Commodity-wise analytics
  const calculateCommodityAnalytics = () => {
    const filteredMarketFeeReceipts = marketFeeReceipts.filter(r => r.financialYear === selectedYear);
    
    return commodities.map(commodity => {
      const commodityReceipts = filteredMarketFeeReceipts.filter(r => r.commodity === commodity);
      const totalCollection = commodityReceipts.reduce((sum, r) => sum + r.marketFee, 0);
      const receiptCount = commodityReceipts.length;
      const avgTransactionValue = receiptCount > 0 
        ? commodityReceipts.reduce((sum, r) => sum + r.transactionValue, 0) / receiptCount 
        : 0;

      const totalMarketFee = filteredMarketFeeReceipts.reduce((sum, r) => sum + r.marketFee, 0);
      return {
        commodity,
        totalCollection,
        receiptCount,
        avgTransactionValue,
        percentage: totalMarketFee > 0 ? (totalCollection / totalMarketFee) * 100 : 0
      };
    }).filter(item => item.totalCollection > 0).sort((a, b) => b.totalCollection - a.totalCollection);
  };

  // Monthly trend analysis
  const calculateMonthlyTrends = () => {
    return months.map(month => {
      const monthReceipts2024 = receipts.filter(r => {
        const receiptDate = new Date(r.date);
        const receiptMonth = receiptDate.toLocaleString('default', { month: 'long' });
        return r.financialYear === '2024-25' && receiptMonth === month && r.natureOfReceipt === 'mf' &&
               (selectedCommittee === 'all' || r.committeeId === selectedCommittee);
      });

      const monthReceipts2025 = receipts.filter(r => {
        const receiptDate = new Date(r.date);
        const receiptMonth = receiptDate.toLocaleString('default', { month: 'long' });
        return r.financialYear === '2025-26' && receiptMonth === month && r.natureOfReceipt === 'mf' &&
               (selectedCommittee === 'all' || r.committeeId === selectedCommittee);
      });

      const collection2024 = monthReceipts2024.reduce((sum, r) => sum + r.marketFee, 0);
      const collection2025 = monthReceipts2025.reduce((sum, r) => sum + r.marketFee, 0);

      return {
        month,
        '2024-25': collection2024 / 100000, // Convert to lakhs
        '2025-26': collection2025 / 100000,
        growth: collection2024 > 0 ? ((collection2025 - collection2024) / collection2024) * 100 : 0
      };
    });
  };

  // Checkpost performance
  const calculateCheckpostPerformance = () => {
    const checkpostData: any[] = [];
    
    const committeesToAnalyze = selectedCommittee === 'all' 
      ? committees 
      : committees.filter(c => c.id === selectedCommittee);
    
    committeesToAnalyze.forEach(committee => {
      if (committee.hasCheckposts) {
        committee.checkposts.forEach(checkpost => {
          const checkpostReceipts = marketFeeReceipts.filter(r => 
            r.committeeId === committee.id && r.checkpostName === checkpost
          );
          
          const totalCollection = checkpostReceipts.reduce((sum, r) => sum + r.marketFee, 0);
          const receiptCount = checkpostReceipts.length;
          
          if (totalCollection > 0) {
            checkpostData.push({
              name: `${committee.code} - ${checkpost}`,
              committee: committee.name,
              checkpost,
              totalCollection: totalCollection / 100000,
              receiptCount,
              avgCollection: receiptCount > 0 ? totalCollection / receiptCount : 0
            });
          }
        });
      }
    });

    return checkpostData.sort((a, b) => b.totalCollection - a.totalCollection);
  };

  // Heatmap data for committee-month performance
  const calculateHeatmapData = () => {
    const heatmapData: any[] = [];
    
    committees.forEach(committee => {
      const committeeReceipts = marketFeeReceipts.filter(r => 
        r.committeeId === committee.id && r.financialYear === selectedYear
      );
      
      months.forEach(month => {
        const monthReceipts = committeeReceipts.filter(r => {
          const receiptDate = new Date(r.date);
          const receiptMonth = receiptDate.toLocaleString('default', { month: 'long' });
          return receiptMonth === month;
        });
        
        const collected = monthReceipts.reduce((sum, r) => sum + r.marketFee, 0);
        const target = targets.find(t => 
          t.committeeId === committee.id && 
          t.financialYear === selectedYear
        )?.monthlyTargets[month] || 0;
        
        const percentage = target > 0 ? (collected / target) * 100 : 0;

        heatmapData.push({
          month,
          committee: committee.name,
          value: collected / 100000,
          percentage
        });
      });
    });

    return heatmapData;
  };

  const analytics = calculateAnalytics();
  const commodityAnalytics = calculateCommodityAnalytics();
  const monthlyTrends = calculateMonthlyTrends();
  const checkpostPerformance = calculateCheckpostPerformance();
  const heatmapData = calculateHeatmapData();

  // Summary calculations
  const totalCollected = analytics.reduce((sum, a) => sum + a.achieved, 0);
  const totalTarget = analytics.reduce((sum, a) => sum + a.yearlyTarget, 0);
  const totalReceipts = filteredReceipts.filter(r => r.natureOfReceipt === 'mf').length;
  const avgTransactionValue = totalReceipts > 0 
    ? filteredReceipts.filter(r => r.natureOfReceipt === 'mf').reduce((sum, r) => sum + r.transactionValue, 0) / totalReceipts 
    : 0;

  // Growth calculations
  const prevYear = selectedYear === '2025-26' ? '2024-25' : '2023-24';
  const prevYearReceipts = receipts.filter(r => 
    r.financialYear === prevYear && 
    r.natureOfReceipt === 'mf' &&
    (selectedCommittee === 'all' || r.committeeId === selectedCommittee)
  );
  const prevYearTotal = prevYearReceipts.reduce((sum, r) => sum + r.marketFee, 0);
  const growthRate = prevYearTotal > 0 ? ((totalCollected - prevYearTotal) / prevYearTotal) * 100 : 0;

  // Progress data for committees
  const progressData = analytics.filter(item => item.achieved > 0).map(item => ({
    name: item.committee.code,
    achieved: item.achieved,
    target: item.yearlyTarget,
    color: item.percentage >= 100 ? '#10B981' : item.percentage >= 75 ? '#F59E0B' : '#EF4444'
  })).sort((a, b) => b.achieved - a.achieved);

  // Static demo data for Target vs Achieved (Lakhs)
  const staticTargetVsAchieved = [
    { name: 'KRP-AMC', Achieved: 420, Target: 700 },
    { name: 'KKDR-AMC', Achieved: 900, Target: 1500 },
    { name: 'PTM-AMC', Achieved: 1200, Target: 2000 },
    { name: 'TUNI-AMC', Achieved: 1500, Target: 2500 },
    { name: 'PTD-AMC', Achieved: 1800, Target: 3000 },
    { name: 'JPT-AMC', Achieved: 2100, Target: 3500 },
    { name: 'PDM-AMC', Achieved: 2400, Target: 4000 },
    { name: 'SMLK-AMC', Achieved: 2700, Target: 4500 },
    { name: 'KKD-AMC', Achieved: 3000, Target: 5000 },
  ];

  // Static demo data for Top Commodities by Collection
  const staticCommodities = [
    { commodity: 'Rice', totalCollection: 1200000 },
    { commodity: 'Wheat', totalCollection: 900000 },
    { commodity: 'Paddy', totalCollection: 700000 },
    { commodity: 'Maize', totalCollection: 500000 },
    { commodity: 'Sugarcane', totalCollection: 300000 },
  ];

  return (
    <div className="max-w-full mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center mb-4 lg:mb-0">
          <BarChart3 className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Advanced Analytics Dashboard</h2>
            <p className="text-gray-600">Comprehensive insights into AMC market fee performance</p>
          </div>
        </div>
      </div>

      {/* Seed Data Button - Show if no data */}
      {(receipts.length === 0 || targets.length === 0) && <SeedDataButton />}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters & Controls</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value as '2024-25' | '2025-26')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="2024-25">2024-25</option>
              <option value="2025-26">2025-26</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
            <select
              value={selectedCommittee}
              onChange={(e) => setSelectedCommittee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Committees</option>
              {committees.map(committee => (
                <option key={committee.id} value={committee.id}>{committee.code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Market Fees Collected"
          value={`₹${(totalCollected / 100000).toFixed(2)}L`}
          change={growthRate}
          changeType={growthRate > 0 ? 'increase' : growthRate < 0 ? 'decrease' : 'neutral'}
          icon={<DollarSign className="w-6 h-6" />}
          color="#1D3557"
          subtitle={`Target: ₹${(totalTarget / 100000).toFixed(2)}L`}
        />
        <MetricCard
          title="Achievement Rate"
          value={`${totalTarget > 0 ? ((totalCollected / totalTarget) * 100).toFixed(1) : 0}%`}
          icon={<Target className="w-6 h-6" />}
          color="#457B9D"
          subtitle="Against yearly target"
        />
        <MetricCard
          title="Total Receipts"
          value={totalReceipts}
          icon={<Activity className="w-6 h-6" />}
          color="#A8DADC"
          subtitle="Market fee receipts"
        />
        <MetricCard
          title="Number of Committees"
          value={committees.length}
          icon={<Users className="w-6 h-6" />}
          color="#457B9D"
          subtitle="Participating AMCs"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target vs Achieved Double Bar Chart */}
        <CustomBarChart
          data={(receipts.length === 0 || targets.length === 0) ? staticTargetVsAchieved : analytics.map(item => ({
            name: item.committee.code,
            Achieved: item.achieved / 100000,
            Target: item.yearlyTarget / 100000
          }))}
          xKey="name"
          yKey={["Achieved", "Target"]}
          title="Target vs Achieved (Lakhs)"
          color="#1D3557"
          height={350}
          showComparison={true}
        />

        {/* Monthly Trends Double Bar Chart */}
        <CustomBarChart
          data={monthlyTrends}
          xKey="month"
          yKey={["2024-25", "2025-26"]}
          title="Monthly Collection Trends (Lakhs)"
          color="#457B9D"
          height={350}
        />
      </div>

      {/* Only 2 Tiles: Top Commodities and Top Committee Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commodity Distribution Pie Chart */}
        <div style={{ minHeight: '400px' }}>
          <CustomPieChart
            data={(commodityAnalytics.length === 0 ? staticCommodities : commodityAnalytics.slice(0, 5))}
            dataKey="totalCollection"
            nameKey="commodity"
            title="Top Commodities by Collection"
            height={400}
          />
        </div>

        {/* Committee Progress */}
        <div className="bg-white p-6 rounded-lg shadow-lg" style={{ minHeight: '400px' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Committee Progress</h3>
          <div className="h-full">
            <ProgressChart
              data={progressData}
              title=""
            />
          </div>
        </div>
      </div>

      {/* Top Checkpost Performance (Lakhs) - full width */}
      <div className="grid grid-cols-1 gap-6">
        <CustomBarChart
          data={checkpostPerformance.slice(0, 10)}
          xKey="name"
          yKey="totalCollection"
          title="Top Checkpost Performance (Lakhs)"
          color="#E63946"
          height={400}
        />
      </div>

      {/* Performance Heatmap */}
      <HeatmapChart
        data={heatmapData}
        title="Committee-Month Performance Heatmap"
        months={months}
        committees={committees.map(c => c.name)}
      />

      {/* Detailed Analytics Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Committee Analytics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Committee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target (L)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achieved (L)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achievement %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.map((item) => (
                <tr key={item.committee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.committee.name}</div>
                    <div className="text-sm text-gray-500">{item.committee.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(item.yearlyTarget / 100000).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(item.achieved / 100000).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.percentage >= 100 ? 'bg-green-600' :
                            item.percentage >= 75 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.receiptCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.percentage >= 100 
                        ? 'bg-green-100 text-green-800'
                        : item.percentage >= 75
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {item.percentage >= 100 ? 'Excellent' : item.percentage >= 75 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commodity Analytics */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Commodity Performance Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commodityAnalytics.slice(0, 9).map((item, index) => (
            <div key={item.commodity} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{item.commodity}</h4>
                <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Collection:</span>
                  <span className="font-medium">₹{(item.totalCollection / 100000).toFixed(2)}L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Receipts:</span>
                  <span className="font-medium">{item.receiptCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Value:</span>
                  <span className="font-medium">₹{(item.avgTransactionValue / 1000).toFixed(1)}K</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;