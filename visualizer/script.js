const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":23,"favColors":[[2,130,2],[167,44,44],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":356,"y":109})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":499,"y":302,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":34,"favColors":[[130,2,130],[2,159,198]],"__relation_id":4,"text":{"text":"Victoria"},"x":416,"y":381,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":28,"favColors":[[257,167,2],[257,194,205],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":654,"y":208})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
