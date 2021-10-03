const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":25,"favColors":[[4,132,4],[169,46,46],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":277,"y":73})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":718,"y":294,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":36,"favColors":[[132,4,132],[4,161,200]],"__relation_id":4,"text":{"text":"Victoria"},"x":531,"y":369,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":30,"favColors":[[259,169,4],[259,196,207],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":461,"y":212})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
