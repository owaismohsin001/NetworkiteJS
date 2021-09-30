"use strict";
const pattern = require("./pattern.js")
const rewriter = require("./rewriter.js")
const layout = require("./layout.js")
const {RecordFiles} = require("./multifileRecord.js")
const {KeyStore} = require("./keyStore.js")
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
(4, 2)
ins will be 
    {
        1: [3, 4]
        3: [4]
        4: [3, 2]
    }
and outs will be
    {
        3: [1, 4]
        4: [1, 3]
        2: [4]
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

    disconnect(v1, v2){
        if (v1 in this.rels) this.rels[v1].delete(v2)
        if (v2 in this.invs) this.invs[v2].delete(v1)
    }

    existsDirectRelation(v1, v2){ return v1 in this.rels && this.rels[v1].has(v2) }

    toCSV(){
        const set = new Set()
        for(const k in this.rels){
            const val = this.rels[k]
            const _ = [...val].map(a => set.add([k, this.name, a]))
        }
        return [...set].map(singleRelation => singleRelation.map(a => a.toString()).join(", ")).join("\n")
    }

    static fromCSV(name, str){
        const self = new Relations(name)
        for(const val of str.split("\n")){
            if (val === "") continue
            const [a, _, b] = val.split(", ")
            self.connect(parseInt(a), parseInt(b))
        }
        return self
    }

    edges(){
        const full_graph = {...this.rels, ...this.invs}
        const keys = new Set()
        for(const k in full_graph) keys.add(k)
        return keys
    }

    *dfs(node, rel=true, inv=true){
        const [rel_graph, inv_graph] = [this.rels, this.invs]
        function *single_dfs(single_graph, node, visited){
            if (!(visited.has(node))){
                yield node
                visited.add(node)
                if (node in single_graph){
                    const values = single_graph[node]
                    for(const v of values){
                        yield* single_dfs(single_graph, v, visited)
                    }
                }
            }
        }

        const visited = new Set()
        function *overSingleDFS(graph){
            for(const v of single_dfs(graph, node, visited)) {
                const intV = parseInt(v)
                if (!(visited.has(intV))) {
                    yield intV
                    visited.add(intV)
                }
            }
        }

        if (rel) yield* overSingleDFS(rel_graph)
        if (inv) yield* overSingleDFS(inv_graph)
    }

    relatesTo(node, p, rel=true, inv=true){
        const [rel_graph, inv_graph] = [this.rels, this.invs]
        function single_dfs(single_graph, node, visited){
            if (p(node)) return true
            if (visited.has(node)) return false
            visited.add(node)
            if (node in single_graph){
                const values = single_graph[node]
                if ([...values].filter(node => p(node)).length > 0) return true
                let found = false
                for(const v of values){
                    found = single_dfs(single_graph, v, visited)
                    if (found) break
                }
                return found
            }
            return false
        }

        const visited = new Set()
        function overSingleDFS(graph){
            return single_dfs(graph, node, visited)
        }

        let retBool
        if (rel) retBool = overSingleDFS(rel_graph)
        if (inv) {
            if (!retBool) return overSingleDFS(inv_graph)
        }
        return retBool
    }
}

class Graph {
    constructor(dir){
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }) }
        this.dir = dir
        this.path = dir + "/store"
        this.store = new Store(this.path)
        this.relations = this.haveRelations(dir)
    }

    haveRelations(dir){
        return new KeyStore(dir, (n, s) => Relations.fromCSV(n, s), (rel, a, b) => `${a}, ${rel}, ${b}`, s => s.toCSV() + "\n")
    }

    add(obj) { return this.store.add(obj) }
    index(i) { return this.store.index(i) }
    rewrite(pattern, rewriter) { return this.store.rewrite(pattern, rewriter) }

    persistentPush(a, rel, b){
        fs.appendFileSync(this.rel_path, `${a.toString()}, ${rel}, ${b.toString()}\n`)
    }

    findRelation(rel){
        if (!(this.relations.has(rel))) return null
        return this.relations.get(rel)
    }

    connect(obj1, relation, obj2){
        this.connectIds(obj1.__relation_id, relation, obj2.__relation_id)
    }

    disconnect(obj1, relation, obj2){
        this.disconnectIds(obj1.__relation_id, relation, obj2.__relation_id)
    }

    link(p1, rel, p2){
        const obj1 = this.store.find(p1)
        const obj2 = this.store.find(p2)
        this.connect(obj1, rel, obj2)
    }

    unlink(p1, rel, p2){
        const obj1 = this.store.find(p1)
        const obj2 = this.store.find(p2)
        this.disconnect(obj1, rel, obj2)
    }

    linkAll(p1, rel, p2){
        for (const obj1 of this.store.search(p1)){
            for (const obj2 of this.store.search(p2)){
                this.connect(obj1, rel, obj2)
            }
        }
    }

    unlinkAll(p1, rel, p2){
        for (const obj1 of this.store.search(p1)){
            for (const obj2 of this.store.search(p2)){
                this.disconnect(obj1, rel, obj2)
            }
        }
    }

    connectIds(id1, relation, id2){
        if (!(this.relations.has(relation))) this.relations.newRelation(relation)
        if (this.findRelation(relation).existsDirectRelation(id1, id2)) return
        this.relations.addPair(relation, id1, id2)
    }

    disconnectIds(id1, rel, id2){
        if (!(this.relations.has(rel))) return
        if (!(this.findRelation(rel).existsDirectRelation(id1, id2))) return
        const relation = this.relations.get(rel)
        relation.disconnect(id1, id2)
        this.relations.set(rel, relation)
    }

    query(){
        return new Query(this)
    }
}

