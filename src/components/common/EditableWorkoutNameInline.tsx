import { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableWorkoutNameInlineProps {
  name: string;
  onSave: (newName: string) => Promise<void>;
  className?: string;
  placeholder?: string;
}

export function EditableWorkoutNameInline({
  name,
  onSave,
  className = '',
  placeholder = 'Workout',
}: EditableWorkoutNameInlineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(name);
  }, [name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(name);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {e.stopPropagation();}
    setIsEditing(false);
    setEditedName(name);
  };

  const handleSave = async (e?: React.MouseEvent | React.FocusEvent) => {
    if (e) {e.stopPropagation();}
    
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setEditedName(name);
      setIsEditing(false);
      return;
    }

    if (trimmedName === name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedName);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save workout name:', error);
      setEditedName(name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          placeholder={placeholder}
          className="flex-1 text-base font-bold text-slate-900 dark:text-white bg-transparent border-b-2 border-primary focus:outline-none focus:border-primary"
          maxLength={50}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
          aria-label="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded transition-colors disabled:opacity-50"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      <h3 className="text-slate-900 dark:text-white font-bold text-base mb-1 flex-1">
        {name || placeholder}
      </h3>
      <button
        onClick={handleStartEdit}
        className="p-1 text-gray-400 hover:text-primary dark:hover:text-primary rounded transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Edit workout name"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );
}

