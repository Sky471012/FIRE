"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
    content: string;
    isUserMessage?: boolean;
}

interface TableData {
    headers: string[];
    rows: string[][];
    alignments: ("left" | "center" | "right")[];
}

/**
 * Custom Markdown Renderer built from scratch
 * Handles: headings, bold, italic, code blocks, inline code, links, lists, tables, and more
 */
export function MarkdownRenderer({ content, isUserMessage = false }: MarkdownRendererProps) {
    const renderContent = () => {
        const elements: React.ReactNode[] = [];
        const lines = content.split("\n");
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Skip empty lines
            if (!line.trim()) {
                elements.push(<div key={`empty-${i}`} className="h-2" />);
                i++;
                continue;
            }

            // HTML block elements (details, div, etc.)
            if (line.trim().match(/^<(details|div|section|article)/i)) {
                const tagMatch = line.trim().match(/^<([a-z][a-z0-9]*)/i);
                if (tagMatch) {
                    const tagName = tagMatch[1].toLowerCase();
                    const blockLines: string[] = [line];
                    let depth = 1;
                    i++;

                    // Collect all lines until closing tag
                    while (i < lines.length && depth > 0) {
                        const currentLine = lines[i];
                        blockLines.push(currentLine);

                        // Count opening and closing tags
                        const openTags = (currentLine.match(new RegExp(`<${tagName}`, "gi")) || [])
                            .length;
                        const closeTags = (
                            currentLine.match(new RegExp(`</${tagName}>`, "gi")) || []
                        ).length;
                        depth += openTags - closeTags;

                        i++;
                        if (depth === 0) break;
                    }

                    // Parse the HTML block
                    const blockContent = blockLines.join("\n");
                    elements.push(
                        <HTMLBlock
                            key={`html-${i}`}
                            content={blockContent}
                            isUserMessage={isUserMessage}
                        />,
                    );
                    continue;
                }
            }

            // Code blocks (```)
            if (line.trim().startsWith("```")) {
                const language = line.trim().slice(3).trim();
                const codeLines: string[] = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith("```")) {
                    codeLines.push(lines[i]);
                    i++;
                }
                elements.push(
                    <CodeBlock
                        key={`code-${i}`}
                        code={codeLines.join("\n")}
                        language={language}
                        isUserMessage={isUserMessage}
                    />,
                );
                i++;
                continue;
            }

            // Tables
            if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("|")) {
                const tableData = parseTable(lines, i);
                if (tableData) {
                    elements.push(<CustomTable key={`table-${i}`} data={tableData} />);
                    i += tableData.rows.length + 2; // Skip header + separator + rows
                    continue;
                }
            }

            // Headings
            if (line.trim().startsWith("#")) {
                const level = line.match(/^#+/)?.[0].length || 1;
                const text = line.replace(/^#+\s*/, "");
                elements.push(
                    <Heading key={`heading-${i}`} level={level}>
                        {parseInline(text, isUserMessage)}
                    </Heading>,
                );
                i++;
                continue;
            }

            // Unordered lists
            if (line.trim().match(/^[-*+]\s/)) {
                const listItems: string[] = [];
                while (i < lines.length && lines[i].trim().match(/^[-*+]\s/)) {
                    listItems.push(lines[i].trim().replace(/^[-*+]\s/, ""));
                    i++;
                }
                elements.push(
                    <UnorderedList
                        key={`ul-${i}`}
                        items={listItems}
                        isUserMessage={isUserMessage}
                    />,
                );
                continue;
            }

            // Ordered lists
            if (line.trim().match(/^\d+\.\s/)) {
                const listItems: string[] = [];
                while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
                    listItems.push(lines[i].trim().replace(/^\d+\.\s/, ""));
                    i++;
                }
                elements.push(
                    <OrderedList key={`ol-${i}`} items={listItems} isUserMessage={isUserMessage} />,
                );
                continue;
            }

            // Blockquotes
            if (line.trim().startsWith(">")) {
                const quoteLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith(">")) {
                    quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
                    i++;
                }
                elements.push(
                    <Blockquote key={`quote-${i}`} isUserMessage={isUserMessage}>
                        {quoteLines.join(" ")}
                    </Blockquote>,
                );
                continue;
            }

            // Horizontal rule
            if (line.trim().match(/^(---+|___+|\*\*\*+)$/)) {
                elements.push(<hr key={`hr-${i}`} className="my-4 border-border/50" />);
                i++;
                continue;
            }

            // Regular paragraph
            elements.push(<Paragraph key={`p-${i}`}>{parseInline(line, isUserMessage)}</Paragraph>);
            i++;
        }

        return elements;
    };

    return <div className="markdown-content">{renderContent()}</div>;
}

