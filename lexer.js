/* Anna Clayton */
/* February 2013 */
/* lexer.js  */

    const T_INT = "int_type";
    const T_CHAR = "char_type";
    const T_DOLLAR = "end_of_file";
    const T_PRINT = "print";
    const T_RPAREN = "rparen";
    const T_LPAREN = "lparen";
    const T_RBRACKET = "rbracket";
    const T_LBRACKET = "lbracket";
    const T_PLUS = "plus";
    const T_MINUS = "minus";
    const T_QUOTE = "quote";
    const T_STRING = "string";
    const T_EQUAL = "assign";
    
    const K_OPERAND = "operand";
    const K_TYPE = "type";
    const K_INT = "integer";
    const K_STRING = "string";
    const K_ID = "identifier";
    const K_TERMINATOR = "terminator";
    
    // Set up hash of all reserved words and which constant they go with
    var ReservedWords = { int: T_INT,
                          Int: T_INT,
                          P: T_PRINT,
                          char: T_CHAR,
                          $: T_DOLLAR
                          };
                          

var Token = function(k, v, l, toknum){
    // Keep a count of tokens
    if (Token.counter == undefined) {
        Token.counter = 0;
    } else {
        Token.counter++;
    }
    var t = {kind: k, value: v, loc: l, toknum: Token.counter};

    t.toString = function(){
        return t.toknum + ": <" + t.kind + " : "+t.value+"> at line # "+t.loc + "\n";
    }
    return t;
}

    function lex()
    {
        var tokens = {};
        tokens = new Array();
	var returnString = "";
	// Grab the "raw" source code.
//	var sourceCode = document.getElementById("taSourceCode").value;
//	var sourceCode = $('#textAreaWithLines').getElementById("taSourceCode").value;
        

        var sourceCode = document.getElementById("taSourceCode").value;
      //  alert(sourceCode);
	
	// Break up the source code by line 
	lines = sourceCode.split(/\n/);
	
	// Process each line:
	for(var line=0; line<lines.length; line++) {
	    tempString = '';
	    // Add spaces around all the punctuation so I can tokenize the string
	    for(var i=0; i<lines[line].length; i++){
	      if (/[\$\(\)\+\-\{\}\"]/.test(lines[line].charAt(i)))
	        tempString += ' ' + lines[line].charAt(i) + ' ';
	      else
	        tempString += lines[line].charAt(i);
	    }
     
	   // Tokenize the string. Return a list of anything surrounded by spaces
	    words = tempString.match(/\S+/g);
            if (words) {
            for (var j = 0; j < words.length; j++) {
            //  alert(words[j]);
            switch(true) {
            case (/\d/.test(words[j])): 
                tokens.push(Token(K_INT, words[j], line+1));
                break;
            
            case (words[j] in ReservedWords):
                tokens.push(Token(ReservedWords[eval("\"" + words[j] + "\"")], null, line+1))
                break;
            
            case (words[j] == "+"):
                tokens.push(Token(K_OPERAND, T_PLUS, line+1))
                break;
                
            case (words[j] == "-"):
                tokens.push(Token(K_OPERAND, T_MINUS, line+1))
                break;
                
            case (words[j] == "="):
                tokens.push(Token(K_OPERAND, T_EQUAL, line+1))
                break;
            
            case (words[j] == "("):
                tokens.push(Token(K_TERMINATOR, T_RPAREN, line+1))
                break;
            
            case (words[j] == ")"):
                tokens.push(Token(K_TERMINATOR, T_LPAREN, line+1))
                break;
            
            case (words[j] == "{"):
                tokens.push(Token(K_TERMINATOR, T_RBRACKET, line+1))
                break;
            
            case (words[j] == "}"):
                tokens.push(Token(K_TERMINATOR, T_LBRACKET, line+1))
                break;
            
            case (words[j] == "\""):
                tokens.push(Token(T_QUOTE, null, line+1))
                break;
            
            case (/[a-z]/.test(words[j]) && words[j].length == 1):
                tokens.push(Token(K_ID, words[j], line+1))
                break;
            
            default:
                alert("I don't know what to do with " + words[j]);
                break;
            }
            }
            }
        }   
	return tokens;      
    }

