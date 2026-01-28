---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
---

> **Prerequisite Script**: This command uses `.zo/scripts/python/check-prerequisites.py` for context initialization.
>
> **Debug Mode**: Enable debug output with:
>
> ```sh
> cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/check-prerequisites.py --json --require-tasks --include-tasks
> ```
>
> This shows detailed path resolution, workspace detection, and validation messages.
>
> ```text
> Consolidated prerequisite checking script for Spec-Driven Development workflow.
>
> Usage: ZO_DEBUG=1 python3check-prerequisites.py [OPTIONS]
>
> OPTIONS:
>   --json              Output in JSON format
>   --require-tasks     Require tasks.md to exist (for implementation phase)
>   --include-tasks     Include tasks.md in AVAILABLE_DOCS list
>   --paths-only        Only output path variables (no validation)
>   --help, -h          Show help message
>
> OUTPUTS:
>   JSON mode: {"FEATURE_DIR":"...", "AVAILABLE_DOCS":["..."]}
>   Text mode: FEATURE_DIR:... \n AVAILABLE_DOCS: \n ✓/✗ file.md
>   Paths only: REPO_ROOT: ... \n BRANCH: ... \n FEATURE_DIR: ... etc.
> ```

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `cd "$(git rev-parse --show-toplevel)" && ZO_DEBUG=1 python3 .zo/scripts/python/check-prerequisites.py --json --require-tasks --include-tasks` and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL
