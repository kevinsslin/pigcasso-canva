"use client";

import Link from "next/link";
import { Loader, TriangleAlert } from "lucide-react";

import { useGetProject } from "@/features/projects/api/use-get-project";
import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { Editor } from "@/features/editor/components/editor";
import { Button } from "@/components/ui/button";

interface EditorProjectIdPageProps {
  params: {
    projectId: string;
  };
};

const EditorProjectIdPage = ({
  params,
}: EditorProjectIdPageProps) => {
  const { ready, authenticated } = useRequireAuth(`/editor/${params.projectId}`);

  const { 
    data, 
    isLoading, 
    isError,
    error,
  } = useGetProject(params.projectId, { enabled: ready && authenticated });

  if (!ready || !authenticated || isLoading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col gap-y-5 items-center justify-center">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          {error?.message || "Failed to fetch project"}
        </p>
        <Button asChild variant="secondary">
          <Link href="/app">
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  return <Editor initialData={data} />
};
 
export default EditorProjectIdPage;
