/**
 * @author nk-nishizawa
 */

"use strict";

function RbodySystem() {
	var nx = 16, ny = 4, nz = 16;
	var dt     = 1 / 200;
	var radius = 1 / Math.max(nx + 1, nz + 1) * 2.0;
	var mass   = 1;
	var Ke     = 0.0;
	var Kd     = 0.5 * (1 / dt);
	var ga     = [0, -9.8, 0];
	var x0     = [-3, 0, -3];
	var x1     = [ 3, 6,  3];
	
	this.initialize(
		nx, ny, nz,
		dt,
		radius, 
		mass,
		Ke, Kd,
		ga,
		x0, x1
	);
}

RbodySystem.prototype.initialize = function (
	nx, ny, nz,
	dt,
	radius, 
	mass,
	Ke, Kd,
	ga,
	x0, x1
) {
	this.dt     = dt;
	this.ga     = V3.scale(ga, 1.0);
    this.Ke     = Ke;
    this.Kd     = Kd;
	
	this.body  = new Particle(radius, mass, nx * ny * nz);
	initParticle(this.body, nx, ny, nz, radius, x0, x1);
	
	this.bound = new Face(mass, 6);
	initFace(this.bound, x0, x1);
	
	this.ugrid = new UniformGrid(x0, x1, 16, 16, 16);

    //////////////
    // Particle //
    //////////////
    function Particle (radius, mass, num) {
        this.radius = radius;
        this.mass   = mass;
        this.length = num;
        
        this.x = new Array(num);
        this.v = new Array(num);
        this.impuls = new Array(num);
    	for (var i=0; i < num; ++i) {
    		this.x[i] = V3.O();
    		this.v[i] = V3.O();
    		this.impuls[i] = V3.O();
    	}
    }
    Particle.prototype.toGLM4x4 = function (i, dst) {
        var xi = this.x[i];
    	var m00 = 1; var m01 = 0; var m02 = 0; var m03 = xi[0];
    	var m10 = 0; var m11 = 1; var m12 = 0; var m13 = xi[1];
    	var m20 = 0; var m21 = 0; var m22 = 1; var m23 = xi[2];
    	var m30 = 0; var m31 = 0; var m32 = 0; var m33 =     1;
    	if ( ! dst ) dst = [];
    	// column 0
    	dst[ 0] = m00;
    	dst[ 1] = m10;
    	dst[ 2] = m20;
    	dst[ 3] = m30;
    	// column 1
    	dst[ 4] = m01;
    	dst[ 5] = m11;
    	dst[ 6] = m21;
    	dst[ 7] = m31;
    	// column 2
    	dst[ 8] = m02;
    	dst[ 9] = m12;
    	dst[10] = m22;
    	dst[11] = m32;
    	// column 3
    	dst[12] = m03;
    	dst[13] = m13;
    	dst[14] = m23;
    	dst[15] = m33;
    	return dst;
    };
    function initParticle(particle, nx, ny, nz, r, x0, x1) {
    	var vary = 0.05;
    	var diameter = r + r;
    	var distance = diameter * (1 + vary);
    	var cx = x0[0] + (x1[0] - x0[0]) * 0.5;
    	var cy = x0[1] + (x1[1] - x0[1]) * 0.5;
    	var cz = x0[2] + (x1[2] - x0[2]) * 0.5;
    	var ox = cx - distance * (nx - 1) * 0.5;
    	var oy = cy - distance * (ny - 1) * 0.5;
    	var oz = cz - distance * (nz - 1) * 0.5;
    	var ii = 0;
    	for (var k=0, z=oz; k < nz; ++k, z+=distance) {
    		for (var j=0, y=oy; j < ny; ++j, y+=distance) {
    			for (var i=0, x=ox; i < nx; ++i, x+=distance) {
    				var noise = (Math.random() - 0.5) * vary * diameter;
    				particle.x[ii][0] = x + noise;
    				particle.x[ii][1] = y + noise;
    				particle.x[ii][2] = z + noise;
    				++ii;
    			}
    		} 
    	}
    }
    //////////
    // Face //
    //////////
    function Face (mass, num){
        this.mass   = mass;
        this.length = num;
        
        this.x = new Array(num);
        this.n = new Array(num);
    	for (var i=0; i < num; ++i) {
    		this.x[i] = V3.O();
    		this.n[i] = V3.O();
    	}
    }
    function initFace (face, x0, x1) {
    	var cx = x0[0] + (x1[0] - x0[0]) * 0.5;
        var cy = x0[1] + (x1[1] - x0[1]) * 0.5;
    	var cz = x0[2] + (x1[2] - x0[2]) * 0.5;
    	for (var i=0; i < face.length; ++i) {
    		(function (x, n, i, x0, x1, cx, cy, cz) {
    			switch (i) {
    				case 0: // -x
    					x[0] = x0[0]; x[1] =    cy; x[2] =    cz;
    					n[0] =     1; n[1] =     0; n[2] =     0;
    					break;
    				case 1: // +x
    					x[0] = x1[0]; x[1] =    cy; x[2] =    cz;
    					n[0] =    -1; n[1] =     0; n[2] =     0;
    					break;
    				case 2: // -y
    					x[0] =    cx; x[1] = x0[1]; x[2] =    cz;
    					n[0] =     0; n[1] =     1; n[2] =     0;
    					break;
    				case 3: // +y
    					x[0] =    cx; x[1] = x1[1]; x[2] =    cz;
    					n[0] =     0; n[1] =    -1; n[2] =     0;
    					break;
    				case 4: // -z
    					x[0] =    cx; x[1] =    cy; x[2] = x0[2];
    					n[0] =     0; n[1] =     0; n[2] =     1;
    					break;
    				case 5: // +z
    					x[0] =    cx; x[1] =    cy; x[2] = x1[2];
    					n[0] =     0; n[1] =     0; n[2] =    -1;
    					break;
    				default:
    					break;
    			}
    		} (face.x[i], face.n[i], i, x0, x1, cx, cy, cz));
    	} // end of for i
    }
    /////////////////
    // uniformGrid //
    /////////////////
    function UniformGrid(x0, x1, nx, ny, nz) {
        this.x0 = V3.create(x0[0], x0[1], x0[2]);
        this.x1 = V3.create(x1[0], x1[1], x1[2]);
        
        this.nx = nx;
        this.ny = ny;
        this.nz = nz;
        
        this.dx = (x1[0] - x0[0]) / nx;
        this.dy = (x1[1] - x0[1]) / ny;
        this.dz = (x1[2] - x0[2]) / nz;
        
        var numCell = nx * ny * nz;
        this.cell = new Array(numCell);
        for (var i=0; i < numCell; ++i) {
            this.cell[i] = [];
        }
        
    }

    UniformGrid.prototype.getNeighborBody = function (center, radius) {
        var lower = [0, 0, 0];
        var upper = [0, 0, 0];
        this.getCellRange(center, radius, lower, upper);
        
        var nxy = this.nx * this.ny;
        var nx  = this.nx;
        var obj = {};
        var neighbor = [];
	    for (var z=lower[2]; z <= upper[2]; ++z) {
	    for (var y=lower[1]; y <= upper[1]; ++y) {
	    for (var x=lower[0]; x <= upper[0]; ++x) {
    	    var ic = nxy * z + nx * y + x;
    	    var ci = this.cell[ic];
    	    //[].push.apply(neighbor, this.cell[ic]);
	        for (var i=0; i < ci.length; ++i) {
                var v = ci[i];
                //if ( ! ( v in obj ) ) {
                if ( ! obj.hasOwnProperty(v) ) {
                    obj[v] = true;
                    neighbor.push(v);
                }
            }
	    } } }
	    //return unique(neighbor);
	    return neighbor;
	    
    	////////////////////
    	// local function //
    	////////////////////
        function unique(ary) {
            var obj = {};
            var uary = [];
            for (var i=0; i<ary.length; ++i) {
                var v = ary[i];
                if ( ! ( v in obj ) ) {
                    obj[v] = true;
                    uary.push(v);
                }
            }
            return uary;
        }
    };
    UniformGrid.prototype.getCellRange = function (center, radius, lower, upper) {
	    var cx = center[0] - this.x0[0];
	    var cy = center[1] - this.x0[1];
	    var cz = center[2] - this.x0[2];
	    
	    //radius = radius * 1.1;
	    var lx = (cx - radius) / this.dx;
	    var ly = (cy - radius) / this.dy;
	    var lz = (cz - radius) / this.dz;
	    
	    var ux = (cx + radius) / this.dx;
	    var uy = (cy + radius) / this.dy;
	    var uz = (cz + radius) / this.dz;
	    
	    lx = Math.floor(lx);
	    ly = Math.floor(ly);
	    lz = Math.floor(lz);
	    
	    ux = Math.floor(ux);
	    uy = Math.floor(uy);
	    uz = Math.floor(uz);
	    
	    lower[0] = clamp(lx, 0, this.nx-1);
	    lower[1] = clamp(ly, 0, this.ny-1);
	    lower[2] = clamp(lz, 0, this.nz-1);
	    
	    upper[0] = clamp(ux, 0, this.nx-1);
	    upper[1] = clamp(uy, 0, this.ny-1);
	    upper[2] = clamp(uz, 0, this.nz-1);
	    
    	////////////////////
    	// local function //
    	////////////////////
        function clamp(x, minVal, maxVal) {
            return x < minVal ? minVal : x > maxVal ? maxVal : x;
        }
    };
    UniformGrid.prototype.update = function (body) {
        var numBody = body.length;
        var radius  = body.radius;
        
	    var nxy = this.nx * this.ny;
	    var nx  = this.nx;
	    
        clear(this.cell);
        
        var lower = [0, 0, 0];
        var upper = [0, 0, 0];
        for (var i=0; i < numBody; ++i) {
            var xi = body.x[i];
    	    this.getCellRange(xi, radius, lower, upper);
    	    for (var z=lower[2]; z <= upper[2]; ++z) {
    	    for (var y=lower[1]; y <= upper[1]; ++y) {
    	    for (var x=lower[0]; x <= upper[0]; ++x) {
        	    var ic = nxy * z + nx * y + x;
        	    this.cell[ic].push(i);
    	    } } }
    	}
    	
    	////////////////////
    	// local function //
    	////////////////////
	    function clear(cell) {
            var numCell = cell.length;
            for (var i=0; i < numCell; ++i) {
                cell[i].length = 0;
            }
        }
    };
};

