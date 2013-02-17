/* Anna Clayton */
/* February 2013 */
/* parser.js  */

	const kConsume = 1;
	const kCheck = 0;
	const kFailure = 0;
	const kSuccess = 0;
	
	var tokenIndex = 0;
	var thisToken = new Token();
	var nextToken = new Token();
	
         function parse() {
	    say("parse()");
	    var results = kFailure;
	    results = parseProgram();
	    return results;
	}
	
	function parseProgram() {
	    say("ParseProgram()");
	    parseStatement();
	    if (eatThisToken(K_DOLLAR) == kSuccess)
		return kSuccess
	    else
		return kFailure
	}
	
	function parseStatement() {
	    say("ParseStatement()");
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
	    say("parsePrintStatement()");
	    
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
	    say("parseAssignStatement()");
	    if (eatThisToken(K_EQUAL) == kSuccess)
		; // Keep going
	    else
		return kFailure
	    
	    thisToken = checkToken(kConsume)
	    parseExpr()
	    
	    return kSuccess
	}
	
	function parseStatementList() {
	    say("ParseStatementList()");
	    if (checkToken(kCheck).kind != K_RBRACKET) {
		parseStatement();
		say ("Back in parseStatementList(), recursing ")
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
	    say("ParseExpr()");
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
	    say("ParseIntExpr()");
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
	    say("ParseCharExpr()");
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
	    say("ParseCharList()");
	    if (checkToken(kCheck).kind != K_QUOTE) {
		if (eatThisToken(K_CHAR) == kSuccess)
		    ; // Keep going
		else
		    return kFailure
		parseCharList();
	    }
	    return kSuccess;
	}
	
	function parseVarDecl() {
	    say("ParseVarDecl()");
	    if (eatThisToken(K_ID) == kSuccess)
		return kSuccess
	    else
		return kFailure
	}
	
	function eatThisToken(tokenKind) {
	    thisToken = checkToken(kConsume);
	    say("Checking for " + tokenKind)
	    if (thisToken.kind == tokenKind) {
		say("  Found " + tokenKind + "!")
		return kSuccess;
	    }
	    else {
		say("  Didnt find " + tokenKind + ". Found " + thisToken.kind + " instead.")
		return kFailure;
	    }
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
	    putMessage("taOutput",msg)
	}
