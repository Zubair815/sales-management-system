const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 1. Configure Cloudinary securely using Environment Variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==========================================
// STORAGE 1: General Uploads (Expenses, etc.)
// ==========================================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = 'sms/general';
    if (req.uploadSubDir) {
      folderName = `sms/${req.uploadSubDir}`;
    }

    return {
      folder: folderName,
      resource_type: 'auto', 
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    };
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, 
  }
});

// ==========================================
// STORAGE 2: Specific Logo Uploads
// ==========================================
const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sms/logos',
    // --- FIX: This MUST be a function, not a string ---
    public_id: (req, file) => 'company-logo', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { 
    fileSize: 2 * 1024 * 1024 
  }
});

module.exports = { upload, logoUpload, cloudinary };