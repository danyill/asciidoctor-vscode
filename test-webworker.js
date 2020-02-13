const Viz = require('viz.js');
const { Module, render } = require('./node_modules/viz.js/full.render.js');
const assert = require('assert');
const path = require('path');
const Worker = require('tiny-worker');

let worker = new Worker(path.resolve(__dirname, './node_modules/viz.js/full.render.js'));
let viz = new Viz({ worker });

viz.renderString(`digraph G {

subgraph cluster_0 {
	style=filled;
	color=lightgrey;
	node [style=filled,color=white];
	a0 -> a1 -> a2 -> a3;
	label = "process #1";
}

subgraph cluster_1 {
	node [style=filled];
	b0 -> b1 -> b2 -> b3;
	label = "process #2";
	color=blue
}
start -> a0;
start -> b0;
a1 -> b3;
b2 -> a3;
a3 -> a0;
a3 -> end;
b3 -> end;

start [shape=Mdiamond];
end [shape=Msquare];
}`).then(a =>
{
	worker.terminate()
	console.log(a)

})

