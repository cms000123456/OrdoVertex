import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@ordovertex.local' }
  });

  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }

  // Create admin user with default password
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ordovertex.local',
      password: hashedPassword,
      name: 'Administrator',
      role: 'admin',
      provider: 'local'
    }
  });

  console.log('✅ Admin user created successfully:');
  console.log(`   Email: admin@ordovertex.local`);
  console.log(`   Password: admin123`);
  console.log(`   Role: ${admin.role}`);
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