// Parse inline markdown elements (bold, italic, code, links, HTML tags)
function parseInline(text: string, isUserMessage: boolean): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // HTML tags (generic handling for various tags)
        const htmlTagMatch = remaining.match(
            /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>|<([a-z][a-z0-9]*)\s*\/?>/is,
        );
        if (htmlTagMatch && htmlTagMatch.index !== undefined) {
            if (htmlTagMatch.index > 0) {
                elements.push(
                    <span key={key++}>
                        {parseInlineContent(remaining.slice(0, htmlTagMatch.index), isUserMessage)}
                    </span>,
                );
            }

            // Handle the HTML tag
            const fullMatch = htmlTagMatch[0];
            const tagName = (htmlTagMatch[1] || htmlTagMatch[3]).toLowerCase();
            const innerContent = htmlTagMatch[2];

            // Special handling for specific tags
            if (tagName === "br") {
                elements.push(<br key={key++} />);
            } else if (tagName === "details") {
                // Parse details/summary
                const summaryMatch = innerContent?.match(/<summary>(.*?)<\/summary>(.*)/is);
                if (summaryMatch) {
                    const summaryText = summaryMatch[1];
                    const detailsContent = summaryMatch[2];
                    elements.push(
                        <details
                            key={key++}
                            className="my-3 border border-border/50 rounded-lg p-3 bg-muted/30"
                        >
                            <summary className="cursor-pointer font-medium hover:text-primary transition-colors">
                                {parseInlineContent(summaryText.trim(), isUserMessage)}
                            </summary>
                            <div className="mt-2 pl-4">
                                {parseInlineContent(detailsContent.trim(), isUserMessage)}
                            </div>
                        </details>,
                    );
                } else {
                    // No summary, just render content
                    elements.push(
                        <details
                            key={key++}
                            className="my-3 border border-border/50 rounded-lg p-3 bg-muted/30"
                        >
                            <div className="mt-2">
                                {parseInlineContent(innerContent?.trim() || "", isUserMessage)}
                            </div>
                        </details>,
                    );
                }
            } else if (innerContent) {
                // Generic tag with content - render as a span with the content
                elements.push(
                    <span key={key++} className={`html-${tagName}`}>
                        {parseInlineContent(innerContent, isUserMessage)}
                    </span>,
                );
            } else {
                // Self-closing or empty tag - just skip it or render as-is
                elements.push(<span key={key++}>{fullMatch}</span>);
            }

            remaining = remaining.slice(htmlTagMatch.index + fullMatch.length);
            continue;
        }

        // HTML entities (e.g., &nbsp;, &lt;, &gt;, &amp;, &#8211; etc.)
        const entityMatch = remaining.match(/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i);
        if (entityMatch && entityMatch.index !== undefined) {
            if (entityMatch.index > 0) {
                elements.push(
                    <span key={key++}>
                        {parseBoldItalic(remaining.slice(0, entityMatch.index))}
                    </span>,
                );
            }
            // Decode common HTML entities
            const entity = entityMatch[0];
            const decoded = decodeHTMLEntity(entity);
            elements.push(<span key={key++}>{decoded}</span>);
            remaining = remaining.slice(entityMatch.index + entityMatch[0].length);
            continue;
        }

        // Inline code (`code`)
        const codeMatch = remaining.match(/`([^`]+)`/);
        if (codeMatch && codeMatch.index !== undefined) {
            if (codeMatch.index > 0) {
                elements.push(
                    <span key={key++}>{parseBoldItalic(remaining.slice(0, codeMatch.index))}</span>,
                );
            }
            elements.push(
                <InlineCode key={key++} isUserMessage={isUserMessage}>
                    {codeMatch[1]}
                </InlineCode>,
            );
            remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
            continue;
        }

        // Links [text](url)
        const linkMatch = remaining.match(/\[([^[\]]+)]\(([^)]+)\)/);
        if (linkMatch && linkMatch.index !== undefined) {
            if (linkMatch.index > 0) {
                elements.push(
                    <span key={key++}>{parseBoldItalic(remaining.slice(0, linkMatch.index))}</span>,
                );
            }
            elements.push(
                <Link key={key++} href={linkMatch[2]} isUserMessage={isUserMessage}>
                    {linkMatch[1]}
                </Link>,
            );
            remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
            continue;
        }

        // No more special formatting
        elements.push(<span key={key++}>{parseBoldItalic(remaining)}</span>);
        break;
    }

    return elements;
}

// Helper to parse inline content recursively
function parseInlineContent(text: string, isUserMessage: boolean): React.ReactNode[] {
    return parseInline(text, isUserMessage);
}

// Decode HTML entities
function decodeHTMLEntity(entity: string): string {
    const entities: Record<string, string> = {
        "&nbsp;": "\u00A0",
        "&lt;": "<",
        "&gt;": ">",
        "&amp;": "&",
        "&quot;": '"',
        "&apos;": "'",
        "&ndash;": "–",
        "&mdash;": "—",
        "&hellip;": "…",
        "&times;": "×",
        "&divide;": "÷",
        "&bull;": "•",
        "&trade;": "™",
        "&copy;": "©",
        "&reg;": "®",
    };

    // Check named entities
    if (entities[entity.toLowerCase()]) {
        return entities[entity.toLowerCase()];
    }

    // Check numeric entities (&#123; or &#x7B;)
    const numMatch = entity.match(/&#(\d+);/);
    if (numMatch) {
        return String.fromCharCode(parseInt(numMatch[1], 10));
    }

    const hexMatch = entity.match(/&#x([0-9a-f]+);/i);
    if (hexMatch) {
        return String.fromCharCode(parseInt(hexMatch[1], 16));
    }

    // Return as-is if unknown
    return entity;
}

// Parse bold and italic
function parseBoldItalic(text: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Bold (**text** or __text__)
        const boldMatch = remaining.match(/\*\*(.+?)\*\*|__(.+?)__/);
        if (boldMatch && boldMatch.index !== undefined) {
            if (boldMatch.index > 0) {
                elements.push(
                    <span key={key++}>{parseItalic(remaining.slice(0, boldMatch.index))}</span>,
                );
            }
            const boldText = boldMatch[1] || boldMatch[2];
            elements.push(
                <strong key={key++} className="font-bold">
                    {boldText}
                </strong>,
            );
            remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
            continue;
        }

        // No more bold
        elements.push(<span key={key++}>{parseItalic(remaining)}</span>);
        break;
    }

    return elements;
}

// Parse italic
function parseItalic(text: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Italic (*text* or _text_) but not ** or __
        const italicMatch = remaining.match(
            /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/,
        );
        if (italicMatch && italicMatch.index !== undefined) {
            if (italicMatch.index > 0) {
                elements.push(remaining.slice(0, italicMatch.index));
            }
            const italicText = italicMatch[1] || italicMatch[2];
            elements.push(
                <em key={key++} className="italic">
                    {italicText}
                </em>,
            );
            remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
            continue;
        }

        // No more italic
        elements.push(remaining);
        break;
    }

    return elements;
}

// Parse markdown table
function parseTable(lines: string[], startIndex: number): TableData | null {
    try {
        const headerLine = lines[startIndex];
        const separatorLine = lines[startIndex + 1];

        if (!headerLine || !separatorLine) return null;

        // Check if this is a valid table separator
        if (!separatorLine.match(/^[\s|:-]+$/)) return null;

        // Parse headers - keep all cells, including empty ones
        const rawHeaders = headerLine.split("|");
        // Remove first and last if they're empty (from leading/trailing pipes)
        if (rawHeaders[0]?.trim() === "") rawHeaders.shift();
        if (rawHeaders[rawHeaders.length - 1]?.trim() === "") rawHeaders.pop();
        const headers = rawHeaders.map((h) => h.trim());

        if (headers.length === 0) return null;

        // Parse alignment - match header count
        const rawAlignments = separatorLine.split("|");
        if (rawAlignments[0]?.trim() === "") rawAlignments.shift();
        if (rawAlignments[rawAlignments.length - 1]?.trim() === "") rawAlignments.pop();

        const alignments = rawAlignments.map((a) => {
            const trimmed = a.trim();
            if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
            if (trimmed.endsWith(":")) return "right";
            return "left";
        }) as ("left" | "center" | "right")[];

        // Ensure alignments match header count
        while (alignments.length < headers.length) {
            alignments.push("left");
        }

        // Parse rows - keep all cells to maintain alignment
        const rows: string[][] = [];
        let i = startIndex + 2;
        while (i < lines.length && lines[i].includes("|")) {
            const rawCells = lines[i].split("|");
            // Remove first and last if they're empty
            if (rawCells[0]?.trim() === "") rawCells.shift();
            if (rawCells[rawCells.length - 1]?.trim() === "") rawCells.pop();

            const cells = rawCells.map((c) => c.trim());

            // Ensure row has same number of cells as headers
            while (cells.length < headers.length) {
                cells.push("");
            }
            // Trim if too many cells
            if (cells.length > headers.length) {
                cells.length = headers.length;
            }

            if (cells.length > 0) {
                rows.push(cells);
            }
            i++;
        }

        return { headers, rows, alignments };
    } catch (e) {
        return null;
    }
}

// Component: Custom Table
function CustomTable({ data }: { data: TableData }) {
    return (
        <div className="my-6 w-full overflow-x-auto rounded-xl border border-border/50 shadow-lg">
            <table className="w-full border-collapse table-auto">
                <thead>
                    <tr className="bg-gradient-to-r from-primary to-primary/85">
                        {data.headers.map((header, idx) => (
                            <th
                                key={idx}
                                className={cn(
                                    "px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground border-r border-primary/30 last:border-r-0 whitespace-normal",
                                    data.alignments[idx] === "center" && "text-center",
                                    data.alignments[idx] === "right" && "text-right",
                                    data.alignments[idx] === "left" && "text-left",
                                )}
                            >
                                <div className="min-w-[80px] max-w-[300px]">
                                    {parseInline(header, false)}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            className={cn(
                                "transition-all duration-200 hover:bg-accent hover:shadow-md",
                                rowIdx % 2 === 0 ? "bg-background" : "bg-muted/40",
                            )}
                        >
                            {row.map((cell, cellIdx) => (
                                <td
                                    key={cellIdx}
                                    className={cn(
                                        "px-4 py-3 text-sm border-r border-b border-border/20 last:border-r-0 whitespace-normal align-top",
                                        cellIdx === 0 && "font-medium",
                                        data.alignments[cellIdx] === "center" && "text-center",
                                        data.alignments[cellIdx] === "right" && "text-right",
                                        data.alignments[cellIdx] === "left" && "text-left",
                                    )}
                                    style={{
                                        maxWidth: "400px",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                    }}
                                >
                                    {cell ? (
                                        parseInline(cell, false)
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Component: Code Block
function CodeBlock({
    code,
    language,
    isUserMessage,
}: {
    code: string;
    language: string;
    isUserMessage: boolean;
}) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-4 rounded-lg overflow-hidden border border-border/50 group/code relative">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50">
                {language ? (
                    <span className="text-xs font-mono text-muted-foreground">{language}</span>
                ) : (
                    <span className="text-xs font-mono text-muted-foreground">code</span>
                )}
                <button
                    onClick={handleCopy}
                    className="opacity-0 group-hover/code:opacity-100 transition-opacity px-2 py-1 text-xs rounded hover:bg-muted/80 active:scale-95"
                    title="Copy code"
                >
                    {copied ? "✓ Copied!" : "Copy"}
                </button>
            </div>
            <pre
                className={cn(
                    "p-4 overflow-x-auto text-sm font-mono bg-muted/80",
                    isUserMessage && "bg-primary-foreground/10",
                )}
            >
                <code>{code}</code>
            </pre>
        </div>
    );
}

// Component: Inline Code
function InlineCode({
    children,
    isUserMessage,
}: {
    children: React.ReactNode;
    isUserMessage: boolean;
}) {
    return (
        <code
            className={cn(
                "px-1.5 py-0.5 rounded text-xs font-mono border",
                isUserMessage
                    ? "bg-primary-foreground/20 border-primary-foreground/30"
                    : "bg-muted border-border/50",
            )}
        >
            {children}
        </code>
    );
}

// Component: Link
function Link({
    href,
    children,
    isUserMessage,
}: {
    href: string;
    children: React.ReactNode;
    isUserMessage: boolean;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "underline underline-offset-2 hover:opacity-80 transition-opacity font-medium",
                isUserMessage ? "text-primary-foreground" : "text-primary",
            )}
        >
            {children}
        </a>
    );
}

// Component: Heading
function Heading({ level, children }: { level: number; children: React.ReactNode }) {
    const normalizedLevel = Math.min(level, 6) as 1 | 2 | 3 | 4 | 5 | 6;
    const sizeClasses = {
        1: "text-2xl font-bold mt-6 mb-4",
        2: "text-xl font-bold mt-5 mb-3",
        3: "text-lg font-semibold mt-4 mb-2",
        4: "text-base font-semibold mt-3 mb-2",
        5: "text-sm font-semibold mt-2 mb-1",
        6: "text-xs font-semibold mt-2 mb-1",
    };

    const className = cn(sizeClasses[normalizedLevel], "first:mt-0");

    switch (normalizedLevel) {
        case 1:
            return <h1 className={className}>{children}</h1>;
        case 2:
            return <h2 className={className}>{children}</h2>;
        case 3:
            return <h3 className={className}>{children}</h3>;
        case 4:
            return <h4 className={className}>{children}</h4>;
        case 5:
            return <h5 className={className}>{children}</h5>;
        case 6:
            return <h6 className={className}>{children}</h6>;
    }
}

// Component: Paragraph
function Paragraph({ children }: { children: React.ReactNode }) {
    return <p className="my-3 leading-relaxed first:mt-0 last:mb-0">{children}</p>;
}

// Component: Unordered List
function UnorderedList({ items, isUserMessage }: { items: string[]; isUserMessage: boolean }) {
    return (
        <ul className="my-3 pl-6 space-y-1 list-disc">
            {items.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                    {parseInline(item, isUserMessage)}
                </li>
            ))}
        </ul>
    );
}

// Component: Ordered List
function OrderedList({ items, isUserMessage }: { items: string[]; isUserMessage: boolean }) {
    return (
        <ol className="my-3 pl-6 space-y-1 list-decimal">
            {items.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                    {parseInline(item, isUserMessage)}
                </li>
            ))}
        </ol>
    );
}

// Component: Blockquote
function Blockquote({
    children,
    isUserMessage,
}: {
    children: React.ReactNode;
    isUserMessage: boolean;
}) {
    return (
        <blockquote
            className={cn(
                "my-4 pl-4 border-l-4 italic",
                isUserMessage
                    ? "border-primary-foreground/30 text-primary-foreground/90"
                    : "border-border text-muted-foreground",
            )}
        >
            {children}
        </blockquote>
    );
}

// Component: HTML Block (for details, div, etc.)
function HTMLBlock({ content, isUserMessage }: { content: string; isUserMessage: boolean }) {
    // Parse details tag specially
    const detailsMatch = content.match(/<details[^>]*>(.*?)<\/details>/is);
    if (detailsMatch) {
        const innerContent = detailsMatch[1];
        const summaryMatch = innerContent.match(/<summary[^>]*>(.*?)<\/summary>(.*)/is);

        if (summaryMatch) {
            const summaryText = summaryMatch[1].trim();
            const detailsContent = summaryMatch[2].trim();

            // Parse the details content as markdown
            const detailsElements = parseMarkdownContent(detailsContent, isUserMessage);

            return (
                <details className="my-4 border border-border/50 rounded-lg overflow-hidden bg-muted/20">
                    <summary className="cursor-pointer font-medium px-4 py-3 hover:bg-muted/40 transition-colors select-none">
                        {parseInline(summaryText, isUserMessage)}
                    </summary>
                    <div className="px-4 py-3 border-t border-border/30">{detailsElements}</div>
                </details>
            );
        }
    }

    // For other HTML blocks, try to parse as markdown
    const cleanContent = content.replace(/<\/?[^>]+(>|$)/g, "");
    return <div className="my-3">{parseInline(cleanContent, isUserMessage)}</div>;
}

// Helper function to parse markdown content recursively
function parseMarkdownContent(content: string, isUserMessage: boolean): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    const lines = content.split("\n");
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Skip empty lines
        if (!line.trim()) {
            elements.push(<div key={`empty-${i}`} className="h-2" />);
            i++;
            continue;
        }

        // Tables
        if (line.includes("|") && i + 1 < lines.length && lines[i + 1]?.includes("|")) {
            const tableData = parseTable(lines, i);
            if (tableData) {
                elements.push(<CustomTable key={`table-${i}`} data={tableData} />);
                i += tableData.rows.length + 2;
                continue;
            }
        }

        // Code blocks
        if (line.trim().startsWith("```")) {
            const language = line.trim().slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            elements.push(
                <CodeBlock
                    key={`code-${i}`}
                    code={codeLines.join("\n")}
                    language={language}
                    isUserMessage={isUserMessage}
                />,
            );
            i++;
            continue;
        }

        // Headings
        if (line.trim().startsWith("#")) {
            const level = line.match(/^#+/)?.[0].length || 1;
            const text = line.replace(/^#+\s*/, "");
            elements.push(
                <Heading key={`heading-${i}`} level={level}>
                    {parseInline(text, isUserMessage)}
                </Heading>,
            );
            i++;
            continue;
        }

        // Lists
        if (line.trim().match(/^[-*+]\s/)) {
            const listItems: string[] = [];
            while (i < lines.length && lines[i].trim().match(/^[-*+]\s/)) {
                listItems.push(lines[i].trim().replace(/^[-*+]\s/, ""));
                i++;
            }
            elements.push(
                <UnorderedList key={`ul-${i}`} items={listItems} isUserMessage={isUserMessage} />,
            );
            continue;
        }

        if (line.trim().match(/^\d+\.\s/)) {
            const listItems: string[] = [];
            while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
                listItems.push(lines[i].trim().replace(/^\d+\.\s/, ""));
                i++;
            }
            elements.push(
                <OrderedList key={`ol-${i}`} items={listItems} isUserMessage={isUserMessage} />,
            );
            continue;
        }

        // Regular paragraph
        elements.push(<Paragraph key={`p-${i}`}>{parseInline(line, isUserMessage)}</Paragraph>);
        i++;
    }

    return elements;
}
