const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":32,"favColors":[[11,139,11],[176,53,53],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":543,"y":88})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":725,"y":294,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":43,"favColors":[[139,11,139],[11,168,207]],"__relation_id":4,"text":{"text":"Victoria"},"x":601,"y":363,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":37,"favColors":[[266,176,11],[266,203,214],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":476,"y":169})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
