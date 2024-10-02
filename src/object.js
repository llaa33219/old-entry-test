/**;
 * @fileoverview Object for Entry.
 */
'use strict';

/**
 * Class for entry object.
 * @param {?object model} model for object
 * @constructor
 */
Entry.EntryObject = function(model) {
    if (model) {
        /** @type {string} */
        this.id = model.id;

        /** @type {string} */
        this.name = model.name ? model.name : model.sprite.name;

        /** @type {string} */
        this.objectType = model.objectType;
        if (!this.objectType)
            this.objectType = 'sprite';

        /** @type {Blockly Xml} */
        if (model.script)
            this.script = Blockly.Xml.textToDom(model.script);
        else
            this.script = Blockly.Xml.textToDom('<xml></xml>');

        /** @type {Array.<picture object>} */
        this.pictures = model.sprite.pictures;

        /** @type {Array.<sound object>} */
        this.sounds = [];
        this.sounds = model.sprite.sounds;
        for (var i=0; i<this.sounds.length; i++) {
            if (!this.sounds[i].id)
                this.sounds[i].id = Entry.generateHash();
            Entry.initSound(this.sounds[i]);
        }

        /** @type {string} */
        this.lock = model.lock ? model.lock : false;

        if (this.objectType == "sprite") {
            if (!model.selectedPictureId)
                this.selectedPicture = this.pictures[0];
            else
                this.selectedPicture = this.getPicture(model.selectedPictureId);
        }


        this.scene = Entry.scene.getSceneById(model.scene)
                     || Entry.scene.selectedScene;

        this.setRotateMethod(model.rotateMethod);

        //entity
        this.entity = new Entry.EntityObject(this);
        this.entity.injectModel(
            this.selectedPicture ? this.selectedPicture : null,
            model.entity ? model.entity : this.initEntity(model)
        );

        this.clonedEntities = [];

        Entry.stage.loadObject(this);

        for (var i in this.pictures) {
            var picture = this.pictures[i];
            if (!picture.id)
                picture.id = Entry.generateHash();
            var image = new Image();
            var fileName = picture.filename;
            image.src = '/uploads/' + fileName.substring(0, 2) + '/' +
                fileName.substring(2, 4) + '/image/' + fileName + '.png';
            image.onload = function(e) {
                Entry.container.cachePicture(picture.id, image);
            };
        }
    }
};

/**
 * View generator for workspace or others.
 * @return {!Element}
 */
