/* Anna Clayton */
/* May 2013 */
/* generator.js  */

    // Variables to keep track of where we are and what we've done
    var code
    var errors
    var numErrors 
    var currentScope
    var currentScopeNum
    var lastScope
    var nextStaticLoc
    var tempVarNum
    var tempStaticArray
    var tempStatic
    
    // Variables used to build declare and print operations
    var declareType
    var declareInit
    var printXVal
    var printYVal
    
    // Opcode constants
    const I_LDA_CONST = "A9"
    const I_LDA_MEM = "AD"
    const I_STA = "8D"
    const I_ADC = "6D"
    const I_LDX_CONST = "A2"
    const I_LDX_MEM = "AE"
    const I_LDY_CONST = "A0"
    const I_LDY_MEM = "AC"
    const I_NOOP = "EA"
    const I_BRK = "00"
    const I_CPX = "EC"
    const I_BNE = "D0"
    const I_INC = "EE"
    const I_SYS = "FF"
    
    // Static table entry types
    const T_INT = "INT"
    const T_BOOL = "BOO"
    const T_STRING = "STR"
    const T_WORK = "WRK"
    
    // Constants 
    const V_TRUE = "01"
    const V_FALSE = "00"
    const V_PRINTVAL = "01"
    const V_PRINTSTRING = "02"
     
    var CodeStream = function(){
    
        var codearray = {code: new Array(256) , nextEntry : 0, currentHeapAddress : 255, openLoops: new Array()};
    
	// Initialize all code bytes to null
        for (var c=0; c<256; c++)
            codearray[c] = "00"
            
	// Pretty-print the code. Interestingly enough, the text area on compiler.html is juuust wide enough to accommodate the code print.      
        codearray.toString = function(){
            var string = ""
            for (var c=0; c<256; c++) {
                string = string + " " + codearray[c]
                if ((c+1)%16==0)
                    string = string + "\n"
            }
            return string
        }
        
	// Add a new instruction starting at nextEntry
        codearray.addInstruction = function(newInstruction) {
	    // Concat newInstruction to an empty array so that if it was sent as a String object, it's an array now
            newInstruction = [].concat(newInstruction)
	    // For each part of the instruction ..
            for (var i=0; i<newInstruction.length;i++) {
		// If a complete address was sent in, it'll be 4 bytes. Split it up to 2 separate entries that take up 2 bytes each
		if (newInstruction[i].length == 4) {
		    newInstruction.splice(i+1, 0, newInstruction[i].substring(2))
		    newInstruction[i] = newInstruction[i].substring(0,2)
		}
		// Set the next location in codearray to this byte of the new instruction and increment where nextEntry points
                codearray[codearray.nextEntry] = newInstruction[i]
                codearray.nextEntry = codearray.nextEntry + 1
            }
	    // For each loop (if/while branch) that's currently "active" increment the number of bytes by the number that was just added.  
	    for (var l=0; l<codearray.openLoops.length; l++) {
		codearray.openLoops[l].bytes = codearray.openLoops[l].bytes + newInstruction.length
	    }
        } // End of addInstruction
	
	// Add a new jump to the array of active ones. This gets called whenever if/while are encountered
	codearray.startLoop = function(loop) {
	    codearray.openLoops.push(loop)
	}
	
	// Pop the top jump off the array. This gets called whenever the ending of an if/while statement block is encountered
	codearray.stopLoop = function() {
	    return codearray.openLoops.pop()
	}
        
	// Add a string to the end of the heap, "just put it there" fashion. Update the currentHeapAddress "pointer" to point to the
	// front of the newly added string.  
        codearray.addToHeap = function(stringToAdd) {
            for (var i=0; i<stringToAdd.length; i++) {
                codearray[codearray.currentHeapAddress-stringToAdd.length+i] = stringToAdd[i].charCodeAt(0).toString(16).toUpperCase()
            }
            codearray.currentHeapAddress = codearray.currentHeapAddress - (stringToAdd.length + 1)
            codearray[codearray.currentHeapAddress] = I_BRK
        }
        
        return codearray;
    } // End of CodeStream
    
    var StaticTableEntry = function(temp, loc, name, type, scope, offset) {
        // Keep a count of entries to use for the offset (each entry uses 1 byte)
        if (StaticTableEntry.counter == undefined) {
            StaticTableEntry.counter = 0;
    } else {
        StaticTableEntry.counter++;
    }
    
        var entry = {temp : temp , loc : loc , name : name , type : type , scope : scope , offset : StaticTableEntry.counter}
        
        entry.toString = function(){
	    return "| " + entry.temp + " | " + entry.loc + " | " + entry.name + " | " + entry.type + " | "  + toHex2(entry.scope) + "  |"
        }
    
        return entry
    }
    
    var JumpTableEntry = function(jumpid, bytes) {
    
        var entry = {jumpid : jumpid , bytes : bytes }
        
        entry.toString = function(){
	    return "|  " + entry.jumpid + "  |  " + new String("000" + entry.bytes).slice(-3) + "   |"
        }
    
        return entry
    }

    // Here we go. Let's generate some code.  
    function Generate() {
	
	// Initialize stuff (mostly to null or zero)
	StaticTableEntry.counter = undefined
        code = new CodeStream()
        jumpTable = new Array()
        errors = new Array()
	numErrors = 0
        staticTable = new Array()
	currentScope = null
	lastScope = null
	currentScopeNum = 0
	jumpNum = 0
	nextStaticLoc = 0
	tempVarNum = 1
	tempStaticArray = new Array()
	tempStatic = "T" + new String("000" + nextStaticLoc).slice(-3)
	nextStaticLoc = nextStaticLoc + 1
	// Set aside one static location as a work variable to use in calculating int exprs and bool exprs
	staticTable.push(new StaticTableEntry(tempStatic,'0',tempVarNum,T_WORK,0))
	tempVarNum = tempVarNum + 1

	// And ... go!
        generateCodeFromAST()
	
        /* Return a pile of stuff to the caller. The caller knows what to do with all this */
	return { errors : errors, code : code , staticTable : staticTable , jumpTable : jumpTable }
    }
    
    // Generate the code needed when any type of declare statement is encountered.
    // Ints and bools are initialized as zero, strings are initialized to point to location FF (which will always be null)
    generateDeclare = function(node) {
        tempLocation = 'T' + new String("000" + nextStaticLoc).slice(-3)
        nextStaticLoc = nextStaticLoc + 1
	switch(node.children[0].name.value) {
	    case (K_INT): 
		declareType = T_INT
		declareInit = "00"
		break;
	    case (K_BOOLEAN): 
		declareType = T_BOOL
		declareInit = "00"
		break;
	    case (K_STRING): 
		declareType = T_STRING
		declareInit = "FF"
		break;
	}
	
	if (currentScope == null)
	    staticTable.push(new StaticTableEntry(tempLocation,"0",node.children[1].name.value,declareType,0))
	else    
	    staticTable.push(new StaticTableEntry(tempLocation,"0",node.children[1].name.value,declareType,currentScope.num))
        code.addInstruction([I_LDA_CONST,declareInit]) 
        code.addInstruction([I_STA,tempLocation])     
    }
    
    // for an assign, node.children[0] is the identifier being assigned
    // and node.children[1] is the value being assigned to it
    // 	- digit -> load accum = value (A9 xx)
    //	- string -> add to heap; load accum = currentHeapLocation (A9 xx)
    //	- boolean value -> load accum = value (A9 00 for false or A9 01 for true)
    //  - identifier -> load accum = from memory. Look up source location to get value from in static table
    //  - comparison
    //  - operand
    //
    // Final step:
    //     look up location to store value from static table (will be temp, will be 4 characters)
    // 		scope = currentScope.num
    //		var = node.children[0].value
    //     store value in accumulator at location (8D xx xx)
    generateAssign = function(node) {
	switch(node.children[1].name.kind) {
	    case (K_DIGIT):
		code.addInstruction([I_LDA_CONST,toHex2(node.children[1].name.value)])
		break;
	    case (K_BOOLVAL):
		switch(node.children[1].name.value) {
		    case(K_FALSE):
			code.addInstruction([I_LDA_CONST,V_FALSE])
			break;
		    case(K_TRUE):
			code.addInstruction([I_LDA_CONST,V_TRUE])
			break;
		}
		break;
	    case (K_STRING):
		code.addToHeap(node.children[1].name.value)
		code.addInstruction([I_LDA_CONST,toHex2(eval(code.currentHeapAddress+1))])
		break;
	    case (K_ID):
		thisvariableisnotalocation = lookUpId(node.children[1].name.value).temp
		    code.addInstruction([I_LDA_MEM,thisvariableisnotalocation])
		break;
	    case (K_OPERAND):
		generateIntExpr(node.children[1])
		code.addInstruction([I_LDA_MEM,tempStatic])
		break
	    case (K_COMPARISON):
		generateBoolExpr(node.children[1])
		code.addInstruction([I_LDA_MEM,tempStatic])
		break
	}
	
	targetLocation = lookUpId(node.children[0].name.value).temp
        code.addInstruction([I_STA,targetLocation])    
    }
    
	// generateIntExpr is called when an assign/print statement has child node that's an operand.
	// Will get called recursively if the [right side] child of the node is another operand
	// Value ends up stored in memory at the tempStatic address - generateAssign and generatePrint know where to find it.
	//
	// Supports subtraction (by finding the 2s complement of the digit being subtracted and adding that instead)
	// but not if the right side child is an id. If that's the case, returns a compile time error.  
    	generateIntExpr = function(node) {
	    addAddress = tempStatic
	    switch(node.children[1].name.kind) {
		case(K_OPERAND):
		    generateIntExpr(node.children[1])
		    break
		case(K_DIGIT):
		    if (node.name.value == K_MINUS)
			code.addInstruction([I_LDA_CONST,toHex2(256-node.children[1].name.value)])
		    else
			code.addInstruction([I_LDA_CONST,toHex2(node.children[1].name.value)])
		    code.addInstruction([I_STA,addAddress])
		    break
		case(K_ID):
		    if (node.name.value == K_MINUS)
			error("Compile error: Can't subtract variables until the OS implements a subtraction operation")
		    addAddress = lookUpId(node.children[1].name.value).temp
		    break
	    }

	    if (node.parent.name.value == K_MINUS)
		code.addInstruction([I_LDA_CONST,toHex2(256-node.children[0].name.value)])
	    else
		code.addInstruction([I_LDA_CONST,toHex2(node.children[0].name.value)])
	    code.addInstruction([I_ADC,addAddress])			
	    code.addInstruction([I_STA,tempStatic])
	}
	
	 
	 // This works. Promise.  
    	generateBoolExpr = function(node) {
	    switch(node.children[0].name.kind) {
		case(K_COMPARISON):
		    generateBoolExpr(node.children[0])
		    break
		case(K_OPERAND):
		    generateIntExpr(node.children[0])
		    code.addInstruction([I_LDA_MEM,tempStatic])
		    break
		case(K_DIGIT):
		    code.addInstruction([I_LDA_CONST,toHex2(node.children[0].name.value)])
		    break
		case (K_BOOLVAL):
		    if (node.children[0].name.value == K_FALSE)
			code.addInstruction([I_LDA_CONST,V_FALSE])
		    else
			code.addInstruction([I_LDA_CONST,V_TRUE])
		    break
		case(K_ID):
		    address = lookUpId(node.children[0].name.value).temp
		    code.addInstruction([I_LDA_MEM,address])
		    break
	    }
	    
	    newTemp = "T" + new String("000" + nextStaticLoc).slice(-3)
	    nextStaticLoc = nextStaticLoc + 1
	    staticTable.push(new StaticTableEntry(newTemp,'0',tempVarNum,T_WORK,0))
	    tempVarNum = tempVarNum + 1
	    code.addInstruction([I_STA,newTemp])
	    tempStaticArray.push(newTemp)
	    
	    switch(node.children[1].name.kind) {
		case(K_COMPARISON):
		    generateBoolExpr(node.children[1])
		    break
		case(K_OPERAND):
		    generateIntExpr(node.children[1])
		    code.addInstruction([I_LDA_MEM,tempStatic])
		    break
		case(K_DIGIT):
		    code.addInstruction([I_LDA_CONST,toHex2(node.children[1].name.value)])
		    break
		case (K_BOOLVAL):
		    if (node.children[1].name.value == K_FALSE)
			code.addInstruction([I_LDA_CONST,V_FALSE])
		    else
			code.addInstruction([I_LDA_CONST,V_TRUE])
		    break
		case(K_ID):
		    address = lookUpId(node.children[1].name.value).temp
		    code.addInstruction([I_LDA_MEM,address])
		    break
	    }
	    newTemp = tempStaticArray.pop()

	code.addInstruction([I_STA,tempStatic]) // store accumulator (right side of comparison) at work1
	code.addInstruction([I_LDX_MEM,newTemp]) // load x reg from the temp static address grabbed for it (left side of comparison)
	code.addInstruction([I_CPX,tempStatic]) // compare what's in the x reg (left side) to what is in memory at work1 (right side)
	code.addInstruction([I_BNE,toHex2(12)]) // if they aren't equal, branch forward 12 bytes over 5 instructions
	
	code.addInstruction([I_LDA_CONST,V_TRUE]) // 2 - load accumulator with constant 1
	code.addInstruction([I_STA,tempStatic]) // 3 - store the constant 1 at work1 (this means the left side was equal to the right side -- true. also used in the next bne to branch over setting work3 to false)
	code.addInstruction([I_LDX_CONST,V_FALSE]) //2 - load x reg with constant 0 (false)
	code.addInstruction([I_CPX,tempStatic]) // 3 - compare what's in the x reg (0) with what's in memory at work1 (true = 1) - will always be false and set z = 0 
	code.addInstruction([I_BNE,toHex2(5)]) // 2 - branch (unconditionally) forward 5 bytes past 2 instructions
	//j2:
	code.addInstruction([I_LDA_CONST,V_FALSE]) // 2 - load accumulator with constant 0 (false for the comparison)
	code.addInstruction([I_STA,tempStatic]) // 3 - store the constant 0 at work3 (this means the left side was not equal to the right side -- false)
	//j3:
	
	}
    
	generateIfWhileCondition = function(node) {
	    if (node.children[0].name.kind == K_BOOLVAL) {
		if (node.children[0].name.value == K_FALSE)
		    code.addInstruction([I_LDA_CONST,V_FALSE])
		else
		    code.addInstruction([I_LDA_CONST,V_TRUE])
		code.addInstruction([I_STA,tempStatic])    
	    }
	    else
		generateBoolExpr(node.children[0])
	}
	
	generateWhileBranchBack = function(jump) {
	    code.addInstruction([I_LDA_CONST,V_TRUE])
	    code.addInstruction([I_STA,tempStatic])
	    code.addInstruction([I_LDX_CONST,V_FALSE])
	    code.addInstruction([I_CPX,tempStatic])
	    jumpBackBytes = 256 - jump.bytes
	    code.addInstruction([I_BNE,toHex2(jumpBackBytes)])
	}
	
    generatePrint = function(node) {
	switch(node.children[0].name.kind) {
	    case (K_DIGIT):
		code.addInstruction([I_LDY_CONST,toHex2(node.children[0].name.value)])
		printXVal = V_PRINTVAL
		break;
	    case (K_BOOLVAL):
		switch(node.children[0].name.value) {
		    case (K_FALSE):
			code.addInstruction([I_LDY_CONST,V_FALSE])
			break;
		    case (K_TRUE):
			code.addInstruction([I_LDY_CONST,V_TRUE])
			break;
		}
		printXVal = V_PRINTVAL
		break;
	    case (K_STRING):
		code.addToHeap(node.children[0].name.value)
		code.addInstruction([I_LDY_CONST,toHex2(eval(code.currentHeapAddress+1))])
		printXVal = V_PRINTSTRING
		break;
	    case (K_ID):
		temp=lookUpId(node.children[0].name.value)
			if (temp.type == T_STRING) {
			    code.addInstruction([I_LDY_MEM,temp.temp])
			    printXVal = V_PRINTSTRING
			}
			else {
			    code.addInstruction([I_LDY_MEM,temp.temp])
			    printXVal = V_PRINTVAL
			}
		break
	    case (K_OPERAND):
		generateIntExpr(node.children[0])
		code.addInstruction([I_LDY_MEM,tempStatic])
		printXVal = V_PRINTVAL
		break
	    case (K_COMPARISON):
		generateBoolExpr(node.children[0])
		code.addInstruction([I_LDY_MEM,tempStatic])
		printXVal = V_PRINTVAL
		break
	}
	
	code.addInstruction([I_LDX_CONST,printXVal])
	code.addInstruction(I_SYS)
    }    
    
    generateCodeFromAST = function() {

        generateCode = function(node) {
	    
            switch(node.name) {
                case (B_DECLARE):
                    generateDeclare(node)	
                    break
                case (B_ASSIGN):
		    generateAssign(node)
                    break
                case (B_PRINT):
		    generatePrint(node)
                    break
		case (B_IF):
		    generateIfWhileCondition(node)
		    code.addInstruction([I_LDX_CONST,V_TRUE])       // load x with "TRUE"
		    code.addInstruction([I_CPX,tempStatic])	  // compare results of boolean expression with true
		    thisJump = new JumpTableEntry("J"+jumpNum,0)
		    jumpNum = jumpNum + 1    
		    code.addInstruction([I_BNE,thisJump.jumpid]) // if the if expression didn't evaluate to true, branch as many bytes as the if code.  right now its
	                                                //a jump temp name later will backpatch to actual num
		    			
		    jumpTable.push(thisJump)
		    code.startLoop(thisJump)
		    generateCode(node.children[1])
		    code.stopLoop()
		    break
		case (B_WHILE):
		    backJump = new JumpTableEntry("B"+jumpNum,0)
		    jumpTable.push(backJump)
		    code.startLoop(backJump)
		    generateIfWhileCondition(node)
		    code.addInstruction([I_LDX_CONST,V_TRUE])       // load x with "TRUE"
		    code.addInstruction([I_CPX,tempStatic])	  // compare results of boolean expression with true
		    thisJump = new JumpTableEntry("J"+jumpNum,0)
		    code.addInstruction([I_BNE,thisJump.jumpid])
		    jumpTable.push(thisJump)
		    code.startLoop(thisJump)
		    jumpNum = jumpNum + 1
		    generateCode(node.children[1])
		    generateWhileBranchBack(code.openLoops[code.openLoops.length-2])
		    code.stopLoop() // stop "skip while contents" loop
		    code.stopLoop() // stop "branch back to before while check" loop
		    break
                case (B_STATEMENTLIST):
                    currentScopeNum = currentScopeNum + 1
		    if (currentScope == null) {
			currentScope = Scope.root
		    }
		    else {
			if (lastScope == null || currentScope.children[currentScope.children.indexOf(lastScope)] == currentScope.children.length-1)
			    currentScope = currentScope.children[0]
			else
			    currentScope = currentScope.children[currentScope.children.indexOf(lastScope)+1]
		    }
		    currentScope.num = currentScopeNum
                    break;
            }
            // Now, traverse the AST.
	    // If:
	    // - there are no children (nothing more to traverse)
	    // - the current node is a print node (the only thing to traverse is the expression being printed, which was already done)
	    // - the current node is an assign node (the only thing to traverse is the target and value of the assign, was already done)
	    // - the current node is a declare node (the only thing to traverse is the identifier and type, which was already done)
	    // - the current node is an if or while node
	    // Then return
            if (!node.children || node.children.length === 0 ||
		node.name == B_PRINT ||
		 node.name == B_ASSIGN ||
		 node.name == B_DECLARE ||
                 node.name == B_WHILE ||
                 node.name == B_IF)
                return
            // Else there are children, so traverse them to generate some more code
            for (var i = 0; i < node.children.length; i++)
                generateCode(node.children[i]);
                
            switch(node.name) {
                case (B_STATEMENTLIST):
			lastScope = currentScope
			currentScope = currentScope.parent
                    break;
            }
                
	} // End generateCode function within generateCodeFromAST()
        
	backpatch = function() {
	    for (var e=0; e<staticTable.length; e++) {
		staticLoc = staticTable[e].temp
		staticTable[e].loc = toHex2(code.nextEntry) + "00"
		for (var f=0; f<code.code.length-1; f++) {
		    if (code[f] == staticLoc.substring(0,2) &&  code[f+1] == staticLoc.substring(2)) {
			code[f] = staticTable[e].loc.substring(0,2)
			code[f+1] = staticTable[e].loc.substring(2)
		    }
		}
	      code.nextEntry = code.nextEntry + 1
	    }
	    for (var j=0; j<jumpTable.length; j++) {
		jumpBytes = toHex2(jumpTable[j].bytes)
		for (var f=0; f<code.code.length-1; f++) {
		    if (code[f] == jumpTable[j].jumpid) {
			code[f] = jumpBytes
		    }
		}
	    }
	} // End backpatch function within generateCodeFromAST()
	
	code.addInstruction([I_LDY_MEM,"13","00"]) // AC 13 00: Anna Clayton '13 - my version of DEADBABE
        generateCode(AST.root)
	code.addInstruction(I_BRK) // Always end with a break
	backpatch()
	if (code.nextEntry + (256-code.currentHeapAddress) > 256)
	    error("Compile error: Sorry man, the heap collided with the stack. \nYou don't want to see the results")
    } // End generateCodeFromAST()
    
    toHex2 = function(value) {
	return new String("00" + value.toString(16).toUpperCase()).slice(-2)
    }
    
    /* Push a message to errors and increment numErrors */
    function error(msg) {
	errors.push(msg)
	numErrors = numErrors + 1
    }
    
    // Find the temp address of an id in the static table, keeping in mind that it might be in a "higher" scope.  
    lookUpId = function(id) {
	// Start at the current node of the scope table
	thisScope = currentScope
	// If there is no scope table, return null
	if (thisScope == {})
	    return "notfound"
	// Do while there are still parent nodes of the scope tree to check
	while (thisScope.name !== undefined) {
	    if (thisScope.name !== undefined) {
		// Check each symbol in the symbol table at this scope tree node and if we find the
		// one being looked for, return it
		for (var e = 0; e < staticTable.length; e++) {
		    if (staticTable[e].name == id && staticTable[e].scope == thisScope.num) {    
		return staticTable[e]
		 }	
		}
	    }
	    // Set the pointer for this function to the parent node and check the parent node for the variable
	    // being looked for
	    thisScope = thisScope.parent
	}
	// If we get to the root node of the scope tree and haven't found the variable, return null
	return "notfound"
    }
    
    