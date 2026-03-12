import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.review.deleteMany({});
  await prisma.bid.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.projectAssignment.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.transactionLog.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.user.deleteMany({});

  // Create test users
  const gc1 = await prisma.user.create({
    data: {
      id: 'user_gc_001',
      email: 'john@aceconstruction.com',
      firstName: 'John',
      lastName: 'Smith',
      companyName: 'Ace Construction',
      role: 'GC',
      phone: '415-555-0001',
      kycTier: 'TIER_3',
      kycStatus: 'APPROVED',
      emailVerified: true,
      rating: new Decimal('4.8'),
      totalReviews: 47,
      wallet: {
        create: {
          usdBalance: new Decimal('250000'),
          usdcBalance: new Decimal('50000'),
          kycTierLimit: new Decimal('1000000'),
        },
      },
    },
  });

  const gc2 = await prisma.user.create({
    data: {
      id: 'user_gc_002',
      email: 'maria@buildpro.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      companyName: 'BuildPro Services',
      role: 'GC',
      phone: '415-555-0002',
      kycTier: 'TIER_3',
      kycStatus: 'APPROVED',
      emailVerified: true,
      rating: new Decimal('4.6'),
      totalReviews: 32,
      wallet: {
        create: {
          usdBalance: new Decimal('180000'),
          usdcBalance: new Decimal('30000'),
          kycTierLimit: new Decimal('1000000'),
        },
      },
    },
  });

  const worker1 = await prisma.user.create({
    data: {
      id: 'user_worker_001',
      email: 'mike@electrician.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'WORKER',
      phone: '415-555-1001',
      kycTier: 'TIER_2',
      kycStatus: 'APPROVED',
      emailVerified: true,
      rating: new Decimal('4.9'),
      totalReviews: 156,
      wallet: {
        create: {
          usdBalance: new Decimal('12450'),
          usdcBalance: new Decimal('0'),
          kycTierLimit: new Decimal('50000'),
        },
      },
    },
  });

  const worker2 = await prisma.user.create({
    data: {
      id: 'user_worker_002',
      email: 'sarah@plumbing.com',
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: 'WORKER',
      phone: '415-555-1002',
      kycTier: 'TIER_2',
      kycStatus: 'APPROVED',
      emailVerified: true,
      rating: new Decimal('4.7'),
      totalReviews: 98,
      wallet: {
        create: {
          usdBalance: new Decimal('8900'),
          usdcBalance: new Decimal('0'),
          kycTierLimit: new Decimal('50000'),
        },
      },
    },
  });

  const sub1 = await prisma.user.create({
    data: {
      id: 'user_sub_001',
      email: 'robert@framingexperts.com',
      firstName: 'Robert',
      lastName: 'Davis',
      companyName: 'Framing Experts LLC',
      role: 'SUBCONTRACTOR',
      phone: '415-555-2001',
      kycTier: 'TIER_3',
      kycStatus: 'APPROVED',
      emailVerified: true,
      rating: new Decimal('4.5'),
      totalReviews: 67,
      wallet: {
        create: {
          usdBalance: new Decimal('45000'),
          usdcBalance: new Decimal('10000'),
          kycTierLimit: new Decimal('500000'),
        },
      },
    },
  });

  console.log('✓ Created 5 test users');

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      id: 'proj_001',
      gcId: gc1.id,
      title: 'Downtown Office Complex - Phase 2',
      description: 'Commercial office renovation with HVAC upgrade',
      budget: new Decimal('1200000'),
      scope: 'Complete office renovation including plumbing, electrical, painting',
      location: 'Downtown San Francisco',
      address: '555 Market St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      projectType: 'COMMERCIAL',
      status: 'ACTIVE',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-09-01'),
      estimatedDurationDays: 184,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      id: 'proj_002',
      gcId: gc2.id,
      title: 'Residential Development - Westside',
      description: 'Multi-unit residential complex construction',
      budget: new Decimal('850000'),
      scope: 'Foundation, framing, finish carpentry, electrical, plumbing',
      location: 'Westside',
      address: '1200 Valencia St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      projectType: 'RESIDENTIAL',
      status: 'ACTIVE',
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-08-15'),
      estimatedDurationDays: 182,
    },
  });

  console.log('✓ Created 2 test projects');

  // Create milestones
  await prisma.milestone.create({
    data: {
      projectId: project1.id,
      title: 'Foundation & Framing',
      description: 'Complete foundation work and steel framing',
      amount: new Decimal('300000'),
      percentage: new Decimal('25'),
      status: 'COMPLETED',
      dueDate: new Date('2026-04-15'),
      completedAt: new Date('2026-04-10'),
      order: 1,
      deliverables: JSON.stringify([
        'Foundation inspection passed',
        'Steel framing erected',
        'Building envelope sealed',
      ]),
    },
  });

  await prisma.milestone.create({
    data: {
      projectId: project1.id,
      title: 'MEP Systems',
      description: 'Mechanical, electrical, plumbing installation',
      amount: new Decimal('400000'),
      percentage: new Decimal('33'),
      status: 'IN_PROGRESS',
      dueDate: new Date('2026-06-30'),
      order: 2,
      deliverables: JSON.stringify([
        'Electrical rough-in complete',
        'Plumbing stubbed out',
        'HVAC equipment installed',
      ]),
    },
  });

  await prisma.milestone.create({
    data: {
      projectId: project1.id,
      title: 'Final Finish & Inspection',
      description: 'Drywall, paint, fixtures, final inspections',
      amount: new Decimal('500000'),
      percentage: new Decimal('42'),
      status: 'PENDING',
      dueDate: new Date('2026-08-30'),
      order: 3,
      deliverables: JSON.stringify(['Drywall complete', 'Paint complete', 'Inspections passed']),
    },
  });

  console.log('✓ Created 3 milestones');

  // Create jobs
  const job1 = await prisma.job.create({
    data: {
      id: 'job_001',
      createdById: gc1.id,
      title: 'Electrical Work - Residential',
      description: 'Full electrical installation for residential project',
      category: 'ELECTRICAL',
      requiredSkills: JSON.stringify(['electrical_work', 'code_compliance', 'inspection']),
      hourlyRate: new Decimal('7500'),
      duration: '8 weeks, full-time',
      location: 'San Francisco, CA',
      geoLat: 37.7749,
      geoLng: -122.4194,
      openPositions: 2,
      status: 'OPEN',
    },
  });

  const job2 = await prisma.job.create({
    data: {
      id: 'job_002',
      createdById: gc1.id,
      title: 'Concrete Finishing - Urgent',
      description: 'Concrete finishing work needed for foundation project',
      category: 'CONCRETE',
      requiredSkills: JSON.stringify(['concrete_finishing', 'quality_control']),
      totalBudget: new Decimal('300000'),
      duration: '3 days',
      location: 'Oakland, CA',
      geoLat: 37.8044,
      geoLng: -122.2712,
      openPositions: 2,
      status: 'OPEN',
    },
  });

  console.log('✓ Created 2 jobs');

  // Create bids
  await prisma.bid.create({
    data: {
      id: 'bid_001',
      jobId: job1.id,
      bidderId: worker1.id,
      amount: new Decimal('7500'),
      proposal: 'I have 8+ years of electrical work experience with master electrician certification.',
      expectedDuration: '8 weeks starting next week',
      status: 'SUBMITTED',
      aiScore: new Decimal('92'),
    },
  });

  await prisma.bid.create({
    data: {
      id: 'bid_002',
      jobId: job1.id,
      bidderId: sub1.id,
      amount: new Decimal('7200'),
      proposal: 'Expert framing and electrical crew, 100+ commercial projects completed.',
      expectedDuration: '6 weeks optimal timeline',
      status: 'SUBMITTED',
      aiScore: new Decimal('88'),
    },
  });

  console.log('✓ Created 2 bids');

  // Create payments
  await prisma.payment.create({
    data: {
      senderId: gc1.id,
      recipientId: sub1.id,
      projectId: project1.id,
      milestoneId: (
        await prisma.milestone.findFirst({ where: { projectId: project1.id } })
      ).id,
      amount: new Decimal('300000'),
      method: 'INTERNAL_LEDGER',
      status: 'COMPLETED',
      completedAt: new Date('2026-04-11'),
    },
  });

  console.log('✓ Created 1 payment');

  // Create reviews
  await prisma.review.create({
    data: {
      reviewerId: gc1.id,
      revieweeId: sub1.id,
      jobId: null,
      rating: 5,
      comment: 'Excellent work quality and on-time delivery. Highly recommended!',
    },
  });

  console.log('✓ Created 1 review');

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
