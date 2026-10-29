const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../../data/savings_group.db');
const db = new Database(dbPath);

// Enable Foreign Key support and WAL mode for better concurrency and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      join_date DATE NOT NULL,
      status TEXT DEFAULT 'Active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Savings Groups (Chit Fund Groups)
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      total_members INTEGER NOT NULL,
      monthly_contribution REAL NOT NULL,
      duration_months INTEGER NOT NULL,
      start_date DATE NOT NULL,
      collection_day INTEGER DEFAULT 5,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Group Memberships
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      joined_date DATE NOT NULL,
      seat_number INTEGER,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES savings_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(group_id, member_id)
    );
  `);

  // Payments / Contributions
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      installment_no INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES savings_groups(id) ON DELETE RESTRICT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(group_id, member_id, installment_no)
    );
  `);

  // Payouts / Disbursements to Winning Member
  db.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT UNIQUE NOT NULL,
      group_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      installment_no INTEGER NOT NULL,
      amount REAL NOT NULL,
      payout_date DATE NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
      notes TEXT,
      approved_by TEXT NOT NULL DEFAULT 'Admin Manager',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES savings_groups(id) ON DELETE RESTRICT,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
      UNIQUE(group_id, installment_no)
    );
  `);

  // Indexes for query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_group ON payments(group_id);
    CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
    CREATE INDEX IF NOT EXISTS idx_payouts_group ON payouts(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
  `);

  // Seed sample data if database is empty
  seedDemoData();
}

