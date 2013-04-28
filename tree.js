/* Anna Clayton */
/* Stolen from work by Alan Labouseur, based on work
 * by Michael Ardizzone and Tim Smith */
/* April 2013 */
    
    // What type of tree is this? Not using this value yet, but I will eventually.  
    const T_SCOPE = "scope"
    const T_SYNTAX = "syntax"
    
    // What type of branch is this? Applicable to CSTs and ASTs.
    const B_PROGRAM = "program"
    const B_STATEMENT = "statement"
    const B_PRINT = "print"
    const B_ASSIGN = "assign"
    const B_STATEMENTLIST = "statement list"
    const B_EXPR = "expr"
    const B_INTEXPR = "int expr"
    const B_CHAREXPR = "char expr"
    const B_BOOLEXPR = "boolean expr"
    const B_IDEXPR = "ident expr"
    const B_CHARLIST = "charlist"
    const B_DECLARE = "declare"
    const B_DIGIT = "digit"
    const B_OPERAND = "operand"
    const B_EQUALITY = "equals"
    const B_COMPARISON = "comparison"
    const B_IF = "if"
    const B_WHILE = "while"
    
function Tree(treeType) {
    
    this.root = null;  // Note the NULL root node of this tree.
    this.cur = {};     // Note the EMPTY current node of the tree we're building.
    this.treeType = treeType

    /* addNode
     * adds a node to the tree which is assigned the input name.
     * A node is a branch if it has children and a leaf if it doesn't.
     * Children are assigned if a node is designated as this.cur and new nodes are added
     */
    this.addNode = function(name) {
        // Construct the node object.
        //console.log("adding " + name + " to " + this.cur.name)
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
            // know will be leaves. Might as well immediately issue goUp from parser.js for all leaf nodes
            // and not have to specify the node's type here.  
            this.cur = node;
    };

    // Note that we're done with this branch of the tree and go back up to its parent
    this.goUp = function() {
        // ... by moving "up" to our parent node (if possible).
        //console.log("going up from " + this.cur.name + " to " + this.cur.parent.name)
        if ((this.cur.parent !== null) && (this.cur.parent.name !== undefined))
        {
            this.cur = this.cur.parent;
        }
        else
        {
            // This really should not happen, but it will, of course.
            // Since the first time it happened it didn't have any ill affects I don't really care,
            // but should log it anyway.  I expect this to be logged to the console and will only worry about it
            // if things stop working.  
            console.log("goUp was called, but we were already the root! Turns out this isn't the end of the world ... ")
        }
    };
    
        // Return a printable string representation of the tree.  
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
                // There are children, so note these interior/branch nodes.
                // In the future, pay attention to the tree type and print the scope tree a bit differently
                traversalResult += "<" + node.name + "> \n";
                // .. recursively expand the children.
                for (var i = 0; i < node.children.length; i++)
                {
                    expand(node.children[i], depth + 1);
                }
            }
        }
        // Make the initial call to expand from the root.
        if (this.root != null)
            expand(this.root, 0);
        // Return the result.
        return traversalResult;
    };
}
