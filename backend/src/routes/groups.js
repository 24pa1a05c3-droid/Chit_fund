const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/groups - list all savings groups with stats & filter
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT 
        g.*,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as enrolled_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.group_id = g.id) as total_collected,
        (SELECT COALESCE(SUM(amount), 0) FROM payouts po WHERE po.group_id = g.id) as total_payouts,
        (SELECT COUNT(*) FROM payouts po WHERE po.group_id = g.id) as payouts_count
      FROM savings_groups g
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ` AND g.status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      query += ` AND (g.name LIKE ? OR g.description LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    query += ` ORDER BY g.status ASC, g.id DESC`;

    const groups = db.prepare(query).all(...params).map(g => ({
      ...g,
      remaining_balance: Number(g.total_collected) - Number(g.total_payouts),
      total_pool_per_month: Number(g.total_members) * Number(g.monthly_contribution)
    }));

    res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Fetch groups error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve savings groups.' });
  }
});

// GET /api/groups/:id - get group details, member roster, cycles & balance
router.get('/:id', (req, res) => {
  try {
    const groupId = req.params.id;
    const group = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(groupId);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Savings group not found.' });
    }

    // Enrolled members with their payment counts and payout status
    const members = db.prepare(`
      SELECT 
        m.id, 
        m.full_name, 
        m.phone, 
        m.email, 
        gm.seat_number, 
        gm.joined_date,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE group_id = ? AND member_id = m.id) as total_paid,
        (SELECT COUNT(*) FROM payments WHERE group_id = ? AND member_id = m.id) as installments_paid_count,
        (SELECT voucher_number FROM payouts WHERE group_id = ? AND member_id = m.id LIMIT 1) as payout_voucher,
        (SELECT amount FROM payouts WHERE group_id = ? AND member_id = m.id LIMIT 1) as payout_amount,
        (SELECT payout_date FROM payouts WHERE group_id = ? AND member_id = m.id LIMIT 1) as payout_date
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      WHERE gm.group_id = ?
      ORDER BY gm.seat_number ASC, m.full_name ASC
    `).all(groupId, groupId, groupId, groupId, groupId, groupId);

    // Group finances
    const collectionsTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE group_id = ?').get(groupId).total;
    const payoutsTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payouts WHERE group_id = ?').get(groupId).total;

    // Recent group payments
    const payments = db.prepare(`
      SELECT p.*, m.full_name as member_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.group_id = ?
      ORDER BY p.payment_date DESC, p.id DESC
      LIMIT 20
    `).all(groupId);

    // Group payouts
    const payouts = db.prepare(`
      SELECT po.*, m.full_name as member_name
      FROM payouts po
      JOIN members m ON po.member_id = m.id
      WHERE po.group_id = ?
      ORDER BY po.installment_no ASC
    `).all(groupId);

    res.json({
      success: true,
      data: {
        ...group,
        total_collected: collectionsTotal,
        total_payouts: payoutsTotal,
        remaining_balance: collectionsTotal - payoutsTotal,
        total_pool_per_month: group.total_members * group.monthly_contribution,
        members,
        payments,
        payouts
      }
    });
  } catch (error) {
    console.error('Fetch group details error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve group details.' });
  }
});

// GET /api/groups/:id/installments/:installmentNo - get detailed member payment status for an installment
router.get('/:id/installments/:installmentNo', (req, res) => {
  try {
    const groupId = req.params.id;
    const installmentNo = parseInt(req.params.installmentNo, 10);

    const group = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const membersStatus = db.prepare(`
      SELECT 
        m.id as member_id,
        m.full_name,
        m.phone,
        gm.seat_number,
        p.id as payment_id,
        p.receipt_number,
        p.amount as paid_amount,
        p.payment_date,
        p.payment_method,
        CASE WHEN p.id IS NOT NULL THEN 'Paid' ELSE 'Pending' END as status
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      LEFT JOIN payments p ON p.group_id = gm.group_id AND p.member_id = m.id AND p.installment_no = ?
      WHERE gm.group_id = ?
      ORDER BY gm.seat_number ASC, m.full_name ASC
    `).all(installmentNo, groupId);

    const paidCount = membersStatus.filter(m => m.status === 'Paid').length;
    const pendingCount = membersStatus.filter(m => m.status === 'Pending').length;

    // Check payout for this installment
    const payoutForCycle = db.prepare(`
      SELECT po.*, m.full_name as recipient_name
      FROM payouts po
      JOIN members m ON po.member_id = m.id
      WHERE po.group_id = ? AND po.installment_no = ?
    `).get(groupId, installmentNo);

    res.json({
      success: true,
      data: {
        groupId: group.id,
        groupName: group.name,
        installmentNo,
        expectedAmountPerMember: group.monthly_contribution,
        totalEnrolled: membersStatus.length,
        paidCount,
        pendingCount,
        totalCollectedForCycle: paidCount * group.monthly_contribution,
        members: membersStatus,
        payout: payoutForCycle || null
      }
    });
  } catch (error) {
    console.error('Fetch installment status error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve installment status.' });
  }
});

