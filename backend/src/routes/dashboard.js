const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  try {
    // 1. Total savings collected
    const totalSavingsRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get();
    const totalSavings = totalSavingsRow.total;

    // 2. Total amount distributed (payouts)
    const totalDistributedRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payouts').get();
    const totalDistributed = totalDistributedRow.total;

    // 3. Total members
    const totalMembersRow = db.prepare('SELECT COUNT(*) as count FROM members').get();
    const totalMembers = totalMembersRow.count;

    // 4. Active savings groups
    const activeGroupsRow = db.prepare("SELECT COUNT(*) as count FROM savings_groups WHERE status = 'Active'").get();
    const activeGroups = activeGroupsRow.count;

    const completedGroupsRow = db.prepare("SELECT COUNT(*) as count FROM savings_groups WHERE status = 'Completed'").get();
    const completedGroups = completedGroupsRow.count;

    // 5. Calculate pending payments across active groups
    // For each active group, determine expected installments up to current date or duration
    const groups = db.prepare(`
      SELECT g.id, g.monthly_contribution, g.duration_months, g.start_date,
             (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as enrolled_count
      FROM savings_groups g
      WHERE g.status = 'Active'
    `).all();

    const now = new Date();
    let pendingCount = 0;
    let pendingAmount = 0;

    groups.forEach(g => {
      const startDate = new Date(g.start_date);
      // Months elapsed
      let monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
      if (monthsElapsed < 1) monthsElapsed = 1;
      if (monthsElapsed > g.duration_months) monthsElapsed = g.duration_months;

      // Total expected payments up to current elapsed month for all enrolled members
      const expectedTotalPayments = g.enrolled_count * monthsElapsed;

      // Actual payments made up to elapsed month
      const actualPaymentsRow = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as paid_sum
        FROM payments
        WHERE group_id = ? AND installment_no <= ?
      `).get(g.id, monthsElapsed);

      const actualCount = actualPaymentsRow.count;
      const groupPendingCount = Math.max(0, expectedTotalPayments - actualCount);
      pendingCount += groupPendingCount;
      pendingAmount += groupPendingCount * g.monthly_contribution;
    });

    // 6. Recent transactions (Unified Payments + Payouts)
    const recentPayments = db.prepare(`
      SELECT 
        p.id,
        p.receipt_number as ref_no,
        'Collection' as type,
        p.amount,
        p.payment_date as date,
        p.payment_method,
        m.full_name as member_name,
        m.id as member_id,
        g.name as group_name,
        p.installment_no,
        p.created_at
      FROM payments p
      JOIN members m ON p.member_id = m.id
      JOIN savings_groups g ON p.group_id = g.id
      ORDER BY p.payment_date DESC, p.id DESC
      LIMIT 10
    `).all();

    const recentPayouts = db.prepare(`
      SELECT 
        po.id,
        po.voucher_number as ref_no,
        'Payout' as type,
        po.amount,
        po.payout_date as date,
        po.payment_method,
        m.full_name as member_name,
        m.id as member_id,
        g.name as group_name,
        po.installment_no,
        po.created_at
      FROM payouts po
      JOIN members m ON po.member_id = m.id
      JOIN savings_groups g ON po.group_id = g.id
      ORDER BY po.payout_date DESC, po.id DESC
      LIMIT 10
    `).all();

    // Merge and take top 10
    const recentTransactions = [...recentPayments, ...recentPayouts]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    // 7. Group summary overview
    const groupOverview = db.prepare(`
      SELECT 
        g.id,
        g.name,
        g.monthly_contribution,
        g.duration_months,
        g.total_members as capacity,
        g.status,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as enrolled_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE group_id = g.id) as total_collected,
        (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE group_id = g.id) as total_payouts
      FROM savings_groups g
      ORDER BY g.status ASC, g.id DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        totalSavings,
        totalDistributed,
        netBalance: totalSavings - totalDistributed,
        totalMembers,
        activeGroups,
        completedGroups,
        pendingPaymentsCount: pendingCount,
        pendingAmount,
        recentTransactions,
        groupOverview
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard stats.' });
  }
});

module.exports = router;
