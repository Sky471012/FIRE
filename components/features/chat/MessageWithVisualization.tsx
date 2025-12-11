"use client";

import React, { useMemo, memo } from "react";
import type { VisualizationSpec } from "../../../types/visualization";
import ChartRenderer from "../data-loader/ChartRenderer";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageWithVisualizationProps {
    content: string;
    projectPath: string | null;
    isUserMessage?: boolean;
}

interface ParsedContent {
    textContent: string;
    visualizationSpec: VisualizationSpec | null;
}

const parseMessageContent = (content: string): ParsedContent => {
    // Check for JSON code block with visualization_spec key
    const jsonBlockRegex = /```json\s*\n?\s*({[\s\S]*?})\s*\n?```/g;
    const matches = [...content.matchAll(jsonBlockRegex)];

    for (const match of matches) {
        try {
            const parsed = JSON.parse(match[1]);

            // Check if it has visualization_spec key
            if (parsed.visualization_spec) {
                return {
                    textContent: content.replace(match[0], "").trim(),
                    visualizationSpec: parsed.visualization_spec as VisualizationSpec,
                };
            }

            // Check if the JSON itself IS a visualization spec (has sql + plot_type)
            if (parsed.sql && parsed.plot_type && parsed.x && parsed.y) {
                return {
                    textContent: content.replace(match[0], "").trim(),
                    visualizationSpec: parsed as VisualizationSpec,
                };
            }
        } catch (e) {
            // Continue to next match
        }
    }

    // Check for direct visualization_spec in response (no code block)
    try {
        const parsed = JSON.parse(content);
        if (parsed.visualization_spec) {
            return {
                textContent: parsed.answer || parsed.text || "",
                visualizationSpec: parsed.visualization_spec as VisualizationSpec,
            };
        }

        // Check if the enfire content IS a visualization spec
        if (parsed.sql && parsed.plot_type && parsed.x && parsed.y) {
            return {
                textContent: "",
                visualizationSpec: parsed as VisualizationSpec,
            };
        }
    } catch (e) {
        // Not JSON, just text
    }

    // Check for tool_calls array with visualization_spec
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.tool_calls)) {
            for (const call of parsed.tool_calls) {
                if (call.name === "visualization_spec" && call.args) {
                    return {
                        textContent: parsed.text || parsed.answer || "",
                        visualizationSpec: call.args as VisualizationSpec,
                    };
                }
            }
        }
    } catch (e) {
        // Not the format we're looking for
    }

    return { textContent: content, visualizationSpec: null };
};

const MessageWithVisualizationComponent: React.FC<MessageWithVisualizationProps> = ({
    content,
    projectPath,
    isUserMessage = false,
}) => {
    const parsed = useMemo(() => parseMessageContent(content), [content]);

    // Debug logging
    React.useEffect(() => {
        if (parsed.visualizationSpec) {
            console.log(
                "[MessageWithVisualization] Visualization spec found:",
                parsed.visualizationSpec,
            );
            console.log("[MessageWithVisualization] Project path:", projectPath);
        }
    }, [parsed.visualizationSpec, projectPath]);

    return (
        <>
            {/* Render markdown text */}
            {parsed.textContent && (
                <MarkdownRenderer content={parsed.textContent} isUserMessage={isUserMessage} />
            )}

            {/* Render chart if visualization_spec exists */}
            {parsed.visualizationSpec && (
                <div className="mt-4">
                    {projectPath ? (
                        <ChartRenderer spec={parsed.visualizationSpec} projectPath={projectPath} />
                    ) : (
                        <div className="border border-yellow-500/50 bg-yellow-500/10 rounded-lg p-4 text-sm">
                            <p className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                                Visualization available but project not loaded
                            </p>
                            <p className="text-muted-foreground text-xs">
                                A chart was generated for this message, but it cannot be displayed
                                because no project is currently loaded. Please open or create a
                                project to view visualizations.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

// Memoize to prevent re-renders
export const MessageWithVisualization = memo(
    MessageWithVisualizationComponent,
    (prev, next) =>
        prev.content === next.content &&
        prev.projectPath === next.projectPath &&
        prev.isUserMessage === next.isUserMessage,
);
