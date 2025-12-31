import { redirect } from "next/navigation";

const toSafeRedirectPath = (value: string | undefined) => {
  if (!value) return "/app";
  if (!value.startsWith("/")) return "/app";
  if (value.startsWith("//")) return "/app";
  return value;
};

export default function SignInPage(props: {
  searchParams?: { redirect?: string };
}) {
  const nextPath = toSafeRedirectPath(props.searchParams?.redirect);
  redirect(`/?open=1&redirect=${encodeURIComponent(nextPath)}`);
}

