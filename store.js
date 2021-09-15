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
        this.rels = ins
        this.invs = outs
    }

    connect(v1, v2){
        if (v1 in this.rels) this.rels[v1].add(v2)
        else {
            let set = new Set()
            set.add(v2)
            this.rels[v1] = set
        }
        if (v2 in this.invs) this.invs[v2].add(v1)
        else {
            let set = new Set()
            set.add(v1)
            this.invs[v2] = set
        }
    }

    existsDirectRelation(v1, v2){ return v1 in this.rels && this.rels[v1].has(v2) }

    toCSV(){
        const set = Set()
        for(const k in this.rels){
            const val = this.rels[k]
            set.add(val.map(a => [k, this.name, a]))
        }
        return arr.map(singleRelation => singleRelation.map(a => a.toString()).join(", ")).join("\n") + "\n"
    }

}

class Graph {
    constructor(dir){
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }) }
        this.path = dir + "/store.jarray"
        this.store = new Store(this.path)
        this.rel_path = dir + "/relations.csv"
        this.relations = {}
        this.haveRelations(this.rel_path)
    }

    haveRelations(path){
        if (!fs.existsSync(path)) {
            fs.open(path, 'w', (err, _) => {
                if (err) throw err
            })
            return
        }
        for(const val of fs.readFileSync(path).toString().split("\n")){
            if (val === "") continue
            const [a, rel, b] = val.split(", ")
            this.connectIds(parseInt(a), rel, parseInt(b), false)
        }
    }

    add(obj) { return this.store.add(obj) }
    index(i) { return this.store.index(i) }
    rewrite(pattern, rewriter) { return this.store.rewrite(pattern, rewriter) }

    persistentPush(a, rel, b){
        fs.appendFile(this.rel_path, `${a.toString()}, ${rel}, ${b.toString()}` + "\n", err => {
            if (err) throw err;
        });
    }

    findRelation(rel){
        if (!(rel in this.relations)) return null
        return this.relations[rel]
    }

    connect(obj1, relation, obj2, __shouldPersistentPush=true){
        this.connectIds(obj1.__relation_id, relation, obj2.__relation_id, __shouldPersistentPush)
    }

    link(p1, rel, p2, __shouldPersistentPush=true){
        const obj1 = this.store.find(p1)
        const obj2 = this.store.find(p2)
        this.connect(obj1, rel, obj2, __shouldPersistentPush)
    }

    linkAll(p1, rel, p2){
        for (const obj1 of this.store.search(p1)){
            for (const obj2 of this.store.search(p2)){
                this.connect(obj1, rel, obj2)
            }
        }
    }

    connectIds(id1, relation, id2, __shouldPersistentPush=true){
        if (!(relation in this.relations)) this.relations[relation] = new Relations(relation)
        if (this.relations[relation].existsDirectRelation(id1, id2)) return
        this.relations[relation].connect(id1, id2)
        if (__shouldPersistentPush) this.persistentPush(id1, relation, id2)
    }

    query(){
        return new Query(this)
    }
}

class Query {
    constructor(graph){
        this.graph = graph
        this.generator = null
    }

    v(vertexPattern){
        const self = this
        const query = new Query(this.graph)
        query.generator = function*() {
            yield* self.graph.store.search(vertexPattern)
        }
        return query
    }

    outs(rel){
        const self = this
        const query = new Query(this.graph)
        query.generator = function*() {
            for(const vertex of self.generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if(!(vertex.__relation_id in relation.rels)) continue
                for(const related_vertex of relation.rels[vertex.__relation_id]) yield self.graph.store.index(related_vertex)
            }
        }
        return query
    }

    *execute(){
        yield* this.generator()
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

db.link(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Laura"}))
db.link(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Victoria"}))
db.link(pattern.Pattern({name: "Laura"}), "follows", pattern.Pattern({name: "Victoria"}))

// for (const unit of db.store.iterate()) console.log(unit)

const query = db.query().v(pattern.Pattern({name: "Hamid"})).outs("follows").outs("follows")

for(const unit of query.execute()) console.log(unit)