/* Anna Clayton */
/* February 2013 */
/* constants.js  */
/* Constants are used by both lexer.js and parser.js (and later typechecker.js and codegen.js)
 * so they're kept in a common location */

    /* Constants for the types of lexemes
     * as well as some of the generic values (like plus, which is a possible value of
     * a lexeme of the type the type K_OPERAND) */
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
    const K_EQUALITY = "equals";
    const K_OPERAND = "operand";
    const K_DIGIT = "digit";
    const K_CHAR = "char";
    const K_TYPE = "type";
    const K_ID = "identifier";
    const K_ANYTYPE = "any";
    const K_BOOLEAN = "boolean";
    const K_BOOLVAL = "boolval";
    const K_FALSE = "false";
    const K_TRUE = "true";
    const K_WHILE = "while";
    const K_IF = "if";

    
    /* Errors and warnings */
    const eErrorsFound = "Errors were found";
    const wMoreInput = "Input after EOF ignored";
    const wNoEOF = "Missing EOF meta-symbol was inserted";
    const wP = "Deprecated keyword \"P\". Use \"print\" instead";
    const wChar = "Deprecated keyword \"char\". Use \"string\" instead";

    
    /* kConsume and kCheck are the values that can be passed to function checkToken
     * in parser.js to indicate whether the tokenIndex should be incremented to point
     * to the next token. Consume means it is, check means it isn't (so we can later)
     * consume the token that was just checked */
    const kConsume = 1;
    const kCheck = 0;
    
    /* kSuccess and kFailure are returned from match and matchMany to indicate whether the match
     * was found or not */
    const kSuccess = 0;
    const kFailure = 1;