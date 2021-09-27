"use strict";
class ObjectRewriter {
    constructor(rewriter){
        this.rewriter = rewriter
    }

    rewrite(data){
        const obj = {...data}
        for(const k in this.rewriter){
            const rewriter = this.rewriter[k]
            if (k in data){
                const val = data[k]
                const rewritten = rewriter.rewrite(val)
                obj[k] = rewritten
            } else {
                obj[k] = rewriter.rewrite(null)
            }
        }
        return obj
    }
}

class RewriterFunction extends ObjectRewriter {
    constructor(f){
        super(null, null)
        this.fun = f
    }

    rewrite(data){
        return this.fun(data)
    }
}

class WholeArrayRewriter extends ObjectRewriter {
    constructor(pattern){
        super(null, null)
        this.patternVar = pattern
    }

    rewrite(arr){
        let objs = []
        for(const i in arr){
            objs.push(this.patternVar.rewrite(arr[i]))
        }
        return objs
    }
}

class TupleRewriter extends ObjectRewriter {
    constructor(pattern){
        super(pattern, null)
    }

    rewrite(arr){
        let new_arr = []
        for(const i in this.rewriter){
            const pattern = this.rewriter[i]
            const elem = arr[i]
            new_arr.push(pattern.rewrite(elem))
        }
        return new_arr
    }
}

function fromObject(obj){
    let newObj = {}
    for(const k in obj){
        const v = obj[k]
        if (v instanceof Array) newObj[k] = Const(v)
        else if (v instanceof Object) newObj[k] = fromObject(v)
        else {
            newObj[k] = Const(v)
        }
    }
    return Rewriter(newObj)
}

const Id = () => new RewriterFunction(a => a)
const Const = a => new RewriterFunction(_ => a)
const Fun = f => new RewriterFunction(f)
const Rewriter = pattern => new ObjectRewriter(pattern)
const Arr = patternVar => new WholeArrayRewriter(patternVar)
const Tup = arr => new TupleRewriter(arr)
const Cond = (c, t, e) => new RewriterFunction(x => c(x) ? t.rewrite(x) : e.rewrite(x))

module.exports = {
    Id, Const, Fun, Rewriter, 
    Arr, Tup, Cond, TupleRewriter, 
    RewriterFunction, ObjectRewriter, WholeArrayRewriter, fromObject
}