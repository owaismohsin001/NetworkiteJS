"use strict";
const pattern = require("./pattern.js")
const rewriter = require("./rewriter.js")
const {RecordFiles} = require("./multifileRecord.js")
const {KeyStore} = require("./keyStore.js")
const fs = require("fs")
const emitter = require('events').EventEmitter;

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

    delete(i){ return this.storage.delete(i) }

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
            const _ = [...val].map(a => set.add([k, a]))
        }
        return [...set].map(singleRelation => singleRelation.map(a => a.toString()).join(", ")).join("\n")
    }

    static fromCSV(name, str){
        const self = new Relations(name)
        for(const val of str.split("\n")){
            if (val === "") continue
            const [a, b] = val.split(", ")
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
        this.relations = new KeyStore(dir, (n, s) => Relations.fromCSV(n, s), (_, a, b) => `${a}, ${b}`, s => s.toCSV() + "\n")
        this.emitter = new emitter()
        this.emitter.setMaxListeners(0)
        
    }

    add(obj) { return this.store.add(obj) }
    index(i) { return this.store.index(i) }
    rewrite(pattern, rewriter) { return this.store.rewrite(pattern, rewriter) }

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

    deleteId(i){
        this.relations.removeAllMentionsOf(i)
        return this.store.delete(i)
    }

    deleteAll(pattern){
        const ids = new Set()
        this.rewrite(pattern, new rewriter.RewriterFunction(x => {
            ids.add(x.__relation_id)
            return {}
        }, false))
        const _ = [...ids].map(i => this.relations.removeAllMentionsOf(i))
    }

    query(){
        return new Query(this)
    }

    writer(){
        return new Writer(this)
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
        const key = typeof k == "number"  || typeof k == "string" ? k : k.__relation_id
        if (key in this.tags) this.tags[key] = [...this.tags[key], attr]
        else this.tags[key] = [attr]
        return attr
    }

    getAttributes(k){
        if (typeof k == "number" || typeof k == "string") return this.tags[k]
        return this.tags[k.__relation_id]
    }

    *iterate(){
        for(const k in this.tags) yield k
    }

    matchesOne(k, pattern){
        const key = k.__relation_id
        if (!(key in this.tags)) return false
        const tags = this.tags[key]
        for(const tag of tags){
            if (pattern.match(tag)) return true
        }
        return false
    }

    getTagObject(k){
        const key = typeof k == "number"  || typeof k == "string" ? k : k.__relation_id
        if (!(key in this.tags)) return null
        const tags = this.tags[key]
        let obj = {}
        for(const tag of tags){
            obj = {...obj, ...tag}
        }
        return obj
    }
}

class Query {
    constructor(graph, tags=new CumulativeTags({}), generated=new Set()){
        this.graph = graph
        this.tags = tags
        this.generated = generated
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
        this.graph.emitter.addListener("Mutation", _ => this.generated.clear())
    }

    index(i){
        const self = this
        this.generator = function*() {
            yield self.graph.store.index(i)
        }
        return this
    }

    v(vertexPattern){
        const self = this
        this.generator = function*() {
            yield self.graph.store.find(vertexPattern)
        }
        return query
    }

    vs(vertexPattern){
        const self = this
        this.generator = function*() {
            yield* self.graph.store.search(vertexPattern)
        }
        return this
    }

    boolStateFromDFSSide(side){
        let [incoming, outgoing] = [false, false]
        if (side === DFSSide.BOTH) return [true, true]
        if (side === DFSSide.INCOMING) incoming = true
        if (side === DFSSide.OUTGONG) outgoing = true
        return [incoming, outgoing]
    }

    fromTag(tagPattern){
        const self = this
        this.generator = function*(){
            for(const key in self.tags.tags){
                const tags = self.tags.getAttributes(key)
                for(const tag of tags){
                    if (tagPattern.match(tag)) {
                        yield self.graph.store.index(parseInt(key))
                        break
                    }
                }
            }
        }
        return this
    }

    tag(attr){
        for(const node of this.generator()){
            this.tags.addAttribute(node, attr)
        }
        return this
    }

    derivedTag(f){
        const self = this
        for(const node of self.generator()){
            this.tags.addAttribute(node, f(node))
        }
        return this
    }

    layout(layout){
        const newTags = layout(this.graph, this.graph.store.iterate(), this.tags)
        this.tags = new CumulativeTags(newTags)
        return this
    }

    hasTag(pattern){
        const self = this
        const generator = this.generator
        this.generator = function*() {
            for(const vertex of generator()){
                const p = self.tags.matchesOne(vertex, pattern)
                if (p) yield vertex
            }
        }
        return this
    }

    dfs(rel, side=DFSSide.BOTH){
        const self = this
        const generator = this.generator
        const [incoming, outgoing] = this.boolStateFromDFSSide(side)
        this.generator = function*(){
            for(const vertex of generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                for(const related_vertex of relation.dfs(vertex.__relation_id, outgoing, incoming)) {
                    yield self.graph.store.index(related_vertex)
                }
            }
        }
        return this
    }

