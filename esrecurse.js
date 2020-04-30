/*
  Copyright (C) 2014 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import estraverse from 'estraverse';

export { version } from './package.json';

function isNode(node) {
    // istanbul ignore if -- Is currently always truthy
    if (node == null) {
        return false;
    }
    return typeof node === 'object' && typeof node.type === 'string';
}

function isProperty(nodeType, key) {
    return (nodeType === estraverse.Syntax.ObjectExpression || nodeType === estraverse.Syntax.ObjectPattern) && key === 'properties';
}

class Visitor {
    constructor (visitor, options) {
        options = options || {};

        this.__visitor = visitor ||  this;
        this.__childVisitorKeys = options.childVisitorKeys
            ? Object.assign({}, estraverse.VisitorKeys, options.childVisitorKeys)
            : estraverse.VisitorKeys;
        if (options.fallback === 'iteration') {
            this.__fallback = Object.keys;
        } else if (typeof options.fallback === 'function') {
            this.__fallback = options.fallback;
        }
    }

    /* Default method for visiting children.
     * When you need to call default visiting operation inside custom visiting
     * operation, you can use it with `this.visitChildren(node)`.
     */
    visitChildren (node) {
        if (node == null) {
            return;
        }

        const type = node.type || estraverse.Syntax.Property;

        let children = this.__childVisitorKeys[type];
        if (!children) {
            if (this.__fallback) {
                children = this.__fallback(node);
            } else {
                throw new Error(`Unknown node type ${type}.`);
            }
        }

        for (const key of children) {
            const child = node[key];
            if (child) {
                if (Array.isArray(child)) {
                    for (const node of child) {
                        if (node) {
                            if (isNode(node) || isProperty(type, key)) {
                                this.visit(node);
                            }
                        }
                    }
                } else if (isNode(child)) {
                    this.visit(child);
                }
            }
        }
    }

    /* Dispatching node. */
    visit (node) {
        if (node == null) {
            return;
        }

        const type = node.type || estraverse.Syntax.Property;
        if (this.__visitor[type]) {
            this.__visitor[type].call(this, node);
            return;
        }
        this.visitChildren(node);
    }
}

export { Visitor };

export const visit = (node, visitor, options) => {
    const v = new Visitor(visitor, options);
    v.visit(node);
};

/* vim: set sw=4 ts=4 et tw=80 : */
