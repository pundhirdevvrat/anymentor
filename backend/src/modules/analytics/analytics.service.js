const prisma = require('../../config/database');

const getOverview = async (companyId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalUsers, newUsersThisMonth, newUsersLastMonth,
    totalCourses, publishedCourses, totalEnrollments, enrollmentsThisMonth,
    totalProducts, totalOrders, ordersThisMonth,
    revenueThisMonth, revenueLastMonth,
    totalLeads, newLeadsThisMonth,
    openTickets,
  ] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId, createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { companyId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.course.count({ where: { companyId } }),
    prisma.course.count({ where: { companyId, isPublished: true } }),
    prisma.enrollment.count({ where: { companyId } }),
    prisma.enrollment.count({ where: { companyId, enrolledAt: { gte: startOfMonth } } }),
    prisma.product.count({ where: { companyId, isActive: true } }),
    prisma.order.count({ where: { companyId } }),
    prisma.order.count({ where: { companyId, createdAt: { gte: startOfMonth } } }),
    prisma.payment.aggregate({
      where: { companyId, status: 'PAID', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { companyId, status: 'PAID', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),
    prisma.lead.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId, createdAt: { gte: startOfMonth } } }),
    prisma.ticket.count({ where: { companyId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
  ]);

  const thisMonthRevenue = revenueThisMonth._sum.amount || 0;
  const lastMonthRevenue = revenueLastMonth._sum.amount || 0;
  const revenueGrowth = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;

  const userGrowth = newUsersLastMonth > 0
    ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
    : 0;

  return {
    revenue: { thisMonth: thisMonthRevenue, lastMonth: lastMonthRevenue, growth: revenueGrowth },
    users: { total: totalUsers, newThisMonth: newUsersThisMonth, growth: userGrowth },
    lms: { totalCourses, publishedCourses, totalEnrollments, enrollmentsThisMonth },
    ecommerce: { totalProducts, totalOrders, ordersThisMonth },
    crm: { totalLeads, newThisMonth: newLeadsThisMonth },
    support: { openTickets },
  };
};

const getRevenueChart = async (companyId, months = 6) => {
  const data = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const label = start.toLocaleString('default', { month: 'short', year: '2-digit' });

    const result = await prisma.payment.aggregate({
      where: { companyId, status: 'PAID', createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    });

    data.push({ label, revenue: result._sum.amount || 0, orders: result._count });
  }

  return data;
};

const getCoursePerformance = async (companyId) => {
  return prisma.course.findMany({
    where: { companyId, isPublished: true },
    select: {
      id: true, title: true, totalStudents: true, rating: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { totalStudents: 'desc' },
    take: 10,
  });
};

const getLeadConversion = async (companyId) => {
  const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
  const counts = await Promise.all(
    statuses.map(status => prisma.lead.count({ where: { companyId, status } }))
  );

  return statuses.map((status, i) => ({ status, count: counts[i] }));
};

const getOwnerOverview = async () => {
  const [
    totalCompanies, activeCompanies,
    totalUsers, totalRevenue,
    companiesByPlan,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.subscription.groupBy({ by: ['planId'], _count: { id: true } }),
  ]);

  const recentCompanies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { subscription: { include: { plan: { select: { name: true } } } } },
    select: { id: true, name: true, slug: true, createdAt: true, isActive: true },
  });

  return {
    totalCompanies,
    activeCompanies,
    totalUsers,
    totalRevenue: totalRevenue._sum.amount || 0,
    recentCompanies,
  };
};

module.exports = { getOverview, getRevenueChart, getCoursePerformance, getLeadConversion, getOwnerOverview };
