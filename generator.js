/* Anna Clayton */
/* May 2013 */
/* generator.js  */

    var code
    var errors
    var currentScope
    var currentScopeNum = 0
    var nextStaticLoc = 0
    
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
    
    const T_INT = 1
    const T_BOOL = 2
    const T_STRING = 3
    
    var CodeStream = function(){
    
        var codearray = {code: new Array(256) , nextEntry : 0, currentHeapAddress : 255};
    
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
    
    var StaticTableEntry = function(loc, name, type, scope, offset) {
        // Keep a count of entries to use for the offset (each entry uses 1 byte)
        if (StaticTableEntry.counter == undefined) {
            StaticTableEntry.counter = 0;
    } else {
        StaticTableEntry.counter++;
    }
    
        var entry = {loc : loc , name : name , type : type , scope : scope , offset : StaticTableEntry.counter}
        
        entry.toString = function(){
	    return "| " + entry.loc + " | " + entry.name + " | " + entry.type + " | "  + new String("00" + entry.scope).slice(-2) + " | " + new String("00" + entry.offset).slice(-2) + " |"
        }
    
        return entry
    }
    
    var JumpTableEntry = function(jumpid, numbytes) {
    
        var entry = {jumpid : jumpid , numbytes : numbytes }
        
        entry.toString = function(){
	    return "| " + entry.jumpid + " | " + new String("000" + entry.numbytes).slice(-3) + " |"
        }
    
        return entry
    }

    function Generate() {
        code = new CodeStream()
        jumpTable = new Array()
        errors = new Array()
        staticTable = new Array()
        currentScope = Scope.root
        
        //code.addToHeap("anna")
        //code.addToHeap("alan")
        //code.addToHeap("blackstone pass")
        //code.addInstruction(I_LDA_CONST)
        //code.addInstruction([I_LDA_CONST,"07"])
        //code.addInstruction([I_LDA_MEM,"51","00"])
        //code.addInstruction(I_SYS)
        
        //staticTable.push(new StaticTableEntry('F1XX','a',T_INT,1))
        //staticTable.push(new StaticTableEntry('F2XX','b',T_BOOL,1))
        //staticTable.push(new StaticTableEntry('F3XX','a',T_STRING,2))
        //
        //jumpTable.push(new JumpTableEntry('J0',5))
        //jumpTable.push(new JumpTableEntry('J1',15))
        
        generateCodeFromAST()
        /* Return a pile of stuff to the caller. The caller knows what to do with all this */
	return { errors : errors, code : code , staticTable : staticTable , jumpTable : jumpTable }
    }
    
    generateDeclare = function(node) {
        tempLocation = 'T' + new String("000" + nextStaticLoc).slice(-3)
        nextStaticLoc = nextStaticLoc + 1
        if (node.children[0].value == K_INT)
            staticTable.push(new StaticTableEntry(tempLocation,node.children[1].name.value,T_INT,currentScopeNum))
        else
            staticTable.push(new StaticTableEntry(tempLocation,node.children[1].name.value,T_BOOL,currentScopeNum))
        code.addInstruction([I_LDA_CONST,"00"])
        code.addInstruction([I_STA,tempLocation.substring(0,2),tempLocation.substring(2)])    
    }
    
    generateStringDeclare = function(node) {
        tempLocation = 'T' + new String("000" + nextStaticLoc).slice(-3)
        nextStaticLoc = nextStaticLoc + 1
        staticTable.push(new StaticTableEntry(tempLocation,node.children[1].name.value,T_STRING,currentScopeNum))
        code.addInstruction([I_LDA_CONST,"FF"])
        code.addInstruction([I_STA,tempLocation.substring(0,2),tempLocation.substring(2)])    
    }
    
    
    generateCodeFromAST = function() {

        generateCode = function(node) {
            
            console.log("Generate code for " + node.name)
            switch(node.name) {
                case (B_DECLARE):
                    if (node.children[0].name.value == K_INT || node.children[0].name.value == K_BOOLEAN)
                        generateDeclare(node)
                    else if (node.children[0].name.value == K_STRING)
                        generateStringDeclare(node)
                    break;
                case (B_ASSIGN):
                    break;
                case (B_PRINT):
                    break;
                case (B_STATEMENTLIST):
                    currentScopeNum = currentScopeNum + 1
                        //currentScope = currentScope.children[nextchild];
                    break;
                default:
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
		 node.name == B_DECLARE ||
                 node.name == B_WHILE ||
                 node.name == B_IF)
                return
            // Else there are children, so traverse them to check the scope
            for (var i = 0; i < node.children.length; i++)
                generateCode(node.children[i]);
                
            switch(node.name) {
                case (B_STATEMENTLIST):
                        //nextScope = currentScope.parent.children[currentScope.parent.children.indexOf(currentScope)+1]
                        currentScope = currentScope.parent;
                        //nextChild = nextChild + 1;
                        //if (currentScope.children[nextChild] == undefined) {
                        //    currentScope = currentScope.parent
                        //    nextChild = 0
                        //}
                    break;
                default:
                    break;
            }
                
	} // End generateCode function within generateCodeFromAST()
        
        generateCode(AST.root)
    }
    
    