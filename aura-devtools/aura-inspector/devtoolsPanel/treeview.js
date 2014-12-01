function TreeNode(text, id) {
    var _children = [];
    var _formatter = null;

    // ?
    this.addChild = function(node) {
        _children.push(node);
    };

    this.getId = function() {
        return id;
    };

    this.getChildren = function() {
        return _children;
    };

    this.getLabel = function() {
        if(this.getFormatter()) {
            return this.getFormatter()(this.getRawLabel());
        }
        return this.getRawLabel();
    };

    this.getRawLabel = function() {
        return text;
    };

    this.hasChildren = function() {
        return _children.length > 0;
    };

    this.hasFormatter = function() {
        return !!_formatter;
    };

    this.getFormatter = function() {
        return _formatter;
    };

    this.setFormatter = function(formatter) {
        _formatter = formatter;
    };
}

(function(){

    var formatters = {
        ComponentDefFormatter: function(value){ 
            // Needs Improvement
            // Just not doing now, because component defs are messed in the head.
            return "[[ComponentDef]]" + formatters.ComponentFormatter(value);
        },
        ComponentFormatter: function(value){
            value.tagName = value.tagName.split("://")[1] || value.tagName;
            var pattern = [
                '<span class="component-tagname">&lt;{tagName}</span>'
            ];

            // I doubt this will work once I switch over to google settings, so...
            var defaultOptions = {showGlobalIds: false};
            AuraInspectorOptions.getAll(defaultOptions, function(options){
                if(options.showGlobalIds) {
                    pattern.push(' <span class="component-attribute">globalId</span>="{globalId}"');
                }
            });

            if(value.attributes) {
                var current;
                for(var attr in value.attributes) {
                    if(attr != "body") {
                        current = value.attributes[attr];

                        if(current && Array.isArray(current)) {
                            current = current.length ? '[<i class="component-array-length">' + current.length + '</i>]' : "[]";
                        } else if(current && typeof current === "object") {
                            current = Object.keys(current).length ? "{...}" : "{}"
                        }

                        pattern.push(' <span class="component-attribute">' + attr + '</span>="' + current + '"');
                    }
                }   
            }

            pattern.push("&gt;");
            return format(pattern.join(''), value);
        },
        HtmlComponentFormatter: function(value) {
            value.tagName = value.attributes.tag;
            delete value.attributes.tag;
            var pattern = [
                '<span class="component-tagname">&lt;{tagName}</span>'
            ];

            var defaultOptions = {showGlobalIds: false};
            AuraInspectorOptions.getAll(defaultOptions, function(options){
                if(options.showGlobalIds) {
                    pattern.push(' <span class="component-attribute">globalId</span>="{globalId}"');
                }
            });

            var defaultOptions = {showGlobalIds: false};
            AuraInspectorOptions.getAll(defaultOptions, function(options){
                if(options.showGlobalIds) {
                    pattern.push(' <span class="component-attribute">globalId</span>="{globalId}"');
                }
            });

            if(value.attributes["aura:id"]) {
                pattern.push(' <span class="component-attribute">aura:id</span>="' + value.attributes["aura:id"] + '"');
                for(var attr in value.attributes.HTMLAttributes) {
                    pattern.push(' <span class="component-attribute">' + attr + '</span>="' + value.attributes.HTMLAttributes[attr] + '"');
                }   
            }

            pattern.push("&gt;");
            return format(pattern.join(''), value);
        },
        TextComponentFormatter: function(value) {
            var text = value.attributes.value;
            // Whats the point of returning empty text nodes anyway?
            // Should probably show /n for carriage returns
            if(!text || text.trim().length == 0) {
                text = '&quot;&quot;';
            } else {
                text = "&quot;" + text + "&quot;";
            }
            return text;
        },
        ExpressionComponentFormatter: function(value) {
            return value.attributes.value;
        },
        KeyValueFormatter: function(config){
            var value = config.value;
            if(value && value.toString().indexOf("function (") === 0 || typeof value === "function"){
                value = formatters.FunctionFormatter(value);
            }

            if(typeof value === "string" && value.trim().length === 0) {
                value = "&quot;" + value + "&quot;";
            } else if(value && Array.isArray(value)) {
                value = value.length ? '[<i class="component-array-length">' + value.length + "</i>]" : "[]";
            } else if(value && typeof value === "object") {
                // {...} if it has content
                // {} if it is empty
                value = Object.keys(value).length ? "{...}" : "{}"
            }

            config.value = value+"";

            return format('<span class="component-property">{key}</span>:<span class="component-property-value">{value}</span>', config);
        },
        PropertyFormatter: function(value){ 
            return '<span class="component-property">' + value + '</span>';
        },
        FunctionFormatter: function(value){
            return '<span>function(){...}</span>';
        },
        FacetFormatter: function(value){
            return '<span class="component-property">' + value.property + '</span>:' + formatters.ComponentFormatter(value);
        },
        Header: function(value) {
            return '<h3>' + value + '</h3>';
        }
    };

    function format(str, o) {
        return str.replace(
            /\{([^{}]*)\}/g,
            function (a, b) {
                var r = o[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            }
        );
    }

    // Factory for creating known types of TreeNodes with their known formatters.
    TreeNode.create = function(data, id, format) {
        var node = new TreeNode(data, id);

        switch(format) {
            case "aura:html": 
                node.setFormatter(formatters.HtmlComponentFormatter);
                break;
            case "aura:text": 
                node.setFormatter(formatters.TextComponentFormatter);
                break;
            case "aura:expression": 
                node.setFormatter(formatters.ExpressionComponentFormatter);
                break;
            case "component":
                node.setFormatter(formatters.ComponentFormatter);
                break;
            case "componentdef": 
                node.setFormatter(formatters.ComponentDefFormatter);
                break;
            case "header":
                node.setFormatter(formatters.Header);
                break;
            case "keyvalue":
                node.setFormatter(formatters.KeyValueFormatter);
                break;
        }

        return node;
    };

    /* 
     * Very SFDC specific. Takes a config def, and returns simply the node with the proper formatting.
     */
    TreeNode.parse = function(config) {
        if(!config) {
            return new TreeNode();
        }

        var id = config.globalId || "";
        var attributes = {
            globalId: id,
            attributes: {}
        };

        if(config.localId) {
            attributes.attributes["aura:id"] = config.localId;
        }
        
        var body = [];

        if(config.attributes) {
            for(var property in config.attributes) {
                if(!config.attributes.hasOwnProperty(property)) { continue; }

                if(config.expressions && config.expressions.hasOwnProperty(property)) {
                    attributes.attributes[property] = config.expressions[property];
                } else {
                    attributes.attributes[property] = config.attributes[property];
                }
            }
        }

        var node;

        // is Html?
        if(config.descriptor==="markup://aura:html") {
            attributes.tagName = config.descriptor;
            node = TreeNode.create(attributes, id, "aura:html");
        } else if(config.descriptor==="markup://aura:text") {
            attributes.tagName = config.descriptor;
            node = TreeNode.create(attributes, id, "aura:text");
        } else if(config.descriptor==="markup://aura:expression") {                    
            attributes.tagName = config.descriptor;
            node = TreeNode.create(attributes, id, "aura:expression");
        } else if(config.globalId) {
            attributes.tagName = config.descriptor;
            node = TreeNode.create(attributes, id, "component");
        } else if(config.componentDef) {
            // TODO: Component Defs are broken
            attributes.tagName = config.componentDef.descriptor;
            node = TreeNode.create(attributes, id, "componentdef");
        }

        return node;
    };

})();

function AuraInspectorTreeView() {
    var _children = [];
    var _childrenIndex = new Map();
    var events = new Map();
    var htmlToTreeNode = new WeakMap();

    this.addChild = function(child) {
        _children.push(child);
    };

    this.addChildren = function(children) {
        _children = _children.concat(children);
    };

    this.getChildren = function () {
        return _children;
    };

    this.clearChildren = function() {
        _children = [];
        _childrenIndex = new Map();
    };

    this.render = function(div) {
        var container = document.createElement("ul");
            container.className = "tree-view";
        div.innerHTML = "";
        
        try {
            for(var c=0;c<_children.length;c++) {
                container.appendChild(renderNode(_children[c]));
            }

            if(div) {
               div.appendChild(container);
            }

            // Events
            container.addEventListener("mouseout", Container_MouseOut.bind(this));
            container.addEventListener("mouseover", Container_MouseOver.bind(this));
            container.addEventListener("click", Container_Click.bind(this));
        } catch(e) {
            alert([e.message, e.stack]);
        }

        return container;
    };

    this.attach = function(eventName, eventHandler) {
        if(!events.has(eventName)) {
            events.set(eventName, new Set());
        }
        events.get(eventName).add(eventHandler);
    };

    this.notify = function(eventName, data) {
         if(events.has(eventName)) {
            var eventInfo = { "data": data };
            events.get(eventName).forEach(function(item){
                item(eventInfo);
            });
         }
    };

    /* Event Handlers */
    function Container_MouseOut(event) {
        if(event.target == event.srcElement) {
            this.notify("onhoverout", { domNode: event.target });
        }
    }

    function Container_MouseOver(event) {
        // LI?s2d
        var nodeClass = "tree-view-node";
        var target = event.target;
        while(target && target.parentNode && target.className != nodeClass) {
            target = target.parentNode;
        }
        // We hovered a list item
        if(target && target.parentNode && target.classList.contains(nodeClass)) {
            var li = target.parentNode;
            this.notify("onhover", { domNode: li, treeNode: htmlToTreeNode.get(li) });
        }
    }

    function Container_Click(event) {
        // LI?
        var nodeClass = "tree-view-node";
        var target = event.target;
        while(target && target.parentNode && target.className != nodeClass) {
            target = target.parentNode;
        }
        // We hovered a list item
        if(target && target.parentNode && target.classList.contains(nodeClass)) {
            var li = target.parentNode;
            this.notify("onselect", { domNode: li, treeNode: htmlToTreeNode.get(li) });
        }
    }

    /* Private Methods */
    function renderNode(node) {
        var span = document.createElement("span");
            span.className = "tree-view-node";
        var li = document.createElement("li");
            li.appendChild(span);

        // if(node.getId() && _childrenIndex.has(node.getId())) {
        //     // Circular Reference
        //     var label = node.getLabel() + " [[ReferenceTo]]";
        //     if(node.hasFormatter()) {
        //         span.innerHTML = label;
        //     } else {
        //         span.appendChild(document.createTextNode(label));
        //     }
        // } else {
            if(node.hasFormatter()) {
                span.innerHTML = node.getLabel();
            } else {
                span.appendChild(document.createTextNode(node.getLabel()));
            }
            _childrenIndex.set(node.getId(), node);

            if(node.hasChildren()) {
                // Add Expand box
                var ul = document.createElement("ul");

                var children = node.getChildren();
                for(var c=0;c<children.length;c++) {
                    ul.appendChild(renderNode(children[c]));
                }

                li.appendChild(ul);
            }

        // }

        htmlToTreeNode.set(li, node);
        return li;
    }
}