RbodySystem.prototype.applyImpuls = function() {
    var dt     = this.dt;
	var Ke     = this.Ke;
	var Kd     = this.Kd;
    var body   = this.body;
    var bound  = this.bound;
    var ugrid  = this.ugrid;
    
    var radius   = body.radius;
	var mass0    = body.mass;
	var mass1    = bound.mass;
	var numBody  = body.length;
	var numBound = bound.length;
	
    var diameter = radius + radius;
	var m00      = (mass0 * mass0) / (mass0 + mass0);
	var m01      = (mass0 * mass1) / (mass0 + mass1);
	var rd       = 1 / diameter;
	var rm0      = 1 / mass0;
	
	var maxOverlapRate = 0;
	for (var i=0; i < numBody; ++i) {
		var xi = body.x[i];
		var vi = body.v[i];
		var ji = body.impuls[i];
		
		ji[0] = 0; ji[1] = 0; ji[2] = 0;
		// vs perticle collision
		//for (var j=0; j < numBody; ++j) {
		var neighbor    = ugrid.getNeighborBody(xi, radius);
		var numNeighbor = neighbor.length;
		for (var jn=0; jn < numNeighbor; ++jn) {
		    var j = neighbor[jn];
		    
			if (i == j) continue;
			var xj = body.x[j];
			var vj = body.v[j];

			var dx = xj[0] - xi[0]; 
			var dy = xj[1] - xi[1]; 
			var dz = xj[2] - xi[2];
			var ld = Math.sqrt(dx * dx + dy * dy + dz * dz);
			var overlap = diameter - ld;
			if (overlap < 0) continue;

			var rld = 1 / ld;
			var n = [rld * dx, rld * dy, rld * dz];
			var v = [vj[0] - vi[0], vj[1] - vi[1], vj[2] - vi[2]];
			updateImpuls(m00, overlap, n, v, Ke, Kd, ji);
			
			var or = overlap * rd;
			maxOverlapRate = or > maxOverlapRate ? or : maxOverlapRate;
		}
		// vs boundary collision
		for (var j=0; j < numBound; ++j) {
			var xj = bound.x[j];
			var nj = bound.n[j];

			var dx = xj[0] - xi[0];
			var dy = xj[1] - xi[1];
			var dz = xj[2] - xi[2];

			var nx = - nj[0];
			var ny = - nj[1];
			var nz = - nj[2];

			var ld = dx * nx + dy * ny + dz * nz;
			var overlap = radius - ld;
			if (overlap < 0) continue;
			
			var n = [nx, ny, nz];
			var v = [0 - vi[0], 0 - vi[1], 0 - vi[2]];
			updateImpuls(m01, overlap, n, v, Ke, Kd, ji);
			
			var or = overlap * rd;
			maxOverlapRate = or > maxOverlapRate ? or : maxOverlapRate;
		}
	}
	
	// update position & linear velocity from impuls
	for (var i=0; i < numBody; ++i) {
		var xi = body.x[i];
		var vi = body.v[i];
		var ji = body.impuls[i];
    		
	    vi[0] = vi[0] + ji[0] * rm0;
	    vi[1] = vi[1] + ji[1] * rm0;
	    vi[2] = vi[2] + ji[2] * rm0;
    	    
	    xi[0] = xi[0] + vi[0] * dt;
	    xi[1] = xi[1] + vi[1] * dt;
	    xi[2] = xi[2] + vi[2] * dt;
	}
	
	return maxOverlapRate;
        
	////////////////////
	// local function //
	////////////////////
	function updateImpuls(m, overlap, n, v, Ke, Kd, ji) {
		var lvn = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
		var c = m * ((1+Ke) * lvn - Kd * overlap);
		// update momentum
		ji[0] = ji[0] + c * n[0];
		ji[1] = ji[1] + c * n[1];
		ji[2] = ji[2] + c * n[2];
	}
};

