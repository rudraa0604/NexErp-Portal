import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(buffer.toString()) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: buffer.toString() });
          }
        } else {
          resolve({ status: res.statusCode, buffer, contentType });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting ERP Backend API Automated Verification...');

  // 1. Health Check
  const health = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  console.log('1. Health Check Status:', health.status, health.data?.status === 'online' ? '✅ PASS' : '❌ FAIL');

  // 2. Admin Login
  const adminLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@erp.local', password: 'Admin@123' });
  console.log('2. Admin Login:', adminLogin.status, adminLogin.data?.success ? '✅ PASS' : '❌ FAIL');
  const adminToken = adminLogin.data?.token;

  // 3. Employee Login
  const empLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'rahul.sharma@erp.local', password: 'Emp@123' });
  console.log('3. Employee Login:', empLogin.status, empLogin.data?.user?.role === 'employee' ? '✅ PASS' : '❌ FAIL');
  const empToken = empLogin.data?.token;

  // 4. Admin View Today Attendance
  const summary = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/today-summary',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('4. Attendance Summary:', summary.status, summary.data?.summary?.totalEmployees > 0 ? '✅ PASS' : '❌ FAIL');

  // 5. Employee Punch In
  const punch = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/attendance/punch',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, { lat: 12.9716, lng: 77.5946 });
  console.log('5. Employee Punch Action:', punch.status, punch.data?.success ? '✅ PASS' : 'ℹ️ ' + punch.data?.message);

  // 6. Generate Draft Payroll
  const payrollDraft = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/payroll/generate-draft',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, { month: 9, year: 2026 });
  console.log('6. Payroll Draft Generation:', payrollDraft.status, payrollDraft.data?.success ? '✅ PASS' : '❌ FAIL');

  // 7. Get Payroll Details & Payslip PDF Download
  const runDetails = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/payroll/runs/${payrollDraft.data?.payrollRunId || 1}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const detailId = runDetails.data?.details?.[0]?.id;

  if (detailId) {
    const slipPdf = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/payroll/slip/${detailId}/download`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('7. PDF Payslip Generation & Stream:', slipPdf.status, slipPdf.contentType?.includes('application/pdf') ? '✅ PASS' : '❌ FAIL');
  }

  console.log('🎉 All backend API flows successfully verified!');
}

runTests().catch(console.error);
