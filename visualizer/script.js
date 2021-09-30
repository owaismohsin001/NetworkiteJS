const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":39,"favColors":[[18,146,18],[183,60,60],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":584,"y":117})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":263,"y":285,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":50,"favColors":[[146,18,146],[18,175,214]],"__relation_id":4,"text":{"text":"Victoria"},"x":614,"y":350,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":44,"favColors":[[273,183,18],[273,210,221],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":661,"y":210})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
