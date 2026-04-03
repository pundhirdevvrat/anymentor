require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Plans ────────────────────────────────────────────────────
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { name: 'FREE' },
      update: {},
      create: {
        name: 'FREE',
        displayName: 'Free',
        description: 'Perfect for getting started',
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: 'INR',
        maxUsers: 5,
        maxCourses: 3,
        maxProducts: 10,
        maxStorageGb: 1,
        features: ['Basic LMS', 'Basic E-commerce', 'Email support'],
      },
    }),
    prisma.plan.upsert({
      where: { name: 'STARTER' },
      update: {},
      create: {
        name: 'STARTER',
        displayName: 'Starter',
        description: 'For growing businesses',
        monthlyPrice: 1999,
        yearlyPrice: 19999,
        currency: 'INR',
        maxUsers: 25,
        maxCourses: 20,
        maxProducts: 100,
        maxStorageGb: 10,
        hasCustomDomain: true,
        hasAnalytics: true,
        features: ['All Free features', 'Custom domain', 'Analytics', 'Priority email support'],
      },
    }),
    prisma.plan.upsert({
      where: { name: 'PRO' },
      update: {},
      create: {
        name: 'PRO',
        displayName: 'Pro',
        description: 'For professional teams',
        monthlyPrice: 4999,
        yearlyPrice: 49999,
        currency: 'INR',
        maxUsers: 100,
        maxCourses: -1,
        maxProducts: -1,
        maxStorageGb: 50,
        hasCustomDomain: true,
        hasAnalytics: true,
        hasApiAccess: true,
        hasPrioritySupport: true,
        features: ['All Starter features', 'Unlimited courses', 'Unlimited products', 'API access', 'Priority support', 'White-label'],
      },
    }),
    prisma.plan.upsert({
      where: { name: 'ENTERPRISE' },
      update: {},
      create: {
        name: 'ENTERPRISE',
        displayName: 'Enterprise',
        description: 'For large organizations',
        monthlyPrice: 14999,
        yearlyPrice: 149999,
        currency: 'INR',
        maxUsers: -1,
        maxCourses: -1,
        maxProducts: -1,
        maxStorageGb: -1,
        hasCustomDomain: true,
        hasAnalytics: true,
        hasApiAccess: true,
        hasPrioritySupport: true,
        features: ['All Pro features', 'Unlimited users', 'Unlimited storage', 'Dedicated support', 'SLA guarantee', 'Custom integrations'],
      },
    }),
  ]);

  console.log(`✅ Created ${plans.length} plans`);

  // ─── Platform Owner ───────────────────────────────────────────
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@anymentor.com';
  const ownerPassword = process.env.OWNER_PASSWORD || 'SuperSecureOwnerPass123!';

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      role: 'OWNER',
      firstName: process.env.OWNER_FIRST_NAME || 'Platform',
      lastName: process.env.OWNER_LAST_NAME || 'Owner',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Owner account: ${owner.email}`);

  // ─── Demo Company ─────────────────────────────────────────────
  const demoSlug = process.env.COMPANY_SLUG || 'demo-academy';
  const freePlan = plans.find(p => p.name === 'FREE');

  let demoCompany = await prisma.company.findUnique({ where: { slug: demoSlug } });

  if (!demoCompany) {
    demoCompany = await prisma.company.create({
      data: {
        name: process.env.COMPANY_NAME || 'Demo Academy',
        slug: demoSlug,
        description: 'A demo company showcasing all AnyMentor features',
        ownerId: owner.id,
        primaryColor: '#1a3c6e',
        secondaryColor: '#d4a017',
        accentColor: '#800020',
        bgColor: '#f5f0e8',
        phone: '+91-9999000000',
        email: 'info@demoacademy.com',
        hasLms: true,
        hasEcommerce: true,
        hasCrm: true,
        hasAnalytics: true,
        hasSupport: true,
      },
    });

    // Create subscription for demo company
    await prisma.subscription.create({
      data: {
        companyId: demoCompany.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`✅ Demo company: ${demoCompany.name} (/${demoCompany.slug})`);

  // ─── Demo Company Admin ───────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@demoacademy.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const demoAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'COMPANY_ADMIN',
      firstName: 'Demo',
      lastName: 'Admin',
      companyId: demoCompany.id,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Demo admin: ${demoAdmin.email}`);

  // ─── Demo Course ──────────────────────────────────────────────
  let demoCourse = await prisma.course.findFirst({ where: { companyId: demoCompany.id } });

  if (!demoCourse) {
    demoCourse = await prisma.course.create({
      data: {
        companyId: demoCompany.id,
        title: 'Introduction to Web Development',
        slug: 'intro-web-development',
        description: 'Learn the fundamentals of web development from scratch. Covers HTML, CSS, JavaScript.',
        instructorId: demoAdmin.id,
        price: 999,
        isFree: false,
        category: 'Technology',
        level: 'BEGINNER',
        language: 'Hindi',
        isPublished: true,
        certificate: true,
        whatYouLearn: ['HTML & CSS basics', 'JavaScript fundamentals', 'Build real projects'],
        requirements: ['Basic computer skills', 'No programming experience needed'],
      },
    });

    // Add a module and lesson
    const module1 = await prisma.courseModule.create({
      data: {
        courseId: demoCourse.id,
        companyId: demoCompany.id,
        title: 'Getting Started',
        order: 1,
        isPublished: true,
      },
    });

    await prisma.lesson.create({
      data: {
        moduleId: module1.id,
        courseId: demoCourse.id,
        companyId: demoCompany.id,
        title: 'Course Introduction',
        type: 'VIDEO',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        duration: 300,
        order: 1,
        isPublished: true,
        isFreePreview: true,
      },
    });

    await prisma.course.update({
      where: { id: demoCourse.id },
      data: { totalLessons: 1, totalDuration: 300 },
    });
  }

  console.log(`✅ Demo course: ${demoCourse.title}`);

  // ─── Demo Product ─────────────────────────────────────────────
  let demoCategory = await prisma.category.findFirst({ where: { companyId: demoCompany.id } });

  if (!demoCategory) {
    demoCategory = await prisma.category.create({
      data: {
        companyId: demoCompany.id,
        name: 'Study Materials',
        slug: 'study-materials',
      },
    });
  }

  const demoProduct = await prisma.product.findFirst({ where: { companyId: demoCompany.id } });
  if (!demoProduct) {
    await prisma.product.create({
      data: {
        companyId: demoCompany.id,
        name: 'Web Dev Handbook',
        slug: 'web-dev-handbook',
        description: 'Comprehensive guide to modern web development',
        sku: 'BOOK-001',
        price: 299,
        categoryId: demoCategory.id,
        stock: 100,
        isDigital: true,
        isActive: true,
      },
    });
  }

  console.log('✅ Demo product created');

  // ─── Demo Lead ────────────────────────────────────────────────
  const demoLead = await prisma.lead.findFirst({ where: { companyId: demoCompany.id } });
  if (!demoLead) {
    await prisma.lead.create({
      data: {
        companyId: demoCompany.id,
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul@example.com',
        phone: '+91-9876543210',
        source: 'Website',
        status: 'NEW',
        assignedToId: demoAdmin.id,
        createdById: demoAdmin.id,
        value: 5000,
        notes: 'Interested in Web Development course',
      },
    });
  }

  console.log('✅ Demo lead created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log(`   Platform Owner: ${ownerEmail} / ${ownerPassword}`);
  console.log(`   Company Admin:  ${adminEmail} / AdminPass123!`);
  console.log(`\n🌐 Demo portal: /companies/${demoSlug}`);
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed failed:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
