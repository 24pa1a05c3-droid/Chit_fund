const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Helper to generate voucher number
function generateVoucherNumber() {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const countRow = db.prepare('SELECT COUNT(*) as count FROM payouts').get();
  const seq = String(countRow.count + 1).padStart(3, '0');
  return `VCH-${yearMonth}-${seq}-${randomSuffix}`;
}

// GET /api/payouts - list payouts
router.get('/', (req, res) => {
  try {
    const { group_id, member_id, search } = req.query;

    let query = `
      SELECT 
        po.*,
        m.full_name as member_name,
        m.phone as member_phone,
        g.name as group_name,
        g.monthly_contribution,
        g.total_members
      FROM payouts po
      JOIN members m ON po.member_id = m.id
      JOIN savings_groups g ON po.group_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (group_id && group_id !== 'All') {
      query += ` AND po.group_id = ?`;
      params.push(group_id);
    }

    if (member_id && member_id !== 'All') {
      query += ` AND po.member_id = ?`;
      params.push(member_id);
    }

    if (search && search.trim()) {
      query += ` AND (po.voucher_number LIKE ? OR m.full_name LIKE ? OR po.notes LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY po.payout_date DESC, po.id DESC`;

    const payouts = db.prepare(query).all(...params);
    const totalDisbursed = payouts.reduce((acc, p) => acc + Number(p.amount), 0);

    res.json({
      success: true,
      totalCount: payouts.length,
      totalDisbursed,
      data: payouts
    });
  } catch (error) {
    console.error('Fetch payouts error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payouts.' });
  }
});

// GET /api/payouts/group-balance/:groupId - get live group balance & payout eligibility
router.get('/group-balance/:groupId', (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(groupId);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Savings group not found.' });
    }

    const collections = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE group_id = ?').get(groupId).total;
    const payouts = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payouts WHERE group_id = ?').get(groupId).total;
    const remainingBalance = collections - payouts;

    // Disbursed members in this group
    const pastRecipients = db.prepare(`
      SELECT member_id, installment_no, amount, payout_date, voucher_number
      FROM payouts
      WHERE group_id = ?
    `).all(groupId);

    const pastRecipientMemberIds = pastRecipients.map(p => p.member_id);
    const pastDisbursedCycles = pastRecipients.map(p => p.installment_no);

    // List of enrolled members with indication if they already won/received a payout
    const enrolledMembers = db.prepare(`
      SELECT m.id, m.full_name, m.phone, gm.seat_number
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      WHERE gm.group_id = ?
      ORDER BY gm.seat_number ASC, m.full_name ASC
    `).all(groupId).map(m => ({
      ...m,
      hasReceivedPayout: pastRecipientMemberIds.includes(m.id)
    }));

    res.json({
      success: true,
      data: {
        groupId: group.id,
        groupName: group.name,
        monthlyContribution: group.monthly_contribution,
        totalMembers: group.total_members,
        monthlyPoolTarget: group.total_members * group.monthly_contribution,
        durationMonths: group.duration_months,
        totalCollected: collections,
        totalDisbursed: payouts,
        remainingBalance,
        enrolledMembers,
        pastDisbursedCycles
      }
    });
  } catch (error) {
    console.error('Fetch group balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate group balance.' });
  }
});

// POST /api/payouts - record a payout with manager confirmation
router.post('/', (req, res) => {
  try {
    const {
      group_id,
      member_id,
      installment_no,
      amount,
      payout_date,
      payment_method,
      notes,
      manager_confirmed
    } = req.body;

    // Explicit Manager Confirmation Check
    if (!manager_confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Manager confirmation is required to authorize and disburse a payout.'
      });
    }

    if (!group_id || !member_id || !installment_no || !amount || !payout_date) {
      return res.status(400).json({
        success: false,
        message: 'Group, recipient member, installment cycle, amount, and payout date are required.'
      });
    }

    const numAmount = parseFloat(amount);
    const numInstallment = parseInt(installment_no, 10);

    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payout amount must be greater than zero.' });
    }

    // Verify group
    const group = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(group_id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Savings group not found.' });
    }

    // Verify member enrolled
    const membership = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND member_id = ?').get(group_id, member_id);
    if (!membership) {
      return res.status(400).json({ success: false, message: 'Recipient is not enrolled in this savings group.' });
    }

    // Check if this cycle was already paid out
    const cyclePayout = db.prepare('SELECT id, voucher_number FROM payouts WHERE group_id = ? AND installment_no = ?').get(group_id, numInstallment);
    if (cyclePayout) {
      return res.status(409).json({
        success: false,
        message: `Cycle #${numInstallment} has already been disbursed under voucher ${cyclePayout.voucher_number}.`
      });
    }

    // Check if recipient already received payout in this group
    const memberPayout = db.prepare('SELECT id, voucher_number, installment_no FROM payouts WHERE group_id = ? AND member_id = ?').get(group_id, member_id);
    if (memberPayout) {
      return res.status(409).json({
        success: false,
        message: `This member has already received a payout for Cycle #${memberPayout.installment_no} (Voucher ${memberPayout.voucher_number}). In a Chit Fund, each member is awarded once per group cycle.`
      });
    }

    // Check remaining balance
    const collections = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE group_id = ?').get(group_id).total;
    const payouts = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payouts WHERE group_id = ?').get(group_id).total;
    const currentBalance = collections - payouts;

    if (numAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient group balance. Available balance is ₹/US$ ${currentBalance.toLocaleString()}, but payout requested is ${numAmount.toLocaleString()}.`
      });
    }

    const voucherNumber = generateVoucherNumber();
    const approvedBy = req.user ? req.user.name : 'Authorized Manager';

    // Execute atomic transaction
    const recordPayoutTransaction = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO payouts (
          voucher_number, group_id, member_id, installment_no, amount, payout_date, payment_method, notes, approved_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        voucherNumber,
        group_id,
        member_id,
        numInstallment,
        numAmount,
        payout_date,
        payment_method || 'Bank Transfer',
        notes ? notes.trim() : null,
        approvedBy
      );

      return result.lastInsertRowid;
    });

    const payoutId = recordPayoutTransaction();

    const createdPayout = db.prepare(`
      SELECT 
        po.*,
        m.full_name as member_name,
        m.phone as member_phone,
        m.address as member_address,
        g.name as group_name
      FROM payouts po
      JOIN members m ON po.member_id = m.id
      JOIN savings_groups g ON po.group_id = g.id
      WHERE po.id = ?
    `).get(payoutId);

    res.status(201).json({
      success: true,
      message: 'Payout recorded and disbursed successfully.',
      voucher: createdPayout,
      data: createdPayout
    });
  } catch (error) {
    console.error('Record payout error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payout.' });
  }
});

// DELETE /api/payouts/:id - void payout
router.delete('/:id', (req, res) => {
  try {
    const payoutId = req.params.id;
    const payout = db.prepare('SELECT * FROM payouts WHERE id = ?').get(payoutId);

    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout record not found.' });
    }

    db.prepare('DELETE FROM payouts WHERE id = ?').run(payoutId);

    res.json({
      success: true,
      message: `Payout record ${payout.voucher_number} voided successfully.`
    });
  } catch (error) {
    console.error('Delete payout error:', error);
    res.status(500).json({ success: false, message: 'Failed to void payout.' });
  }
});

module.exports = router;
