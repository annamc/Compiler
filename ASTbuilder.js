/* Anna Clayton */
/* May 2013 */
/* ASTbuilder.js  */ 
 
 
    /* CSTtoAST is a function that creates an AST based on the CST (which was built during the parse phase) */	
    CSTtoAST = function(CST) {
	// Initialize AST
        AST = new Tree()

	/* buildAST is a function called from CSTtoAST that is recursive. It traverses through the CST and
	 * adds nodes to the AST as appropriate */
	buildAST = function(node) {
        
	    /* Add a node to the AST whenever a node on the CST is encountered that is:
	     * 	1. A statement list
	     * 		This serves as the "root" for the AST nodes describing each statement within the statement list
	     * 		The statement list node of the AST has as many children as there are statements in the list
	     * 	2. A print statement
	     * 		This serves as the "root" for the AST nodes describing what is to be printed
	     * 		The print node of the AST has one child
	     * 	3. An assign statement
	     * 		This serves as the "root" for the AST nodes describing what value will be assigned to what identifier
	     * 		The assign node of the AST will have two children
	     * 	4. A declare statement
	     * 		This serves as the "root" for the AST nodes describing a variable declaration
	     * 		The declare node of the AST will have two children
	     *  5. A while statement
	     *  	This serves as the "root" for the AST nodes describing a while statement
	     * 		The while node of the AST will have two children (condition + block)
	     *  6. An if statement
	     *  	This serves as the "root" for the AST nodes describing an if statement
	     * 		The if node of the AST will have two children (condition + block)
	     * 	7. An int expression
	     * 		Int expression is a weird one. It will originally be given a node on the AST and will have either
	     * 			1 child: IntExpr ::== digit
	     * 			3 children: IntExpr ::== digit op expr
	     * 		Later the code goes back to optimize and get rid of the int expression nodes.
	     * 			If the int expression had one child:
	     * 				Set the child's parent to the node's parent
	     * 				Remove the node from the node's parents children
	     * 				Add the child to the node's parents children
	     * 			If the int expression had three children:
	     * 				Set the parent of the "middle child" (the operator) to the node's parent
	     * 				Set the parent of the "eldest" and "youngest" (the operands) to the "middle child"
	     * 				Remove the node from the node's parents children
	     * 				Add the "middle child" to the node's parents children
	     *  		The end result is that there is no intexpr node (either the grandparent links to the only child OR
	     *  		the grandparent links to the middle child and the other two children link to the middle child)
	     *  	WHY!??! Because I wanted to create the behavior where the operands are children of the operator and
	     *  	during the first pass it was easier to make all 3 children of "intexpr" rather than try to look
	     *  	ahead and see if an intexpr is gonna have one child or three.  If I can work all the buggies out,
	     *  	this is the method that will be used. Note: I found and eliminated all the bugs!  This actually works!
	     *  8. A bool expression
	     *          Bool expression has the same weirdness as int expr. It will have 1 or 3 children:
	     *          	1 child: BooleanExpr ::== boolval
	     *          	3 children: BooleanExpr ::== ( expr condition [always == for now] expr )
	     *
	     *          Same rules apply for bool expression as int expression	
	     *
	     *  	A further note: Since the addNode function always changes Tree.cur to the currently added node (I did
	     *  	away with denoting them as branch or leaf nodes when they are added, see tree.js for an explanation) I
	     *  	need to call AST.goUp for anything I know is a leaf node (no children in the CST).
	     *  	HOWEVER, I don't call AST.goUp for children of an intexpr (or boolexpr), because I want to make sure the children are
	     *  	on the same level in the tree. Since I call AST.goUp later, I don't call it here.  
	     *
	     *  	Another comment: building the AST nodes is "preprocessing" with regard to how the CST is being traversed.  
	     * 	*/
	    if (node.name == B_STATEMENTLIST ||
		node.name == B_PRINT ||
		node.name == B_ASSIGN ||
		node.name == B_DECLARE ||
		node.name == B_WHILE ||
		node.name == B_IF ||
		node.name == B_INTEXPR ||
		node.name == B_BOOLEXPR ||
		node.children.length == 0) {
		    AST.addNode(node.name)
		    if (node.children.length == 0) {
			AST.goUp()
		    }
	    }

	    // Now for traversing the CST: 
	    // If there are no children (i.e. this is a leaf node [which is why I did away with declaring the node as a branch or a
	    // leaf at the time it is added to the tree -- the traversal process doesn't look at the node type, it only looks at whether
	    // or not it has any children]) ...
	    // Anyway, if there are no children, return.  
            if (!node.children || node.children.length === 0)
                return
            // Else there are children, so traverse them to build the AST
            for (var i = 0; i < node.children.length; i++) 
                buildAST(node.children[i]);
            
	    // Now back to building the AST. If we just got done with a CST statement list, print, assign, or declare and we're not currently
	    // at the root of the AST, call AST.goUp
	    if ((node.name == B_STATEMENTLIST ||
		node.name == B_PRINT ||
		node.name == B_ASSIGN ||
		node.name == B_INTEXPR ||
		node.name == B_BOOLEXPR ||
		node.name == B_DECLARE) &&
		AST.cur != AST.root) {
		    AST.goUp()
	    }
	}	// Whew! Here's the end of the buildAST function.  
    
	/* cleanAST is a function called from CSTtoAST that is recursive. It traverses through the newly created AST and
	 * removes  a few nodes (the intexpr ones -- see the comment above regarding intexpr */
        cleanAST = function(node) {
	    
	    // No preprocessing, all changes are made AFTER traversing each node. So with no further ado, traverse the AST
	    // If there are no children (i.e. this is a leaf node) then return
            if (!node.children || node.children.length === 0)
                return
            // .. else there are children, so traverse them to analyze and modify the AST
            for (var i = 0; i < node.children.length; i++)
            {
                cleanAST(node.children[i]);
            }

	    // Here's where stuff gets done.
	    // If an intexpr node is encountered and it has one child (so it is a case of IntExpr ::== digit or BooleanExpr ::== boolval) then
	    // 1. remove the node from the parent's children
	    // 2. push the child to the parent's children
	    // 3. set the parent of the child to the parent node's parent
	    if ((node.name == B_INTEXPR || node.name == B_BOOLEXPR) && node.children.length == 1) {
		position = node.parent.children.indexOf(node)
		node.parent.children.splice(position, 1, node.children[0]);
		node.children[0].parent = node.parent
	    }
	    
	    // If an intexpr or boolexpr node is encountered and it has three children (IntExpr ::== digit op expr or BooleanExpr ::== ( expr == expr )) then
	    //   (and note that the expr part of this might branch further)
	    // 1. remove the node from the parent's children
	    // 2. push the "middle child" to the parent's children
	    // 3. Set the parent of the "middle child" to the node's parent
	    // 4. Set the parent of each of the "eldest child" and "youngest child" to the middle child
	    // 5. Add the "eldest child" and "youngest child" as children of the "middle child"
	    // 6. Cross fingers and hope that all worked as expected
	    if ((node.name == B_INTEXPR || node.name == B_BOOLEXPR) && node.children.length == 3) {
		position = node.parent.children.indexOf(node)
		node.parent.children.splice(position,1,node.children[1])
		node.children[1].parent = node.parent
		node.children[0].parent = node.children[1]
		node.children[2].parent = node.children[1]
		node.children[1].children.push(node.children[0])
		node.children[1].children.push(node.children[2])
	    }
	    
	} // Oh look! Here's the end of the cleanAST function
    
	
	// Build the AST starting at the root of the CST
        buildAST(CST.root)
	// Clean the AST starting at its root
	cleanAST(AST.root)
        return AST
    } // End of CSTtoAST()