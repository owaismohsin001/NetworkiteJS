const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":24,"favColors":[[0,128,0],[165,42,42],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":121,"y":116})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":443,"y":254,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":35,"favColors":[[128,0,128],[0,157,196]],"__relation_id":4,"text":{"text":"Victoria"},"x":478,"y":386,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":29,"favColors":[[255,165,0],[255,192,203],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":614,"y":171})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
