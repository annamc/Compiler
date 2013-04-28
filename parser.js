/* Anna Clayton */
/* May 2013 */
/* parser.js  */

    /* Turn on debug mode if things aren't working. Tons of stuff gets printed to the console to
     * aid in tracking the parser's progress through the token stream, building trees, checking
     * scope and types */
    var debugMode = false
	
    /* Index of the token currently being processed */	
    var tokenIndex = 0;
    
    /* Objects to represent the current token and the last one encountered */
    var lastToken = new Token();
    var thisToken = new Token();
    
	
    /* Variables to track:
     * - Number of errors and warnings found
     * - Final results of the entire parse phase
     * - Arrays of all warnings and errors found
     * - The scope tree
     * - CST and AST
     * All of these variables are initialized at the beginning of the Parse function */
    var numErrors
    var numWarnings
    var results
    var warnings
    var errors
    var Scope
    var CST
    var AST
	
    /* When a charlist is encountered, create a string representing the characters in the charlist */	
    charlist = "";
	
    /* Symbol. A symbol has the following attributes:
     * 		- name (of the identifier)
     * 		- type
     * 		- declareAt (line in the source code where the symbol is declared. 0 if it hasn't been declared)
     * 		- initAt (line in the source code where the symbol is LAST assigned a value. 0 if it hasn't been assigned yet)
     * 		- usedAt (line in the source code where the symbol was LAST used. 0 if it hasn't been used)
     *
     * 		  A symbol is used if it is:
     * 		  	in a print statement
     * 		  	the right-hand side of an assignment statement
     * 		  	(later, if it's in the condition of an if or a while statement)
     *
     *  	The scope of a symbol is not kept in the symbol itself. It is known by where in the symbol tree table the symbol is.  	  	
     */
    var Symbol = function(name, type, declareAt, initAt, usedAt, symnum){
	// Keep a count of symbols
	if (Symbol.counter == undefined) 
	    Symbol.counter = 0;
	else 
	    Symbol.counter++;
    
	var s = {name: name, type: type, declareAt: declareAt, initAt: 0, usedAt: 0, symnum: Symbol.counter};
    
	s.toString = function(){
	    //return "<" + s.name + " : "+s.type+ "; " + s.declareAt + "; " + s.initAt + "; " + s.usedAt + ">";
	    return "<" + s.name + " : "+ s.type + ">";
	}
	return s;
    }

    /* Create a fake Symbol in order to define Symbol.counter */
    setSymbolCounter = new Symbol("fake name","fake type")
    /* Variable to store the current symbol being analyzed */
    var thisSymbol = new Symbol()

    /* Parse
     * Initializes variables, then calls parseProgram to kick off the parser.
     * If parse was successful (CST has been created as part of parse), then
     * call CSTtoAST to create an AST based on the CST and
     * call ASTtoScope to create a symbol table and
     * call checkforScopeWarnings to check for:
     * 	 - variables defined but not initialized
     * 	 - variables used but not initialized
     * Puts an indication of how many errors were found,
     * An indication of how many warnings were found, then returns
     *   results, warnings, errors, CST, AST, Scope
     * to the caller (compiler.html) */
     function parse() {

	// Initialize
	results = new Array();
	errors = new Array()
	warnings = new Array()
	Scope = new Tree(T_SCOPE);
	CST = new Tree();
	AST = new Tree();

	tokenIndex = 0
	numErrors = 0
	numWarnings = 0
	
	/* 2nd and subsequent times this proc is called, want to reset the symbol table counter */
	if (Symbol.counter)
	    Symbol.counter = 0
	    
	/* First message on array will be changed after parse to indicate if errors were found.  
	Leave a spot for it to avoid having to shuffle the results array when parse is done */
	results.push(null)
	
	/* Ready to go! */
	parseProgram()
	/* If parse worked, then do the 2nd phase (create AST, create symbol table, check for scope warnings) */
	if (numErrors == 0) {
	    AST = CSTtoAST(CST)
	    Scope = ASTtoScope(AST)
	    CheckForScopeWarnings()
	}
	
	/* If an error was encountered, fill in that first array element (the one that was null) with
	 * the "errors were found" constant. Push an element on the array at the end to indicate the
	 * total number of errors found. */
	if (numErrors > 0) {
	    results[0] = eErrorsFound
	    /* Sorry, I'm a grammar nut :-)  Couldn't stand the "1 parse errors" and didn't want to
	     * cheat by using "error(s)" */
	    if (numErrors == 1)
		error("\n" + numErrors + " parse error found.")
	    else
		error("\n" + numErrors + " parse errors found.")
	    if (numWarnings == 1)
		warn("\n" + numWarnings + " warnings issued.")
	    else
		warn("\n" + numWarnings + " warnings issued.")
	}
	/* Return a pile of stuff to the caller. The caller knows what to do with all this */
	return { errors : errors, warnings : warnings, CST : CST , AST: AST , Scope : Scope}
    }
	
    /* Parse program
     * Program	::== Statement $
     * parseProgram unconditionally calls parseStatement, then matches on
     * the K_DOLLAR EOF indicator token. */
    function parseProgram() {
	debug("Parsing Program")
	CST.addNode(B_PROGRAM) /* The program node is the base of the CST */
	parseStatement()
	match(K_DOLLAR)
	return
    }
	
    /* Parse statement
     * Statement	::== P( Expr )
     * 		::== Id = Expr
     * 		::== Type Id
     * 		::== { StatementList }
     * 		::== while BooleanExpr { StatementList }
     * 		::== if BooleanExpr { StatementList }
     * parseStatement is called from several places:
     * 	- parseProgram, to kick off parsing the entire program
     * 	- parseStatementList, to parse the next statement that was encountered
     *  parseStatement consumes a token and matches it to one of 6 expected, then
     *  invokes the function to process whatever statement type was encountered:
     *  	- K_PRINT: parsePrintStatement
     *  	- K_ID: parseAssignStatement
     *  	- K_TYPE: parseVarDecl
     *  	- K_LBRACKET: parseStatementList
     *  	- K_WHILE: parseWhileStatement
     *  	- K_IF: parseIfStatement
     *  The functions called by parseStatement are aware that the K_PRINT, K_ID,
     *  K_TYPE, K_LBRACKET, K_WHILE, or K_IF token have already been consumed. */
    function parseStatement() {
	debug("Parsing Statement");
	CST.addNode(B_STATEMENT)
	matchMany([K_PRINT,K_ID,K_TYPE,K_LBRACKET,K_WHILE,K_IF])
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
		// And the quotes around a charlist.  
		// And since my CST to AST function assumes that all leaf nodes should belong to the AST they require some special-casing there. Pain.  
		parseStatementList()
		// And here's where I would add a node for the right bracket to the CST. It would only screw things up later. Let's leave it off.  
		break
	    }
	    case (thisToken.kind == K_WHILE): {
		parseWhileStatement()
		break
	    }
	    case (thisToken.kind == K_IF): {
		parseIfStatement()
		break
	    }
	    default:
	       ;
	}
	CST.goUp() // from statement node to parent
	return
    }
	
    /* Parse print assignment
     * P( Expr )
     * parsePrintStatement is called by parseStatement when a Print operation
     * has been encountered (the P has been consumed). */
    function parsePrintStatement() {
	debug("Parsing Print Statement")
	CST.addNode(B_PRINT)
	match(K_LPAREN)
	parseExpr()
	match(K_RPAREN)
	CST.goUp() // from print node to parent (statement)
	return
    }
	
    /* Parse assignment statement
     * Id = Expr
     * parseAssignStatement is called by parseStatement when an identifier
     * has been encountered (the identifier has been consumed). */ 
    function parseAssignStatement() {
	debug("Parsing Assign Statement")
	CST.addNode(B_ASSIGN)
	CST.addNode(thisToken)
	CST.goUp() // from leaf node (identifier that is being assigned)
	match(K_EQUAL)
	parseExpr()
	CST.goUp() // from assign node to parent (statement)
	return
    }
    
    /* Parse while statement
     * while BooleanExpr { StatementList }
     * parseWhileStatement is called by parseStatement when the while keyword
     * has been encountered (the identifier has been consumed). */ 
    function parseWhileStatement() {
	debug("Parsing While Statement")
	CST.addNode(B_WHILE)
	matchMany([K_BOOLVAL,K_LPAREN])
	CST.addNode(B_BOOLEXPR)
	parseBooleanExpr()
	CST.goUp()
	match(K_LBRACKET)
	CST.addNode(B_STATEMENTLIST)
	parseStatementList()
	CST.goUp() // from statementlist to parent (while)
	CST.goUp() // from while node to parent (statement)
	return
    }
    
    /* Parse if statement
     * if BooleanExpr { StatementList }
     * parseIfStatement is called by parseStatement when the if keyword
     * has been encountered (the identifier has been consumed). */ 
    function parseIfStatement() {
	debug("Parsing If Statement")
	CST.addNode(B_IF)
	matchMany([K_BOOLVAL,K_LPAREN])
	parseBooleanExpr()
	match(K_LBRACKET)
	CST.addNode(B_STATEMENTLIST)
	parseStatementList()
	CST.goUp() // from statementlist to parent (if)
	CST.goUp() // from while node to parent (statement)
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
	debug("Parsing Statement List")
	/* since this function gets called for each statement that is part of a statement list,
	 * the statement list node of the CST is added before this function is called */
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
	    CST.goUp() // from statement list node to parent (statement)
	}
	return
    }
	
    /* Parse expression
     * Expr		::== IntExpr
     * 		::== CharExp
     * 		::== BooleanExpr
     * 		::== Id
     * parseExpr is called by parseAssignmentStatement and by
     * parsePrintStatement. parseExpr consumes a token to decide
     * whether it must parse an integer expression, character expression, boolean expression
     * or an identifier.  If identifier, no function is called since I
     * can just match on K_ID from here. */
    function parseExpr() {
	debug("Parsing Expr")
	CST.addNode(B_EXPR)
	matchMany([K_DIGIT,K_QUOTE,K_ID,K_BOOLVAL,K_LPAREN])
	switch (true) {
	    case (thisToken.kind == K_DIGIT): {
		parseIntExpr()
		break
	    }
	    case (thisToken.kind == K_QUOTE): {
		parseCharExpr()
		break 
	    }
	    case (thisToken.kind == K_BOOLVAL): {
		parseBooleanExpr()
		break 
	    }
	    case (thisToken.kind == K_LPAREN): {
		//CST.addNode(B_BOOLEXPR)
		parseBooleanExpr()
		//CST.goUp()
		break
	    }
	    case (thisToken.kind == K_ID): {
		CST.addNode(B_IDEXPR)
		CST.addNode(thisToken)
		CST.goUp() // from leaf node representing the id to the parent
		CST.goUp() // from id expression node to parent
		break
	    }
	    default:
		;
	}
	CST.goUp() // from expression node to parent
	return
    }
	
    /* Parse integer expression
     * IntExpr	::== digit op Expr
     * 		::== digit
     * parseIntExpr is called by parseExpr, which has already
     * matched on and consumed the digit. */
    function parseIntExpr() {
	debug("Parsing Int Expr")
	CST.addNode(B_INTEXPR)
	CST.addNode(B_DIGIT)
	CST.addNode(thisToken)
	CST.goUp() // from leaf node representing a digit token 
	CST.goUp() // from digit node to parent (int expr node)
	if (checkToken(kCheck).kind != K_OPERAND) {
	    CST.goUp() // from int expr node to parent
	    return
	}
	else {
	    match(K_OPERAND)
	    CST.addNode(B_OPERAND)
	    CST.addNode(thisToken)
	    CST.goUp() // from leaf node representing the operand token to operand node
	    CST.goUp() // from operand node to parent (int expr node)
	    parseExpr()
	}
	CST.goUp() // from int expr node to parent
	return
    }
    
    /* Parse boolean expression
     * BooleanExpr ::== ( Expr == Expr )
     * 		   ::== boolVal
     * parseBooleanExpr is called by parseExpr, which has already
     * matched on and consumed either the left paren or the boolVal token. */
    function parseBooleanExpr() {
	debug("Parsing Boolean Expr")
	if (thisToken.kind == K_BOOLVAL) {
	    CST.addNode(thisToken)
	    CST.goUp() // from boolean value to parent
	}
	else {
	    CST.addNode(B_BOOLEXPR)
	    parseExpr()
	    match(K_EQUALITY)
	    CST.addNode(B_COMPARISON)
	    CST.addNode(B_EQUALITY)
	    CST.goUp() // from equality node to comparison node
	   CST.goUp() // from comparison node to parent (boolean expr node)
	    parseExpr()
	    match(K_RPAREN)
	    CST.goUp() // from boolexpr to parent
	}
	return
    }
	
    /* Parse character expression
     * CharExpr	::== " Charlist "
     * parseCharExpr is called by parseExpr, which has already
     * matched on and consumed the beginning quote. */
    function parseCharExpr() {
	debug("Parsing Char Expr")
	CST.addNode(B_CHAREXPR)
	parseCharList()
	match(K_QUOTE)
	CST.addNode(B_CHARLIST)
	CST.addNode(new Token(K_STRING,charlist,lastToken.loc)) /* Create a new token -- in the input token
	stream, each character was a separate token. The parser concatenates the characters to one charlist.
	Since a newline is not allowed as part of a charlist, the location of the last character is the location
	of the whole charlist */
	CST.goUp() // from the leaf node representing a charlist to the charlist node
	CST.goUp() // from the charlist node to the charexpr node
	CST.goUp() // from the charexpr node to the parent node
	charlist = "" // reset charlist variable for the next time a charlist is encountered
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
	debug("Parsing Char List")
	if (checkToken(kCheck).kind != K_QUOTE) {
	    match(K_CHAR)
	    charlist = charlist + thisToken.value  // add the character encountered to the current charlist
	    parseCharList() // recursively call parseCharList function
	}
	// else if the current token is a quote, the charlist is over so return to the caller (parseCharExpr)
	return
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
	debug("Parsing Var Decl")
	CST.addNode(B_DECLARE)
	if (match(K_ID) == kSuccess) {
	    CST.addNode(lastToken)
	    CST.goUp() /* from the leaf node representing the type of the variable being declared
	    to its parent (the declare node) */
	    CST.addNode(thisToken)
	    CST.goUp() /* from the leaf node representing the name of the variable being declared
	    to its parent (the declare node) */
	}
	CST.goUp() // from the declare node to its parent
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
	debug(output)
	for (var k=0; k<tokenKinds.length; k++) {
	    if (thisToken.kind == tokenKinds[k]) {
		debug("  Found " + thisToken.kind + "!")
	    return kSuccess
	    }
	}
	error("Did not find one of \n  [" + tokenKinds.toString() + "] at line " + thisToken.loc + ".  Found " + thisToken.kind + " instead.")
	return kFailure
    }
	
    /* match is a function to match a single token kind to the next token and consume the token.
     * Returns kSuccess if the expected token was found and kFailure if something else was found. */
    function match(tokenKind) {
	thisToken = checkToken(kConsume)
	debug("Checking for " + tokenKind)
	if (tokenKind == K_EQUALITY) {
	    if (thisToken.kind == K_EQUAL) {
		checkToken(kConsume)
		if (thisToken.kind == K_EQUAL) {
		    debug("  Found " + tokenKind + "!")
		}
		else {
		    error("Did not find " + tokenKind + " at line " + thisToken.loc + ". Found " + thisToken.kind + " instead.")
		}
	    }
	    else {
		error("Did not find " + tokenKind + " at line " + thisToken.loc + ". Found " + thisToken.kind + " instead.")
	    }
	}
	else if (thisToken.kind == tokenKind) {
	    debug("  Found " + tokenKind + "!")
	    return kSuccess
	}
	else {
	    error("Did not find " + tokenKind + " at line " + thisToken.loc + ". Found " + thisToken.kind + " instead.")
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
	    debug("Consumed " + tokens[tokenIndex])
	    tokenIndex = tokenIndex + 1
	}
	if (tokenIndex >= tokens.length) {
	    tokenIndex = tokenIndex - 1
	}
	return tokens[indexToGet];
    }
	
    /* Push a message to results. */
    function say(msg) {
	results.push(msg)
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
	
    /* Write something to the console, if debug mode is on. Debug mode can be set at the top of this module.
     * It'd probably be a better idea to put the debug mode flag in a common module and be able to invoke this
     * function from anywhere. For now, parse is the only thing that really needs debugged ... */
    function debug(msg) {
	if (debugMode)
	    console.log(msg)
    }
	
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
            
	    // Now back to building the AST. If we just got done with a CST statement list, print, assign, declare, while or if and we're not currently
	    // at the root of the AST, call AST.goUp
	    if ((node.name == B_STATEMENTLIST ||
		node.name == B_PRINT ||
		node.name == B_ASSIGN ||
		node.name == B_WHILE ||
		node.name == B_IF ||
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
			if (checkType(thisSymbol.type,node.children[1]) == false)
			    error("Variable " + node.children[0].name.value + " assigned a value that was an incompatible type on line " + node.children[1].name.loc + ". Expected " + thisType + ", found " + +  ".")
		    }
		    break;
		}
		// If we've found a print node, then check to make sure any identifier being printed has been declared and initialized
		case (node.name == B_PRINT): {
    		    foundType = checkType(K_ANYTYPE,node.children[0])
		    // if foundType is false, then the checkType method found something illegal, like digit + string
		    if (foundType == false)
			error("Dude, you can't print that!")
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
		    return true
		else if (node.name.kind == K_ID && findVariableInScope(node.name.value) !== null && findVariableInScope(node.name.value).type == K_STRING) {
		    thisSymbol = findVariableInScope(node.name.value)
		    if (thisSymbol == null) {
			error("Identifier " + node.name.value + " was used at line " + node.name.loc + " but has not been declared! ")
			return false
		    }
		    else if (thisSymbol.initAt == 0) {
			warn(thisSymbol.name + " was used at line " + node.name.loc + " but was not yet initialized ")
		    }
		    thisSymbol.usedAt = node.name.loc
		    return true
		}
		break;
	    case (K_INT):
		if (node.name.kind == K_DIGIT)
		    return true
		thisSymbol = findVariableInScope(node.name.value)
		if (node.name.kind == K_ID && thisSymbol == null) {
		    error("Identifier " + node.name.value + " was used at line " + node.name.loc + " but has not been declared! ")
		    return false
		}
		else if (node.name.kind == K_ID && thisSymbol.type == K_INT) {
		    	if (thisSymbol.initAt == 0) {
			    warn(thisSymbol.name + " was used at line " + node.name.loc + " but was not yet initialized ")
			}
		    thisSymbol.usedAt = node.name.loc
		    return true
		}
		else if (node.name.kind == K_OPERAND) 
		    return (checkType(K_INT,node.children[0]) && checkType(K_INT,node.children[1]))
		break;
	    case (K_ANYTYPE):
		if (!node.children || node.children.length === 0) {
		    if (node.name.kind == K_ID) {
			thisSymbol = findVariableInScope(node.name.value)
			if (thisSymbol == null) {
			    error("Identifier " + node.name.value + " was used at line " + node.name.loc + " but has not been declared! ")
			    return false
			}
			thisSymbol.usedAt = node.name.loc
		    }
		    return true
		}
		else if (node.name.kind == K_OPERAND) {
		    var child1 = checkType(K_INT,node.children[0])
		    var child2 = checkType(K_INT,node.children[1])
		    return (child1 && child2)
		}
		break;
	    default:
		error("Fatal error! Can't get there from here") 
		break;
	}
	return false // if the end of the function is reached and we haven't found a valid type, then the type
		     // must be invalid, so return false
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
    
    
