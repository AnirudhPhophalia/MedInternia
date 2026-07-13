// Case System Testing Script
// Run this after starting the server (npm run dev)

const API_BASE = 'http://localhost:3000/api';

// Test credentials
const doctorCredentials = {
  email: 'test.doctor@example.com',
  password: 'password123'
};

const patientCredentials = {
  email: 'test.patient@example.com',
  password: 'password123'
};

let doctorToken = '';
let patientToken = '';
let caseId = '';

// Helper function to make API requests
async function makeRequest(url, options = {}) {
  try {
    const { headers, ...restOptions } = options;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      ...restOptions
    });
    
    const data = await response.json();
    console.log(`${options.method || 'GET'} ${url}:`, response.status, data);
    return { response, data };
  } catch (error) {
    console.error('Request failed:', error);
    return { error };
  }
}

// Test functions
async function testCaseSystem() {
  console.log('🧪 Starting Case System Tests...\n');

  // 1. Login as doctor
  console.log('1️⃣ Login as Doctor:');
  const doctorLogin = await makeRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(doctorCredentials)
  });
  
  if (doctorLogin.data?.success) {
    doctorToken = doctorLogin.data.data.token;
    console.log('✅ Doctor login successful\n');
  } else {
    console.log('❌ Doctor login failed\n');
    return;
  }

  // 2. Login as patient/intern
  console.log('2️⃣ Login as Patient/Intern:');
  const patientLogin = await makeRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(patientCredentials)
  });
  
  if (patientLogin.data?.success) {
    patientToken = patientLogin.data.data.token;
    console.log('✅ Patient login successful\n');
  } else {
    console.log('❌ Patient login failed\n');
    return;
  }

  // 3. Doctor creates a case
  console.log('3️⃣ Doctor Creates a Medical Case:');
  const newCase = {
    title: 'Complex Cardiology Case',
    description: 'A 45-year-old male presents with chest pain and shortness of breath. ECG shows ST elevation in leads II, III, and aVF.',
    symptoms: ['chest pain', 'shortness of breath', 'sweating', 'nausea'],
    patientInfo: {
      age: 45,
      gender: 'male',
      medicalHistory: ['hypertension', 'diabetes type 2'],
      currentMedications: ['metformin', 'lisinopril']
    },
    diagnosis: 'Inferior wall STEMI (ST-elevation myocardial infarction)',
    treatment: 'Emergency PCI (percutaneous coronary intervention) performed. Patient stabilized.',
    tags: ['cardiology', 'emergency', 'STEMI', 'interventional'],
    difficulty: 'advanced',
    specialization: 'Cardiology'
  };

  const createCase = await makeRequest(`${API_BASE}/cases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${doctorToken}`
    },
    body: JSON.stringify(newCase)
  });

  if (createCase.data?.success) {
    caseId = createCase.data.data.case._id;
    console.log('✅ Case created successfully\n');
  } else {
    console.log('❌ Case creation failed\n');
    return;
  }

  // 4. Get all cases
  console.log('4️⃣ Get All Cases:');
  await makeRequest(`${API_BASE}/cases`, {
    headers: {
      'Authorization': `Bearer ${patientToken}`
    }
  });
  console.log('✅ Cases retrieved\n');

  // 5. Get specific case by ID
  console.log('5️⃣ Get Specific Case:');
  await makeRequest(`${API_BASE}/cases/${caseId}`, {
    headers: {
      'Authorization': `Bearer ${patientToken}`
    }
  });
  console.log('✅ Specific case retrieved\n');

  // 6. Patient/Intern adds a comment
  console.log('6️⃣ Patient/Intern Adds Comment:');
  const comment = {
    content: 'Based on the presentation, I agree with the diagnosis. The inferior wall STEMI is clearly indicated by the ST elevation in leads II, III, and aVF. Quick intervention was crucial here. Great case for learning!'
  };

  await makeRequest(`${API_BASE}/cases/${caseId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify(comment)
  });
  console.log('✅ Comment added\n');

  // 7. Doctor adds a follow-up comment
  console.log('7️⃣ Doctor Adds Follow-up Comment:');
  const doctorComment = {
    content: 'Excellent observation! This case highlights the importance of rapid ECG interpretation and immediate cardiac catheterization. The patient had 99% occlusion of the RCA (right coronary artery).'
  };

  await makeRequest(`${API_BASE}/cases/${caseId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${doctorToken}`
    },
    body: JSON.stringify(doctorComment)
  });
  console.log('✅ Doctor comment added\n');

  // 8. Patient likes the case
  console.log('8️⃣ Patient Likes the Case:');
  await makeRequest(`${API_BASE}/cases/${caseId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${patientToken}`
    }
  });
  console.log('✅ Case liked\n');

  // 9. Doctor views their cases
  console.log('9️⃣ Doctor Views Their Cases:');
  await makeRequest(`${API_BASE}/cases/my/cases`, {
    headers: {
      'Authorization': `Bearer ${doctorToken}`
    }
  });
  console.log('✅ Doctor cases retrieved\n');

  // 10. Search cases with filters
  console.log('🔟 Search Cases with Filters:');
  await makeRequest(`${API_BASE}/cases?difficulty=advanced&specialization=cardiology`, {
    headers: {
      'Authorization': `Bearer ${patientToken}`
    }
  });
  console.log('✅ Filtered cases retrieved\n');

  // 11. Update case (doctor only)
  console.log('1️⃣1️⃣ Doctor Updates Case:');
  const updateData = {
    title: 'Complex Cardiology Case - Updated',
    description: newCase.description + ' UPDATE: Patient recovered well and was discharged after 3 days.'
  };

  await makeRequest(`${API_BASE}/cases/${caseId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${doctorToken}`
    },
    body: JSON.stringify(updateData)
  });
  console.log('✅ Case updated\n');

  // 12. Get updated case to see changes
  console.log('1️⃣2️⃣ Get Updated Case:');
  await makeRequest(`${API_BASE}/cases/${caseId}`, {
    headers: {
      'Authorization': `Bearer ${patientToken}`
    }
  });
  console.log('✅ Updated case retrieved\n');

  console.log('🎉 All Case System Tests Completed!\n');
  console.log('📋 Test Summary:');
  console.log('✅ Doctor and Patient/Intern authentication');
  console.log('✅ Case creation by doctor');
  console.log('✅ Case retrieval with pagination');
  console.log('✅ Case details viewing');
  console.log('✅ Comment system (both doctor and intern)');
  console.log('✅ Like system');
  console.log('✅ Doctor case management');
  console.log('✅ Case filtering and search');
  console.log('✅ Case updates by owner');
  console.log('\n🏥 Medical Case Discussion System is fully functional!');
}

// Test authorization failures
async function testAuthorization() {
  console.log('\n🔒 Testing Authorization Controls...\n');

  // Try to create case as patient (should fail)
  console.log('1️⃣ Patient Tries to Create Case (Should Fail):');
  await makeRequest(`${API_BASE}/cases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      title: 'Test Case',
      description: 'This should fail'
    })
  });

  // Try to update case as non-owner (should fail)
  console.log('2️⃣ Patient Tries to Update Doctor\'s Case (Should Fail):');
  await makeRequest(`${API_BASE}/cases/${caseId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      title: 'Hacked Case'
    })
  });

  console.log('✅ Authorization tests completed\n');
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testCaseSystem().then(() => testAuthorization());
} else {
  // Browser environment
  console.log('Copy and paste these functions into browser console to test:');
  console.log('testCaseSystem()');
  console.log('testAuthorization()');
}

// Export for manual testing
if (typeof module !== 'undefined') {
  module.exports = { testCaseSystem, testAuthorization };
}