const DFSSide = {
    BOTH: "BOTH",
    OUTGONG: "OUTGOING",
    INCOMING: "INCOMING"
}

class CumulativeTags {
    constructor(tags){
        this.tags = tags
    }

    addAttribute(k, attr){
        const strkey = typeof k == "string" ? k : JSON.stringify(k)
        if (strkey in this.tags) this.tags[strkey] = [...this.tags[strkey], attr]
        else this.tags[strkey] = [attr]
        return attr
    }

    getAttributes(k){
        if (typeof k == "string") return this.tags[k]
        return this.tags[JSON.stringify(k)]
    }

    *iterate(){
        for(const k in this.tags) yield k
    }

    matchesOne(k, pattern){
        const strkey = JSON.stringify(k)
        if (!(strkey in this.tags)) return false
        const tags = this.tags[strkey]
        for(const tag of tags){
            if (pattern.match(tag)) return true
        }
        return false
    }

    getTagObject(k){
        const strkey = typeof k == "string" ? k : JSON.stringify(k)
        if (!(strkey in this.tags)) return null
        const tags = this.tags[strkey]
        let obj = {}
        for(const tag of tags){
            obj = {...obj, ...tag}
        }
        return obj
    }
}

class Query {
    constructor(graph, tags=new CumulativeTags({})){
        this.graph = graph
        this.tags = tags
        const self = this
        this.generator = function*() {
            const set = new Set()
            for(const rel of graph.relations.getAllRelations()) {
                const whole_graph = graph.findRelation(rel)
                const keys = whole_graph.edges()
                for(const k of keys.values()){
                    for(const v of whole_graph.dfs(k)){
                        if (!(set.has(v))) {
                            set.add(v)
                            yield self.graph.store.index(v)
                        }
                    }
                }
            }
        }
    }

    v(vertexPattern){
        const self = this
        const query = new Query(this.graph, this.tags)
        query.generator = function*() {
            yield self.graph.store.find(vertexPattern)
        }
        return query
    }

    vs(vertexPattern){
        const self = this
        const query = new Query(this.graph, this.tags)
        query.generator = function*() {
            yield* self.graph.store.search(vertexPattern)
        }
        return query
    }

    boolStateFromDFSSide(side){
        let [incoming, outgoing] = [false, false]
        if (side === DFSSide.BOTH) return [true, true]
        if (side === DFSSide.INCOMING) incoming = true
        if (side === DFSSide.OUTGONG) outgoing = true
        return [incoming, outgoing]
    }

    tag(attr){
        const self = this
        const query = new Query(this.graph, this.tags)
        for(const node of self.generator()){
            query.tags.addAttribute(node, attr)
        }
        query.generator = self.generator
        return query
    }

    derivedTag(f){
        const self = this
        const query = new Query(this.graph, this.tags)
        for(const node of self.generator()){
            query.tags.addAttribute(node, f(node))
        }
        query.generator = self.generator
        return query
    }

    layout(layout){
        const newTags = layout(this.graph, this.graph.store.iterate(), this.tags)
        const query = new Query(this.graph, new CumulativeTags(newTags))
        query.generator = this.generator
        return query
    }

    hasTag(pattern){
        const self = this
        const query = new Query(this.graph, this.tags)
        query.generator = function*() {
            for(const vertex of self.generator()){
                const p = this.tags.matchesOne(vertex, pattern)
                if (p) yield vertex
            }
        }
        return query
    }

    dfs(rel, side=DFSSide.BOTH){
        const self = this
        const query = new Query(this.graph, this.tags)
        const [incoming, outgoing] = this.boolStateFromDFSSide(side)
        query.generator = function*(){
            for(const vertex of self.generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                for(const related_vertex of relation.dfs(vertex.__relation_id, outgoing, incoming)) {
                    yield self.graph.store.index(related_vertex)
                }
            }
        }
        return query
    }

