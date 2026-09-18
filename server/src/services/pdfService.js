import PDFDocument from 'pdfkit';

// Helper to convert number to Indian currency words
function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  };

  const integerPart = Math.floor(Math.abs(num));
  return `${convert(integerPart)} Rupees Only`;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function generateSalarySlipPdf(data, stream) {
  const doc = new PDFDocument({ margin: 36, size: 'A4' });
  doc.pipe(stream);

  const { employee, detail, run, settings } = data;
  const monthName = monthNames[(run.month || 1) - 1] || 'Month';
  const primaryColor = '#1E3A8A'; // Deep Navy
  const secondaryColor = '#3B82F6';
  const darkTextColor = '#1E293B';
  const lightGray = '#F8FAFC';
  const borderGray = '#CBD5E1';

  // Header Box
  doc.rect(36, 36, 523, 75).fill('#F1F5F9');
  doc.rect(36, 36, 523, 75).stroke(borderGray);

  doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
     .text(settings.company_name || 'ERP ENTERPRISE TECH PVT LTD', 48, 48);

  doc.fillColor(darkTextColor).fontSize(8.5).font('Helvetica')
     .text(settings.company_address || 'Silicon Valley, Bangalore', 48, 68, { width: 340 })
     .text(`Email: ${settings.company_email} | Phone: ${settings.company_phone}`, 48, 88);

  // Payslip Badge
  doc.rect(410, 48, 135, 30).fill(primaryColor);
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
     .text('SALARY PAYSLIP', 410, 53, { width: 135, align: 'center' });
  doc.fontSize(8).font('Helvetica')
     .text(`${monthName} ${run.year}`, 410, 66, { width: 135, align: 'center' });

  // Employee Information Grid
  let y = 125;
  doc.rect(36, y, 523, 85).fill(lightGray).stroke(borderGray);

  const col1 = 48, col2 = 180, col3 = 320, col4 = 430;
  
  doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
  doc.text('Employee Code:', col1, y + 10);
  doc.text('Employee Name:', col1, y + 26);
  doc.text('Department:', col1, y + 42);
  doc.text('Designation:', col1, y + 58);

  doc.fillColor(darkTextColor).fontSize(9).font('Helvetica');
  doc.text(employee.emp_code || '-', col2 - 30, y + 10);
  doc.text(employee.name || '-', col2 - 30, y + 26);
  doc.text(employee.department || '-', col2 - 30, y + 42);
  doc.text(employee.designation || '-', col2 - 30, y + 58);

  doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
  doc.text('Date of Joining:', col3, y + 10);
  doc.text('Bank Name:', col3, y + 26);
  doc.text('Bank A/C No:', col3, y + 42);
  doc.text('IFSC Code:', col3, y + 58);

  doc.fillColor(darkTextColor).fontSize(9).font('Helvetica');
  doc.text(employee.doj || '-', col4, y + 10);
  doc.text(employee.bank_name || 'N/A', col4, y + 26);
  doc.text(employee.bank_account_no || 'N/A', col4, y + 42);
  doc.text(employee.ifsc || 'N/A', col4, y + 58);

  // Attendance Summary Ribbon
  y = 220;
  doc.rect(36, y, 523, 24).fill('#E2E8F0').stroke(borderGray);
  doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold');
  doc.text(`Total Days: ${detail.working_days || 30}`, 48, y + 7);
  doc.text(`Present: ${detail.present_days || 0}`, 170, y + 7);
  doc.text(`Half Days: ${detail.half_days || 0}`, 290, y + 7);
  const lop = Math.max(0, (detail.working_days || 30) - (detail.present_days || 0) - (detail.half_days || 0) * 0.5);
  doc.text(`Effective LOP / Absent: ${lop.toFixed(1)}`, 400, y + 7);

  // Earnings & Deductions Tables Header
  y = 255;
  const colWidth = 261.5;
  doc.rect(36, y, colWidth, 22).fill(primaryColor).stroke(primaryColor);
  doc.rect(36 + colWidth, y, colWidth, 22).fill(primaryColor).stroke(primaryColor);

  doc.fillColor('#FFFFFF').fontSize(9.5).font('Helvetica-Bold');
  doc.text('EARNINGS', 48, y + 6);
  doc.text('AMOUNT (₹)', 220, y + 6);
  doc.text('DEDUCTIONS', 36 + colWidth + 12, y + 6);
  doc.text('AMOUNT (₹)', 36 + colWidth + 180, y + 6);

  // Table rows
  y = 277;
  const rows = [
    { earnLabel: 'Basic Salary', earnVal: detail.basic_earned, dedLabel: 'Provident Fund (PF 12%)', dedVal: detail.pf_deduction },
    { earnLabel: 'House Rent Allowance (HRA)', earnVal: detail.hra_earned, dedLabel: 'ESI Contribution (0.75%)', dedVal: detail.esi_deduction },
    { earnLabel: 'Special & Other Allowances', earnVal: detail.allowance_earned, dedLabel: 'Professional Tax (PT)', dedVal: detail.tax_deduction },
    { earnLabel: 'Performance / Arrears Bonus', earnVal: 0, dedLabel: 'Staff Advance Repayment', dedVal: detail.advance_deduction },
    { earnLabel: '', earnVal: '', dedLabel: 'Other Penalties / Deductions', dedVal: detail.other_deductions }
  ];

  let currentY = y;
  rows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : lightGray;
    doc.rect(36, currentY, 523, 22).fill(bg).stroke(borderGray);

    doc.fillColor(darkTextColor).fontSize(8.5).font('Helvetica');
    if (r.earnLabel) {
      doc.text(r.earnLabel, 48, currentY + 6);
      doc.text(`₹${Number(r.earnVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 220, currentY + 6);
    }
    if (r.dedLabel) {
      doc.text(r.dedLabel, 36 + colWidth + 12, currentY + 6);
      doc.text(`₹${Number(r.dedVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 36 + colWidth + 180, currentY + 6);
    }
    currentY += 22;
  });

  // Total Row
  const totalDeductions = (Number(detail.pf_deduction) || 0) + (Number(detail.esi_deduction) || 0) + 
                          (Number(detail.tax_deduction) || 0) + (Number(detail.advance_deduction) || 0) + 
                          (Number(detail.other_deductions) || 0);

  doc.rect(36, currentY, 523, 24).fill('#E2E8F0').stroke(borderGray);
  doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
  doc.text('Total Gross Earnings', 48, currentY + 7);
  doc.text(`₹${Number(detail.earned_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 220, currentY + 7);
  doc.text('Total Deductions', 36 + colWidth + 12, currentY + 7);
  doc.text(`₹${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 36 + colWidth + 180, currentY + 7);

  // Net Pay Callout Banner
  currentY += 34;
  doc.rect(36, currentY, 523, 50).fill('#EFF6FF').stroke(secondaryColor);
  
  doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
     .text('NET SALARY PAYABLE:', 48, currentY + 12);

  doc.fillColor('#059669').fontSize(16).font('Helvetica-Bold')
     .text(`₹${Number(detail.net_pay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 210, currentY + 9);

  doc.fillColor(darkTextColor).fontSize(8.5).font('Helvetica-Oblique')
     .text(`In Words: ${numberToWords(detail.net_pay || 0)}`, 48, currentY + 32);

  // Payment Details & Signatures
  currentY += 62;
  doc.rect(36, currentY, 523, 60).fill(lightGray).stroke(borderGray);

  doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
     .text('Payment Status:', 48, currentY + 10)
     .text('Payment Mode:', 48, currentY + 26)
     .text('Reference / UTR:', 48, currentY + 42);

  doc.fillColor(darkTextColor).fontSize(8.5).font('Helvetica')
     .text(detail.payment_status || 'Pending', 150, currentY + 10)
     .text(detail.payment_mode || 'Direct Bank Transfer', 150, currentY + 26)
     .text(detail.reference_no || 'N/A', 150, currentY + 42);

  // Signatures
  doc.fillColor(darkTextColor).fontSize(8.5).font('Helvetica')
     .text('_________________________', 380, currentY + 30)
     .text('Authorized Signatory', 405, currentY + 44);

  // Footer note
  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
     .text('This is a computer-generated document and requires no physical signature under Indian IT Act 2000.', 36, 755, { width: 523, align: 'center' });

  doc.end();
}
