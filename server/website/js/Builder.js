function Builder(world, options) { 
    this.world = world;
    this.Modes = {
        SELECT: 0
        , ADD: 1
    }; 
}

Builder.prototype.start = function() {
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false );
    document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this), false );
    document.addEventListener('keyup', this.onDocumentKeyUp.bind(this), false);
    this.ray = new THREE.Raycaster(this.world.camera.position, undefined, 0, 9000);
    this.projector = new THREE.Projector();
    this.helper = undefined;
    this.bHelperHidden = true;
    this.world.__proto__.onRender = this.onRender.bind(this);
    this.allowBrush = true;
    
   
    this.setMode(this.Modes.ADD);
}

Builder.prototype.setMode = function(mode) {
    switch(mode) {
        case this.Modes.SELECT:
            this.allowBrush = false;
            this.hideBrush();
        break;
        case this.Modes.ADD:
            this.allowBrush = true;
            this.showBrush();
        break;
    } 
    this.Mode = mode;
}

Builder.prototype.onDocumentKeyUp = function(event) {
    switch(event.keyCode) {
        case 90: // z
            var n = this.world.NonEntityObjects;
            if(n.length <= 1) return;
            var obj = n[n.length - 1];
            obj.parent.remove(obj);
            n.pop();
        break;
    }
}

Builder.prototype.onDocumentMouseMove = function(event) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
}

Builder.prototype.onDocumentMouseDown = function(event) {
    this.onBrushRequest();
}

Builder.prototype.onBrushRequest = function() {
    var intersect = this.getIntersect();      
    switch(this.Mode) {
        case this.Modes.SELECT:
            if(intersect != undefined) {
                if(intersect.object == this.selObject)
                    break;
                if(this.selObject != undefined) {
                    this.selObject.material.materials[0] = this.selPreviousMat;
                }
                this.selObject = intersect.object; 
                this.selPreviousMat = this.selObject.material.materials[0];
                this.selObject.material.materials[0] = this.highlighterMat;
            } else {
                if(this.selObject != undefined) {
                    this.selObject.material.materials[0] = this.selPreviousMat;
                }
                this.selObject = undefined;
                this.selPreviousMat = undefined;
            }
        break;
        case this.Modes.ADD: 
            if(intersect != undefined) {
                /*
                var rotVect = new THREE.Vector3();
                rotVect.x = this.helper.rotation.x;
                rotVect.y = this.helper.rotation.y;
                rotVect.z = this.helper.rotation.z;
                
                var worldNormal = intersect.face.worldNormal;
                var normal = intersect.face.normal;
                var rotOffset = normal.clone().sub(worldNormal).multiplyScalar(Math.PI / 2).negate();
                */
                
                
                //rotVect.add(rotOffset); 
                //var posOffset = this.helper.position.clone();
                var posOffset = intersect.object.worldToLocal(this.helper.position.clone()); 
                this.world.addAttachment(this.helperModel, intersect.object, {
                    x: posOffset.x,
                    y: posOffset.y,
                    z: posOffset.z,
                    rotation: this.helper.rotation,
                }); 
            }
        break;
    }
}
var asd = undefined;
Builder.prototype.hideBrush = function() {
    if(!this.bHelperHidden) {
        this.world.scene.remove(this.helper);
        this.bHelperHidden = true;
    }
}

Builder.prototype.showBrush = function() {
    if(this.bHelperHidden) {
        this.world.scene.add(this.helper);
        this.bHelperHidden = false;
    }
}

Builder.prototype.onRender = function() {
    if(!this.helper)
        return;
    var intersect = this.getIntersect();
    if(intersect == undefined) {
        this.hideBrush();
        return;
    }
    if(this.allowBrush)
        this.showBrush();
    
    var obj = intersect.object; 
    var hit = intersect.point.clone(); 
    var getWorldPoint = function(vertexID) {
        return obj.localToWorld(obj.geometry.vertices[vertexID].clone());
    }
    var a = getWorldPoint(intersect.face.a);
    var b = getWorldPoint(intersect.face.b);
    var c = getWorldPoint(intersect.face.c);
    
    var U = b.sub(a);
    var V = c.sub(a);
    
    var worldNormal = U.cross(V).normalize();
    worldNormal.x = Math.round(worldNormal.x);
    worldNormal.y = Math.round(worldNormal.y);
    worldNormal.z = Math.round(worldNormal.z);
    intersect.face.worldNormal = worldNormal;
    //var worldNormal = new THREE.Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    
    var finalRot = new THREE.Vector3(); 
    if(Math.abs(worldNormal.x) > 0) {
        finalRot.x = (Math.PI / 2) * Math.abs(worldNormal.x);
        finalRot.z = (-Math.PI / 2) * worldNormal.x;
    }
    if(Math.abs(worldNormal.z) > 0) {
        finalRot.x = (Math.PI / 2) * worldNormal.z;
        if(worldNormal.z < 0)
            finalRot.y = Math.PI;
    } else if(worldNormal.y < 0) {
        finalRot.y = Math.PI * worldNormal.y;
    } 
    this.helper.position.set(hit.x, hit.y, hit.z);
    this.helper.rotation.set(finalRot.x, finalRot.y, finalRot.z);
}

Builder.prototype.getIntersect = function() { 
    var cam = this.world.camera;
    var elem = this.world.renderer.domElement;
    var mouse3D = new THREE.Vector3();
        mouse3D.x = (this.mouseX / elem.width) * 2 - 1;
        mouse3D.y = -(this.mouseY / elem.height) * 2 + 1
        mouse3D.z = 0.5;
    this.projector.unprojectVector(mouse3D, cam); 
     
    this.ray.ray.direction = mouse3D.sub(cam.position).normalize();
    
    var intersects = this.ray.intersectObjects(this.world.NonEntityObjects);
    if(intersects.length == 0)  
        return undefined;
    return intersects[0];
}

Builder.prototype.addHelper = function(model, options) {
    this.helperModel = model;
    var loader = new THREE.JSONLoader();
    var self = this;
    loader.load(model, function(geometry, mats) {
        var material = new THREE.MeshFaceMaterial(mats);
        if(self.highlighterMat == undefined) {
            var mat = mats[0];
            mat.transparent = true;
            mat.opacity = 0.7; 
            mat.color = new THREE.Color(0xFF9900);
            mat.wireframe = true;
            mat.emissive = new THREE.Color(0xFF9900);
            self.highlighterMat = mat;
        }
        mats[0] = self.highlighterMat;
        self.helper = new THREE.Mesh(geometry, material);
    });
}



Builder.prototype.updateHelper = function(model, options) {
    this.world.scene.remove(this.helper);
    this.bHelperHidden = true;
    this.helper = undefined;
    this.addHelper(model, options);
}