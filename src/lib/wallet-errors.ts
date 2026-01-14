export const isUserRejectedWalletAction = (error: unknown) => {
  let current: any = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const code = (current as any)?.code;
    if (code === 4001 || code === "ACTION_REJECTED") return true;

    const messageRaw =
      (typeof (current as any)?.shortMessage === "string" && (current as any).shortMessage) ||
      (typeof (current as any)?.message === "string" && (current as any).message) ||
      "";
    const message = messageRaw.toLowerCase();
    if (
      message.includes("user rejected") ||
      message.includes("rejected the request") ||
      message.includes("user denied") ||
      message.includes("denied transaction") ||
      message.includes("denied signature")
    ) {
      return true;
    }

    current = (current as any)?.cause;
  }
  return false;
};
