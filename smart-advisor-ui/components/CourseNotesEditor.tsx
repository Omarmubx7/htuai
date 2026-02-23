"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { motion } from "framer-motion";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { Extension } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import Suggestion from "@tiptap/suggestion";
import { suggestion } from "@/lib/tiptap-suggestions";
import { Callout } from "@/lib/tiptap-extensions";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare,
  Quote, Code, Minus, Info, Sparkles,
  Heading1, Heading2, Heading3, Link as LinkIcon,
  Undo, Redo, Image as ImageIcon, Search, Plus, Save, CheckCircle2,
  Highlighter, Palette, ChevronDown, Trash2
} from "lucide-react";

const lowlight = createLowlight(common);

// Custom Slash Command Extension
const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

interface CourseNotesEditorProps {
  value?: any; // JSON or HTML
  onChange?: (val: any) => void;
  onAutoSave?: (val: any) => void;
  courseTitle?: string;
  updatedAt?: string;
}

export default function CourseNotesEditor({
  value,
  onChange,
  onAutoSave,
  courseTitle = "Course Notes",
  updatedAt
}: CourseNotesEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<"saved" | "saving" | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        codeBlock: false, // Handled by lowlight
      }),
      Underline,
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Callout,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-violet-400 underline underline-offset-4 cursor-pointer" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-2xl border border-white/10 my-8 shadow-2xl max-w-full" } }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
          if (node.type.name === 'codeBlock') return "Paste your code here...";
          return "Type '/' for commands...";
        }
      }),
      TaskList.configure({ HTMLAttributes: { class: "notion-task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "notion-task-item" } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "notion-table" } }),
      TableRow,
      TableCell,
      TableHeader,
      SlashCommand.configure({
        suggestion,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
      setIsSaving(true);
      setSaveIndicator("saving");
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[500px] px-4 sm:px-12 py-10",
      },
    },
  });

  // Autosave effect
  useEffect(() => {
    if (!isSaving || !editor) return;
    const timeout = setTimeout(() => {
      onAutoSave?.(editor.getJSON());
      setIsSaving(false);
      setSaveIndicator("saved");
      setTimeout(() => setSaveIndicator(null), 2000);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [isSaving, editor, onAutoSave]);

  useEffect(() => {
    if (editor && value && JSON.stringify(value) !== JSON.stringify(editor.getJSON())) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="h-[400px] w-full bg-white/5 animate-pulse rounded-[2.5rem] border border-white/10 flex items-center justify-center text-white/20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 animate-pulse text-violet-400/50" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest opacity-50">Initializing Editor Engine...</span>
        </div>
      </div>
    );
  }

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
    <div className="relative flex flex-col min-h-screen bg-black overflow-x-hidden">
      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(255, 255, 255, 0.15);
          pointer-events: none;
          height: 0;
        }
        .notion-task-list { list-style: none; padding: 0; }
        .notion-task-item { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; }
        .notion-task-item input[type="checkbox"] {
          margin-top: 0.35rem;
          width: 1.1rem;
          height: 1.1rem;
          border-radius: 4px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          cursor: pointer;
        }
        .notion-table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 2rem 0; border: 1px solid rgba(255, 255, 255, 0.1); }
        .notion-table td, .notion-table th { border: 1px solid rgba(255, 255, 255, 0.05); padding: 10px; vertical-align: top; }
        .notion-table th { background-color: rgba(255, 255, 255, 0.03); font-weight: bold; }
        .callout-block {
          padding: 1.5rem;
          margin: 2rem 0;
          border-radius: 1.5rem;
          background: rgba(139, 92, 246, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.1);
          display: flex;
          gap: 1rem;
        }
        .callout-block::before {
          content: '💡';
          font-size: 1.25rem;
        }
        
        .bubble-menu-btn {
          padding: 0.5rem;
          border-radius: 0.75rem;
          transition: all 0.2s ease-in-out;
          color: rgba(255, 255, 255, 0.5);
        }
        .bubble-menu-btn:hover { background-color: rgba(255, 255, 255, 0.08); color: white; }
        .bubble-menu-btn.is-active { color: #a78bfa; background-color: rgba(167, 139, 250, 0.1); }
        
        /* Syntax highlighting */
        .hljs-comment, .hljs-quote { color: #5c6370; font-style: italic; }
        .hljs-keyword, .hljs-selector-tag { color: #c678dd; }
        .hljs-string, .hljs-attr, .hljs-type { color: #98c379; }
        .hljs-number, .hljs-literal { color: #d19a66; }
        .hljs-function, .hljs-title { color: #61afef; }
      `}</style>

      {/* Header Sticky Bar */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-2xl border-b border-white/5 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-lg font-black tracking-tight text-white uppercase italic truncate max-w-[180px] sm:max-w-md">
              {courseTitle}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {saveIndicator === "saving" ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-violet-400/60 uppercase tracking-widest">Saving...</span>
                </div>
              ) : saveIndicator === "saved" ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">Changes Saved</span>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  Last edited {updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all disabled:opacity-20"
            >
              <Undo className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all disabled:opacity-20"
            >
              <Redo className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Editor Main Surface */}
      <main className="flex-1 w-full max-w-4xl mx-auto relative pt-8 pb-32">
        {/* Bubble Menu */}
        {editor && (
          <BubbleMenu editor={editor} className="flex items-center gap-1 p-1.5 bg-[#121212]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-50">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`bubble-menu-btn ${editor.isActive("bold") ? "is-active" : ""}`}><Bold className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`bubble-menu-btn ${editor.isActive("italic") ? "is-active" : ""}`}><Italic className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`bubble-menu-btn ${editor.isActive("underline") ? "is-active" : ""}`}><UnderlineIcon className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`bubble-menu-btn ${editor.isActive("strike") ? "is-active" : ""}`}><Strikethrough className="w-4 h-4" /></button>
            <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={`bubble-menu-btn ${editor.isActive("highlight") ? "is-active" : ""}`}><Highlighter className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={setLink} className={`bubble-menu-btn ${editor.isActive("link") ? "is-active" : ""}`}><LinkIcon className="w-4 h-4" /></button>
          </BubbleMenu>
        )}

        <EditorContent editor={editor} />
      </main>

      {/* Mobile Toolbar (Bottom Floating) */}
      <div className="sm:hidden fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[65] w-[95%] max-w-md">
        <div className="glass-card-premium p-1.5 rounded-[2rem] border border-white/10 flex items-center justify-between gap-1 shadow-2xl overflow-x-auto scrollbar-hide no-scrollbar scroll-smooth">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("bold") ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><Bold className="w-5 h-5" /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("italic") ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><Italic className="w-5 h-5" /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("heading", { level: 1 }) ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><Heading1 className="w-5 h-5" /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("heading", { level: 2 }) ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><Heading2 className="w-5 h-5" /></button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("bulletList") ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><List className="w-5 h-5" /></button>
          <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("taskList") ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><CheckSquare className="w-5 h-5" /></button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("blockquote") ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><Quote className="w-5 h-5" /></button>
          <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-3 rounded-2xl transition-all shrink-0 ${editor.isActive("codeBlock") ? "bg-violet-600/20 text-violet-400" : "text-white/40"}`}><Code className="w-5 h-5" /></button>
          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
          <button onClick={() => editor.chain().focus().insertContent('/').run()} className="p-3 rounded-2xl text-white/40 hover:text-white bg-white/5 shrink-0"><Plus className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}
