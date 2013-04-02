//-----------------------------------------
// treeDemo.js
//
// By Alan G. Labouseur, based on the 2009
// work by Michael Ardizzone and Tim Smith.
//-----------------------------------------

    // What type of node is this? Applicable to CSTs only.  
    const K_BRANCH = "branch"
    const K_LEAF = "leaf"
    
    // What type of tree is this?
    const K_SCOPE = "scope"
    const K_CST = "CST"
    
    // What type of branch is this? Applicable to CSTs only.
    const B_PROGRAM = "program"
    const B_STATEMENT = "statement"
    const B_PRINT = "print"
    const B_ASSIGN = "assign"
    const B_STATEMENTLIST = "statement list"
    const B_EXPR = "expr"
    const B_INTEXPR = "int expr"
    const B_CHAREXPR = "char expr"
    const B_IDEXPR = "ident expr"
    const B_CHARLIST = "charlist"
    const B_DECLARE = "declare"
    const B_DIGIT = "digit"
    const B_OPERAND = "operand"
    
    // What type of leaf is this?
    const L_ID = "id"
    const L_CHARLIST = "charlist"
    const L_DIGIT = "digit"
    const L_OPERAND = "operand"
    const L_TYPE = "type"
    
    var Leaf = function(k, v){

    var l = {kind: k, value: v};
    
    l.toString = function(){
	return "" + l.kind + "," + l.value + ""
    }
    
    return l;
}

function Tree() {
    // ----------
    // Attributes
    // ----------
    
    var AST
    
    this.root = null;  // Note the NULL root node of this tree.
    this.cur = {};     // Note the EMPTY current node of the tree we're building.


    // -- ------- --
    // -- Methods --
    // -- ------- --


    this.addNode = function(name) {
        // Construct the node object.
        var node = { name: name,
                     children: [],
                     parent: {}
                   };

        // Check to see if it needs to be the root node.
        if ( (this.root == null) || (!this.root) )
        {
            // We are the root node.
            this.root = node;
        }
        else
        {
            // We are the children.
            // Make our parent the CURrent node...
            node.parent = this.cur;
            // ... and add ourselves (via the unfortunately-named
            // "push" function) to the children array of the current node.
            this.cur.children.push(node);
        }
            // Update the CURrent node pointer to ourselves, regardless of whether we are intended
            // to be a branch or leaf node. Since a node is considered a leaf if it has no children,
            // making the distinction only saves us having to call the goUp function for nodes that we
            // know will be leaves. Might as well issue goUp all the time and not have to specify the
            // node's type here.  
            this.cur = node;
    };

    // Note that we're done with this branch of the tree...
    this.goUp = function() {
        // ... by moving "up" to our parent node (if possible).
        console.log("goUp called from " + this.cur.name + " to " + this.cur.parent.name)
        if ((this.cur.parent !== null) && (this.cur.parent.name !== undefined))
        {
            this.cur = this.cur.parent;
        }
        else
        {
            // This really should not happen, but it will, of course.
            // Since the first time it happened it didn't have any ill affects I don't really care, but should log it anyway.  
            console.log("goUp was called, but we were already the root! Turns out this isn't the end of the world ... ")
        }
    };
    
        this.toString = function() {
        // Initialize the result string.
        var traversalResult = "";

        // Recursive function to handle the expansion of the nodes.
        function expand(node, depth)
        {
            // Space out based on the current depth so
            // this looks at least a little tree-like.
            for (var i = 0; i < depth; i++)
            {
                traversalResult += "-";
            }

            // If there are no children (i.e., leaf nodes)...
            if (!node.children || node.children.length === 0)
            {
                // ... note the leaf node.
                traversalResult += "[" + node.name + "]";
                traversalResult += "\n";
            }
            else
            {
                // There are children, so note these interior/branch nodes and ...
                traversalResult += "<" + node.name + "> \n";
                // .. recursively expand them.
                for (var i = 0; i < node.children.length; i++)
                {
                    expand(node.children[i], depth + 1);
                }
            }
        }
        // Make the initial call to expand from the root.
        expand(this.root, 0);
        // Return the result.
        return traversalResult;
    };
    
    this.findVariableInScope = function(variable) {
	    thisScope = this.cur;
	    while (thisScope.name !== undefined)
	    {
	    if (thisScope.name !== undefined) {	
    	    for (var i = 0; i < thisScope.name.length; i++)
                {
		    if (this.cur.name[i].name == variable) {
			return this.cur.name[i].type
		    }
                }
	    }
		thisScope = this.cur.parent
	    }
	    return null
	}
}
