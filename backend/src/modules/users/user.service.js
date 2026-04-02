const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { getPaginationParams, getSortParams } = require('../../utils/pagination');

const getAllUsers = async (query, requestingUser) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};

  if (requestingUser.role !== 'OWNER') {
    where.companyId = requestingUser.companyId;
  } else if (query.companyId) {
    where.companyId = query.companyId;
  }

  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        companyId: true, avatar: true, phone: true, isActive: true,
        emailVerified: true, lastLoginAt: true, createdAt: true,
        company: { select: { id: true, name: true, slug: true } },
      },
      orderBy: getSortParams(query, ['firstName', 'email', 'createdAt', 'role']),
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
};

const getUserById = async (id, requestingUser) => {
  const where = { id };
  if (requestingUser.role !== 'OWNER') {
    where.companyId = requestingUser.companyId;
  }

  const user = await prisma.user.findFirst({
    where,
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      companyId: true, avatar: true, phone: true, isActive: true,
      emailVerified: true, lastLoginAt: true, createdAt: true, updatedAt: true,
      company: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
};

const updateUser = async (id, data, requestingUser) => {
  const user = await getUserById(id, requestingUser);

  // Prevent role escalation
  if (data.role) {
    const roleHierarchy = { OWNER: 4, COMPANY_ADMIN: 3, MANAGER: 2, USER: 1 };
    const requestingLevel = roleHierarchy[requestingUser.role] || 0;
    const targetLevel = roleHierarchy[data.role] || 0;
    if (targetLevel >= requestingLevel) {
      const err = new Error('Cannot assign a role equal or higher than your own');
      err.statusCode = 403;
      throw err;
    }
  }

  return prisma.user.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      isActive: data.isActive,
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      companyId: true, isActive: true, updatedAt: true,
    },
  });
};

const deleteUser = async (id, requestingUser) => {
  if (id === requestingUser.id) {
    const err = new Error('Cannot delete your own account');
    err.statusCode = 400;
    throw err;
  }

  await getUserById(id, requestingUser);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
};

const updateAvatar = async (userId, avatarPath) => {
  return prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarPath },
    select: { id: true, avatar: true },
  });
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, updateAvatar };
