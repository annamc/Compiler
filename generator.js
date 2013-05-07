/* Anna Clayton */
/* May 2013 */
/* generator.js  */

    var code
    var errors
    var currentScope = null
    var currentScopeNum = 0
    var thisScopeNum = 0
    var lastScope = {}
    var nextStaticLoc = 0
    
    var declareType
    var declareInit
    var printXVal
    var printYVal
    
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
    
    const T_INT = "INT"
    const T_BOOL = "BOO"
    const T_STRING = "STR"
    const T_WORK = "WRK"
    
    const V_TRUE = "01"
    const V_FALSE = "00"
    
    const V_PRINTVAL = "01"
    const V_PRINTSTRING = "02"
    
    var CodeStream = function(){
    
        var codearray = {code: new Array(256) , nextEntry : 0, currentHeapAddress : 255, openLoops: new Array()};
	
	var LoopJump = function(){
	    var lj = { name: name, bytes : 0}
	    return lj
	}
    
        for (var c=0; c<256; c++)
            codearray[c] = "00"
            
        codearray.toString = function(){
            var string = ""
            for (var c=0; c<256; c++) {
                string = string + " " + codearray[c]
                if ((c+1)%16==0)
                    string = string + "\n"
            }
            return string
        }
        
        codearray.addInstruction = function(newInstruction) {
            newInstruction = [].concat(newInstruction)
            for (var i=0; i<newInstruction.length;i++) {
                codearray[codearray.nextEntry] = newInstruction[i]
                codearray.nextEntry = codearray.nextEntry + 1
            }
	    for (var l=0; l<codearray.openLoops.length; l++) {
		codearray.openLoops[l].bytes = codearray.openLoops[l].bytes + newInstruction.length
	    }
        }
	
	codearray.startLoop = function(loop) {
	    codearray.openLoops.push(loop)
	}
	
	codearray.stopLoop = function() {
	    thisOne = codearray.openLoops.pop()
	    alert(codearray.openLoops)
	}
        
        codearray.addToHeap = function(stringToAdd) {
            for (var i=0; i<stringToAdd.length; i++) {
                codearray[codearray.currentHeapAddress-stringToAdd.length+i] = stringToAdd[i].charCodeAt(0).toString(16).toUpperCase()
            }
            codearray.currentHeapAddress = codearray.currentHeapAddress - (stringToAdd.length + 1)
            codearray[codearray.currentHeapAddress] = I_BRK
        }
        
        return codearray;
    }
    
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

    function Generate() {
	
	StaticTableEntry.counter = undefined
        code = new CodeStream()
        jumpTable = new Array()
        errors = new Array()
        staticTable = new Array()
	currentScope = null
	lastScope = null
	currentScopeNum = 0
	jumpNum = 0
	staticTable.push(new StaticTableEntry('T000','0',"1",T_WORK,0))
	staticTable.push(new StaticTableEntry('T001','0',"2",T_WORK,0))
	staticTable.push(new StaticTableEntry('T002','0',"3",T_WORK,0))
	nextStaticLoc = 3 //0 is for work1, 1 is for work2, 2 is for work3
	
        generateCodeFromAST()
	
        /* Return a pile of stuff to the caller. The caller knows what to do with all this */
	return { errors : errors, code : code , staticTable : staticTable , jumpTable : jumpTable }
    }
    
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
        code.addInstruction([I_STA,tempLocation.substring(0,2),tempLocation.substring(2)])    
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
		for (var e=0; e<staticTable.length; e++) {
		    if (staticTable[e].name == node.children[1].name.value && staticTable[e].scope == currentScope.num) {
			code.addInstruction([I_LDA_MEM,staticTable[e].temp.substring(0,2),staticTable[e].temp.substring(2)])
		    }
		}
		break;
	    case (K_OPERAND):
		generateIntExpr(node.children[1])
		code.addInstruction([I_LDA_MEM,"T0","00"])
		break
	    case (K_COMPARISON):
		generateBoolExpr(node.children[1])
		code.addInstruction([I_LDA_MEM,"T0","02"])
		break
	}
	
   
	
	for (var e=0; e<staticTable.length; e++) {
	    if (staticTable[e].name == node.children[0].name.value && staticTable[e].scope == currentScope.num) {
		targetLocation = staticTable[e].temp
		break
	    }
	}
        code.addInstruction([I_STA,targetLocation.substring(0,2),targetLocation.substring(2)])    
    }
    
	// wipes out work1 area (t000)
	// wipes out accum
    	generateIntExpr = function(node) {
	    addAddress = "T000"
	    switch(node.children[1].name.kind) {
		case(K_OPERAND):
		    generateIntExpr(node.children[1])
		    break
		case(K_DIGIT):
		    code.addInstruction([I_LDA_CONST,toHex2(node.children[1].name.value)])
		    code.addInstruction([I_STA,addAddress.substring(0,2),addAddress.substring(2)])
		    break
		case(K_ID):
		    addAddress = lookUpAddress(node.children[1].name.value)
		    break
	    }

	    if (node.name.value == K_MINUS)
	    // do something to make addAddress appear negative
	    ;

	    code.addInstruction([I_LDA_CONST,toHex2(node.children[0].name.value)])
	    code.addInstruction([I_ADC,addAddress.substring(0,2),addAddress.substring(2)])			
	    code.addInstruction([I_STA,"T0","00"])
	}
	
	// wipes out work1 area (t000)
	// wipes out work2 area (t001)
	// wipes out work3 area (t002) --- at the end of the function, t002 indicates whether the bool expr evaluated to true or false
	// wipes out accum
	// wipes out x reg
	
	// What I really want this function to do is grab a new byte from the static area every time it needs to store a bit of a calculation, and then at the end store the final result in
	// T000 and free all the other bytes.
	// Nothing else *should* be happening concurrently so I shouldn't end up with gaps in the static area; I should be able to figure out which bytes
	// were "borrowed" and give them back.
	// Since new declares are initialized as 00 or FF I shouldn't need to 'reset" them when I'm done.  
    	generateBoolExpr = function(node) {
	    switch(node.children[0].name.kind) {
		case(K_COMPARISON):
		    generateBoolExpr(node.children[0])
		    break
		case(K_OPERAND):
		    generateIntExpr(node.children[0])
		    code.addInstruction([I_LDA_MEM,"T0","00"])
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
		    address = lookUpAddress(node.children[0].name.value)
		    code.addInstruction([I_LDA_MEM,address.substring(0,2),address.substring(2)])
		    break
	    }
	    code.addInstruction([I_STA,"T0","01"])
	    switch(node.children[1].name.kind) {
		case(K_COMPARISON):
		    generateBoolExpr(node.children[1])
		    break
		case(K_OPERAND):
		    generateIntExpr(node.children[1])
		    code.addInstruction([I_LDA_MEM,"T0","00"])
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
		    address = lookUpAddress(node.children[1].name.value)
		    code.addInstruction([I_LDA_MEM,address.substring(0,2),address.substring(2)])
		    break
	    }
	code.addInstruction([I_STA,"T0","00"]) // store accumulator (right side of comparison) at work1
	code.addInstruction([I_LDX_MEM,"T0","01"]) // load x reg from work2 (left side of comparison)
	code.addInstruction([I_CPX,"T0","00"]) // compare what's in the x reg (left side) to what is in memory at work1 (right side)
	code.addInstruction([I_BNE,toHex2(12)]) // if they aren't equal, branch forward 12 bytes over 5 instructions
	
	code.addInstruction([I_LDA_CONST,V_TRUE]) // 2 - load accumulator with constant 1
	code.addInstruction([I_STA,"T0","02"]) // 3 - store the constant 1 at work3 (this means the left side was equal to the right side -- true. also used in the next bne to branch over setting work3 to false)
	code.addInstruction([I_LDX_CONST,V_FALSE]) //2 - load x reg with constant 0 (false)
	code.addInstruction([I_CPX,"T0","02"]) // 3 - compare what's in the x reg (0) with what's in memory at work3 (true = 1) - will always be false and set z = 0 
	code.addInstruction([I_BNE,toHex2(5)]) // 2 - branch (unconditionally) forward 5 bytes past 2 instructions
	//j2:
	code.addInstruction([I_LDA_CONST,V_FALSE]) // 2 - load accumulator with constant 0 (false for the comparison)
	code.addInstruction([I_STA,"T0","02"]) // 3 - store the constant 0 at work3 (this means the left side was not equal to the right side -- false)
	//j3:
	
	// so at this point,
	// accum = 0 (comparison was false) or 1 (comparison was true)
	// x reg = 2 (constant)
	// t000 = evaluation of the right side of the boolean
	// t001 = evaluation of the left side of the boolean
	// t002 = 0 if boolexpr evaluated false, 1 if it evaluated true
	}
    
	generateIfWhileCondition = function(node) {
	    if (node.children[0].name.kind == K_BOOLVAL) {
		if (node.children[0].name.value == K_FALSE)
		    code.addInstruction([I_LDA_CONST,V_FALSE])
		else
		    code.addInstruction([I_LDA_CONST,V_TRUE])
		code.addInstruction([I_STA,"T0","02"])    
	    }
	    else
		generateBoolExpr(node.children[0])
	}
	
	generateWhileBranchBack = function(jump) {
	    code.addInstruction([I_LDA_CONST,V_TRUE])
	    code.addInstruction([I_STA,"T0","00"])
	    code.addInstruction([I_LDX_CONST,V_FALSE])
	    code.addInstruction([I_CPX,"T0","00"])
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
		for (var e=0; e<staticTable.length; e++) {
		    if (staticTable[e].name == node.children[0].name.value && staticTable[e].scope <= currentScope.num) {
			if (staticTable[e].type == T_STRING) {
			    code.addInstruction([I_LDY_MEM,staticTable[e].temp.substring(0,2),staticTable[e].temp.substring(2)])
			    printXVal = V_PRINTSTRING
			}
			else {
			    code.addInstruction([I_LDY_MEM,staticTable[e].temp.substring(0,2),staticTable[e].temp.substring(2)])
			    printXVal = V_PRINTVAL
			}
		    }
		}
		break
	    case (K_OPERAND):
		generateIntExpr(node.children[0])
		code.addInstruction([I_LDY_MEM,"T0","00"])
		printXVal = V_PRINTVAL
		break
	    case (K_COMPARISON):
		generateBoolExpr(node.children[0])
		code.addInstruction([I_LDY_MEM,"T0","02"])
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
		    code.addInstruction([I_CPX,"T0","02"])	  // compare results of boolean expression with true
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
		    code.addInstruction([I_CPX,"T0","02"])	  // compare results of boolean expression with true
		    thisJump = new JumpTableEntry("J"+jumpNum,0)
		    code.addInstruction([I_BNE,thisJump.jumpid])
		    
		    
		    jumpTable.push(thisJump)
		    code.startLoop(thisJump)
		    jumpNum = jumpNum + 1
		    generateCode(node.children[1])
		    generateWhileBranchBack(backJump)
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
	    // Then return
            if (!node.children || node.children.length === 0 ||
		node.name == B_PRINT ||
		 node.name == B_ASSIGN ||
		 //node.name == B_DECLARE)
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
    } // End generateCodeFromAST()
    
    toHex2 = function(value) {
	return new String("00" + value.toString(16).toUpperCase()).slice(-2)
    }
    
    	lookUpAddress = function(id) {
	    for (var e=0; e<staticTable.length; e++) {
	    if (staticTable[e].name == id && staticTable[e].scope <= currentScope.num) {    // AMC: this will cause problems. But it might fix problems first.  
		return staticTable[e].temp
	    }
	}
	return "notfound"
	}
    
    