RbodySystem.prototype.applyForce = function () {
    var dt   = this.dt;
	var ga   = this.ga;
    var body = this.body;
    
	var numBody = body.length;
	// update position & linear velocity from external forces
	for (var i=0; i < numBody; ++i) {
		var xi = body.x[i];
		var vi = body.v[i];
		
		// update linear velocity
		vi[0] = vi[0] + ga[0] * dt;
		vi[1] = vi[1] + ga[1] * dt;
		vi[2] = vi[2] + ga[2] * dt;

		// update position
		xi[0] = xi[0] + vi[0] * dt;
		xi[1] = xi[1] + vi[1] * dt;
		xi[2] = xi[2] + vi[2] * dt;
	}
};

RbodySystem.prototype.update = function() {
    
    this.applyForce();
    
    this.ugrid.update(this.body);
    
    var or = this.applyImpuls();
    
	return or;
};


/* 
 * 
 * Vector 3
 * 
 */
var V3 = {};
V3.create = function (x, y, z) {
	return [x, y, z];
};
V3.set = function (x, y, z, dst) {
	if (! dst) dst = [];
	dst[0] = x;
	dst[1] = y;
	dst[2] = z;
	return dst;
};
V3.O = function (dst) {
	if (! dst) dst = [];
	dst[0] = 0;
	dst[1] = 0;
	dst[2] = 0;
	return dst;
};
V3.add = function (v0, v1, dst) {
	var x = v0[0] + v1[0];
	var y = v0[1] + v1[1];
	var z = v0[2] + v1[2];
	if (! dst) dst = [];
	dst[0] = x;
	dst[1] = y;
	dst[2] = z;
	return dst;
};
V3.sub = function (v0, v1, dst) {
	var x = v0[0] - v1[0];
	var y = v0[1] - v1[1];
	var z = v0[2] - v1[2];
	if (! dst) dst = [];
	dst[0] = x;
	dst[1] = y;
	dst[2] = z;
	return dst;
};
V3.scale = function (v, s, dst) {
	var x = s * v[0];
	var y = s * v[1];
	var z = s * v[2];
	if (! dst) dst = [];
	dst[0] = x;
	dst[1] = y;
	dst[2] = z;
	return dst;
};
V3.negate = function (v, dst) {
	var x = - v[0];
	var y = - v[1];
	var z = - v[2];
	if (! dst) dst = [];
	dst[0] = x;
	dst[1] = y;
	dst[2] = z;
	return dst;
};
V3.normalize = function (v, dst) {
	var x = v[0];
	var y = v[1];
	var z = v[2];
	var rl = 1.0 / Math.sqrt(x*x + y*y + z*z);
	if (! dst) dst = [];
	dst[0] = rl * x;
	dst[1] = rl * y;
	dst[2] = rl * z;
	return dst;
};
V3.cross = function (v0, v1, dst) {
	var x = v0[1]*v1[2] - v0[2]*v1[1];
	var y = v0[2]*v1[0] - v0[0]*v1[2];
	var z = v0[0]*v1[1] - v0[1]*v1[0];	
	if (! dst) dst = [];
	dst[0] = x;
	dst[1] = y;
	dst[2] = z;
	return dst;
};
V3.length = function (v) {
	return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]); 
};
V3.length2 = function (v) {
	return v[0]*v[0] + v[1]*v[1] + v[2]*v[2]; 
};
V3.dot = function (v0, v1) {
	return v0[0]*v1[0] + v0[1]*v1[1] + v0[2]*v1[2]; 
};

