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

const resetPassword = async () => {
  await connectDB();

  const admin = await Admin.findOne({ email: 'super@admin.com' });
  if (!admin) {
    console.log('Super Admin not found');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash('superadmin123', salt);

  admin.password = hashedPassword;
  await admin.save();
  console.log('Super Admin password reset successfully to superadmin123');
  process.exit(0);
};

resetPassword();