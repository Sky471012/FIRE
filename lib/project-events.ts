// Event System Documentation for Project Switching

/**
 * Custom Event: "project-switched"
 *
 * This event is emitted whenever a project is opened or created through the
 * use-project hook. Components can listen to this event to perform cleanup
 * or reinitialization when the active project changes.
 *
 * Event Detail Interface:
 * {
 *   path: string;  // Absolute path to the new project
 *   name: string;  // Display name of the new project
 * }
 *
 * @example Basic Usage
 * ```typescript
 * useEffect(() => {
 *   const handleProjectSwitch = (event: CustomEvent) => {
 *     const { path, name } = event.detail;
 *     console.log(`Project switched to: ${name} at ${path}`);
 *     // Perform cleanup or reinitialization here
 *   };
 *
 *   window.addEventListener("project-switched", handleProjectSwitch as EventListener);
 *   return () => {
 *     window.removeEventListener("project-switched", handleProjectSwitch as EventListener);
 *   };
 * }, []);
 * ```
 *
 * @example Reacting to Project Path Changes (Recommended)
 * ```typescript
 * import { useProject } from "@/hooks/use-project";
 *
 * export function MyComponent() {
 *   const { currentProjectPath } = useProject();
 *
 *   useEffect(() => {
 *     if (currentProjectPath) {
 *       // Load data for the new project
 *       loadDataForProject(currentProjectPath);
 *     }
 *   }, [currentProjectPath]);
 * }
 * ```
 *
 * Components That Already Listen:
 * - DatasetsList: Automatically reloads tables when currentProjectPath changes
 * - ChatProvider: Syncs project path with chat store, which clears sessions
 * - FileExplorer: Updates root path when project changes
 *
 * Best Practices:
 * 1. Prefer watching `currentProjectPath` via useEffect over custom events
 * 2. Always cleanup subscriptions in useEffect return function
 * 3. Clear component state when project path becomes null
 * 4. Handle race conditions if multiple async operations depend on project path
 * 5. Use the project path from useProject() as source of truth, not from event detail
 */

// Type definition for TypeScript consumers
declare global {
    interface WindowEventMap {
        "project-switched": CustomEvent<{ path: string; name: string }>;
    }
}

export {};