Entry.EntryObject.prototype.generateView= function() {
    if (Entry.type == "workspace") {
        var objectView = Entry.createElement('li', this.id);
        objectView.addClass('entryContainerListElementWorkspace');
        objectView.object = this;
        objectView.bindOnClick(function(e) {
            if (Entry.container.getObject(this.id))
                Entry.container.selectObject(this.id);
            Entry.container.blurAllInputs();
        });

        // generate context menu
        if ($) {
            var object = this;
            context.attach('#' + this.id, [
                {
                    text: Lang.Workspace.context_rename,
                    href: '/',
                    action: function(e){
                        (function (o){
                            e.preventDefault();
                            o.setLock(false);
                            o.editObjectValues(true);
                            o.nameView_.select();
                        })(object);
                    }
                },
                {
                    text: Lang.Workspace.context_duplicate,
                    href: '/',
                    action: function(e){
                        e.preventDefault();
                        Entry.container.addCloneObject(object);
                    }
                },
                {
                    text: Lang.Workspace.context_remove,
                    href: '/',
                    action: function(e){
                        e.preventDefault();
                        Entry.container.removeObject(object);
                    }
                },
                {
                    text: '복사하기',
                    href: '/',
                    action: function(e){
                        e.preventDefault();
                        Entry.container.setCopiedObject(object);
                    }
                },
                {
                    text: '붙여넣기',
                    href: '/',
                    action: function(e){
                        e.preventDefault();
                        if (Entry.container.copiedObject)
                            Entry.container.addCloneObject(Entry.container.copiedObject);
                        else
                            Entry.toast.alert('경고', '붙여넣기 할 오브젝트가 없습니다.');
                    }
                 }
            ]);
        }
        /** @type {!Element} */
        this.view_ = objectView;


        var thisPointer = this;
        var objectInfoView = Entry.createElement('ul');
        objectInfoView.addClass('objectInfoView');
        if (!Entry.objectEditable) {
            objectInfoView.addClass('entryHide')
        }
        var objectInfo_visible = Entry.createElement('li');
        objectInfo_visible.addClass('objectInfo_visible');
        if (!this.entity.getVisible())
            objectInfo_visible.addClass('objectInfo_unvisible');
        objectInfo_visible.bindOnClick(function (e) {
            if (Entry.engine.isState('run'))
                return;
            var entity = thisPointer.entity;
            var visible = entity.setVisible(!entity.getVisible());
            if (visible)
                this.removeClass('objectInfo_unvisible');
            else
                this.addClass('objectInfo_unvisible');
        });

        var objectInfo_lock = Entry.createElement('li');
        objectInfo_lock.addClass('objectInfo_unlock');
        if (this.getLock())
            objectInfo_lock.addClass('objectInfo_lock');

        objectInfo_lock.bindOnClick(function (e) {
            if (Entry.engine.isState('run'))
                return;
            var object = thisPointer;
            var isLocked = object.setLock(!object.getLock());
            if (isLocked)
                this.addClass('objectInfo_lock');
            else
                this.removeClass('objectInfo_lock');
            object.updateInputViews(object.getLock());
        });
        objectInfoView.appendChild(objectInfo_visible);
        objectInfoView.appendChild(objectInfo_lock);
        this.view_.appendChild(objectInfoView);

        var thumbnailView = Entry.createElement('div');
        thumbnailView.addClass('entryObjectThumbnailWorkspace')
        this.view_.appendChild(thumbnailView);
        this.thumbnailView_ = thumbnailView;

        var wrapperView = Entry.createElement('div');
        wrapperView.addClass('entryObjectWrapperWorkspace')
        this.view_.appendChild(wrapperView);

        var nameView = Entry.createElement('input');
        nameView.bindOnClick(function (e) {
            e.stopPropagation();
            this.select();
        });
        nameView.addClass('entryObjectNameWorkspace')

        wrapperView.appendChild(nameView);
        this.nameView_ = nameView;
        this.nameView_.entryObject = this;
        nameView.setAttribute("disabled", 'disabled');

        this.nameView_.onblur = function() {
            this.entryObject.name = this.value;
        };
        this.nameView_.onkeyup = function() {
            if (this.entryObject.objectType == "textBox")
                this.entryObject.entity.setText(this.value);
        };
        this.nameView_.onkeypress = function(e) {
            if (e.keyCode == 13)
                this.blur();
        };
        this.nameView_.value = this.name;


        var editView = Entry.createElement('div');
        editView.addClass('entryObjectEditWorkspace');
        editView.object = this;
        this.editView_ = editView;
        this.view_.appendChild(editView);
        var click = false;
        if(Entry.objectEditable) {
            editView.bindOnClick(function(e){
                e.stopPropagation();
                if(Entry.engine.isState('run')){
                    return;
                }else{
                    object.editObjectValues(tog);
                }

            });
            editView.blur = function(e){
                object.editObjectComplete();
            }
        } else {
            editView.addClass("entryRemove");
        }


        if (Entry.objectEditable && Entry.objectDeletable) {
            var deleteView = Entry.createElement('div');
            deleteView.addClass('entryObjectDeleteWorkspace');
            deleteView.object = this;
            this.deleteView_ = deleteView;
            this.view_.appendChild(deleteView);
            deleteView.bindOnClick(function (e) {
                if (Entry.engine.isState('run')) {
                    return;
                }
                Entry.container.removeObject(this.object);
            });
        }

        var selectedImgView = Entry.createElement('div');
        selectedImgView.addClass('entryObjectSelectedImgWorkspace');
        this.selectedImgView_ = selectedImgView;
        this.view_.appendChild(selectedImgView);
        this.initializeSplitter(selectedImgView);
        this.splitter = selectedImgView;

        var informationView = Entry.createElement('div');
        informationView.addClass('entryObjectInformationWorkspace')
        informationView.object = this;
        this.isInformationToggle = false;
        wrapperView.appendChild(informationView);
        this.informationView_ = informationView;

        var rotationWrapperView = Entry.createElement('div');
        rotationWrapperView.addClass('entryObjectRotationWrapperWorkspace')
        rotationWrapperView.object = this;
        this.view_.appendChild(rotationWrapperView);

        var coordinateView = Entry.createElement('span');
        coordinateView.addClass('entryObjectCoordinateWorkspace')
        rotationWrapperView.appendChild(coordinateView);
        var xCoordi = Entry.createElement('span');
        xCoordi.addClass('entryObjectCoordinateSpanWorkspace');
        xCoordi.innerHTML = 'X:';
        var xInput = Entry.createElement('input');
        xInput.addClass('entryObjectCoordinateInputWorkspace');
        xInput.setAttribute("disabled","disabled");
        xInput.bindOnClick(function (e) {
            e.stopPropagation();
            this.select();
        });

        var yCoordi = Entry.createElement('span');
        yCoordi.addClass('entryObjectCoordinateSpanWorkspace');
        yCoordi.innerHTML = 'Y:';
        var yInput = Entry.createElement('input');
        yInput.addClass('entryObjectCoordinateInputWorkspace entryObjectCoordinateInputWorkspace_right');
        yInput.bindOnClick(function (e) {
            e.stopPropagation();
            this.select();
        });
        yInput.setAttribute("disabled","disabled");
        var sizeSpan = Entry.createElement('span');
        sizeSpan.addClass('entryObjectCoordinateSizeWorkspace');
        sizeSpan.innerHTML = '크기 :';
        var sizeInput = Entry.createElement('input');
        sizeInput.addClass('entryObjectCoordinateInputWorkspace',
                           'entryObjectCoordinateInputWorkspace_size');
        sizeInput.bindOnClick(function (e) {
            e.stopPropagation();
            this.select();
        });
        sizeInput.setAttribute("disabled","disabled");
        coordinateView.appendChild(xCoordi);
        coordinateView.appendChild(xInput);
        coordinateView.appendChild(yCoordi);
        coordinateView.appendChild(yInput);
        coordinateView.appendChild(sizeSpan);
        coordinateView.appendChild(sizeInput);
        coordinateView.xInput_ = xInput;
        coordinateView.yInput_ = yInput;
        coordinateView.sizeInput_ = sizeInput;
        this.coordinateView_ = coordinateView;
        var thisPointer = this;
        xInput.onkeypress = function (e) {
            if (e.keyCode == 13)
                this.blur();
        };

        xInput.onblur = function (e) {
            if (!isNaN(xInput.value)) {
                thisPointer.entity.setX(Number(xInput.value));
            }
            thisPointer.updateCoordinateView();
            Entry.stage.updateObject();
        };
        yInput.onkeypress = function (e) {
            if (e.keyCode == 13)
                this.blur();
        };
        yInput.onblur = function (e) {
            if (!isNaN(yInput.value)) {
                thisPointer.entity.setY(Number(yInput.value));
            }
            thisPointer.updateCoordinateView();
            Entry.stage.updateObject();
        };
        sizeInput.onkeypress = function (e) {
            if (e.keyCode == 13)
                this.blur();
        };
        sizeInput.onblur = function (e) {
            if (!isNaN(sizeInput.value)) {
                thisPointer.entity.setSize(Number(sizeInput.value));
            }
            thisPointer.updateCoordinateView();
            Entry.stage.updateObject();
        };

        var rotateLabelWrapperView = Entry.createElement('div');
        rotateLabelWrapperView.addClass('entryObjectRotateLabelWrapperWorkspace')
        this.view_.appendChild(rotateLabelWrapperView);
        this.rotateLabelWrapperView_ = rotateLabelWrapperView;

        var rotateSpan = Entry.createElement('span');
        rotateSpan.addClass('entryObjectRotateSpanWorkspace');
        rotateSpan.innerHTML = Lang.Workspace.rotation + ' : ';
        var rotateInput = Entry.createElement('input');
        rotateInput.addClass('entryObjectRotateInputWorkspace')
        rotateInput.setAttribute("disabled","disabled");
        rotateInput.bindOnClick(function (e) {
            e.stopPropagation();
            this.select();
        });
        this.rotateSpan_ = rotateSpan;
        this.rotateInput_ = rotateInput;

        var directionSpan = Entry.createElement('span');
        directionSpan.addClass('entryObjectDirectionSpanWorkspace');
        directionSpan.innerHTML = Lang.Workspace.direction + ' : ';
        var directionInput = Entry.createElement('input');
        directionInput.addClass('entryObjectDirectionInputWorkspace')
        directionInput.setAttribute("disabled","disabled");
        directionInput.bindOnClick(function (e) {
            e.stopPropagation();
            this.select();
        });
        this.directionInput_ = directionInput;

        rotateLabelWrapperView.appendChild(rotateSpan);
        rotateLabelWrapperView.appendChild(rotateInput);
        rotateLabelWrapperView.appendChild(directionSpan);
        rotateLabelWrapperView.appendChild(directionInput);
        rotateLabelWrapperView.rotateInput_ = rotateInput;
        rotateLabelWrapperView.directionInput_ = directionInput;
        var thisPointer = this;
        rotateInput.onkeypress = function (e) {
            if (e.keyCode == 13)
                this.blur();
        };
        rotateInput.onblur = function (e) {
            var value = rotateInput.value;
            if (value.indexOf('˚') != -1)
                value = value.substring(0, value.indexOf('˚'));
            if (!isNaN(value)) {
                thisPointer.entity.setRotation(Number(value));
            }
            thisPointer.updateRotationView();
            Entry.stage.updateObject();
        }
        directionInput.onkeypress = function (e) {
            if (e.keyCode == 13)
                this.blur();
        };
        directionInput.onblur = function (e) {
            var value = directionInput.value;
            if (value.indexOf('˚') != -1)
                value = value.substring(0,value.indexOf('˚'));
            if (!isNaN(value))
                thisPointer.entity.setDirection(Number(value));
            thisPointer.updateRotationView();
            Entry.stage.updateObject();
        }

        var rotationMethodWrapper = Entry.createElement('div');
        rotationMethodWrapper.addClass('rotationMethodWrapper');
        rotationWrapperView.appendChild(rotationMethodWrapper);
        this.rotationMethodWrapper_ = rotationMethodWrapper;

        var rotateMethodLabelView = Entry.createElement('span');
        rotateMethodLabelView.addClass('entryObjectRotateMethodLabelWorkspace')
        rotationMethodWrapper.appendChild(rotateMethodLabelView);
        rotateMethodLabelView.innerHTML = Lang.Workspace.rotate_method + ' : ';

        var rotateModeAView = Entry.createElement('div');
        rotateModeAView.addClass('entryObjectRotateModeWorkspace')
        rotateModeAView.addClass('entryObjectRotateModeAWorkspace')
        rotateModeAView.object = this;
        this.rotateModeAView_ = rotateModeAView;
        rotationMethodWrapper.appendChild(rotateModeAView);
        rotateModeAView.bindOnClick(function(e){
            if (Entry.engine.isState('run') || this.object.getLock()) {
                return;
            }
            this.object.setRotateMethod('free');
        });

        var rotateModeBView = Entry.createElement('div');
        rotateModeBView.addClass('entryObjectRotateModeWorkspace')
        rotateModeBView.addClass('entryObjectRotateModeBWorkspace')
        rotateModeBView.object = this;
        this.rotateModeBView_ = rotateModeBView;
        rotationMethodWrapper.appendChild(rotateModeBView);
        rotateModeBView.bindOnClick(function(e){
            if (Entry.engine.isState('run') || this.object.getLock()) {
                return;
            }
            this.object.setRotateMethod('vertical');
        });

        var rotateModeCView = Entry.createElement('div');
        rotateModeCView.addClass('entryObjectRotateModeWorkspace')
        rotateModeCView.addClass('entryObjectRotateModeCWorkspace')
        rotateModeCView.object = this;
        this.rotateModeCView_ = rotateModeCView;
        rotationMethodWrapper.appendChild(rotateModeCView);
        rotateModeCView.bindOnClick(function(e){
            if (Entry.engine.isState('run') || this.object.getLock())
                return;
            this.object.setRotateMethod('none');
        });

        this.updateThumbnailView();
        this.updateCoordinateView();
        this.updateRotateMethodView();
        this.updateInputViews();

        this.updateCoordinateView(true);
        this.updateRotationView(true);
        return this.view_;
    } else if (Entry.type == "phone") {
        var objectView = Entry.createElement('li', this.id);
        objectView.addClass('entryContainerListElementWorkspace');
        objectView.object = this;
        objectView.bindOnClick(function(e) {
            if (Entry.container.getObject(this.id))
                Entry.container.selectObject(this.id);
        });

        // generate context menu
        if ($) {
            var object = this;
            context.attach('#' + this.id, [
                {
                    text: Lang.Workspace.context_rename,
                    href: '/',
                    action: function(e){
                        e.preventDefault();
                    }
                },
                {
                    text: Lang.Workspace.context_duplicate,
                    href: '/',
                    action: function(e){
                        e.preventDefault();
                        Entry.container.addCloneObject(object);
                    }
                },
                {
                    text: Lang.Workspace.context_remove,
                    href: '/',
                    action: function(e){
                        e.preventDefault();
                        Entry.container.removeObject(object);
                    }
                }
            ]);
        }
        /** @type {!Element} */
        this.view_ = objectView;


        var objectInfoView = Entry.createElement('ul');
        objectInfoView.addClass('objectInfoView');
        var objectInfo_visible = Entry.createElement('li');
        objectInfo_visible.addClass('objectInfo_visible');
        var objectInfo_lock = Entry.createElement('li');
        objectInfo_lock.addClass('objectInfo_lock');
        objectInfoView.appendChild(objectInfo_visible);
        objectInfoView.appendChild(objectInfo_lock);
        this.view_.appendChild(objectInfoView);


        var thumbnailView = Entry.createElement('div');
        thumbnailView.addClass('entryObjectThumbnailWorkspace')
        this.view_.appendChild(thumbnailView);
        this.thumbnailView_ = thumbnailView;

        var wrapperView = Entry.createElement('div');
        wrapperView.addClass('entryObjectWrapperWorkspace')
        this.view_.appendChild(wrapperView);

        var nameView = Entry.createElement('input');
        nameView.addClass('entryObjectNameWorkspace')
        wrapperView.appendChild(nameView);
        this.nameView_ = nameView;
        this.nameView_.entryObject = this;
        this.nameView_.onblur = function() {
            this.entryObject.name = this.value;
        };
        this.nameView_.onkeyup = function() {
            if (this.entryObject.objectType == "textBox")
                this.entryObject.entity.setText(this.value);
        };
        this.nameView_.onkeypress = function(e) {
            if (e.keyCode == 13)
                this.blur();
        };
        this.nameView_.value = this.name;


        if (Entry.objectEditable && Entry.objectDeletable) {
            var deleteView = Entry.createElement('div');
            deleteView.addClass('entryObjectDeletePhone');
            deleteView.object = this;
            this.deleteView_ = deleteView;
            this.view_.appendChild(deleteView);
            deleteView.bindOnClick(function (e) {
                if (Entry.engine.isState('run')) {
                    return;
                }
                Entry.container.removeObject(this.object);
            });
        }

        var editBtn = Entry.createElement('button');
        editBtn.addClass('entryObjectEditPhone');
        editBtn.object = this;
        editBtn.bindOnClick(function(e) {
            var object = Entry.container.getObject(this.id);
            if (object) {
                Entry.container.selectObject(object.id);
                Entry.playground.injectObject(object);
            }
        });
        this.view_.appendChild(editBtn);


        var informationView = Entry.createElement('div');
        informationView.addClass('entryObjectInformationWorkspace')
        informationView.object = this;
        this.isInformationToggle = false;
        wrapperView.appendChild(informationView);
        this.informationView_ = informationView;




        var rotateLabelWrapperView = Entry.createElement('div');
        rotateLabelWrapperView.addClass('entryObjectRotateLabelWrapperWorkspace')
        this.view_.appendChild(rotateLabelWrapperView);
        this.rotateLabelWrapperView_ = rotateLabelWrapperView;

        var rotateSpan = Entry.createElement('span');
        rotateSpan.addClass('entryObjectRotateSpanWorkspace');
        rotateSpan.innerHTML = Lang.Workspace.rotation + ' : ';
        var rotateInput = Entry.createElement('input');
        rotateInput.addClass('entryObjectRotateInputWorkspace')
        this.rotateSpan_ = rotateSpan;
        this.rotateInput_ = rotateInput;

        var directionSpan = Entry.createElement('span');
        directionSpan.addClass('entryObjectDirectionSpanWorkspace');
        directionSpan.innerHTML = Lang.Workspace.direction + ' : ';
        var directionInput = Entry.createElement('input');
        directionInput.addClass('entryObjectDirectionInputWorkspace')
        this.directionInput_ = directionInput;

        rotateLabelWrapperView.appendChild(rotateSpan);
        rotateLabelWrapperView.appendChild(rotateInput);
        rotateLabelWrapperView.appendChild(directionSpan);
        rotateLabelWrapperView.appendChild(directionInput);
        rotateLabelWrapperView.rotateInput_ = rotateInput;
        rotateLabelWrapperView.directionInput_ = directionInput;
        var thisPointer = this;
        rotateInput.onkeypress = function (e) {
            if (e.keyCode == 13) {
                var value = rotateInput.value;
                if (value.indexOf('˚') != -1)
                    value = value.substring(0, value.indexOf('˚'));
                if (!isNaN(value)) {
                    thisPointer.entity.setRotation(Number(value));
                }
                thisPointer.updateRotationView();
                rotateInput.blur();
            }
        };
        rotateInput.onblur = function (e) {
            thisPointer.entity.setRotation(thisPointer.entity.getRotation());
            Entry.stage.updateObject();
        }
        directionInput.onkeypress = function (e) {
            if (e.keyCode == 13) {
                var value = directionInput.value;
                if (value.indexOf('˚') != -1)
                    value = value.substring(0,value.indexOf('˚'));
                if (!isNaN(value)) {
                    thisPointer.entity.setDirection(Number(value));
                }
                thisPointer.updateRotationView();
                directionInput.blur();
            }
        };
        directionInput.onblur = function (e) {
            thisPointer.entity.setDirection(thisPointer.entity.getDirection());
            Entry.stage.updateObject();
        }

        var rotationWrapperView = Entry.createElement('div');
        rotationWrapperView.addClass('entryObjectRotationWrapperWorkspace')
        rotationWrapperView.object = this;
        this.view_.appendChild(rotationWrapperView);

        var coordinateView = Entry.createElement('span');
        coordinateView.addClass('entryObjectCoordinateWorkspace')
        rotationWrapperView.appendChild(coordinateView);
        var xCoordi = Entry.createElement('span');
        xCoordi.addClass('entryObjectCoordinateSpanWorkspace');
        xCoordi.innerHTML = 'X:';
        var xInput = Entry.createElement('input');
        xInput.addClass('entryObjectCoordinateInputWorkspace');
        var yCoordi = Entry.createElement('span');
        yCoordi.addClass('entryObjectCoordinateSpanWorkspace');
        yCoordi.innerHTML = 'Y:';
        var yInput = Entry.createElement('input');
        yInput.addClass('entryObjectCoordinateInputWorkspace entryObjectCoordinateInputWorkspace_right')
        var sizeTitle = Entry.createElement('span');
        sizeTitle.addClass('entryObjectCoordinateSpanWorkspace');
        sizeTitle.innerHTML = '크기:';
        var sizeInput = Entry.createElement('input');
        sizeInput.addClass('entryObjectCoordinateInputWorkspace',
                           'entryObjectCoordinateInputWorkspace_size');
        coordinateView.appendChild(xCoordi);
        coordinateView.appendChild(xInput);
        coordinateView.appendChild(yCoordi);
        coordinateView.appendChild(yInput);
        coordinateView.appendChild(sizeTitle);
        coordinateView.appendChild(sizeInput);
        coordinateView.xInput_ = xInput;
        coordinateView.yInput_ = yInput;
        coordinateView.sizeInput_ = sizeInput;
        this.coordinateView_ = coordinateView;
        var thisPointer = this;
        xInput.onkeypress = function (e) {
            if (e.keyCode == 13) {
                if (!isNaN(xInput.value)) {
                    thisPointer.entity.setX(Number(xInput.value));
                }
                thisPointer.updateCoordinateView();
                xInput.blur();
            }
        };
        xInput.onblur = function (e) {
            thisPointer.entity.setX(thisPointer.entity.getX());
            Entry.stage.updateObject();
        }
        yInput.onkeypress = function (e) {
            if (e.keyCode == 13) {
                if (!isNaN(yInput.value)) {
                    thisPointer.entity.setY(Number(yInput.value));
                }
                thisPointer.updateCoordinateView();
                yInput.blur();
            }
        };
        yInput.onblur = function (e) {
            thisPointer.entity.setY(thisPointer.entity.getY());
            Entry.stage.updateObject();
        }

        var rotationMethodWrapper = Entry.createElement('div');
        rotationMethodWrapper.addClass('rotationMethodWrapper');
        rotationWrapperView.appendChild(rotationMethodWrapper);
        this.rotationMethodWrapper_ = rotationMethodWrapper;

        var rotateMethodLabelView = Entry.createElement('span');
        rotateMethodLabelView.addClass('entryObjectRotateMethodLabelWorkspace')
        rotationMethodWrapper.appendChild(rotateMethodLabelView);
        rotateMethodLabelView.innerHTML = Lang.Workspace.rotate_method + ' : ';

        var rotateModeAView = Entry.createElement('div');
        rotateModeAView.addClass('entryObjectRotateModeWorkspace')
        rotateModeAView.addClass('entryObjectRotateModeAWorkspace')
        rotateModeAView.object = this;
        this.rotateModeAView_ = rotateModeAView;
        rotationMethodWrapper.appendChild(rotateModeAView);
        rotateModeAView.bindOnClick(function(e){
            if (Entry.engine.isState('run')) {
                return;
            }
            this.object.setRotateMethod('free');
        });

        var rotateModeBView = Entry.createElement('div');
        rotateModeBView.addClass('entryObjectRotateModeWorkspace')
        rotateModeBView.addClass('entryObjectRotateModeBWorkspace')
        rotateModeBView.object = this;
        this.rotateModeBView_ = rotateModeBView;
        rotationMethodWrapper.appendChild(rotateModeBView);
        rotateModeBView.bindOnClick(function(e){
            if (Entry.engine.isState('run')) {
                return;
            }
            this.object.setRotateMethod('vertical');
        });

        var rotateModeCView = Entry.createElement('div');
        rotateModeCView.addClass('entryObjectRotateModeWorkspace')
        rotateModeCView.addClass('entryObjectRotateModeCWorkspace')
        rotateModeCView.object = this;
        this.rotateModeCView_ = rotateModeCView;
        rotationMethodWrapper.appendChild(rotateModeCView);
        rotateModeCView.bindOnClick(function(e){
            if (Entry.engine.isState('run'))
                return;
            this.object.setRotateMethod('none');
        });

        this.updateThumbnailView();
        this.updateCoordinateView();
        this.updateRotateMethodView();

        this.updateInputViews();
        return this.view_;
    }
};