/* 
 * 
 * Matrix 3x3
 * 
 */
var M3x3 = {};
M3x3.create = function (m00, m01, m02, m10, m11, m12, m20, m21, m22) {
	return [m00, m01, m02, m10, m11, m12, m20, m21, m22];
};
M3x3.set = function (m00, m01, m02, m10, m11, m12, m20, m21, m22, dst) {
	if (! dst) dst = [];
	dst[0] = m00; dst[1] = m01; dst[2] = m02;
	dst[3] = m10; dst[4] = m11; dst[5] = m12;
	dst[6] = m20; dst[7] = m21; dst[8] = m22;
	return dst;
};
M3x3.I = function (dst) {
	if (! dst) dst = [];
	dst[0] = 1; dst[1] = 0; dst[2] = 0;
	dst[3] = 0; dst[4] = 1; dst[5] = 0;
	dst[6] = 0; dst[7] = 0; dst[8] = 1;
	return dst;
};
M3x3.O = function (dst) {
	if (! dst) dst = [];
	dst[0] = 0; dst[1] = 0; dst[2] = 0;
	dst[3] = 0; dst[4] = 0; dst[5] = 0;
	dst[6] = 0; dst[7] = 0; dst[8] = 0;
	return dst;
};
M3x3.MM = function (m0, m1, dst) {
	//row 0
	var m00 = m0[0]*m1[0] + m0[1]*m1[3] + m0[2]*m1[6];
	var m01 = m0[0]*m1[1] + m0[1]*m1[4] + m0[2]*m1[7];
	var m02 = m0[0]*m1[2] + m0[1]*m1[5] + m0[2]*m1[8];
	//row 1
	var m10 = m0[3]*m1[0] + m0[4]*m1[3] + m0[5]*m1[6];
	var m11 = m0[3]*m1[1] + m0[4]*m1[4] + m0[5]*m1[7];
	var m12 = m0[3]*m1[2] + m0[4]*m1[5] + m0[5]*m1[8];
	//row 2
	var m20 = m0[6]*m1[0] + m0[7]*m1[3] + m0[8]*m1[6];
	var m21 = m0[6]*m1[1] + m0[7]*m1[4] + m0[8]*m1[7];
	var m22 = m0[6]*m1[2] + m0[7]*m1[5] + m0[8]*m1[8];
	if (! dst) dst = [];
	dst[0] = m00; dst[1] = m01; dst[2] = m02;
	dst[3] = m10; dst[4] = m11; dst[5] = m12;
	dst[6] = m20; dst[7] = m21; dst[8] = m22;
	return dst;
};
M3x3.MV = function (m, v, dst) {
	var x = m[0]*v[0] + m[1]*v[1] + m[2]*v[2];
	var y = m[3]*v[0] + m[4]*v[1] + m[5]*v[2];
	var z = m[6]*v[0] + m[7]*v[1] + m[8]*v[2];
	if (! dst) dst = [];
	dst[0] = x;
	dst[1] = y;
	dst[2] = z;
	return dst;
};
M3x3.transpose = function (m, dst) {
	//row 0
	var m00 = m[0];
	var m01 = m[3];
	var m02 = m[6];
	//row 1
	var m10 = m[1];
	var m11 = m[4];
	var m12 = m[7];
	//row 2
	var m20 = m[2];
	var m21 = m[5];
	var m22 = m[8];
	if (! dst) dst = [];
	dst[0] = m00; dst[1] = m01; dst[2] = m02;
	dst[3] = m10; dst[4] = m11; dst[5] = m12;
	dst[6] = m20; dst[7] = m21; dst[8] = m22;
	return dst;
};

