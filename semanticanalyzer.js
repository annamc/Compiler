/* Anna Clayton */
/* May 2013 */
/* semanticanalyzer.js  */

    /* Variables to track:
     * - Number of errors and warnings found
     * - Final results of the entire parse phase
     * - Arrays of all warnings and errors found
     * - The scope tree
     * All of these variables are initialized at the beginning of the checkScopeAndType function */
    var numErrors
    var numWarnings
    var results
    var warnings
    var errors
    var Scope

    function checkScopeAndType() {
        
        // Initialize
	errors = new Array()
	warnings = new Array()
	Scope = new Tree(T_SCOPE);

	numErrors = 0
	numWarnings = 0
        
        /* First message on array will be changed after parse to indicate if errors were found.  
	Leave a spot for it to avoid having to shuffle the results array when parse is done */
	results.push(null)
	
	/* Ready to go! */
        /* Build the scope tree table */
	Scope = ASTtoScope(AST)
        /* and check it for errors/warnings */
        CheckForScopeWarnings()
	
	/* If an error was encountered, fill in that first array element (the one that was null) with
	 * the "errors were found" constant. Push an element on the array at the end to indicate the
	 * total number of errors found. */
	if (numErrors > 0) {
	    results[0] = eErrorsFound
	    /* Sorry, I'm a grammar nut :-)  Couldn't stand the "1 semantic errors" and didn't want to
	     * cheat by using "error(s)" */
	    if (numErrors == 1)
		error("\n" + numErrors + " semantic error found.")
	    else
		error("\n" + numErrors + " semantic errors found.")
	    if (numWarnings == 1)
		warn("\n" + numWarnings + " warnings issued.")
	    else
		warn("\n" + numWarnings + " warnings issued.")
	}
	/* Return a pile of stuff to the caller. The caller knows what to do with all this */
	return { errors : errors, warnings : warnings, Scope : Scope}
    }
    /* ASTtoScope is called after the AST is built to create a Scope tree.  Scope checking (lexical analysis) is done along the way */
    ASTtoScope = function(AST) {
	// Initialize, and specify that this tree is a scope tree.  I might eventually use this fact for something ..
        Scope = new Tree(T_SCOPE)
	
	/* scanAST is going to recursively scan through the AST (who is scared of recursion now?!),
	 * build a symbol table with scope data, and do scope checking.
	 * This function does some pre-processing and some post-processing to correctly
	 * build/navigate the symbol table.  */
	scanAST = function(node) {
	    // Here's the pre-processing.  This is done as each node is encountered, BEFORE the node is processed
	    switch(true) {
		// If we've found a statement list node (and haven't recursed it yet),
		// then add a new scope table (it's an associative array) to the scope tree
		case (node.name == B_STATEMENTLIST): {
		    Scope.addNode(new Array())
		    break;
		}
		// If we've found a declare node, then check to make sure the variable being
		// declared isn't already declared in this scope and if not, add it to the symbol table
		case (node.name == B_DECLARE): {
		    // The only way Scope.root could be null is if there is no statement list, therefore this
		    // declare statement is the only statement of the program.
		    // Not much point adding it since nothing will be done with it, but we might as well anyway.
		    // But first, we need a symbol table ...
		    if (Scope.root == null)
			Scope.addNode(new Array());
		    // Check to see if the current scope already has the variable defined
		    var foundRedefine = false
		    // Go through all symbols in the current scope as long as we haven't discovered an
		    // attempt to redefine a variable
		    for (var i = 0; i < Scope.cur.name.length && foundRedefine == false; i++) {
			// If there's a symbol already in the scope table with the same name,
			// then issue an error message and stop the scan through the current scope
			if (Scope.cur.name[i].name == node.children[1].name.value) {
			    error("  Found variable redeclaration for variable " + node.children[1].name.value + " on line " + node.children[1].name.loc +
				  ". The variable was originally declared as " + Scope.cur.name[i].type + " on line " + Scope.cur.name[i].declareAt)
			    foundRedefine = true
			}
                    } // End scan through current scope
		    // If the variable being defined isn't already in the scope, add it
		    if (foundRedefine == false) {
			Scope.cur.name.push(new Symbol(node.children[1].name.value, node.children[0].name.value,node.children[1].name.loc))
		    }
		    break;
		}
		// If we've found an assign node, then check to make sure the identifier being assigned is in the current scope
		// and make sure the value or expression being assigned to the identifier is the right type
		case (node.name == B_ASSIGN): {
		    debug("assign " + node.children[0].name.value)
		    thisSymbol = findVariableInScope(node.children[0].name.value)
		    if (thisSymbol == null)
			error("Variable "+ node.children[0].name.value + " assigned a value on line " + node.children[0].name.loc + " but it is not defined in the current scope")
		    else {
			thisSymbol.initAt = node.children[0].name.loc
			thisType = thisSymbol.type
                        foundType = checkType(thisType,node.children[1])
			if (foundType != thisType)
			    error("Variable " + node.children[0].name.value + " assigned a value that was an incompatible type on line " + node.children[1].name.loc + ". Expected " + thisType + ", found " + foundType +  ".")
		    }
		    break;
		}
		// If we've found a print node, then check to make sure any identifier being printed has been declared and initialized
		case (node.name == B_PRINT): {
    		    foundType = checkType(K_ANYTYPE,node.children[0])
		    // if foundType is null, then the checkType method found something illegal, like digit + string
		    if (foundType == null)
			error("Dude, you can't print that!")
                    break;    
		}
		// If we've found a while or if node, then check to make sure the boolean expression is really a boolean expression
		case (node.name == B_WHILE || node.name == B_IF): {
    		    foundType = checkType(K_BOOLEAN,node.children[0])
		    if (foundType != K_BOOLEAN)
			error("Dude, you can't use that as a boolean expression!")
                    // If the programmer did something stupid like "while true {}" or "while false {}" give them a friendly warning. 
                    // Lots of other error checking could be done for possible/probable infinite loops, but this one comes almost for free.  
                    if (node.name == B_WHILE && node.children[0].name.kind == K_BOOLVAL && node.children[0].name.value == K_TRUE)
                        warn("You, my friend, are going to end up with an infinite loop at line " + node.children[0].name.loc)	
                    break;
		}                
		default:
		    break;
	    } // End pre-order switch statement
	    
	    // Now, traverse the AST.
	    // If:
	    // - there are no children (nothing more to traverse)
	    // - the current node is a print node (the only thing to traverse is the expression being printed, which was already done)
	    // - the current node is an assign node (the only thing to traverse is the target and value of the assign, which have already been checked)
	    // - the current node is a declare node (the only thing to traverse is the identifier and type, which have already been checked)
	    // Then return
            if (!node.children || node.children.length === 0 ||
		node.name == B_PRINT ||
		 node.name == B_ASSIGN ||
		 node.name == B_DECLARE)
                return
            // Else there are children, so traverse them to build the scope tree and do semantic analysis
            for (var i = 0; i < node.children.length; i++)
                scanAST(node.children[i]);

	    // In addition to the pre-order processing, we also need to do a bit of work when we get to the end of processing an AST node
	    switch(true) {
		// If we just processed a statement list (and all of its children),
		// then we want to close out that statement list's scope. 
		case (node.name == B_STATEMENTLIST): {
		    if (Scope.cur != Scope.root)
			Scope.goUp()
		    break;
		}
		default:
		    break;
	    } // End post-order switch statement
	} // End scanAST function within ASTtoScope()
	    
	// Call scanAST beginning at the root of the AST to build a symbol table tree and do semantic analysis. Cross your fingers ...     
	scanAST(AST.root)
	// Return the scope table tree (regardless of whether or not errors were encountered)
        return Scope
    } // End of ASTtoScope()
    
    /* CheckForScopeWarnings is called by the parse() function after the program is parsed and CST is built,
       AST is built, and scope tree is built (where lexical analysis is done). This function checks for things
       that won't cause parse to fail, but will cause warnings to be issued. Checked are:
        - Declared but never initialized or used
        - Declared and initialized but never used
        - Declared and used but never initialized */
    CheckForScopeWarnings = function() {
	
	/* checkScope function is withing CheckForScopeWarnings which is called recursively as
	 * the scope table is checked for warning conditions */
	checkScope = function(node) {
	    // Check each symbol in the table of the current node of the scope
	    for (var s = 0; s < node.name.length; s++) {
		if (node.name[s].usedAt == 0 && node.name[s].initAt == 0)
		    warn(node.name[s].name + " was declared at line " + node.name[s].declareAt + " but was never assigned a value or used ")
		else if (node.name[s].usedAt == 0)	
		    warn(node.name[s].name + " was declared at line " + node.name[s].declareAt + " and last assigned at line " + node.name[s].initAt + " but was never used ")
	    }
		
	    // Now, traverse the scope table tree.
	    // If there are no children, then return
            if (!node.children || node.children.length === 0)
                return
            // Else there are children, so traverse them to check the scope
            for (var i = 0; i < node.children.length; i++)
                checkScope(node.children[i]);
	} // End checkScope function within CheckForScopeWarnings()
	    
	// If there is a scope tree (there might not be if no identifiers were used by the program) then
	// call checkScope starting with the root of the scope tree
	if (Scope.root != null)  
	    checkScope(Scope.root) 
        return 
    } // End of CheckForScopeWarnings()
    
    /* checkType is called as part of lexical analysis when a print or assign statement is seen. It does type
     * checking on the expression being printed or assigned to make sure the types are kosher */
    checkType = function(expType,node) {
	
	// 3 cases:
	//	- expType = K_STRING
	//		node is an identifier
	//			type must be string
	//		node is a charlist
	//			yay
	//	- expType = K_INT
	//		node is an identifier
	//			type must be int
	//		node is a digit
	//			yay
	//		or
	//		node is an operator with 2 children
	//			call checkType expecting an int on each child
	//	- expType = any
	//		node is a leaf
	//			type doesn't matter
	//		or
	//		node is an operator with 2 children
	//			call checkType expecting an int on each child
	switch (expType) {
	    case (K_STRING):
		if (node.name.kind == K_STRING)
		    return K_STRING
		else if (node.name.kind == K_ID && findVariableInScope(node.name.value) !== null && findVariableInScope(node.name.value).type == K_STRING) {
		    thisSymbol = findVariableInScope(node.name.value)
		    if (thisSymbol == null) {
			error("Identifier " + node.name.value + " was used at line " + node.name.loc + " but has not been declared! ")
			return K_UNDECLAREDID
		    }
		    else if (thisSymbol.initAt == 0) {
			warn(thisSymbol.name + " was used at line " + node.name.loc + " but was not yet initialized ")
		    }
		    thisSymbol.usedAt = node.name.loc
		    return K_STRING
		}
		break;
	    case (K_INT):
		if (node.name.kind == K_DIGIT)
		    return K_INT
		thisSymbol = findVariableInScope(node.name.value)
		if (node.name.kind == K_ID && thisSymbol == null) {
		    error("Identifier " + node.name.value + " was used at line " + node.name.loc + " but has not been declared! ")
		    return K_UNDECLAREDID
		}
		else if (node.name.kind == K_ID && thisSymbol.type == K_INT) {
		    	if (thisSymbol.initAt == 0) {
			    warn(thisSymbol.name + " was used at line " + node.name.loc + " but was not yet initialized ")
			}
		    thisSymbol.usedAt = node.name.loc
		    return K_INT
		}
		else if (node.name.kind == K_OPERAND) {
                    child1 = checkType(K_INT,node.children[0])
                    child2 = checkType(K_INT,node.children[1])
                    if (child1 != K_INT)
                        return child1
                    else if (child2 != K_INT)
                        return child2
                    else
                        return K_INT
                }
		break;
            case (K_BOOLEAN):
                if (node.name.kind == K_BOOLVAL)
                    return K_BOOLEAN
                thisSymbol = findVariableInScope(node.name.value)
                if (node.name.kind == K_ID && thisSymbol == null) {
		    error("Identifier " + node.name.value + " was used at line " + node.name.loc + " but has not been declared! ")
		    return K_UNDECLAREDED
		}
                else if (node.name.kind == K_ID && thisSymbol.type == K_BOOLEAN) {
		    	if (thisSymbol.initAt == 0) {
			    warn(thisSymbol.name + " was used at line " + node.name.loc + " but was not yet initialized ")
			}
		    thisSymbol.usedAt = node.name.loc
		    return K_BOOLEAN
		} 
                else if (node.name.kind == K_COMPARISON) {
                    child1 = checkType(K_ANYTYPE,node.children[0])
                    child2 = checkType(K_ANYTYPE,node.children[1])
                    if ((child1 == child2) && (child1 != K_STRING)) {
                        return K_BOOLEAN
                    }
		    if (((child1==K_COMPARISON) && child2 == K_BOOLEAN) || (child1 == K_BOOLEAN && child2 == K_COMPARISON))
			return K_BOOLEAN
                    else if ((child1 == K_STRING) && child2 == K_STRING)
                        return "illegal string comparison"
                    else
                        return "comparison between incompatible types"
                }
                break;
	    case (K_ANYTYPE):
		if (!node.children || node.children.length === 0) {
		    if (node.name.kind == K_ID) {
			thisSymbol = findVariableInScope(node.name.value)
			if (thisSymbol == null) {
			    error("Identifier " + node.name.value + " was used at line " + node.name.loc + " but has not been declared! ")
			    return K_UNDECLAREDID
			}
			else if (thisSymbol.initAt == 0) {
			    warn(thisSymbol.name + " was used at line " + node.name.loc + " but was not yet initialized ")
			}
			thisSymbol.usedAt = node.name.loc
                        return thisSymbol.type
		    }
                    if (node.name.kind == K_DIGIT)
                        return K_INT
                    if (node.name.kind == K_BOOLVAL)
                        return K_BOOLEAN
		    return node.name.kind
		}
		else if (node.name.kind == K_OPERAND) {
		    var child1 = checkType(K_INT,node.children[0])
		    var child2 = checkType(K_INT,node.children[1])
                    if ((child1 == child2) && (child1 == K_INT))
                        return K_INT
                    else
                        return null
		}
                else if (node.name == K_EQUALITY) {
		    var child1 = checkType(K_ANYTYPE,node.children[0])
		    var child2 = checkType(K_ANYTYPE,node.children[1])
                    if ((child1 == child2) && (child1 != K_STRING))
                        return K_BOOLEAN
                    else
                        return null
		}
		break;
	    default:
		error("Fatal error! Can't get there from here") 
		break;
	}
        if (node.name.kind == K_OPERAND)
            return K_INT
        else if (node.name.kind != K_ID)
            return node.name.kind // if the end of the function is reached and we haven't found a valid type, then the type
		     // must be invalid, so return whatever it is which won't match what is expected.
        else {
            return findVariableInScope(node.name.value).type
        }
    }
    
    /* findVariableInScope is called to check the current scope for a given variable name.  */
    findVariableInScope = function(variable) {
	// Start at the current node of the scope table
	thisScope = Scope.cur
	// If there is no scope table, return null
	if (thisScope == {})
	    return null
	// Do while there are still parent nodes of the scope tree to check
	while (thisScope.name !== undefined) {
	    if (thisScope.name !== undefined) {
		// Check each symbol in the symbol table at this scope tree node and if we find the
		// one being looked for, return it
		for (var i = 0; i < thisScope.name.length; i++) {
		    if (thisScope.name[i].name == variable) {
			return thisScope.name[i]
		    }
		}
	    }
	    // Set the pointer for this function to the parent node and check the parent node for the variable
	    // being looked for
	    thisScope = thisScope.parent
	}
	// If we get to the root node of the scope tree and haven't found the variable, return null
	return null
    }
    
    /* Push a message to errors and increment numErrors */
    function error(msg) {
	errors.push(msg)
	numErrors = numErrors + 1
    }
    
    /* Push a message to warnings and increment numWarnings */
    function warn(msg) {
	warnings.push(msg)
	numWarnings = numWarnings + 1
    }
    