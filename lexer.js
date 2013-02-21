/* Anna Clayton */
/* February 2013 */
/* lexer.js  */

    const K_INT = "int";
    const K_CHARTYPE = "char";
    const K_DOLLAR = "end_of_file";
    const K_PRINT = "print";
    const K_RPAREN = "rparen";
    const K_LPAREN = "lparen";
    const K_RBRACKET = "rbracket";
    const K_LBRACKET = "lbracket";
    const K_PLUS = "plus";
    const K_MINUS = "minus";
    const K_QUOTE = "quote";
    const K_STRING = "string";
    const K_EQUAL = "assign";
    const K_OPERAND = "operand";
    const K_DIGIT = "digit";
    const K_CHAR = "char";
    const K_TYPE = "type";
    const K_ID = "identifier";
    
    const eErrorsFound = "Errors were found";
    const wMoreInput = "Input after EOF ignored";
    const wNoEOF = "Missing EOF meta-symbol was inserted";
    
    // Set up hash of all reserved words and which constant they go with
    var ReservedWords = { int: {lexeme: K_TYPE, value: K_INT},
                          P: {lexeme: K_PRINT, value: null},
                          char: {lexeme: K_TYPE, value: K_CHARTYPE},
                          };
                          

var Token = function(k, v, l, w, toknum){
    // Keep a count of tokens
    if (Token.counter == undefined) {
        Token.counter = 1;
    } else {
        Token.counter++;
    }
    var t = {kind: k, value: v, loc: l, warn: w, toknum: Token.counter};
    
    t.lineOutput = function() {
	if (t.loc) 
	    return " at line # " + t.loc;
	else
	    return ""
    }
    
    t.warnOutput = function() {
	if (t.warn)
	    return "\n**Warning: " + t.warn + "**";
	else
	    return ""
	
    }
    t.toString = function(){
	if (t.value)
	    return t.toknum + ": <" + t.kind + " : "+t.value+"> " + t.lineOutput() + t.warnOutput();
	else
	    return t.toknum + ": <" + t.kind + "> " + t.lineOutput() + t.warnOutput();
    }
    return t;
}

    function lex()
    {
	Token.counter = null;
        var tokens = {};
        tokens = new Array();
	var returnString = "";
	var errors = {};
	errors = new Array();
	var inQuotes = false;
	var quotesBegin = 0;
	var foundEOF = false;
	var tempString = '';
	
	errors.push(eErrorsFound);
	
	// Grab the "raw" source code.
        var sourceCode = document.getElementById("taSourceCode").value.trim();
      //  alert(sourceCode);
	
	// Break up the source code by line 
	lines = sourceCode.split(/\n/);
	
	// Process each line:
	for(var line=0; line<lines.length && foundEOF == false; line++) {
	  //  tempString = '';
	    // Add spaces around all the punctuation so I can tokenize the string
	    // If we're within quotes, replace all spaces by the hex character 00
	    // so we can remember where they were later.  
	    for(var i=0; i<lines[line].length; i++){
		// If the character is a quote, keep track of whether it's a begin-quote or an end-quote
		if (/\"/.test(lines[line].charAt(i))) {
		    if (inQuotes)
			inQuotes = false
		    else
			inQuotes = true
		}
		// Replace spaces with hex A9 (copyright symbol) if they're within quotes
		// Tried to use hex 00, but I guess Javascript strings must be null terminated
		if (inQuotes){
		    if (/\s/.test(lines[line].charAt(i))) {
			tempString += "\xA9"
		    }
		}
		if (/[\$\(\)\+\-\=\{\}\"]/.test(lines[line].charAt(i)))
		    tempString += ' ' + lines[line].charAt(i) + ' ';
		else
		    tempString += lines[line].charAt(i);
	    }
	    // If the end of the line was reached and quotes have not been terminated, an error should
	    // be generated.  To avoid further errors, just skip lexing this line for now, append the
	    // next line, then continue lexing.  
	    if (inQuotes)
		tempString += "\xAA"
	    // alert(tempString)
	    if (inQuotes == false) {
	   // Tokenize the string. Return a list of anything surrounded by spaces
	    words = tempString.match(/\S+/g);
	   // alert(words)
	    // If we found any tokens on this line, 
            if (words) {
		//alert(words)
		// For each of them
		for (var j = 0; j < words.length && foundEOF == false; j++) {
		//  alert(words[j]);
		    // Figure out what type of lexeme it is
		    switch(true) {
			
		    	// If the next token is a double quote
			case (words[j] == "\""):
			    tokens.push(Token(K_QUOTE, null, line+1))
			    // If we're currently "in quotes" and this is a terminating quote, turn off the inQuotes indicator.
			    // Otherwise this is the first quotes of a pair, so turn on the inQuotes indicator.
			    // Note that if there are mismatched quotes, inQuotes will be true at the end of lexical analysis. This is bad!
			    if (inQuotes)
				inQuotes = false
			    else {
				inQuotes = true
				quotesBegin = line+1
			    }
			break;
		    
			// If the last token seen was a quote
			case (inQuotes):
			// processing a charstring within quotes
			// deal with the case where end of file is seen before the end quote is seen
			// break everything within quotes to character tokens
			// Note that spaces within quotes have been stripped. Need to think of a way to fix this for round 2.
			    chars = words[j].split('');
			    for (var l=0; l<chars.length; l++) {
				if (/[a-z]/.test(chars[l])) {
				    tokens.push(Token(K_CHAR, chars[l], line+1))
				}
				else {
				    // Remember we replaced spaces within quotes with hex A9 characters
				    // so we could tokenize the input by whitespace? Now we have to
				    // remember that they used to be spaces and err because in phase 1,
				    // spaces aren't allowed in a character string.  Later, move the
				    // test out of the error path and convert the characters back to
				    // spaces.  
				    if (/[\xA9]/.test(chars[l]))
					errors.push("Spaces not allowed as part of a character string on line " + eval(line+1));
				    // However, we're never gonna be allowed to add newlines (which were changed to
				    // xAA characters) to character strings. This check can stay right where it is
				    // and always generate a lex error.  
				    else if (/[\xAA]/.test(chars[l]))
					errors.push("Newline not allowed as part of a character string on line " + eval(line+1));
				    // Else some other not-allowed character (capital letter, punctuation, etc)
				    // was encountered
				    else	
					errors.push(chars[l] + " not allowed as part of a character string on line " + eval(line+1));
				}
			    }			    
			break;
		    
			// If the next token is a "digit" -- int of length = 1
			case (/\d/.test(words[j]) && words[j].length == 1):
			    // Numbers may only be 1 digit
			    tokens.push(Token(K_DIGIT, words[j], line+1));
			break;
		    
			// If the next token is a recognized reserved word
			case (words[j] in ReservedWords):
			    tokens.push(Token(ReservedWords[eval("\"" + words[j] + "\"")].lexeme, ReservedWords[eval("\"" + words[j] + "\"")].value, line+1))
			break;
		    
			// If the next token is a plus sign
			case (words[j] == "+"):
			    tokens.push(Token(K_OPERAND, K_PLUS, line+1))
			break;
			
			// If the next token is a minus sign
			case (words[j] == "-"):
			    tokens.push(Token(K_OPERAND, K_MINUS, line+1))
			break;
			
			// If the next token is an equals sign
			case (words[j] == "="):
			    tokens.push(Token(K_EQUAL, null, line+1))
			break;
		    
			// If the next token is a right paren
			case (words[j] == "("):
			    tokens.push(Token(K_LPAREN, null, line+1))
			break;
		    
			// If the next token is a left paren
			case (words[j] == ")"):
			    tokens.push(Token(K_RPAREN, null, line+1))
			break;
		    
			// If the next token is a right bracket
			case (words[j] == "{"):
			    tokens.push(Token(K_LBRACKET, null, line+1, null))
			break;
		    
			// If the next token is a left bracket
			case (words[j] == "}"):
			    tokens.push(Token(K_RBRACKET, null, line+1))
			break;
		    
			// If the next token is the end-of-input meta-symbol, $
			case (words[j] == "$"):
			    // Indicate that EOF symbol was seen
			    foundEOF = true
			    // If we're not at the end of the input, push the token with a warning
			    // Otherwise just push the token
			    if (j<words.length - 1|| line < lines.length - 1)
				tokens.push(Token(K_DOLLAR,null,line+1,wMoreInput))
			    else
				tokens.push(Token(K_DOLLAR,null,line+1))
			break;
			
			// If the next token is a valid identifier
			case (/[a-z]/.test(words[j]) && words[j].length == 1):
			// For round 1, all identifiers are 1 character in length.
			// May need a better RE to identify a valid >1 length identifier for the final.  
			    tokens.push(Token(K_ID, words[j], line+1))
			break;
		    
			// The next couple cases are for known errors with custom error messages
		    	case (/\d/.test(words[j]) && words[j].length > 1):
			    // Numbers are only 1 digit in round 1. Give a descriptive error message if int > 9
			    errors.push("Integers must be <= 9.  Integer with value " + words[j] + " seen on line " + eval(line+1));
			break;
		    
			// Default case is something completely unknown
			default:
			    errors.push("Unknown lexeme: " + words[j] + " on line " + eval(line+1));
			break;
		    } // End select
		} // End for each word
	    tempString = '';
            } // End if words ! null
	    } // End if inQuotes == false
        } // End for each line'
	
	// If the end of input has been reached and a begin-quote was seen but an end-quote wasn't, give an error.
	// There are probably lots and lots of other errors already due to non-valid characters within quotes, so this
	// error is just icing on the cake. But it's the good kind of icing, because it's probably easier to interpret/fix the error.  
	if (inQuotes)
	    errors.push("Unterminated quotes beginning on line " + quotesBegin);
	    
	// If all the input was processed and the EOF meta-symbol wasn't seen, push it with a warning
	if (foundEOF == false)
	    tokens.push(Token(K_DOLLAR,null,null,wNoEOF))
	    
	// If at least one error was found (errors[0] is a string constant kErrors), then return
	// the array of errors. Otherwise return the array of tokens (The tokens include warning messages
	// where appropriate).  
	if (errors.length > 1)
	    return errors;
	else
	    return tokens;      
    } // End function lex

