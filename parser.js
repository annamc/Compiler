/* Anna Clayton */
/* February 2013 */
/* parser.js  */


	
    /* Index of the token currently being processed */	
    var tokenIndex = 0;
    /* Objects to represent the current token and the last one encountered */
    var lastToken = new Token();
    var thisToken = new Token();
	
	
    var numErrors
    var results
    var Scope
    var CST
    var AST
	
    charlist = "";
	
    /* Symbol. So far a symbol has a name, a type, and a number.
     * Later it'll have more fun stuff like scope and usage */
    var Symbol = function(n, t, symnum){
	// Keep a count of symbols
	if (Symbol.counter == undefined) 
	    Symbol.counter = 0;
	else 
	    Symbol.counter++;
    
	var s = {name: n, type: t, symnum: Symbol.counter};
    
	s.toString = function(){
	    return "<" + s.name + " : "+s.type+">";
	}
	return s;
    }


    /* Create a fake Symbol in order to define Symbol.counter */
    setSymbolCounter = new Symbol("fake name","fake type")

	/* Parse
	 * Initializes variables, then calls parseProgram to kick off the parser.
	 * Puts an indication of how many errors were found in the results, then
	 * returns results to the called (compiler.html) */
         function parse() {

	    results = new Array();
	    Scope = new Tree();
	    CST = new Tree();
	    AST = new Tree();
    
	    tokenIndex = 0
	    numErrors = 0
	    
	    /* 2nd and subsequent times this proc is called, want to reset the symbol table counter */
	    if (Symbol.counter)
		Symbol.counter = 
		
	    /* First message on array will be changed after parse to indicate if errors were found.  
	    Leave a spot for it to avoid having to shuffle the results array when parse is done */
	    results.push(null)
	    
	    /* Ready to go! */
	    parseProgram()

	    AST = CSTtoAST(CST)
	    Scope = ASTtoScope(AST)
	    	    /* If an error was encountered, fill in that first array element (the one that was null) with
	     * the "errors were found" constant. Push an element on the array at the end to indicate the
	     * total number of errors found. */
	    if (numErrors > 0) {
		results[0] = eErrorsFound
		/* Sorry, I'm a grammar nut :-)  Couldn't stand the "1 parse errors" and didn't want to
		 * cheat by using "error(s)" */
		if (numErrors == 1)
		    say("\n" + numErrors + " parse error found.")
		else
		    say("\n" + numErrors + " parse errors found.")
	    }
	    return { results : results, CST : CST , AST: AST , Scope : Scope}
	}
	
	/* Parse program
	 * Program	::== Statement $
	 * parseProgram unconditionally calls parseStatement, then matches on
	 * the K_DOLLAR EOF indicator token. */
	function parseProgram() {
	    //say("Parsing Program");
	    CST.addNode(B_PROGRAM)
	    parseStatement()
	    match(K_DOLLAR)
	    CST.goUp()
	    return
	}
	
	/* Parse statement
	 * Statement	::== P( Expr )
	 * 		::== Id = Expr
	 * 		::== Type Id
	 * 		::== { StatementList }
	 * parseStatement is called from several places:
	 * 	- parseProgram, to kick off parsing the entire program
	 * 	- parseStatementList, to parse the next statement that was encountered
	 *  parseStatement consumes a token and matches it to one of 4 expected, then
	 *  invokes the function to process whatever statement type was encountered:
	 *  	- K_PRINT: parsePrintStatement
	 *  	- K_ID: parseAssignStatement
	 *  	- K_TYPE: parseVarDecl
	 *  	- K_LBRACKET: parseStatementList
	 *  The functions called by parseStatement are aware that the K_PRINT, K_ID,
	 *  K_TYPE, OR K_LBRACKET token have already been consumed. */
	function parseStatement() {
	    //debug("Parsing Statement");
	    CST.addNode(B_STATEMENT)
	    matchMany([K_PRINT,K_ID,K_TYPE,K_LBRACKET]);
	    switch (true) {
		case (thisToken.kind == K_PRINT): {
		    parsePrintStatement()
		    break
		}
		case (thisToken.kind == K_ID): {
		    parseAssignStatement()
		    break
		}
		case (thisToken.kind == K_TYPE): {
		    parseVarDecl()
		    break
		}
		case (thisToken.kind == K_LBRACKET): {
		    CST.addNode(B_STATEMENTLIST)
		    // Here's where I would add a node to the CST for the left bracket, if I wanted to have to deal with it.
		    // The bracket exists to make the programmer's intent (following is a block of statements that define a scope) clear.
		    // The fact is that this is a concrete syntax TREE instead of a concrete syntax LIST or a concrete syntax QUEUE or STACK or some other
		    // data structure that doesn't show the structure of the program.
		    // Just so I don't have to say so later ... same thing for the parentheses around the expression that's the target of print. They add nothing.
		    // And since my CST to AST function assumes that all leaf nodes should belong to the AST they require some special-casing there. Pain.  
		    parseStatementList()
		    // And here's where I would add a node for the right bracket to the CST. It would only screw things up later. Let's leave it off.  
		    break
		}
		default:
		   ;
	    }
	    CST.goUp()
	    return
	}
	
	/* Parse print assignment
	 * P( Expr )
	 * parsePrintStatement is called by parseStatement when a Print operation
	 * has been encountered (the P has been consumed). */
	function parsePrintStatement() {
	    //say("Parsing Print Statement")
	    CST.addNode(B_PRINT)
	    match(K_LPAREN)
	    parseExpr()
	    match(K_RPAREN)
	    CST.goUp()
	    return
	}
	
	/* Parse assignment statement
	 * Id = Expr
	 * parseAssignStatement is called by parseStatement when an identifier
	 * has been encountered (the identifier has been consumed). */ 
	function parseAssignStatement() {
	    //say("Parsing Assign Statement")
	    CST.addNode(B_ASSIGN)
	    CST.addNode(new Leaf(L_ID,thisToken.value))
	    CST.goUp()
	    match(K_EQUAL)
	    parseExpr()
	    CST.goUp()
	    return
	}
	
	/* Parse statement list
	 * StatementList	::== Statement StatementList
	 * 			::== <epsilon>
	 *  parseStatementList is called by parseStatement when a left brace
	 *  has been encountered (the brace itself has already been consumed).
	 *  parseStatementList checks to see if the end of the brackets have
	 *  been encountered or an unexpected end of file is seen. If neither
	 *  of these cases is true, then parseStatement is called to parse
	 *  the next statement, then parseStatementList is recursed to check and
	 *  see if another statement is there or if the end of statement list/EOF
	 *  is found. */
	function parseStatementList() {
	    //say("Parsing Statement List")
	    if (checkToken(kCheck).kind == K_DOLLAR) {
		// reached end of file before closing brackets
		error('End of file reached before statement list was closed!')
	    }
	    else if (checkToken(kCheck).kind != K_RBRACKET) {
		parseStatement()
		parseStatementList()
	    }
	    else {	
		match(K_RBRACKET)
		CST.goUp()
	    }
	    return
	}
	
	/* Parse expression
	 * Expr		::== IntExpr
	 * 		::== CharExp
	 * 		::== Id
	 * parseExpr is called by parseAssignmentStatement and by
	 * parsePrintStatement. parseExpr consumes a token to decide
	 * whether it must parse an integer expression, character expression,
	 * or an identifier.  If identifier, no function is called since I
	 * can just match on K_ID from here. */
	function parseExpr() {
	    //say("Parsing Expr")
	    CST.addNode(B_EXPR)
	    matchMany([K_DIGIT,K_QUOTE,K_ID])
	    switch (true) {
		case (thisToken.kind == K_DIGIT): {
		    parseIntExpr()
		    break
		}
		case (thisToken.kind == K_QUOTE): {
		    parseCharExpr()
		    break 
		}
		case (thisToken.kind == K_ID): {
		    CST.addNode(B_IDEXPR)
		    CST.addNode(new Leaf(L_ID,thisToken.value))
		    CST.goUp()
		    CST.goUp()
		    break
		}
		default:
		    ;
	    }
	    CST.goUp()
	    return;
	}
	
	/* Parse integer expression
	 * IntExpr	::== digit op Expr
	 * 		::== digit
	 * parseIntExpr is called by parseExpr, which has already
	 * matched on and consumed the digit. */
	function parseIntExpr() {
	    //say("Parsing Int Expr")
	    CST.addNode(B_INTEXPR)
	    CST.addNode(B_DIGIT)
	    CST.addNode(new Leaf(L_DIGIT,thisToken.value))
	    CST.goUp()
	    CST.goUp()
	    if (checkToken(kCheck).kind != K_OPERAND) {
		CST.goUp()
		return
	    }
	    else {
		match(K_OPERAND)
		CST.addNode(B_OPERAND)
		CST.addNode(new Leaf(L_OPERAND,thisToken.value))
		CST.goUp()
		CST.goUp()
		parseExpr()
	    }
	    CST.goUp()
	    return
	}
	
	/* Parse character expression
	 * CharExpr	::== " Charlist "
	 * parseCharExpr is called by parseExpr, which has already
	 * matched on and consumed the beginning quote. */
	function parseCharExpr() {
	    //say("Parsing Char Expr")
	    CST.addNode(B_CHAREXPR)
	    parseCharList()
	    match(K_QUOTE)
	    CST.addNode(B_CHARLIST)
	    CST.addNode(new Leaf(L_CHARLIST,charlist))
	    CST.goUp()
	    CST.goUp()
	    CST.goUp()
	    charlist = ""
	    return
	}
	
	/* Parse character list
	 * CharList	::== Char CharList
	 * 		::== <epsilon>
	 * parseCharList is called by parseCharExpr and recurses until
	 * a K_QUOTE (the end quote) is encountered.
	 * The lexer has already guaranteed that all characters between quotes
	 * are valid Chars, but if one slipped through it would be caught because
	 * it wouldn't match K_CHAR. */
	function parseCharList() {
	    //say("Parsing Char List")
	    if (checkToken(kCheck).kind != K_QUOTE) {
		match(K_CHAR)
		charlist = charlist + thisToken.value 
		parseCharList()
	    }
	    return;
	}
	
	/* Parse variable declaration
	 * VarDecl	::== Type Id
	 * parseVarDecl is called if parseStatement has encountered a Type,
	 * so the Type has already been consumed and the previous token can be found
	 * in lastToken.
	 * If parseVarDecl finds a valid variable declaration, a symbol is added to the
	 * symbol table.  thisToken.value is the name of the variable being declared,
	 * and lastToken.value is the type of the variable (because the previous lexeme
	 * that was seen by parseStatement was the type) */
	function parseVarDecl() {
	    //say("Parsing Var Decl")
	    CST.addNode(B_DECLARE)
	    if (match(K_ID) == kSuccess) {
		CST.addNode(new Leaf(L_TYPE,lastToken.value))
		CST.goUp()
		CST.addNode(new Leaf(L_ID,thisToken.value))
		CST.goUp()
	    }
	    CST.goUp()
	    return	
	}

	
	/* matchMany is a function to match one of an array of token kinds to the next token and
	 * consume the token. Returns kSuccess if an expected token was found and kFailure if something
	 * else was found. */
	function matchMany(tokenKinds) {
	    thisToken = checkToken(kConsume)
	    output = "Checking for one of "
	    for (var k=0; k<tokenKinds.length; k++) {
		if (k < (tokenKinds.length)-1)
		    output = output + tokenKinds[k] + ", "
		else
		    output = output + "or " + tokenKinds[k]
	    }
	    //say(output)
	    for (var k=0; k<tokenKinds.length; k++) {
		if (thisToken.kind == tokenKinds[k]) {
		    //say("  Found " + thisToken.kind + "!")
		return kSuccess
		}
	    }
	    error("Did not find one of \n  [" + tokenKinds.toString() + "]. \n  Found " + thisToken.kind + " instead.")
	    return kFailure
	}
	
	/* match is a function to match a single token kind to the next token and consume the token.
	 * Returns kSuccess if the expected token was found and kFailure if something else was found. */
	function match(tokenKind) {
	    thisToken = checkToken(kConsume)
	    //say("Checking for " + tokenKind)
	    if (thisToken.kind == tokenKind) {
		//say("  Found " + tokenKind + "!")
		return kSuccess
	    }
	    else {
		error("Did not find " + tokenKind + ". Found " + thisToken.kind + " instead.")
	    }
	    return kFailure
	}
	
	/* checkToken is a function to return the token pointed to by tokenIndex.
	 * Optionally, if kConsume is specified, tokenIndex is incremented after returning a token.
	 * If the end of the token array is reached, checkToken decrements tokenIndex. Therefore, the
	 * symptom of an unexpected EOF in the compiler input is a bunch of "expected something else,
	 * found end of file" errors */
	function checkToken(consume) {
	    lastToken = thisToken
	    var indexToGet = tokenIndex
	    if (consume == kConsume) {
		//say("Consumed " + tokens[tokenIndex])
		tokenIndex = tokenIndex + 1
	    }
	    if (tokenIndex >= tokens.length) {
		tokenIndex = tokenIndex - 1
	    }
	    return tokens[indexToGet];
	}
	
	/* say is a function I wrote when I wasn't sure exactly how I planned to return
	 * errors back to the user. It used to write the errors straight to the textarea, but
	 * I didn't really like that.
	 * I left say in here rather than replace invocations with results.push(), mostly out
	 * of lazyness but also to make it easy to change in the future if needed. */
	function say(msg) {
	    results.push(msg)
	}
	
	/* Push a message to results and increment numErrors */
	function error(msg) {
	    say(msg)
	    numErrors = numErrors + 1
	}
	
	function debug(msg) {
	    console.log(msg)
	}
	
    /* CSTtoAST is a function that creates an AST based on the CST (which was built during the parse phase) */	
    CSTtoAST = function(CST) {
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
	     * 	5. An int expression
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
	     *  	this is the method that will be used.
	     *
	     *  	A further note: Since the addNode function always changes Tree.cur to the currently added node (I did
	     *  	away with denoting them as branch or leaf nodes when they are added, see tree.js for an explanation) I
	     *  	need to call AST.goUp for anything I know is a leaf node (no children in the CST).
	     *  	HOWEVER, I don't call AST.goUp for children of an intexpr, and I don't remember why. I need to find out.
	     *
	     *  	Another comment: building the AST nodes is "preprocessing" with regard to how the CST is being traversed.  
	     * 	*/
	    if (node.name == B_STATEMENTLIST ||
		node.name == B_PRINT ||
		node.name == B_ASSIGN ||
		node.name == B_DECLARE ||
		node.name == B_INTEXPR ||
		node.children.length == 0) {
		AST.addNode(node.name)
		if (node.children.length == 0 && AST.cur.parent.name !== B_INTEXPR) {
		//if (node.children.length == 0) {
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
		//AMC
		node.name == B_INTEXPR ||
		AST.cur.parent.name == B_INTEXPR ||
		//AMC
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
	    // If an intexpr node is encountered and it has one child (so it is a case of IntExpr ::== digit) then
	    // 1. remove the node from the parent's children (for some reason I'm sure that it's going to be the last of the parent's children .. this might be a bug)
	    // 2. push the child to the parent's children
	    // 3. set the parent of the child to the parent node's parent
	    if (node.name == B_INTEXPR && node.children.length == 1) {
		node.parent.children.splice(node.parent.children.length-1,1)
		node.parent.children.push(node.children[0])
		node.children[0].parent = node.parent
	    }
	    
	    // If an intexpr node is encountered and it has three children (IntExpr ::== digit op expr) then (and note that the expr part of this might branch further)
	    // 1. remove the node from the parent's children
	    // 2. push the "middle child" to the parent's children
	    // 3. Set the parent of the "middle child" to the node's parent
	    // 4. Set the parent of each of the "eldest child" and "youngest child" to the middle child
	    // 5. Add the "eldest child" and "youngest child" as children of the "middle child"
	    // 6. Cross fingers and hope that all worked as expected
	    if (node.name == B_INTEXPR && node.children.length == 3) {
		node.parent.children.splice(node.parent.children.length-1,1)
		node.parent.children.push(node.children[1])
		node.children[1].parent = node.parent
		node.children[0].parent = node.children[1]
		node.children[2].parent = node.children[1]
		node.children[1].children.push(node.children[0])
		node.children[1].children.push(node.children[2])
	    }	    
	} // Oh look! Here's the end of the cleanAST function
    
	
	console.log("starting AST")
	// Build the AST starting at the root of the CST
        buildAST(CST.root)
	// Clean the AST starting at its root
	cleanAST(AST.root)
        return AST
    
    } // End of CSTtoAST()
    
    /* ASTtoScope is called after the AST is built to transform it in to a Scope tree.  Scope checking (lexical analysis) is done along the way */
    ASTtoScope = function(AST) {
        Scope = new Tree()
	
	/* scanAST is going to recursively scan through the AST (who is scared of recursion now?!), build a symbol table with scope data, and do
	 * scope checking.
	 * This function does some pre-processing and some post-processing to correctly build/navigate the symbol table.  */
	scanAST = function(node) {
	    // Here's the pre-processing.  This is done as each node is encountered, BEFORE the node is processed
	    switch(true) {
		// If we've found a statement list node (and haven't recursed it yet), then add a new scope table (it's an associative array) to the scope tree
		case (node.name == B_STATEMENTLIST): {
		    Scope.addNode(new Array())
		    break;
		}
		// If we've found a declare node, then check to make sure the variable being declared isn't already declared in this scope and if not, add it to
		// the symbol table
		case (node.name == B_DECLARE): {
		    //alert("declare " + node.children[1].name.value)
		    // The only way Scope.root could be null is if there is no statement list, therefore this declare statement is the only statement of the program.
		    // Not much point since nothing will be done with it anyway, but we might as well add it to the symbol table. But first, we need a symbol table ...
		    if (Scope.root == null)
			Scope.addNode(new Array());
		    // Check to see if the current scope already has the variable defined
		    var foundRedefine = false
		    // Go through all symbols in the current scope as long as we haven't discovered an attempt to redefine a variable
		    for (var i = 0; i < Scope.cur.name.length && foundRedefine == false; i++) {
			// If there's a symbol already in the scope table with the same name, then issue an error message and stop the scan through the current scope
			if (Scope.cur.name[i].name == node.children[1].name.value) {
			    error("  Found variable redeclaration for variable " + node.children[1].name.value)
			    foundRedefine = true
			}
                    } // End scan through current scope
		    // If the variable being defined isn't already in the scope, add it
		    if (foundRedefine == false) {
			Scope.cur.name.push(new Symbol(node.children[1].name.value, node.children[0].name.value))
		    }
		}
		// If we've found an assign node, then check to make sure the identifier being assigned is in the current scope
		//case (node.name == B_ASSIGN): {
		//    alert("assign " + node.children[0].name.value)
		//   
		//    if (Scope.findVariableInScope(node.children[0].name.value) == null)
		//	say("Variable "+ node.children[0].name.value + " assigned but not defined")
		//}
		default:
		    break;
	    } // End pre-order switch statement
	    
	    // Now, traverse the AST.
	    // If there are no children, then return
            if (!node.children || node.children.length === 0)
                return
            // Else there are children, so traverse them to build the scope tree and do semantic analysis
            for (var i = 0; i < node.children.length; i++)
                scanAST(node.children[i]);

	    // In addition to the pre-order processing, we also need to do a bit of work when we get to the end of processing an AST node
	    switch(true) {
		// If we just processed a statement list (and all of its children), then we want to close out that statement list's scope. Easy enough, right?
		// I don't think there are any bugs in these lines of code.  
		case (node.name == B_STATEMENTLIST): {
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
