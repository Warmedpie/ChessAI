//Create an express server
var express = require('express');
var app = express();
var serv = require('http').Server(app); 
const { Worker } = require('worker_threads');
 
 var SOCKET_LIST = {};
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/chess.html');
}); //This is the main HTML file the serves uses
app.use('/public',express.static(__dirname + '/public')); //The main directory is set to public
 
serv.listen(process.env.PORT || 2000); //process.env.PORT is just the port heroku uses, leave it there, 2000 implies localhost:2000 to view the site
console.log("Server started.");

var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
	
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
    });
	
    socket.on('calculate',function(data){
		
		white = data.white;
		black = data.black;
		capture = false;
		move = data.move;
		pieces = data.pieces;
		turn = data.turn;
		var depth = 1;
		
		if (turn == -1)
			nextMove(data.team,data.pieces,socket);
		if (turn == 1)
			nextMove(data.team,data.pieces,socket);
    });
   
});

function legalMoves(square,selected,moving,pieceSet) {
	for (var i = 0; i < pieceSet.length; i++) {
		if (pieceSet[i].x == square.f && pieceSet[i].y == square.r && pieceSet[i].team == selected.team) {
			return false;
			}
	}

	if (selected.type == "R") { //Rook movement
	
		var move = {
			r:0,
			f:0
		}
		move.r = square.r - selected.y;
		move.f = square.f - selected.x;
		
		if (square.r == selected.y || square.f == selected.x) {
		
			if (selected.team == -1 && moving) {
				if (selected.x == 7)
					white.castleShort = false;
				if (selected.x == 0)
					white.castleLong = false;
			}	
			if (selected.team == 1 && moving) {
				if (selected.x == 7)
					black.castleShort = false;
				if (selected.x == 0)
					black.castleLong = false;
			}
		
			var fm = 0;
			var rm = 0;
			if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
			var r = selected.y + rm;
			var f = selected.x + fm;
			if (rm != 0) {
				while (r != square.r) {
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == f && pieceSet[e].y == r && square.r != r) {
								return false;
							}
						}
					r += rm;
				}
			}
			if (fm != 0) {
				while (f != square.f) {
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == f && pieceSet[e].y == r && square.f != f) {
								return false;
							}
						}
					f += fm;
				}
			}
				return true;
		}
		else {
			return false;
		}
	}
	
	if (selected.type == "P") { //Pawn movement
		if (square.r == selected.y + selected.team && square.f == selected.x) { //Move forward
			for (var e = 0; e < pieceSet.length; e++) {
				if (pieceSet[e].x == square.f && pieceSet[e].y == square.r) {
					return false;
				}
			}
			
			return true;
		}
		else if (selected.y == 1 && selected.team == 1 && square.r == 3 && square.f == selected.x) { //Move forward twice (black)
			for (var e = 0; e < pieceSet.length; e++) {
				if (pieceSet[e].x == square.f && pieceSet[e].y == square.r) {
					return false;
				}
				if (pieceSet[e].x == square.f && pieceSet[e].y == 2) {
					return false;
				}
			}
			
			return true;
		}
		else if (selected.y == 6 && selected.team == -1 && square.r == 4 && square.f == selected.x) { //Move forward twice (white)
			for (var e = 0; e < pieceSet.length; e++) {
				if (pieceSet[e].x == square.f && pieceSet[e].y == square.r) {
					return false;
				}
				if (pieceSet[e].x == square.f && pieceSet[e].y == 5) {
					return false;
				}
			}
			
			return true;
		}
		else if (selected.team == -1 && black.lastmove.y == selected.y && black.lastmove.prevY == 1 && Math.abs(black.lastmove.x - selected.x) == 1 && Math.abs(square.f - selected.x) == 1 && square.r == selected.y + selected.team && square.f == black.lastmove.x) { //En passant white
			for (var e = 0; e < pieceSet.length; e++) {
				if (pieceSet[e].x == black.lastmove.x && pieceSet[e].y == black.lastmove.y && pieceSet[e].type == "N")
					capture = e;
			}
			return true;
		}
		else if (selected.team == 1 && white.lastmove.y == selected.y && white.lastmove.prevY == 6 && Math.abs(white.lastmove.x - selected.x) == 1 && Math.abs(square.f - selected.x) == 1 && square.r == selected.y + selected.team && square.f == white.lastmove.x) { //En passant black
			for (var e = 0; e < pieceSet.length; e++) {
				if (pieceSet[e].x == white.lastmove.x && pieceSet[e].y == white.lastmove.y && pieceSet[e].type == "N")
					capture = e;
			}
			return true;
		}
		else if (Math.abs(square.f - selected.x) == 1 && square.r == selected.y + selected.team) { //Capture diagonally
			for (var e = 0; e < pieceSet.length; e++) {
				if (pieceSet[e].x == square.f && pieceSet[e].y == square.r) {
					return true;
				}
			}
			
			return false;
		}
		else {
			return false;
		}
	}
	
	else if (selected.type == "N") { //Knight Movement
		var move = {
			r:0,
			f:0
		}
		move.r = Math.abs(square.r - selected.y);
		move.f = Math.abs(square.f - selected.x);
		if (move.r == 2 && move.f == 1) {
			return true;
		}
		else if (move.r == 1 && move.f == 2) {
			return true;
		}
		else {
			return false;
		}
	}
	else if (selected.type == "K") { //King movement
	
		var king = {};
		for (var i = 0; i < pieceSet.length; i++) {
			if (pieceSet[i].type == "K" && pieceSet[i].team != selected.team)
				king = pieceSet[i];
		}
		var move = {
			r:0,
			f:0
		}
		move.r = Math.abs(square.r - king.y);
		move.f = Math.abs(square.f - king.x);
		if (move.r <= 1 && move.f <= 1) {
			return false;
		}
		var move = {
			r:0,
			f:0
		}
		move.r = Math.abs(square.r - selected.y);
		move.f = Math.abs(square.f - selected.x);
		
		if (move.r <= 1 && move.f <= 1 && moving) {
			if (selected.team == -1) {
				white.castleShort = false;
				white.castleLong = false;
			}	
			if (selected.team == 1) {
				black.castleShort = false;
				black.castleLong = false;
			}				
			return true;
		}
		if (move.r <= 1 && move.f <= 1 && !moving) {
			return true;
		}
		if (selected.team == -1) {
			team = white;
		}	
		if (selected.team == 1) {
			team = black;
		}	
		if (move.f == 2) { //Castle
			if (square.f == 6 && team.castleShort && inCheck(team.t,pieceSet)) { //Short
				rook = {x:-1};
				for (var e = 0; e < pieceSet.length; e++) {
					if (pieceSet[e].x == 6 && pieceSet[e].y == square.r) {
						return false;
					}
					else if (pieceSet[e].x == 5 && pieceSet[e].y == square.r) {
						return false;
					}
					else if (pieceSet[e].x == 7 && pieceSet[e].y == square.r && pieceSet[e].type == "R") {
						rook = pieceSet[e];
					}
				}
				if (rook.x == 7 && moving) {
					rook.x = 5;
					
				if (selected.team == -1) {
					white.castleShort = false;
					white.castleLong = false;
				}	
				if (selected.team == 1) {
					black.castleShort = false;
					black.castleLong = false;
				}
					
					return true;
				}
				if (rook.x == 7 && !moving) {
					return true;
				}
			}
			if (square.f == 2 && team.castleLong && inCheck(team.t,pieceSet)) { //Long
				rook = {x:8};
				for (var e = 0; e < pieceSet.length; e++) {
					if (pieceSet[e].x == 3 && pieceSet[e].y == square.r) {
						return false;
					}
					else if (pieceSet[e].x == 2 && pieceSet[e].y == square.r) {
						return false;
					}
					else if (pieceSet[e].x == 1 && pieceSet[e].y == square.r) {
						return false;
					}
					else if (pieceSet[e].x == 0 && pieceSet[e].y == square.r && pieceSet[e].type == "R") {
						rook = pieceSet[e];
					}
				}
				if (rook.x == 0 && moving) {
					rook.x = 3;
					
				if (selected.team == -1) {
					white.castleShort = false;
					white.castleLong = false;
				}	
				if (selected.team == 1) {
					black.castleShort = false;
					black.castleLong = false;
				}

					
					return true;
				}
				if (rook.x == 0 && !moving) {
					return true;
				}
			}
		}

		
		else {
			return false;
		}
		
	}
	else if (selected.type == "B") { //Bishop movement
		var move = {
			r:0,
			f:0
		}
		move.r = square.r - selected.y;
		move.f = square.f - selected.x;
		
		if (Math.abs(move.r) == Math.abs(move.f)) {
				var fm = 0;
				var rm = 0;
				if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
				var r = selected.y + rm;
				var f = selected.x + fm;
				while (r != square.r) {
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == f && pieceSet[e].y == r && square.r != r) {
								return false;
							}
						}
					f += fm;
					r += rm;
				}
			return true;
		}
		else {
			return false;
		}
		
	}
	

	
	else if (selected.type == "Q") { //Queen movement
		var move = {
			r:0,
			f:0
		}
		move.r = square.r - selected.y;
		move.f = square.f - selected.x;
		
		if (Math.abs(move.r) == Math.abs(move.f)) {
				var fm = 0;
				var rm = 0;
				if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
				var r = selected.y + rm;
				var f = selected.x + fm;
				while (r != square.r) {
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == f && pieceSet[e].y == r && square.r != r) {
								return false;
							}
						}
					f += fm;
					r += rm;
				}
			return true;
		}
		else if (square.r == selected.y || square.f == selected.x) {
			var fm = 0;
			var rm = 0;
			if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
			var r = selected.y + rm;
			var f = selected.x + fm;
			if (rm != 0) {
				while (r != square.r) {
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == f && pieceSet[e].y == r && square.r != r) {
								return false;
							}
						}
					r += rm;
				}
			}
			if (fm != 0) {
				while (f != square.f) {
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == f && pieceSet[e].y == r && square.f != f) {
								return false;
							}
						}
					f += fm;
				}
			}
				return true;
		}
		else {
			return false;
		}
		
	}
	
	else {
	return true;
	}
}
function inCheck(team,pieceSet) {
	king = {};
	for (var i = 0; i < pieceSet.length; i++) {
		if (pieceSet[i].type == "K" && pieceSet[i].team == team)
			king = pieceSet[i];
	}
	for (var i = 0; i < pieceSet.length; i++) {
		var piece = pieceSet[i];
		if (piece.team != team) {
			
			if (piece.type == "P" && i != capture) {
				if (Math.abs(king.x - piece.x) == 1 && king.y == piece.y + piece.team) {
					capture = -1;
					return false;
				}
			}
			else if (piece.type == "N" && i != capture) {
				var move = {
					r:0,
					f:0
				}
				move.r = Math.abs(king.y - piece.y);
				move.f = Math.abs(king.x - piece.x);
				if (move.r == 2 && move.f == 1) {
					capture = -1;
					return false;
				}
				else if (move.r == 1 && move.f == 2) {
					capture = -1;
					return false;
				}
			}
			else if (piece.type == "B" && i != capture) {
				var move = {
					r:0,
					f:0
				}
				move.r = king.y - piece.y;
				move.f = king.x - piece.x;
				
				if (Math.abs(move.r) == Math.abs(move.f)) {
						var fm = 0;
						var rm = 0;
						if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
						var r = piece.y + rm;
						var f = piece.x + fm;
						while (r != king.y + rm) {
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										r = king.y;
									}
								}
							}
							f += fm;
							r += rm;
						}
						var r = piece.y + rm;
						var f = piece.x + fm;
						while (r != king.y + rm) {
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										r = king.y;
									}
								}
							}
							f -= fm;
							r += rm;
						}
				}
				
			}
			else if (piece.type == "R" && i != capture) {
				var move = {
					r:0,
					f:0
				}
				move.r = king.y - piece.y;
				move.f = king.x - piece.x;
				if (king.y == piece.y || king.x == piece.x) {
					var fm = 0;
					var rm = 0;
					if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
					var r = piece.y;
					var f = piece.x;
					if (rm != 0) {
						while (r != king.y + rm) {
							r += rm;
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										r = king.y + rm;
									}
								}
							}
						}
					}
					if (fm != 0) {
						while (f != king.x + fm) {
							f += fm;
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										f = king.x + fm;
									}
								}
							}
						}
					}
				}
			}
			
			else if (piece.type == "Q" && i != capture) {
				var move = {
					r:0,
					f:0
				}
				move.r = king.y - piece.y;
				move.f = king.x - piece.x;
				if (king.y == piece.y || king.x == piece.x) {
					var fm = 0;
					var rm = 0;
					if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
					var r = piece.y;
					var f = piece.x;
					if (rm != 0) {
						while (r != king.y + rm) {
							r += rm;
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										r = king.y + rm;
									}
								}
							}
						}
					}
					if (fm != 0) {
						while (f != king.x + fm) {
							f += fm;
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										f = king.x + fm;
									}
								}
							}
						}
					}
				}
				
				var move = {
					r:0,
					f:0
				}
				move.r = king.y - piece.y;
				move.f = king.x - piece.x;
				
				if (Math.abs(move.r) == Math.abs(move.f)) {
						var fm = 0;
						var rm = 0;
						if (move.r > 0) {rm = 1;} if (move.r < 0) {rm = -1;} if (move.f > 0) {fm = 1;} if (move.f < 0) {fm = -1;}
						var r = piece.y + rm;
						var f = piece.x + fm;
						while (r != king.y + rm) {
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										r = king.y;
									}
								}
							}
							f += fm;
							r += rm;
						}
						var r = piece.y + rm;
						var f = piece.x + fm;
						while (r != king.y + rm) {
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == f && pieceSet[e].y == r) {
									if (pieceSet[e] == king) {
										capture = -1;
										return false;
									}
									else {
										r = king.y;
									}
								}
							}
							f -= fm;
							r += rm;
						}
				}
				
			}
			
		}
	}
	return true;
}
function legalMoveList(team,pieceSet) {
	var moves = [];
	
	for (var i = 0; i < pieceSet.length; i++) {
		var piece = pieceSet[i];
		if (piece.team == team) {
			if (piece.type == "P") {
				for (var j = -1; j <= 1; j++) {
					var square = {f:piece.x + j,r:piece.y + piece.team};
					if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
						piece.x += j;
						piece.y += piece.team;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.x -= j;
							piece.y -= piece.team;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + j,y:piece.y + piece.team});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.x -= j;
							piece.y -= piece.team;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
				}
				var square = {f:piece.x,r:piece.y + (piece.team * 2)};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.y += piece.team * 2;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y -= piece.team * 2;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x,y:piece.y + (piece.team * 2)});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y -= piece.team * 2;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
			}
			else if (piece.type == "N") {
				var square = {f:piece.x + 1,r:piece.y + 2};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x += 1;
					piece.y += 2;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y -= 2;
						piece.x -= 1;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + 1,y:piece.y + 2});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y -= 2;
						piece.x -= 1;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
				var square = {f:piece.x + 2,r:piece.y + 1};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x += 2;
					piece.y += 1;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y -= 1;
						piece.x -= 2;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + 2,y:piece.y + 1});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y -= 1;
						piece.x -= 2;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
				var square = {f:piece.x - 1,r:piece.y + 2};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x -= 1;
					piece.y += 2;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y -= 2;
						piece.x += 1;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x - 1,y:piece.y + 2});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y -= 2;
						piece.x += 1;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
				var square = {f:piece.x - 2,r:piece.y + 1};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x -= 2;
					piece.y += 1;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y -= 1;
						piece.x += 2;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x - 2,y:piece.y + 1});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y -= 1;
						piece.x += 2;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
				var square = {f:piece.x + 1,r:piece.y - 2};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x += 1;
					piece.y -= 2;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y += 2;
						piece.x -= 1;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + 1,y:piece.y - 2});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y += 2;
						piece.x -= 1;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
				var square = {f:piece.x + 2,r:piece.y - 1};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x += 2;
					piece.y -= 1;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y += 1;
						piece.x -= 2;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + 2,y:piece.y - 1});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y += 1;
						piece.x -= 2;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
				var square = {f:piece.x - 1,r:piece.y - 2};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x -= 1;
					piece.y -= 2;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y += 2;
						piece.x += 1;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x - 1,y:piece.y - 2});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y += 2;
						piece.x += 1;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
				var square = {f:piece.x - 2,r:piece.y - 1};
				if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
					piece.x -= 2;
					piece.y -= 1;
					var a = {x:-1};
					for (var e = 0; e < pieceSet.length; e++) {
						if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
							a = pieceSet[e];
							pieceSet.splice(e,1);
						}
					}
					if (inCheck(team,pieceSet)) {
						piece.y += 1;
						piece.x += 2;
						moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x - 2,y:piece.y - 1});
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
					else {
						piece.y += 1;
						piece.x += 2;
						if (a.x != -1) {
							pieceSet.push(a);
						}
					}
				}
			}
			else if (piece.type == "R") {
				for (var j = 0; j <= 7; j++) {
					var square = {f:piece.x,r:j};
					if (legalMoves(square,piece,false,pieceSet)) {
						var y = piece.y;
						piece.y = j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.y = y;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x,y:j});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.y = y;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
					var square = {f:j,r:piece.y};
					if (legalMoves(square,piece,false,pieceSet)) {
						var x = piece.x;
						piece.x = j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.x = x;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:j,y:piece.y});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.x = x;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
				}
			}
			else if (piece.type == "B") {
				for (var j = -7;j <= 7; j++) {
					var square = {f:piece.x + j,r:piece.y + j};
					if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
						piece.y += j;
						piece.x += j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.y -= j;
							piece.x -= j;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + j,y:piece.y + j});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.y -= j;
							piece.x -= j;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
					var square = {f:piece.x - j,r:piece.y + j};
					if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
						piece.y += j;
						piece.x -= j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.y -= j;
							piece.x += j;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x - j,y:piece.y + j});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.y -= j;
							piece.x += j;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
				}
			}
			else if (piece.type == "Q") {
				for (var j = -7;j <= 7; j++) {
					var square = {f:piece.x + j,r:piece.y + j};
					if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
						piece.y += j;
						piece.x += j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.y -= j;
							piece.x -= j;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + j,y:piece.y + j});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.y -= j;
							piece.x -= j;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
					var square = {f:piece.x - j,r:piece.y + j};
					if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
						piece.y += j;
						piece.x -= j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.y -= j;
							piece.x += j;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x - j,y:piece.y + j});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.y -= j;
							piece.x += j;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
				}
				for (var j = 0; j <= 7; j++) {
					var square = {f:piece.x,r:j};
					if (legalMoves(square,piece,false,pieceSet)) {
						var y = piece.y;
						piece.y = j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.y = y;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x,y:j});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.y = y;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
					var square = {f:j,r:piece.y};
					if (legalMoves(square,piece,false,pieceSet)) {
						var x = piece.x;
						piece.x = j;
						var a = {x:-1};
						for (var e = 0; e < pieceSet.length; e++) {
							if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
								a = pieceSet[e];
								pieceSet.splice(e,1);
							}
						}
						if (inCheck(team,pieceSet)) {
							piece.x = x;
							moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:j,y:piece.y});
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
						else {
							piece.x = x;
							if (a.x != -1) {
								pieceSet.push(a);
							}
						}
					}
				}
			}
			else if (piece.type == "K") {
				for (var x = -2;x <= 2; x++) {
					for (var y = -1;y <= 1; y++) {
						var square = {f:piece.x + x,r:piece.y + y};
						if (legalMoves(square,piece,false,pieceSet) && square.f >= 0 && square.f <= 7 && square.r >= 0 && square.r <= 7) {
							piece.y += y;
							piece.x += x;
							var a = {x:-1};
							for (var e = 0; e < pieceSet.length; e++) {
								if (pieceSet[e].x == square.f && pieceSet[e].y == square.r && pieceSet[e].team != piece.team) {
									a = pieceSet[e];
									pieceSet.splice(e,1);
								}
							}
							if (inCheck(team,pieceSet)) {
								piece.y -= y;
								piece.x -= x;
								moves.push({type:piece.type,prevX:piece.x,prevY:piece.y,x:piece.x + x,y:piece.y + y});
								if (a.x != -1) {
									pieceSet.push(a);
								}
							}
							else {
								piece.y -= y;
								piece.x -= x;
								if (a.x != -1) {
									pieceSet.push(a);
								}
							}
						}
					}
				}
			}
		}
	}
	
	return moves;
}
function checkScore(piecesT,piecesY) {
	var pieceSet;
	pieceSet = piecesT;
	var Tscore = 0;
	var king = {};
	for (var i = 0; i < pieceSet.length; i++) {
		if (pieceSet[i].type == "K") {
			king = pieceSet[i];
		}
	}
	for (var i = 0; i < pieceSet.length; i++) {
		var score = 0;
		if (pieceSet[i].type == "P") {
			score = 1;
			if (pieceSet[i].team == -1) {
				var distance = pieceSet[i].y;
			}
			if (pieceSet[i].team == 1) {
				var distance = 7 - pieceSet[i].y;
			}
			var passed = true;
			for (var j = 0; j < piecesY.length; j++) {
				if (piecesY[j].x == pieceSet[i].x && pieceSet[i].type == "P" && piecesY[j].y != pieceSet[i].y) {
					passed = false;
				}
			}
			for (var j = 0; j < piecesY.length; j++) {
				if (piecesY[j].x == pieceSet[i].x && piecesY[j].type == "R" && piecesY[j].team == pieceSet[i].team && piecesY[j].y != pieceSet[i].y) {
					score += 2;
				}
			}
			if (passed) {
				score += (Math.abs(distance - 6) * 0.25);
				
				if (distance == 1) {
					score += 2;
				}
				if (distance == 0) {
					score += 3;
				}
			}
		}
		
		if (pieceSet[i].type == "N") {
			score = 3;
			
			var distance = (Math.sqrt(Math.pow(4 - pieceSet[i].x,2) + Math.pow(4 - pieceSet[i].y,2)));
			
			if (king.startX == king.x && king.startY == king.startY) {
				if (pieceSet[i].x == pieceSet[i].startX && pieceSet[i].y == pieceSet[i].startY && move > 3) {
					score -= 0.15;
				}
			}
			if (pieceSet[i].x == 7 || pieceSet[i].x == 0) {
				score -= 0.2;
			}
			
			score *= 1 + (Math.abs(distance - 5.656854249492381) * 0.003);
		}
		
		if (pieceSet[i].type == "B") {
			score = 3;
			
			var distance = (Math.sqrt(Math.pow(4 - pieceSet[i].x,2) + Math.pow(4 - pieceSet[i].y,2)));
			
			score *= 1 + (Math.abs(distance - 5.656854249492381) * 0.001);
		}
		
		if (pieceSet[i].type == "R") {
			score = 5;
			
			var distance = (Math.sqrt(Math.pow(4 - pieceSet[i].x,2) + Math.pow(4 - pieceSet[i].y,2)));
			
			score *= 1 + (Math.abs(distance - 5.656854249492381) * 0.001);
		}
		
		if (pieceSet[i].type == "Q") {
			score = 9;
			
			var distance = (Math.sqrt(Math.pow(4 - pieceSet[i].x,2) + Math.pow(4 - pieceSet[i].y,2)));
			
			if (pieceSet[i].x != pieceSet[i].startX && pieceSet[i].y != pieceSet[i].startY) {
				if (move <= 3) {
					score -= 1;
				}
				if (king.startX == king.x && king.startY == king.startY) {
					score -= 0.3;
				}
			}
			
			score *= 1 + (Math.abs(distance - 5.656854249492381) * 0.0001);
		}
		
		if (pieceSet[i].type == "K") {
			if (pieceSet[i].team == 1) {
				if (king.y == 0) {
					score += 0.3;
					
					if (pieceSet[i].x <= 3 || pieceSet[i].x >= 6) {
						score += 0.5;
					}
					else if (pieceSet[i].startX != pieceSet[i].x) {
						score -= 0.4;
					}
				}
				else {
					score -= 0.2
				}
			}
			if (pieceSet[i].team == -1) {
				if (king.y == 7) {
					score += 0.3;
					
					if (pieceSet[i].x <= 3 || pieceSet[i].x >= 6) {
						score += 0.5;
					}
					else if (pieceSet[i].startX != pieceSet[i].x) {
						score -= 0.4;
					}
				}
				else {
					score -= 0.2;
				}
			}
			if (pieceSet[i].x > 3 && pieceSet[i].x < 6) {
				if (pieceSet[i].startX != pieceSet[i].x && pieceSet[i].startY != pieceSet[i].y) {
					score -= 0.4;
				}
			}
		}

		var nextMoves = legalMoveList(pieceSet[i].team,pieceSet);
		
		for (var q in nextMoves) {
			if (nextMoves[q].type == "K") {
				if (nextMoves[q].prevX != nextMoves[q].startX && nextMoves[q].prevY != nextMoves[q].startY) {
					if (Math.abs(nextMoves[q].x - nextMoves[q].prevX) == 2) {
						score += 0.03;
					}
				}
			}
		}
		
		if (pieceSet[i].team == -1) {
			Tscore *= legalCounter(white,pieceSet[i],piecesT);
		}
		
		if (pieceSet[i].team == 1) {
			Tscore *= legalCounter(black,pieceSet[i],piecesT);
		}
		Tscore += score;
		
	}
	
	return Tscore;
	
}

