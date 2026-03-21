import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

// Default credentials for fresh installs (development only)
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  // Check if any admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.admin }
  });

  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists, skipping seed');
    return;
  }

  // Check if user with this email exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingUser) {
    // Promote to admin
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: UserRole.admin }
    });
    console.log(`✅ Existing user ${adminEmail} promoted to admin`);
    return;
  }

  // Create new admin user
  const hashedPassword = await hashPassword(adminPassword);
  
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      role: UserRole.admin
    }
  });

  console.log(`✅ Admin user created: ${admin.email}`);
  if (adminEmail === DEFAULT_ADMIN_EMAIL) {
    console.log(`   ⚠️  Using default credentials. Change password after first login!`);
    console.log(`   Email: ${DEFAULT_ADMIN_EMAIL}`);
    console.log(`   Password: ${DEFAULT_ADMIN_PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
