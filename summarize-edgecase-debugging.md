# Octie CLI Edge Case Testing - Bug Report

**Date**: 2026-02-16
**Tester**: Claude Code
**Version**: 1.0.0

---

## Summary

Deep testing of all CLI commands revealed **4 confirmed bugs** and **1 potential issue**.

---

## Critical Bugs

### Bug 1: Multiple Options Not Collected (CRITICAL)

**Severity**: Critical
**Affected Commands**: `create`, `update`
**Affected Options**: `--success-criterion`, `--deliverable`, `--c7-verified`

**Description**:
When specifying multiple values for options that claim to support it (e.g., `--success-criterion "First" --success-criterion "Second"`), only the **last value is kept**. The help text says "can be specified multiple times" but Commander.js doesn't collect multiple values by default.

**Reproduction**:
```bash
octie create --title "Test" --description "..." \
  --success-criterion "First criterion" \
  --success-criterion "Second criterion" \
  --deliverable "out.txt"
# Result: Only "Second criterion" is saved
```

**Root Cause**:
The `Option` class in `create.ts` doesn't use a collector function. Commander.js overwrites previous values instead of accumulating them.

**Files Affected**:
- `octie/src/cli/commands/create.ts` (lines 72-87)
- `octie/src/cli/commands/update.ts` (similar pattern)

**Fix Required**:
Use `.argParser()` with a collect function or use the `collect` pattern:
```typescript
// Option 1: Using argParser
new Option('--success-criterion <text>', '...')
  .argParser((value, previous) => [...(previous || []), value])

// Option 2: Using regular option with collect
.option('-c, --success-criterion <text>', '...', (v, p) => [...(p || []), v], [])
```

---

### Bug 2: `--remove-c7-verified` Missing Git Bash Path Conversion

**Severity**: High
**Affected Command**: `update`

**Description**:
The `--remove-c7-verified` option doesn't handle Windows Git Bash path conversion. When passing `/mongodb/docs`, Git Bash converts it to `C:/Program Files/Git/mongodb/docs`, but the stored library_id is `/mongodb/docs`, so the removal fails.

**Reproduction**:
```bash
# First add a C7 verification
octie update <id> --verify-c7 "/mongodb/docs:Notes"

# Try to remove it - FAILS
octie update <id> --remove-c7-verified "/mongodb/docs"
# Result: "Task updated" but verification still present

# Works with MSYS_NO_PATHCONV=1
MSYS_NO_PATHCONV=1 octie update <id> --remove-c7-verified "/mongodb/docs"
# Result: Verification removed
```

**Root Cause**:
`--verify-c7` has Git Bash path stripping (lines 148-158 in update.ts), but `--remove-c7-verified` (lines 177-180) doesn't.

**Files Affected**:
- `octie/src/cli/commands/update.ts` (lines 177-180)

**Fix Required**:
Add the same path stripping logic to `--remove-c7-verified`:
```typescript
if (options.removeC7Verified) {
  let libraryId = options.removeC7Verified;
  const gitBashPrefix = /^[A-Za-z]:\/(\/)?Program Files\/Git\//;
  if (gitBashPrefix.test(libraryId)) {
    const match = libraryId.match(/Program Files\/Git\/(.*)$/);
    if (match) {
      libraryId = '/' + match[1];
    }
  }
  task.removeC7Verification(libraryId);
  updated = true;
}
```

---

### Bug 3: Markdown Import Parses Completion Timestamps as Criteria

**Severity**: Medium
**Affected Command**: `import`

**Description**:
When importing markdown files exported by Octie, the completion timestamps on criteria/deliverables are incorrectly parsed as new success criteria.

**Reproduction**:
```bash
# Export a project with completed criteria
octie export --type md --output export.md

# Re-import
octie import export.md --format md

# Result: New criterion with text "Completed: 2026-02-16T..." is created
```

**Markdown Format Exported**:
```markdown
### Success Criteria
- [x] Feature works correctly
  - Completed: 2026-02-16T18:11:52.088Z
```

**Root Cause**:
In `import.ts`, any line starting with `- ` after "### Success Criteria" is parsed as a criterion, including the indented timestamp lines.

**Files Affected**:
- `octie/src/cli/commands/import.ts` (lines 232-243)

**Fix Required**:
Either:
1. Change export format to not use list syntax for timestamps:
   ```markdown
   - [x] Feature works correctly (Completed: 2026-02-16T18:11:52.088Z)
   ```
2. Or filter out lines matching timestamp pattern during import:
   ```typescript
   if (lt.startsWith('- ') && !lt.match(/^\s*-\s*Completed:\s*\d{4}-\d{2}-\d{2}T/)) {
     // Parse as criterion
   }
   ```

