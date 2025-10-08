# Branch Management for YouTube Music Desktop App

This document outlines the branch management strategy and processes for the YouTube Music Desktop App repository.

## Branch Structure

The repository uses the following branch structure:

### Core Branches

- **master**: The production branch containing stable releases.
- **development**: The main development branch where features are integrated.
- **integration**: An intermediate branch for testing features before merging into development.

### Feature Branches

Feature branches are created for specific features or improvements:

- **feature/[feature-name]**: For new features.
- **bugfix/[bug-name]**: For bug fixes.
- **v2-feature/[feature-name]**: For features specific to v2 of the application.
- **v2-architecture/[component]**: For architectural changes in v2.

## Branch Lifecycle

1. **Creation**: Branches are created from the development branch.
2. **Development**: Work is done on the branch.
3. **Testing**: The branch is tested for stability.
4. **Integration**: Stable branches are merged into the integration branch.
5. **Verification**: Further testing is done in the integration branch.
6. **Merge**: Once verified, the integration branch is merged into development.
7. **Release**: Periodically, the development branch is merged into master for a release.
8. **Cleanup**: After merging, branches are deleted or archived.

## Branch Analysis and Cleanup

The repository includes scripts to analyze and clean up branches:

### Branch Analysis

The `scripts/analyze-branches.js` script categorizes branches as:

- **Main branches**: Core branches that should never be deleted.
- **Active branches**: Branches with recent commits that are still being worked on.
- **Merged branches**: Branches that have been fully merged into development.
- **Stale branches**: Branches with no activity for 90+ days.

To analyze branches:

```bash
node scripts/analyze-branches.js
```

This will generate a report with recommendations for branch cleanup.

### Branch Cleanup

The `scripts/cleanup-branches.js` script helps clean up branches based on the analysis:

- Deletes merged branches that are no longer needed.
- Provides options to delete, keep, or archive stale branches.
- Creates a backup branch before making any changes.

To clean up branches:

```bash
node scripts/cleanup-branches.js
```

## Beta Features Management

Features that are experimental or not yet ready for general release can be managed through the app's beta settings:

1. **Feature Flags**: Use feature flags in the code to conditionally enable beta features.
2. **Beta Settings UI**: Provide a UI in the settings to enable/disable beta features.
3. **Branch Isolation**: Keep experimental features in separate branches until they're stable.

## Best Practices

1. **Regular Cleanup**: Run branch analysis and cleanup regularly to keep the repository tidy.
2. **Descriptive Names**: Use clear, descriptive names for branches that indicate their purpose.
3. **Short-lived Branches**: Try to keep feature branches short-lived to minimize merge conflicts.
4. **Testing**: Always test branches thoroughly before merging into integration or development.
5. **Documentation**: Document significant changes when merging into core branches.

## Automated Branch Management

Consider setting up GitHub Actions for automated branch management:

- **Stale Branch Detection**: Automatically identify and tag stale branches.
- **Branch Protection**: Prevent direct pushes to core branches.
- **CI/CD**: Run tests automatically when branches are pushed or pull requests are created.
- **Auto-merge**: Automatically merge branches that pass all tests and meet criteria.

## Troubleshooting

If you encounter issues with branch management:

1. **Backup**: Always create a backup before major branch operations.
2. **Reflog**: Use `git reflog` to recover lost commits if needed.
3. **Cherry-pick**: Use `git cherry-pick` to apply specific commits from one branch to another.
4. **Rebase**: Use `git rebase` to incorporate changes from development into your feature branch.
