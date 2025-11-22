/**
 * Get the icon name for a file based on its extension
 */
export function getFileIcon(fileName: string): string | undefined {
	const ext = fileName.split(".").pop()?.toLowerCase();

	const iconMap: Record<string, string> = {
		// Code files
		ts: "FileCode",
		tsx: "FileCode",
		js: "FileCode",
		jsx: "FileCode",
		py: "FileCode",
		rs: "FileCode",
		go: "FileCode",
		java: "FileCode",
		cpp: "FileCode",
		c: "FileCode",
		h: "FileCode",
		hpp: "FileCode",
		cs: "FileCode",
		php: "FileCode",
		rb: "FileCode",
		swift: "FileCode",
		kt: "FileCode",
		scala: "FileCode",
		html: "FileCode",
		css: "FileCode",
		scss: "FileCode",
		sass: "FileCode",
		less: "FileCode",
		vue: "FileCode",
		svelte: "FileCode",

		// Data files
		json: "FileJson",
		xml: "FileJson",
		yaml: "FileJson",
		yml: "FileJson",
		toml: "FileJson",

		// Database files
		db: "Database",
		sqlite: "Database",
		sql: "Database",

		// Spreadsheet files
		csv: "FileSpreadsheet",
		xlsx: "FileSpreadsheet",
		xls: "FileSpreadsheet",

		// Text files
		txt: "FileText",
		md: "FileText",
		log: "FileText",
		readme: "FileText",

		// Images
		png: "Image",
		jpg: "Image",
		jpeg: "Image",
		gif: "Image",
		svg: "Image",
		webp: "Image",
		ico: "Image",

		// Config files
		env: "Settings",
		config: "Settings",
		conf: "Settings",
		ini: "Settings",

		// Shell scripts
		sh: "Terminal",
		bash: "Terminal",
		zsh: "Terminal",
		fish: "Terminal",
	};

	return iconMap[ext || ""] || "File";
}

