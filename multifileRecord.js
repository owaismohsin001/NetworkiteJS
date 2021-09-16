"use strict";
const pattern = require("./pattern.js")
const rewriter = require("./rewriter.js")
const fs = require("fs")

class RecordFiles {
    constructor(fn, pageSize=10){
        this.folderName = fn
        this.pageSize = pageSize
        this.totalPages = 0
        this.getTotalFiles(this.folderName)
    }

    getTotalFiles(folderName){
        if (fs.existsSync(folderName)) {
            this.totalPages = fs.readdirSync(folderName).length
        } else {
            fs.mkdirSync(folderName)
            this.totalPages = 0
        }

        if (this.totalPages == 0) {
            this.totalPages = 1
            fs.open(this.getPath(1), 'w', (err, _) => {
                if (err) throw err
            })
        }
    }

    getPath(currentPage){
        return `${this.folderName}${"/"}${currentPage.toString()}.jarray` 
    }

    readFile(path) {
        if (!fs.existsSync(path)) {
            fs.open(path, 'w', (err, _) => {
                if (err) throw err
            })
            return
        }
        const contentArray = fs.readFileSync(path).toString().split("\n")
        const values = []
        for(const val of contentArray){
            if (val === "") continue
            values.push(JSON.parse(val))
        }
        return values
    }

    *iterate(){
        let currentPage = 1
        while(currentPage <= this.totalPages) {
            const currentFilePath = this.getPath(currentPage)
            const jsonArray = this.readFile(currentFilePath)
            for(const obj of jsonArray) yield obj
            currentPage += 1
        }
    }

    rewrite(pattern, rewriter){
        let currentPage = 1
        while(currentPage <= this.totalPages) {
            const currentFilePath = this.getPath(currentPage)
            const jsonArray = this.readFile(currentFilePath)
            let shouldRewrite = false
            let i = 0
            while(i < jsonArray.length) {
                if (pattern.match(jsonArray[i])) {
                    jsonArray[i] = rewriter.rewrite(jsonArray[i])
                    shouldRewrite = true
                }
                i++
            }
            if (shouldRewrite) {
                fs.writeFileSync(currentFilePath, jsonArray.map(JSON.stringify).join("\n") + "\n", {encoding:'utf8',flag:'w'})
            }
            currentPage += 1
        }
    }

    add(obj){
        const lastPage = this.totalPages
        const path = this.getPath(lastPage)
        const contents = fs.readFileSync(path).toString().split("\n")
        const length = contents.filter(x => x !== "").length
        if (length < this.pageSize) {
            const obj_no = this.pageSize*(lastPage-1)+length+1
            fs.appendFileSync(path, JSON.stringify({...obj, __relation_id: obj_no}) + "\n")
        } else {
            const obj_no = this.pageSize*(this.totalPages-1)+length+1
            fs.writeFileSync(this.getPath(lastPage+1), JSON.stringify({...obj, __relation_id: obj_no}) + "\n")
            this.totalPages += 1
        }
    }

    index(i){
        let [lower, upper] = [1, this.totalPages]
        let closestPage = Math.ceil(i/this.pageSize)
        if (closestPage > upper || closestPage < lower) throw `Index ${i.toString()} is out of bounds`
        const contentArray = fs.readFileSync(this.getPath(closestPage)).toString().split("\n").filter(x => x !== "")
        const index = i - (closestPage-1)*this.pageSize
        if (index > contentArray.length) throw `Index ${i.toString()} is out of bounds` 
        return JSON.parse(contentArray[index-1])
    }
}

const record = new RecordFiles("./files", 21)
for(let i = 0; i < 100; i++){
    record.add({x: i+1})
}

// record.rewrite(pattern.Pattern({x: pattern.Num(x => x > 50)}), rewriter.Rewriter({x: rewriter.Fun(x => x * 10)}))

// console.log(record.index(18))

module.exports = {RecordFiles}