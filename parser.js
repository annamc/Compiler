/* Anna Clayton */
/* February 2013 */
/* parser.js  */


	
    /* Index of the token currently being processed */	
    var tokenIndex = 0;
    /* Objects to represent the current token and the last one encountered */
    var lastToken = new Token();
    var thisToken = new Token();
	
    var numErrors = 0;
	
    var results = new Array();
    var symbolTree = new Tree();
    var CST = new Tree();
    var AST = new Tree();
    
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
	    
	    /* Add a (root) node to the symbol table tree, and make it the current node */
	    //symbolTree.addNode(new Array(), true);

	    tokenIndex = 0
	    numErrors = 0
	    /* 2nd and subsequent times this proc is called, want to reset the symbol table counter */
	    if (Symbol.counter)
		Symbol.counter = 0
	    /* First message on array will be changed after parse to indicate if errors were found.  
	    Leave a spot for it to avoid having to shuffle the results array when parse is done */
	    results.push(null)
	    /* Ready to go! */
	    parseProgram()
	    /* If an error was encountered, fill in that first array element (the one that was null) with
	     * the "errors were found" constant. Push an element on the array at the end to indicate the
	     * total number of errors found. */
	    if (numErrors > 0) {
		results[0] = eErrorsFound
		/* Sorry, I'm a grammar nut :-)  Couldn't stand the "1 parse errors" and didn't want to
		 * cheat by using "error(s)" */
		if (numErrors == 1)
		    say(numErrors + " parse error found.")
		else
		    say(numErrors + " parse errors found.")
	    }
	    AST = CSTtoAST(CST)
	    return { results : results, CST : CST , AST: AST}
	}
	
	/* Parse program
	 * Program	::== Statement $
	 * parseProgram unconditionally calls parseStatement, then matches on
	 * the K_DOLLAR EOF indicator token. */
	function parseProgram() {
	    //say("Parsing Program");
	    CST.addNode(B_PROGRAM,K_BRANCH)
	    parseStatement();
	    match(K_DOLLAR)
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
	    //say("Parsing Statement");
	    CST.addNode(B_STATEMENT,K_BRANCH)
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
		    /* If a statement list is beginning, create a new node on the syntax tree and make it the current */
		    //symbolTree.addNode(new Array(), true);
		    CST.addNode(B_STATEMENTLIST,K_BRANCH)
		    parseStatementList()
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
	    CST.addNode(B_PRINT,K_BRANCH)
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
	    CST.addNode(B_ASSIGN,K_BRANCH)
	    /* Make sure the variable being assigned is in the current scope */
	    
	//    if (findVariableInScope(thisToken.value) == null)
	//	error("Variable "+ thisToken.value + " assigned but not defined")
	    CST.addNode(new Leaf(L_ID,thisToken.value),K_LEAF)
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
		/* If a statement list has been terminated, go up to the parent node in the symbol table */
		//symbolTree.goUp()
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
	    CST.addNode(B_EXPR,K_BRANCH)
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
		//    if (findVariableInScope(thisToken.value) == null)
		//	error("Variable "+ thisToken.value + " referenced but not defined")
		    CST.addNode(B_IDEXPR,K_BRANCH)
		    CST.addNode(new Leaf(L_ID,thisToken.value),K_LEAF)
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
	    CST.addNode(B_INTEXPR,K_BRANCH)
	    CST.addNode(B_DIGIT,K_BRANCH)
	    CST.addNode(new Leaf(L_DIGIT,thisToken.value),K_LEAF)
	    CST.goUp()
	    if (checkToken(kCheck).kind != K_OPERAND)
		return
	    else {
		match(K_OPERAND)
		CST.addNode(B_OPERAND,K_BRANCH)
		CST.addNode(new Leaf(L_OPERAND,thisToken.value),K_LEAF)
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
	    CST.addNode(B_CHAREXPR,K_BRANCH)
	    parseCharList()
	    match(K_QUOTE)
	    // Is this necessary??? A char expr can't be anything BUT a charlist ... 
	    CST.addNode(B_CHARLIST,K_BRANCH)
	    CST.addNode(new Leaf(L_CHARLIST,charlist),K_LEAF)
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
	    //CST.addNode(B_CHARLIST,K_BRANCH)
	    if (checkToken(kCheck).kind != K_QUOTE) {
		match(K_CHAR)
		charlist = charlist + thisToken.value 
		parseCharList()
	    }
	    //CST.addNode(B_CHARLIST,K_BRANCH)
	    //CST.goUp()
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
	    CST.addNode(B_DECLARE,K_BRANCH)
	    if (match(K_ID) == kSuccess) {
		/* If the current node of symbol tree is undefined, we must be parsing a verrrry simple testcase
		 * in which there are no statement lists.  Create a node (the only one) in the symbol tree to store
		 * this (only) symbol */
//		if (symbolTree.root == null)
//		    symbolTree.addNode(new Array(), true);
//		/* Check to see if the current scope already has the variable defined */
//		var foundRedefine = false
//    		for (var i = 0; i < symbolTree.cur.name.length && foundRedefine == false; i++)
//                    {
//			if (symbolTree.cur.name[i].name == thisToken.value) {
//			    error("  Found variable redeclaration for variable " + thisToken.value)
//			    //numErrors = numErrors + 1
//			    foundRedefine = true
//			}
//                    }
//		if (foundRedefine == false)
//		    symbolTree.cur.name.push(new Symbol(thisToken.value, lastToken.value))
//		else
//		    symbolTree.cur.name[i-1].type = lastToken.value
		CST.addNode(new Leaf(L_TYPE,lastToken.value), K_LEAF)
		CST.addNode(new Leaf(L_ID,thisToken.value), K_LEAF)
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
	    error("  Didnt find one of the expected tokens. Found " + thisToken.kind + " instead.")
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
		error("  Didnt find " + tokenKind + ". Found " + thisToken.kind + " instead.")
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
	
	function error(msg) {
	    say(msg)
	    numErrors = numErrors + 1
	}
	
	function debug(msg) {
	    if (debugFlag == true) 
		results.push(msg)
	}
	
    CSTtoAST = function(CST) {
        AST = new Tree()

    
    buildAST = function(node) {
        
        if (node.name == B_STATEMENTLIST ||
            node.name == B_PRINT ||
            node.name == B_ASSIGN ||
            node.name == B_DECLARE ||
	    node.name == B_INTEXPR ||
            node.children.length == 0) {
	    //if (node.name != B_INTEXPR)
		AST.addNode(node.name,K_BRANCH)
	    if (node.children.length == 0 && AST.cur.parent.name !== B_INTEXPR)
		AST.goUp()
	}

            
        // If there are no children (i.e., leaf nodes)...
            if (!node.children || node.children.length === 0)
                return
            // .. else there are children, so traverse them to build the AST
            for (var i = 0; i < node.children.length; i++)
            {
                buildAST(node.children[i]);
            }
		
	    AST.goUp()
    }
    
        cleanAST = function(node) {

        // If there are no children (i.e., leaf nodes)...
            if (!node.children || node.children.length === 0)
                return
            // .. else there are children, so traverse them to build the AST
            for (var i = 0; i < node.children.length; i++)
            {
                cleanAST(node.children[i]);
            }

	    if (node.name == B_INTEXPR && node.children.length == 1) {
		node.parent.children.splice(node.parent.children.length-1,1)
		node.parent.children.push(node.children[0])
		node.children[0].parent = node.parent
		AST.goUp()
	    }
	    
	    if (node.name == B_INTEXPR && node.children.length == 3) {
		node.parent.children.splice(node.parent.children.length-1,1)
		node.parent.children.push(node.children[1])
		node.children[1].parent = node.parent
		node.children[0].parent = node.children[1]
		node.children[2].parent = node.children[1]
		node.children[1].children.push(node.children[0])
		node.children[1].children.push(node.children[2])
		AST.goUp()
	    }
		
	    
    }
    
        buildAST(CST.root)
	cleanAST(AST.root)
        return AST
    }
