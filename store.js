"use strict";
const pattern = require("./pattern.js")
const rewriter = require("./rewriter.js")
const fs = require("fs")

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
        if (i <= this.storage.values.length) return this.storage.values[i-1]
        throw `Index ${i.toString()} is out of bounds`
    }

    *iterate(){
        let i = 0
        while (i < this.storage.values.length){
            yield this.index(i+1)
            i++
        }
    }

    find(pattern){
        for(const unit of this.iterate()){
            if (pattern.match(unit)) return unit
        }
    }

    *search(pattern){
        for(const unit of this.iterate()){
            if (pattern.match(unit)) yield unit
        }
    }

    persist(){
        const new_val = this.storage.values.map(JSON.stringify).join("\n") + "\n"
        fs.writeFile(this.path, new_val, err => {
            if (err) throw err
        })
    }

    rewrite(pattern, rewriter){
        let i = 0
        while (i < this.storage.values.length){
            const val = this.storage.values[i]
            if (pattern.match(val)) this.storage.values[i] = rewriter.rewrite(val)
            i++
        }
        this.persist()
    }
}


/*
for relations like 
(1, 3)
(1, 4)
(3, 4)
ins will be 
    {
        1: [3, 4]
        3: [4]
    }
and outs will be
    {
        3: [1]
        4: [1, 3]
    }
outs must always reflect ins, and vice versa.
*/

class Relations {
    constructor(name, ins = {}, outs = {}){
        this.name = name
        this.ins = ins
        this.outs = outs
    }

    connect(v1, v2){
        if (v1 in this.ins) this.ins[v1].add(v2)
        else {
            let set = new Set()
            set.add(v2)
            this.ins[v1] = set
        }
        if (v2 in this.outs) this.outs[v2].add(v1)
        else {
            let set = new Set()
            set.add(v1)
            this.outs[v2] = set
        }
    }

}

class Graph {
    constructor(dir){
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }) }
        this.path = dir + "/store.jarray"
        this.store = new Store(this.path)
        this.rel_path = dir + "/relations.csv"
        this.relations = {}
    }

    add(obj) { return this.store.add(obj) }
    index(i) { return this.store.index(i) }
    rewrite(pattern, rewriter) { return this.store.rewrite(pattern, rewriter) }

    connect(obj1, relation, obj2){
        if (!(relation in this.relations)) this.relations[relation] = new Relations(relation)
        this.relations[relation].connect(obj1.__relation_id, obj2.__relation_id)
        return
    }
}

const db = new Graph("./people")
// db.add({
//     name: "Hamid", 
//     age: 21, 
//     favColors: [
//         [0, 128, 0],
//         [165, 42, 42],
//         "Yellow"
//     ]
// })

// db.add({
//     name: "John", 
//     age: 26, 
//     favColors: [
//         [255, 165, 0],
//         [255, 192, 203],
//         "Violet",
//         "Taupe"
//     ]
// })

// db.add({
//     name: "Laura", 
//     age: 12, 
//     favColors: [
//         [255, 255, 255],
//         "Silver",
//     ]
// })

// db.add({
//     name: "Victoria", 
//     age: 32, 
//     favColors: [
//         [128, 0, 128],
//         [0, 157, 196],
//     ]
// })

db.rewrite(pattern.Pattern({
    name: pattern.Str(),
    age: pattern.Num(i => i >= 18),
    favColors: pattern.Arr(pattern.Or(pattern.Tup([pattern.Num(), pattern.Num(), pattern.Num()]), pattern.Str()))
}), rewriter.Rewriter({
    age: rewriter.Fun(i => i+1),
    favColors: rewriter.Arr(rewriter.Cond(a => a instanceof Array, rewriter.Arr(rewriter.Fun(a => a+1)), rewriter.Id()))
}))

db.connect(db.index(1), "follows", db.index(3))
db.connect(db.index(1), "follows", db.index(4))
db.connect(db.index(3), "follows", db.index(4))

for (const unit of db.store.iterate()) console.log(unit)
console.log(db.relations["follows"].ins)
console.log(db.relations["follows"].outs)