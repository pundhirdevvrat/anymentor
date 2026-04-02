const authService = require('./auth.service');
const ApiResponse = require('../../utils/apiResponse');
const auditLog = require('../../utils/auditLog');

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    await auditLog.log({ userId: user.id, action: 'REGISTER', resource: 'User', resourceId: user.id, req });
    return ApiResponse.created(res, { user }, 'Registration successful. Please check your email to verify your account.');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, accessToken } = await authService.login(req.body, res);
    await auditLog.log({ userId: user.id, companyId: user.companyId, action: 'LOGIN', resource: 'User', resourceId: user.id, req });
    return ApiResponse.success(res, { user, accessToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { accessToken } = await authService.refreshAccessToken(req, res);
    return ApiResponse.success(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req, res);
    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    await authService.verifyEmail(token);
    return ApiResponse.success(res, null, 'Email verified successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    return ApiResponse.success(res, null, 'If an account with that email exists, a password reset link has been sent.');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    return ApiResponse.success(res, null, 'Password reset successfully. Please log in with your new password.');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    await auditLog.log({ userId: req.user.id, action: 'CHANGE_PASSWORD', resource: 'User', resourceId: req.user.id, req });
    return ApiResponse.success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => {
  return ApiResponse.success(res, { user: req.user });
};

module.exports = { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, changePassword, me };
