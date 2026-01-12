"use client";

import { useCallback, useRef, useState } from "react";

export type AiUiJobState = {
  jobId: string;
  label: string;
  startedAt: number;
};

export const useAiUiJob = () => {
  const [aiUiJob, setAiUiJob] = useState<AiUiJobState | null>(null);
  const aiUiJobsRef = useRef<Map<string, AiUiJobState>>(new Map());

  const refreshAiUiJob = useCallback(() => {
    const jobs = Array.from(aiUiJobsRef.current.values());
    jobs.sort((a, b) => b.startedAt - a.startedAt);
    setAiUiJob(jobs[0] ?? null);
  }, []);

  const startAiUiJob = useCallback(
    (label: string) => {
      const jobId = crypto.randomUUID();
      aiUiJobsRef.current.set(jobId, { jobId, label, startedAt: Date.now() });
      refreshAiUiJob();
      return jobId;
    },
    [refreshAiUiJob],
  );

  const updateAiUiJobLabel = useCallback(
    (jobId: string, label: string) => {
      const existing = aiUiJobsRef.current.get(jobId);
      if (!existing) return;
      aiUiJobsRef.current.set(jobId, { ...existing, label });
      refreshAiUiJob();
    },
    [refreshAiUiJob],
  );

  const finishAiUiJob = useCallback(
    (jobId: string) => {
      aiUiJobsRef.current.delete(jobId);
      refreshAiUiJob();
    },
    [refreshAiUiJob],
  );

  return {
    aiUiJob,
    startAiUiJob,
    updateAiUiJobLabel,
    finishAiUiJob,
  };
};

