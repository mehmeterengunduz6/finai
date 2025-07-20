# Claude Development Guidelines

## Git Workflow Rules

⚠️ **IMPORTANT**: Never push directly to main branch!

### Required Workflow:
1. **Always create a feature branch first**
   ```bash
   git checkout -b feature/branch-name
   ```

2. **Make all changes on the feature branch**
   - Write code
   - Test changes
   - Commit changes

3. **Push the feature branch to remote**
   ```bash
   git push -u origin feature/branch-name
   ```

4. **Create a pull request**
   ```bash
   gh pr create --title "..." --body "..."
   ```

### Never Do:
- ❌ `git push origin main` directly
- ❌ Commit directly to main branch
- ❌ Make changes without creating a feature branch first

### Always Do:
- ✅ Create feature branch before making changes
- ✅ Use descriptive branch names (e.g., `fix/eslint-errors`, `feature/dark-mode`)
- ✅ Test builds locally before pushing
- ✅ Create meaningful commit messages
- ✅ Use pull requests for all changes

## Build Commands
- Test build: `npm run build`
- Run linting: `npm run lint` (if available)
- Run type checking: `npm run typecheck` (if available)

## Notes
- Always run build locally before pushing to catch TypeScript/ESLint errors
- Use TodoWrite tool for complex multi-step tasks
- Follow existing code patterns and conventions in the codebase