const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: '.env' });

const Admin = require('../models/Admin');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  await connectDB();

  const existingAdmin = await Admin.findOne({ email: 'super@admin.com' });
  if (existingAdmin) {
    console.log('Super Admin already exists');
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash('superpassword123', salt);

  const admin = new Admin({
    name: 'Super Admin',
    email: 'super@admin.com',
    password: hashedPassword,
    role: 'super_admin',
    isActive: true
  });

  await admin.save();
  console.log('Super Admin created successfully');
  process.exit(0);
};

seedAdmin();