    outs(rel, given_pattern=pattern.Pattern({})){
        const self = this
        const generator = this.generator
        this.generator = function*() {
            for(const vertex of generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if(!(vertex.__relation_id in relation.rels)) continue
                for(const related_vertex of relation.rels[vertex.__relation_id]) {
                    const related_node = self.graph.store.index(related_vertex)
                    if (given_pattern.match(related_node)) yield related_node
                }
            }
        }
        return this
    }

    take(n){
        const generator = this.generator
        let i = 0
        this.generator = function*(){
            for(const node of generator()){
                if (i >= n) break
                yield node
                i += 1
            }
        }
        return this
    }

    ins(rel, given_pattern=pattern.Pattern({})){
        const self = this
        const generator = this.generator
        this.generator = function*() {
            for(const vertex of generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if(!(vertex.__relation_id in relation.invs)) continue
                for(const related_vertex of relation.invs[vertex.__relation_id]) {
                    const related_node = self.graph.store.index(related_vertex)
                    if (given_pattern.match(related_node)) yield related_node
                }
            }
        }
        return this
    }

    unique(){
        const generator = this.generator
        this.generator = function*() {
            const set = new Set()
            for(const vertex of generator()){
                if (!(set.has(JSON.stringify(vertex)))) yield vertex
                set.add(JSON.stringify(vertex))
            }
        }
        return this
    }

    filter(pattern){
        const generator = this.generator
        this.generator = function*() {
            for(const vertex of generator()){
                if (pattern.match(vertex)) yield vertex
            }
        }
        return this
    }

    relatesTo(rel, given_pattern, side=DFSSide.BOTH){
        const self = this
        const generator = this.generator
        const [incoming, outgoing] = this.boolStateFromDFSSide(side)
        this.generator = function*() {
            for(const vertex of generator()){
                const relation = self.graph.findRelation(rel)
                if (relation === null) continue
                if (relation.relatesTo(
                        vertex.__relation_id, 
                        i => given_pattern.match(self.graph.store.index(i)), 
                        outgoing, incoming
                    )) yield vertex
            }
        }
        return this
    }

    intersect(givenQuery){
        const generator = this.generator
        const firstResultSet = new Set()
        for (const unit of givenQuery.execute()) firstResultSet.add(unit.__relation_id)
        this.generator = function*() {
            for(const vertex of generator()){
                if (firstResultSet.has(vertex.__relation_id)) yield vertex
            }
        }
        return this
    }

    union(givenQuery){
        const generator = this.generator
        this.generator = function*() {
            for (const unit of givenQuery.execute()) yield unit
            for(const unit of generator()) yield unit
        }
        return this
    }


    difference(second){
        const firstGenerator = this.generator
        const secondRes = new Set()
        for(const unit of second.execute()) secondRes.add(unit.__relation_id)
        this.generator = function*() {
            for (const unit of firstGenerator()) {
                if (!secondRes.has(unit.__relation_id)) yield unit
            }
        }
        return this
    }

    *execute(){
        if (this.generated.size === 0) {
            for(const unit of this.generator()){
                this.generated.add(unit.__relation_id)
                yield unit
            }
        } else {
            for(const i of this.generated) yield this.graph.store.index(i)
        }
    }
}

class Writer {
    constructor(graph){
        this.graph = graph
        this.fun = () => null
        this.actions = []
    }

    add(obj){
        this.actions.push(() => this.graph.add(obj))
        return this
    }

    deleteId(i){
        this.actions.push(() => this.graph.deleteId(i))
        return this
    }

    deleteAll(pattern){
        this.actions.push(() => this.graph.deleteAll(pattern))
        return this
    }

    link(p1, rel, p2){
        this.actions.push(() => this.graph.link(p1, rel, p2))
        return this
    }

    unlink(p1, rel, p2){
        this.actions.push(() => this.graph.unlink(p1, rel, p2))
        return this
    }

    linkAll(p1, rel, p2){
        this.actions.push(() => this.graph.linkAll(p1, rel, p2))
        return this
    }

    unlinkAll(p1, rel, p2){
        this.actions.push(() => this.graph.unlinkAll(p1, rel, p2))
        return this
    }


    rewrite(pattern, rewriter){
        this.actions.push(() => this.graph.rewrite(pattern, rewriter))
        return this
    }

    waitForLockAndAquire(){
        const mutexPath = this.graph.dir + "/mutex"
        while (true){
            try {
                fs.writeFileSync(mutexPath, "", { flag: 'wx' })
                return
            } catch {
                continue
            }
        }
    }

    releaseLock(){
        const mutexPath = this.graph.dir + "/mutex"
        fs.unlinkSync(mutexPath)
    }

    execute(){
        this.graph.emitter.emit("Mutation")
        this.waitForLockAndAquire()
        for(const action of this.actions){
            action()
        }
        this.releaseLock()
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
    
    const numberedNodes = {}

    const assignedNodes = wholeNodes.map((node, i) => {
        const nodeNum = i+1
        const objStr = JSON.stringify(node)
        numberedNodes[objStr] = `a${nodeNum}`
        return `const a${nodeNum} = graph.addNode(null, null, new Tags().override(fromObject(${objStr})))`
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

module.exports = {
    renderQueriedGraph, generateVisualization, Query, 
    CumulativeTags, DFSSide, Graph, 
    Relations, Store
}