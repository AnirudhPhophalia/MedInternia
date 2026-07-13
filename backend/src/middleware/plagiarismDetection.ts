import { Request, Response, NextFunction } from 'express';

/**
 * Mock Plagiarism and AI Detection Middleware
 * This simulates calling an external service (like Turnitin or OpenAI classifier)
 * to verify the originality of clinical cases submitted to MedInternia.
 */
export const checkPlagiarismAndAI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description } = req.body;
    
    // Only run on case creation/updates where text is provided
    if (!description && !title) {
      return next();
    }

    const textToScan = `${title || ''} ${description || ''}`;
    
    // Simulated API call to external plagiarism/AI service
    console.log('[Security Guardrail] Scanning submitted case for plagiarism and AI-generated content...');
    
    // Mock simulation: If the description contains words often used by LLMs or copied from textbooks
    const suspiciousKeywords = ['in summary', 'it is important to note', 'delve', 'moreover', 'test_plagiarism_flag'];
    
    let isFlagged = false;
    let flagReason = '';

    for (const word of suspiciousKeywords) {
      if (textToScan.toLowerCase().includes(word.toLowerCase())) {
        isFlagged = true;
        flagReason = `Detected suspicious pattern associated with AI generation or copied text: "${word}"`;
        break;
      }
    }

    if (isFlagged) {
      console.log(`[Security Alert] Case flagged! Reason: ${flagReason}`);
      // Attach the flag to the request so the controller can mark the case for manual admin review
      req.body.isFlaggedForReview = true;
      req.body.reviewReason = flagReason;
      req.body.status = 'pending_review'; // Override default status
    } else {
      console.log('[Security Guardrail] Scan complete. Content appears original.');
    }

    next();
  } catch (error) {
    console.error('Error in plagiarism detection middleware:', error);
    // Fail open to avoid blocking user submissions if the third-party service is down
    next();
  }
};