/**
 * Object name setter
 * @param {!string} name
 */
Entry.EntryObject.prototype.setName = function(name) {
    Entry.assert(typeof name == "string", 'object name must be string');
    this.name = name;
    this.nameView_.value = name;
};

/**
 * Object script setter
 * @param {!xml script} script
 */
Entry.EntryObject.prototype.setScript = function(script) {
    this.script = script;
};

/**
 * Object script getter
 * @return {!xml script} script
 */
Entry.EntryObject.prototype.getScriptText = function(script) {
    var xmlText = Blockly.Xml.domToText(this.script);
    xmlText = xmlText.replace(/\sxmlns=\"(.*?)\"/,"");
    xmlText = xmlText.replace(/\sclass=\"(.*?)\"/g,'');
    xmlText = xmlText.replace(/\sid=\"(.*?)\"/g,"");
    xmlText = xmlText.replace(/\sinline=\"(.*?)\"/g,"");
    return xmlText;
};

/**
 * Initialize entity model if not exist
 * @param {!object model} model for object
 * @return {entity model}
 */
Entry.EntryObject.prototype.initEntity = function(model) {
    var json = {};
    json.x = json.y = 0;
    json.rotation = 0;
    json.direction = 90;
    if (this.objectType == 'sprite') {
        var dimension = model.sprite.pictures[0].dimension;
        json.regX = dimension.width/2;
        json.regY = dimension.height/2;
        if (model.sprite.category.main == "배경")
            var scale = Math.max(270/dimension.height, 480/dimension.width);
        else if (model.sprite.category.main == "new")
            var scale = 1;
        else
            var scale = 200 / (dimension.width + dimension.height);
        json.scaleX = json.scaleY = scale;
        json.width = dimension.width;
        json.height = dimension.height;
    } else if (this.objectType == 'textBox') {
        json.regX = 25;
        json.regY = 12;
        json.scaleX = json.scaleY = 1.5;
        json.width = 50;
        json.height = 24;
        json.text = model.name;
        if (model.options) {
            var options = model.options;
            var fontStyle = '';
            if (options.bold)
                fontStyle += 'bold ';
            if (options.italic)
                fontStyle += 'italic ';

            json.underline = options.underline;
            json.strike = options.strike;
            json.font = fontStyle + "20px " + options.font.family;
            json.colour = options.colour;
            json.bgColor = options.background;
            json.lineBreak = options.lineBreak;
            if (options.lineBreak) {
                var lines = json.text.split('\n');
                if (lines.length > 1) {
                    var maxLen = lines[0].length;
                    for(var i=1,len=lines.length;i<len;i++) {
                        if (lines[i].length > maxLen) {
                            maxLen = lines[i].length;
                        }
                    }
                    json.width = 25 * maxLen;
                    json.height = 24 * lines.length;
                } else {
                    json.width = 25 * json.text.length;
                }
                json.regX = json.width / 2;
                json.regY = json.height / 2;
            }
        } else {
            json.underline = false;
            json.strike = false;
            json.font = '20px Nanum Gothic';
            json.colour = '#000000';
            json.bgColor = '#ffffff';
        }
    }
    return json;
};

/**
 * Update thumbnail view;
 */
Entry.EntryObject.prototype.updateThumbnailView = function() {
    if (this.objectType == 'sprite') {
        var fileName = this.entity.picture.filename;
        this.thumbnailView_.style.backgroundImage =
            'url("' + '/uploads/' + fileName.substring(0, 2) + '/' +
            fileName.substring(2, 4) + '/thumb/' + fileName + '.png")';
    }
    else if (this.objectType == 'textBox')
        this.thumbnailView_.style.backgroundImage =
            "url('/img/assets/text_icon.png')";
};

/**
 * Update coordinate view;
 */
Entry.EntryObject.prototype.updateCoordinateView = function(isForced) {
    if (!this.isSelected() && !isForced)
        return;
    if (this.coordinateView_ && this.coordinateView_.xInput_
        && this.coordinateView_.yInput_) {
        var originX = this.coordinateView_.xInput_.value,
            originY = this.coordinateView_.yInput_.value,
            size = this.coordinateView_.sizeInput_.value,
            newX = this.entity.getX().toFixed(1),
            newY = this.entity.getY().toFixed(1),
            newSize = this.entity.getSize().toFixed(1);
        if (originX != newX)
            this.coordinateView_.xInput_.value = newX;
        if (originY != newY)
            this.coordinateView_.yInput_.value = newY;
        if (size != newSize)
            this.coordinateView_.sizeInput_.value = newSize;
    }
};

/**
 * Update rotation view;
 */
Entry.EntryObject.prototype.updateRotationView = function(isForced) {
    if ((!this.isSelected() || !this.view_) && !isForced)
        return;
    var rotateMethod = this.getRotateMethod();
    var content = '';
    if (rotateMethod == 'free') {
        this.rotateSpan_.removeClass('entryRemove');
        this.rotateInput_.removeClass('entryRemove');
        content += this.entity.getRotation().toFixed(1);
        content += '˚';
        this.rotateInput_.value = content;

        content = '';
        content += this.entity.getDirection().toFixed(1);
        content += '˚';
        this.directionInput_.value = content;
    } else {
        this.rotateSpan_.addClass('entryRemove');
        this.rotateInput_.addClass('entryRemove');
        content = '';
        content += this.entity.getDirection().toFixed(1);
        content += '˚';
        this.directionInput_.value = content;
    }
};

/**
 * Select this object on view
 */
Entry.EntryObject.prototype.select = function(pictureId) {
    console.log(this);
};

/**
 * Add picture object by picture model.
 * @param {picture model} picture
 */
Entry.EntryObject.prototype.addPicture = function(picture, index) {
    Entry.stateManager.addCommand("add sprite",
        this,
        this.removePicture,
        picture.id);
    if (!index && index != 0)
        this.pictures.push(picture);
    else {
        this.pictures.splice(index, 0, picture);
        Entry.playground.injectPicture(this);
    }
    return new Entry.State(this,
        this.removePicture,
        picture.id);
};

/**
 * Remove picture object.
 * @param {string} pictureId
 * @return {boolean} return true if success
 */
Entry.EntryObject.prototype.removePicture = function(pictureId) {
    if (this.pictures.length < 2)
        return false;
    var picture = this.getPicture(pictureId);
    var index = this.pictures.indexOf(picture);
    Entry.stateManager.addCommand("remove sprite",
        this,
        this.addPicture,
        picture,
        index);
    this.pictures.splice(index, 1);
    if (picture === this.selectedPicture)
        Entry.playground.selectPicture(this.pictures[0]);

    Entry.playground.injectPicture(this);
    Entry.playground.reloadPlayground();
    return new Entry.State(this,
        this.addPicture,
        picture,
        index);
};

/**
 * Get picture object by Id.
 * @param {?string} pictureId
 * @return {picture object}
 */
Entry.EntryObject.prototype.getPicture = function(value) {
    //priority
    //1. pictureId
    //2. pictureName
    //3. index
    if (!value)
        return this.selectedPicture;
    value = value.trim();
    var pictures = this.pictures,
        len = pictures.length;
    for (var i=0; i<len; i++) {
        if (pictures[i].id == value)
            return pictures[i];
    };
    for (i=0; i<len; i++) {
        if (pictures[i].name == value)
            return pictures[i];
    };
    var checker = Entry.parseNumber(value);
    if (!(checker == false && typeof checker == 'boolean')
        && len >= checker && checker > 0) {
        return pictures[checker-1];
    }
    throw new Error('No picture with pictureId : ' + pictureId);
};

Entry.EntryObject.prototype.setPicture = function(picture) {
    for (var i in this.pictures) {
        var picture_ = this.pictures[i];
        if (picture.id === picture_.id) {
            this.pictures[i] = picture;
            return;
        }
    }
    throw new Error('No picture with pictureId : ' + pictureId);
};

/**
 * Get next picture object by Id.
 * @param {?string} pictureId
 * @return {picture object}
 */
Entry.EntryObject.prototype.getNextPicture = function(pictureId) {
    var pictures = this.pictures,
        len = pictures.length;
    for (var i = 0; i < len; i++) {
        var picture = pictures[i];
        if (picture.id == pictureId)
            return pictures[i == len-1 ? 0 : i+1];
    };
};

/**
 * Select picture object by Id.
 * @param {!string} pictureId
 * @return {picture object}
 */
Entry.EntryObject.prototype.selectPicture = function(pictureId) {
    var picture = this.getPicture(pictureId);
    if (picture) {
        this.selectedPicture = picture;
        this.entity.setImage(picture);
        this.updateThumbnailView();
        return;
    };
    throw new Error('No picture with pictureId : ' + pictureId);
};

/**
 * Add sound to object
 * @param {sound model} sound
 */
Entry.EntryObject.prototype.addSound = function(sound, index) {
    if (!sound.id)
        sound.id = Entry.generateHash();

    Entry.stateManager.addCommand("add sound",
        this,
        this.removeSound,
        sound.id);
    Entry.initSound(sound, index);

    if (!index && index != 0)
        this.sounds.push(sound);
    else {
        this.sounds.splice(index, 0, sound);
        Entry.playground.injectSound(this);
    }
    return new Entry.State(this,
        this.removeSound,
        sound.id);

};

/**
 * Remove sound object.
 * @param {string} soundId
 * @return {boolean} return true if success
 */
Entry.EntryObject.prototype.removeSound = function(soundId) {
    var index, sound;
    sound = this.getSound(soundId);
    index = this.sounds.indexOf(sound);
    Entry.stateManager.addCommand("remove sound",
        this,
        this.addSound,
        sound,
        index);
    this.sounds.splice(index, 1);
    Entry.playground.reloadPlayground();
    Entry.playground.injectSound(this);
    return new Entry.State(this,
        this.addSound,
        sound,
        index);
};

/**
 * rotate method getter
 * @return {string}
 */
Entry.EntryObject.prototype.getRotateMethod = function() {
    if(this.rotateMethod == null)
        this.rotateMethod = 'free';
    return this.rotateMethod;
};

/**
 * rotate method setter
 * @param {string} rotateMethod
 */
Entry.EntryObject.prototype.setRotateMethod = function(rotateMethod) {
    /** @type {string} */
    if(rotateMethod == null)
        rotateMethod = 'free';
    this.rotateMethod = rotateMethod;
    this.updateRotateMethodView();
}

Entry.EntryObject.prototype.updateRotateMethodView = function() {
    var rotateMethod = this.rotateMethod;
    if (!this.rotateModeAView_)
        return;
    this.rotateModeAView_.removeClass('selected');
    this.rotateModeBView_.removeClass('selected');
    this.rotateModeCView_.removeClass('selected');
    if (rotateMethod == 'free')
        this.rotateModeAView_.addClass('selected');
    else if (rotateMethod == 'vertical')
        this.rotateModeBView_.addClass('selected');
    else
        this.rotateModeCView_.addClass('selected');
    this.updateRotationView();
};

/**
 * Toggle information panel
 * @param {?boolean} isToggle
 */
Entry.EntryObject.prototype.toggleInformation = function(isToggle) {
    this.setRotateMethod(this.getRotateMethod());
    if (isToggle == null)
        isToggle = this.isInformationToggle = !this.isInformationToggle;
    if (isToggle) {
        this.view_.addClass('informationToggle');

    } else {
        this.view_.removeClass('informationToggle');

    }
};

/**
 * Add clone entity for clone block
 * If parameter given, this clone the parameter entity itself.
 * Otherwise, this clone this object's entity.
 * @param {?Entry.EntryObject} object
 * @param {?Entry.EntityObject} entity
 * @param {?xml block} script
 */
Entry.EntryObject.prototype.addCloneEntity = function(object, entity, script) {
    if (this.clonedEntities.length > Entry.maxCloneLimit)
        return;
    var clonedEntity = new Entry.EntityObject(this);
    if (entity) {
        clonedEntity.injectModel(
            entity.picture ? entity.picture : null,
            entity.toJSON()
        );
        clonedEntity.snapshot_ = entity.snapshot_;
        if (entity.effect) {
            clonedEntity.effect = Entry.cloneSimpleObject(entity.effect);
            clonedEntity.applyFilter();
        }
    } else {
        clonedEntity.injectModel(
            this.entity.picture ? this.entity.picture : null,
            this.entity.toJSON(clonedEntity)
        );
        clonedEntity.snapshot_ = this.entity.snapshot_;
        if (this.entity.effect) {
            clonedEntity.effect = Entry.cloneSimpleObject(this.entity.effect);
            clonedEntity.applyFilter();
        }
    }
    Entry.engine.raiseEventOnEntity(clonedEntity,
                                    [clonedEntity, 'when_clone_start']);
    clonedEntity.isClone = true;
    clonedEntity.isStarted = true;
    this.addCloneVariables(this, clonedEntity,
                           entity ? entity.variables : null,
                           entity ? entity.lists : null);
    this.clonedEntities.push(clonedEntity);
    Entry.stage.loadEntity(clonedEntity);
};

/**
 * Splitter is resizing playground handle.
 * This add mouse move and mouse up event to document.
 * @param {!Element} splitter
 */
Entry.EntryObject.prototype.initializeSplitter = function(splitter) {
    splitter.onmousedown = function(e) {
        Entry.container.disableSort();
        Entry.container.splitterEnable = true;
    };
    document.addEventListener('mousemove', function(e) {
        if (Entry.container.splitterEnable) {
            Entry.resizeElement({canvasWidth: e.x || e.clientX});
        }
    });
    document.addEventListener('mouseup', function(e) {
        Entry.container.splitterEnable = false;
        Entry.container.enableSort();
    });
};

/**
 * return true when object is selected
 * @return {Boolean}
 */
Entry.EntryObject.prototype.isSelected = function() {
    return this.isSelected_;
}

/**
 * convert this object's data to JSON.
 * @return {JSON}
 */
Entry.EntryObject.prototype.toJSON = function() {
    var json = {};
    json.id = this.id;
    json.name = this.name;
    json.script = this.getScriptText();
    if (this.objectType == 'sprite')
        json.selectedPictureId = this.selectedPicture.id;
    json.objectType = this.objectType;
    json.rotateMethod = this.getRotateMethod();
    json.scene = this.scene.id;
    json.sprite = {
        pictures: Entry.getPicturesJSON(this.pictures),
        sounds: Entry.getSoundsJSON(this.sounds)
    };
    json.lock = this.lock;
    json.entity = this.entity.toJSON();
    return json;
};

/**
 * destroy this object
 */
Entry.EntryObject.prototype.destroy = function() {
    Entry.stage.unloadEntity(this.entity);
    if (this.view_)
        Entry.removeElement(this.view_);
};

/**
 * Get sound object by Id.
 * @param {?string} soundId
 * @return {sound object}
 */
Entry.EntryObject.prototype.getSound = function(value) {
    //priority
    //1. soundId
    //2. soundName
    //3. index
    value = value.trim();
    var sounds = this.sounds,
        len = sounds.length;
    for (var i=0; i<len; i++) {
        if (sounds[i].id == value)
            return sounds[i];
    };
    for (i=0; i<len; i++) {
        if (sounds[i].name == value )
            return sounds[i];
    };
    var checker = Entry.parseNumber(value);
    if (!(checker == false && typeof checker == 'boolean')
        && len >= checker && checker > 0) {
        return sounds[checker-1];
    }
    throw new Error('No Sound');
};

Entry.EntryObject.prototype.addCloneVariables = function(object, entity, variables, lists) {
    entity.variables = [];
    entity.lists = [];
    var keyName = 'object_';
    if (!variables)
        variables = Entry.findObjsByKey(Entry.variableContainer.variables_,
                    keyName,
                    object.id);
    if (!lists)
        lists = Entry.findObjsByKey(Entry.variableContainer.lists_,
                    keyName,
                    object.id);

    for (var i=0; i<variables.length; i++)
        entity.variables.push(variables[i].clone());
    for (var i=0; i<lists.length; i++)
        entity.lists.push(lists[i].clone());
}

Entry.EntryObject.prototype.getLock = function() {
    return this.lock;
}

Entry.EntryObject.prototype.setLock = function(bool) {
    return this.lock = bool;
}

Entry.EntryObject.prototype.updateInputViews = function(isLocked) {
    isLocked = isLocked || this.getLock();
    var inputs = [
        this.nameView_, this.coordinateView_.xInput_,
        this.coordinateView_.yInput_, this.rotateInput_,
        this.directionInput_,this.editView_,
        this.coordinateView_.sizeInput_
    ];
    var edit = this.editView_;
    if (isLocked){
        edit.removeClass("editButtonToggle")
        edit.addClass("editButtonToggle_");
        if(inputs[0].getAttribute("disabled")!='disabled'){
            for(var i=0; i<inputs.length; i++){
                inputs[i].setAttribute('disabled', 'disabled');
                inputs[i].removeClass('selectedEditingObject');
                tog = true;
            }
        }
    } else{
        edit.removeClass("editButtonToggle_");
        edit.addClass("editButtonToggle")
    }
}

var tog = true;
Entry.EntryObject.prototype.editObjectValues = function(click) {
    var inputs = [
        this.nameView_, this.coordinateView_.xInput_,
        this.coordinateView_.yInput_, this.rotateInput_,
        this.directionInput_, this.coordinateView_.sizeInput_
    ];
    if (click) {
        for(var i=0; i<inputs.length; i++){
            inputs[i].removeAttribute('disabled');
            inputs[i].addClass("selectedEditingObject");
        }
        this.nameView_.select();
        tog = false;
    } else {
        for(var i=0; i<inputs.length; i++){
            inputs[i].setAttribute('disabled', 'disabled');
            inputs[i].removeClass('selectedEditingObject');
        }
        inputs[0].blur();
        tog = true;
    }
}


/**
 * Add stamp entity for brush_stamp block
 * If parameter given, this clone the parameter entity itself.
 * Otherwise, this clone this object's entity.
 * @param {?Entry.EntryObject} object
 * @param {?Entry.EntityObject} entity
 * @param {?xml block} script
 */
Entry.EntryObject.prototype.addStampEntity = function(entity) {
    var stampEntity = new Entry.StampEntity(this, entity);
    var stage = Entry.stage;
    stage.loadEntity(stampEntity);
    this.clonedEntities.push(stampEntity);
    Entry.stage.sortZorder();
};

/**
 *  get only clonedEntities among clonedEntities except for stamp entity
 *  @return {Array<clone Entity> } entities
 */
Entry.EntryObject.prototype.getClonedEntities = function() {
    var entities = [],
    clonedEntities = this.clonedEntities;
    clonedEntities.map(function (entity) {
        if (!entity.isStamp)
            entities.push(entity);
    });
    return entities;
};

/**
 *  get only stamp entities among clonedEntities
 *  @return {Array<stampEntity> } entities
 */
Entry.EntryObject.prototype.getStampEntities = function() {
    var entities = [],
    clonedEntities = this.clonedEntities;
    clonedEntities.map(function (entity) {
        if (entity.isStamp)
            entities.push(entity);
    });
    return entities;
};
