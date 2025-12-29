"use client";

import { useState, useEffect } from "react";

export const Modals = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Reserved for app-level modals (e.g., export pack, publish template). */}
    </>
  );
};
