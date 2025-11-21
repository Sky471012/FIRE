import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface RecentProject {
	path: string;
	last_accessed: string;
}

export function useProject() {
	const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(
		null,
	);
	const [currentProjectName, setCurrentProjectName] = useState<
		string | null
	>(null);
	const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Load current project and recent projects on mount
	useEffect(() => {
		loadCurrentProject();
		loadRecentProjects();
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

			// Set current project
			await invoke("set_current_project_path", { path });

			// Add to recent projects
			await invoke("add_recent_project", { path });

			// Update state
			setCurrentProjectPath(path);
			setCurrentProjectName(name);

			// Reload recent projects
			await loadRecentProjects();

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

			// Initialize project
			await invoke("initialize_project", { path });

			// Get project name
			const name = await invoke<string>("get_project_name", { path });

			// Set current project
			await invoke("set_current_project_path", { path });

			// Add to recent projects
			await invoke("add_recent_project", { path });

			// Update state
			setCurrentProjectPath(path);
			setCurrentProjectName(name);

			// Reload recent projects
			await loadRecentProjects();

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

