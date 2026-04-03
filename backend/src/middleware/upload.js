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
    // Replicates your uploadSubDir logic
    let folderName = 'sms/general';
    if (req.uploadSubDir) {
      folderName = `sms/${req.uploadSubDir}`;
    }

    return {
      folder: folderName,
      // 'auto' allows Cloudinary to accept both images AND PDFs
      resource_type: 'auto', 
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    };
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB limit
  }
});

// ==========================================
// STORAGE 2: Specific Logo Uploads
// ==========================================
const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sms/logos',
    // Keeps the specific filename logic you had before
    public_id: 'company-logo', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { 
    fileSize: 2 * 1024 * 1024 // 2MB limit for logos
  }
});

module.exports = { upload, logoUpload, cloudinary };