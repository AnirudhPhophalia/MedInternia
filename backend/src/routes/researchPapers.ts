import express from 'express';
import { createResearchPaper, getAllResearchPapers, getResearchPaperById, updateResearchPaper, deleteResearchPaper } from '../controllers/researchPaperController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import path from 'path';
import fs from 'fs';

const router = express.Router();


router.post('/', authenticate, requirePermission('import:run'), createResearchPaper);
router.get('/', getAllResearchPapers);

// Place specific routes BEFORE dynamic routes
router.get('/download/:filename', authenticate, (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }
  const safePath = path.resolve(__dirname, '../../uploads', filename);
  if (!safePath.startsWith(path.resolve(__dirname, '../../uploads'))) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  if (fs.existsSync(safePath)) {
    return res.download(safePath);
  }
  return res.status(404).json({ success: false, message: 'File not found' });
});

router.get('/:id', getResearchPaperById);
router.put('/:id', authenticate, updateResearchPaper);
router.delete('/:id', authenticate, deleteResearchPaper);

export default router;
