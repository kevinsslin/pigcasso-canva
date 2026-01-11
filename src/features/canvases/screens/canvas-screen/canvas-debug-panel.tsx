"use client";

export const CanvasDebugPanel = ({
  enabled,
  editorPresent,
  boardHydrated,
  remounting,
  mounts,
  unmounts,
  mountKey,
  lastMountAt,
  lastUnmountAt,
  autoRecoverAttempts,
  boardCrashMessage,
}: {
  enabled: boolean;
  editorPresent: boolean;
  boardHydrated: boolean;
  remounting: boolean;
  mounts: number;
  unmounts: number;
  mountKey: number;
  lastMountAt: number | null;
  lastUnmountAt: number | null;
  autoRecoverAttempts: number;
  boardCrashMessage: string | null;
}) => {
  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[80] max-w-[calc(100vw-32px)] rounded-2xl border bg-card/90 backdrop-blur px-3 py-2 text-[11px] shadow-soft space-y-1">
      <div className="font-semibold">Canvas debug</div>
      <div className="text-muted-foreground">
        editor: {editorPresent ? "yes" : "no"} • hydrated: {boardHydrated ? "yes" : "no"} • remounting:{" "}
        {remounting ? "yes" : "no"}
      </div>
      <div className="text-muted-foreground">
        mounts: {mounts} • unmounts: {unmounts} • mountKey: {mountKey}
      </div>
      <div className="text-muted-foreground">
        last mount: {lastMountAt ? new Date(lastMountAt).toLocaleTimeString() : "—"} • last unmount:{" "}
        {lastUnmountAt ? new Date(lastUnmountAt).toLocaleTimeString() : "—"}
      </div>
      <div className="text-muted-foreground">auto-recover attempts: {autoRecoverAttempts}</div>
      {boardCrashMessage ? (
        <div className="mt-1 rounded-xl border bg-background/70 p-2 whitespace-pre-wrap break-words">{boardCrashMessage}</div>
      ) : null}
    </div>
  );
};

