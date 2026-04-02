const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { generateTokenPair, generateSecureToken, hashToken, verifyRefreshToken } = require('../../utils/jwtHelper');
const emailService = require('../../services/email.service');
const logger = require('../../utils/logger');

const SALT_ROUNDS = 12;

const register = async ({ firstName, lastName, email, password, phone, companyId }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company || !company.isActive) {
      const err = new Error('Company not found or inactive');
      err.statusCode = 400;
      throw err;
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verifyToken = generateSecureToken();
  const verifyTokenHash = hashToken(verifyToken);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      phone,
      companyId: companyId || null,
      role: companyId ? 'USER' : 'USER',
      emailVerifyToken: verifyTokenHash,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, companyId: true },
  });

  // Send verification email (non-blocking)
  emailService.sendVerificationEmail(user, verifyToken).catch((err) =>
    logger.error('Verification email failed:', err.message)
  );

  return user;
};

const login = async ({ email, password }, res) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      companyId: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
      emailVerified: true,
    },
  });

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account is disabled. Contact support.');
    err.statusCode = 403;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.emailVerified) {
    const err = new Error('Please verify your email address');
    err.statusCode = 403;
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  const { accessToken, refreshToken } = generateTokenPair(user);

  // Store refresh token in DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: hashToken(refreshToken), userId: user.id, expiresAt },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, accessToken };
};

const refreshAccessToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    const err = new Error('Refresh token not found');
    err.statusCode = 401;
    throw err;
  }

  const decoded = verifyRefreshToken(token);
  const tokenHash = hashToken(token);

  const storedToken = await prisma.refreshToken.findUnique({ where: { token: tokenHash } });
  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, companyId: true, isActive: true },
  });

  if (!user || !user.isActive) {
    const err = new Error('User not found');
    err.statusCode = 401;
    throw err;
  }

  // Rotate refresh token
  await prisma.refreshToken.update({ where: { token: tokenHash }, data: { isRevoked: true } });

  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
  await prisma.refreshToken.create({
    data: {
      token: hashToken(newRefreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  return { accessToken };
};

const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { token: hashToken(token) },
      data: { isRevoked: true },
    }).catch(() => {});
  }

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
};

const verifyEmail = async (token) => {
  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: tokenHash,
      emailVerifyExpires: { gt: new Date() },
    },
  });

  if (!user) {
    const err = new Error('Invalid or expired verification token');
    err.statusCode = 400;
    throw err;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
  });
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) return;

  const resetToken = generateSecureToken();
  const resetTokenHash = hashToken(resetToken);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetTokenHash,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  emailService.sendPasswordResetEmail(user, resetToken).catch((err) =>
    logger.error('Password reset email failed:', err.message)
  );
};

const resetPassword = async ({ token, password }) => {
  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    const err = new Error('Invalid or expired reset token');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId: user.id },
    data: { isRevoked: true },
  });
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const match = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!match) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
};
