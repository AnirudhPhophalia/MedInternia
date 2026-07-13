const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Since mongoose models inside ts files cannot be required easily without ts-node,
// we will connect directly using mongodb native client or define a temporary mongoose model.
async function seedUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/healthcare_db');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Check if test doctor exists
    const doctor = await db.collection('users').findOne({ email: 'test.doctor@example.com' });
    if (!doctor) {
      await db.collection('users').insertOne({
        firstName: 'Test',
        lastName: 'Doctor',
        email: 'test.doctor@example.com',
        password: hashedPassword,
        userType: 'doctor',
        specialization: 'Cardiology',
        licenseNumber: 'DOC12345',
        points: 0,
        totalRatings: 0,
        averageRating: 0,
        profileScore: 0,
        badges: [],
        credits: 0,
        streak: 0,
        longestStreak: 0,
        casesAnalyzed: 0,
        upvotesReceived: 0,
        peerReviewsGiven: 0,
        peerReviewsReceived: 0,
        certificatesEarned: 0,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created test.doctor@example.com');
    } else {
      console.log('test.doctor@example.com already exists');
    }

    // Check if test patient exists
    const patient = await db.collection('users').findOne({ email: 'test.patient@example.com' });
    if (!patient) {
      await db.collection('users').insertOne({
        firstName: 'Test',
        lastName: 'Patient',
        email: 'test.patient@example.com',
        password: hashedPassword,
        userType: 'patient',
        points: 0,
        totalRatings: 0,
        averageRating: 0,
        profileScore: 0,
        badges: [],
        credits: 0,
        streak: 0,
        longestStreak: 0,
        casesAnalyzed: 0,
        upvotesReceived: 0,
        peerReviewsGiven: 0,
        peerReviewsReceived: 0,
        certificatesEarned: 0,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created test.patient@example.com');
    } else {
      console.log('test.patient@example.com already exists');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

seedUsers();
