import { Router } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();

// Simple signaling endpoint for video conferencing (stub)
import { Request, Response } from "express";

router.post("/signal", authenticate, (req: Request, res: Response) => {
  // In production, implement WebRTC signaling logic here
  res.json({ success: true, message: "Signal sent/received." });
});

export default router;
