const express = require('express');
const router = express.Router({ mergeParams: true });
const service = require('./lms.service');
const ApiResponse = require('../../utils/apiResponse');
const { authenticate, requireCompanyAdmin, requireManager, optionalAuth } = require('../../middleware/auth');
const { resolveCompany, enforceCompanyAccess } = require('../../middleware/tenant');
const { upload, setUploadFolder } = require('../../middleware/upload');

// Public: course catalog
router.get('/', resolveCompany, optionalAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user && ['OWNER', 'COMPANY_ADMIN', 'MANAGER'].includes(req.user.role);
    const result = await service.getCourses(req.query, req.companyId, isAdmin);
    return ApiResponse.paginated(res, result.courses, result);
  } catch (err) { next(err); }
});

// Public: single course
router.get('/:id', resolveCompany, optionalAuth, async (req, res, next) => {
  try {
    const course = await service.getCourseById(req.params.id, req.companyId, req.user?.id);
    return ApiResponse.success(res, course);
  } catch (err) { next(err); }
});

// Admin: create course
router.post('/', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const course = await service.createCourse(req.body, req.user.id, req.companyId);
    return ApiResponse.created(res, course);
  } catch (err) { next(err); }
});

// Admin: update course
router.put('/:id', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const course = await service.updateCourse(req.params.id, req.body, req.companyId);
    return ApiResponse.success(res, course, 'Course updated');
  } catch (err) { next(err); }
});

// Admin: upload thumbnail
router.post('/:id/thumbnail', authenticate, resolveCompany, enforceCompanyAccess, requireManager,
  setUploadFolder('thumbnails'), upload.single('thumbnail'), async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, 'No file uploaded');
    const path = `/uploads/thumbnails/${req.file.filename}`;
    const course = await service.updateCourse(req.params.id, { thumbnail: path }, req.companyId);
    return ApiResponse.success(res, { thumbnail: path });
  } catch (err) { next(err); }
});

// Admin: delete course
router.delete('/:id', authenticate, resolveCompany, enforceCompanyAccess, requireCompanyAdmin, async (req, res, next) => {
  try {
    await service.deleteCourse(req.params.id, req.companyId);
    return ApiResponse.success(res, null, 'Course unpublished');
  } catch (err) { next(err); }
});

// Module routes
router.post('/:courseId/modules', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const module = await service.createModule(req.params.courseId, req.body, req.companyId);
    return ApiResponse.created(res, module);
  } catch (err) { next(err); }
});

router.put('/:courseId/modules/:moduleId', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const module = await service.updateModule(req.params.moduleId, req.body, req.companyId);
    return ApiResponse.success(res, module);
  } catch (err) { next(err); }
});

// Lesson routes
router.post('/:courseId/modules/:moduleId/lessons', authenticate, resolveCompany, enforceCompanyAccess, requireManager, async (req, res, next) => {
  try {
    const lesson = await service.createLesson(req.params.moduleId, req.body, req.companyId);
    return ApiResponse.created(res, lesson);
  } catch (err) { next(err); }
});

// Enrollment routes
router.post('/:courseId/enroll', authenticate, resolveCompany, async (req, res, next) => {
  try {
    const enrollment = await service.enrollStudent(req.user.id, req.params.courseId, req.companyId);
    return ApiResponse.created(res, enrollment, 'Enrolled successfully');
  } catch (err) { next(err); }
});

// Progress tracking
router.post('/:courseId/lessons/:lessonId/progress', authenticate, async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const result = await service.updateProgress(req.user.id, req.params.lessonId, req.params.courseId, companyId, req.body);
    return ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

// My enrollments
router.get('/my/enrollments', authenticate, async (req, res, next) => {
  try {
    const result = await service.getMyEnrollments(req.user.id, req.query);
    return ApiResponse.paginated(res, result.enrollments, result);
  } catch (err) { next(err); }
});

module.exports = router;
