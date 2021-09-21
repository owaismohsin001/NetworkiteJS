const fs = require("fs")

class KeyStore {
    constructor(path, parse, serializePair, serialize){
        const dir = `${path}/relations`
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        this.parse = parse
        this.serialize = serialize
        this.serializePair = serializePair
        this.dir = dir
    }

    getPath(file){
        return this.dir + "/" + file + ".csv"
    }

    has(file){
        return fs.existsSync(this.getPath(file))
    }

    get(name){
        const path = this.getPath(name)
        if (!(fs.existsSync(path))) throw `Index out of bounds ${name}`
        const data = fs.readFileSync(path).toString()
        return this.parse(name, data)
    }

    addPair(name, d1, d2){
        const path = this.getPath(name)
        fs.appendFileSync(path, this.serializePair(name, d1, d2) + "\n")
    }

    newRelation(name){
        const path = this.getPath(name)
        fs.writeFileSync(path, "", {encoding:'utf8',flag:'w'})
    }

    set(name, data){
        const path = this.getPath(name)
        const serializedData = this.serialize(data)
        if (serializedData == "" || serializedData == "\n") {
            fs.unlinkSync(path)
            return
        }
        fs.writeFileSync(path, serializedData, {encoding:'utf8',flag:'w'})
    }
}

module.exports = {KeyStore}