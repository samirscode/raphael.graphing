/** 
* raphael.graph plugin 1.0.0
* @author Keith Lawler
* Copyright (c) 2010 Revolution Prep
* Code modified from Peter Jipset, http://www.chapman.edu/~jipsento to fit within Raphael 
*/
(function() {    
	Raphael.fn.line = function(x1, y1, x2, y2, thickness, color) {
		color = typeof(color) != 'undefined' ? color : '#ccc';
		thickness = typeof(thickness) != 'undefined' ? thickness : .5;
		return this.path("M" + x1 + " " + y1 + " L" + x2 + " " + y2).attr({stroke: color, fill: "none", 'stroke-width': thickness})
	}

	Raphael.fn.polygon = function(points) {
		var path = "M"
		for (var i = 0; i < points.length; i++) {
			letter = i % 2 == 0 && i != 0 ? 'L ' : ''
			path += " " + letter + points[i]
		}
		return this.path(path)
	}
	
	Raphael.fn.point = function (x,y,radius,label) {
		var paper = this;
		
		var point = {
			x: x,
			y: y,
			radius: radius,
			label: label,
		};
		
		point.init = function() {
			circle = paper.circle(point.x, point.y, 6).attr({fill: '#0694d2', stroke: 'none', cursor: "move"}),
			label = paper.print(45,28, 'A', paper.getFont("Gill Sans"), 14).attr({fill: '#0694d2'})
			set = paper.set();
			set.draggable.dragstart(function() {});
			circle.draggable.drag(function() {
				this.animate({fill: "#febb31"}, 100);
			});
			circle.draggable.dragend(function() {
				point.x = Math.round(this.attrs.cx)
				point.y = Math.round(this.attrs.cy)
				this.animate({fill: "#0694d2"}, 100);
			});
			set.draggable.dragend(function() {
				p = this.getBBox();
				this.translate(Raphael.snapTo(20, p.x, 10) - 6 - p.x, Raphael.snapTo(20, p.y, 10) +2 - p.y)
			});
			set.draggable.enable();
			set.push(circle);
			set.push(label);

		}
		


		point.init();
		return point;
	};

	Raphael.fn.graph = function(width, height, interval, attrs) {
		var paper = this;
		var graph = {
			width: width,
			height: height,
			interval: interval,
			origin: { x: (width/2), y: (height/2) },
			elements : {},
			element_count : 0,
			attrs : {},
			x_min: -width/2, x_max: width/2,
			y_min: -height/2, y_max: height/2,
			grid: null, axes_lines: null, axes_labels: null,
			dx: null, dy: null,
			xunitlength: null,
			yunitlength: null,
			initialized : false,
			point: {},
			properties: {},
			
			marker: null,
			marker_attrs: { 'stroke-width':1, stroke: "black", fill: "yellow", r: 4 },
			dot_attrs: { r: 4 },
			ticklength: 4,
			axis_stroke: '#162732',
			grid_stroke: '#43c2f8',
			font_attrs: { 'font-style': 'italic', 'font-family': 'times', 'font-size': 16, 'font-weight': 'normal'},

			quadrant_1: null,
			quadrant_2: null,
			quadrant_3: null,
			quadrant_4: null,
			quadrant_1_label: null,
			quadrant_2_label: null,
			quadrant_3_label: null,
			quadrant_4_label: null
		};
	
		
		graph.coordinate = function(x, y) {
			return {x: ((x - graph.origin.x)/graph.dx), y: ((y - graph.origin.y)/graph.dy * -1)};
		}
		graph.canvas_coordinate = function(x, y) {
			return {x: (x*graph.dx +graph.origin.x), y: (-y*graph.dy + graph.origin.y)};
		}
		
		
		// Point properties
		graph.check_if = function(property, point) {
			if (graph.properties[property]) {
				var coordinate_point = graph.coordinate(point.x, point.y)
				return graph.properties[property].call(this, coordinate_point);
			} else {
				$.error("Point property '" +  property + "' is not implemented." )
			}
		}
		graph.properties.is_origin = function(point) {
			return (point.x == 0 && point.y == 0)
		}
		graph.properties.on_horizontal_axis = function(point) {
			return (point.y == 0)
		}
		graph.properties.on_vertical_axis = function(point) {
			return (point.x == 0)
		}
		graph.properties.on_horizontal_axis = function(point) {
			return (point.y == 0)
		}
		graph.properties.in_quadrant_1 = function(point) {
			return (point.x > 0 && point.y > 0)
		}
		graph.properties.in_quadrant_2 = function(point) {
			return (point.x < 0 && point.y > 0)
		}
		graph.properties.in_quadrant_3 = function(point) {
			return (point.x < 0 && point.y < 0)
		}
		graph.properties.in_quadrant_4 = function(point) {
			return (point.x > 0 && point.y < 0)
		}

		graph.axes = function(dx,dy,labels,gdx,gdy) {
			//xscl=x is equivalent to xtick=x; xgrid=x; labels=true;
			var x, y, ldx, ldy, lx, ly, lxp, lyp, pnode, st, fontsize;
			if (typeof dx=="string") { labels = dx; dx = null; }
			if (typeof dy=="string") { gdx = dy; dy = null; }
			if (labels == false) { labels = null };

			graph.dx = dx = (dx==null?graph.xunitlength:dx*graph.xunitlength);
			graph.dy = dy = (dy==null?dx:dy*graph.yunitlength);
			fontsize = graph.font_attrs['font-size'] = Math.min(dx/2,dy/2,16);
			graph.ticklength = fontsize/4;
			
			// print the grid
			if (gdx!=null) {
				gdx = ((typeof gdx=="string" || typeof gdx == "boolean") ? graph.xunitlength :gdx*graph.xunitlength);
				gdy = (gdy==null? graph.xunitlength:gdy*graph.yunitlength);

				st="";
				for (x = graph.origin.x; x<graph.width; x = x+gdx)
					st += " M"+x+",0"+" "+x+","+graph.height;
				for (x = graph.origin.x-gdx; x>0; x = x-gdx)
					st += " M"+x+",0"+" "+x+","+graph.height;
				for (y = graph.height-graph.origin.y; y<graph.height; y = y+gdy)
					st += " M0,"+y+" "+graph.width+","+y;
				for (y = graph.height-graph.origin.y-gdy; y>0; y = y-gdy)
					st += " M0,"+y+" "+graph.width+","+y;
				if (graph.grid) graph.grid.remove();

				graph.grid = paper.path(st).attr({stroke: graph.grid_stroke, fill: 'none', 'stroke-width': .5})
			}

			// print the axes
			st="M0,"+(graph.height-graph.origin.y)+" "+graph.width+","+ (graph.height-graph.origin.y)+" M"+graph.origin.x+",0 "+graph.origin.x+","+graph.height;
			for (x = graph.origin.x+dx; x<graph.width; x = x+dx)
				st += " M"+x+","+(graph.height-graph.origin.y+graph.ticklength)+" "+x+","+(graph.height-graph.origin.y-graph.ticklength);
			for (x = graph.origin.x-dx; x>0; x = x-dx)
				st += " M"+x+","+(graph.height-graph.origin.y+graph.ticklength)+" "+x+","+(graph.height-graph.origin.y-graph.ticklength);
			for (y = graph.height-graph.origin.y+dy; y<graph.height; y = y+dy)
				st += " M"+(graph.origin.x+graph.ticklength)+","+y+" "+(graph.origin.x-graph.ticklength)+","+y;
			for (y = graph.height-graph.origin.y-dy; y>0; y = y-dy)
				st += " M"+(graph.origin.x+graph.ticklength)+","+y+" "+(graph.origin.x-graph.ticklength)+","+y;

			var axes_lines = paper.set();
			axes_lines.push(paper.path(st).attr({stroke: graph.axis_stroke, fill: 'none', 'stroke-width': 1}))
			arrow_path = new Array(graph.origin.x, 0, (graph.origin.x-7), 10, (graph.origin.x+7), 10, graph.origin.x, 0)
			var north_arrow = paper.polygon(arrow_path).attr({fill: "#45555f", 'stroke-width': 0})
			axes_lines.push(north_arrow) // north
			axes_lines.push(north_arrow.clone().attr({rotation:180, translation: ("0, " + (graph.height - 10)) })) // south
			axes_lines.push(north_arrow.clone().attr({rotation:-90, translation: (-graph.origin.x + 4) + ", " + (graph.origin.y-5) })) // east
			axes_lines.push(north_arrow.clone().attr({rotation:90, translation: (graph.origin.x - 4) + ", " + (graph.origin.y-5)})) // west
			
			var axes_labels = paper.set();

			if (labels!=null) with (Math) {

				ldx = dx/graph.xunitlength
				ldy = dy/graph.yunitlength;
				lx = (graph.x_min>0 || graph.x_max<0?graph.x_min:0);
				ly = (graph.y_min>0 || graph.y_max<0?graph.y_min:0);
				lxp = (ly==0?"below":"above");
				lyp = (lx==0?"left":"right");
				var ddx = floor(1.1-log(ldx)/log(10))+1;
				var ddy = floor(1.1-log(ldy)/log(10))+1;
				for (x = ldx; x<=graph.x_max; x = x+ldx) {
					var point = graph.canvas_coordinate(x,ly)
					axes_labels.push(paper.rect(point.x - 5, point.y+4,10,10,5).attr({fill:'white', stroke: '', opacity: .5}));
					axes_labels.push(paper.print(point.x - 3, point.y+10,chopZ(x.toFixed(ddx)), paper.getFont("Gill Sans"), 9).attr({fill: '#666'}));
				}
				for (x = -ldx; graph.x_min<=x; x = x-ldx) {
					var point = graph.canvas_coordinate(x,ly)
					axes_labels.push(paper.rect(point.x - 5, point.y+4,10,10,5).attr({fill:'white', stroke: '', opacity: .5}));
					axes_labels.push(paper.print(point.x - 5, point.y +10,chopZ(x.toFixed(ddx)), paper.getFont("Gill Sans"), 9).attr({fill: '#666'}));
				}
				for (y = ldy; y<graph.y_max; y = y+ldy) {
					var point = graph.canvas_coordinate(lx,y)
					axes_labels.push(paper.rect(point.x - 17, point.y-6,13,10,5).attr({fill:'white', stroke: '', opacity: .5}));
					axes_labels.push(paper.print(point.x - 15, point.y,chopZ(y.toFixed(ddy)), paper.getFont("Gill Sans"), 9).attr({fill: '#666'}));
				}
				for (y = -ldy; graph.y_min<y; y = y-ldy){
					var point = graph.canvas_coordinate(lx,y)
					axes_labels.push(paper.rect(point.x - 17, point.y-6,13,10,5).attr({fill:'white', stroke: '', opacity: .5}));
					axes_labels.push(paper.print(point.x - 15, point.y,chopZ(y.toFixed(ddy)), paper.getFont("Gill Sans"), 9).attr({fill: '#666'}));
				}
			//	axes_labels
			}
			if (graph.axes_lines) graph.axes_lines.remove();
			if (graph.axes_labels) graph.axes_labels.remove();
			graph.axes_lines = axes_lines;
			graph.axes_labels = axes_labels;
		}

		graph.clear = function() { // clear the graph of nodes
			var keys = graph.elements.keys()
			for(var i = keys.length; i--;) {
				graph.elements[keys[i]].remove()
			}
			graph.element_count = 0
			graph.elements = {}
		}

		graph.register = function(node, id) {  // add this object to the elements hash
			if (id == 'axis labels') return
			graph.element_count += 1
			var name = typeof(id) != 'undefined' ? id : false;
			if (name) {
				graph.elements[name] = node;
			} else {
				graph.elements['untitled_'+graph.element_count] = node
			}
		}

		graph.display = function(src) {
			graph.clear()
			eval(src)
		}

		graph.line = function (p, q, id) { // segment connecting points p,q (coordinates in units)
			var path = null;

			st = "M"+(p[0]*graph.xunitlength+graph.origin.x)+","+ (graph.height-p[1]*graph.yunitlength-graph.origin.y)+" "+(q[0]*graph.xunitlength+graph.origin.y)+","+(graph.height-q[1]*graph.yunitlength-graph.origin.y);

			if (typeof(graph.elements[name]) != 'undefined') {
				path = graph.elements[name].attr({path: st})
			} else {
				path = paper.path(st).attr(graph.attrs);
			}

			var set = paper.set();
			set.push(path);

			if (graph.marker == 'dot' || graph.marker == 'arrowdot') {
				set.push(graph.ASdot(p));
				if (graph.marker=="arrowdot") set.push(graph.arrowhead(p,q));
				set.push(graph.ASdot(q));
			} else if (graph.marker == 'arrow') {
				set.push(graph.arrowhead(p,q));
			}

			graph.register(path, id)

		}
		graph.dot = function(center, typ, label, pos, id) {
			var path;
			st = 'M0 0'
			var cx = center[0]*graph.xunitlength+graph.origin.x;
			var cy = graph.height-center[1]*graph.yunitlength-graph.origin.y;

			var set = paper.set();

			if (typeof(graph.elements[name]) != 'undefined') {
				path = graph.elements[name]
			} else {
				path = paper.path(st)
			}


			if (typ=="+" || typ=="-" || typ=="|") {
				if (typ=="+") {
					st = "d", " M "+(cx-graph.ticklength)+" "+cy+" L "+(cx+ticklength)+" "+cy+" M "+cx+" "+(cy-ticklength)+" L "+cx+" "+(cy+ticklength);
					path.attr({path: st, 'stroke-width': .5, stroke: graph.axis_stroke })
				} else {
					if (typ=="-") st = " M "+(cx-ticklength)+" "+cy+" L "+(cx+ticklength)+" "+cy;
					else st = " M "+cx+" "+(cy-ticklength)+" L "+cx+" "+(cy+ticklength);
					path.attr({path: st, 'stroke-width': graph.attrs['stroke-width'], stroke: graph.attrs.stroke })
				}
			} else {
				path = paper.circle(cx, cy, graph.dot_attrs.r).attr({'stroke-width': graph.attrs['stroke-width'], stroke: graph.attrs.stroke, fill: (typ=="open"?"white":graph.attrs)})
			}
			set.push(path);
			if (label!=null)
				set.push(graph.text(center,label,(pos==null?"below":pos),(id==null?id:id+"label")));

			graph.register(set, id)

		}
		graph.text = function (p,st,pos,id,fontsty) {
			var path = null;
			var textanchor = "middle";
			var font_size = graph.font_attrs['font-size']
			var dx = 0; var dy = graph.fontsize/3;

			if (pos!=null) {
				if (pos.slice(0,5)=="above") dy = -font_size/1.2;
				if (pos.slice(0,5)=="below") dy = font_size/1.2;
				if (pos.slice(0,5)=="right" || pos.slice(5,10)=="right") {
					textanchor = "start";
					dx = font_size/2;
				}
				if (pos.slice(0,4)=="left" || pos.slice(5,9)=="left") {
					textanchor = "end";
					dx = -font_size/2;
				}
			}

			var x = p[0]*graph.xunitlength+graph.origin.x+dx;
			var y = graph.height-p[1]*graph.yunitlength-graph.origin.y+dy;

			if (typeof(graph.elements[name]) != 'undefined') {
				path = graph.elements[name].attr({text: st})
			} else {
				path = paper.text(x, y, st)
			}
			if (typeof(fontsty) == 'object')
				path.attr(graph.font_attrs).attr(fontsty)
			else
				path.attr(graph.font_attrs).attr({"font-style": (fontsty!=null?fontsty:graph.font_attrs['font-style']), 'font-size': font_size})

			graph.register(path, id)
			return path;

		}
		graph.arrowhead =  function (p,q) { // draw arrowhead at q (in units)
			var up;
			var v = [p[0]*graph.xunitlength+graph.origin.x,graph.height-p[1]*graph.yunitlength-graph.origin.y];
			var w = [q[0]*graph.xunitlength+graph.origin.x,graph.height-q[1]*graph.yunitlength-graph.origin.y];
			var u = [w[0]-v[0],w[1]-v[1]];
			var d = Math.sqrt(u[0]*u[0]+u[1]*u[1]);
			var arrow = null
			if (d > 0.00000001) {
				u = [u[0]/d, u[1]/d];
				up = [-u[1],u[0]];
				var st = "M "+(w[0]-15*u[0]-4*up[0])+" "+
					(w[1]-15*u[1]-4*up[1])+" L "+(w[0]-3*u[0])+" "+(w[1]-3*u[1])+" L "+
					(w[0]-15*u[0]+4*up[0])+" "+(w[1]-15*u[1]+4*up[1])+" z";
				arrow = paper.path(st).attr({"stroke-width": graph.marker_attrs['stroke-width'], stroke: graph.marker_attrs.stroke, fill: graph.marker_attrs.stroke})
			}
			graph.register(arrow)
			return arrow
		}
		graph.ASdot = function (center,radius,s,f) { // coordinates in units, radius in pixel
			if (s==null) s = graph.marker_attrs.stroke; 
			if (f==null) f = graph.marker_attrs.fill;
			if (radius==null) radius = graph.marker_attrs.r;
			var cx = center[0]*graph.xunitlength+graph.origin.x
			var cy = graph.height-center[1]*graph.yunitlength-graph.origin.y
			var circle = paper.circle(cx, cy, radius).attr({stroke:s, fill:f})
			graph.register(circle)
			return circle;
		}
		graph.plot = function plot(fun,x_min,x_max,points,id) {
			var pth = [];
			var f = function(x) { return x }, g = fun;
			var name = null;
			if (typeof fun=="string") {
				eval("g = function(x){ with(Math) return "+mathjs(fun)+" }");
			} else if (typeof fun=="object") {
				eval("f = function(t){ with(Math) return "+mathjs(fun[0])+" }");
				eval("g = function(t){ with(Math) return "+mathjs(fun[1])+" }");
			}
			if (typeof x_min=="string") { name = x_min; x_min = graph.x_min }
			else name = id;


			var min = (x_min==null?graph.x_min:x_min);
			var max = (x_max==null?graph.x_max:x_max);
			var inc = max-min-0.000001*(max-min);
			inc = (points==null?inc/200:inc/points);
			var gt;
			for (var t = min; t <= max; t += inc) {
				gt = g(t);
				if (!(isNaN(gt)||Math.abs(gt)=="Infinity")) pth[pth.length] = [f(t), gt];
			}
			p = graph.path(pth, name);
			graph.register(p, id)
			return p;
		}

		graph.path = function(plist,id,c) {
			if (c==null) c="";
			var st, i, path;


			// set or build out the string
			if (typeof plist == "string") st = plist;
			else {
				st = "M";
				st += (plist[0][0]*graph.xunitlength+graph.origin.x)+", "+ (graph.height-plist[0][1]*graph.yunitlength-graph.origin.y)+" "+c;
				for (i=1; i<plist.length; i++)
					st += (plist[i][0]*graph.xunitlength+graph.origin.x)+","+ (graph.height-plist[i][1]*graph.yunitlength-graph.origin.y)+" ";
			}

			if (typeof(graph.elements[name]) != 'undefined')
				graph.elements[name].remove()

			path = paper.path(st).attr(graph.attrs)

			var set = paper.set();
			set.push(path);

			if (graph.marker == 'dot' || graph.marker == 'arrowdot') {

				for (i=0; i<plist.length; i++)
				if (c!="C" && c!="T" || i!=1 && i!=2) {
					set.push(graph.ASdot(plist[i]));
					if (graph.marker == 'arrowdot')
						set.push(graph.arrowhead(plist[i]));
				}
			}
			graph.register(set, id)		
			return set;
		}
		graph.arc = function(start,end,radius,id) { // coordinates in units
			var path = null;

			if (radius==null) {
				v=[end[0]-start[0],end[1]-start[1]];
				radius = Math.sqrt(v[0]*v[0]+v[1]*v[1]);
			}

			var st = "M"+(start[0]*graph.xunitlength+graph.origin.x)+","+
				(graph.height-start[1]*graph.yunitlength-graph.origin.y)+" A"+radius*graph.xunitlength+","+
				radius*graph.yunitlength+" 0 0,0 "+(end[0]*graph.xunitlength+graph.origin.y)+","+
				(graph.height-end[1]*graph.yunitlength-graph.origin.y);

			if (typeof(graph.elements[name]) != 'undefined') {
				path = graph.elements[name].attr({path: st})
			} else {
				path = paper.path(st).attr(graph.attrs);
			}

			var set = paper.set();
			set.push(path);

			if (graph.marker=="arrow" || graph.marker=="arrowdot") {
				u = [(end[1]-start[1])/4,(start[0]-end[0])/4];
				v = [(end[0]-start[0])/2,(end[1]-start[1])/2];
				v = [start[0]+v[0]+u[0],start[1]+v[1]+u[1]];
			} else {
				v=[start[0],start[1]];
			}

			if (graph.marker=="dot" || graph.marker=="arrowdot") {
				set.push(graph.ASdot(start));
				if (marker=="arrowdot") {
					set.push(graph.arrowhead(v,end));	
				} 
				set.push(graph.ASdot(end));
			} else if (graph.marker=="arrow") set.push(graph.arrowhead(v,end));

			graph.register(set, id)
			return set;
		}
		graph.ellipse = function(center,rx,ry,id) { // coordinates in units
			var name = typeof(id) != 'undefined' ? id : false;
			var path = null;

			var cx = center[0]*graph.xunitlength+graph.origin.x;
			var cy = graph.height-center[1]*graph.yunitlength-graph.origin.y;
			var rx = rx*graph.xunitlength;
			var ry = ry*graph.yunitlength;

			if (typeof(graph.elements[name]) != 'undefined') {
				path = graph.elements[name].attr({cx: cx, cy: cy, rx: rx, ry: ry}).attr(graph.attrs);
			} else {
				path = paper.ellipse(cx, cy, rx, ry).attr(graph.attrs);
			}

			graph.register(path, id)
			return path;
		}
		graph.curve = function (plist,id) {
			return graph.path(plist,id,"T");
		}

		graph.rect = function(p,q,id,rx,ry) { // FIXME: something may be off here// opposite corners in units, rounded by radii
			var path = null;

			var x = p[0]*graph.xunitlength+graph.origin.x;
			var y = graph.height-q[1]*graph.yunitlength-graph.origin.y;
			var width = Math.abs((q[0]-p[0])*graph.xunitlength);
			var height = Math.abs((q[1]-p[1])*graph.yunitlength);
			if (rx!=null) rx = rx*graph.xunitlength;
			if (ry!=null) ry = ry*graph.yunitlength;

			if (typeof(graph.elements[name]) != 'undefined') {
				path = graph.elements[name].attr({x: x, y: y, width: width, height: height, rx: rx, ry: ry}).attr(graph.attrs);
			} else {
				path = paper.rect(x, y, width, height).attr(graph.attrs).attr({rx: rx, ry: ry});
			}
			
			graph.register(path, id)
			return path;
		}

		graph.circle = function(center,radius,id) { // coordinates in units
			var path
			var cx = center[0]*graph.xunitlength+graph.origin.x;
			var cy = graph.height-center[1]*graph.yunitlength-graph.origin.y;
			var r = radius*graph.xunitlength;

			if (typeof(graph.elements[name]) != 'undefined') {
				path = graph.elements[name].attr({cx: cx, cy: cy, r: r}).attr(graph.attrs)
			} else {
				path = paper.circle(cx, cy, r).attr(graph.attrs)
			}
			if (name != '') {
				graph.elements[name] = set;
			}
			graph.register(path, id)
			return path;

		}

		graph.loop = function(p,d,id) {
			var set = paper.set();
			// d is a direction vector e.g. [1,0] means loop starts in that direction
			if (d==null) d=[1,0];
			set.push(path([p,[p[0]+d[0],p[1]+d[1]],[p[0]-d[1],p[1]+d[0]],p],null,"C"));

			if (graph.marker=="arrow" || marker=="arrowdot") 
				set.push(graph.arrowhead([p[0]+Math.cos(1.4)*d[0]-Math.sin(1.4)*d[1],p[1]+Math.sin(1.4)*d[0]+Math.cos(1.4)*d[1]],p));

			graph.register(set, id)
			return set
		}
	
		graph.init = function () {
			attrs = typeof(attrs) != 'undefined' ? attrs : {};
			attrs.draw_grid = typeof(attrs.draw_grid) != 'undefined' ? attrs.draw_grid : true;
			attrs.draw_axis = typeof(attrs.draw_axis) != 'undefined' ? attrs.draw_axis : false;
			attrs.labels    = typeof(attrs.labels)    != 'undefined' ? attrs.labels    : false;

			graph.x_min    = typeof(attrs['x_min'])    != 'undefined' ? attrs.x_min    : -((graph.width/2) / graph.interval);
			graph.x_max    = typeof(attrs['x_max'])    != 'undefined' ? attrs.x_max    : (graph.width/2)/graph.interval;
			graph.y_min    = typeof(attrs['y_min'])    != 'undefined' ? attrs.y_min    : null;
			graph.y_max    = typeof(attrs['y_max'])    != 'undefined' ? attrs.y_max    : null;

			graph.xunitlength = graph.width/(graph.x_max-graph.x_min);
			graph.yunitlength = graph.xunitlength;
			if (graph.y_min==null || graph.y_min == 0) {
				graph.origin = {x: -graph.x_min*graph.xunitlength, y: graph.height/2 }
				graph.y_min = -graph.height/(2*graph.yunitlength)
				graph.y_max = -graph.y_min
			} else {
				if (graph.y_max!=null && graph.y_min != 0) graph.yunitlength = (graph.height)/(graph.y_max-graph.y_min);
				else graph.y_max = graph.height/graph.yunitlength + graph.y_min;
				graph.origin = {x: -graph.x_min*graph.xunitlength, y: -graph.y_min*graph.yunitlength};
			}		
			graph.dx = attrs.dx==null ? 1 : attrs.dx*graph.xunitlength;
			graph.dy = attrs.dy==null ? graph.dx : attrs.dy*graph.yunitlength;
			graph.fontsize = Math.min(graph.dx/2,graph.dy/2,16);//alert(fontsize)
			graph.ticklength = graph.fontsize/4;
			
			if (attrs.draw_axis || attrs.labels || attrs.draw_grid)
				graph.axes(graph.dx, graph.dy, attrs.labels, attrs.draw_grid);
			if (!attrs.draw_axes)
				if (graph.axes_line) graph.axes_lines.hide();

			if (!graph.initialized) {
				graph.quadrant_1_label = paper.text(graph.x_offset + graph.x_offset/2, graph.y_offset/2, "Quadrant 1").attr({'font-size':26, fill: '#000', width: graph.x_offset, "text-anchor": 'middle', opacity : 1}).toFront().hide();
				graph.quadrant_1 = paper.rect(graph.x_offset, 0, graph.x_offset, graph.y_offset).attr({ fill: Raphael.getColor(1), opacity: .4}).toBack().hide();
				graph.quadrant_2 = paper.rect(0,0, graph.x_offset, graph.y_offset).attr({ fill: Raphael.getColor(), opacity: .4}).toBack().hide();
				graph.quadrant_3 = paper.rect(0,graph.y_offset, graph.x_offset, graph.y_offset).attr({ fill: Raphael.getColor(), opacity: .4}).toBack().hide();
				graph.quadrant_4 = paper.rect(graph.x_offset, graph.y_offset, graph.x_offset, graph.y_offset).attr({ fill: Raphael.getColor(), opacity: .4}).toBack().hide();
			}
			graph.initialized = true;
		}
		graph.init();
		return graph;
	};
})();
