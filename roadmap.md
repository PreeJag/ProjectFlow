# ProjectFlow — roadmap

## In progress: default admin + role-based access
- [ ] Fix broken build: create protected routes (dashboard, projects, admin, profile), fix reset-password Link search param
- [ ] Migration 2: `project_owner` role, `profiles.is_active`, `projects`, `project_members`, `tasks` tables with RLS + grants
- [ ] Create default admin (Preethika / preethikajagadisan@gmail.com) idempotently, server-side only
- [ ] Server functions: admin user management (activate/deactivate, roles), projects/memberships/tasks, dashboard data
- [ ] Frontend pages wired to AppShell with role-aware navigation
- [ ] README: document admin account, roles and setup procedure
- [ ] Tests: routing + permission matrix
- [ ] End-to-end verification of all three roles (admin, project owner, standard user)
