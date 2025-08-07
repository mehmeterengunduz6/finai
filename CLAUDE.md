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

  ⎿ Chart Board Feature Implementation Plan

    Overview

    Create a split-view interface similar to Claude Artifacts/v0.dev where users can move charts 
    from chat to a dedicated chart board workspace with drag/resize functionality.

    Phase 1: Dependencies & Core Setup

    Install Required Packages

    - react-rnd - For draggable and resizable chart components
    - react-icons - For UI icons (expand, fullscreen, etc.)

    Create New Branch

    - feature/chart-board-workspace

    Phase 2: New Components to Create

    1. ChartBoard.tsx

    - Miro-like workspace for charts
    - Grid background, zoom controls
    - Manages chart positions and sizes
    - Drop zone for charts from chat

    2. ChartBoardItem.tsx

    - Wrapper for individual charts on the board
    - Implements drag & resize using react-rnd
    - Resize handle in bottom-right corner
    - Delete/minimize controls

    3. SplitViewLayout.tsx

    - Main layout component managing split view
    - Contains chat (left) and chart board (right)
    - Handles layout transitions between views

    4. DraggableDivider.tsx

    - Resizable divider between chat and chart board
    - Smooth drag interaction
    - Minimum/maximum width constraints

    5. ViewToggle.tsx

    - Center control panel with 3 buttons:
      - Full Chat mode
      - Split View mode  
      - Full Chart Board mode
    - Smooth transitions between modes

    Phase 3: Enhanced FinancialChart Component

    Add "Add to Board" Button

    - Top-right corner button on each chart
    - Export chart data to board when clicked
    - Visual feedback for successful transfer
    - Hide button when chart is already on board

    Phase 4: State Management Updates

    Main Page State Additions

    interface ChartBoardItem {
      id: string;
      chartData: ChartData;
      position: { x: number; y: number };
      size: { width: number; height: number };
      title: string;
    }

    // New state variables:
    - chartBoardItems: ChartBoardItem[]
    - viewMode: 'chat' | 'split' | 'board'
    - splitRatio: number (for draggable divider)

    Chart Transfer Logic

    - Move chart from chat to board
    - Prevent duplicates
    - Maintain chart integrity

    Phase 5: Layout & Styling

    Split View Layout

    - Left: Chat interface (resizable)
    - Right: Chart board workspace (resizable)
    - Center: Draggable divider with view toggle

    Responsive Design

    - Mobile: Stack views instead of split
    - Tablet: Adjusted split ratios
    - Desktop: Full split functionality

    Chart Board Styling

    - Grid background pattern
    - Smooth animations for chart interactions
    - Professional Miro-like appearance

    Phase 6: Advanced Features

    Chart Board Interactions

    - Multi-select charts (Ctrl+click)
    - Bulk operations (delete, resize)
    - Chart layering (bring to front/back)
    - Snap-to-grid option

    Persistence (Optional)

    - Save board layout to localStorage
    - Restore charts on page reload

    Phase 7: Testing & Polish

    Test Scenarios

    - Chart transfer from chat to board
    - Drag and resize functionality
    - View mode transitions
    - Divider dragging
    - Mobile responsiveness

    Performance Optimization

    - Lazy load chart board when first used
    - Optimize re-renders during drag operations
    - Smooth animations with proper throttling

    Implementation Order

    1. Install dependencies and create branch
    2. Create basic SplitViewLayout and ViewToggle components
    3. Implement DraggableDivider
    4. Build ChartBoard workspace
    5. Create ChartBoardItem with drag/resize
    6. Add "Add to Board" button to FinancialChart
    7. Update state management in main page
    8. Connect all components together
    9. Polish styling and animations
    10. Test all interactions and fix bugs

    Success Criteria

    - ✅ Charts can be moved from chat to board with one click
    - ✅ Charts are draggable and resizable on the board
    - ✅ Split view works smoothly with draggable divider
    - ✅ View toggle buttons work correctly
    - ✅ Professional UI matching Claude Artifacts quality
    - ✅ Responsive design works on all screen sizes
    - ✅ No performance issues during interactions