"use strict";
const pattern = require("./pattern.js")
const rewriter = require("./rewriter.js")
const {RecordFiles} = require("./multifileRecord.js")
const fs = require("fs")

const IS_DEV = (process.env.NODE_ENV || 'development') == 'development'

class Store {
    constructor(file_path, pageSize=null){
        this.storage = new RecordFiles(file_path, pageSize===null ? (IS_DEV ? 10 : 1000) : pageSize)
        this.path = file_path
    }

    add(obj){
        this.storage.add(obj)
        return obj
    }

    index(i){ return this.storage.index(i) }

    *iterate(){ yield* this.storage.iterate() }

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

    rewrite(pattern, rewriter){ this.storage.rewrite(pattern, rewriter) }
}


/*
for relations like 
(1, 3)
(1, 4)
(3, 4)
(4, 3)
ins will be 
    {
        1: [3, 4]
        3: [4]
        4: [3]
    }
and outs will be
    {
        3: [1, 4]
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
        this.path = dir + "/store"
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
        this.generator = function*() { yield* graph.store.iterate() }
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

    ins(rel){
        const self = this
        const query = new Query(this.graph)
        query.generator = function*() {
            for(const vertex of self.generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if(!(vertex.__relation_id in relation.invs)) continue
                for(const related_vertex of relation.invs[vertex.__relation_id]) yield self.graph.store.index(related_vertex)
            }
        }
        return query
    }

    unique(){
        const self = this
        const query = new Query(this.graph)
        query.generator = function*() {
            const set = new Set()
            for(const vertex of self.generator()){
                if (!(set.has(JSON.stringify(vertex)))) yield vertex
                set.add(JSON.stringify(vertex))
            }
        }
        return query
    }

    filter(pattern){
        const self = this
        const query = new Query(this.graph)
        query.generator = function*() {
            for(const vertex of self.generator()){
                if (pattern.match(vertex)) yield vertex
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
db.link(pattern.Pattern({name: "Victoria"}), "follows", pattern.Pattern({name: "Laura"}))

// for (const unit of db.store.iterate()) console.log(unit)

const query = db.query().v(pattern.Pattern({name: "Hamid"}))
    .outs("follows")
    .ins("follows")
    .filter(pattern.Pattern({age: pattern.Num(i => i > 18)}))
    .unique()

for(const unit of query.execute()) console.log(unit)