    outs(rel, given_pattern=pattern.Pattern({})){
        const self = this
        const query = new Query(this.graph, this.tags)
        query.generator = function*() {
            for(const vertex of self.generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if(!(vertex.__relation_id in relation.rels)) continue
                for(const related_vertex of relation.rels[vertex.__relation_id]) {
                    const related_node = self.graph.store.index(related_vertex)
                    if (given_pattern.match(related_node)) yield related_node
                }
            }
        }
        return query
    }

    take(n){
        const self = this
        const query = new Query(this.graph, this.tags)
        let i = 0
        query.generator = function*(){
            for(const node of self.generator()){
                if (i >= n) break
                yield node
                i += 1
            }
        }
        return query
    }

    ins(rel, given_pattern=pattern.Pattern({})){
        const self = this
        const query = new Query(this.graph, this.tags)
        query.generator = function*() {
            for(const vertex of self.generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if(!(vertex.__relation_id in relation.invs)) continue
                for(const related_vertex of relation.invs[vertex.__relation_id]) {
                    const related_node = self.graph.store.index(related_vertex)
                    if (given_pattern.match(related_node)) yield related_node
                }
            }
        }
        return query
    }

    unique(){
        const self = this
        const query = new Query(this.graph, this.tags)
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
        const query = new Query(this.graph, this.tags)
        query.generator = function*() {
            for(const vertex of self.generator()){
                if (pattern.match(vertex)) yield vertex
            }
        }
        return query
    }

    relatesTo(rel, given_pattern, side=DFSSide.BOTH){
        const self = this
        const query = new Query(this.graph, this.tags)
        const [incoming, outgoing] = this.boolStateFromDFSSide(side)
        query.generator = function*() {
            for(const vertex of self.generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if (relation.relatesTo(
                        vertex.__relation_id, 
                        i => given_pattern.match(self.graph.store.index(i)), 
                        outgoing, incoming
                    )) yield vertex
            }
        }
        return query
    }

    *execute(){
        yield* this.generator()
    }
}

const generateVisualization = (query, relationName) => {
    const nodeIds = new Set()
    const wholeNodes = []
    const dict = {}
    const adjacencyList = new Set()
    const relation = query.graph.relations.get(relationName)

    const graphCreation = "const graph = initializeGraph();\n\n"

    for(const k in relation.rels){
        const vals = relation.rels[k]
        nodeIds.add(parseInt(k))
        for(const val of vals.values()) nodeIds.add(val)
    }
    
    for(const id of nodeIds.values()){
        const node = query.graph.store.index(id)
        const tags = query.tags.getTagObject(node)
        const wholeNode = {...node, ...tags}
        dict[id] = wholeNode
        wholeNodes.push(wholeNode)
    }
    
    for(const k in relation.rels){
        const a = parseInt(k)
        const vals = relation.rels[k]
        for(const b of vals.values()) adjacencyList.add([dict[a], dict[b]])
    }
    
    let nodeNum = 0
    const numberedNodes = {}

    const assignedNodes = wholeNodes.map(node => {
        nodeNum += 1
        const str = JSON.stringify(node)
        numberedNodes[str] = `a${nodeNum}`
        return `const a${nodeNum} = graph.addNode(null, null, new Tags().override(fromObject(${str})))`
    }).join(";\n") + ";\n\n\n"
    
    const adjancencies = [...adjacencyList]
        .map(([a, b]) => `graph.addEdge(${numberedNodes[JSON.stringify(a)]}, ${numberedNodes[JSON.stringify(b)]})`)
        .join(";\n")
        + ";\n"

    return graphCreation + assignedNodes + adjancencies
}

const renderQueriedGraph = (query, relationName) => fs.writeFileSync(
    "./visualizer/script.js",
    generateVisualization(query, relationName),
    {encoding:'utf8',flag:'w'}
)

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

db.linkAll(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Laura"}))
db.linkAll(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Victoria"}))
db.linkAll(pattern.Pattern({name: "Laura"}), "follows", pattern.Pattern({name: "Victoria"}))
db.linkAll(pattern.Pattern({name: "Victoria"}), "follows", pattern.Pattern({name: "Laura"}))
db.linkAll(pattern.Pattern({name: "Victoria"}), "follows", pattern.Pattern({name: "John"}))

const query = db.query()
    .vs(pattern.Pattern({}))
    .derivedTag(({name: name}) => {return {text: {text: name}}})
    .layout(layout.simplisticRandomLayout)
    .vs(pattern.Pattern({name: "Hamid"}))
    .outs("follows")
    .derivedTag(({name: name}) => {return {immediateFriend: name}})
    .ins("follows")
    .filter(pattern.Pattern({age: pattern.Num(i => i > 18)}))
    .relatesTo("follows", pattern.Pattern({name: "John"}), DFSSide.OUTGONG)
    .hasTag(pattern.Pattern({immediateFriend: pattern.Str()}))
    .unique()

for(const unit of query.execute()) console.log(unit)
renderQueriedGraph(query, "follows")