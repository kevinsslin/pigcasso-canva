"use client";

import { useMe } from "@/features/auth/api/use-me";

export const usePro = (options?: { enabled?: boolean }) => {
  const me = useMe({ enabled: options?.enabled });

  return {
    isLoading: me.isLoading,
    isError: me.isError,
    isPro: me.data?.data.pro.isPro ?? false,
    pro: me.data?.data.pro,
  };
};
