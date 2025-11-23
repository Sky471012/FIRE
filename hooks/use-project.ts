import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export interface RecentProject {
	path: string;
	last_accessed: string;
}

export function useProject() {
	const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(
		null,
	);
	const [currentProjectName, setCurrentProjectName] = useState<string | null>(
		null,
	);
	const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Load current project and recent projects on mount
	useEffect(() => {
		loadCurrentProject();
		loadRecentProjects();
	}, []);

	// Listen for project switch events to refresh workspace
	useEffect(() => {
		const handleProjectSwitch = () => {
			loadCurrentProject();
		};

		window.addEventListener("project-switched", handleProjectSwitch);
		return () => {
			window.removeEventListener("project-switched", handleProjectSwitch);
		};
	}, []);

	const loadCurrentProject = async () => {
		try {
			const path = await invoke<string | null>("get_current_project_path");
			if (path) {
				setCurrentProjectPath(path);
				const name = await invoke<string>("get_project_name", { path });
				setCurrentProjectName(name);
			}
		} catch (error) {
			console.error("Failed to load current project:", error);
		}
	};

	const loadRecentProjects = async () => {
		try {
			const projects = await invoke<RecentProject[]>("get_recent_projects");
			setRecentProjects(projects);
		} catch (error) {
			console.error("Failed to load recent projects:", error);
		}
	};

	const openProject = async (path: string) => {
		setIsLoading(true);
		try {
			// Validate project
			const isValid = await invoke<boolean>("is_valid_project", { path });
			if (!isValid) {
				throw new Error("Selected folder does not contain a FIRE.toml file");
			}

			// Get project name
			const name = await invoke<string>("get_project_name", { path });

			// Call the new open_project command which handles hot-reload
			await invoke("open_project", { path });

			// Update state
			setCurrentProjectPath(path);
			setCurrentProjectName(name);

			// Reload recent projects
			await loadRecentProjects();

			// Emit a custom event to trigger workspace refresh across the app
			window.dispatchEvent(new CustomEvent("project-switched", { 
				detail: { path, name } 
			}));

			return { success: true, name };
		} catch (error) {
			console.error("Failed to open project:", error);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const createProject = async (path: string) => {
		setIsLoading(true);
		try {
			// Check if directory is empty
			const isEmpty = await invoke<boolean>("is_directory_empty", { path });
			if (!isEmpty) {
				throw new Error("Directory is not empty");
			}

			// Call the new create_project command which handles initialization and hot-reload
			await invoke("create_project", { path });

			// Get project name
			const name = await invoke<string>("get_project_name", { path });

			// Update state
			setCurrentProjectPath(path);
			setCurrentProjectName(name);

			// Reload recent projects
			await loadRecentProjects();

			// Emit a custom event to trigger workspace refresh across the app
			window.dispatchEvent(new CustomEvent("project-switched", { 
				detail: { path, name } 
			}));

			return { success: true, name };
		} catch (error) {
			console.error("Failed to create project:", error);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const openRecentProject = async (path: string) => {
		return openProject(path);
	};

	return {
		currentProjectPath,
		currentProjectName,
		recentProjects,
		isLoading,
		openProject,
		createProject,
		openRecentProject,
		refreshRecentProjects: loadRecentProjects,
	};
}
