# Note Saver Extension - Refactoring Workflow

## Objective
This document outlines the standardized workflow for implementing refactoring tasks for the Note Saver Extension. It details the sequence of operations, including Git branch management, code changes, testing, and the use of Model Context Protocol (MCP) servers.

## Workflow Steps

1.  **Task Planning & Branch Creation:**
    *   **Discussion:** Cline (AI) and the User discuss and agree on the specific refactoring task to be undertaken from the overall refactoring plan.
    *   **Remote Branch Creation (Cline):** Cline creates a new feature branch on the `ettersAy/note-saver-extension` remote GitHub repository. This branch is typically created from the `main` branch (or another agreed-upon base branch).
        *   **Tool:** GitHub MCP `create_branch`
        *   **Example Branch Name:** `feature/task-X-description` (e.g., `feature/task-7-add-constants`)
    *   **Notification:** Cline informs the User that the remote branch has been created.
    *   **(User Optional) Local Sync:** The User may choose to synchronize their local repository with this new branch by running:
        ```bash
        git fetch origin
        git checkout feature/task-X-description
        ```

2.  **MCP Integration Planning (Cline, If Applicable):**
    *   Cline identifies any MCP tools (e.g., `SequentialThinking` for planning complex logic, `Context7` for documentation lookup, `search_files` for code analysis) that can assist in the current task.
    *   Cline briefly outlines how these MCP tools will be integrated into the task's execution.

3.  **Implementation (Cline):**
    *   **File Reading:** Cline reads the necessary current file(s) from the active feature branch using the `read_file` tool (conceptually, this means fetching the latest version of the file from that branch on the remote if there's any ambiguity, or working from the last known state if operations are sequential on the same branch).
    *   **Code Modification:** Cline performs the required code changes using tools like `replace_in_file` (for targeted edits) or `write_to_file` (for new files or complete overwrites). These changes are intended for the files on the current feature branch.

4.  **Committing and Pushing Changes (Cline):**
    *   Cline uses the GitHub MCP `push_files` tool to commit the modified and/or new files.
    *   This action bundles the changes into a single commit with a descriptive message and pushes it to the current feature branch on the remote repository.

5.  **Creating Pull Request (Cline):**
    *   Once changes are pushed to the feature branch, Cline uses the GitHub MCP `create_pull_request` tool.
    *   A Pull Request (PR) is created from the feature branch to the `main` branch.
    *   The PR will have a descriptive title and body summarizing the changes.

6.  **User Review and Testing:**
    *   **Notification:** Cline informs the User that the PR has been created and provides a link.
    *   **User Review:** The User reviews the code changes in the PR on GitHub.
    *   **User Testing:** The User tests the application's functionality to ensure the changes work as expected and haven't introduced regressions. This might involve checking out the PR branch locally or using GitHub's review/testing environments.

7.  **Merge Pull Request (Cline, Upon User Approval):**
    *   **User Confirmation:** The User informs Cline of successful testing and explicitly approves the merge.
    *   **Merge Execution (Cline):** Cline uses the GitHub MCP `merge_pull_request` tool to merge the PR into the `main` branch. The default merge strategy (merge commit) will typically be used unless specified otherwise.

8.  **Cline's Retrospective:**
    *   After the task is completed and merged, Cline conducts a brief internal retrospective.
    *   This focuses on the effectiveness of the tools used, adherence to the workflow, and any lessons learned during the task's execution. This helps refine future actions.

9.  **(User Optional but Recommended) Sync Local `main` Branch:**
    *   After the PR is merged into `main` on GitHub, Cline reminds the User to update their local `main` branch:
        ```bash
        git checkout main
        git pull origin main 
        # or git fetch origin; git reset --hard origin/main
        ```

10. **Proceed to Next Task:**
    *   With the current task completed and integrated, planning for the next refactoring task begins.

## Key Principles
*   **Remote-First Git Operations (Cline):** Cline primarily drives remote Git operations (branching, pushing, PR creation, merging) using GitHub MCP tools.
*   **Clear Communication:** Regular updates and confirmations between Cline and the User at each significant step.
*   **User Control:** The User performs all testing and provides explicit approval before any changes are merged into the `main` branch.
*   **Iterative Improvement:** The process includes retrospectives to refine Cline's execution and workflow adherence.
*   **Focused Changes:** Each feature branch and PR should ideally address a single, well-defined task.
