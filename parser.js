/* Anna Clayton */
/* February 2013 */
/* parser.js  */

	const kConsume = 1;
	const kCheck = 0;
	const kFailure = 0;
	const kSuccess = 0;
	
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
	    say("Kicking off parse");
	    results.push(null); // Initialize - first message on array will indicate if errors were found.
	    parseProgram();
	    if (numErrors > 0)
		results[0] = eErrorsFound
	    return results;
	}
	
	function parseProgram() {
	    say("Parsing Program");
	    parseStatement();
	    if (eatThisToken(K_DOLLAR) == kSuccess)
		return kSuccess
	    else
		return kFailure
	}
	
	function parseStatement() {
	    say("Parsing Statement");
	    thisToken = checkToken(kConsume)
	    switch (true) {
		case (thisToken.kind == K_PRINT): {
		    parsePrintStatement();
		    break;
		}
		case (thisToken.kind == K_ID): {
		    parseAssignStatement();
		    break;
		}
		case (thisToken.kind == K_TYPE): {
		    parseVarDecl();
		    break;
		}
		case (thisToken.kind == K_LBRACKET): {
		    parseStatementList();
		    break;
		}
		default:
		   return kFailure;
	    }
	    return kSuccess;
	}
	
	function parsePrintStatement() {
	    say("Parsing Print Statement");
	    
	    if (eatThisToken(K_LPAREN) == kSuccess)
		; // Keep going
	    else
		return kFailure
	    
	    parseExpr()
	
	    if (eatThisToken(K_RPAREN) == kSuccess)
		return kSuccess
	    else
		return kFailure
	}
	
	function parseAssignStatement() {
	    say("Parsing Assign Statement");
	    if (eatThisToken(K_EQUAL) == kSuccess)
		; // Keep going
	    else
		return kFailure
	    
	    thisToken = checkToken(kConsume)
	    parseExpr()
	    
	    return kSuccess
	}
	
	function parseStatementList() {
	    say("Parsing Statement List");
	    if (checkToken(kCheck).kind != K_RBRACKET) {
		parseStatement();
		say ("Parsing another statement in the same list")
		parseStatementList();
	    }
	    else {	
	    if (eatThisToken(K_RBRACKET) == kSuccess)
		return kSuccess;
	    else
		return kFailure
	    }
	    return kSuccess;
	}
	
	function parseExpr() {
	    say("Parsing Expr");
	    if (checkToken(kCheck).kind == K_DIGIT)
		parseIntExpr()
	    else if (checkToken(kCheck).kind == K_QUOTE)
		parseCharExpr()
	    else if (checkToken(kCheck).kind == K_ID)
		return kSuccess;
	    else return kFailure;
	    return kSuccess;
	}
	
	function parseIntExpr() {
	    say("Parsing Int Expr");
	    if (eatThisToken(K_DIGIT) == kSuccess)
		; // Keep going
	    else
		return kFailure
	    if (checkToken(kCheck).kind != K_OPERAND)
		return kSuccess;
	    else {
		eatThisToken(K_OPERAND);
		parseIntExpr();
	    }
	    return kSuccess;
	}
	
	function parseCharExpr() {
	    say("Parsing Char Expr");
	    if (eatThisToken(K_QUOTE) == kSuccess)
		; // Keep going
	    else
		return kFailure
	    parseCharList();
	    if (eatThisToken(K_QUOTE) == kSuccess)
		; // Keep going
	    else
		return kFailure
	    return kSuccess;
	}
	
	function parseCharList() {
	    say("Parsing Char List");
	    if (checkToken(kCheck).kind != K_QUOTE) {
		if (eatThisToken(K_CHAR) == kSuccess)
		    ; // Keep going
		else
		    return;
		parseCharList();
	    }
	    return;
	}
	
	function parseVarDecl() {
	    say("Parsing Var Decl");
	    if (eatThisToken(K_ID) == kSuccess) {
		symbols[Symbol.counter] = new Symbol(thisToken.value, lastToken.value)
	    }
	    else
		;
	    return	
	}
	
	function eatThisToken(tokenKind) {
	    lastToken = thisToken;
	    thisToken = checkToken(kConsume);
	    say("Checking for " + tokenKind)
	    if (thisToken.kind == tokenKind) {
		say("  Found " + tokenKind + "!")
		return kSuccess
	    }
	    else {
		say("  Didnt find " + tokenKind + ". Found " + thisToken.kind + " instead.")
	    }
	    return kFailure
	}
	
	function checkToken(consume) {
	    var indexToGet = tokenIndex;
	    if (consume == kConsume) {
		say("Consumed " + tokens[tokenIndex])
		tokenIndex = tokenIndex + 1;
	    }
	    else
		say("Checked but did not consume "+tokens[tokenIndex])
	    return tokens[indexToGet];
	}
	
	function say(msg) {
	    results.push(msg)
	}
