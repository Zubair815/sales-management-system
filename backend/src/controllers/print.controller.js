const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const cache = require('../utils/cache');

const DEFAULT_TEMPLATES = ['order', 'expense', 'payment'];

const getTemplates = async (req, res) => {
  try {
    const templates = await prisma.printTemplate.findMany({ orderBy: { name: 'asc' } });
    return successResponse(res, templates);
  } catch (e) { return errorResponse(res, 'Failed to fetch templates', 500); }
};

const getTemplate = async (req, res) => {
  try {
    const cacheKey = `print_template_${req.params.name}`;
    let template = cache.getCache(cacheKey);

    if (!template) {
      template = await prisma.printTemplate.findFirst({ where: { name: req.params.name } });
      if (!template) {
        // Return default template config
        template = {
          name: req.params.name, companyName: 'Your Company Name',
          companyAddress: '123 Business Street, City, State', companyPhone: '+1 234 567 8900',
          companyEmail: 'info@company.com', logoPath: null, footerText: 'Thank you for your business!',
        };
      }
      cache.setCache(cacheKey, template, 3600); // Cache for 1 hour
    }
    return successResponse(res, template);
  } catch (e) { return errorResponse(res, 'Failed to fetch template', 500); }
};

const updateTemplate = async (req, res) => {
  try {
    const { companyName, companyAddress, companyPhone, companyEmail, footerText, customCss } = req.body;
    const template = await prisma.printTemplate.upsert({
      where: { name: req.params.name },
      update: { companyName, companyAddress, companyPhone, companyEmail, footerText, customCss },
      create: { name: req.params.name, companyName, companyAddress, companyPhone, companyEmail, footerText, customCss },
    });
    
    // Invalidate cache
    cache.clearCache(`print_template_${req.params.name}`);
    
    return successResponse(res, template, 'Template updated');
  } catch (e) { return errorResponse(res, 'Failed to update template', 500); }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    
    // --- UPDATED: Use Cloudinary's direct URL ---
    const logoPath = req.file.path; 
    
    await prisma.printTemplate.updateMany({ data: { logoPath } });
    return successResponse(res, { logoPath }, 'Logo uploaded');
  } catch (e) { return errorResponse(res, 'Failed to upload logo', 500); }
};

module.exports = { getTemplates, getTemplate, updateTemplate, uploadLogo };