function legalCounter(team,piece,pieceSet) {
		var legalCount = 0;
		var moves = legalMoveList(team.t,pieceSet);
		for (var q = 0; q < moves.length;q++) {
			var move = moves[q];
			
			if (move.prevX == piece.x && move.prevY == piece.y) {
				legalCount ++;
			}
		}
		
		return 1 + (0.001 * legalCount);
}

function nextMove(team,pieceSet,socket) {
	var piecesetM = [];
	var piecesetN = [];
	var scores = [];
	var mateScore = 0;
	
	for (var i in pieceSet) {
		if (pieceSet[i].team == team.t)
			piecesetM.push(pieceSet[i]);
	}
	
	for (var i in pieceSet) {
		piecesetN.push(pieceSet[i]);
	}
	
	var counterMoves = legalMoveList(team.t * -1,piecesetN)
	var attacks = [];
	
	for (var i in counterMoves) {
		for (var j in piecesetM) {
			if (counterMoves[i].x == piecesetM[j].x && counterMoves[i].y == piecesetM[j].y) {
				attacks.push(piecesetM[j]);
			}
		}
	}
	
	var i;
	var il = team.legalMoves.length;
	for (i = 0; i < il; i++) {
		var move = team.legalMoves[i];
			var e;
			var el = piecesetM.length;
			for (e = 0; e < el; e++) {
			
				var piece = piecesetM[e];
				if (move.prevX == piece.x && move.prevY == piece.y) {
					piecesetN[piecesetN.indexOf(piece)].x = move.x;
					piecesetN[piecesetN.indexOf(piece)].y = move.y;
					piecesetM[e].x = move.x;
					piecesetM[e].y = move.y;
					
					var attacksB = [];
					for (var ii in counterMoves) {
						for (var ji in piecesetM) {
							if (counterMoves[ii].x == piecesetM[ji].x && counterMoves[ii].y == piecesetM[ji].y && piecesetM[ji].type != "P") {
								attacksB.push(piecesetM[ji]);
							}
						}
					}
					
					var pieceSetQ = [];
					var pieceSetR = [];
					
					for (var k in piecesetM) {
						pieceSetQ.push({x:piecesetM[k].x,y:piecesetM[k].y,startX:piecesetM[k].startX,startY:piecesetM[k].startY,type:piecesetM[k].type,team:team.t});
					}
					for (var k in piecesetN) {
						pieceSetR.push({x:piecesetN[k].x,y:piecesetN[k].y,startX:piecesetN[k].startX,startY:piecesetN[k].startY,type:piecesetN[k].type,team:piecesetN[k].team});
					}
					var Tscore = checkScore(pieceSetQ,pieceSetR);
					
					if (piece.type == "K") {
						if (move.prevX == piece.startX && move.prevY == piece.startY) {
							if (Math.abs(move.x - move.prevX) == 2) {
								Tscore += 1.5;
							}
							else {
								Tscore -= 0.7;
							}
						}
					}
					
					for (var ji in attacksB) {
						if (attacks.includes(attacksB[ji])) {
							if (attacksB[ji].type == "N") {
								Tscore -= 3;
							}
							if (attacksB[ji].type == "B") {
								Tscore -= 3;
							}
							if (attacksB[ji].type == "R") {
								Tscore -= 5;
							}
							if (attacksB[ji].type == "Q") {
								Tscore -= 9;
							}
						}
					}
					
					if (!inCheck(team.t,pieceSetR) && attacksB.length >= 1) {
						for (var ji in attacksB) {
							if (attacksB[ji].type == "N") {
								Tscore -= 3.5;
							}
							if (attacksB[ji].type == "B") {
								Tscore -= 3.5;
							}
							if (attacksB[ji].type == "R") {
								Tscore -= 5.5;
							}
							if (attacksB[ji].type == "Q") {
								Tscore -= 9.5;
							}
						}
					}
					
					if (attacksB.length >= 2) {
						var damage = 0;
						for (var ji in attacksB) {
							if (attacksB[ji].type == "N") {
								damage = 3.5;
							}
							if (attacksB[ji].type == "B") {
								damage = 3.5;
							}
							if (attacksB[ji].type == "R") {
								damage = 5.5;
							}
							if (attacksB[ji].type == "Q") {
								damage = 9.5;
							}
						}
						Tscore -= damage;
					}

					for (var j = 0; j < pieces.length; j++) {
						if (pieces[j].x == move.x && pieces[j].y == move.y && pieces[j].team != piece.team && turn == team.t) {
							if (pieces[j].type == "P") {
								Tscore += 1;
							}
							
							if (pieces[j].type == "N") {
								Tscore += 3;
							}
							
							if (pieces[j].type == "B") {
								Tscore += 3;
							}
							
							if (pieces[j].type == "R") {
								Tscore += 5;
							}
							
							if (pieces[j].type == "Q") {
								Tscore += 9;
							}
						}
						
					}
					var captureP = {x:-1};
					for (var j = 0; j < pieceSetR.length; j++) {
						if (pieceSetR[j].x == move.x && pieceSetR[j].y == move.y && pieceSetR[j].team != team.t) {
							captureP = pieceSetR[j];
							pieceSetR.splice(j,1);
						}
					}
					
					var movesB = legalMoveList(team.t * -1,pieceSetR);

					if (movesB.length == 0 && turn == team.t && !inCheck(team.t*-1,pieceSetR)) {
						Tscore *= 15;
					}
					
					var Bscores = [];
					
					for (var j = 0; j < movesB.length; j++) {
						var moveB = movesB[j];
						var Bscore = 0;
						for (var n = 0; n < pieceSetR.length; n++) {
							if (pieceSetR[n].team == team.t && pieceSetR[n].x == moveB.x && pieceSetR[n].y == moveB.y) {
								if (pieceSetR[n].type == "P") {
									Bscore -= 1;
								}
								
								if (pieceSetR[n].type == "N") {
									Bscore -= 3;
								}
								
								if (pieceSetR[n].type == "B") {
									Bscore -= 3;
								}
								
								if (pieceSetR[n].type == "R") {
									Bscore -= 5;
								}
								
								if (pieceSetR[n].type == "Q") {
									Bscore -= 9;
								}
							}
						}
						if (moveB.x == move.x && moveB.y == move.y) {
								if (piece.type == "N") {
									Bscore -= 3;
								}
								
								if (piece.type == "B") {
									Bscore -= 3;
								}
								
								if (piece.type == "R") {
									Bscore -= 5;
								}
								
								if (piece.type == "Q") {
									Bscore -= 9;
								}
						}
						
						var captureP = {x:-1};
						for (var q = 0; q < pieceSetR.length; q++) {
							if (pieceSetR[q].x == moveB.x && pieceSetR[q].y == moveB.y && pieceSetR[q].team == team.t) {
								captureP = pieceSetR[q];
								pieceSetR.splice(q,1);
							}
						}
						
						for (var q = 0; q < pieceSetR.length; q++) {
							if (pieceSetR[q].x == moveB.prevX && pieceSetR[q].y == moveB.prevY) {
								pieceSetR[q].x = moveB.x;
								pieceSetR[q].y = moveB.y;
							}
						}
						
						
						var movesC = legalMoveList(team.t,pieceSetR);
						if (movesC.length == 0 && turn == team.t && !inCheck(team.t,pieceSetR)) {
							Tscore = 0;
						}
						
						if (captureP.x != -1)
							pieceSetR.push(captureP);
						
						var Cscores = [];
						
						var scoreTest = [];
						for (var v in scores) {
							scoreTest.push(scores[v]);
						}
						scoreTest = bubbleSortSingle(scoreTest);
						scoreTest.reverse();
						
						if (scoreTest[0] >= Tscore) {
						for (var q=0; q < movesC.length; q++) {
							var moveC = movesC[q];
							var Cscore = 0;
							for (var n = 0; n < pieceSetR.length; n++) {
								if (pieceSetR[n].team != team.t && pieceSetR[n].x == moveC.x && pieceSetR[n].y == moveC.y) {
									if (pieceSetR[n].type == "P") {
										Cscore += 1;
									}
									
									if (pieceSetR[n].type == "N") {
										Cscore += 3;
									}
									
									if (pieceSetR[n].type == "B") {
										Cscore += 3;
									}
									
									if (pieceSetR[n].type == "R") {
										Cscore += 5;
									}
									
									if (pieceSetR[n].type == "Q") {
										Cscore += 9;
									}
								}
							}
							
							var movesD = legalMoveList(team.t*-1,pieceSetR);

							var scoreTest = [];
							for (var v in scores) {
								scoreTest.push(scores[v]);
							}
							scoreTest = bubbleSortSingle(scoreTest);
							
							var Dscores = [];
							if (scoreTest[0] + 0.2 < Tscore) {
								for (var w=0; w < movesD.length; w++) {
									var moveD = movesD[w];
									var Dscore = 0;
									for (var n = 0; n < pieceSetR.length; n++) {
										if (pieceSetR[n].team != team.t && pieceSetR[n].x == moveD.x && pieceSetR[n].y == moveD.y) {
											if (pieceSetR[n].type == "P") {
												Dscore -= 1;
											}
											
											if (pieceSetR[n].type == "N") {
												Dscore -= 3;
											}
											
											if (pieceSetR[n].type == "B") {
												Dscore -= 3;
											}
											
											if (pieceSetR[n].type == "R") {
												Dscore -= 5;
											}
											
											if (pieceSetR[n].type == "Q") {
												Dscore -= 9;
											}
										}
									}
									Dscores.push(Dscore);
								}
							}
							Dscores =  bubbleSortSingle(Dscores);
							if (Dscores.length >= 1)
								Cscore += Dscores[0];
							Cscores.push(Cscore);
						}
						}
					Cscores =  bubbleSortSingle(Cscores);
					if (Cscores.length >= 1)
						Bscore += Cscores[0];
					
					if (captureP.x != -1)
						pieceSetR.push(captureP);
						
					Bscores.push(Bscore);
						
					}
					Bscores = bubbleSortSingle(Bscores);
					if (Bscores.length >= 1)
						Tscore += Bscores[0];
					
					scores.push(Tscore);
					
					piecesetN[piecesetN.indexOf(piece)].x = move.prevX;
					piecesetN[piecesetN.indexOf(piece)].y = move.prevY;
					
					piece.x = move.prevX;
					piece.y = move.prevY;
					
					
				}
				
			}
	}
	var obj = bubbleSort(scores,team.legalMoves);
	scores = obj.a;
	team.legalMoves = obj.b;
	scores.reverse();
	team.legalMoves.reverse();
	
	team.score = scores[0];
	team.scores = scores;
	
	
	
	socket.emit('result',{ 
		team:team,
		mateScore:mateScore,
	});
	
}

