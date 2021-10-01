const graph = initializeGraph();

const a1 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Hamid","age":54,"favColors":[[33,161,33],[198,75,75],"Yellow"],"__relation_id":1,"text":{"text":"Hamid"},"x":513,"y":69})));
const a2 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Laura","age":12,"favColors":[[255,255,255],"Silver"],"__relation_id":3,"text":{"text":"Laura"},"x":715,"y":295,"immediateFriend":"Laura"})));
const a3 = graph.addNode(null, null, new Tags().override(fromObject({"name":"Victoria","age":65,"favColors":[[161,33,161],[33,190,229]],"__relation_id":4,"text":{"text":"Victoria"},"x":440,"y":408,"immediateFriend":"Victoria"})));
const a4 = graph.addNode(null, null, new Tags().override(fromObject({"name":"John","age":59,"favColors":[[288,198,33],[288,225,236],"Violet","Taupe"],"__relation_id":2,"text":{"text":"John"},"x":430,"y":184})));


graph.addEdge(a1, a2);
graph.addEdge(a1, a3);
graph.addEdge(a2, a3);
graph.addEdge(a3, a2);
graph.addEdge(a3, a4);
