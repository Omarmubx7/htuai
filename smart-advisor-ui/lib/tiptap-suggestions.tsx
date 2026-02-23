import React from 'react';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import {
    Heading1, Heading2, Heading3,
    List, ListOrdered, CheckSquare,
    Quote, Code, Minus, Info
} from "lucide-react";

export const suggestion = {
    items: ({ query }: { query: string }) => {
        return [
            {
                title: 'Heading 1',
                description: 'Big section heading',
                icon: Heading1,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
                },
            },
            {
                title: 'Heading 2',
                description: 'Medium section heading',
                icon: Heading2,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
                },
            },
            {
                title: 'Bullet List',
                description: 'Simple bulleted list',
                icon: List,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).toggleBulletList().run();
                },
            },
            {
                title: 'Numbered List',
                description: 'List with numbers',
                icon: ListOrdered,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).toggleOrderedList().run();
                },
            },
            {
                title: 'Todo List',
                description: 'Checkable list',
                icon: CheckSquare,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).toggleTaskList().run();
                },
            },
            {
                title: 'Quote',
                description: 'Capture a quote',
                icon: Quote,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).toggleBlockquote().run();
                },
            },
            {
                title: 'Code Block',
                description: 'Code with highlighting',
                icon: Code,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
                },
            },
            {
                title: 'Divider',
                description: 'Section separator',
                icon: Minus,
                command: ({ editor, range }: any) => {
                    editor.chain().focus().deleteRange(range).setHorizontalRule().run();
                },
            },
        ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
    },

    render: () => {
        let component: any;
        let popup: Instance[];

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor,
                });

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate(props: any) {
                component.updateProps(props);

                if (popup?.[0]) {
                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect,
                    });
                }
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                }

                return component.ref?.onKeyDown(props);
            },

            onExit() {
                if (popup?.[0]) {
                    popup[0].destroy();
                }
                component.destroy();
            },
        };
    },
};

const CommandList = React.forwardRef(({ items, command }: any, ref) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const selectItem = (index: number) => {
        const item = items[index];
        if (item) {
            command(item);
        }
    };

    React.useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: any) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + items.length - 1) % items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % items.length);
                return true;
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 shadow-2xl w-64 overflow-hidden animate-in fade-in zoom-in duration-200">
            {items.length > 0 ? (
                items.map((item: any, index: number) => (
                    <button
                        key={index}
                        onClick={() => selectItem(index)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left outline-none ${index === selectedIndex ? 'bg-violet-600/20 text-white' : 'hover:bg-white/5 text-white/50'
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === selectedIndex ? 'bg-violet-600/20 text-violet-400' : 'bg-white/5 text-white/30'
                            }`}>
                            <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold truncate">{item.title}</span>
                            <span className="text-[10px] opacity-50 truncate">{item.description}</span>
                        </div>
                    </button>
                ))
            ) : (
                <div className="px-3 py-2 text-xs text-white/30 italic">No results</div>
            )}
        </div>
    );
});

CommandList.displayName = 'CommandList';
