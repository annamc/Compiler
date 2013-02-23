/* Anna Clayton */
/* February 2013 */
/* parser.js  */


	const kConsume = 1;
	const kCheck = 0;
	const kFailure = 0;
	const kSuccess = 1;
	
	const kInt = "int"
	const kChar = "char"
	
	var tokenIndex = 0;
	var lastToken = new Token();
	var thisToken = new Token();
	var nextToken = new Token();
	
	var numErrors = 0;
	
	var results = new Array();
	var symbols = new Array();
	
var Symbol = function(n, t, symnum){
    // Keep a count of symbols
    if (Symbol.counter == undefined) {
        Symbol.counter = 0;
    } else {
        Symbol.counter++;
    }
    var s = {name: n, type: t, symnum: Symbol.counter};
    
    s.toString = function(){
	    return s.symnum + ": <" + s.name + " : "+s.type+"> ";
    }
    return s;
}
	    setSymbolCounter = new Symbol("fake name","fake type")

         function parse(symbols) {
	    tokenIndex = 0
	    numErrors = 0
	    results.push(null) // Initialize - first message on array will indicate if errors were found.
	    parseProgram()
	    if (numErrors > 0) {
		results[0] = eErrorsFound
		if (numErrors == 1)
		    say(numErrors + " parse error found.")
		else
		    say(numErrors + " parse errors found.")
	    }
	    return results
	}
	
	function parseProgram() {
	    say("Parsing Program");
	    parseStatement();
	    match(K_DOLLAR)
	    return
	}
	
	function parseStatement() {
	    say("Parsing Statement");
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
		    parseStatementList()
		    break
		}
		default:
		   ;
	    }
	    return
	}
	
	function parsePrintStatement() {
	    say("Parsing Print Statement")
	    match(K_LPAREN)
	    parseExpr()
	    match(K_RPAREN)
	    return
	}
	
	function parseAssignStatement() {
	    say("Parsing Assign Statement")
	    match(K_EQUAL)
	    //thisToken = checkToken(kConsume)
	    parseExpr()
	    return kSuccess
	}
	
	function parseStatementList() {
	    say("Parsing Statement List")
	    if (checkToken(kCheck).kind == K_DOLLAR) {
		// reached end of file before closing brackets
		say('End of file reached before statement list was closed')
		numErrors = numErrors + 1
	    }
	    else if (checkToken(kCheck).kind != K_RBRACKET) {
		parseStatement()
		parseStatementList()
	    }
	    else 	
		match(K_RBRACKET)
	    return
	}
	
	function parseExpr() {
	    say("Parsing Expr")
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
		    break
		}
		default:
		    ;
	    }
	    return;
	}
	
	function parseIntExpr() {
	    say("Parsing Int Expr")
	    //match(K_DIGIT)
	    if (checkToken(kCheck).kind != K_OPERAND)
		return
	    else {
		match(K_OPERAND)
		parseExpr()
	    }
	    return
	}
	
	function parseCharExpr() {
	    say("Parsing Char Expr")
	    //match(K_QUOTE)
	    parseCharList()
	    match(K_QUOTE)
	    return
	}
	
	function parseCharList() {
	    say("Parsing Char List")
	    if (checkToken(kCheck).kind != K_QUOTE) {
		match(K_CHAR)
		parseCharList()
	    }
	    return;
	}
	
	function parseVarDecl() {
	    say("Parsing Var Decl")
	    if (match(K_ID) == kSuccess) {
		symbols[Symbol.counter] = new Symbol(thisToken.value, lastToken.value)
	    }
	    return	
	}
	
	function matchMany(tokenKinds) {
	    thisToken = checkToken(kConsume)
	    output = "Checking for one of "
	    for (var k=0; k<tokenKinds.length; k++) {
		if (k < (tokenKinds.length)-1)
		    output = output + tokenKinds[k] + ", "
		else
		    output = output + "or " + tokenKinds[k]
	    }
	    say(output)
	    for (var k=0; k<tokenKinds.length; k++) {
		if (thisToken.kind == tokenKinds[k]) {
		    say("  Found " + thisToken.kind + "!")
		return kSuccess
		}
	    }
	    say("  Didnt find one of the expected tokens. Found " + thisToken.kind + " instead.")
	    numErrors = numErrors + 1;
	    return kFailure
	}
	
	function match(tokenKind) {
	    thisToken = checkToken(kConsume)
	    say("Checking for " + tokenKind)
	    if (thisToken.kind == tokenKind) {
		say("  Found " + tokenKind + "!")
		return kSuccess
	    }
	    else {
		say("  Didnt find " + tokenKind + ". Found " + thisToken.kind + " instead.")
		numErrors = numErrors + 1
	    }
	    return kFailure
	}
	
	function checkToken(consume) {
	    lastToken = thisToken
	    var indexToGet = tokenIndex
	    if (consume == kConsume) {
		say("Consumed " + tokens[tokenIndex])
		tokenIndex = tokenIndex + 1
	    }
	    if (tokenIndex >= tokens.length) {
		tokenIndex = tokenIndex - 1
	    }
	    return tokens[indexToGet];
	}
	
	function say(msg) {
	    results.push(msg)
	}
