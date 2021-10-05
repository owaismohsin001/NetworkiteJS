const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":22,"favColors":[[1,129,1],[166,43,43],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":378,"y":80})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":412,"y":277,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":33,"favColors":[[129,1,129],[1,158,197]],"__relation_id":4,"text":{"text":"Victoria"},"x":726,"y":417,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":27,"favColors":[[256,166,1],[256,193,204],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":569,"y":175})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
