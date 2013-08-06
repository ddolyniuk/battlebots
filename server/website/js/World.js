/**
*   World Class
*/
function World(options) {
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;
    this.mouseX = 0;
    this.mouseY = 0;
    this.WorldObjects = [];
    this.WorldCollideObjects = [];
    this.NonEntityObjects = [];
    this.bMakePlane = true;
    this.bStationaryCam = false;
    this.bUseWindowSize = true;
    this.sizeHeight = window.innerHeight;
    this.sizeWidth = window.innerWidth;
    this.__windowSizeHeight = window.innerHeight;
    this.__windowSizeWidth = window.innerWidth; 
    if(options != undefined) {
        this.bMakePlane = options.bMakePlane != undefined ? options.bMakePlane : this.bMakePlane;
        this.bStationaryCam = options.bStationaryCam != undefined ? options.bStationaryCam : this.bStationaryCam;
        this.sizeHeight = options.sizeHeight != undefined ? options.sizeHeight : this.sizeHeight;
        this.sizeWidth = options.sizeWidth != undefined ? options.sizeWidth : this.sizeWidth;
        this.bUseWindowSize = options.bUseWindowSize != undefined ? options.bUseWindowSize : this.bUseWindowSize;
        this.panel = options.panel != undefined ? options.panel : this.panel;
        this.windowHalfX = options.sizeWidth != undefined ? options.sizeWidth / 2 : this.windowHalfX;
        this.windowHalfY = options.sizeHeight != undefined ? options.sizeHeight / 2 : this.windowHalfY;
    }
}

/**
*   fn - Function call chain
*/
World.prototype.start = function(fn) {
    this.container = document.createElement('div');
    if(this.panel == undefined)
        this.panel = document.body;
    
    this.panel.appendChild(this.container);
    this.keysDown = [];
    this.scene = new THREE.Scene(); 
    this.addFog();

    //this.addCamera({x: 204.87334539720956, y: 162.1449079978818, z: 552.2038077108206});
    this.addCamera({x: -100, y: 100, z: -50});
      
    this.camera.lookAt(this.scene.position);
    
    if(this.bMakePlane)
        this.addGroundPlane();
    this.addLight({color: 0xFFFFFF, x: 0, y: 50, z: 0, intensity:0.3});
    this.addLight({color: 0x380000, type: 'ambientLight'});
    
    this.renderer = new THREE.WebGLRenderer( { clearColor: 0x222222, clearAlpha: 1, maxLights: 12 } );
    this.renderer.setSize( this.sizeWidth, this.sizeHeight );
    this.renderer.sortObjects = false;
    this.container.appendChild( this.renderer.domElement );
 
    this.setupEvents();
    this.animate();
    if(fn)
        fn();
}

/**
*   Initialize event listeners
*/
World.prototype.setupEvents = function() {
    window.addEventListener('resize', this.onWindowResize.bind(this), false );
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false );
}

World.prototype.moveObject = function(obj, dir, speed, useY) {
    var worldSpace = dir.applyMatrix4(obj.matrixWorld);
    var dir = worldSpace.sub(obj.position).normalize();
    var vel = dir.multiplyScalar(speed);
    obj.velocity.x += vel.x;
    obj.velocity.z += vel.z;
    if(useY)
        obj.velocity.y += vel.y;
    obj.updatePhysics = true; 
}

/**
*   Event handler for window resize listener
*/
World.prototype.onWindowResize = function(event) {
    var width = this.__windowSizeWidth;
    var height = this.__windowSizeHeight;
    var widthPercentage = this.sizeWidth / width;
    var heightPercentage = this.sizeHeight / height;
    
    var newWidth = widthPercentage * window.innerWidth;
    var newHeight = heightPercentage * window.innerHeight;
    
   
    this.windowHalfX = newWidth / 2;
    this.windowHalfY = newHeight / 2;
    
    this.camera.aspect = newWidth / newHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( newWidth, newHeight );
}

/**
*   Event handler for mouse movement listener
*/
World.prototype.onDocumentMouseMove = function(event) {
    this.mouseX = ( event.clientX - this.windowHalfX );
    this.mouseY = ( event.clientY - this.windowHalfY );
}

/**
*   Animation frame call loop
*/
World.prototype.animate = function() {
    var self = this;
    requestAnimationFrame( function(T) {
        self.animate();
        self.render();
    });
}

/**
*   Canvas render call
*/
World.prototype.render = function() { 
    this.renderer.render( this.scene, this.camera );
    this.applyPhysics();  
    //this.attachmentUpdate();
    this.onRender();
}

/**
*   Hook for other scripts
*/
World.prototype.onRender = function() {

}

/**
*
*/
World.prototype.attachmentUpdate = function() {
    var normalMatrix = new THREE.Matrix3();
    for(var i = 0; i < this.WorldObjects.length; i++) {
        var targetObj = this.WorldObjects[i]; 
        if(!targetObj.attachments | !targetObj.geometry) continue;
        if(targetObj.attachments.length > 0) {
            for(var j = 0; j < targetObj.attachments.length; j++) {
                var tAttach = targetObj.attachments[j];
                var face = tAttach.attachMesh.face;
                var pos = targetObj.matrixWorld;
                var facePos = targetObj.geometry.faces[face].centroid.clone();
                var attachOffset = tAttach.attachMesh.offset.clone();
                facePos.add(attachOffset);
                var offset = facePos.applyMatrix4(pos);
                
                var rot = targetObj.geometry.faces[face].normal.clone();
                
                
                tAttach.position.set(offset.x, offset.y, offset.z);
                
                //tAttach.rotation.set(rot.x, rot.y, rot.z);
            }
        }
    }
}

/**
*   Basic falling physics
*/
World.prototype.applyPhysics = function() { 
    for(var i = 0; i < this.WorldObjects.length; i++) {
        var targetObj = this.WorldObjects[i];
        if(targetObj.updatePhysics && !targetObj.attachMesh) {
            
            var y = targetObj.flyMode || this.objectOnGround(targetObj) ? 0 : -14;
                y = targetObj.moving ? targetObj.velocity.y : y;
            var x = targetObj.moving ? targetObj.velocity.x : 0;
            var z = targetObj.moving ? targetObj.velocity.z : 0;
            //console.log( this.objectOnGround(targetObj));
            var idealVel = new THREE.Vector3(x, y, z);
            targetObj.velocity.lerp(idealVel, 0.3);
            this.applyVelocity(targetObj);
        }
    }
}

World.prototype.objectOnGround = function(obj) {
    var x = this.collideCheck(obj, new THREE.Vector3(0, -1, 0));
    return x < 3 && x != -1;
}

/**
*   Move object every tick along velocity
*   If translate extends past collision we will 
*   translate to the distance towards collide instead
*/
World.prototype.applyVelocity = function(obj) {
    var delta = 1;
    var now = Date.now();
    if(obj.velocityDelta != undefined) {
        delta = now - obj.velocityDelta;
    }
    obj.velocityDelta = now; 
    
    delta /= 80;
    
    var col = this.collideCheck(obj, obj.velocity.clone().normalize());
    var vel = obj.velocity;
     
    if(col != -1) {             // not falling
        vel = obj.velocity.clone().normalize().multiplyScalar(col);
    }
    if(col < 10 && col != -1)   // collided
        obj.velocity.negate().divideScalar(10);
    obj.translateX(vel.x * delta);
    obj.translateY(vel.y * delta);
    obj.translateZ(vel.z * delta); 
}

/**
*   Checks if object moving in direction hits another collidable object
*/
World.prototype.collideCheck = function(obj, dir) {
    var len = obj.velocity.length();
    var ray = new THREE.Raycaster(obj.position, dir, 0, len);
     
    var intersects = ray.intersectObjects(this.WorldCollideObjects);
    if(intersects.length != 0) { 
        return intersects[0].distance;
    }
    return -1;
}

/**
*   Add ground plane to world
*   Available Options
*   imgFile planeSize
*   imgFile is the location of the terrain texture
*   planeSize is an array of height and width
*/
World.prototype.addGroundPlane = function(options) {
    var imgFile = './models/dirt_seamless.png',
    planeSize = [2000, 2000];
    
    if(options != undefined) {
        imgFile = options.imgFile != undefined ? options.imgFile : imgFile;
        planeSize = options.planeSize != undefined ? options.planeSize : planeSize;
    }
    
    var texture = THREE.ImageUtils.loadTexture( imgFile );
    var geometry = new THREE.PlaneGeometry( planeSize[0], planeSize[1] );
    var material = new THREE.MeshPhongMaterial( { color: 0xffffff, map: texture } );

    var ground = new THREE.Mesh( geometry, material );
    ground.rotation.x = - Math.PI / 2;
    ground.material.map.repeat.set( 8, 8 );
    ground.material.map.wrapS = ground.material.map.wrapT = THREE.RepeatWrapping;
    ground.receiveShadow = true;
    
    ground.velocity = new THREE.Vector3(); 
    
    this.addToWorld( ground, false, true );
}

/**
*   Add object to world
*   model - model file location
*   Available Options
*   repeat physics collision
*   repeat - object x y representing repeat texture
*   physics - should we apply physics - defaults true
*   collision - should we collide
*/
World.prototype.addObject = function(model, options, fn) {
    var loader = new THREE.JSONLoader();
    var self = this;
    var x = 0, y = 0, z = 0;
    var yaw = 0, pitch = 0, roll = 0;
    var physics = true;
    var collision = true;
    var owner = this.scene;
    var absoluteRotation = false;
    
    loader.load(model, function(geometry, mats) {
        if(options != undefined) {
            var mat_repeats = [0];
            if(options.mat_repeats != undefined)
                mat_repeats = options.mat_repeats;
            for(var i = 0; i < mat_repeats.length; i++) {
                var originalMat = mats[mat_repeats[i]];
                var material = new THREE.MeshFaceMaterial(mats);
             
                if(options.repeat != undefined) {
                    originalMat.map.repeat.set(options.repeat[mat_repeats[i]], options.repeat[1]);
                    originalMat.map.wrapS = THREE.MirroredRepeatWrapping;
                    originalMat.map.wrapT = THREE.MirroredRepeatWrapping;
                    originalMat.map.needsUpdate = true;
                }
            }
            x = options.x != undefined ? options.x : x;
            y = options.y != undefined ? options.y : y;
            z = options.z != undefined ? options.z : z;
            yaw = options.yaw != undefined ? options.yaw : yaw;
            pitch = options.pitch != undefined ? options.pitch : pitch;
            roll = options.roll != undefined ? options.roll : roll;
            owner = options.owner != undefined ? options.owner : owner;
            absoluteRotation = options.absoluteRotation != undefined ? options.absoluteRotation : absoluteRotation;
            physics = options.physics != undefined ? options.physics : false;
        }
        var newObject = new THREE.Mesh(geometry, material);
        newObject.receiveShadow = true;
        newObject.velocity = new THREE.Vector3(); 
        self.addToWorld(newObject, {physics: physics, collision: true, owner: owner, entity: true}); 
        
        newObject.position.set(x, y, z);
        //newObject.rotation.set(yaw, pitch, roll);
        if(fn)
            fn(newObject);
         
    });
}

/**
*
*/
World.prototype.addAttachment = function(model, mesh, options) {
    var ops = options == undefined ? {} : options;
    ops.physics = false;
    ops.owner = mesh; 
    var self = this; 
    this.addObject(model, ops, function(newMesh) { 
        var rot = new THREE.Matrix4().copy(newMesh.matrixWorld).multiply(new THREE.Matrix4().makeRotationFromEuler(ops.rotation));
        //var objRot = new THREE.Matrix4().makeRotationFromEuler(ops.rotation).multiply(mat1);
        newMesh.rotation.setFromRotationMatrix(rot);
    });
}