// POST /api/groups - create group
router.post('/', (req, res) => {
  try {
    const { name, description, total_members, monthly_contribution, duration_months, start_date, collection_day, status } = req.body;

    if (!name || !total_members || !monthly_contribution || !duration_months || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Group name, total members, monthly contribution, duration, and start date are required.'
      });
    }

    if (Number(total_members) <= 0 || Number(monthly_contribution) <= 0 || Number(duration_months) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total members, monthly contribution, and duration must be positive numbers.'
      });
    }

    const insert = db.prepare(`
      INSERT INTO savings_groups (name, description, total_members, monthly_contribution, duration_months, start_date, collection_day, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      description ? description.trim() : null,
      parseInt(total_members, 10),
      parseFloat(monthly_contribution),
      parseInt(duration_months, 10),
      start_date,
      parseInt(collection_day || 5, 10),
      status || 'Active'
    );

    const newGroup = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Savings group created successfully.',
      data: newGroup
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Failed to create savings group.' });
  }
});

// PUT /api/groups/:id - update group
router.put('/:id', (req, res) => {
  try {
    const groupId = req.params.id;
    const { name, description, total_members, monthly_contribution, duration_months, start_date, collection_day, status } = req.body;

    const existing = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(groupId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const update = db.prepare(`
      UPDATE savings_groups
      SET name = ?, description = ?, total_members = ?, monthly_contribution = ?, duration_months = ?, start_date = ?, collection_day = ?, status = ?
      WHERE id = ?
    `);

    update.run(
      name.trim(),
      description ? description.trim() : null,
      parseInt(total_members, 10),
      parseFloat(monthly_contribution),
      parseInt(duration_months, 10),
      start_date,
      parseInt(collection_day || 5, 10),
      status || 'Active',
      groupId
    );

    const updatedGroup = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(groupId);

    res.json({
      success: true,
      message: 'Savings group updated successfully.',
      data: updatedGroup
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ success: false, message: 'Failed to update savings group.' });
  }
});

// POST /api/groups/:id/members - add member to group
router.post('/:id/members', (req, res) => {
  try {
    const groupId = req.params.id;
    const { member_id, seat_number, joined_date } = req.body;

    if (!member_id) {
      return res.status(400).json({ success: false, message: 'Member ID is required.' });
    }

    const group = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Check capacity
    const currentCount = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?').get(groupId).count;
    if (currentCount >= group.total_members) {
      return res.status(400).json({
        success: false,
        message: `Group is already at maximum capacity (${group.total_members} members).`
      });
    }

    // Check if already in group
    const alreadyMember = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND member_id = ?').get(groupId, member_id);
    if (alreadyMember) {
      return res.status(409).json({ success: false, message: 'This member is already enrolled in this group.' });
    }

    const nextSeat = seat_number || (currentCount + 1);

    const insert = db.prepare(`
      INSERT INTO group_members (group_id, member_id, joined_date, seat_number, status)
      VALUES (?, ?, ?, ?, 'Active')
    `);

    insert.run(
      groupId,
      member_id,
      joined_date || new Date().toISOString().split('T')[0],
      nextSeat
    );

    res.status(201).json({
      success: true,
      message: 'Member successfully enrolled into group.'
    });
  } catch (error) {
    console.error('Enroll member error:', error);
    res.status(500).json({ success: false, message: 'Failed to enroll member into group.' });
  }
});

// DELETE /api/groups/:id/members/:memberId - remove member from group
router.delete('/:id/members/:memberId', (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;

    // Check payments or payouts
    const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE group_id = ? AND member_id = ?').get(groupId, memberId).count;
    const payoutCount = db.prepare('SELECT COUNT(*) as count FROM payouts WHERE group_id = ? AND member_id = ?').get(groupId, memberId).count;

    if (paymentCount > 0 || payoutCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove member: Transactions exist for this member in this group. You can mark them inactive instead.'
      });
    }

    const result = db.prepare('DELETE FROM group_members WHERE group_id = ? AND member_id = ?').run(groupId, memberId);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Member was not enrolled in this group.' });
    }

    res.json({ success: true, message: 'Member removed from group successfully.' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member from group.' });
  }
});

// DELETE /api/groups/:id - delete group
router.delete('/:id', (req, res) => {
  try {
    const groupId = req.params.id;

    // Prevent deletion if financial history exists
    const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE group_id = ?').get(groupId).count;
    const payoutCount = db.prepare('SELECT COUNT(*) as count FROM payouts WHERE group_id = ?').get(groupId).count;

    if (paymentCount > 0 || payoutCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete group: It has financial history (${paymentCount} payments, ${payoutCount} payouts). Change status to 'Completed' instead.`
      });
    }

    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
    const result = db.prepare('DELETE FROM savings_groups WHERE id = ?').run(groupId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    res.json({ success: true, message: 'Savings group deleted successfully.' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete savings group.' });
  }
});

module.exports = router;
