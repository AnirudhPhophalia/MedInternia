// Simple Case API Test using PowerShell
// This file demonstrates testing the case API endpoints

// First, we need to register and login users to get tokens
// Run these commands one by one in PowerShell

/*

1. Register a Doctor:
   Invoke-WebRequest -Uri "http://localhost:3000/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"firstName":"Dr. Sarah","lastName":"Johnson","email":"dr.sarah@hospital.com","password":"password123","userType":"doctor","specialization":"Cardiology","licenseNumber":"MD123456","phoneNumber":"555-0101"}'

2. Register a Patient/Intern:
   Invoke-WebRequest -Uri "http://localhost:3000/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"firstName":"John","lastName":"Doe","email":"john.intern@hospital.com","password":"password123","userType":"patient","dateOfBirth":"1995-05-15","phoneNumber":"555-0102","emergencyContact":"555-0103"}'

3. Login as Doctor:
   $doctorLogin = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"dr.sarah@hospital.com","password":"password123"}'
$doctorResponse = $doctorLogin.Content | ConvertFrom-Json
$doctorToken = $doctorResponse.data.token

4. Login as Patient/Intern:
   $patientLogin = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"john.intern@hospital.com","password":"password123"}'
$patientResponse = $patientLogin.Content | ConvertFrom-Json
$patientToken = $patientResponse.data.token

5. Doctor Creates a Case:
   $caseData = @{
   title = "Complex Cardiac Arrhythmia Case"
   description = "A 62-year-old male presents with irregular heartbeat and chest discomfort. Patient has history of hypertension."
   symptoms = @("irregular heartbeat", "chest discomfort", "shortness of breath")
   patientInfo = @{
   age = 62
   gender = "male"
   medicalHistory = @("hypertension", "high cholesterol")
   currentMedications = @("lisinopril", "atorvastatin")
   }
   diagnosis = "Atrial fibrillation with rapid ventricular response"
   treatment = "Rate control with metoprolol, anticoagulation with warfarin"
   tags = @("cardiology", "arrhythmia", "atrial fibrillation")
   difficulty = "intermediate"
   specialization = "Cardiology"
   } | ConvertTo-Json -Depth 3

$createCase = Invoke-WebRequest -Uri "http://localhost:3000/api/cases" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $doctorToken"} -Body $caseData
$caseResponse = $createCase.Content | ConvertFrom-Json
$caseId = $caseResponse.data.case._id

6. Get All Cases (as Intern):
   Invoke-WebRequest -Uri "http://localhost:3000/api/cases" -Method GET -Headers @{"Authorization"="Bearer $patientToken"}

7. Get Specific Case:
   Invoke-WebRequest -Uri "http://localhost:3000/api/cases/$caseId" -Method GET -Headers @{"Authorization"="Bearer $patientToken"}

8. Intern Adds Comment:
   $commentData = '{"content":"This is a classic presentation of AFib. The irregular rhythm and patient history strongly support this diagnosis. Rate control is appropriate first-line treatment."}'
Invoke-WebRequest -Uri "http://localhost:3000/api/cases/$caseId/comments" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $patientToken"} -Body $commentData

9. Intern Likes the Case:
   Invoke-WebRequest -Uri "http://localhost:3000/api/cases/$caseId/like" -Method POST -Headers @{"Authorization"="Bearer $patientToken"}

10. Doctor Views Their Cases:
    Invoke-WebRequest -Uri "http://localhost:3000/api/cases/my/cases" -Method GET -Headers @{"Authorization"="Bearer $doctorToken"}

11. Search Cases with Filters:
    Invoke-WebRequest -Uri "http://localhost:3000/api/cases?difficulty=intermediate&specialization=cardiology" -Method GET -Headers @{"Authorization"="Bearer $patientToken"}

12. Doctor Updates Case:
    $updateData = '{"title":"Complex Cardiac Arrhythmia Case - UPDATED","description":"A 62-year-old male presents with irregular heartbeat and chest discomfort. Patient has history of hypertension. UPDATE: Patient responded well to treatment and was discharged stable."}'
Invoke-WebRequest -Uri "http://localhost:3000/api/cases/$caseId" -Method PUT -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $doctorToken"} -Body $updateData

*/
