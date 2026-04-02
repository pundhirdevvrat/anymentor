const express = require('express');
const router = express.Router();
const controller = require('./company.controller');
const { authenticate, requireOwner, requireCompanyAdmin } = require('../../middleware/auth');
const { upload, setUploadFolder } = require('../../middleware/upload');

// Public route — get company info by slug for portal
router.get('/slug/:slug', controller.getBySlug);

// All below require authentication
router.use(authenticate);

router.post('/', requireOwner, controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', requireCompanyAdmin, controller.update);
router.put('/:id/branding', requireCompanyAdmin, controller.updateBranding);
router.put('/:id/features', requireOwner, controller.updateFeatures);
router.post('/:id/logo', requireCompanyAdmin, setUploadFolder('logos'), upload.single('logo'), controller.uploadLogo);
router.delete('/:id', requireOwner, controller.remove);

module.exports = router;