---

## Potential Issues

### Issue 1: `find --verified` with Leading Slash

**Severity**: Low
**Affected Command**: `find`

**Description**:
Searching for C7 verified tasks with full library path including leading slash (`/expressjs/express`) returns no results, but partial match (`expressjs`) works.

**Reproduction**:
```bash
# Task has library_id: "/expressjs/express"
octie find --verified "/expressjs/express"  # Returns nothing
octie find --verified "expressjs"           # Works
```

**Root Cause**:
Likely related to Git Bash path conversion of the search term. The `--verified` option value starting with `/` is being converted.

**Files Affected**:
- `octie/src/cli/commands/find.ts` (line 184)

**Recommended Fix**:
Add Git Bash path stripping to the find command's `--verified` option handling.

---

## Verified Working Features

The following commands and features were tested and confirmed working:

### Init Command
- Basic initialization
- Custom project name with spaces

### Create Command
- Basic task creation
- Atomic task validation (vague titles rejected)
- Description length validation (min 50 chars)
- Empty/whitespace title validation
- Title max length validation (200 chars)
- Description max length validation (10000 chars)
- Priority setting
- Blockers assignment
- Dependencies assignment
- Related files assignment
- C7 verification with notes
- Notes from file (`--notes-file`)
- Notes from CLI (`--notes`)

### List Command
- Table output
- JSON output
- Markdown output
- Graph view (`--graph`)
- Tree view (`--tree`)
- Status filter
- Priority filter

### Get Command
- Task retrieval by ID
- Task not found error
- JSON output
- Markdown output

### Update Command
- Status update
- Priority update
- Add deliverable
- Complete deliverable
- Complete criterion (auto-sets `completed_at`)
- Add criterion (auto-clears `completed_at` if not all complete)
- Add blocker
- Add related file
- C7 verification with notes
- Append notes
- Append notes from file

### Delete Command
- Delete with confirmation
- Force delete (`--force`)
- Task not found error

### Merge Command
- Merge preview
- Force merge (`--force`)
- Criteria/deliverables combination
- Edge reconnection

### Graph Command
- Validate (no cycles detection)
- Cycles detection

### Export Command
- JSON export
- Markdown export
- Output file option

### Import Command
- JSON import
- Markdown import
- Merge option

### Find Command
- Title search
- Status filter
- Priority filter
- Without-blockers filter
- Orphans filter
- Leaves filter
- Has-file filter
- Verified filter (partial match works)
- Combined filters

### Batch Command
- Update-status with dry-run
- Delete with force requirement
- Add-blocker with dry-run
- Preview affected tasks

### Timestamp Management
- `created_at` auto-set on creation (immutable)
- `updated_at` auto-updated on any field change
- `completed_at` auto-set when ALL criteria AND deliverables complete
- `completed_at` auto-cleared when any item un-completed

---

## Test Environment

- **OS**: Windows (Git Bash)
- **Node Version**: 20.x
- **Octie Version**: 1.0.0
- **Test Location**: `/tmp/octie-deep-test`

---

## Recommendations

### Priority 1 - Must Fix Before Release
1. **Bug 1 (Multiple Options)**: Critical functionality broken - users cannot add multiple criteria/deliverables via CLI

### Priority 2 - Should Fix
2. **Bug 2 (Remove C7)**: Feature doesn't work on Windows without workaround
3. **Bug 3 (Import Timestamps)**: Export/Import roundtrip corrupts data

### Priority 3 - Nice to Have
4. **Issue 1 (Find Verified)**: Works with workaround, affects specific use case

---

## Test Commands Used

```bash
# Setup
cd /tmp && rm -rf octie-deep-test && mkdir octie-deep-test && cd octie-deep-test
octie init --name "Test Project"

# Create basic task
octie create --title "Implement test feature" \
  --description "Create a test feature to validate the CLI functionality with comprehensive testing scenarios and edge cases" \
  --success-criterion "Feature works correctly" \
  --deliverable "src/test.ts"

# Test atomic validation
octie create --title "Fix stuff" --description "..." # Should fail

# Test multiple values (BUG)
octie create --title "Test" --description "..." \
  --success-criterion "First" --success-criterion "Second" \
  --deliverable "out.txt"
# Only "Second" is saved

# Test C7 verification remove (BUG)
MSYS_NO_PATHCONV=1 octie update <id> --remove-c7-verified "/library/id"
# Works without MSYS_NO_PATHCONV=1 fails

# Test export/import roundtrip (BUG)
octie export --type md --output test.md
octie import test.md --format md
# Check for spurious "Completed: timestamp" criteria
```

---

*End of Report*
