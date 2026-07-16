import React from 'react';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import {
    Heading1, Heading2, Heading3, Heading4,
    List, ListOrdered, CheckSquare,
    Quote, Code, Minus, Terminal
} from "lucide-react";

interface ChainableEditor {
    chain: () => {
        focus: () => {
            deleteRange: (range: unknown) => {
                setNode: (name: string, attrs: { level: number }) => { run: () => void };
                toggleBulletList: () => { run: () => void };
                toggleOrderedList: () => { run: () => void };
                toggleTaskList: () => { run: () => void };
                toggleBlockquote: () => { run: () => void };
                toggleCode: () => { run: () => void };
                toggleCodeBlock: () => { run: () => void };
                setHorizontalRule: () => { run: () => void };
            };
        };
    };
}

interface CommandArgs {
    editor: ChainableEditor;
    range: unknown;
}

interface SlashCommandItem {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    command: (args: CommandArgs) => void;
}

interface CommandListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const suggestion = {
    items: ({ query }: { query: string }) => {
        return [
            {
                title: 'Heading 1',
                description: 'Big section heading',
                icon: Heading1,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
                },
            },
            {
                title: 'Heading 2',
                description: 'Medium section heading',
                icon: Heading2,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
                },
            },
            {
                title: 'Bullet List',
                description: 'Simple bulleted list',
                icon: List,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).toggleBulletList().run();
                },
            },
            {
                title: 'Numbered List',
                description: 'List with numbers',
                icon: ListOrdered,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).toggleOrderedList().run();
                },
            },
            {
                title: 'Todo List',
                description: 'Checkable list',
                icon: CheckSquare,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).toggleTaskList().run();
                },
            },
            {
                title: 'Quote',
                description: 'Capture a quote',
                icon: Quote,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).toggleBlockquote().run();
                },
            },
            {
                title: 'Heading 3',
                description: 'Small section heading',
                icon: Heading3,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
                },
            },
            {
                title: 'Heading 4',
                description: 'Sub-section heading',
                icon: Heading4,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run();
                },
            },
            {
                title: 'Inline Code',
                description: 'Monospace font',
                icon: Code,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).toggleCode().run();
                },
            },
            {
                title: 'Code Block',
                description: 'Code with highlighting',
                icon: Terminal,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
                },
            },
            {
                title: 'Divider',
                description: 'Section separator',
                icon: Minus,
                command: ({ editor, range }: CommandArgs) => {
                    editor.chain().focus().deleteRange(range).setHorizontalRule().run();
                },
            },
        ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
    },

    render: () => {
        let component: ReactRenderer<CommandListRef>;
        let popup: Instance[];

        return {
            onStart: (props: Record<string, unknown>) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor as never,
                });

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect as never,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },

            onUpdate(props: Record<string, unknown>) {
                component.updateProps(props);

                if (popup?.[0]) {
                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect as never,
                    });
                }
            },

            onKeyDown(props: { event: KeyboardEvent }) {
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

const CommandList = React.forwardRef<CommandListRef, { items: SlashCommandItem[]; command: (item: SlashCommandItem) => void }>(({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    React.useEffect(() => {
        setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
        const item = items[index];
        if (item) {
            command(item);
        }
    };

    React.useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
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
        <div className="bg-[#edf1f6] border border-[#dde3ec] rounded-2xl p-2 shadow-2xl w-64 overflow-hidden animate-in fade-in zoom-in duration-200">
            {items.length > 0 ? (
                items.map((item: SlashCommandItem, index: number) => (
                    <button
                        key={index}
                        onClick={() => selectItem(index)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left outline-none ${index === selectedIndex ? 'bg-[#dc4835]/20 text-[#222d32]' : 'hover:bg-[#edf1f6] text-[#5a6472]'
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${index === selectedIndex ? 'bg-[#dc4835]/20 text-[#dc4835]' : 'bg-[#edf1f6] text-[#5a6472]'
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
                <div className="px-3 py-2 text-xs text-[#5a6472] italic">No results</div>
            )}
        </div>
    );
});

CommandList.displayName = 'CommandList';

