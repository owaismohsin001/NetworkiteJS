const randBetween = (min, max) => Math.floor(Math.random()*(max-min+1)+min)

const simplisticRandomLayout = (_, nodes, tagObject) => {
    const allTags = tagObject.tags
    const newAllTags = {}

    let x = 0
    let y = 0

    for(const node of nodes){
        const key = node.__relation_id
        x+=100
        y+=100
        newAllTags[key] = [...(key in allTags ? allTags[key] : []), {x: x+randBetween(-50, 500), y: y+randBetween(-50, 20)}]
    }
    return newAllTags
}

module.exports = {simplisticRandomLayout}