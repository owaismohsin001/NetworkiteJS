const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":28,"favColors":[[7,135,7],[172,49,49],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":337,"y":106})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":794,"y":300,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":39,"favColors":[[135,7,135],[7,164,203]],"__relation_id":4,"text":{"text":"Victoria"},"x":537,"y":411,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":33,"favColors":[[262,172,7],[262,199,210],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":249,"y":184})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
