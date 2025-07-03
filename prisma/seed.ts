import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create committees
  const committees = [
    {
      id: 'amc-001',
      name: 'Karapa Agricultural Market Committee',
      code: 'KRP-AMC',
      hasCheckposts: true,
    },
    {
      id: 'amc-002',
      name: 'Kakinada Rural Agricultural Market Committee',
      code: 'KKDR-AMC',
      hasCheckposts: true,
    },
    {
      id: 'amc-003',
      name: 'Pithapuram Agricultural Market Committee',
      code: 'PTM-AMC',
      hasCheckposts: true,
    },
    {
      id: 'amc-004',
      name: 'Tuni Agricultural Market Committee',
      code: 'TUNI-AMC',
      hasCheckposts: true,
    },
    {
      id: 'amc-005',
      name: 'Prathipadu Agricultural Market Committee',
      code: 'PTD-AMC',
      hasCheckposts: true,
    },
    {
      id: 'amc-006',
      name: 'Jaggampeta Agricultural Market Committee',
      code: 'JPT-AMC',
      hasCheckposts: true,
    },
    {
      id: 'amc-007',
      name: 'Peddapuram Agricultural Market Committee',
      code: 'PDM-AMC',
      hasCheckposts: true,
    },
    {
      id: 'amc-008',
      name: 'Samalkota Agricultural Market Committee',
      code: 'SMLK-AMC',
      hasCheckposts: false,
    },
    {
      id: 'amc-009',
      name: 'Kakinada Agricultural Market Committee',
      code: 'KKD-AMC',
      hasCheckposts: false,
    },
  ];

  console.log('📝 Creating committees...');
  for (const committee of committees) {
    await prisma.committee.upsert({
      where: { id: committee.id },
      update: {},
      create: committee,
    });
  }

  // Create checkposts
  const checkpostData = [
    { name: 'Penuguduru', committeeId: 'amc-001' },
    { name: 'Atchempeta', committeeId: 'amc-002' },
    { name: 'Turangi Bypass', committeeId: 'amc-002' },
    { name: 'Pithapuram', committeeId: 'amc-003' },
    { name: 'Chebrolu', committeeId: 'amc-003' },
    { name: 'Tuni', committeeId: 'amc-004' },
    { name: 'K/P/Puram', committeeId: 'amc-004' },
    { name: 'Rekavanipalem', committeeId: 'amc-004' },
    { name: 'Kathipudi', committeeId: 'amc-005' },
    { name: 'Prathipadu', committeeId: 'amc-005' },
    { name: 'Yerravaram', committeeId: 'amc-005' },
    { name: 'Jaggampeta', committeeId: 'amc-006' },
    { name: 'Rajupalem', committeeId: 'amc-006' },
    { name: 'Peddapuram', committeeId: 'amc-007' },
  ];

  console.log('🏢 Creating checkposts...');
  for (const checkpost of checkpostData) {
    await prisma.checkpost.upsert({
      where: {
        name_committeeId: {
          name: checkpost.name,
          committeeId: checkpost.committeeId,
        },
      },
      update: {},
      create: checkpost,
    });
  }

  // Create system configuration
  const systemConfigs = [
    {
      key: 'app_name',
      value: 'AMC Market Fee Management System',
      dataType: 'string',
      category: 'application',
      description: 'Application name displayed in the UI',
    },
    {
      key: 'default_financial_year',
      value: '2025-26',
      dataType: 'string',
      category: 'application',
      description: 'Default financial year for new entries',
    },
    {
      key: 'currency_symbol',
      value: '₹',
      dataType: 'string',
      category: 'application',
      description: 'Currency symbol used in the application',
    },
    {
      key: 'max_file_upload_size',
      value: '10485760',
      dataType: 'number',
      category: 'system',
      description: 'Maximum file upload size in bytes (10MB)',
    },
    {
      key: 'enable_audit_logging',
      value: 'true',
      dataType: 'boolean',
      category: 'security',
      description: 'Enable audit logging for all operations',
    },
    {
      key: 'session_timeout',
      value: '3600',
      dataType: 'number',
      category: 'security',
      description: 'Session timeout in seconds (1 hour)',
    },
  ];

  console.log('⚙️ Creating system configuration...');
  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  // Create a default admin user (password should be hashed in production)
  console.log('👤 Creating default admin user...');
  await prisma.user.upsert({
    where: { email: 'admin@amc.gov.in' },
    update: {},
    create: {
      email: 'admin@amc.gov.in',
      name: 'System Administrator',
      password: '$2b$10$rQZ8qZ8qZ8qZ8qZ8qZ8qZOqZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8q', // 'admin123' hashed
      role: 'ADMIN',
    },
  });

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });