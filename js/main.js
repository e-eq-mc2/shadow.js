/**
 * @author naoki
 */

"use strict";

$(function () {
	// Model
	var rbSys = new RbodySystem();
	
	var canvas = $("#webglCanvas").get(0);
	canvas.width  = $("#canvasArea").width();
	canvas.height = $("#canvasArea").height();

	var gl = initGL(canvas);
	if ( !gl ) return;

  WebGLDebugUtils.init(gl);

	var prgObj = {
		shadowPass : initShaders(gl, "shadowPassVs", "shadowPassFs"),
		lightPass  : initShaders(gl, "lightPassVs" , "lightPassFs" )
	};
	
	// attribute data
	var attribute = {
		shadowPass : new function (prgObj) {
			this.vertex   = gl.getAttribLocation(prgObj, "vertex"  );
			this.normal   = gl.getAttribLocation(prgObj, "normal"  );
			this.texCoord = gl.getAttribLocation(prgObj, "texCoord");
		} (prgObj.shadowPass),
		lightPass : new function (prgObj) {
			this.vertex   = gl.getAttribLocation(prgObj, "vertex"  );
			this.normal   = gl.getAttribLocation(prgObj, "normal"  );
			this.texCoord = gl.getAttribLocation(prgObj, "texCoord");
		} (prgObj.lightPass)
	};

	// uniform data
	var uniform = {
		shadowPass : new function (prgObj) {
			this. pM               = gl.getUniformLocation(prgObj, "pM"               );
			this.mvM               = gl.getUniformLocation(prgObj, "mvM"              ); 
			this. nM               = gl.getUniformLocation(prgObj, "nM"               );
			this.texture           = gl.getUniformLocation(prgObj, "texture"          );
			this.useTexture        = gl.getUniformLocation(prgObj, "useTexture"       );
		} (prgObj.shadowPass),
		lightPass : new function(prgObj) {
			this. pM               = gl.getUniformLocation(prgObj, "pM"               );
			this.mvM               = gl.getUniformLocation(prgObj, "mvM"              ); 
			this. nM               = gl.getUniformLocation(prgObj, "nM"               );
			this. sM               = gl.getUniformLocation(prgObj, "sM"               );
			this.depthTexture      = gl.getUniformLocation(prgObj, "depthTexture"     );
			this.texture           = gl.getUniformLocation(prgObj, "texture"          );
			this.useTexture        = gl.getUniformLocation(prgObj, "useTexture"       );
			this.darkeningFactor   = gl.getUniformLocation(prgObj, "darkeningFactor"  );
			this.lightPosition     = gl.getUniformLocation(prgObj, "lightPosition"    );
			this.materialAmbient   = gl.getUniformLocation(prgObj, "materialAmbient"  );
			this.materialDiffuse   = gl.getUniformLocation(prgObj, "materialDiffuse"  );
			this.materialSpecular  = gl.getUniformLocation(prgObj, "materialSpecular" );
			this.materialShininess = gl.getUniformLocation(prgObj, "materialShininess");
			this.lightAmbient      = gl.getUniformLocation(prgObj, "lightAmbient"     );
			this.lightDiffuse      = gl.getUniformLocation(prgObj, "lightDiffuse"     );
			this.lightSpecular     = gl.getUniformLocation(prgObj, "lightSpecular"    );
			this.windowSize        = gl.getUniformLocation(prgObj, "windowSize"       );
		} (prgObj.lightPass) 
	};
	
	// frame buffer
	var frameBuf = new FrameBuffer(gl, canvas.width, canvas.height);
	
	// for body(particle)
	var bodyBuf = new function () {
		this.vertex = new ArrayBuffer3f(gl);
		this.normal = new ArrayBuffer3f(gl);
		this.index  = new ElementArrayBuffer1us(gl);

		var data = new SolidSphere(rbSys.body.radius, 8, 4);
		this.vertex.setBuffer(gl, data.vertex);
		this.normal.setBuffer(gl, data.normal);
		this.index .setBuffer(gl, data.index );
	};
	// for boundary floor
	var floorBuf = new function () {
		this.vertex   = new ArrayBuffer3f(gl);
		this.normal   = new ArrayBuffer3f(gl);
		this.texCoord = new ArrayBuffer2f(gl);
		this.index    = new ElementArrayBuffer1us(gl);
		this.tex2D    = new Tex2DBuffer(gl);

		var width  = 6;
		var height = 6;
		var z      = 0;
		var data = new Quad(
			[ -width / 2, z, -height / 2], 
			[  width / 2, z, -height / 2], 
			[  width / 2, z,  height / 2], 
			[ -width / 2, z,  height / 2], 
			[ 0, 1, 0] // normal
		);

		this.vertex  .setBuffer(gl, data.vertex  );
		this.normal  .setBuffer(gl, data.normal  );
		this.texCoord.setBuffer(gl, data.texCoord);
		this.index   .setBuffer(gl, data.index   );
		this.tex2D   .setBufferFromImage(
		    gl, 
		    "img/karada.png", 
		    {minFilter : gl.LINEAR_MIPMAP_LINEAR, magFilter : gl.LINEAR}
	    );
	};
	// for boundary faces except for the floor
	var faceBuf = new function () {
		var ax = -3; var bx =  3;
		var ay =  0; var by =  6;
		var az = -3; var bz =  3;
		var v = [
			[ax, ay, az], [bx, ay, az], [bx, by, az], [ax, by, az],
			[ax, ay, bz], [bx, ay, bz], [bx, by, bz], [ax, by, bz]
		];
		var f = [
			[4, 0, 3, 7], // -x face
			[1, 5, 6, 2], // +x face
			[4, 5, 1, 0], // -y face
			[3, 2, 6, 7], // +y face
			[0, 1, 2, 3], // -z face
			[5, 4, 7, 6]  // +z face
		];
		var n = [
			[ 1,  0,  0], // -x face
			[-1,  0,  0], // +x face
			[ 0,  1,  0], // -y face
			[ 0, -1,  0], // +y face
			[ 0,  0,  1], // -z face
			[ 0,  0, -1]  // +z face
		];
		var faceList = [0, 1, 3, 4, 5];
		var bufs = new Array(faceList.length);
		for (var i=0; i < faceList.length; ++i) {
			bufs[i] = new function(idx) {
				this.vertex   = new ArrayBuffer3f(gl);
				this.normal   = new ArrayBuffer3f(gl);
				this.texCoord = new ArrayBuffer2f(gl);
				this.index    = new ElementArrayBuffer1us(gl);
				this.tex2D    = new Tex2DBuffer(gl);
				var data = new Quad(
					v[ f[idx][0] ], // v0
					v[ f[idx][1] ], // v1
					v[ f[idx][2] ], // v2
					v[ f[idx][3] ], // v3
					n[ idx       ]  // normal
				);
				this.vertex  .setBuffer(gl, data.vertex  );
				this.normal  .setBuffer(gl, data.normal  );
				this.texCoord.setBuffer(gl, data.texCoord);
				this.index   .setBuffer(gl, data.index   );
				var img = [0, 1, 4, 5].indexOf(idx) >= 0 ? "img/waza.png" :  "img/kokoro.png";
				this.tex2D   .setBufferFromImage(
				    gl, 
				    img, 
				    {minFilter : gl.LINEAR_MIPMAP_LINEAR, magFilter : gl.LINEAR}
			    );
			} (faceList[i]);
		} // for i
		return bufs;
	}; 
	// for boundary lines
    var boundaryBuf = new function () {
		this.vertex = new ArrayBuffer3f(gl, attribute.vertex);
		this.index  = new ElementArrayBuffer1us(gl);

		var data = new WireCube([-3, 0, -3], [3, 6, 3]);
		this.vertex.setBuffer(gl, data.vertex);
		this.index .setBuffer(gl, data.index );
	};
	
	var MAX_LOOP = 100000;
	var TIME_OUT =   20;
	var loop  = 0;
	var angle = 0;
	var timer0 = new Timer();
	var timer1 = new Timer();
	
	(function drawLoop() {
		// 2-pass rendering
		timer0.start();
	
		timer1.start();
		var maxOverlap = rbSys.update();
		timer1.stop();

		var pMLight = mat4.frustum(-2, 2, -2, 2, 4, 25);
		var pMEye   = mat4.frustum(-1, 1, -1, 1, 4, 30);
		
		var lightPosition = [0, 15,  0];
		var   eyePosition = [0,  3, 22];
		var vMLight = mat4.lookAt(lightPosition, [0,  0, 0], [0, 0, 1]);
		var vMEye   = mat4.lookAt(  eyePosition, [0,  3, 0], [0, 1, 0]);
		mat4.rotate(vMEye, deg2rad(  20), [1, 0, 0]); // M = M * R
		mat4.rotate(vMEye, deg2rad(angle), [0, 1, 0]); // M = M * R
		mat4.multiplyVec3(vMEye, lightPosition);
	
		var sM = mat4.create([ // -1.0 <= x,y,z <= 1.0 -> 0.0 <= x,y,z <= 1.0
			0.5, 0.0, 0.0, 0.0, // column 0
			0.0, 0.5, 0.0, 0.0, // column 1
			0.0, 0.0, 0.5, 0.0, // column 2
			0.5, 0.5, 0.5, 1.0, // column 3
		]);
		mat4.multiply(sM, pMLight, sM);
		mat4.multiply(sM, vMLight, sM);
		mat4.multiply(sM, mat4.inverse(mat4.create(vMEye)), sM);
		
		//////////////////////////////
		//////// shadow Pass  ////////
		//////////////////////////////
		(function (attribute, uniform, vM, pM) {
    		useShaders(gl, prgObj.shadowPass);
    		frameBuf.bind(gl, 0);
    
    		gl.enable(gl.DEPTH_TEST);
    		gl.depthFunc(gl.LEQUAL);
    		gl.clearColor(1, 1, 1, 1);
    		gl.clearDepth(1);
    		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		    
    		gl.uniformMatrix4fv(uniform.pM, false, pM);
    		
    		drawBody (attribute, uniform, vM);
    		
    		drawFace (attribute, uniform, vM);
    		
    		frameBuf.unbind(gl);
		} (attribute.shadowPass, uniform.shadowPass, vMLight, pMLight));

		//////////////////////////////
		//////// light Pass  /////////
		//////////////////////////////
		(function (attribute, uniform, vM, pM) {
    		useShaders(gl, prgObj.lightPass);
    		
    		gl.enable(gl.DEPTH_TEST);
    		gl.enable(gl.CULL_FACE);
    		//gl.enable(gl.BLEND);
    		gl.depthFunc(gl.LEQUAL);
    		gl.cullFace(gl.BACK);
    		//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    		
    		gl.clearColor(1, 1, 1, 1);
    		gl.clearDepth(1);
    		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		    
    		frameBuf.bindTex2D(gl, 0, uniform.depthTexture);

    		gl.uniformMatrix4fv(uniform.pM, false, pM);
    		gl.uniformMatrix4fv(uniform.sM, false, sM);

    		gl.uniform3fv(uniform.lightPosition    , lightPosition                );
    		gl.uniform4fv(uniform.lightAmbient     , [1.0, 1.0, 1.0, 1.0]         );
    		gl.uniform4fv(uniform.lightDiffuse     , [1.0, 1.0, 1.0, 1.0]         );
    		gl.uniform4fv(uniform.lightSpecular    , [1.0, 1.0, 1.0, 1.0]         );
    		gl.uniform2iv(uniform.windowSize       , [canvas.width, canvas.height]);

    		gl.uniform4fv(uniform.materialAmbient  , [0.2, 0.2, 0.2, 1.0]);
    		gl.uniform4fv(uniform.materialDiffuse  , [0.8, 0.8, 0.8, 1.0]);
    		gl.uniform4fv(uniform.materialSpecular , [0.6, 0.6, 0.6, 1.0]);
    		gl.uniform1f (uniform.materialShininess,                 20.0);
    		gl.uniform1f (uniform.darkeningFactor  ,                 20.0);

    		drawBody    (attribute, uniform, vM);

    		gl.uniform4fv(uniform.materialAmbient  , [0.4, 0.4, 0.4, 1.0]);
    		gl.uniform4fv(uniform.materialDiffuse  , [0.6, 0.6, 0.6, 1.0]);
    		gl.uniform4fv(uniform.materialSpecular , [0.6, 0.6, 0.6, 1.0]);
    		gl.uniform1f (uniform.materialShininess,                 20.0);
    		gl.uniform1f (uniform.darkeningFactor  ,                 40.0);

    		drawFloor   (attribute, uniform, vM);
    		
    		gl.disable(gl.CULL_FACE);
    		drawFace    (attribute, uniform, vM);
    		gl.enable(gl.CULL_FACE);
    		gl.cullFace(gl.BACK);

			gl.lineWidth(0.1);
    		gl.uniform4fv(uniform.materialAmbient  , [0.0, 0.0, 0.0, 0.5]);
    		gl.uniform4fv(uniform.materialDiffuse  , [0.0, 0.0, 0.0, 0.0]);
    		gl.uniform4fv(uniform.materialSpecular , [0.0, 0.0, 0.0, 0.0]);
    		gl.uniform1f (uniform.materialShininess,                  0.0);
    		gl.uniform1f (uniform.darkeningFactor  ,                  0.0);

    		drawBoundary(attribute, uniform, vM);
    		
    		frameBuf.unbindTex2D(gl);
		} (attribute.lightPass, uniform.lightPass, vMEye, pMEye));

		gl.flush();
		++loop;

		timer0.stop();
		var err = gl.getError();
		if (err != gl.NO_ERROR && err != gl.CONTEXT_LOST_WEBGL) {
      console.log( WebGLDebugUtils.glEnumToString(err) );
		}
		
		var ela0 = Math.ceil(timer0.elapsedMsec());
		var ave0 = Math.ceil(timer0.elapsedTotalMsec() / loop);
		var ela1 = Math.ceil(timer1.elapsedMsec());
		var ave1 = Math.ceil(timer1.elapsedTotalMsec() / loop);
		
		angle += 360 / 60 * Math.max(ave0, TIME_OUT) / 1000;
		
		ela0 = int2str(ela0, 4);
		ela1 = int2str(ela1, 4);
		ave0 = int2str(ave0, 4);
		ave1 = int2str(ave1, 4);
		$("#info").html(
			'<p>' + rbSys.body.length + ' bodies, step: ' + loop + '</p>' +
			'<p>' +  'R-body Elapsed: ' + ela1 + ' msec ' + '(ave. ' +  ave1 + ')' + '</p>' +
			'<p>' +  '+WebGL Elapsed: ' + ela0 + ' msec ' + '(ave. ' +  ave0 + ')' + '</p>' +
			'<p>' +  'Max Overlap: ' + float2str(maxOverlap, 1, 2) + '</p>'
		);

		var timeoutId = setTimeout(drawLoop, TIME_OUT);
		if (loop >= MAX_LOOP) clearTimeout(timeoutId);

		////////////////////
		// local function //
		////////////////////
		function drawBody(attribute, uniform, vM) {
			bodyBuf.vertex.bind(gl, attribute.vertex  );
			bodyBuf.normal.bind(gl, attribute.normal  );
			bodyBuf.index .bind(gl);

			var numBody = rbSys.body.length;
			for (var i=0; i < numBody; ++i) {
				var mvM = rbSys.body.toGLM4x4(i); // mvM = mM
				mat4.multiply(vM, mvM, mvM); // mvM = vM * mvM
				
				gl.uniformMatrix4fv(uniform.mvM, false,            mvM );
				gl.uniformMatrix3fv(uniform. nM, false, normalMat3(mvM));
    			gl.uniform1i(uniform.useTexture, 0);

				gl.drawElements(gl.TRIANGLES, bodyBuf.index.length, gl.UNSIGNED_SHORT, 0);
			}
			bodyBuf.vertex.unbind(gl, attribute.vertex);
			bodyBuf.normal.unbind(gl, attribute.normal);
			bodyBuf.index .unbind(gl);
		}
		function drawFloor(attribute, uniform, vM) {
			floorBuf.vertex  .bind(gl, attribute.vertex  );
			floorBuf.normal  .bind(gl, attribute.normal  );
			floorBuf.texCoord.bind(gl, attribute.texCoord);
			floorBuf.index   .bind(gl);
			floorBuf.tex2D   .bind(gl, 1, uniform.texture);

			var mvM = mat4.identity(mat4.create()); // mvM = mM
			mat4.multiply(vM, mvM, mvM); // mvM = vM * mvM

			gl.uniformMatrix4fv(uniform.mvM, false,            mvM );
			gl.uniformMatrix3fv(uniform. nM, false, normalMat3(mvM));
			gl.uniform1i(uniform.useTexture, 1);

			gl.drawElements(gl.TRIANGLES, floorBuf.index.length, gl.UNSIGNED_SHORT, 0);

			floorBuf.vertex  .unbind(gl, attribute.vertex  );
			floorBuf.normal  .unbind(gl, attribute.normal  );
			floorBuf.texCoord.unbind(gl, attribute.texCoord);
			floorBuf.index   .unbind(gl);
			floorBuf.tex2D   .unbind(gl);
		}
		function drawFace(attribute, uniform, vM) {
			for (var i=0; i < faceBuf.length; ++i) {
				var fb = faceBuf[i];
				fb.vertex  .bind(gl, attribute.vertex  );
				fb.normal  .bind(gl, attribute.normal  );
				fb.texCoord.bind(gl, attribute.texCoord);
				fb.index   .bind(gl);
				fb.tex2D   .bind(gl, 1, uniform.texture);
	
				var mvM = mat4.identity(mat4.create()); // mvM = mM
				mat4.multiply(vM, mvM, mvM); // mvM = vM * mvM
	
				gl.uniformMatrix4fv(uniform.mvM, false,            mvM );
				gl.uniformMatrix3fv(uniform. nM, false, normalMat3(mvM));
				gl.uniform1i(uniform.useTexture, 1);
	
				gl.drawElements(gl.TRIANGLES, fb.index.length, gl.UNSIGNED_SHORT, 0);
	
				fb.vertex  .unbind(gl, attribute.vertex  );
				fb.normal  .unbind(gl, attribute.normal  );
				fb.texCoord.unbind(gl, attribute.texCoord);
				fb.index   .unbind(gl);
				fb.tex2D   .unbind(gl);
			}

		}
		function drawBoundary(attribute, uniform, vM) {
			boundaryBuf.vertex.bind(gl, attribute.vertex);
			boundaryBuf.index .bind(gl);

			var mvM = mat4.identity(mat4.create()); // mvM = mM
			mat4.multiply(vM, mvM, mvM); // mvM = vM * mvM

			gl.uniformMatrix4fv(uniform.mvM, false,            mvM );
			gl.uniformMatrix3fv(uniform. nM, false, normalMat3(mvM));
			gl.uniform1i(uniform.useTexture, 0);

			gl.drawElements(gl.LINES, boundaryBuf.index.length, gl.UNSIGNED_SHORT, 0);

			boundaryBuf.vertex.unbind(gl, attribute.vertex);
			boundaryBuf.index .unbind(gl);
		}
	} ());
}); // end of $(document).ready(fuction(){});

/* 
 * 
 * Utility
 * 
 */
function deg2rad(deg) {
	return deg * Math.PI / 180;
}
function int2str(num, digit) {
	var str = num + "";
	while (str.length < digit)
		str = " " + str;
	return str.replace(/ /g, "&nbsp;");
}
function float2str(num, digitHigh, digitLow) {
	var str = num + "";
	if ( str.indexOf(".") < 0 ) str = str + ".0";
	
	var numH = str.indexOf(".");
	for (var i=0; i < digitHigh - numH; ++i) {
		str = " " + str;
	}
	
	var numL = str.length - (str.indexOf(".") + 1);
	for (var i=0; i < digitLow - numL; ++i) {
		str = str + "0";
	}
	str = str.slice(0,  digitHigh + digitLow + 1);
	
	return str.replace(/ /g, "&nbsp;");
}

/* 
 * 
 * Timer
 * 
 */
function Timer() {
	this.reset();
}
Timer.prototype.reset = function() {
	this.timeStart = 0;
	this.timeStop = 0;
	this.elapsed = 0;
	this.elapsedTotal = 0;
};
Timer.prototype.start = function() {
	this.timeStart = new Date().getTime();
	return this.timeStart;
};
Timer.prototype.stop = function() {
	this.timeStop = new Date().getTime();
	this.elapsed = this.timeStop - this.timeStart;
	this.elapsedTotal += this.elapsed;
	return this.timeStop;
};
Timer.prototype.elapsedMsec = function() {
	return this.elapsed;
};
Timer.prototype.elapsedTotalMsec = function() {
	return this.elapsedTotal;
};
