# Specification: Multi-Project Web UI with Global Registry

## Executive Summary

Reconstruct the Octie web-ui to support multi-project management with a global project registry, enabling users to manage and visualize tasks across multiple Octie projects from a single web interface.

---

## Requirements

### 1. Global Project Registry

**Location**: `~/.octie/projects.json` (user home directory)

**Data Structure**:
```json
{
  "version": "1.0.0",
  "projects": {
    "<project-name>": {
      "path": "C:/path/to/project",
      "name": "wechat-miniapp",
      "lastAccessed": "2026-02-18T12:00:00Z",
      "taskCount": 25,
      "registeredAt": "2026-02-15T10:00:00Z"
    }
  }
}
```

**Registry Behavior**:
- Auto-detect and register projects on ANY octie command execution
- Root function that runs before every command to verify project in current folder
- Works for both new (`octie init`) and legacy projects
- Show warning indicator for projects that no longer exist on disk

### 2. Web UI Structure

**Pages**:
1. **Home Page** (`/`): Landing page with tutorial (tutorial content blocked by functionality)
2. **Project View** (`/?project=<path>`): Task graph and list for specific project
3. **API Test Page** (`/test`): Existing vitest coverage page

**Layout Components**:
- **Sidebar**: Collapsible, responsive, shows all registered projects
- **Header**: Home button, navigation, project context
- **Main Content**: Task graph/list view

**Sidebar Design**:
- Collapsible (extendable pattern)
- Focus on desktop/MVP first, responsive for mobile later
- Shows project metadata name from `project.json`
- Warning indicator for missing projects
- Click to switch projects

### 3. Serve Command Behavior

**Without --project flag**:
```
octie serve
```
- Opens home page at `http://localhost:3000/`
- User can select project from sidebar

**With --project flag**:
```
octie serve --project "C:/path/to/project"
```
- Opens project view at `http://localhost:3000/?project=C:/path/to/project`
- Sidebar shows all projects with current project highlighted
- Home button visible to return to dashboard
- Console output:
  ```
  🚀 Octie Web Server started
  📍 Project: C:/path/to/project
  🔗 URL: http://localhost:3000/?project=C:/path/to/project
  🏠 Home: http://localhost:3000/
  🧪 API Test: http://localhost:3000/test (dev mode)
  ```

### 4. URL Routing

**Format**: Query parameter based

| URL | Description |
|-----|-------------|
| `/` | Home page with project selection |
| `/?project=C:/path/to/project` | Project task view |
| `/?project=C:/path/to/project&view=graph` | Graph view (if applicable) |
| `/?project=C:/path/to/project&view=list` | List view (if applicable) |
| `/test` | API test / vitest coverage page |
| `/api/*` | REST API endpoints |

### 5. Auto-Registration Flow

```
Any Octie Command
       ↓
[Root Function: verifyAndRegisterProject()]
       ↓
Check if .octie/project.json exists in cwd
       ↓
  ┌────┴────┐
  YES       NO
  ↓         ↓
Register/   Continue
Update      normally
Registry
```

---

## User Stories

1. **As a developer**, I want to see all my Octie projects in one place so I can quickly switch between them.

2. **As a developer**, I want to run `octie serve` from any project folder and have it automatically registered.

3. **As a developer**, I want to share a direct link to a specific project view with my team.

4. **As a developer**, I want to know if a registered project has been moved or deleted.

---

## Technical Considerations

### Backend Changes

1. **New file**: `src/core/registry.ts`
   - `getGlobalRegistryPath(): string`
   - `loadRegistry(): ProjectRegistry`
   - `saveRegistry(registry: ProjectRegistry): void`
   - `registerProject(projectPath: string): void`
   - `verifyProjectExists(projectPath: string): boolean`
   - `getProjectMetadata(projectPath: string): ProjectMeta`

2. **New file**: `src/core/root-guard.ts`
   - `verifyAndRegisterProject(): void` - runs before every command

3. **Modified**: `src/cli/cli.ts`
   - Add root guard to command execution chain

4. **Modified**: `src/web/server.ts`
   - Add `/api/projects` endpoint to list all registered projects
   - Add `/?project=<path>` query param handling
   - Support multi-project mode

### Frontend Changes

1. **New component**: `src/components/Sidebar.tsx`
   - Project list
   - Collapsible behavior
   - Missing project warning

2. **New component**: `src/components/Header.tsx`
   - Home button
   - Navigation
   - Project context display

3. **New page**: `src/pages/HomePage.tsx`
   - Tutorial placeholder
   - Project selection cards

4. **Modified**: `src/App.tsx`
   - Add routing for `/?project=<path>`
   - Sidebar integration
   - Header integration

5. **New store**: `src/stores/projectStore.ts`
   - Current project state
   - Registry state
   - Project switching logic

---

## Success Criteria

- [ ] `octie init` creates project and registers it globally
- [ ] Any `octie` command in a project folder auto-registers it
- [ ] `octie serve` shows home page with project sidebar
- [ ] `octie serve --project <path>` shows direct URL with query param
- [ ] Sidebar shows all registered projects with metadata names
- [ ] Missing projects show warning indicator
- [ ] Home button returns to dashboard from project view
- [ ] Console shows full URL, home URL, and API test URL (dev mode)
- [ ] Tests: Unit tests for registry functions
- [ ] Tests: Integration tests for serve command output

---

## Phases

### Phase 1: Backend Registry (MVP)
- Create `~/.octie/projects.json` registry
- Implement registry CRUD functions
- Add root guard to CLI
- Add `/api/projects` endpoint

### Phase 2: Frontend Multi-Project UI
- Sidebar component with project list
- Header with home button
- Home page placeholder
- Query param routing

### Phase 3: Polish & UX
- Responsive sidebar (mobile)
- Tutorial content on home page
- Project switching animations
- Missing project removal UI

---

## Blockers

- Tutorial content depends on full functionality implementation

---

## Related Files

- `octie/src/core/registry.ts` (new)
- `octie/src/core/root-guard.ts` (new)
- `octie/src/cli/cli.ts` (modified)
- `octie/src/web/server.ts` (modified)
- `octie/src/web/routes/projects.ts` (new)
- `octie/web-ui/src/components/Sidebar.tsx` (new)
- `octie/web-ui/src/components/Header.tsx` (new)
- `octie/web-ui/src/pages/HomePage.tsx` (new)
- `octie/web-ui/src/stores/projectStore.ts` (new)
- `octie/web-ui/src/App.tsx` (modified)

---

## C7 MCP Verification Needed

- React Router query param patterns
- Express.js query parameter handling
- Node.js home directory cross-platform path resolution
