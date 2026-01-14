# RPOS Development Workflow

## Integration Overview

This project uses a unified development workflow connecting:
- **Jira** - Issue tracking, sprints, epics
- **GitHub** - Source control, PRs, commits
- **Slack** - Real-time notifications, team communication
- **Claude Code** - AI-assisted development, plan mode

---

## Workflow Process

### 1. Plan Mode to Jira Tickets

When Claude creates a plan (stored in `~/.claude/plans/`), convert it to Jira:

```
Plan Mode Output (.md file)
    |
    v
Create Epic in Jira (high-level overview)
    |
    v
Break into Tasks (implementation steps)
    |
    v
Assign to Sprint
```

**Current Plans Location:** `~/.claude/plans/`

### 2. Development Flow

```
Jira Ticket (To Do)
    |
    v
Start Work (In Progress)
    |
    v
Claude Code Implementation
    |
    v
Git Commit (link to ticket: DEV-XX)
    |
    v
Push to GitHub
    |
    v
Update Jira (Done)
    |
    v
Slack Notification (automatic via integration)
```

### 3. Commit Message Convention

Always include Jira ticket reference:

```bash
git commit -m "feat(module): Description

Closes DEV-XX

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Jira Project Structure

**Project:** POS_system (DEV)
**URL:** https://personalprojectmanagement.atlassian.net/jira/software/projects/DEV

### Current Epics

| Key | Epic | Status |
|-----|------|--------|
| DEV-49 | Phase 2: Reports, Analytics & Seed Data | Done |
| DEV-8 | Testing & Quality Assurance | To Do |
| DEV-9 | Documentation & API Specs | To Do |
| DEV-10 | DevOps & Infrastructure | To Do |
| DEV-11 | Security Enhancements | To Do |
| DEV-12 | Performance Optimization | To Do |
| DEV-13 | Feature Enhancements | To Do |

---

## Slack Integration Setup

### Option 1: Jira Cloud for Slack

1. Install **Jira Cloud** app in Slack
2. Connect to workspace: `personalprojectmanagement.atlassian.net`
3. Configure notifications in channel:
   ```
   /jira connect
   /jira manage
   ```
4. Set up filters for DEV project updates

### Option 2: GitHub + Slack

1. Install **GitHub** app in Slack
2. Subscribe to repository:
   ```
   /github subscribe Rahul-Rajpurohitk/POS-system
   ```
3. Customize notifications:
   ```
   /github subscribe Rahul-Rajpurohitk/POS-system commits:all
   ```

### Option 3: Slack Workflow Builder

Create automated workflows:
- When Jira issue transitions -> Post to channel
- When GitHub PR merged -> Update Jira + notify
- Daily standup summary of sprint progress

---

## Sprint Planning

### Sprint Template

```markdown
## Sprint X: [Theme]
**Duration:** 2 weeks
**Goals:**
- [ ] Goal 1
- [ ] Goal 2

### Tickets
| Key | Summary | Status | Assignee |
|-----|---------|--------|----------|
| DEV-XX | Task description | To Do | - |

### Definition of Done
- [ ] Code complete
- [ ] Tests passing
- [ ] PR reviewed
- [ ] Merged to main
- [ ] Jira updated
```

---

## Claude Code Plan Mode Workflow

### Creating Plans

When asked to plan a feature:
1. Claude enters plan mode
2. Explores codebase, identifies files
3. Writes plan to `~/.claude/plans/[plan-name].md`
4. User approves plan
5. Implementation begins

### Converting Plans to Jira

After plan approval:

```bash
# 1. Read the plan
cat ~/.claude/plans/[plan-name].md

# 2. Create Epic in Jira (via Claude)
"Create a Jira Epic for this plan"

# 3. Create child Tasks
"Break this into Jira tasks under the epic"
```

### Example Plan-to-Jira Flow

```
Plan: "Add multi-language support"
    |
    v
Epic: DEV-XX "Internationalization (i18n)"
    |
    +-- Task: DEV-YY "Set up i18n library"
    +-- Task: DEV-ZZ "Extract string literals"
    +-- Task: DEV-AA "Add language selector UI"
    +-- Task: DEV-BB "Create translation files"
```

---

## Useful Commands

### Jira JQL Queries

```
# All open tasks in current sprint
project = DEV AND sprint in openSprints() AND status != Done

# My tasks
project = DEV AND assignee = currentUser()

# Recently updated
project = DEV AND updated >= -7d ORDER BY updated DESC

# By Epic
project = DEV AND "Epic Link" = DEV-XX
```

### GitHub CLI

```bash
# Create PR linked to Jira
gh pr create --title "DEV-XX: Feature description" --body "Closes DEV-XX"

# View PR status
gh pr status

# Merge PR
gh pr merge --squash
```

---

## Automation Rules (Jira)

Set up in Jira Automation:

### Rule 1: Auto-transition on PR Merge
```
Trigger: GitHub PR merged
Condition: PR title contains "DEV-"
Action: Transition issue to "Done"
```

### Rule 2: Slack Notification on Status Change
```
Trigger: Issue transitioned
Condition: Project = DEV
Action: Send Slack message to #pos-dev
```

### Rule 3: Sprint Summary
```
Trigger: Scheduled (daily at 9am)
Condition: Sprint is active
Action: Post sprint progress to Slack
```

---

## Quick Reference

| Action | Command/Location |
|--------|-----------------|
| View Jira board | https://personalprojectmanagement.atlassian.net/jira/software/projects/DEV/boards/1 |
| GitHub repo | https://github.com/Rahul-Rajpurohitk/POS-system |
| Claude plans | `~/.claude/plans/` |
| Run seed | `cd server && npm run seed:reset` |
| Start dev server | `cd server && npm run dev` |
| Start app | `cd app && npm start` |

---

## Next Steps for Full Integration

1. **Enable Confluence** (optional) - For richer documentation
2. **Set up Jira Automation** - Auto-transitions on PR merge
3. **Configure Slack webhooks** - Real-time updates
4. **Create sprint board** - Visualize work in progress
5. **Add GitHub Actions** - CI/CD with Jira updates
