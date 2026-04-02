const prisma = require('../../config/database');
const { getPaginationParams } = require('../../utils/pagination');
const emailService = require('../../services/email.service');
const { createUniqueSlug } = require('../../utils/slugify');

// ─── Tickets ──────────────────────────────────────────────────

const createTicket = async (data, userId, companyId) => {
  return prisma.ticket.create({
    data: {
      companyId,
      userId,
      subject: data.subject,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      category: data.category,
      tags: data.tags || [],
      messages: {
        create: {
          message: data.description,
          userId,
          companyId,
        },
      },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      messages: true,
    },
  });
};

const getTickets = async (query, companyId, userId = null, isAgent = false) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (!isAgent) where.userId = userId;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assignedToId) where.assignedToId = query.assignedToId;
  if (query.search) {
    where.OR = [
      { subject: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return { tickets, total, page, limit };
};

const getTicketById = async (id, companyId, userId = null, isAgent = false) => {
  const where = { id, companyId };
  if (!isAgent && userId) where.userId = userId;

  const ticket = await prisma.ticket.findFirst({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        where: isAgent ? {} : { isInternal: false },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  return ticket;
};

const addMessage = async (ticketId, companyId, userId, data, isAgent = false) => {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, companyId } });
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      companyId,
      userId,
      message: data.message,
      isInternal: isAgent ? (data.isInternal || false) : false,
      attachments: data.attachments || [],
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
  });

  // Update ticket status
  const newStatus = isAgent && !data.isInternal ? 'IN_PROGRESS' : ticket.status;
  if (!isAgent) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'WAITING_FOR_CUSTOMER' !== ticket.status ? ticket.status : 'IN_PROGRESS' },
    });
  }

  // Send email notification (non-blocking)
  if (isAgent && !data.isInternal) {
    const user = await prisma.user.findUnique({ where: { id: ticket.userId } });
    if (user) emailService.sendTicketReplyEmail(user, ticket, data.message).catch(() => {});
  }

  return message;
};

const updateTicketStatus = async (id, companyId, data) => {
  const update = {
    status: data.status,
    assignedToId: data.assignedToId,
    priority: data.priority,
  };

  if (data.status === 'RESOLVED') update.resolvedAt = new Date();
  if (data.status === 'CLOSED') update.closedAt = new Date();

  return prisma.ticket.update({ where: { id }, data: update });
};

const getTicketStats = async (companyId) => {
  const [open, inProgress, resolved, urgent, avgResponseTime] = await Promise.all([
    prisma.ticket.count({ where: { companyId, status: 'OPEN' } }),
    prisma.ticket.count({ where: { companyId, status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { companyId, status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { companyId, priority: 'URGENT', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    Promise.resolve(null), // complex aggregation - skip for now
  ]);

  return { open, inProgress, resolved, urgent };
};

// ─── Knowledge Base ───────────────────────────────────────────

const createArticle = async (data, companyId, authorId) => {
  const slug = await createUniqueSlug(data.title, prisma.knowledgeBase, 'slug', { companyId });
  return prisma.knowledgeBase.create({
    data: {
      companyId,
      title: data.title,
      slug,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      isPublished: data.isPublished || false,
    },
  });
};

const getArticles = async (query, companyId, isAdmin = false) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { companyId };

  if (!isAdmin) where.isPublished = true;
  if (query.category) where.category = query.category;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { content: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.knowledgeBase.findMany({ where, orderBy: { views: 'desc' }, skip, take: limit }),
    prisma.knowledgeBase.count({ where }),
  ]);

  return { articles, total, page, limit };
};

const getArticleBySlug = async (slug, companyId, isAdmin = false) => {
  const where = { slug, companyId };
  if (!isAdmin) where.isPublished = true;

  const article = await prisma.knowledgeBase.findFirst({ where });
  if (!article) {
    const err = new Error('Article not found');
    err.statusCode = 404;
    throw err;
  }

  // Increment view count
  await prisma.knowledgeBase.update({ where: { id: article.id }, data: { views: { increment: 1 } } });

  return article;
};

const markHelpful = async (id, companyId, helpful) => {
  return prisma.knowledgeBase.update({
    where: { id },
    data: helpful ? { helpful: { increment: 1 } } : { notHelpful: { increment: 1 } },
  });
};

module.exports = {
  createTicket, getTickets, getTicketById, addMessage, updateTicketStatus, getTicketStats,
  createArticle, getArticles, getArticleBySlug, markHelpful,
};
