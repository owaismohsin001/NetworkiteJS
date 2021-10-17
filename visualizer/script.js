const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":24,"favColors":[[3,131,3],[168,45,45],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":177,"y":115})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":690,"y":284,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":35,"favColors":[[131,3,131],[3,160,199]],"__relation_id":4,"text":{"text":"Victoria"},"x":385,"y":374,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":29,"favColors":[[258,168,3],[258,195,206],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":597,"y":192})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