/**
*   Available Options
*   x y z fov aspect nearPlane farPlane
*/
World.prototype.addCamera = function(options) {
    var fov = 45,
        aspect = this.sizeWidth / this.sizeHeight,
        nearPlane = 1,
        farPlane = 15000,
        x = 0,
        y = 0,
        z = 0;
    
    if(options != undefined) {
        fov = options.fov != undefined ? options.fov : fov;
        aspect = options.aspect != undefined ? options.aspect : aspect;
        nearPlane = options.nearPlane != undefined ? options.nearPlane : nearPlane;
        farPlane = options.farPlane != undefined ? options.farPlane : farPlane;
        x = options.x != undefined ? options.x : x;
        y = options.y != undefined ? options.y : y;
        z = options.z != undefined ? options.z : z;
    }
    
    this.camera = new THREE.PerspectiveCamera(fov, aspect, nearPlane, farPlane);
    this.camera.position.set(x, y, z);
    
    this.updatePhysics = true;
    this.WorldObjects.push(this.camera);
    this.camera.yOffset = 100;
    this.camera.velocity = new THREE.Vector3();
    this.camera.updatePhysics = true;
    this.camera.flyMode = true;
    this.camera.moving = false;
}

/**
*   Available Options
*   color[hex] near far
*/
World.prototype.addFog = function(options) {
    var color = 0x000000,
    near = 1,
    far = 15000;
    
    if(options != undefined) {
        color = options.color != undefined ? options.color : color;
        near = options.near != undefined ? options.near : near;
        far = options.far != undefined ? options.far : far;
    }
    
    this.scene.fog = new THREE.Fog( color, near, far );
}

/**
*   Available Options
*   color[hex] intensity type distance x y z
*   type string representing light type to create 
*   defaults to pointlight
*/
World.prototype.addLight = function(options) {
    var color = 0xffffff,
    intensity = 10,
    type = 'pointLight',
    distance = 300,
    x = 0,
    y = 0, 
    z = 0;
    
    var light;
    
    if(options != undefined) {
        color = options.color != undefined ? options.color : color;
        intensity = options.intensity != undefined ? options.intensity : intensity;
        type = options.type != undefined ? options.type : type;
        distance = options.distance != undefined ? options.distance : distance;
        x = options.x != undefined ? options.x : x;
        y = options.y != undefined ? options.y : y;
        z = options.z != undefined ? options.z : z;
    }
    
    var types = ['pointLight', 'ambientLight', 'areaLight']
    var index = types.indexOf(type);
    switch(index) {
        case 0:
            light = new THREE.PointLight(color, intensity, distance);
        break;
        case 1:
            light = new THREE.AmbientLight(color);
        break;
        case 2:
            light = new THREE.AreaLight(color, intensity);
        break;
    }
    
    this.addToWorld(light);
    
    //var pointLight = new THREE.PointLight( 0xffaa00 );
	//this.scene.add( pointLight );
    light.velocity = new THREE.Vector3();
    light.position.set(x, y, z);
    light.castShadow = true;
    
    return light;
}

World.prototype.addToWorld = function(obj, options) {
    if(this.scene == undefined) {
        console.log("ERROR - Cannot add " + obj + " to scene before scene was created!");
        return;
    }
    
    var physics = false;
    var collision = false;
    var entity = false;
    var owner = this.scene;
    
    if(options != undefined) {
        physics = options.physics != undefined ? options.physics : physics;
        collision = options.collision != undefined ? options.collision : collision;
        entity = options.entity != undefined ? options.entity : entity;
        owner = options.owner != undefined ? options.owner : owner;
    }
    owner.add(obj);
    this.WorldObjects.push(obj).geometry = obj.geometry;
    if(entity) {
        this.NonEntityObjects.push(obj);
    }
    if(physics) {
        obj.updatePhysics = true;
    }
    if(collision) {
        this.WorldCollideObjects.push(obj);
    }
    /*if(owner.worldRotation == undefined)
        owner.worldRotation = new THREE.Vector3();
    var rot = obj.rotation;
    obj.worldRotation = owner.worldRotation.clone().add(new THREE.Vector3(rot.x, rot.y, rot.z));*/
}