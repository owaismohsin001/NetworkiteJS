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

const store = new Store("./db.jarray")
// store.add({
//     name: "Hamid", 
//     age: 21, 
//     favColors: [
//         [0, 128, 0],
//         [165, 42, 42],
//         "Yellow"
//     ]
// })

// store.add({
//     name: "John", 
//     age: 26, 
//     favColors: [
//         [255, 165, 0],
//         [255, 192, 203],
//         "Violet",
//         "Taupe"
//     ]
// })

// store.add({
//     name: "Laura", 
//     age: 12, 
//     favColors: [
//         [255, 255, 255],
//         "Silver",
//     ]
// })

// store.add({
//     name: "Victoria", 
//     age: 32, 
//     favColors: [
//         [128, 0, 128],
//         [0, 157, 196],
//     ]
// })

const adultPattern = pattern.Pattern({
    name: pattern.Str(),
    age: pattern.Num(i => i >= 18),
    favColors: pattern.Arr(pattern.Or(pattern.Tup([pattern.Num(), pattern.Num(), pattern.Num()]), pattern.Str()))
})

const adultRewriter = rewriter.Rewriter({
    age: rewriter.Fun(i => i+1),
    favColors: rewriter.Arr(rewriter.Cond(a => a instanceof Array, rewriter.Arr(rewriter.Fun(a => a+1)), rewriter.Id()))
})

store.rewrite(adultPattern, adultRewriter)
for (const unit of store.iterate()) console.log(unit)