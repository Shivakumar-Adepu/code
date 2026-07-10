import axios from "axios";
import { getToken } from "./auth";
import type { AnalysisResult, Severity } from "./mock-analysis";

export interface ScanRecord {
  id: string;
  _id?: string; // MongoDB object ID compatibility
  fileName: string;
  language: string;
  timestamp: number;
  bugsFound: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  riskScore: number;
  qualityScore: number;
  bugProbability: number;
  summary: string;
  issueTitles: string[];
}

function getHeaders() {
  const token = getToken();
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
}

export async function getHistory(): Promise<ScanRecord[]> {
  try {
    const response = await axios.get("/api/scans/history", getHeaders());
    const data = response.data;
    // Map MongoDB _id to frontend id for compatibility
    return data.map((item: any) => ({
      ...item,
      id: item._id,
      timestamp: new Date(item.timestamp).getTime(),
    }));
  } catch (error) {
    console.error("Error fetching scan history:", error);
    return [];
  }
}

export async function deleteScan(id: string): Promise<void> {
  try {
    await axios.delete(`/api/scans/delete/${id}`, getHeaders());
    window.dispatchEvent(new CustomEvent("codeguard:scan-history"));
  } catch (error) {
    console.error("Error deleting scan:", error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await axios.delete("/api/scans/clear", getHeaders());
    window.dispatchEvent(new CustomEvent("codeguard:scan-history"));
  } catch (error) {
    console.error("Error clearing scan history:", error);
  }
}

// Keep recordScan signature for backward compatibility with unused hooks, return mock/empty
export function recordScan(input: {
  fileName: string;
  language: string;
  result: AnalysisResult;
}): ScanRecord {
  console.log("Saving scan history handled backend-side.");
  return {
    id: `scan-${Date.now()}`,
    fileName: input.fileName,
    language: input.language,
    timestamp: Date.now(),
    bugsFound: input.result.bugsFound,
    critical: input.result.critical,
    high: input.result.issues.filter((i) => i.severity === "high").length,
    medium: input.result.issues.filter((i) => i.severity === "medium").length,
    low: input.result.issues.filter((i) => i.severity === "low").length,
    riskScore: input.result.riskScore,
    qualityScore: input.result.qualityScore,
    bugProbability: input.result.bugProbability,
    summary: input.result.summary,
    issueTitles: input.result.issues.map((i) => i.title),
  };
}

export interface ScanDiff {
  field: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  betterIsLower: boolean;
}

export function diffScans(a: ScanRecord, b: ScanRecord): ScanDiff[] {
  const fields: { k: keyof ScanRecord; label: string; betterLower: boolean }[] = [
    { k: "bugsFound", label: "Total bugs", betterLower: true },
    { k: "critical", label: "Critical", betterLower: true },
    { k: "high", label: "High", betterLower: true },
    { k: "medium", label: "Medium", betterLower: true },
    { k: "low", label: "Low", betterLower: true },
    { k: "riskScore", label: "Risk score", betterLower: true },
    { k: "bugProbability", label: "Bug probability", betterLower: true },
    { k: "qualityScore", label: "Quality score", betterLower: false },
  ];
  return fields.map((f) => {
    const before = a[f.k] as number;
    const after = b[f.k] as number;
    return {
      field: String(f.k),
      label: f.label,
      before,
      after,
      delta: after - before,
      betterIsLower: f.betterLower,
    };
  });
}
