const prisma = require('../../config/database');
const { getPaginationParams, getSortParams } = require('../../utils/pagination');

// ─── Leads ────────────────────────────────────────────────────

const createLead = async (data, companyId, createdById = null) => {
  return prisma.lead.create({
    data: {
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      designation: data.designation,
      source: data.source,
      status: data.status || 'NEW',
      value: data.value,
      notes: data.notes,
      tags: data.tags || [],
      assignedToId: data.assignedToId,
      createdById,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
    },
  });
};

const getLeads = async (query, companyId) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  if (query.assignedToId) where.assignedToId = query.assignedToId;
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { activities: true, deals: true } },
      },
      orderBy: getSortParams(query, ['firstName', 'createdAt', 'status', 'value']),
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total, page, limit };
};

// Kanban view — leads grouped by status
const getLeadsByPipeline = async (companyId) => {
  const leads = await prisma.lead.findMany({
    where: { companyId },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const pipeline = {
    NEW: [], CONTACTED: [], QUALIFIED: [], PROPOSAL: [],
    NEGOTIATION: [], CLOSED_WON: [], CLOSED_LOST: [],
  };

  leads.forEach((lead) => {
    if (pipeline[lead.status]) pipeline[lead.status].push(lead);
  });

  return pipeline;
};

const getLeadById = async (id, companyId) => {
  const lead = await prisma.lead.findFirst({
    where: { id, companyId },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      contacts: true,
      deals: { include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } } },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      },
    },
  });

  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  return lead;
};

const updateLead = async (id, data, companyId) => {
  await getLeadById(id, companyId);
  return prisma.lead.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      designation: data.designation,
      source: data.source,
      status: data.status,
      value: data.value,
      notes: data.notes,
      tags: data.tags,
      assignedToId: data.assignedToId,
      lastContactedAt: data.status === 'CONTACTED' ? new Date() : undefined,
    },
  });
};

const deleteLead = async (id, companyId) => {
  const lead = await prisma.lead.findFirst({ where: { id, companyId } });
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }
  // Soft delete via status change (preserve history)
  await prisma.lead.update({ where: { id }, data: { status: 'CLOSED_LOST' } });
};

// ─── Activities ───────────────────────────────────────────────

const addActivity = async (leadId, companyId, data, userId) => {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  const activity = await prisma.activity.create({
    data: {
      companyId,
      leadId,
      userId,
      type: data.type,
      description: data.description,
      outcome: data.outcome,
      scheduledAt: data.scheduledAt,
      completedAt: data.completedAt || (data.type !== 'TASK' ? new Date() : null),
      duration: data.duration,
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  // Update last contacted date
  if (['CALL', 'EMAIL', 'MEETING'].includes(data.type)) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: new Date() },
    });
  }

  return activity;
};

const getActivities = async (companyId, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };
  if (query.leadId) where.leadId = query.leadId;
  if (query.type) where.type = query.type;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return { activities, total, page, limit };
};

// ─── Contacts ─────────────────────────────────────────────────

const createContact = async (data, companyId) => {
  return prisma.contact.create({
    data: {
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      designation: data.designation,
      notes: data.notes,
      tags: data.tags || [],
      leadId: data.leadId,
    },
  });
};

const getContacts = async (query, companyId) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.contact.count({ where }),
  ]);

  return { contacts, total, page, limit };
};

// ─── Deals ────────────────────────────────────────────────────

const createDeal = async (data, companyId) => {
  return prisma.deal.create({
    data: {
      companyId,
      leadId: data.leadId,
      title: data.title,
      value: data.value || 0,
      currency: data.currency || 'INR',
      stage: data.stage || 'prospect',
      probability: data.probability || 0,
      expectedCloseDate: data.expectedCloseDate,
      assignedToId: data.assignedToId,
      notes: data.notes,
    },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

const getDeals = async (query, companyId) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (query.stage) where.stage = query.stage;
  if (query.leadId) where.leadId = query.leadId;
  if (query.assignedToId) where.assignedToId = query.assignedToId;

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return { deals, total, page, limit };
};

const updateDeal = async (id, data, companyId) => {
  const deal = await prisma.deal.findFirst({ where: { id, companyId } });
  if (!deal) {
    const err = new Error('Deal not found');
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.deal.update({
    where: { id },
    data: {
      title: data.title,
      value: data.value,
      stage: data.stage,
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate,
      actualCloseDate: data.isWon !== undefined ? new Date() : undefined,
      assignedToId: data.assignedToId,
      notes: data.notes,
      isWon: data.isWon,
    },
  });

  // Sync lead status with deal outcome
  if (data.isWon !== undefined && deal.leadId) {
    await prisma.lead.update({
      where: { id: deal.leadId },
      data: { status: data.isWon ? 'CLOSED_WON' : 'CLOSED_LOST' },
    });
  }

  return updated;
};

// ─── CRM Stats ────────────────────────────────────────────────

const getCrmStats = async (companyId) => {
  const [
    totalLeads, newLeads, wonDeals, pipelineValue,
    conversionRate, activitiesThisWeek,
  ] = await Promise.all([
    prisma.lead.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId, status: 'NEW' } }),
    prisma.deal.count({ where: { companyId, isWon: true } }),
    prisma.deal.aggregate({ where: { companyId, isWon: null }, _sum: { value: true } }),
    prisma.lead.count({ where: { companyId, status: 'CLOSED_WON' } }),
    prisma.activity.count({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const total = totalLeads || 1;
  return {
    totalLeads,
    newLeads,
    wonDeals,
    pipelineValue: pipelineValue._sum.value || 0,
    conversionRate: Math.round((conversionRate / total) * 100),
    activitiesThisWeek,
  };
};

module.exports = {
  createLead, getLeads, getLeadsByPipeline, getLeadById, updateLead, deleteLead,
  addActivity, getActivities,
  createContact, getContacts,
  createDeal, getDeals, updateDeal,
  getCrmStats,
};
