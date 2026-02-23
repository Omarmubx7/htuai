"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, Link as LinkIcon,
  Heading1, Heading2, Heading3, CheckSquare, Table as TableIcon,
  Undo, Redo, Image as ImageIcon
} from "lucide-react";

interface CourseNotesEditorProps {
  value?: string;
  onChange?: (val: string) => void;
}

export default function CourseNotesEditor({ value, onChange }: CourseNotesEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-violet-400 underline underline-offset-4 cursor-pointer" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-2xl border border-white/10 my-8 shadow-2xl" } }),
      Placeholder.configure({ placeholder: "Press '/' for commands or start typing..." }),
      TaskList.configure({ HTMLAttributes: { class: "notion-task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "notion-task-item" } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "notion-table" } }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[400px] px-8 py-10",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="h-75 w-full bg-white/5 animate-pulse rounded-2xl border border-white/10 flex items-center justify-center text-white/20">
        Initializing Engine...
      </div>
    );
  }

  const addImage = () => {
    const url = window.prompt("Enter image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="relative group/editor">
      <style jsx global>{`
        .prose .placeholder {
          color: rgba(255, 255, 255, 0.15);
          height: 0;
          pointer-events: none;
        }
        .notion-task-list {
          list-style: none;
          padding: 0;
        }
        .notion-task-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .notion-task-item input[type="checkbox"] {
          margin-top: 0.35rem;
          width: 1.1rem;
          height: 1.1rem;
          border-radius: 4px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          cursor: pointer;
        }
        .notion-table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 2rem 0;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .notion-table td, .notion-table th {
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .notion-table th {
          background-color: rgba(255, 255, 255, 0.03);
          font-weight: bold;
          text-align: left;
        }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        
        .bubble-menu-btn {
          padding: 0.375rem;
          border-radius: 0.5rem;
          transition: all 0.2s ease-in-out;
          color: rgba(255, 255, 255, 0.6);
        }
        .bubble-menu-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .bubble-menu-btn.is-active {
          color: #a78bfa;
          background-color: rgba(167, 139, 250, 0.1);
        }
      `}</style>

      {/* Bubble Menu */}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 p-1.5 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50"
        >
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`bubble-menu-btn ${editor.isActive("bold") ? "is-active" : ""}`}><Bold className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`bubble-menu-btn ${editor.isActive("italic") ? "is-active" : ""}`}><Italic className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`bubble-menu-btn ${editor.isActive("underline") ? "is-active" : ""}`}><UnderlineIcon className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`bubble-menu-btn ${editor.isActive("strike") ? "is-active" : ""}`}><Strikethrough className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`bubble-menu-btn ${editor.isActive("heading", { level: 1 }) ? "is-active" : ""}`}><Heading1 className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`bubble-menu-btn ${editor.isActive("heading", { level: 2 }) ? "is-active" : ""}`}><Heading2 className="w-4 h-4" /></button>
          <button onClick={setLink} className={`bubble-menu-btn ${editor.isActive("link") ? "is-active" : ""}`}><LinkIcon className="w-4 h-4" /></button>
        </BubbleMenu>
      )}

      {/* Floating Menu */}
      {editor && (
        <FloatingMenu
          editor={editor}
          className="flex flex-col gap-1 p-2 bg-[#1a1a1a] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 w-64"
        >
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <Heading1 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Heading 1</span>
              <span className="text-[10px] text-white/30 font-medium">Big section title</span>
            </div>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Heading2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Heading 2</span>
              <span className="text-[10px] text-white/30 font-medium">Medium section title</span>
            </div>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <List className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Bullet List</span>
              <span className="text-[10px] text-white/30 font-medium">Simple bullet list</span>
            </div>
          </button>

          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">To-do List</span>
              <span className="text-[10px] text-white/30 font-medium">Track your tasks</span>
            </div>
          </button>

          <button
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <TableIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Table</span>
              <span className="text-[10px] text-white/30 font-medium">Organize data</span>
            </div>
          </button>

          <button
            onClick={addImage}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-pink-600/10 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Image</span>
              <span className="text-[10px] text-white/30 font-medium">Add from URL</span>
            </div>
          </button>
        </FloatingMenu>
      )}

      {/* Main Container */}
      <div className="glass-card-premium rounded-[2.5rem] border border-white/10 overflow-hidden min-h-[500px] shadow-2xl transition-all group-hover/editor:border-white/20">
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/40" />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-all p-1"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-all p-1"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="editor-wrapper scrollbar-hide">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
