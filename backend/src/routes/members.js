const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/members - list all members with search & filters
router.get('/', (req, res) => {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT 
        m.*,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.member_id = m.id) as groups_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.member_id = m.id) as total_savings,
        (SELECT COALESCE(SUM(amount), 0) FROM payouts po WHERE po.member_id = m.id) as total_payouts
      FROM members m
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` AND (m.full_name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status && status !== 'All') {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY m.id DESC`;

    const members = db.prepare(query).all(...params);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Fetch members error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve members.' });
  }
});

// GET /api/members/:id - get member profile, groups & payment history
router.get('/:id', (req, res) => {
  try {
    const memberId = req.params.id;
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Get groups enrolled in
    const groups = db.prepare(`
      SELECT 
        g.*, 
        gm.joined_date as member_joined_date, 
        gm.seat_number,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE group_id = g.id AND member_id = ?) as member_group_contribution
      FROM group_members gm
      JOIN savings_groups g ON gm.group_id = g.id
      WHERE gm.member_id = ?
      ORDER BY g.id DESC
    `).all(memberId, memberId);

    // Get payment history
    const payments = db.prepare(`
      SELECT 
        p.*, 
        g.name as group_name
      FROM payments p
      JOIN savings_groups g ON p.group_id = g.id
      WHERE p.member_id = ?
      ORDER BY p.payment_date DESC, p.id DESC
    `).all(memberId);

    // Get payouts received
    const payouts = db.prepare(`
      SELECT 
        po.*, 
        g.name as group_name
      FROM payouts po
      JOIN savings_groups g ON po.group_id = g.id
      WHERE po.member_id = ?
      ORDER BY po.payout_date DESC, po.id DESC
    `).all(memberId);

    // Summaries
    const totalContributed = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalPayouts = payouts.reduce((acc, po) => acc + Number(po.amount), 0);

    res.json({
      success: true,
      data: {
        ...member,
        totalContributed,
        totalPayouts,
        netBalance: totalContributed - totalPayouts,
        groups,
        payments,
        payouts
      }
    });
  } catch (error) {
    console.error('Fetch member details error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve member details.' });
  }
});

// POST /api/members - create member
router.post('/', (req, res) => {
  try {
    const { full_name, phone, email, address, join_date, status, notes } = req.body;

    if (!full_name || !phone || !join_date) {
      return res.status(400).json({ success: false, message: 'Member name, phone number, and join date are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO members (full_name, phone, email, address, join_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      full_name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      address ? address.trim() : null,
      join_date,
      status || 'Active',
      notes ? notes.trim() : null
    );

    const newMember = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      data: newMember
    });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ success: false, message: 'Failed to create member.' });
  }
});

// PUT /api/members/:id - update member
router.put('/:id', (req, res) => {
  try {
    const memberId = req.params.id;
    const { full_name, phone, email, address, join_date, status, notes } = req.body;

    if (!full_name || !phone || !join_date) {
      return res.status(400).json({ success: false, message: 'Member name, phone number, and join date are required.' });
    }

    const existing = db.prepare('SELECT id FROM members WHERE id = ?').get(memberId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const update = db.prepare(`
      UPDATE members
      SET full_name = ?, phone = ?, email = ?, address = ?, join_date = ?, status = ?, notes = ?
      WHERE id = ?
    `);

    update.run(
      full_name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      address ? address.trim() : null,
      join_date,
      status || 'Active',
      notes ? notes.trim() : null,
      memberId
    );

    const updatedMember = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);

    res.json({
      success: true,
      message: 'Member details updated successfully.',
      data: updatedMember
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ success: false, message: 'Failed to update member.' });
  }
});

// DELETE /api/members/:id - delete member
router.delete('/:id', (req, res) => {
  try {
    const memberId = req.params.id;

    // Check financial records
    const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE member_id = ?').get(memberId).count;
    const payoutCount = db.prepare('SELECT COUNT(*) as count FROM payouts WHERE member_id = ?').get(memberId).count;

    if (paymentCount > 0 || payoutCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete member: This member has recorded financial transactions (${paymentCount} payments, ${payoutCount} payouts). To preserve accounting records, please change their status to 'Inactive' instead.`
      });
    }

    // Delete group memberships first
    db.prepare('DELETE FROM group_members WHERE member_id = ?').run(memberId);

    // Delete member
    const result = db.prepare('DELETE FROM members WHERE id = ?').run(memberId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    res.json({ success: true, message: 'Member deleted successfully.' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete member.' });
  }
});

module.exports = router;
