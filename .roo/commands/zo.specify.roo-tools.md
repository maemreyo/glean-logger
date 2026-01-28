---
description: Create or update the feature specification from a natural language feature description with optional UI/UX design (Production-Ready Roo Tools)
handoffs:
  - label: Build Technical Plan
    agent: zo.plan
    prompt: Create a plan for the spec. I am building with...
  - label: Clarify Spec Requirements
    agent: zo.clarify
    prompt: Clarify specification requirements
    send: true
---

> **Production-Ready**: This command uses Roo Custom Tools for complete feature specification workflow.
>
> Uses tools:
>
> - `branch_name_generator`: Generate short names from descriptions
> - `git_branch_detector`: Detect highest branch numbers from git and specs
> - `git_branch_creator`: Create and checkout git branches
> - `filesystem_directory_creator`: Create feature directories
> - `spec_content_generator`: Generate specification content
> - `filesystem_template_copier`: Copy and fill templates
>
> **NOTE**: Production-ready replacement for Python script workflow.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

**Optional Design Flag**: If `$ARGUMENTS` contains `--design` or `-d`, generate design specification alongside the feature spec.

## Outline

The text the user typed after `/zo.specify.roo-tools` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `$ARGUMENTS` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this:

1. **Call branch_name_generator tool** to generate short name:
   - Parameters: `featureDescription="$ARGUMENTS"`

2. **Call git_branch_detector tool** to find next branch number:
   - Parameters: `specsDir="specs", hasGit=true`

3. **Create git branch** using git_branch_creator tool:
   - Parameters: `branchName="{next_number:03d}-{short_name}", repoRoot="."`

4. **Create feature directory** using filesystem_directory_creator tool:
   - Parameters: `dirPath="specs/{branch_name}"`

5. **Generate spec content** using spec_content_generator tool:
   - Parameters: `featureDescription="$ARGUMENTS", branchName="{branch_name}", templatePath=".zo/templates/spec-template.md"`

6. **Write spec file** using filesystem_template_copier tool:
   - Parameters: `templatePath=".zo/templates/spec-template.md", destinationPath="specs/{branch_name}/spec.md", placeholders={generated_content}`

7. **Generate Specification Content**:
   - Load `.zo/templates/spec-template.md`
   - Parse user description to extract key concepts (actors, actions, data, constraints)
   - Fill template with derived details
   - Handle [NEEDS CLARIFICATION] markers for unclear aspects (max 3)
   - Write to SPEC_FILE

8. Report completion with branch name, spec file path, and readiness for next phase.

**NOTE:** This proof-of-concept focuses on basic branch creation and spec initialization using Roo Tools.
