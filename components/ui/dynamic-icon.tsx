import * as Icons from "lucide-react";

interface DynamicIconProps {
    name?: string;
    className?: string;
    size?: number;
}

export function DynamicIcon({ name, className, size }: DynamicIconProps) {
    if (!name) return null;

    const IconComponent = (Icons as any)[name];

    if (!IconComponent) {
        // Fallback to File icon if the specified icon doesn't exist
        const FileIcon = Icons.File;
        return <FileIcon className={className} size={size} />;
    }

    return <IconComponent className={className} size={size} />;
}
