import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CanvasNewPage() {
  redirect(`/canvas/${crypto.randomUUID()}`);
}

