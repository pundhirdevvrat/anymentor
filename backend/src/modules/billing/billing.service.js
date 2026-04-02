const prisma = require('../../config/database');
const paymentService = require('../../services/payment.service');
const logger = require('../../utils/logger');

const getPlans = async () => {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: 'asc' },
  });
};

const getSubscription = async (companyId) => {
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });

  if (!sub) {
    const err = new Error('No subscription found');
    err.statusCode = 404;
    throw err;
  }

  return sub;
};

const createSubscription = async (companyId, planId, billingCycle = 'MONTHLY', gateway = 'RAZORPAY') => {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    const err = new Error('Plan not found');
    err.statusCode = 404;
    throw err;
  }

  const amount = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
  const periodEnd = new Date();
  billingCycle === 'YEARLY'
    ? periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    : periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (amount > 0) {
    const paymentOrder = await paymentService.createPaymentOrder(gateway, {
      amount,
      currency: plan.currency || 'INR',
      receipt: `sub_${companyId.slice(-8)}`,
      notes: { companyId, planId, billingCycle },
    });

    await prisma.subscription.upsert({
      where: { companyId },
      create: {
        companyId, planId,
        status: 'PAST_DUE', // Will be activated on payment webhook
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        paymentGateway: gateway,
      },
      update: {
        planId, billingCycle,
        status: 'PAST_DUE',
        paymentGateway: gateway,
      },
    });

    return { paymentRequired: true, paymentOrder, plan };
  }

  // Free plan
  await prisma.subscription.upsert({
    where: { companyId },
    create: {
      companyId, planId,
      status: 'ACTIVE',
      billingCycle,
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
    update: {
      planId, billingCycle, status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  });

  return { paymentRequired: false, plan };
};

const activateSubscription = async (companyId, paymentData) => {
  await prisma.subscription.update({
    where: { companyId },
    data: {
      status: 'ACTIVE',
      externalSubscriptionId: paymentData.subscriptionId,
    },
  });

  logger.info(`Subscription activated for company: ${companyId}`);
};

const cancelSubscription = async (companyId, immediately = false) => {
  if (immediately) {
    await prisma.subscription.update({
      where: { companyId },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
  } else {
    await prisma.subscription.update({
      where: { companyId },
      data: { cancelAtPeriodEnd: true },
    });
  }
};

const getInvoices = async (companyId) => {
  return prisma.payment.findMany({
    where: { companyId, status: 'PAID' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

const checkPlanLimit = async (companyId, resource) => {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true },
  });

  if (!subscription) return { allowed: true };
  const plan = subscription.plan;

  const limits = {
    users: plan.maxUsers,
    courses: plan.maxCourses,
    products: plan.maxProducts,
  };

  const counts = {
    users: () => prisma.user.count({ where: { companyId, isActive: true } }),
    courses: () => prisma.course.count({ where: { companyId } }),
    products: () => prisma.product.count({ where: { companyId, isActive: true } }),
  };

  const limit = limits[resource];
  if (!limit || limit === -1) return { allowed: true };

  const current = await counts[resource]?.();
  if (current === undefined) return { allowed: true };

  return {
    allowed: current < limit,
    current,
    limit,
    resource,
  };
};

module.exports = { getPlans, getSubscription, createSubscription, activateSubscription, cancelSubscription, getInvoices, checkPlanLimit };
