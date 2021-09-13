"use strict";
const fs = require("fs")

const PatternCompleteness = {
    COMPLETE: "COMPLETE",
    PARTIAL: "PARTIAL"
}

class Store {
    constructor(file_path){
        this.storage = {values: []}
        this.path = file_path
        this.haveFile(file_path)
    }

    haveFile(path){
        if (!fs.existsSync(path)) {
            fs.open(path, 'w', (err, _) => {
                if (err) throw err
            })
            return
        }
        const contentArray = fs.readFileSync(path).toString().split("\n")
        for(const val of contentArray){
            if (val === "") continue
            this.storage.values.push(JSON.parse(val))
        }
    }

    presistentPush(obj){
        fs.appendFile(this.path, JSON.stringify(obj) + "\n", err => {
            if (err) throw err;
        });
    }

    add(obj){
        const new_obj = {...obj, __relation_id: this.storage.values.length+1}
        this.storage.values.push(new_obj)
        this.presistentPush(new_obj)
        return obj
    }

    index(i){
        if (i < this.storage.values.length) return this.storage.values[i-1]
        throw `Index ${i.toString()} is out of bounds`
    }
}

class ObjectPattern {
    constructor(pattern, completeness=PatternCompleteness.PARTIAL){
        this.completeness = completeness
        this.pattern = pattern
    }

    matchPartial(data){
        for(const k in this.pattern){
            if (!(k in data)) return false
            const pattern = this.pattern[k]
            const val = data[k]
            if (!(pattern instanceof ObjectPattern)) {
                if (val !== this.pattern[k]) return false
            }
            if (!(pattern.match(val))) return false
        }
        return true
    }

    match(data){
        if (this.completeness === PatternCompleteness.COMPLETE) return this.matchComplete(data)
        return this.matchPartial(data)
    }
}

class PatternFunction extends ObjectPattern {
    constructor(f){
        super(null, null)
        this.fun = f
    }

    match(data){
        return this.fun(data)
    }
}

class WholeArrayPattern extends ObjectPattern {
    constructor(pattern){
        super(null, null)
        this.patternVar = pattern
    }

    match(arr){
        if (!(Array.isArray(arr))) return false
        for(const elem of arr){
            if (!(this.patternVar.match(elem))) return false
        }
        return true
    }
}

class TuplePattern extends ObjectPattern {
    constructor(pattern){
        super(pattern, null)
    }

    match(arr){
        if (!(Array.isArray(arr))) return false
        if (!(Array.isArray(this.pattern))) return false
        if (arr.length !== this.pattern.length) return false
        for(const i in arr){
            const pattern = this.pattern[i]
            const elem = arr[i]
            if (!(pattern.match(elem))) return false
        }
        return true
    }
}

const Any = () => new PatternFunction(_ => true)
const Num = (f = _ => true) => new PatternFunction(d => typeof d === "number" && f(d))
const Str = (f = _ => true) => new PatternFunction(d => typeof d === "string" && f(d))
const Pattern = pattern => new ObjectPattern(pattern)
const Arr = patternVar => new WholeArrayPattern(patternVar)
const Tup = arr => new TuplePattern(arr)
const Or = (fa, fb) => new PatternFunction(d => fa.match(d) || fb.match(d))

const store = new Store("./db.jarray")
store.add({
    name: "Hamid", 
    age: 21, 
    favColors: [
        [0, 128, 0],
        [165, 42, 42],
        "Yellow"
    ]
})
store.add({
    name: "John", 
    age: 21, 
    favColors: [
        [255, 165, 0],
        [255, 192, 203],
        "Violet",
        "Taupe"
    ]
})

// const pattern = Pattern({
//     name: Str(),
//     age: Num(i => i >= 18),
//     favColors: Arr(Or(Tup([Num(), Num(), Num()]), Str()))
// })

// console.log(
//     pattern.match({
//         name: "Hamid", 
//         age: 21, 
//         favColors: [
//             [0, 128, 0],
//             [165, 42, 42],
//             "yellow"
//         ]
//     })
// )