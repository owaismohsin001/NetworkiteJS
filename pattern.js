"use strict";
class ObjectPattern {
    constructor(pattern){
        this.pattern = pattern
    }

    match(data){
        if (!(data instanceof Object)) return false
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

module.exports = {Any, Num, Str, Pattern, Arr, Tup, Or, TuplePattern, ObjectPattern, PatternFunction, WholeArrayPattern}