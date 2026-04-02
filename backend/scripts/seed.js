const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  const SALT = 10;

  // Super Admin
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'superadmin@sms.com' },
    update: {},
    create: { name: 'Super Admin', email: 'superadmin@sms.com', password: await bcrypt.hash('Admin1234', SALT), status: 'Active' },
  });
  console.log('✅ Super Admin:', superAdmin.email);

  // Admin 1 - Full Access
  const admin1 = await prisma.admin.upsert({
    where: { email: 'admin1@sms.com' },
    update: {},
    create: { name: 'John Admin', email: 'admin1@sms.com', phone: '9876543210', password: await bcrypt.hash('Admin1234', SALT), status: 'Active' },
  });

  // Admin 2 - Limited Access
  const admin2 = await prisma.admin.upsert({
    where: { email: 'admin2@sms.com' },
    update: {},
    create: { name: 'Jane Admin', email: 'admin2@sms.com', phone: '9876543211', password: await bcrypt.hash('Admin1234', SALT), status: 'Active' },
  });
  console.log('✅ Admins created');

  // Permissions for Admin1 - Full Access
  const fullModules = ['SalespersonManagement','PartyManagement','ExpenseTypeManagement','InventoryManagement','OrderManagement','ExpenseManagement','PaymentManagement','Reports','Announcements','Dashboard','PrintTemplates'];
  for (const mod of fullModules) {
    await prisma.modulePermission.upsert({
      where: { adminId_moduleName: { adminId: admin1.id, moduleName: mod } },
      update: {}, create: { adminId: admin1.id, moduleName: mod, permissionLevel: 'FullAccess' },
    });
  }

  // Permissions for Admin2 - Limited
  const limitedPerms = { OrderManagement: 'FullAccess', Reports: 'ViewOnly', Dashboard: 'ViewOnly' };
  for (const [mod, level] of Object.entries(limitedPerms)) {
    await prisma.modulePermission.upsert({
      where: { adminId_moduleName: { adminId: admin2.id, moduleName: mod } },
      update: {}, create: { adminId: admin2.id, moduleName: mod, permissionLevel: level },
    });
  }
  console.log('✅ Permissions set');

  // Salespersons
  const sp1 = await prisma.salesperson.upsert({
    where: { employeeId: 'EMP00001' },
    update: {},
    create: { employeeId: 'EMP00001', name: 'Alice Sales', email: 'alice@sms.com', phone: '9001234567', password: await bcrypt.hash('Pass1234', SALT), region: 'North', jobRole: 'Senior Sales', targetAmount: 500000, budgetAmount: 20000, status: 'Active' },
  });
  const sp2 = await prisma.salesperson.upsert({
    where: { employeeId: 'EMP00002' },
    update: {},
    create: { employeeId: 'EMP00002', name: 'Bob Sales', email: 'bob@sms.com', phone: '9001234568', password: await bcrypt.hash('Pass1234', SALT), region: 'South', jobRole: 'Junior Sales', targetAmount: 300000, budgetAmount: 15000, status: 'Active' },
  });
  const sp3 = await prisma.salesperson.upsert({
    where: { employeeId: 'EMP00003' },
    update: {},
    create: { employeeId: 'EMP00003', name: 'Carol Sales', email: 'carol@sms.com', phone: '9001234569', password: await bcrypt.hash('Pass1234', SALT), region: 'East', jobRole: 'Sales Executive', targetAmount: 400000, budgetAmount: 18000, status: 'Active' },
  });
  console.log('✅ Salespersons created');

  // Parties
  const party1 = await prisma.party.upsert({
    where: { id: 'party-001' },
    update: {},
    create: { id: 'party-001', name: 'Acme Corporation', contactName: 'Tom Jones', phone: '9111111111', email: 'tom@acme.com', address: '100 Main St', city: 'Mumbai', state: 'Maharashtra', gstNumber: '27AAPFU0939F1ZV', status: 'Active' },
  });
  const party2 = await prisma.party.upsert({
    where: { id: 'party-002' },
    update: {},
    create: { id: 'party-002', name: 'Global Traders', contactName: 'Sara Lee', phone: '9222222222', email: 'sara@global.com', address: '200 Commerce Ave', city: 'Delhi', state: 'Delhi', gstNumber: '07AABCT1332L1ZU', status: 'Active' },
  });
  const party3 = await prisma.party.upsert({
    where: { id: 'party-003' },
    update: {},
    create: { id: 'party-003', name: 'Metro Supplies', contactName: 'Raj Kumar', phone: '9333333333', city: 'Bangalore', state: 'Karnataka', status: 'Active' },
  });
  console.log('✅ Parties created');

  // Inventory
  const items = [
    { sku: 'PROD-001', name: 'Premium Widget A', category: 'Electronics', sellingPrice: 2500, costPrice: 1800, stockQuantity: 150, lowStockThreshold: 20 },
    { sku: 'PROD-002', name: 'Standard Widget B', category: 'Electronics', sellingPrice: 1200, costPrice: 800, stockQuantity: 8, lowStockThreshold: 15 },
    { sku: 'PROD-003', name: 'Industrial Gear X', category: 'Mechanical', sellingPrice: 5000, costPrice: 3500, stockQuantity: 45, lowStockThreshold: 10 },
    { sku: 'PROD-004', name: 'Office Supply Pack', category: 'Stationery', sellingPrice: 350, costPrice: 200, stockQuantity: 200, lowStockThreshold: 30 },
    { sku: 'PROD-005', name: 'Safety Equipment Y', category: 'Safety', sellingPrice: 1800, costPrice: 1200, stockQuantity: 5, lowStockThreshold: 10 },
  ];
  for (const item of items) {
    await prisma.inventoryItem.upsert({ where: { sku: item.sku }, update: {}, create: { ...item, unit: 'Piece' } });
  }
  console.log('✅ Inventory created');

  // Expense Types
  const expTypes = ['Travel', 'Food & Accommodation', 'Communication', 'Vehicle Maintenance', 'Entertainment', 'Miscellaneous'];
  const expTypeRecords = [];
  for (const name of expTypes) {
    const et = await prisma.expenseType.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} related expenses` },
    });
    expTypeRecords.push(et);
  }
  console.log('✅ Expense types created');

  // Orders
  const inv1 = await prisma.inventoryItem.findUnique({ where: { sku: 'PROD-001' } });
  const inv3 = await prisma.inventoryItem.findUnique({ where: { sku: 'PROD-003' } });

  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20240301-0001', salespersonId: sp1.id, partyId: party1.id,
      totalAmount: 27500, taxAmount: 4950, grandTotal: 32450, status: 'Delivered', notes: 'Urgent delivery required',
      orderItems: { create: [{ itemId: inv1.id, quantity: 11, unitPrice: 2500, totalPrice: 27500 }] },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20240302-0002', salespersonId: sp2.id, partyId: party2.id,
      totalAmount: 15000, taxAmount: 2700, grandTotal: 17700, status: 'Approved',
      orderItems: { create: [{ itemId: inv3.id, quantity: 3, unitPrice: 5000, totalPrice: 15000 }] },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20240303-0003', salespersonId: sp1.id, partyId: party3.id,
      totalAmount: 7000, taxAmount: 1260, grandTotal: 8260, status: 'Pending',
      orderItems: { create: [{ itemId: inv1.id, quantity: 2, unitPrice: 2500, totalPrice: 5000 }, { itemId: inv3.id, quantity: 0, unitPrice: 5000, totalPrice: 0 }] },
    },
  });
  console.log('✅ Orders created');

  // Payments
  await prisma.payment.create({
    data: {
      receiptNumber: 'RCP-001', salespersonId: sp1.id, partyId: party1.id, orderId: order1.id,
      amount: 32450, paymentMode: 'NEFT', transactionId: 'TXN123456', paymentDate: new Date('2024-03-05'),
      purpose: 'Full payment for Order ORD-20240301-0001', status: 'Verified', verifiedById: admin1.id, verifiedAt: new Date(),
    },
  });
  await prisma.payment.create({
    data: {
      receiptNumber: 'RCP-002', salespersonId: sp2.id, partyId: party2.id, orderId: order2.id,
      amount: 10000, paymentMode: 'Cheque', transactionId: 'CHQ789', paymentDate: new Date('2024-03-06'),
      purpose: 'Advance payment', status: 'Pending',
    },
  });
  console.log('✅ Payments created');

  // Expenses
  await prisma.expense.create({
    data: {
      salespersonId: sp1.id, expenseTypeId: expTypeRecords[0].id, description: 'Train ticket Mumbai-Delhi for client meeting',
      amount: 3500, expenseDate: new Date('2024-03-01'), status: 'Approved', approvedById: admin1.id, approvedAt: new Date(),
    },
  });
  await prisma.expense.create({
    data: {
      salespersonId: sp2.id, expenseTypeId: expTypeRecords[1].id, description: 'Hotel stay for 2 nights during field visit',
      amount: 4800, expenseDate: new Date('2024-03-02'), status: 'Pending',
    },
  });
  console.log('✅ Expenses created');

  // System configs
  const configs = [
    { key: 'stock_deduction_rule', value: 'Dispatch', description: 'When to deduct stock: Approval or Dispatch' },
    { key: 'expense_proof_mandatory', value: 'false', description: 'Is expense proof upload mandatory?' },
    { key: 'payment_edit_window_hours', value: '24', description: 'Hours within which payment can be edited' },
    { key: 'low_stock_threshold_global', value: '10', description: 'Global low stock threshold' },
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({ where: { key: c.key }, update: {}, create: c });
  }

  // Print template
  await prisma.printTemplate.upsert({
    where: { name: 'order' },
    update: {},
    create: { name: 'order', companyName: 'Your Company Name', companyAddress: '123 Business St, Mumbai, MH 400001', companyPhone: '+91 98765 43210', companyEmail: 'info@yourcompany.com', footerText: 'Thank you for your business! Goods once sold will not be taken back.' },
  });
  await prisma.printTemplate.upsert({
    where: { name: 'expense' },
    update: {},
    create: { name: 'expense', companyName: 'Your Company Name', companyAddress: '123 Business St, Mumbai, MH 400001', companyPhone: '+91 98765 43210', footerText: 'All expenses are subject to approval as per company policy.' },
  });
  await prisma.printTemplate.upsert({
    where: { name: 'payment' },
    update: {},
    create: { name: 'payment', companyName: 'Your Company Name', companyAddress: '123 Business St, Mumbai, MH 400001', companyPhone: '+91 98765 43210', footerText: 'This is a computer-generated receipt.' },
  });
  console.log('✅ System configs & templates created');

  // Announcement
  await prisma.announcement.create({
    data: {
      createdById: admin1.id, title: 'Q1 2024 Sales Target Review', priority: 'High',
      message: 'Dear Team,\n\nPlease submit your Q1 2024 sales reports by March 31st. Ensure all orders are updated in the system.\n\nBest Regards,\nManagement',
      status: 'Sent', sentAt: new Date(), targetType: 'All',
      recipients: { create: [{ salespersonId: sp1.id }, { salespersonId: sp2.id }, { salespersonId: sp3.id }] },
    },
  });
  console.log('✅ Announcements created');

  console.log('\n🎉 Seed completed!\n');
  console.log('Login Credentials:');
  console.log('─────────────────────────────────────');
  console.log('Super Admin: superadmin@sms.com / Admin1234');
  console.log('Admin 1:     admin1@sms.com / Admin1234');
  console.log('Admin 2:     admin2@sms.com / Admin1234');
  console.log('Salesperson: EMP00001 / Pass1234');
  console.log('Salesperson: EMP00002 / Pass1234');
  console.log('─────────────────────────────────────');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
