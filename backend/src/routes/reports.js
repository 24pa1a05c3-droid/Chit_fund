const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Helper function to convert JSON array to CSV string
function convertToCSV(data, headers) {
  if (!data || !data.length) {
    return headers.map(h => `"${h.label}"`).join(',') + '\n';
  }

  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  const rows = data.map(row => {
    return headers.map(h => {
      let val = row[h.key];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""'); // escape quotes
      return `"${val}"`;
    }).join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

// 1. Monthly Collection Report
router.get('/collections', (req, res) => {
  try {
    const { group_id, year } = req.query;

    let query = `
      SELECT 
        strftime('%Y-%m', p.payment_date) as month,
        g.name as group_name,
        p.group_id,
        COUNT(p.id) as payment_count,
        SUM(p.amount) as total_amount
      FROM payments p
      JOIN savings_groups g ON p.group_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (group_id && group_id !== 'All') {
      query += ` AND p.group_id = ?`;
      params.push(group_id);
    }

    if (year) {
      query += ` AND strftime('%Y', p.payment_date) = ?`;
      params.push(year);
    }

    query += `
      GROUP BY strftime('%Y-%m', p.payment_date), p.group_id
      ORDER BY month DESC, total_amount DESC
    `;

    const report = db.prepare(query).all(...params);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Monthly collection report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate monthly collection report.' });
  }
});

// 2. Pending Payment Report
router.get('/pending', (req, res) => {
  try {
    const { group_id } = req.query;

    let groupQuery = "SELECT * FROM savings_groups WHERE status = 'Active'";
    const params = [];
    if (group_id && group_id !== 'All') {
      groupQuery += " AND id = ?";
      params.push(group_id);
    }

    const groups = db.prepare(groupQuery).all(...params);
    const now = new Date();
    const pendingList = [];

    groups.forEach(g => {
      const startDate = new Date(g.start_date);
      let monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
      if (monthsElapsed < 1) monthsElapsed = 1;
      if (monthsElapsed > g.duration_months) monthsElapsed = g.duration_months;

      const members = db.prepare(`
        SELECT m.id, m.full_name, m.phone, gm.seat_number
        FROM group_members gm
        JOIN members m ON gm.member_id = m.id
        WHERE gm.group_id = ?
        ORDER BY m.full_name ASC
      `).all(g.id);

      members.forEach(m => {
        for (let cycle = 1; cycle <= monthsElapsed; cycle++) {
          const payment = db.prepare(`
            SELECT id FROM payments
            WHERE group_id = ? AND member_id = ? AND installment_no = ?
          `).get(g.id, m.id, cycle);

          if (!payment) {
            // Calculate approximate due date: start_date + (cycle - 1) months, day of month = collection_day
            const dueYear = startDate.getFullYear();
            const dueMonth = startDate.getMonth() + (cycle - 1);
            const dueDateObj = new Date(dueYear, dueMonth, g.collection_day || 5);
            const dueDateStr = dueDateObj.toISOString().split('T')[0];

            pendingList.push({
              member_id: m.id,
              member_name: m.full_name,
              phone: m.phone,
              seat_number: m.seat_number,
              group_id: g.id,
              group_name: g.name,
              installment_no: cycle,
              amount_due: g.monthly_contribution,
              due_date: dueDateStr,
              overdue_days: Math.max(0, Math.floor((now - dueDateObj) / (1000 * 60 * 60 * 24)))
            });
          }
        }
      });
    });

    res.json({
      success: true,
      totalPendingCount: pendingList.length,
      totalPendingAmount: pendingList.reduce((acc, row) => acc + row.amount_due, 0),
      data: pendingList
    });
  } catch (error) {
    console.error('Pending report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate pending payment report.' });
  }
});

// 3. Member-wise Savings & Payout Report
router.get('/members-summary', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        m.id,
        m.full_name,
        m.phone,
        m.status,
        m.join_date,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.member_id = m.id) as groups_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.member_id = m.id) as total_saved,
        (SELECT COUNT(id) FROM payments p WHERE p.member_id = m.id) as total_payments_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payouts po WHERE po.member_id = m.id) as total_payouts_received,
        (SELECT COUNT(id) FROM payouts po WHERE po.member_id = m.id) as payouts_count
      FROM members m
      ORDER BY total_saved DESC, m.full_name ASC
    `).all().map(row => ({
      ...row,
      net_balance: Number(row.total_saved) - Number(row.total_payouts_received)
    }));

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Members summary report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate member savings report.' });
  }
});

// 4. Combined Transaction Ledger (Collections & Payouts)
router.get('/transactions', (req, res) => {
  try {
    const { type, group_id, date_from, date_to } = req.query;

    let paymentsQuery = `
      SELECT 
        p.id,
        p.receipt_number as reference_number,
        'Collection' as transaction_type,
        p.payment_date as transaction_date,
        p.amount,
        p.payment_method,
        m.full_name as member_name,
        g.name as group_name,
        p.installment_no,
        p.notes
      FROM payments p
      JOIN members m ON p.member_id = m.id
      JOIN savings_groups g ON p.group_id = g.id
      WHERE 1=1
    `;

    let payoutsQuery = `
      SELECT 
        po.id,
        po.voucher_number as reference_number,
        'Payout' as transaction_type,
        po.payout_date as transaction_date,
        po.amount,
        po.payment_method,
        m.full_name as member_name,
        g.name as group_name,
        po.installment_no,
        po.notes
      FROM payouts po
      JOIN members m ON po.member_id = m.id
      JOIN savings_groups g ON po.group_id = g.id
      WHERE 1=1
    `;

    const pParams = [];
    const poParams = [];

    if (group_id && group_id !== 'All') {
      paymentsQuery += ` AND p.group_id = ?`;
      pParams.push(group_id);
      payoutsQuery += ` AND po.group_id = ?`;
      poParams.push(group_id);
    }

    if (date_from) {
      paymentsQuery += ` AND p.payment_date >= ?`;
      pParams.push(date_from);
      payoutsQuery += ` AND po.payout_date >= ?`;
      poParams.push(date_from);
    }

    if (date_to) {
      paymentsQuery += ` AND p.payment_date <= ?`;
      pParams.push(date_to);
      payoutsQuery += ` AND po.payout_date <= ?`;
      poParams.push(date_to);
    }

    let records = [];

    if (!type || type === 'All' || type === 'Collection') {
      const payments = db.prepare(paymentsQuery).all(...pParams);
      records = records.concat(payments);
    }

    if (!type || type === 'All' || type === 'Payout') {
      const payouts = db.prepare(payoutsQuery).all(...poParams);
      records = records.concat(payouts);
    }

    records.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

    res.json({
      success: true,
      totalCount: records.length,
      data: records
    });
  } catch (error) {
    console.error('Transactions report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate transaction report.' });
  }
});

// 5. Export Report to CSV Endpoint
router.get('/export-csv', (req, res) => {
  try {
    const { reportType } = req.query;

    let filename = `report-${reportType || 'data'}-${Date.now()}.csv`;
    let csvData = '';

    if (reportType === 'monthly-collections') {
      const rows = db.prepare(`
        SELECT 
          strftime('%Y-%m', p.payment_date) as month,
          g.name as group_name,
          COUNT(p.id) as payment_count,
          SUM(p.amount) as total_amount
        FROM payments p
        JOIN savings_groups g ON p.group_id = g.id
        GROUP BY strftime('%Y-%m', p.payment_date), p.group_id
        ORDER BY month DESC
      `).all();

      csvData = convertToCSV(rows, [
        { label: 'Month', key: 'month' },
        { label: 'Savings Group', key: 'group_name' },
        { label: 'Total Payments Received', key: 'payment_count' },
        { label: 'Total Collected (Amount)', key: 'total_amount' }
      ]);
    } else if (reportType === 'members-summary') {
      const rows = db.prepare(`
        SELECT 
          m.full_name,
          m.phone,
          m.status,
          m.join_date,
          (SELECT COUNT(*) FROM group_members gm WHERE gm.member_id = m.id) as groups_count,
          (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.member_id = m.id) as total_saved,
          (SELECT COALESCE(SUM(amount), 0) FROM payouts po WHERE po.member_id = m.id) as total_payouts_received
        FROM members m
        ORDER BY total_saved DESC
      `).all().map(r => ({
        ...r,
        net_balance: Number(r.total_saved) - Number(r.total_payouts_received)
      }));

      csvData = convertToCSV(rows, [
        { label: 'Member Name', key: 'full_name' },
        { label: 'Phone', key: 'phone' },
        { label: 'Status', key: 'status' },
        { label: 'Join Date', key: 'join_date' },
        { label: 'Groups Enrolled', key: 'groups_count' },
        { label: 'Total Savings Contributed', key: 'total_saved' },
        { label: 'Total Payouts Received', key: 'total_payouts_received' },
        { label: 'Net Balance', key: 'net_balance' }
      ]);
    } else if (reportType === 'transactions') {
      const payments = db.prepare(`
        SELECT p.receipt_number as ref, 'Collection' as type, p.payment_date as date, p.amount, p.payment_method, m.full_name as member, g.name as group_name, p.installment_no, p.notes
        FROM payments p
        JOIN members m ON p.member_id = m.id
        JOIN savings_groups g ON p.group_id = g.id
      `).all();

      const payouts = db.prepare(`
        SELECT po.voucher_number as ref, 'Payout' as type, po.payout_date as date, po.amount, po.payment_method, m.full_name as member, g.name as group_name, po.installment_no, po.notes
        FROM payouts po
        JOIN members m ON po.member_id = m.id
        JOIN savings_groups g ON po.group_id = g.id
      `).all();

      const all = [...payments, ...payouts].sort((a, b) => new Date(b.date) - new Date(a.date));

      csvData = convertToCSV(all, [
        { label: 'Reference Number', key: 'ref' },
        { label: 'Type', key: 'type' },
        { label: 'Date', key: 'date' },
        { label: 'Group Name', key: 'group_name' },
        { label: 'Member Name', key: 'member' },
        { label: 'Installment Cycle', key: 'installment_no' },
        { label: 'Amount', key: 'amount' },
        { label: 'Payment Method', key: 'payment_method' },
        { label: 'Notes', key: 'notes' }
      ]);
    } else {
      // Default: pending report
      const groups = db.prepare("SELECT * FROM savings_groups WHERE status = 'Active'").all();
      const now = new Date();
      const pendingList = [];

      groups.forEach(g => {
        const startDate = new Date(g.start_date);
        let monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
        if (monthsElapsed < 1) monthsElapsed = 1;
        if (monthsElapsed > g.duration_months) monthsElapsed = g.duration_months;

        const members = db.prepare(`
          SELECT m.id, m.full_name, m.phone
          FROM group_members gm
          JOIN members m ON gm.member_id = m.id
          WHERE gm.group_id = ?
        `).all(g.id);

        members.forEach(m => {
          for (let cycle = 1; cycle <= monthsElapsed; cycle++) {
            const payment = db.prepare(`
              SELECT id FROM payments WHERE group_id = ? AND member_id = ? AND installment_no = ?
            `).get(g.id, m.id, cycle);

            if (!payment) {
              pendingList.push({
                member: m.full_name,
                phone: m.phone,
                group_name: g.name,
                installment: `Cycle #${cycle}`,
                amount_due: g.monthly_contribution
              });
            }
          }
        });
      });

      csvData = convertToCSV(pendingList, [
        { label: 'Member Name', key: 'member' },
        { label: 'Phone', key: 'phone' },
        { label: 'Group Name', key: 'group_name' },
        { label: 'Installment', key: 'installment' },
        { label: 'Amount Due', key: 'amount_due' }
      ]);
      filename = `pending-payments-${Date.now()}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
});

module.exports = router;
