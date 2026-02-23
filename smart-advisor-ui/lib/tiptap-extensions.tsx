import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
    name: 'callout',
    group: 'block',
    content: 'block+',
    draggable: true,

    addAttributes() {
        return {
            type: {
                default: 'info',
                parseHTML: element => element.getAttribute('data-type'),
                renderHTML: attributes => ({ 'data-type': attributes.type }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'callout-block' }), 0];
    },
});