function bubbleSort(array,array2) {
	for (var i = 0; i < array.length; i++) {
		for (var e = 0; e < array.length; e++) {
            if (array[e] > array[e + 1]) {
                let tmp = array[e];
                array[e] = array[e + 1];
                array[e + 1] = tmp;
				
                let tmp2 = array2[e];
                array2[e] = array2[e + 1];
                array2[e + 1] = tmp2;
            }
		}
	}
	
	return {a:array,b:array2};
}

function bubbleSortSingle(array) {
	for (var i = 0; i < array.length; i++) {
		for (var e = 0; e < array.length; e++) {
            if (array[e] > array[e + 1]) {
                let tmp = array[e];
                array[e] = array[e + 1];
                array[e + 1] = tmp;
            }
		}
	}
	
	return array;
}

function runService(workerData,socket) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./eval.js', { workerData });
    worker.on('message', (message) => result(message,socket));
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    })
  })
}

async function runEval(pieceSet,socket,depth,turn,move) {
	var data = {
		turn:turn,
		pieceSet:pieceSet,
		move:move,
		depth:depth,
		white:white,
		black:black
	}

  const result = await runService(data,socket);

	
}
function result(result,socket) {
	socket.emit('result',{ 
		team:result.teamM,
		depth:result.depth,
		mateScore:result.m,
	});	
}