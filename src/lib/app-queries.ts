import { queryOptions } from "@tanstack/react-query";

import { getAdminOverview, getMyProfile } from "@/server/queries";
import {
  getDashboardData,
  getProject,
  listProjects,
} from "@/server/projects";

export const myProfileQueryOptions = queryOptions({
  queryKey: ["my-profile"],
  queryFn: () => getMyProfile(),
});

export const adminOverviewQueryOptions = queryOptions({
  queryKey: ["admin-overview"],
  queryFn: () => getAdminOverview(),
});

export const dashboardQueryOptions = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardData(),
});

export const projectsQueryOptions = queryOptions({
  queryKey: ["projects"],
  queryFn: () => listProjects(),
});

export const projectDetailQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["project", projectId],
    queryFn: () => getProject({ data: { projectId } }),
  });
