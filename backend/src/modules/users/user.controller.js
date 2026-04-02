const userService = require('./user.service');
const ApiResponse = require('../../utils/apiResponse');
const auditLog = require('../../utils/auditLog');

const getAll = async (req, res, next) => {
  try {
    const { users, total, page, limit } = await userService.getAllUsers(req.query, req.user);
    return ApiResponse.paginated(res, users, { page, limit, total });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    return ApiResponse.success(res, user);
  } catch (err) { next(err); }
};

const getProfile = async (req, res) => {
  return ApiResponse.success(res, req.user);
};

const update = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    await auditLog.log({ userId: req.user.id, companyId: req.user.companyId, action: 'UPDATE_USER', resource: 'User', resourceId: req.params.id, req });
    return ApiResponse.success(res, user, 'User updated');
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.id, req.body, req.user);
    return ApiResponse.success(res, user, 'Profile updated');
  } catch (err) { next(err); }
};

const deactivate = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user);
    await auditLog.log({ userId: req.user.id, companyId: req.user.companyId, action: 'DEACTIVATE_USER', resource: 'User', resourceId: req.params.id, req });
    return ApiResponse.success(res, null, 'User deactivated');
  } catch (err) { next(err); }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, 'No file uploaded');
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const result = await userService.updateAvatar(req.user.id, avatarPath);
    return ApiResponse.success(res, result, 'Avatar updated');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getProfile, update, updateProfile, deactivate, uploadAvatar };
