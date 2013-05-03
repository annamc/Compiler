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
	/* If parse worked, then create the AST */
	if (numErrors == 0) {
	    AST = CSTtoAST(CST)
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
	return { errors : errors, warnings : warnings, CST : CST , AST: AST}
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
	    CST.addNode(new Token(K_COMPARISON, K_EQUALITY, thisToken.loc))
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