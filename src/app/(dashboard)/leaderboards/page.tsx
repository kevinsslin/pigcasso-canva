import { redirect } from "next/navigation";

export default function LeaderboardsPage() {
  redirect("/projects?tab=leaderboards");
}
