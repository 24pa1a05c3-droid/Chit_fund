const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Helper to generate unique receipt number
function generateReceiptNumber() {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const countRow = db.prepare('SELECT COUNT(*) as count FROM payments').get();
  const seq = String(countRow.count + 1).padStart(4, '0');
  return `RCP-${yearMonth}-${seq}-${randomSuffix}`;
}

// GET /api/payments - list payments with flexible filters
router.get('/', (req, res) => {
  try {
    const { group_id, member_id, installment_no, payment_method, date_from, date_to, search } = req.query;

    let query = `
      SELECT 
        p.*,
        m.full_name as member_name,
        m.phone as member_phone,
        g.name as group_name,
        g.monthly_contribution,
        u.name as recorded_by_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      JOIN savings_groups g ON p.group_id = g.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (group_id && group_id !== 'All') {
      query += ` AND p.group_id = ?`;
      params.push(group_id);
    }

    if (member_id && member_id !== 'All') {
      query += ` AND p.member_id = ?`;
      params.push(member_id);
    }

    if (installment_no) {
      query += ` AND p.installment_no = ?`;
      params.push(installment_no);
    }

    if (payment_method && payment_method !== 'All') {
      query += ` AND p.payment_method = ?`;
      params.push(payment_method);
    }

    if (date_from) {
      query += ` AND p.payment_date >= ?`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND p.payment_date <= ?`;
      params.push(date_to);
    }

    if (search && search.trim()) {
      query += ` AND (p.receipt_number LIKE ? OR m.full_name LIKE ? OR p.reference_no LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC`;

    const payments = db.prepare(query).all(...params);

    // Also calculate totals for the filtered results
    const totalAmount = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    res.json({
      success: true,
      totalCount: payments.length,
      totalAmount,
      data: payments
    });
  } catch (error) {
    console.error('Fetch payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payments.' });
  }
});

// GET /api/payments/:id - get single payment / receipt
router.get('/:id', (req, res) => {
  try {
    const payment = db.prepare(`
      SELECT 
        p.*,
        m.full_name as member_name,
        m.phone as member_phone,
        m.address as member_address,
        m.email as member_email,
        g.name as group_name,
        g.monthly_contribution,
        g.duration_months,
        u.name as recorded_by_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      JOIN savings_groups g ON p.group_id = g.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Fetch payment details error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment details.' });
  }
});

// POST /api/payments - record member contribution
router.post('/', (req, res) => {
  try {
    const {
      group_id,
      member_id,
      installment_no,
      amount,
      payment_date,
      payment_method,
      reference_no,
      notes
    } = req.body;

    // Backend Input Validation
    if (!group_id || !member_id || !installment_no || !amount || !payment_date || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'All fields (group, member, installment, amount, date, payment method) are required.'
      });
    }

    const numAmount = parseFloat(amount);
    const numInstallment = parseInt(installment_no, 10);

    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    if (numInstallment <= 0) {
      return res.status(400).json({ success: false, message: 'Installment number must be a positive integer.' });
    }

    // Verify group exists
    const group = db.prepare('SELECT * FROM savings_groups WHERE id = ?').get(group_id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Savings group not found.' });
    }

    if (numInstallment > group.duration_months) {
      return res.status(400).json({
        success: false,
        message: `Installment #${numInstallment} exceeds the total group duration (${group.duration_months} months).`
      });
    }

    // Verify member is enrolled in group
    const membership = db.prepare('SELECT id FROM group_members WHERE group_id = ? AND member_id = ?').get(group_id, member_id);
    if (!membership) {
      return res.status(400).json({
        success: false,
        message: 'This member is not enrolled in the selected savings group.'
      });
    }

    // Check duplicate payment entry for the same member, group and installment
    const duplicate = db.prepare(`
      SELECT id, receipt_number, payment_date
      FROM payments
      WHERE group_id = ? AND member_id = ? AND installment_no = ?
    `).get(group_id, member_id, numInstallment);

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Duplicate entry: Payment for Installment #${numInstallment} has already been recorded for this member (Receipt: ${duplicate.receipt_number} on ${duplicate.payment_date}).`
      });
    }

    const receiptNumber = generateReceiptNumber();
    const createdBy = req.user ? req.user.id : null;

    // Use transaction for atomic financial record keeping
    const recordTransaction = db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO payments (
          receipt_number, group_id, member_id, installment_no, amount, payment_date, payment_method, reference_no, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        receiptNumber,
        group_id,
        member_id,
        numInstallment,
        numAmount,
        payment_date,
        payment_method,
        reference_no ? reference_no.trim() : null,
        notes ? notes.trim() : null,
        createdBy
      );

      return result.lastInsertRowid;
    });

    const paymentId = recordTransaction();

    const createdPayment = db.prepare(`
      SELECT 
        p.*,
        m.full_name as member_name,
        m.phone as member_phone,
        m.address as member_address,
        g.name as group_name,
        u.name as recorded_by_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      JOIN savings_groups g ON p.group_id = g.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(paymentId);

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      receipt: createdPayment,
      data: createdPayment
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

// DELETE /api/payments/:id - delete payment record
router.delete('/:id', (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);

    res.json({
      success: true,
      message: `Payment record ${payment.receipt_number} removed successfully.`
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payment.' });
  }
});

module.exports = router;
