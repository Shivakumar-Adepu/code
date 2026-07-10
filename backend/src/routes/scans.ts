import { Router, Response } from "express";
import axios from "axios";
import Scan from "../models/Scan";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

// RUN CODE ANALYSIS (PROXIES TO PYTHON SERVICE & SAVES TO MONGODB)
router.post("/analyze", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, fileName, language, saveToHistory = true } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Code content is required for analysis" });
    }

    let analysisResult;
    try {
      // Fetch analysis from FastAPI Python Service
      const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, {
        code,
        filename: fileName || "workspace.tsx"
      });
      analysisResult = response.data;
    } catch (pythonError: any) {
      console.error("Failed to connect to Python Service:", pythonError.message);
      return res.status(502).json({ 
        message: "Python Code Analysis Service is currently unavailable. Please make sure it is running on port 8000.",
        error: pythonError.message 
      });
    }

    let savedScan = null;
    if (saveToHistory && req.userId) {
      // Calculate severity occurrences
      const issues = analysisResult.issues || [];
      const critical = issues.filter((i: any) => i.severity === "critical").length;
      const high = issues.filter((i: any) => i.severity === "high").length;
      const medium = issues.filter((i: any) => i.severity === "medium").length;
      const low = issues.filter((i: any) => i.severity === "low").length;

      const newScan = new Scan({
        userId: req.userId,
        fileName: fileName || "workspace.tsx",
        language: language || "TypeScript",
        bugsFound: analysisResult.bugsFound || 0,
        critical,
        high,
        medium,
        low,
        riskScore: analysisResult.riskScore || 0,
        qualityScore: analysisResult.qualityScore || 0,
        bugProbability: analysisResult.bugProbability || 0,
        summary: analysisResult.summary || "No issues found.",
        issueTitles: issues.map((i: any) => i.title),
        fullResult: analysisResult,
      });

      savedScan = await newScan.save();
    }

    res.json({
      scanId: savedScan ? savedScan._id : null,
      result: analysisResult
    });
  } catch (error: any) {
    console.error("Error in /analyze route:", error);
    res.status(500).json({ message: "Server error during code analysis", error: error.message });
  }
});

// GET SCAN HISTORY FOR CURRENT USER
router.get("/history", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scans = await Scan.find({ userId: req.userId })
      .sort({ timestamp: -1 })
      .select("-fullResult"); // Exclude large full result details for history listing speed
    res.json(scans);
  } catch (error: any) {
    res.status(500).json({ message: "Server error retrieving scan history", error: error.message });
  }
});

// GET SINGLE FULL SCAN DETAILS
router.get("/details/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.userId });
    if (!scan) {
      return res.status(404).json({ message: "Scan report not found" });
    }
    res.json(scan);
  } catch (error: any) {
    res.status(500).json({ message: "Server error retrieving scan details", error: error.message });
  }
});

// DELETE A SCAN FROM HISTORY
router.delete("/delete/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await Scan.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ message: "Scan record not found or unauthorized" });
    }
    res.json({ message: "Scan deleted successfully", id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ message: "Server error deleting scan", error: error.message });
  }
});

// DELETE ALL SCANS FOR CURRENT USER
router.delete("/clear", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await Scan.deleteMany({ userId: req.userId });
    res.json({ message: "All scans cleared successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Server error clearing scans", error: error.message });
  }
});

export default router;
