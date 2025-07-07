import { Receipt, Target } from '../types';

// Generate realistic static data for analytics demonstration
export const generateSeedData = () => {
  const receipts: Receipt[] = [];
  const targets: Target[] = [];

  // Committee IDs from existing data
  const committeeIds = [
    'amc-001', 'amc-002', 'amc-003', 'amc-004', 'amc-005',
    'amc-006', 'amc-007', 'amc-008', 'amc-009'
  ];

  const commodities = [
    'Rice', 'Wheat', 'Paddy', 'Maize', 'Sugarcane', 'Cotton',
    'Groundnut', 'Sunflower', 'Chili', 'Turmeric', 'Coconut',
    'Vegetables', 'Fruits'
  ];

  const months = [
    'May', 'June', 'July', 'August', 'September', 'October',
    'November', 'December', 'January', 'February', 'March', 'April'
  ];

  const checkpostsByCommittee: Record<string, string[]> = {
    'amc-001': ['Penuguduru'],
    'amc-002': ['Atchempeta', 'Turangi Bypass'],
    'amc-003': ['Pithapuram', 'Chebrolu'],
    'amc-004': ['Tuni', 'K/P/Puram', 'Rekavanipalem'],
    'amc-005': ['Kathipudi', 'Prathipadu', 'Yerravaram'],
    'amc-006': ['Jaggampeta', 'Rajupalem'],
    'amc-007': ['Peddapuram'],
    'amc-008': [],
    'amc-009': []
  };

  // Generate targets for both financial years
  committeeIds.forEach((committeeId, index) => {
    const baseTarget2024 = (index + 1) * 50000000; // 5 crores to 45 crores
    const baseTarget2025 = baseTarget2024 * 1.15; // 15% increase

    // 2024-25 targets
    const monthlyTarget2024 = baseTarget2024 / 12;
    const monthlyTargets2024: Record<string, number> = {};
    months.forEach(month => {
      // Add some variation to monthly targets
      const variation = 0.8 + Math.random() * 0.4; // 80% to 120% of average
      monthlyTargets2024[month] = monthlyTarget2024 * variation;
    });

    // Checkpost targets for 2024-25
    const checkpostTargets2024: Record<string, Record<string, number>> = {};
    const checkposts = checkpostsByCommittee[committeeId] || [];
    if (checkposts.length > 0) {
      checkposts.forEach(checkpost => {
        checkpostTargets2024[checkpost] = {};
        months.forEach(month => {
          checkpostTargets2024[checkpost][month] = monthlyTargets2024[month] / checkposts.length;
        });
      });
    }

    targets.push({
      id: `target-${committeeId}-2024`,
      committeeId,
      financialYear: '2024-25',
      yearlyTarget: baseTarget2024,
      monthlyTargets: monthlyTargets2024,
      checkpostTargets: checkposts.length > 0 ? checkpostTargets2024 : undefined
    });

    // 2025-26 targets
    const monthlyTarget2025 = baseTarget2025 / 12;
    const monthlyTargets2025: Record<string, number> = {};
    months.forEach(month => {
      const variation = 0.8 + Math.random() * 0.4;
      monthlyTargets2025[month] = monthlyTarget2025 * variation;
    });

    // Checkpost targets for 2025-26
    const checkpostTargets2025: Record<string, Record<string, number>> = {};
    if (checkposts.length > 0) {
      checkposts.forEach(checkpost => {
        checkpostTargets2025[checkpost] = {};
        months.forEach(month => {
          checkpostTargets2025[checkpost][month] = monthlyTargets2025[month] / checkposts.length;
        });
      });
    }

    targets.push({
      id: `target-${committeeId}-2025`,
      committeeId,
      financialYear: '2025-26',
      yearlyTarget: baseTarget2025,
      monthlyTargets: monthlyTargets2025,
      checkpostTargets: checkposts.length > 0 ? checkpostTargets2025 : undefined
    });
  });

  // Generate receipts for both financial years
  let receiptId = 1;

  // Helper function to generate date within a month
  const generateDateInMonth = (month: string, year: string) => {
    const monthIndex = months.indexOf(month);
    const actualYear = year === '2024-25' 
      ? (monthIndex < 8 ? 2024 : 2025)
      : (monthIndex < 8 ? 2025 : 2026);
    const actualMonth = monthIndex < 8 ? monthIndex + 5 : monthIndex - 7;
    const day = Math.floor(Math.random() * 28) + 1;
    return new Date(actualYear, actualMonth, day).toISOString().split('T')[0];
  };

  // Generate receipts for 2024-25
  committeeIds.forEach((committeeId, committeeIndex) => {
    const target2024 = targets.find(t => t.committeeId === committeeId && t.financialYear === '2024-25');
    if (!target2024) return;

    months.forEach((month, monthIndex) => {
      const monthlyTarget = target2024.monthlyTargets[month];
      // Achievement rate varies by committee and month (70% to 120%)
      const achievementRate = 0.7 + Math.random() * 0.5;
      const targetAchievement = monthlyTarget * achievementRate;
      
      // Generate 15-40 receipts per month per committee
      const receiptCount = Math.floor(15 + Math.random() * 25);
      
      for (let i = 0; i < receiptCount; i++) {
        const commodity = commodities[Math.floor(Math.random() * commodities.length)];
        const transactionValue = 50000 + Math.random() * 500000; // 50K to 550K
        const marketFeeRate = 0.01 + Math.random() * 0.02; // 1% to 3%
        const marketFee = transactionValue * marketFeeRate;
        
        // Adjust market fee to meet target
        const adjustedMarketFee = (targetAchievement / receiptCount) * (0.8 + Math.random() * 0.4);
        
        const checkposts = checkpostsByCommittee[committeeId] || [];
        const collectionLocation = Math.random() < 0.6 ? 'office' : 
                                 (checkposts.length > 0 && Math.random() < 0.7) ? 'checkpost' : 'supervisor';
        
        const receipt: Receipt = {
          id: `receipt-${receiptId++}`,
          bookNumber: `BK${committeeIndex + 1}${String(monthIndex + 1).padStart(2, '0')}`,
          receiptNumber: `${String(receiptId).padStart(6, '0')}`,
          date: generateDateInMonth(month, '2024-25'),
          traderName: `Trader ${Math.floor(Math.random() * 1000) + 1}`,
          payeeName: `Payee ${Math.floor(Math.random() * 1000) + 1}`,
          commodity,
          transactionValue,
          marketFee: adjustedMarketFee,
          natureOfReceipt: 'mf',
          collectionLocation,
          checkpostName: collectionLocation === 'checkpost' && checkposts.length > 0 
            ? checkposts[Math.floor(Math.random() * checkposts.length)] 
            : undefined,
          supervisorName: collectionLocation === 'supervisor' 
            ? `Supervisor ${Math.floor(Math.random() * 50) + 1}` 
            : undefined,
          committeeId,
          financialYear: '2024-25',
          createdAt: new Date().toISOString()
        };
        
        receipts.push(receipt);
      }
    });
  });

  // Generate receipts for 2025-26 (first 8 months)
  committeeIds.forEach((committeeId, committeeIndex) => {
    const target2025 = targets.find(t => t.committeeId === committeeId && t.financialYear === '2025-26');
    if (!target2025) return;

    // Only generate for first 8 months (May to December)
    months.slice(0, 8).forEach((month, monthIndex) => {
      const monthlyTarget = target2025.monthlyTargets[month];
      // Generally better performance in 2025-26 (80% to 130%)
      const achievementRate = 0.8 + Math.random() * 0.5;
      const targetAchievement = monthlyTarget * achievementRate;
      
      const receiptCount = Math.floor(18 + Math.random() * 30); // Slightly more receipts
      
      for (let i = 0; i < receiptCount; i++) {
        const commodity = commodities[Math.floor(Math.random() * commodities.length)];
        const transactionValue = 60000 + Math.random() * 600000; // Slightly higher values
        const marketFeeRate = 0.01 + Math.random() * 0.02;
        
        const adjustedMarketFee = (targetAchievement / receiptCount) * (0.8 + Math.random() * 0.4);
        
        const checkposts = checkpostsByCommittee[committeeId] || [];
        const collectionLocation = Math.random() < 0.6 ? 'office' : 
                                 (checkposts.length > 0 && Math.random() < 0.7) ? 'checkpost' : 'supervisor';
        
        const receipt: Receipt = {
          id: `receipt-${receiptId++}`,
          bookNumber: `BK${committeeIndex + 1}${String(monthIndex + 1).padStart(2, '0')}`,
          receiptNumber: `${String(receiptId).padStart(6, '0')}`,
          date: generateDateInMonth(month, '2025-26'),
          traderName: `Trader ${Math.floor(Math.random() * 1000) + 1}`,
          payeeName: `Payee ${Math.floor(Math.random() * 1000) + 1}`,
          commodity,
          transactionValue,
          marketFee: adjustedMarketFee,
          natureOfReceipt: 'mf',
          collectionLocation,
          checkpostName: collectionLocation === 'checkpost' && checkposts.length > 0 
            ? checkposts[Math.floor(Math.random() * checkposts.length)] 
            : undefined,
          supervisorName: collectionLocation === 'supervisor' 
            ? `Supervisor ${Math.floor(Math.random() * 50) + 1}` 
            : undefined,
          committeeId,
          financialYear: '2025-26',
          createdAt: new Date().toISOString()
        };
        
        receipts.push(receipt);
      }
    });
  });

  // Add some "others" type receipts for variety
  for (let i = 0; i < 50; i++) {
    const committeeId = committeeIds[Math.floor(Math.random() * committeeIds.length)];
    const month = months[Math.floor(Math.random() * months.length)];
    const financialYear = Math.random() < 0.6 ? '2025-26' : '2024-25';
    
    const receipt: Receipt = {
      id: `receipt-other-${i + 1}`,
      bookNumber: `OTH${String(i + 1).padStart(3, '0')}`,
      receiptNumber: `OTH${String(i + 1).padStart(6, '0')}`,
      date: generateDateInMonth(month, financialYear),
      traderName: `Trader ${Math.floor(Math.random() * 1000) + 1}`,
      payeeName: `Payee ${Math.floor(Math.random() * 1000) + 1}`,
      commodity: 'Others',
      transactionValue: 10000 + Math.random() * 100000,
      marketFee: 1000 + Math.random() * 10000,
      natureOfReceipt: 'others',
      natureOfReceiptOther: ['License Fee', 'Penalty', 'Registration Fee', 'Service Charge'][Math.floor(Math.random() * 4)],
      collectionLocation: 'office',
      committeeId,
      financialYear,
      createdAt: new Date().toISOString()
    };
    
    receipts.push(receipt);
  }

  return { receipts, targets };
};

// Pre-generated seed data
export const seedData = generateSeedData();