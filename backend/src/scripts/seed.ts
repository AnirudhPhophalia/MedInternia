import dotenv from 'dotenv';
import connectDB from '../utils/database';
import User from '../models/User';
import CaseModel from '../models/Case';
import mongoose from 'mongoose';

dotenv.config();

async function runSeed() {
  await connectDB();

  try {
    // Clear sample data (only for development)
    // WARNING: Do not run in production
    await User.deleteMany({ email: /@mock.local$/ });
    await CaseModel.deleteMany({ title: /Mock Case/ });

    const plainUsers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'dr.john@mock.local',
        password: 'DoctorPass123!',
        userType: 'doctor',
        specialization: 'Cardiology',
        licenseNumber: 'MD-MOCK-001'
      },
      {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'intern.alice@mock.local',
        password: 'InternPass123!',
        userType: 'intern',
        medicalSchool: 'Mock Medical School',
        yearOfStudy: 3
      },
      {
        firstName: 'Bob',
        lastName: 'Patient',
        email: 'bob.patient@mock.local',
        password: 'PatientPass123!',
        userType: 'patient',
        emergencyContact: { name: 'Alice', phone: '9999999999', relationship: 'Friend' }
      }
    ];

    const createdUsers = [] as any[];
    for (const u of plainUsers) {
      const created = await User.create(u as any);
      createdUsers.push({ doc: created, plainPassword: (u as any).password });
    }

    // Use the first user (doctor) as case author
    const doctor = createdUsers.find(c => c.doc.userType === 'doctor')?.doc;

    const cases = [
      {
        title: 'Mock Case: Acute Chest Pain',
        description: 'A 54-year-old male presents with sudden onset chest pain...',
        symptoms: ['chest pain', 'shortness of breath'],
        patientInfo: { age: 54, gender: 'male', medicalHistory: ['hypertension'] },
        tags: ['cardiology', 'emergency'],
        difficulty: 'intermediate',
        specialization: 'Cardiology',
        doctor: doctor?._id
      },
      {
        title: 'Mock Case: Abdominal Pain',
        description: 'Young female with lower abdominal pain and fever...',
        symptoms: ['abdominal pain', 'fever'],
        patientInfo: { age: 23, gender: 'female' },
        tags: ['general', 'surgery'],
        difficulty: 'beginner',
        specialization: 'General Surgery',
        doctor: doctor?._id
      },
      {
        title: 'Mock Case: Headache and Visual Disturbance',
        description: 'Middle-aged patient with severe headache and blurred vision...',
        symptoms: ['headache', 'blurred vision'],
        patientInfo: { age: 45, gender: 'female' },
        tags: ['neurology'],
        difficulty: 'advanced',
        specialization: 'Neurology',
        doctor: doctor?._id
      }
    ];

    const createdCases = [] as any[];
    for (const c of cases) {
      const created = await CaseModel.create(c as any);
      createdCases.push(created);
    }

    console.log('\nSeed complete — created mock users and cases:\n');
    for (const cu of createdUsers) {
      console.log(`User: ${cu.doc.email}  id=${cu.doc._id}  password=${cu.plainPassword}`);
    }

    console.log('\nCreated case IDs:');
    for (const cc of createdCases) {
      console.log(`Case: ${cc.title}  id=${cc._id}`);
    }

    console.log('\nNotes: passwords above are the plain-text values for testing only.');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

runSeed();
