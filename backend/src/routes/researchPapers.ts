import express from 'express';
import { createResearchPaper, getAllResearchPapers, getResearchPaperById } from '../controllers/researchPaperController';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = express.Router();


router.post('/', authenticate, requirePermission('import:run'), createResearchPaper);
router.get('/', getAllResearchPapers);
router.get('/:id', getResearchPaperById);

// Download endpoint for research paper PDFs (assumes files are stored in backend/uploads)
router.get('/download/:filename', (req, res) => {
	const filename = req.params.filename;
	const filePath = path.join(__dirname, '../../uploads', filename);
	if (fs.existsSync(filePath)) {
		res.download(filePath);
	} else {
		res.status(404).send('File not found');
	}
});

export default router;
