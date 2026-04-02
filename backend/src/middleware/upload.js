const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');

const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm').split(',');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = req.uploadFolder || 'misc';
    const dest = path.join(uploadDir, subfolder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `File type ${file.mimetype} not allowed`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});

const setUploadFolder = (folder) => (req, res, next) => {
  req.uploadFolder = folder;
  next();
};

module.exports = { upload, setUploadFolder };