/* 
 * 
 * Quotanion 
 * 
 */
var Q4 = {};
Q4.O = function (dst) {
	if (! dst) dst = [];
	dst[0] = 0;
	dst[1] = 0;
	dst[2] = 0;
	dst[3] = 0;
	return dst;
};
Q4.create = function (w, x, y, z) {
	var dst = [];
	dst[0] = w;
	dst[1] = x;
	dst[2] = y;
	dst[3] = z;
	return dst;
};
Q4.add = function (q0, q1, dst) {
	var w = q0[0] + q1[0];
	var x = q0[1] + q1[1];
	var y = q0[2] + q1[2];
	var z = q0[3] + q1[3];
	if (! dst) dst = [];
	dst[0] = w;
	dst[1] = x;
	dst[2] = y;
	dst[3] = z;
	return dst;
};
Q4.set = function (w, x, y, z, dst) {
	if (! dst) dst = [];
	dst[0] = w;
	dst[1] = x;
	dst[2] = y;
	dst[3] = z;
	return dst;
};
Q4.make = function (axisX, axisY, axisZ, angle, dst) {
	var hA = 0.5 * angle; 
	var c = Math.cos(hA);
	var s = Math.sin(hA);
	var w = c;
	var x = s * axisX;
	var y = s * axisY;
	var z = s * axisZ;
	if (! dst) dst = [];
	dst[0] = w;
	dst[1] = x;
	dst[2] = y;
	dst[3] = z;
	return dst;
};
Q4.scale = function (q, s, dst) {
	var w = s * q[0];
	var x = s * q[1];
	var y = s * q[2];
	var z = s * q[3];
	if (! dst) dst = [];
	dst[0] = w;
	dst[1] = x;
	dst[2] = y;
	dst[3] = z;
	return dst;
};
Q4.mul = function (q0, q1, dst) {
	var w = q0[0] * q1[0] - q0[1] * q1[1] - q0[2] * q1[2] - q0[3] * q1[3];
	var x = q0[2] * q1[3] - q0[3] * q1[2] + q0[0] * q1[1] + q0[1] * q1[0];
	var y = q0[3] * q1[1] - q0[1] * q1[3] + q0[0] * q1[2] + q0[2] * q1[0];
	var z = q0[1] * q1[2] - q0[2] * q1[1] + q0[0] * q1[3] + q0[3] * q1[0];
	if (! dst) dst = [];
	dst[0] = w;
	dst[1] = x;
	dst[2] = y;
	dst[3] = z;
	return dst;
};
Q4.normalize = function(q, dst) {
	var w = q[0];
	var x = q[1];
	var y = q[2];
	var z = q[3];
	var rl = 1 / Math.sqrt(x*x + y*y + z*z + w*w);
	if (! dst) dst = [];
	dst[0] = rl * w;
	dst[1] = rl * x;
	dst[2] = rl * y;
	dst[3] = rl * z;
	return dst;
};
Q4.length = function(q) {
	var w = q[0];
	var x = q[1];
	var y = q[2];
	var z = q[3];
	return Math.sqrt(x*x + y*y + z*z + w*w);
};
Q4.toM3x3 = function (q, dst) {
	var xx2 = q[1] * q[1] * 2;
	var yy2 = q[2] * q[2] * 2;
	var zz2 = q[3] * q[3] * 2;
	var xy2 = q[1] * q[2] * 2;
	var xz2 = q[1] * q[3] * 2;
	var yz2 = q[2] * q[3] * 2;
	var wx2 = q[0] * q[1] * 2;
	var wy2 = q[0] * q[2] * 2;
	var wz2 = q[0] * q[3] * 2;
	//row 0
	var m00 = 1 - yy2 - zz2;
	var m01 = xy2 - wz2;
	var m02 = xz2 + wy2;
	//row 1
	var m10 = xy2 + wz2;
	var m11 = 1 - xx2 - zz2;
	var m12 = yz2 - wx2;
	//row 2
	var m20 = xz2 - wy2;
	var m21 = yz2 + wx2;
	var m22 = 1 - xx2 - yy2;
	if (! dst) dst = [];
	dst[0] = m00; dst[1] = m01; dst[2] = m02; // row 0
	dst[3] = m10; dst[4] = m11; dst[5] = m12; // row 1
	dst[6] = m20; dst[7] = m21; dst[8] = m22; // row 2
	return dst;
};
