# NetworkiteJS
NetworkiteJS database is a pure JavaScript persistent graph database that has its own query language. It uses the latest ES6 features such as generators, to make itself easier to use and implement. It runs on Nodejs and its primary purpose is to aid scripting since it requires no schema to be present. Any JSON object can be related to any other JSON object with any relational identity although relational identities are required to be strings.

## Insertion and deletion
### Insertion
Here's how you insert a JSON object into the database
```
db.add({
    name: "John", 
    age: 26, 
    favColors: [
        [255, 165, 0],
        [255, 192, 203],
        "Violet",
        "Taupe"
    ]
})
```
This JSON object will also be assigned a `__relation_id` field automatically which should, in most cases be irrelevant but can come in handy when fast access is required. Here's how you'd create a relation.
```
db.link(pattern.Pattern({name: "John"}), "follows", pattern.Pattern({name: "Laura"}))
```
You can use the method `linkAll` to link everything matching a pattern. Patterns will be discussed in greater lengths later but just to have everyone on the same page, patterns allow us to partially specify an object in a generic way, which can be matched against every object that has the given pattern. For instance, the aforementioned "John" object would match the first pattern given to the `link` method since it has a field named "name" containing the value "John".

### Deletion
Deletion on objects themselves is yet to be implemented but relations can be deleted simply by calling `unlink` or `unlinkAll` with the same kinds of arguments the `link` and `linkAll` functions take.

## Query
The query language presented here is less like SQL and more like an ORM since it is not parsed separately but instead it's an object-oriented way of extracting relevant data. The query class of a database can be created by calling the `db.query()` method. Here's how you'd extract mutual followers of two individuals "John" an "Laura".
```
const query = db.query()
    .vs(pattern.Pattern({name: "Hamid"}))
    .outs("follows")
    .intersect(db.query().vs(pattern.Pattern({name: "Laura"})).outs("follows"))
```
which on the following dataset
```
db.linkAll(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Victoria"}))
db.linkAll(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "John"}))
db.linkAll(pattern.Pattern({name: "Hamid"}), "follows", pattern.Pattern({name: "Williams"}))

db.linkAll(pattern.Pattern({name: "Laura"}), "follows", pattern.Pattern({name: "Victoria"}))
db.linkAll(pattern.Pattern({name: "Laura"}), "follows", pattern.Pattern({name: "Williams"}))
db.linkAll(pattern.Pattern({name: "Laura"}), "follows", pattern.Pattern({name: "Hamid"}))
```
yields 
```
{
  name: 'Victoria',
  age: 32,
  favColors: [ [ 128, 0, 128 ], [ 0, 157, 196 ] ],
  __relation_id: 4
}
{
  name: 'Williams',
  age: 29,
  favColors: [ [ 128, 0, 128 ], [ 0, 157, 196 ] ],
  __relation_id: 5
}
```
So, let's walk through that query, shall we? First, we extract all vertices matching a pattern using the `vs` method, then we call `outs` on it which yields an object that has the direct "follows" relation in the outward direction, and then finally we intersect it with a query that extracts all the followers of an object with the name Laura using exactly the same `outs` query. There are a lot of other queries available that will be documented in near future.

## Visualization
The data in NetworkiteJS can be visualized with very significant ease. All you have to do is to make a simple query like such.
```
db.query()
    .derivedTag(({name: name}) => {return {text: {text: name}}})
    .layout(layout.simplisticRandomLayout)
```
The tagging system of the query language is distinct from persistent labels and tags from other graph databases which are not yet implemented in NetworkiteJS. The derived tag here takes an object with a name property adds the tag {text: {text: name}} where name is the name property of the object. It is important to note that, you should probably use `vs` to restrict properties that contain "name" although that is not necessary here since every object in this database has the property "name". The layout method then would ask for a layout algorithm. Here we use a simplistic and randomized layout algorithm which is the only one that is implemented at the moment. This would generate something like the following layout(It would be different every time it is generated).
![Simple Graph Visualization](/images/MutualFriendVisualization.PNG?raw=true "Visualization")

The visualization provided above can be readjusted and saved with CTRL+S and then loaded by simply dragging and dropping the JSON-based save file onto the browser while the visualizer is open in the browser.
