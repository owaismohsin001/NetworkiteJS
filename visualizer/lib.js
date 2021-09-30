const canvas = document.querySelector('canvas')
const context = canvas.getContext('2d')

class Tags {
    constructor(){
        this.tags = {
            radius: 20,
            fillStyle: '#22cccc',
            strokeStyle: '#009999',
            selectedFill: '#88aaaa',
            text: {
                text: "node",
                textBaseline: "middle",
                font: "20px Arial",
                textAlign: "middle",
                fillStyle: "red"
            } 
        }
    }

    override(rewriter=Rewriter({})){
        return rewriter.rewrite(this.tags)
    }
}

class VisualizationGraph {
    constructor(nodes=[], edges=[]){
        this.nodes = nodes
        this.edges = edges
        this.drawer = new GraphDrawer(this)
    }

    createNode(x, y, tags={}) {
        return {
            selected: false,
            ...tags
        }
    }

    within(x, y){ 
        return this.nodes.find(n => 
            x > (n.x - n.radius) && 
            y > (n.y - n.radius) &&
            x < (n.x + n.radius) &&
            y < (n.y + n.radius)
        )
    }

    addNode(x, y, tags={}, shouldDraw=true) {
        x = x || tags.x
        y = y || tags.y
        x = x >= window.innerWidth ? window.innerWidth-50-randBetween(0, 500) : x
        y = y >= window.innerHeight ? window.innerHeight-50-randBetween(0, 500) : y
        tags.x = x
        tags.y = y
        const node = this.createNode(x, y, tags)
        this.nodes.push(node)
        if(shouldDraw) this.drawer.draw()
        return node
    }

    addEdge(selection, target) {
        const edge = {from: selection, to: target}
        let shouldRet = false
        if (selection && selection !== target) {
            shouldRet = true
            this.edges.push(edge)
        }
        this.drawer.draw()
        return shouldRet ? edge : null
    }
}

class GraphDrawer {
    constructor(graph){
        this.graph = graph
        this.selection = null
    }

    draw() {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight)

        this.graph.edges.map(edge => {
            const fromNode = edge.from
            const toNode = edge.to
            context.beginPath()
            context.strokeStyle = fromNode.strokeStyle
            context.strokeStyle = "red"
            context.lineWidth = 2
            context.shadowOffsetX = 4
            context.shadowOffsetY = 4
            context.shadowBlur = 5
            context.shadowColor = "gray"
            context.moveTo(fromNode.x, fromNode.y)
            context.lineTo(toNode.x, toNode.y)
            context.stroke()
        })

        this.graph.nodes.map(node => {
            context.beginPath()
            context.fillStyle = node.selected ? node.selectedFill : node.fillStyle
            context.arc(node.x, node.y, node.radius, 0, Math.PI * 2, true)
            context.strokeStyle = node.strokeStyle
            context.fill()
            if ("text" in node) {
                context.beginPath()
                context.fillStyle = node.text.fillStyle
                context.font = node.text.font
                context.textBaseline = node.text.textBaseline
                context.textAlign = node.text.textAlign
                context.fillText(node.text.text, node.x, node.y)
                context.fill()
            }
            context.stroke()
        })
    }

    onmousemove(e) {
        if (this.selection && e.buttons) {
            this.selection.x = e.x
            this.selection.y = e.y
            this.draw()
        }
    }

    onmousedown(e) {
        let target = this.graph.within(e.x, e.y)
        if (this.selection && this.selection.selected) {
            this.selection.selected = false
        }
        if (target) {
            // this.graph.addEdge(this.selection, target)
            this.selection = target
            this.selection.selected = true
            this.draw()
        }
    }

    onmouseup(e){
        // if (!this.selection) this.graph.addNode(e.x, e.y, new Tags().override())
        if (this.selection && !this.selection.selected) this.selection = null
        this.draw()
    }
}

const initializeGraph = (nodes=[], edges=[]) => {
    const graph = new VisualizationGraph(nodes, edges)
    window.onmousemove = (...args) => graph.drawer.onmousemove(...args)
    window.onmousedown = (...args) => graph.drawer.onmousedown(...args)
    window.onmouseup = (...args) => graph.drawer.onmouseup(...args)
    window.onresize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        graph.drawer.draw()
    }
    
    window.onresize()
    return graph
}

const save = graph => {
    const edges = graph.edges
    return JSON.stringify({
        nodes: graph.nodes.map(node => {
            node.selected = false
            return node
        }),
        edges: edges.map(edge => {
            edge.from.selected = false
            edge.to.selected = false
            return edge
        }),
    }
)}

const load = saveData => {
    const parsedData = JSON.parse(saveData)
    const graph = initializeGraph()
    const dict = {}
    for(const node of parsedData.nodes) dict[JSON.stringify(node)] = graph.addNode(null, null, node)
    for(const edge of parsedData.edges) graph.addEdge(dict[JSON.stringify(edge.from)], dict[JSON.stringify(edge.to)])
}

const reload = () => load(save(graph))

dropContainer = canvas
dropContainer.ondragover = dropContainer.ondragenter = e => e.preventDefault()

dropContainer.ondrop = e => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    const reader = new FileReader()
    reader.onload = e2 => load(e2.target.result)
    reader.readAsText(file)
}

document.onkeydown = function(e) {
    if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault()
        e.stopPropagation()
        const options = {
            suggestedName: 'saveData',
            types: [
            {
                description: 'Save data',
                accept: {
                'text/json': ['.json'],
                },
            },
            ],
        };
        window.showSaveFilePicker(options).then(handle => {
            handle.createWritable().then(writer => {
                writer.write(save(graph))
                writer.close()
            })
        })
    }
}

// let x = 0
// let y = 0

// const randRange = (min, max) => Math.floor(Math.random()*(max-min+1)+min)

// const rewritePattern = n => {
//     x+=100
//     y+=100
//     return Rewriter({
//         x: Const(x+randRange(-50, 500)),
//         y: Const(y+randRange(-50, 20)),
//         text: Rewriter({text: Const(n)})
//     })
// }

// const a = graph.addNode(400, 300, new Tags().override(rewritePattern("a")))
// const b = graph.addNode(600, 500, new Tags().override(rewritePattern("b")))
// const c = graph.addNode(700, 300, new Tags().override(rewritePattern("c")))
// const d = graph.addNode(800, 100, new Tags().override(rewritePattern("d")))
// const e = graph.addNode(900, 300, new Tags().override(rewritePattern("e")))

// graph.addEdge(a, b)
// graph.addEdge(b, c)
// graph.addEdge(c, e)
// graph.addEdge(c, d)
// graph.addEdge(c, a)
// graph.addEdge(d, a)
// graph.addEdge(d, e)
// graph.addEdge(b, e)
