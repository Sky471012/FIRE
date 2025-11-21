// Example usage of child dialog windows in your application

import { createChildWindow, openSettingsDialog, closeCurrentWindow } from '@/lib/window';

// ============================================================
// EXAMPLE 1: Opening the Settings Dialog (Simple)
// ============================================================
export async function openSettings() {
  await openSettingsDialog();
}

// ============================================================
// EXAMPLE 2: Opening a Custom Dialog
// ============================================================
export async function openCustomDialog() {
  try {
    await createChildWindow({
      label: 'my-dialog',
      title: 'My Dialog',
      url: '/my-dialog',
      width: 600,
      height: 400
    });
  } catch (error) {
    console.error('Failed to open dialog:', error);
  }
}

// ============================================================
// EXAMPLE 3: Opening a Confirmation Dialog
// ============================================================
export async function openConfirmationDialog() {
  await createChildWindow({
    label: 'confirm',
    title: 'Confirm Action',
    url: '/confirm',
    width: 400,
    height: 250
  });
}

// ============================================================
// EXAMPLE 4: Opening a Form Dialog
// ============================================================
export async function openFormDialog(formType: string) {
  await createChildWindow({
    label: `form-${formType}`,
    title: `${formType} Form`,
    url: `/forms/${formType}`,
    width: 700,
    height: 500
  });
}

// ============================================================
// EXAMPLE 5: Opening a Preview Dialog
// ============================================================
export async function openPreviewDialog(fileId: string) {
  await createChildWindow({
    label: `preview-${fileId}`,
    title: 'File Preview',
    url: `/preview?file=${fileId}`,
    width: 800,
    height: 600
  });
}

// ============================================================
// EXAMPLE 6: From a React Component
// ============================================================
import { Button } from '@/components/ui/button';

export function MyComponent() {
  const handleOpenDialog = async () => {
    await createChildWindow({
      label: 'example',
      title: 'Example Dialog',
      url: '/example',
      width: 500,
      height: 400
    });
  };

  return (
    <Button onClick={handleOpenDialog}>
      Open Dialog
    </Button>
  );
}

// ============================================================
// EXAMPLE 7: Closing from Inside a Child Window
// ============================================================
export function CloseButton() {
  const handleClose = async () => {
    await closeCurrentWindow();
  };

  return (
    <button onClick={handleClose}>
      Close
    </button>
  );
}

// ============================================================
// EXAMPLE 8: Creating a Reusable Dialog Component
// ============================================================
import { ChildWindowControls } from '@/components/features/window';

export default function MyDialogPage() {
  const handleSave = async () => {
    // Save your data here
    console.log('Saving...');
    // Then close the window
    await closeCurrentWindow();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Title Bar - draggable area */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between h-9 bg-accent/10 border-b border-border/50 px-3"
      >
        <span className="text-sm font-medium">Dialog Title</span>
        <ChildWindowControls />
      </div>

      {/* Dialog Content */}
      <div className="flex-1 overflow-auto p-6">
        <h1>Dialog Content</h1>
        <p>Your dialog content goes here...</p>
      </div>

      {/* Optional Footer */}
      <div className="border-t border-border p-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => closeCurrentWindow()}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXAMPLE 9: With Error Handling and Loading State
// ============================================================
import { useState } from 'react';

export function DialogOpenerWithState() {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpening(true);
    setError(null);

    try {
      await createChildWindow({
        label: 'my-dialog',
        title: 'My Dialog',
        url: '/my-dialog',
        width: 600,
        height: 400
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open dialog');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleOpen}
        disabled={isOpening}
      >
        {isOpening ? 'Opening...' : 'Open Dialog'}
      </Button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}

// ============================================================
// EXAMPLE 10: Opening Different Dialogs Based on Context
// ============================================================
export function ContextualDialogOpener({ mode }: { mode: 'edit' | 'view' | 'create' }) {
  const dialogConfig = {
    edit: { label: 'edit', title: 'Edit Item', url: '/edit', width: 800, height: 600 },
    view: { label: 'view', title: 'View Item', url: '/view', width: 700, height: 500 },
    create: { label: 'create', title: 'Create Item', url: '/create', width: 800, height: 600 }
  };

  const handleOpen = async () => {
    await createChildWindow(dialogConfig[mode]);
  };

  return <Button onClick={handleOpen}>Open {mode} Dialog</Button>;
}