function seedDemoData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already initialized
  }

  console.log('🌱 Seeding sample demo data for development mode...');

  // 1. Create Default Admin User (admin@chitfund.com / admin123)
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync('admin123', salt);
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `);
  const adminResult = insertUser.run('Finance Manager', 'admin@chitfund.com', hashedPassword, 'admin');
  const adminId = adminResult.lastInsertRowid;

  // 2. Create Members
  const sampleMembers = [
    { name: 'Rajesh Sharma', phone: '+91 98765 43210', email: 'rajesh.sharma@example.com', address: '124 Park Avenue, South Extension, New Delhi', join_date: '2026-01-10' },
    { name: 'Priya Patel', phone: '+91 98123 45678', email: 'priya.patel@example.com', address: 'B-402 Green Meadows, SG Highway, Ahmedabad', join_date: '2026-01-12' },
    { name: 'Amitabh Verma', phone: '+91 99234 56789', email: 'amitabh.verma@example.com', address: '45 Lake View Residency, Indiranagar, Bengaluru', join_date: '2026-01-15' },
    { name: 'Sunita Rao', phone: '+91 98345 67890', email: 'sunita.rao@example.com', address: '12 Sunrise Enclave, Banjara Hills, Hyderabad', join_date: '2026-01-18' },
    { name: 'Vikram Singh', phone: '+91 97456 78901', email: 'vikram.singh@example.com', address: '88 Heritage Colony, Civil Lines, Jaipur', join_date: '2026-02-01' },
    { name: 'Ananya Deshmukh', phone: '+91 96567 89012', email: 'ananya.d@example.com', address: '17 Shivneri Heights, Shivaji Nagar, Pune', join_date: '2026-02-05' },
    { name: 'Manoj Kumar', phone: '+91 95678 90123', email: 'manoj.k@example.com', address: '201 Lotus Apartments, Anna Nagar, Chennai', join_date: '2026-02-10' },
    { name: 'Deepa Menon', phone: '+91 94789 01234', email: 'deepa.menon@example.com', address: '56 Marine Vista, Panampilly Nagar, Kochi', join_date: '2026-02-14' },
    { name: 'Sanjay Gupta', phone: '+91 93890 12345', email: 'sanjay.gupta@example.com', address: '9 Sector 15, Chandigarh', join_date: '2026-03-01' },
    { name: 'Kavita Nair', phone: '+91 92901 23456', email: 'kavita.nair@example.com', address: '304 Silver Crest, Worli Seaface, Mumbai', join_date: '2026-03-05' }
  ];

  const insertMember = db.prepare(`
    INSERT INTO members (full_name, phone, email, address, join_date, status, notes)
    VALUES (?, ?, ?, ?, ?, 'Active', 'Verified KYC and Address proof')
  `);

  const memberIds = [];
  sampleMembers.forEach(m => {
    const res = insertMember.run(m.name, m.phone, m.email, m.address, m.join_date);
    memberIds.push(res.lastInsertRowid);
  });

  // 3. Create Savings Groups
  const insertGroup = db.prepare(`
    INSERT INTO savings_groups (name, description, total_members, monthly_contribution, duration_months, start_date, collection_day, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Group 1: Golden Sunrise Chit Fund (10 members, 5,000 monthly, 10 months, started in July 2026)
  const group1Res = insertGroup.run(
    'Golden Sunrise Chit Fund',
    'Monthly ₹5,000 savings circle for family businesses and entrepreneurs.',
    10,
    5000,
    10,
    '2026-07-01',
    5,
    'Active'
  );
  const group1Id = group1Res.lastInsertRowid;

  // Group 2: Community Thrift Circle (8 members, 2,500 monthly, 8 months, started in August 2026)
  const group2Res = insertGroup.run(
    'Community Thrift Circle',
    'Short-term micro-savings circle for neighborhood residents.',
    8,
    2500,
    8,
    '2026-08-01',
    10,
    'Active'
  );
  const group2Id = group2Res.lastInsertRowid;

  // 4. Enroll Members into Groups
  const enrollMember = db.prepare(`
    INSERT INTO group_members (group_id, member_id, joined_date, seat_number, status)
    VALUES (?, ?, ?, ?, 'Active')
  `);

  // Enroll all 10 members into Group 1
  for (let i = 0; i < 10; i++) {
    enrollMember.run(group1Id, memberIds[i], '2026-07-01', i + 1);
  }

  // Enroll first 8 members into Group 2
  for (let i = 0; i < 8; i++) {
    enrollMember.run(group2Id, memberIds[i], '2026-08-01', i + 1);
  }

  // 5. Seed Payments
  // Group 1: Month 1 (July), Month 2 (August), Month 3 (September), Month 4 (October - partial)
  const insertPayment = db.prepare(`
    INSERT INTO payments (receipt_number, group_id, member_id, installment_no, amount, payment_date, payment_method, reference_no, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let receiptSeq = 1001;
  const methods = ['UPI', 'Bank Transfer', 'Cash', 'Cheque'];

  // Month 1 (Group 1): All 10 members paid
  for (let i = 0; i < 10; i++) {
    insertPayment.run(
      `RCP-202607-${receiptSeq++}`,
      group1Id,
      memberIds[i],
      1,
      5000,
      '2026-07-05',
      methods[i % methods.length],
      `REF-JUL-${100 + i}`,
      'Installment #1 paid on time',
      adminId
    );
  }

  // Month 2 (Group 1): All 10 members paid
  for (let i = 0; i < 10; i++) {
    insertPayment.run(
      `RCP-202608-${receiptSeq++}`,
      group1Id,
      memberIds[i],
      2,
      5000,
      '2026-08-05',
      methods[(i + 1) % methods.length],
      `REF-AUG-${200 + i}`,
      'Installment #2 received',
      adminId
    );
  }

  // Month 3 (Group 1): 9 members paid, 1 pending
  for (let i = 0; i < 9; i++) {
    insertPayment.run(
      `RCP-202609-${receiptSeq++}`,
      group1Id,
      memberIds[i],
      3,
      5000,
      '2026-09-05',
      methods[(i + 2) % methods.length],
      `REF-SEP-${300 + i}`,
      'Installment #3 regular payment',
      adminId
    );
  }

  // Month 4 (Group 1): 6 members paid, 4 pending
  for (let i = 0; i < 6; i++) {
    insertPayment.run(
      `RCP-202610-${receiptSeq++}`,
      group1Id,
      memberIds[i],
      4,
      5000,
      '2026-10-05',
      methods[(i + 3) % methods.length],
      `REF-OCT-${400 + i}`,
      'Installment #4 received',
      adminId
    );
  }

  // Group 2: Month 1 (August - 8 paid), Month 2 (September - 7 paid)
  for (let i = 0; i < 8; i++) {
    insertPayment.run(
      `RCP-202608-${receiptSeq++}`,
      group2Id,
      memberIds[i],
      1,
      2500,
      '2026-08-10',
      methods[i % methods.length],
      `REF-G2-M1-${i + 1}`,
      'Thrift Circle Month 1 payment',
      adminId
    );
  }

  for (let i = 0; i < 7; i++) {
    insertPayment.run(
      `RCP-202609-${receiptSeq++}`,
      group2Id,
      memberIds[i],
      2,
      2500,
      '2026-09-10',
      methods[(i + 1) % methods.length],
      `REF-G2-M2-${i + 1}`,
      'Thrift Circle Month 2 payment',
      adminId
    );
  }

  // 6. Seed Payouts
  const insertPayout = db.prepare(`
    INSERT INTO payouts (voucher_number, group_id, member_id, installment_no, amount, payout_date, payment_method, notes, approved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Group 1 Month 1 Payout to Rajesh Sharma (Pool = 10 * 5000 = 50,000, bidding discount or net lump sum: 47,500)
  insertPayout.run(
    'VCH-202607-001',
    group1Id,
    memberIds[0],
    1,
    47500,
    '2026-07-15',
    'Bank Transfer',
    'Awarded in Month 1 auction. Transfer reference: NEFT7890123.',
    'Finance Manager'
  );

  // Group 1 Month 2 Payout to Sunita Rao (Net lump sum: 48,000)
  insertPayout.run(
    'VCH-202608-002',
    group1Id,
    memberIds[3],
    2,
    48000,
    '2026-08-15',
    'Bank Transfer',
    'Awarded in Month 2 auction. Transfer reference: RTGS672341.',
    'Finance Manager'
  );

  // Group 2 Month 1 Payout to Priya Patel (Pool = 8 * 2500 = 20,000)
  insertPayout.run(
    'VCH-202608-003',
    group2Id,
    memberIds[1],
    1,
    19500,
    '2026-08-20',
    'Bank Transfer',
    'Month 1 pool disbursed after manager review.',
    'Finance Manager'
  );

  console.log('✅ Demo seed data created successfully.');
  console.log('🔑 Admin Credentials: email=admin@chitfund.com, password=admin123');
}

initDatabase();

module.exports = db;
