const express = require('express');
const router = express.Router();
const controller = require('./user.controller');
const { authenticate, requireOwner, requireCompanyAdmin } = require('../../middleware/auth');
const { upload, setUploadFolder } = require('../../middleware/upload');

router.use(authenticate);

router.get('/', requireCompanyAdmin, controller.getAll);
router.get('/profile', controller.getProfile);
router.put('/profile', controller.updateProfile);
router.post('/profile/avatar', setUploadFolder('avatars'), upload.single('avatar'), controller.uploadAvatar);
router.get('/:id', requireCompanyAdmin, controller.getById);
router.put('/:id', requireCompanyAdmin, controller.update);
router.delete('/:id', requireCompanyAdmin, controller.deactivate);

module.exports = router;
