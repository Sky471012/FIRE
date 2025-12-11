"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import katex from "katex";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface MarkdownPreviewProps {
    content: string;
    isLatex?: boolean;
}

export function MarkdownPreview({ content, isLatex = false }: MarkdownPreviewProps) {
    const [mounted, setMounted] = useState(false);
    const [debouncedContent, setDebouncedContent] = useState(content);
    const [latexHtml, setLatexHtml] = useState<string>("");
    const [latexError, setLatexError] = useState<string>("");

    useEffect(() => {
        setMounted(true);
    }, []);

    // Debounce content updates to prevent errors while typing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedContent(content);
            setDebouncedContent(content);
        }, 500);

        return () => clearTimeout(timer);
    }, [content]);

    useEffect(() => {
        if (isLatex && mounted) {
            try {
                const html = katex.renderToString(debouncedContent, {
                    displayMode: true,
                    throwOnError: false,
                    errorColor: "#cc0000",
                    strict: false,
                    trust: true,
                });
                setLatexHtml(html);
                setLatexError("");
            } catch (error) {
                setLatexError(String(error));
                setLatexHtml("");
            }
        }
    }, [debouncedContent, isLatex, mounted]);

    if (!mounted) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-background">
                <div className="text-sm text-muted-foreground">Loading preview...</div>
            </div>
        );
    }

    if (isLatex) {
        return (
            <div className="h-full w-full overflow-auto bg-background">
                <div className="max-w-4xl mx-auto p-8">
                    {latexError ? (
                        <div className="text-destructive">
                            <p className="font-bold mb-2">LaTeX Error:</p>
                            <pre className="text-sm">{latexError}</pre>
                        </div>
                    ) : (
                        <div
                            className="latex-preview text-foreground text-2xl"
                            dangerouslySetInnerHTML={{ __html: latexHtml }}
                        />
                    )}
                </div>
            </div>
        );
    }

    // Wrap rendering in error boundary
    const renderMarkdown = () => {
        try {
            return (
                <ReactMarkdown
                    key={debouncedContent}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[
                        rehypeHighlight,
                        [rehypeRaw, { passThrough: ["text"] }],
                        [rehypeKatex, { strict: false, throwOnError: false }],
                    ]}
                    components={{
                        h1: ({ children }) => (
                            <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>
                        ),
                        h2: ({ children }) => (
                            <h2 className="text-3xl font-bold mt-6 mb-3">{children}</h2>
                        ),
                        h3: ({ children }) => (
                            <h3 className="text-2xl font-bold mt-4 mb-2">{children}</h3>
                        ),
                        h4: ({ children }) => (
                            <h4 className="text-xl font-bold mt-3 mb-2">{children}</h4>
                        ),
                        h5: ({ children }) => (
                            <h5 className="text-lg font-bold mt-2 mb-1">{children}</h5>
                        ),
                        h6: ({ children }) => (
                            <h6 className="text-base font-bold mt-2 mb-1">{children}</h6>
                        ),
                        p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
                        ol: ({ children }) => (
                            <ol className="list-decimal ml-6 mb-4">{children}</ol>
                        ),
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-border pl-4 italic my-4">
                                {children}
                            </blockquote>
                        ),
                        code: ({ inline, children, ...props }: any) =>
                            inline ? (
                                <code
                                    className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
                                    {...props}
                                >
                                    {children}
                                </code>
                            ) : (
                                <code
                                    className="block bg-muted p-4 rounded my-4 overflow-x-auto font-mono text-sm"
                                    {...props}
                                >
                                    {children}
                                </code>
                            ),
                        pre: ({ children }) => (
                            <pre className="bg-muted p-4 rounded my-4 overflow-x-auto">
                                {children}
                            </pre>
                        ),
                        a: ({ children, href }) => (
                            <a href={href} className="text-primary underline hover:no-underline">
                                {children}
                            </a>
                        ),
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse border border-border">
                                    {children}
                                </table>
                            </div>
                        ),
                        th: ({ children }) => (
                            <th className="border border-border px-4 py-2 bg-muted font-bold text-left">
                                {children}
                            </th>
                        ),
                        td: ({ children }) => (
                            <td className="border border-border px-4 py-2">{children}</td>
                        ),
                        hr: () => <hr className="my-6 border-border" />,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                    }}
                >
                    {debouncedContent}
                </ReactMarkdown>
            );
        } catch (error) {
            console.error("Markdown rendering error:", error);
            return <div className="text-muted-foreground text-sm">Rendering preview...</div>;
        }
    };

    return (
        <div className="h-full w-full overflow-auto bg-background">
            <div className="max-w-4xl mx-auto p-8">
                <div className="markdown-preview text-foreground">{renderMarkdown()}</div>
            </div>
        </div>
    );
}
