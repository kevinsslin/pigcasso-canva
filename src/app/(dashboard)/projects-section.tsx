"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { 
  AlertTriangle, 
  CopyIcon, 
  FileIcon, 
  Loader, 
  MoreHorizontal, 
  Search,
  Trash
} from "lucide-react";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useDeleteProject } from "@/features/projects/api/use-delete-project";
import { useDuplicateProject } from "@/features/projects/api/use-duplicate-project";

import {
  DropdownMenuContent,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const ProjectsSection = () => {
  const duplicateMutation = useDuplicateProject();
  const removeMutation = useDeleteProject();
  const router = useRouter();
  const [opening, setOpening] = React.useState<{ id: string; name: string } | null>(null);
  const [filter, setFilter] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [deleteInput, setDeleteInput] = React.useState("");

  const onCopy = (id: string) => {
    duplicateMutation.mutate({ id });
  };

  const onDelete = (project: { id: string; name: string }) => {
    setDeleteTarget(project);
    setDeleteInput("");
  };

  const onOpen = (project: { id: string; name: string }) => {
    setOpening({ id: project.id, name: project.name });
    router.push(`/editor/${project.id}`);
  };

  const {
    data,
    status,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useGetProjects();

  if (status === "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-y-4 items-center justify-center h-32">
            <Loader className="size-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-y-4 items-center justify-center h-32">
            <AlertTriangle className="size-6 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {error?.message || "Failed to load projects"}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (
    !data.pages.length ||
    !data.pages[0].data.length
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-y-4 items-center justify-center h-32">
            <Search className="size-6 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No projects yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const projects = data.pages.flatMap((page) => page.data);
  const query = filter.trim().toLowerCase();
  const visibleProjects = query
    ? projects.filter((project) => project.name.toLowerCase().includes(query))
    : projects;

  return (
    <div className="space-y-4"> 
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (open) return;
          setDeleteTarget(null);
          setDeleteInput("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name ?? "this project"}
              </span>
              . Type{" "}
              <span className="font-mono text-foreground">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm-input">Confirmation</Label>
            <Input
              id="delete-confirm-input"
              value={deleteInput}
              onChange={(event) => setDeleteInput(event.target.value)}
              placeholder="Type DELETE"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteInput("");
              }}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                removeMutation.isPending ||
                deleteInput.trim().toLowerCase() !== "delete" ||
                !deleteTarget
              }
              onClick={() => {
                if (!deleteTarget) return;
                removeMutation.mutate(
                  { id: deleteTarget.id },
                  {
                    onSuccess: () => {
                      setDeleteTarget(null);
                      setDeleteInput("");
                    },
                  },
                );
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoadingOverlay
        open={Boolean(opening)}
        title="Opening project…"
        description={opening ? opening.name : undefined}
      />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Recent projects</CardTitle>
            <div className="relative w-full sm:w-[240px]">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search projects…"
                className="pl-9 rounded-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {visibleProjects.length === 0 ? (
            <div className="flex flex-col gap-y-3 items-center justify-center h-40">
              <Search className="size-6 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No matches</p>
              <Button type="button" variant="secondary" onClick={() => setFilter("")}>
                Clear search
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableBody>
                  {visibleProjects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-muted/30">
                      <TableCell
                        onClick={() => onOpen(project)}
                        className="font-medium flex items-center gap-x-2 cursor-pointer"
                      >
                        <FileIcon className="size-5 text-muted-foreground" />
                        <span className="truncate">{project.name}</span>
                      </TableCell>
                      <TableCell
                        onClick={() => onOpen(project)}
                        className="hidden md:table-cell cursor-pointer text-muted-foreground"
                      >
                        {project.width}×{project.height}
                      </TableCell>
                      <TableCell
                        onClick={() => onOpen(project)}
                        className="hidden md:table-cell cursor-pointer text-muted-foreground"
                      >
                        {formatDistanceToNow(project.updatedAt, {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="flex items-center justify-end">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              disabled={false}
                              size="icon"
                              variant="ghost"
                              className="rounded-full"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuItem
                              className="h-10 cursor-pointer"
                              disabled={duplicateMutation.isPending}
                              onClick={() => onCopy(project.id)}
                            >
                              <CopyIcon className="size-4 mr-2" />
                              Make a copy
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="h-10 cursor-pointer"
                              disabled={removeMutation.isPending}
                              onClick={() => onDelete(project)}
                            >
                              <Trash className="size-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hasNextPage && (
                <div className="w-full flex items-center justify-center pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
