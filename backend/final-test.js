const axios = require("axios");

const baseURL = "http://localhost:3000/api";

async function testAPIEndpoints() {
  console.log("🧪 Testing all API endpoints with your exact data format...\n");

  try {
    // Test 1: Health Check
    console.log("1. Testing Health Check...");
    const health = await axios.get("http://localhost:3000/health");
    console.log("✅ Health Check Response:", health.data);

    // Test 2: API Info
    console.log("\n2. Testing API Info...");
    const apiInfo = await axios.get(`${baseURL}`);
    console.log("✅ API Info:", apiInfo.data);

    // Test 3: Register Patient with your exact format
    console.log("\n3. Testing Patient Registration with your format...");
    const patientData = {
      firstName: "Blue",
      lastName: "Spies",
      email: "bluespies" + Date.now() + "@gmail.com",
      password: "Test@123",
      userType: "patient",
      phone: "9639740956",
      dateOfBirth: "2008-01-01",
      gender: "male",
      address: {
        street: "LM Thapar",
        city: "Chandigarh",
        state: "Chandigarh",
        zipCode: "302019",
        country: "India",
      },
    };

    const registerResponse = await axios.post(
      `${baseURL}/auth/register`,
      patientData,
    );
    console.log("✅ Patient Registration Successful!");
    console.log("User ID:", registerResponse.data.data.user._id);
    console.log(
      "Token received:",
      registerResponse.data.data.token ? "✓" : "✗",
    );

    // Test 4: Login with registered user
    console.log("\n4. Testing Login...");
    const loginData = {
      email: registerResponse.data.data.user.email,
      password: "Test@123",
    };

    const loginResponse = await axios.post(`${baseURL}/auth/login`, loginData);
    console.log("✅ Login Successful!");
    const token = loginResponse.data.data.token;

    // Test 5: Get Profile (Protected Route)
    console.log("\n5. Testing Protected Route (Get Profile)...");
    const profileResponse = await axios.get(`${baseURL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Profile Access Successful!");
    console.log("Profile Email:", profileResponse.data.data.user.email);

    // Test 6: Register Doctor
    console.log("\n6. Testing Doctor Registration...");
    const doctorData = {
      firstName: "Dr. Sarah",
      lastName: "Johnson",
      email: "dr.sarah" + Date.now() + "@hospital.com",
      password: "Doctor@123",
      userType: "doctor",
      phone: "9876543210",
      specialization: "Cardiology",
      licenseNumber: "DOC" + Date.now(),
      experience: 10,
      qualifications: ["MBBS", "MD"],
    };

    const doctorRegister = await axios.post(
      `${baseURL}/auth/register`,
      doctorData,
    );
    console.log("✅ Doctor Registration Successful!");
    console.log("Doctor ID:", doctorRegister.data.data.user._id);
    console.log(
      "Specialization:",
      doctorRegister.data.data.user.specialization,
    );

    console.log("\n🎉 ALL TESTS PASSED! Your API is working perfectly!");

    return {
      patientEmail: registerResponse.data.data.user.email,
      patientToken: token,
      doctorEmail: doctorRegister.data.data.user.email,
      doctorToken: doctorRegister.data.data.token,
    };
  } catch (error) {
    console.log("❌ Test Failed:");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", error.response.data);
    } else {
      console.log("Error:", error.message);
    }
  }
}

// Run comprehensive tests
testAPIEndpoints().then((result) => {
  if (result) {
    console.log("\n📋 Test Results Summary:");
    console.log("Patient Email:", result.patientEmail);
    console.log("Doctor Email:", result.doctorEmail);
    console.log("Tokens Generated:", result.patientToken ? "✓" : "✗");
  }
});
