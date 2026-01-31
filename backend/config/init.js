/**
 * Database Initialization
 * Creates demo users with hashed passwords
 */

const bcrypt = require('bcryptjs');
const { User, AuditLog, SystemEvent } = require('../models');

const DEMO_USERS = [
  {
    name: 'System Administrator',
    email: 'admin@kavach.in',
    password: 'Kavach@123',
    role: 'ADMIN',
    department: 'IT Administration'
  },
  {
    name: 'Demo User',
    email: 'user@kavach.in',
    password: 'User@123',
    role: 'USER',
    department: 'Operations'
  }
];

async function initializeDatabase() {
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

    for (const userData of DEMO_USERS) {
      // Check if user exists
      const existingUser = await User.findOne({ email: userData.email });

      if (!existingUser) {
        // Create new user
        const hashedPassword = await bcrypt.hash(userData.password, rounds);
        await User.create({
          name: userData.name,
          email: userData.email,
          password_hash: hashedPassword,
          role: userData.role,
          status: 'ACTIVE',
          department: userData.department
        });
        console.log(`  Created user: ${userData.email}`);
      } else {
        console.log(`  User exists: ${userData.email}`);
      }
    }

    // Log system initialization
    await AuditLog.create({
      action: 'SYSTEM_INIT',
      category: 'SYSTEM',
      description: 'Server started and database initialized',
      ip_address: '127.0.0.1'
    });

    // Create sample events if none exist
    const eventCount = await SystemEvent.countDocuments();
    if (eventCount === 0) {
      await SystemEvent.insertMany([
        {
          event_type: 'SYSTEM_STARTUP',
          severity: 'INFO',
          source: 'Server',
          description: 'KAVACH-INFINITY system started successfully',
          status: 'ACTIVE'
        },
        {
          event_type: 'SECURITY_SCAN',
          severity: 'INFO',
          source: 'Security Module',
          description: 'Automated security scan completed',
          status: 'RESOLVED',
          resolved_at: new Date()
        }
      ]);
      console.log('  Created sample events');
    }

  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

module.exports = { initializeDatabase };
