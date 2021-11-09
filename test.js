const pattern = require("./pattern.js")
const rewriter = require("./rewriter.js")
const {DFSSide, Graph, renderQueriedGraph} = require("./store")
const layout = require("./layout.js")

const db = new Graph("./people")
db.writer()
    // .add({
    //     name: "Hamid", 
    //     age: 21, 
    //     favColors: [
    //         [0, 128, 0],
    //         [165, 42, 42],
    //         "Yellow"
    //     ]
    // })
    // .add({
    //     name: "John", 
    //     age: 26, 
    //     favColors: [
    //         [255, 165, 0],
    //         [255, 192, 203],
    //         "Violet",
    //         "Taupe"
    //     ]
    // })
    // .add({
    //     name: "Laura", 
    //     age: 12, 
    //     favColors: [
    //         [255, 255, 255],
    //         "Silver",
    //     ]
    // })
    // .add({
    //     name: "Victoria", 
    //     age: 32, 
    //     favColors: [
    //         [128, 0, 128],
    //         [0, 157, 196],
    //     ]
    // })
    .rewrite(pattern.Pattern({
        name: pattern.Str(),
        age: pattern.Num(i => i >= 18),
        favColors: pattern.Arr(pattern.Or(pattern.Tup([pattern.Num(), pattern.Num(), pattern.Num()]), pattern.Str()))
    }), rewriter.Rewriter({
        age: rewriter.Fun(i => i+1),
        favColors: rewriter.Arr(rewriter.Cond(pattern.Arr(pattern.Pattern({})), rewriter.Arr(rewriter.Fun(a => a+1)), rewriter.Id()))
    }))
    .linkAll(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Laura"}))
    .linkAll(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Victoria"}))
    .linkAll(pattern.Pattern({name: "Laura"}), "follows", pattern.Pattern({name: "Victoria"}))
    .linkAll(pattern.Pattern({name: "Victoria"}), "follows", pattern.Pattern({name: "Laura"}))
    .linkAll(pattern.Pattern({name: "Victoria"}), "follows", pattern.Pattern({name: "John"}))
    .execute()

const query = db.query()
    .vs(pattern.Pattern({}))
    .derivedTag(({name: name}) => {return {text: {text: name}}})
    .layout(layout.simplisticRandomLayout)
    .vs(pattern.Pattern({name: "Hamid"}))
    .outs("follows")
    .derivedTag(({name: name}) => {return {immediateFriend: name}})
    .ins("follows")
    .intersect(db.query().vs(pattern.Pattern({age: pattern.Num(i => i > 18)})))
    .relatesTo("follows", pattern.Pattern({name: "John"}), DFSSide.OUTGONG)
    .hasTag(pattern.Pattern({immediateFriend: pattern.Str()}))
    .unique()

for(const unit of query.execute()) console.log(unit)
// renderQueriedGraph(query, "follows")