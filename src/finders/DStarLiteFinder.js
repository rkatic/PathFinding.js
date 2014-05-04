var Heap       = require('heap');
var Util       = require('../core/Util');
var Heuristic  = require('../core/Heuristic');

var min = Math.min;
var abs = Math.abs;
var SQRT2 = Math.SQRT2;

function DStarLiteFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.heuristic = opt.heuristic || Heuristic.manhattan;
    this.weight = opt.weight || 1;

	this.grid = null;
	this.openList = null;
	this.startNode = null;
	this.endNode = null;
}

DStarLiteFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
	this.init(startX, startY, endX, endY, grid);
	return this.replan();
}

DStarLiteFinder.prototype.init = function(startX, startY, endX, endY, grid) {
	this.openList = new Heap(compareNodes);

	this.grid = grid;

	this.startNode = grid.getNodeAt(startX, startY);
	this.endNode = grid.getNodeAt(endX, endY);

	this.endNode.g = Infinity;
	this.endNode.rhs = 0;

	var s = this.startNode;
	s.g = s.rhs = s.k1 = s.k2 = Infinity;

	this._openNode(this.endNode);
}

//DStarLiteFinder.prototype._updateKey = function(s) {
//
//}

DStarLiteFinder.prototype._computeKey = function(u) {
	var s = this.startNode;
	u.k2 = min(u.rhs, u.g);
	u.k1 = u.k2 + this.heuristic(abs(u.x - s.x), abs(u.y - s.y));
	return u;
}


DStarLiteFinder.prototype._openNode = function(s) {
	this._computeKey(s);
	if (s.inOpenList) {
		this.openList.updateItem(s);
	} else {
		this.openList.push(s);
	}
	s.inOpenList = 1;
	s.opened = true;
}

DStarLiteFinder.prototype._getSucc = function(u) {
	return this.grid
		.getNeighbors(u, this.allowDiagonal, this.dontCrossCorners)
		//.filter(function(s) { return s.rhs < u.rhs });
}

DStarLiteFinder.prototype._getPred = function(u) {
	return this.grid
		.getNeighbors(u, this.allowDiagonal, this.dontCrossCorners)
		//.filter(function(s) { return s.g === void 0 || s.g > u.g });
}

DStarLiteFinder.prototype._updateState = function(s) {
	if (!('g' in s)) {
		s.g = Infinity;
		s.rhs = Infinity;
	}
	if (s !== this.endNode) {
		var rhs = Infinity;
		var succ = this._getSucc(s);
		for (var i = 0; i < succ.length; ++i) {
			if ('g' in succ[i]) {
				rhs = min(rhs, succ[i].g + cost(s, succ[i]));
			}
		}
		s.rhs = rhs;
	}

	if (s.inOpenList === 1) {
		s.inOpenList = -1;
	}

	if (s.g !== s.rhs) {
		this._openNode(s);
	}
}

DStarLiteFinder.prototype.replan = function() {
	var startNode = this.startNode;
	var openList = this.openList;

	while (!openList.empty()
		   && compareNodes(openList.top(), this._computeKey(startNode)) < 0
		   || startNode.g !== startNode.rhs) {

		var s, invalid = true;
		while (invalid && (s = openList.pop())) {
			invalid = s.inOpenList === -1;
			s.inOpenList = 0;
		}

		var oldKey = {k1: s.k1, k2: s.k2};
		this._computeKey(s);

		if (compareNodes(oldKey, s) < 0) {
			this._openNode(s);
			continue;
		}

		if (s.g > s.rhs) {
			s.g = s.rhs;
			this._updateState(s);

		} else {
			s.g = Infinity;
		}

		var pred = this._getPred(s);
		for (var i = 0; i < pred.length; ++i) {
			this._updateState(pred[i]);
		}
	}

	return this._constructPath();
}

DStarLiteFinder.prototype._constructPath = function() {
	var path = [];
	var curr = this.startNode;
	var endNode = this.endNode;

	while (curr && curr !== endNode) {
		path.push(curr);
		var minval = Infinity;
		var succ = this._getSucc(curr);
		for (var i = 0; i < succ.length; ++i) {
			var val = cost(curr, succ[i]) + succ[i].g;
			if (val < minval) {
				minval = val;
				curr = succ[i];
			}
		}
	}

	return path;
}

module.exports = DStarLiteFinder;

function compareNodes(a, b) {
	return a.k1 - b.k1 || a.k2 - b.k2;
}

function cost(a, b) {
	if (!a.walkable || !b.walkable) return Infinity;
	return (a.x - b.x === 0 || a.y - b.y === 0) ? 1 : SQRT2;
}
