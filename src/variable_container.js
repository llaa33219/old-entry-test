/**
 * @fileoverview Variable container for variable object
 */
'use strict';
/**
 * Block variable constructor
 * @param {variable model} variable
 * @constructor
 */
Entry.VariableContainer = function() {
    this.variables_ = [];
    this.messages_ = [];
    this.lists_ = [];
    this.functions_ = {};
    this.viewMode_ = 'all';
    this.selected = null;
    this.variableAddPanel = {
        isOpen:false,
        info: {
            object: null,
            isCloud: false
        }
    };
    this.listAddPanel = {
        isOpen:false,
        info: {
            object: null,
            isCloud: false
        }
    };
    selectedVariable: null;
};

Entry.VariableContainer.prototype.createDom = function(view) {
    var that = this;
    this.view_ = view;
    var selectView = Entry.createElement('table');
    selectView.addClass('entryVariableSelectorWorkspace');
    this.view_.appendChild(selectView);
    var selectTrView = Entry.createElement('tr');
    selectView.appendChild(selectTrView);
    var allButton = this.createSelectButton('all');
    allButton.setAttribute("rowspan", "2");
    allButton.addClass('selected', 'allButton');
    selectTrView.appendChild(allButton);
    selectTrView.appendChild(this.createSelectButton('variable',
                                                     Entry.variableEnable));
    selectTrView.appendChild(this.createSelectButton('message',
                                                     Entry.messageEnable));
    var selectTrView = Entry.createElement('tr');
    selectTrView.appendChild(this.createSelectButton('list',
                                                     Entry.listEnable));
    selectTrView.appendChild(this.createSelectButton('func',
                                                     Entry.functionEnable));
    selectView.appendChild(selectTrView);

    var listView = Entry.createElement('ul');
    listView.addClass('entryVariableListWorkspace');
    this.view_.appendChild(listView);
    this.listView_ = listView;

    var variableAddButton = Entry.createElement('li');
    variableAddButton.addClass('entryVariableAddWorkspace');
    variableAddButton.addClass('entryVariableListElementWorkspace');
    variableAddButton.innerHTML = '+ ' + Lang.Workspace.variable_create;
    var thisPointer = this;
    this.variableAddButton_ = variableAddButton;

    variableAddButton.bindOnClick(function(e) {
        var panel = thisPointer.variableAddPanel;
        var value = panel.view.name.value.trim();
        if (panel.isOpen){
            if (!value || value.length == 0){
                panel.view.addClass('entryRemove');
                panel.isOpen = false;
            } else
                that.addVariable();
        } else {
            panel.view.removeClass('entryRemove');
            panel.view.name.focus();
            panel.isOpen = true;
        }
    });

    this.generateVariableAddView();
    this.generateListAddView();
    this.generateVariableSplitterView();
    this.generateVariableSettingView();
    this.generateListSettingView();

    var messageAddButton = Entry.createElement('li');
    messageAddButton.addClass('entryVariableAddWorkspace');
    messageAddButton.addClass('entryVariableListElementWorkspace');
    messageAddButton.innerHTML = '+ ' + Lang.Workspace.message_create;
    this.messageAddButton_ = messageAddButton;
    messageAddButton.bindOnClick(function(e) {
        that.addMessage({
            name:Lang.Workspace.message + ' ' +
                (that.messages_.length + 1)
        });
    });

    var listAddButton = Entry.createElement('li');
    listAddButton.addClass('entryVariableAddWorkspace');
    listAddButton.addClass('entryVariableListElementWorkspace');
    listAddButton.innerHTML = '+ ' + Lang.Workspace.list_create;
    this.listAddButton_ = listAddButton;
    listAddButton.bindOnClick(function(e) {
        var panel = thisPointer.listAddPanel;
        var value = panel.view.name.value.trim();
        if (panel.isOpen) {
            if (!value || value.length == 0) {
                panel.view.addClass('entryRemove');
                panel.isOpen = false;
            } else
                that.addList();
        } else {
            panel.view.removeClass('entryRemove');
            panel.view.name.focus();
            panel.isOpen = true;
        }
    });

    var functionAddButton = Entry.createElement('li');
    functionAddButton.addClass('entryVariableAddWorkspace');
    functionAddButton.addClass('entryVariableListElementWorkspace');
    functionAddButton.innerHTML = '+ ' + Lang.Workspace.function_create;
    //functionAddButton.innerHTML = '+ ' + Lang.Msgs.to_be_continue;
    this.functionAddButton_ = functionAddButton;
    functionAddButton.bindOnClick(function(e) {
        Entry.playground.changeViewMode('code');
        if (Entry.playground.selectedMenu != 'func')
            Entry.playground.selectMenu('func');
        that.createFunction();
    });

    return view;
};

/**
 * @param {String} type
 * @param {?Boolean} isEnable
 */
Entry.VariableContainer.prototype.createSelectButton = function(type, isEnable) {
    var that = this;
    if (isEnable == undefined) isEnable = true;
    var view = Entry.createElement('td');
    view.addClass('entryVariableSelectButtonWorkspace', type);
    view.innerHTML = Lang.Workspace[type];
    if (isEnable)
        view.bindOnClick(function(e) {
            that.selectFilter(type);
            this.addClass('selected');
        });
    else
        view.addClass('disable');
    return view;
};

/**
 * @param {String} type
 */
Entry.VariableContainer.prototype.selectFilter = function(type) {
    var elements = this.view_.getElementsByTagName('td');
    for (var i = 0; i<elements.length; i++) {
        elements[i].removeClass('selected');
        if (elements[i].hasClass(type)) {
            elements[i].addClass('selected');
        }
    }
    this.viewMode_ = type;
    this.select();
    this.updateList();
}

Entry.VariableContainer.prototype.updateVariableAddView = function(type) {
    type = type ? type : 'variable';
    var panel = type == 'variable' ? this.variableAddPanel : this.listAddPanel;
    var info = panel.info;
    var view = panel.view;
    panel.view.addClass('entryRemove');
    view.cloudCheck.removeClass('entryVariableAddChecked');
    view.localCheck.removeClass('entryVariableAddChecked');
    view.globalCheck.removeClass('entryVariableAddChecked');
    view.cloudWrapper.removeClass('entryVariableAddSpaceUnCheckedWorkspace')
    if (info.isCloud)
        view.cloudCheck.addClass('entryVariableAddChecked')
    if (panel.isOpen) {
        view.removeClass('entryRemove');
        view.name.focus();
    }
    if (info.object) {
        view.localCheck.addClass('entryVariableAddChecked')
        view.cloudWrapper.addClass('entryVariableAddSpaceUnCheckedWorkspace')
    } else
        view.globalCheck.addClass('entryVariableAddChecked')
}

/**
 * @param {object|Entry.Variable} object
 */
Entry.VariableContainer.prototype.select = function(object) {
    object = this.selected == object ? null : object;
    if (this.selected) {
        this.selected.listElement.removeClass('selected');
        this.listView_.removeChild(this.selected.callerListElement);
        delete this.selected.callerListElement;
        this.selected = null;
    }
    if (!object)
        return;
    object.listElement.addClass('selected');
    this.selected = object;
    if (object == null) {
    } else if (object instanceof Entry.Variable) {
        this.renderVariableReference(object);
        if (object.object_)
            Entry.container.selectObject(object.object_, true);
    } else if (object instanceof Entry.Func) {
        this.renderFunctionReference(object);
    } else {
        this.renderMessageReference(object);
    }
};

/**
 * @param {object} message
 */
Entry.VariableContainer.prototype.renderMessageReference = function(message) {
    var that = this;
    var objects = Entry.container.objects_;
    var messageType = ['when_message_cast', 'message_cast'];
    var callers = [];
    var listView = Entry.createElement('ul');
    listView.addClass('entryVariableListCallerListWorkspace')
    for (var i in objects) {
        var object = objects[i];
        var script = object.script;
        var blocks = script.getElementsByTagName('block');
        for (var j = 0; j < blocks.length; j++) {
            var block = blocks[j];
            var type = block.getAttribute('type');
            if (messageType.indexOf(type) > -1) {
                var value = Entry.Xml.getField("VALUE", block);
                if (value == message.id)
                    callers.push({object:object, block: block});
            }
        }
    }
    for (var i in callers) {
        var caller = callers[i];
        var element = Entry.createElement('li');
        element.addClass('entryVariableListCallerWorkspace');
        element.appendChild(caller.object.thumbnailView_.cloneNode());
        var nameElement = Entry.createElement('div');
        nameElement.addClass('entryVariableListCallerNameWorkspace');
        nameElement.innerHTML = caller.object.name + ' : ' +
            Lang.Blocks['START_' + caller.block.getAttribute('type')];
        element.appendChild(nameElement);
        element.caller = caller;
        element.message = message;
        element.bindOnClick(function(e) {
            if (Entry.playground.object != this.caller.object) {
                Entry.container.selectObject();
                Entry.container.selectObject(this.caller.object.id, true);
                that.select(null);
                that.select(this.message);
            }
            var id = this.caller.block.getAttribute("id");
            Blockly.mainWorkspace.activatePreviousBlock(Number(id));
            Entry.playground.toggleOnVariableView();
        });
        listView.appendChild(element);
    }
    if (callers.length == 0) {
        var element = Entry.createElement('li');
        element.addClass('entryVariableListCallerWorkspace');
        element.addClass('entryVariableListCallerNoneWorkspace');
        element.innerHTML = Lang.Workspace.no_use;
        listView.appendChild(element);
    }
    message.callerListElement = listView;
    this.listView_.insertBefore(listView, message.listElement);
    this.listView_.insertBefore(message.listElement, listView);
};

/**
 * @param {object} variable
 */
Entry.VariableContainer.prototype.renderVariableReference = function(variable) {
    var that = this;
    var objects = Entry.container.objects_;
    var variableType = [
        'get_variable', 'change_variable', 'hide_variable',
        'set_variable', 'show_variable',
        'add_value_to_list', 'remove_value_from_list', 'insert_value_to_list',
        'change_value_list_index', 'value_of_index_from_list',
        'length_of_list', 'show_list', 'hide_list'
    ];
    var callers = [];
    var listView = Entry.createElement('ul');
    listView.addClass('entryVariableListCallerListWorkspace')
    for (var i in objects) {
        var object = objects[i];
        var script = object.script;
        var blocks = script.getElementsByTagName('block');
        for (var j = 0; j < blocks.length; j++) {
            var block = blocks[j];
            var type = block.getAttribute('type');
            if (variableType.indexOf(type) > -1) {
                var value = Entry.Xml.getField("VARIABLE", block) ||
                            Entry.Xml.getField('LIST', block);
                if (value == variable.id_)
                    callers.push({object:object, block: block});
            }
        }
    }
    for (var i in callers) {
        var caller = callers[i];
        var element = Entry.createElement('li');
        element.addClass('entryVariableListCallerWorkspace');
        element.appendChild(caller.object.thumbnailView_.cloneNode());
        var nameElement = Entry.createElement('div');
        nameElement.addClass('entryVariableListCallerNameWorkspace');
        nameElement.innerHTML = caller.object.name + ' : ' +
            Lang.Blocks['VARIABLE_' + caller.block.getAttribute('type')];
        element.appendChild(nameElement);
        element.caller = caller;
        element.variable = variable;
        element.bindOnClick(function(e) {
            if (Entry.playground.object != this.caller.object) {
                Entry.container.selectObject();
                Entry.container.selectObject(this.caller.object.id, true);
                that.select(null);
                that.select(this.variable);
            }
            var id = this.caller.block.getAttribute("id");
            Blockly.mainWorkspace.activatePreviousBlock(Number(id));
            Entry.playground.toggleOnVariableView();
        });
        listView.appendChild(element);
    }
    if (callers.length == 0) {
        var element = Entry.createElement('li');
        element.addClass('entryVariableListCallerWorkspace');
        element.addClass('entryVariableListCallerNoneWorkspace');
        element.innerHTML = Lang.Workspace.no_use;
        listView.appendChild(element);
    }
    variable.callerListElement = listView;
    this.listView_.insertBefore(listView, variable.listElement);
    this.listView_.insertBefore(variable.listElement, listView);
};

/**
 * @param {object} variable
 */
Entry.VariableContainer.prototype.renderFunctionReference = function(func) {
    var that = this;
    var objects = Entry.container.objects_;
    var variableType = [
        'function_general'
    ];
    var callers = [];
    var listView = Entry.createElement('ul');
    listView.addClass('entryVariableListCallerListWorkspace')
    for (var i in objects) {
        var object = objects[i];
        var script = object.script;
        var blocks = script.getElementsByTagName('block');
        for (var j = 0; j < blocks.length; j++) {
            var block = blocks[j];
            var type = block.getAttribute('type');
            if (variableType.indexOf(type) > -1) {
                var mutation = block.getElementsByTagName("mutation")[0]
                if (mutation.getAttribute("hashid") == func.id)
                    callers.push({object:object, block: block});
            }
        }
    }
    for (var i in callers) {
        var caller = callers[i];
        var element = Entry.createElement('li');
        element.addClass('entryVariableListCallerWorkspace');
        element.appendChild(caller.object.thumbnailView_.cloneNode());
        var nameElement = Entry.createElement('div');
        nameElement.addClass('entryVariableListCallerNameWorkspace');
        nameElement.innerHTML = caller.object.name;
        element.appendChild(nameElement);
        element.caller = caller;
        element.bindOnClick(function(e) {
            if (Entry.playground.object != this.caller.object) {
                Entry.container.selectObject();
                Entry.container.selectObject(this.caller.object.id, true);
                that.select(null);
                that.select(func);
            }
            var id = this.caller.block.getAttribute("id");
            Blockly.mainWorkspace.activatePreviousBlock(Number(id));
            Entry.playground.toggleOnVariableView();
        });
        listView.appendChild(element);
    }
    if (callers.length == 0) {
        var element = Entry.createElement('li');
        element.addClass('entryVariableListCallerWorkspace');
        element.addClass('entryVariableListCallerNoneWorkspace');
        element.innerHTML = Lang.Workspace.no_use;
        listView.appendChild(element);
    }
    func.callerListElement = listView;
    this.listView_.insertBefore(listView, func.listElement);
    this.listView_.insertBefore(func.listElement, listView);
};

/**
 * update list view
 */
Entry.VariableContainer.prototype.updateList = function() {
    if (!this.listView_)
        return;

    this.variableSettingView.addClass('entryRemove');
    this.listSettingView.addClass('entryRemove');

    while (this.listView_.firstChild)
        this.listView_.removeChild(this.listView_.firstChild);

    var viewMode = this.viewMode_;
    var elementList = [];
    if (viewMode == 'all' || viewMode == 'message') {
        if (viewMode == 'message') {
            this.listView_.appendChild(this.messageAddButton_);
        }
        for (var i in this.messages_) {
            var message = this.messages_[i];
            elementList.push(message);
            var view = message.listElement;

            this.listView_.appendChild(view);
            if (message.callerListElement)
                this.listView_.appendChild(message.callerListElement);
        }
    }

    if (viewMode == 'all' || viewMode == 'variable') {
        if (viewMode == 'variable') {
            var info = this.variableAddPanel.info;
            if (info.object && !Entry.playground.object)
                info.object = null;

            this.listView_.appendChild(this.variableAddButton_);
            this.listView_.appendChild(this.variableAddPanel.view);

            this.variableSplitters.top.innerHTML =
                Lang.Workspace.Variable_used_at_all_objects ;
            this.listView_.appendChild(this.variableSplitters.top);
            for (var i in this.variables_) {
                var variable = this.variables_[i];
                if (variable.object_)
                    continue;
                elementList.push(variable);
                var view = variable.listElement;
                this.listView_.appendChild(view);
                if (variable.callerListElement)
                    this.listView_.appendChild(variable.callerListElement);
            }

            this.variableSplitters.bottom.innerHTML =
                Lang.Workspace.Variable_used_at_special_object ;
            this.listView_.appendChild(this.variableSplitters.bottom);
            for (var i in this.variables_) {
                var variable = this.variables_[i];
                if (!variable.object_)
                    continue;
                elementList.push(variable);
                var view = variable.listElement;
                this.listView_.appendChild(view);
                if (variable.callerListElement)
                    this.listView_.appendChild(variable.callerListElement);
            }
            this.updateVariableAddView('variable');
        } else {
            for (var i in this.variables_) {
                var variable = this.variables_[i];
                elementList.push(variable);
                var view = variable.listElement;
                this.listView_.appendChild(view);
                if (variable.callerListElement)
                    this.listView_.appendChild(variable.callerListElement);
            }

        }
    }

    if (viewMode == 'all' || viewMode == 'list') {
        if (viewMode == 'list') {
            var info = this.listAddPanel.info;
            if (info.object && !Entry.playground.object)
                info.object = null;
            this.listView_.appendChild(this.listAddButton_);
            this.listView_.appendChild(this.listAddPanel.view);
            this.variableSplitters.top.innerHTML =
                '모든 오브젝트에서 사용되는 리스트';
            this.listView_.appendChild(this.variableSplitters.top);

            this.updateVariableAddView('list');
            for (var i in this.lists_) {
                var list = this.lists_[i];
                if (list.object_)
                    continue;
                elementList.push(list);
                var view = list.listElement;
                this.listView_.appendChild(view);
                if (list.callerListElement)
                    this.listView_.appendChild(list.callerListElement);
            }
            this.variableSplitters.bottom.innerHTML =
                '특정 오브젝트에서 사용되는 리스트';
            this.listView_.appendChild(this.variableSplitters.bottom);
            for (var i in this.lists_) {
                var list = this.lists_[i];
                if (!list.object_)
                    continue;
                elementList.push(list);
                var view = list.listElement;
                this.listView_.appendChild(view);
                if (list.callerListElement)
                    this.listView_.appendChild(list.callerListElement);
            }
            this.updateVariableAddView('variable');
        } else {
            for (var i in this.lists_) {
                var list = this.lists_[i];
                elementList.push(list);
                var view = list.listElement;
                this.listView_.appendChild(view);
                if (list.callerListElement)
                    this.listView_.appendChild(list.callerListElement);
            }
        }
    }

    if (viewMode == 'all' || viewMode == 'func') {
        if (viewMode == 'func'){
            this.listView_.appendChild(this.functionAddButton_);
        }
        for (var i in this.functions_) {
            var func = this.functions_[i];
            elementList.push(func);
            var view = func.listElement;
            this.listView_.appendChild(view);
            if (func.callerListElement)
                this.listView_.appendChild(func.callerListElement);
        }
    }

    //select the first element(view) if exist
    this.listView_.appendChild(this.variableSettingView);
    this.listView_.appendChild(this.listSettingView);
    if (elementList.length != 0)
        this.select(elementList[0])
    elementList = null;
};


/**
 * @param {!Array.<message model>} objectModels
 */
Entry.VariableContainer.prototype.setMessages = function(messages) {
    for (var i in messages) {
        var message = messages[i];
        if (!message.id)
            message.id = Entry.generateHash();
        this.createMessageView(message);
        this.messages_.push(message);
    }
    Entry.playground.reloadPlayground();
    this.updateList();
};

/**
 * @param {!Array.<variable model>} variables
 */
Entry.VariableContainer.prototype.setVariables = function(variables) {
    var that = this;
    for (var i in variables) {
        var variable = new Entry.Variable(variables[i]);
        var type = variable.getType();
        if (type == 'variable' || type == 'slide') {
            variable.generateView(this.variables_.length);
            this.createVariableView(variable);
            this.variables_.push(variable);
        } else if (type == 'list') {
            variable.generateView(this.lists_.length);
            this.createListView(variable);
            this.lists_.push(variable);
        } else
            that.generateTimer(variable);
    }
    Entry.playground.reloadPlayground();
    this.updateList();
};

/**
 * @param {!Array.<function model>} variables
 */
Entry.VariableContainer.prototype.setFunctions = function(functions) {
    for (var i in functions) {
        var func = new Entry.Func();
        func.init(functions[i]);
        func.generateBlock();
        this.createFunctionView(func);
        this.functions_[func.id] = func;
    }
    this.updateList();
};

/**
 * get func
 * @return {Entry.Func}
 */
Entry.VariableContainer.prototype.getFunction = function(funcId) {
    return this.functions_[funcId];
};

/**
 * get variable on canvas
 * @return {Entry.Variable}
 */
Entry.VariableContainer.prototype.getVariable = function(variableId, entity) {
    var keyName = 'id_';
    var variable = Entry.findObjsByKey(this.variables_, keyName, variableId)[0];
    if (entity && entity.isClone && variable.object_)
        variable = Entry.findObjsByKey(entity.variables, keyName, variableId)[0];

    return variable;
};

/**
 * get variable on canvas
 * @return {Entry.List}
 */
Entry.VariableContainer.prototype.getList = function(listId, entity) {
    var keyName = 'id_';
    var list = Entry.findObjsByKey(this.lists_, keyName, listId)[0];
    if (entity && entity.isClone && list.object_)
        list = Entry.findObjsByKey(entity.lists, keyName, listId)[0];

    return list;
};


/**
 * Create function
 */
Entry.VariableContainer.prototype.createFunction = function() {
    if (Entry.Func.isEdit)
        return;
    var func = new Entry.Func();
    Entry.Func.edit(func);
    this.saveFunction(func);
};

/**
 * Add variable
 * @param {Entry.Variable} variable
 * @return {boolean} return true when success
 */
Entry.VariableContainer.prototype.addFunction = function(variable) {
};

/**
 * Remove variable
 * @param {Entry.Variable} variable
 */
Entry.VariableContainer.prototype.removeFunction = function(func) {
    delete this.functions_[func.id];
    this.updateList();
};

/**
 * @param {Entry.Variable} variable
 * @param {String} name
 */
Entry.VariableContainer.prototype.editFunction = function(variable, name) {
};

/**
 * Save variable
 * @param {Entry.Func} func
 */
Entry.VariableContainer.prototype.saveFunction = function(func) {
    /* add to function list when not exist */
    if (!this.functions_[func.id]) {
        this.functions_[func.id] = func;
        this.createFunctionView(func);
    }
    func.listElement.nameField.innerHTML = func.description;
    this.updateList();
};

/**
 * @param {Entry.Func} func
 */
Entry.VariableContainer.prototype.createFunctionView = function(func) {
    var that = this;
    var view = Entry.createElement('li');
    view.addClass('entryVariableListElementWorkspace');
    view.addClass('entryFunctionElementWorkspace');
    view.bindOnClick(function (e) {
        e.stopPropagation();
        that.select(func);
    });

    var removeButton = Entry.createElement('button');
    removeButton.addClass('entryVariableListElementDeleteWorkspace');
    removeButton.bindOnClick(function(e) {
        e.stopPropagation();
        that.removeFunction(func);
        that.selected = null;
    });

    var editButton = Entry.createElement('button');
    editButton.addClass('entryVariableListElementEditWorkspace');
    editButton.bindOnClick(function (e) {
        e.stopPropagation();
        Entry.Func.edit(func);
        if (Entry.playground) {
            Entry.playground.changeViewMode('code');
            if (Entry.playground.selectedMenu != 'func')
                Entry.playground.selectMenu('func');
        }
    });

    var nameField = Entry.createElement('div');
    nameField.addClass('entryVariableFunctionElementNameWorkspace');
    nameField.innerHTML = func.description;
    view.nameField = nameField;
    view.appendChild(nameField);
    view.appendChild(editButton);
    view.appendChild(removeButton);
    func.listElement = view;
};


/**
 * Add variable
 * @param {Entry.Variable} variable
 * @return {boolean} return true when success
 */
Entry.VariableContainer.prototype.addVariable = function(variable) {
    if (!variable) {
        var variableContainer = this;
        var panel = this.variableAddPanel;
        var name = panel.view.name.value.trim();
        if (!name || name.length == 0)
            name = Lang.Workspace.variable;

        name = Entry.getOrderedName(name, this.variables_, 'name_');
        var info = panel.info;
        variable = {
            name: name,
            isCloud: info.isCloud,
            object: info.object,
            variableType: 'variable'
        };
        panel.view.addClass('entryRemove');
        this.resetVariableAddPanel('variable');
    }
    var variable = new Entry.Variable(variable);
    Entry.stateManager.addCommand("add variable",
                                  this,
                                  this.removeVariable,
                                  variable);
    variable.generateView(this.variables_.length);
    this.createVariableView(variable);
    this.variables_.unshift(variable);
    Entry.playground.reloadPlayground();

    this.updateList();
    variable.listElement.nameField.focus();
    return new Entry.State(this,
                           this.removeVariable,
                           variable);
};

/**
 * Remove variable
 * @param {Entry.Variable} variable
 */
Entry.VariableContainer.prototype.removeVariable = function(variable) {
    var index = this.variables_.indexOf(variable);
    var variableJSON = variable.toJSON();
    Entry.stateManager.addCommand("remove variable",
                                  this,
                                  this.addVariable,
                                  variableJSON);
    if (this.selected == variable)
        this.select(null);
    variable.remove();
    this.variables_.splice(index, 1);
    Entry.playground.reloadPlayground();
    this.updateList();
    return new Entry.State(this,
                           this.addVariable,
                           variableJSON);
};

/**
 * @param {Entry.Variable} variable
 * @param {String} name
 */
Entry.VariableContainer.prototype.changeVariableName = function(variable, name) {
    if (variable.name_ == name)
        return;
    var variables = this.variables_;
    var exist = Entry.isExist(name, 'name_', variables);

    if (exist) {
        variable.listElement.nameField.value = variable.name_;
        Entry.toast.alert(Lang.Workspace.variable_rename_failed,
                           Lang.Workspace.variable_dup);
        return;
    } else if (name.length > 10) {
        variable.listElement.nameField.value = variable.name_;
        Entry.toast.alert(Lang.Workspace.variable_rename_failed,
                           Lang.Workspace.variable_too_long);
        return;
    }
    variable.name_ = name;
    variable.updateView();
    Entry.toast.success(Lang.Workspace.variable_rename,
                        Lang.Workspace.variable_rename_ok);
};

/**
 * @param {Entry.Variable} list
 * @param {String} name
 */
Entry.VariableContainer.prototype.changeListName = function(list, name) {
    if (list.name_ == name)
        return;
    var lists = this.lists_;
    var exist = Entry.isExist(name, 'name_', lists);

    if (exist) {
        list.listElement.nameField.value = list.name_;
        Entry.toast.alert(Lang.Workspace.list_rename_failed,
                           Lang.Workspace.list_dup);
        return;
    } else if (name.length > 10) {
        list.listElement.nameField.value = list.name_;
        Entry.toast.alert(Lang.Workspace.list_rename_failed,
                           Lang.Workspace.list_too_long);
        return;
    }
    list.name_ = name;
    list.updateView();
    Entry.toast.success(Lang.Workspace.list_rename,
                        Lang.Workspace.list_rename_ok);
};

/**
 * Remove list
 * @param {Entry.Variable} list
 */
Entry.VariableContainer.prototype.removeList = function(list) {
    var index = this.lists_.indexOf(list);
    var listJSON = list.toJSON();
    Entry.stateManager.addCommand("remove list",
                                  this,
                                  this.addList,
                                  listJSON);
    if (this.selected == list)
        this.select(null);
    list.remove();
    this.lists_.splice(index, 1);
    Entry.playground.reloadPlayground();
    this.updateList();
    return new Entry.State(this,
                           this.addList,
                           listJSON);
};

/**
 * @param {Entry.Variable} variable
 */
Entry.VariableContainer.prototype.createVariableView = function(variable) {
    var that = this;
    var view = Entry.createElement('li');
    var wrapper = Entry.createElement('div');
    wrapper.addClass('entryVariableListElementWrapperWorkspace');
    view.appendChild(wrapper);
    view.addClass('entryVariableListElementWorkspace');
    if (!variable.object_) {
        if (variable.isCloud_)
            view.addClass('entryVariableCloudElementWorkspace');
        else
            view.addClass('entryVariableGlobalElementWorkspace');
    } else
        view.addClass('entryVariableLocalElementWorkspace');

    view.bindOnClick(function(e) {
        that.select(variable);
    });
    var removeButton = Entry.createElement('button');
    removeButton.addClass('entryVariableListElementDeleteWorkspace');
    removeButton.bindOnClick(function(e) {
        e.stopPropagation();
        that.removeVariable(variable);
        that.selectedVariable = null;
        that.variableSettingView.addClass('entryRemove');
    });

    var editButton = Entry.createElement('button');
    editButton.addClass('entryVariableListElementEditWorkspace');
    editButton.bindOnClick(function (e) {
        e.stopPropagation();
        nameField.removeAttribute('disabled');
        editSaveButton.removeClass('entryRemove');
        this.addClass('entryRemove');
        that.updateSelectedVariable(variable);
        nameField.focus();
    });
    view.editButton = editButton;

    var editSaveButton = Entry.createElement('button');
    editSaveButton.addClass('entryVariableListElementEditWorkspace');
    editSaveButton.addClass('entryRemove');
    editSaveButton.bindOnClick(function (e) {
        e.stopPropagation();
        nameField.blur();
        nameField.setAttribute('disabled', 'disabled');
        editButton.removeClass('entryRemove');
        this.addClass('entryRemove');
        that.updateSelectedVariable(null, 'variable');
    });
    view.editSaveButton = editSaveButton;

    var nameField = Entry.createElement('input');
    nameField.addClass('entryVariableListElementNameWorkspace');
    nameField.setAttribute('disabled', 'disabled');
    nameField.value = variable.name_;
    nameField.bindOnClick(function (e) {
        e.stopPropagation();
    });
    nameField.onblur = function(e) {
        var value = this.value.trim();
        if (!value || value.length == 0) {
            Entry.toast.alert('경고',
                              '변수의 이름은 빈 칸이 될 수 없습니다..');
            this.value = variable.getName();
            return;
        }
        that.changeVariableName(variable, this.value);
    };
    nameField.onkeydown = function(e) {
        if (e.keyCode == 13)
            this.blur();
    };
    view.nameField = nameField;
    wrapper.appendChild(nameField);
    wrapper.appendChild(editButton);
    wrapper.appendChild(editSaveButton);
    wrapper.appendChild(removeButton);
    variable.listElement = view;
};

/**
 * Add event for block
 * @param {message model} message
 * @return {boolean} return true when success
 */
Entry.VariableContainer.prototype.addMessage = function(message) {
    if (!message.id)
        message.id = Entry.generateHash();
    Entry.stateManager.addCommand("add message",
                                  this,
                                  this.removeMessage,
                                  message);
    this.createMessageView(message);
    this.messages_.unshift(message);
    Entry.playground.reloadPlayground();
    this.updateList();
    message.listElement.nameField.focus();
    return new Entry.State(this,
                           this.removeMessage,
                           message);
};

/**
 * Add event
 * @param {message model} message
 */
Entry.VariableContainer.prototype.removeMessage = function(message) {
    if (this.selected == message)
        this.select(null);
    Entry.stateManager.addCommand("remove message",
                                  this,
                                  this.addMessage,
                                  message);
    var index = this.messages_.indexOf(message);
    this.messages_.splice(index, 1);
    this.updateList();
    Entry.playground.reloadPlayground();
    return new Entry.State(this,
                           this.addMessage,
                           message);
};

/**
 * @param {object} message
 * @param {String} name
 */
Entry.VariableContainer.prototype.changeMessageName = function(message, name) {
    if (message.name == name)
        return;
    var messages = this.messages_;
    var exist = Entry.isExist(name, 'name', messages);

    if (exist) {
        message.listElement.nameField.value = message.name;
        Entry.toast.alert(Lang.Workspace.message_rename_failed,
                           Lang.Workspace.message_dup);
        return;
    } else if (name.length > 10) {
        message.listElement.nameField.value = message.name;
        Entry.toast.alert(Lang.Workspace.message_rename_failed,
                           Lang.Workspace.message_too_long);
        return;
    }
    message.name = name;
    Entry.toast.success(Lang.Workspace.message_rename,
                        Lang.Workspace.message_rename_ok);
};

/**
 * @param {object} message
 */
Entry.VariableContainer.prototype.createMessageView = function(message) {
    var that = this;
    var view = Entry.createElement('li');
    view.addClass('entryVariableListElementWorkspace');
    view.addClass('entryMessageElementWorkspace');
    view.bindOnClick(function (e) {
        that.select(message);
    });

    var removeButton = Entry.createElement('button');
    removeButton.addClass('entryVariableListElementDeleteWorkspace');
    removeButton.bindOnClick(function(e) {
        e.stopPropagation();
        that.removeMessage(message);
    });

    var editButton = Entry.createElement('button');
    editButton.addClass('entryVariableListElementEditWorkspace');
    editButton.bindOnClick(function (e) {
        e.stopPropagation();
        nameField.removeAttribute('disabled');
        nameField.focus();
        editSaveButton.removeClass('entryRemove');
        this.addClass('entryRemove');
    });

    var editSaveButton = Entry.createElement('button');
    editSaveButton.addClass('entryVariableListElementEditWorkspace');
    editSaveButton.addClass('entryRemove');
    editSaveButton.bindOnClick(function (e) {
        e.stopPropagation();
        nameField.blur();
        editButton.removeClass('entryRemove');
        this.addClass('entryRemove');
    });

    var nameField = Entry.createElement('input');
    nameField.addClass('entryVariableListElementNameWorkspace');
    nameField.value = message.name;
    nameField.bindOnClick(function (e) {
        e.stopPropagation();
    });
    nameField.onblur = function(e) {
        var value = this.value.trim();
        if (!value || value.length == 0) {
            Entry.toast.alert('경고',
                              '신호의 이름은 빈 칸이 될 수 없습니다..');
            this.value = message.name;
            return;
        }
        that.changeMessageName(message, this.value);
        editButton.removeClass('entryRemove');
        editSaveButton.addClass('entryRemove');
        nameField.setAttribute('disabled', 'disabled');
    };
    nameField.onkeydown = function(e) {
        if (e.keyCode == 13)
            this.blur();
    };
    view.nameField = nameField;
    view.appendChild(nameField);
    view.appendChild(editButton);
    view.appendChild(editSaveButton);
    view.appendChild(removeButton);
    message.listElement = view;
};

/**
 * Add list for block
 * @param {list model} list
 * @return {boolean} return true when success
 */
Entry.VariableContainer.prototype.addList = function(list) {
    if (!list) {
        var variableContainer = this;
        var panel = this.listAddPanel;
        var name = panel.view.name.value.trim();
        if (!name || name.length == 0)
            name = Lang.Workspace.list;

        var info = panel.info;
        name = Entry.getOrderedName(name, this.lists_, 'name_');
        list = {
            name: name,
            isCloud: info.isCloud,
            object: info.object,
            variableType: 'list'
        };
        panel.view.addClass('entryRemove');
        this.resetVariableAddPanel('list');
    }
    var list = new Entry.Variable(list);
    Entry.stateManager.addCommand("add list",
                                  this,
                                  this.removeList,
                                  list);
    list.generateView(this.lists_.length);
    this.createListView(list);
    this.lists_.unshift(list);
    Entry.playground.reloadPlayground();

    this.updateList();
    list.listElement.nameField.focus();
    return new Entry.State(this,
                           this.removelist,
                           list);
};

/**
 * @param {Entry.Variable} list
 */
Entry.VariableContainer.prototype.createListView = function(list) {
    var that = this;
    var view = Entry.createElement('li');
    var wrapper = Entry.createElement('div');
    wrapper.addClass('entryVariableListElementWrapperWorkspace');
    view.appendChild(wrapper);
    view.addClass('entryVariableListElementWorkspace');
    if (!list.object_) {
        if (list.isCloud_)
            view.addClass('entryListCloudElementWorkspace');
        else
            view.addClass('entryListGlobalElementWorkspace');
    } else
        view.addClass('entryListLocalElementWorkspace');

    view.bindOnClick(function (e) {
        that.select(list);
    });

    var removeButton = Entry.createElement('button');
    removeButton.addClass('entryVariableListElementDeleteWorkspace');
    removeButton.bindOnClick(function(e) {
        e.stopPropagation();
        that.removeList(list);
        that.selectedList = null;
        that.listSettingView.addClass('entryRemove');
    });

    var editButton = Entry.createElement('button');
    editButton.addClass('entryVariableListElementEditWorkspace');
    editButton.bindOnClick(function (e) {
        e.stopPropagation();
        nameField.removeAttribute('disabled');
        editSaveButton.removeClass('entryRemove');
        this.addClass('entryRemove');
        that.updateSelectedVariable(list);
        nameField.focus();
    });
    view.editButton = editButton;

    var editSaveButton = Entry.createElement('button');
    editSaveButton.addClass('entryVariableListElementEditWorkspace');
    editSaveButton.addClass('entryRemove');
    editSaveButton.bindOnClick(function (e) {
        e.stopPropagation();
        nameField.blur();
        nameField.setAttribute('disabled', 'disabled');
        editButton.removeClass('entryRemove');
        this.addClass('entryRemove');
        that.select(list);
        that.updateSelectedVariable(null, 'list');
    });
    view.editSaveButton = editSaveButton;

    var nameField = Entry.createElement('input');
    nameField.setAttribute('disabled', 'disabled');
    nameField.addClass('entryVariableListElementNameWorkspace');
    nameField.value = list.name_;
    nameField.bindOnClick(function (e) {
        e.stopPropagation();
    });
    nameField.onblur = function(e) {
        var value = this.value.trim();
        if (!value || value.length == 0) {
            Entry.toast.alert('경고',
                              '리스트의 이름은 빈 칸이 될 수 없습니다..');
            this.value = list.getName();
            return;
        }
        that.changeListName(list, this.value);
    };
    nameField.onkeydown = function(e) {
        if (e.keyCode == 13)
            this.blur();
    };
    view.nameField = nameField;
    wrapper.appendChild(nameField);
    wrapper.appendChild(editButton);
    wrapper.appendChild(editSaveButton);
    wrapper.appendChild(removeButton);
    list.listElement = view;
};

/**
 * Apply map function to variables. But this not replace object with returned one.
 * So giving map function don't have to return object.
 * And this support another arguments.
 * @param {!function} mapFunction
 * @param {} param
 */
Entry.VariableContainer.prototype.mapVariable = function(mapFunction, param) {
    var length = this.variables_.length;
    for (var i = 0; i<length; i++) {
        var variable = this.variables_[i];
        mapFunction(variable, param);
    }
};

/**
 * @param {!function} mapFunction
 * @param {} param
 */
Entry.VariableContainer.prototype.mapList = function(mapFunction, param) {
    var length = this.lists_.length;
    for (var i = 0; i<length; i++) {
        var list = this.lists_[i];
        mapFunction(list, param);
    }
};

/**
 * convert this variable's data to JSON.
 * @return {JSON}
 */
Entry.VariableContainer.prototype.getVariableJSON = function() {
    var json = [];
    for (var i = 0; i<this.variables_.length; i++) {
        var variable = this.variables_[i];
        json.push(variable.toJSON());
    };
    for (var i = 0; i<this.lists_.length; i++) {
        var list = this.lists_[i];
        json.push(list.toJSON());
    };

    if (Entry.engine.projectTimer)
        json.push(Entry.engine.projectTimer);
    return json;
};

/**
 * convert this message's data to JSON.
 * @return {JSON}
 */
Entry.VariableContainer.prototype.getMessageJSON = function() {
    var json = [];
    for (var i = 0; i<this.messages_.length; i++) {
        var message = {
            id: this.messages_[i].id,
            name: this.messages_[i].name
        };
        json.push(message);
    };
    return json;
};

/**
 * convert this function's data to JSON.
 * @return {JSON}
 */
Entry.VariableContainer.prototype.getFunctionJSON = function() {
    var json = [];
    for (var i in this.functions_) {
        var func = this.functions_[i];
        var funcJSON = {
            id: func.id,
            block: Blockly.Xml.domToText(func.block),
            content: Blockly.Xml.domToText(func.content)
        };
        json.push(funcJSON);
    };
    return json;
}

Entry.VariableContainer.prototype.resetVariableAddPanel = function(type) {
    type = type || 'variable';
    var panel = type == 'variable' ? this.variableAddPanel : this.listAddPanel;
    var info = panel.info;
    info.isCloud = false,
    info.object = null;
    panel.view.name.value = '';
    panel.isOpen = false;
    this.updateVariableAddView(type);
}

Entry.VariableContainer.prototype.generateVariableAddView = function() {
    var that = this;
    var variableAddSpace = Entry.createElement('li');
    this.variableAddPanel.view = variableAddSpace;
    this.variableAddPanel.isOpen = false;
    variableAddSpace.addClass('entryVariableAddSpaceWorkspace');
    variableAddSpace.addClass('entryRemove');

    var addSpaceNameWrapper = Entry.createElement('div');
    addSpaceNameWrapper.addClass('entryVariableAddSpaceNameWrapperWorkspace');
    variableAddSpace.appendChild(addSpaceNameWrapper);

    var addSpaceInput = Entry.createElement('input');
    addSpaceInput.addClass('entryVariableAddSpaceInputWorkspace');
    addSpaceInput.setAttribute('placeholder', Lang.Workspace.Variable_placeholder_name );
    addSpaceInput.variableContainer = this;
    addSpaceInput.onkeypress = function (e) {
        if (e.keyCode == 13) {
            var variableContainer = this.variableContainer;
            var panel = variableContainer.variableAddPanel;

            Entry.variableContainer.addVariable();
            that.updateSelectedVariable(that.variables_[0]);
            var view = that.variables_[0].listElement;
            view.editButton.addClass('entryRemove');
            view.editSaveButton.removeClass('entryRemove');
            view.nameField.removeAttribute('disabled');
            view.nameField.focus();
        }
    }
    this.variableAddPanel.view.name = addSpaceInput;
    addSpaceNameWrapper.appendChild(addSpaceInput);

    var addSpaceGlobalWrapper = Entry.createElement('div');
    addSpaceGlobalWrapper.addClass('entryVariableAddSpaceGlobalWrapperWorkspace');
    addSpaceGlobalWrapper.bindOnClick(function (e) {
        var info = that.variableAddPanel.info;
        info.object = null;
        that.updateVariableAddView('variable');
    });
    variableAddSpace.appendChild(addSpaceGlobalWrapper);


    var addVariableGlobalSpan = Entry.createElement('span');
    addVariableGlobalSpan.innerHTML = Lang.Workspace.Variable_use_all_objects;
    addSpaceGlobalWrapper.appendChild(addVariableGlobalSpan);


    var addVariableGlobalCheck = Entry.createElement('span');
    addVariableGlobalCheck.addClass('entryVariableAddSpaceCheckWorkspace');
    this.variableAddPanel.view.globalCheck = addVariableGlobalCheck;
    if (!this.variableAddPanel.info.object)
        addVariableGlobalCheck.addClass('entryVariableAddChecked');
    addSpaceGlobalWrapper.appendChild(addVariableGlobalCheck);


    var addSpaceLocalWrapper = Entry.createElement('div');
    addSpaceLocalWrapper.addClass('entryVariableAddSpaceLocalWrapperWorkspace');
    addSpaceLocalWrapper.bindOnClick(function (e) {
        if (!Entry.playground.object)
            return;
        var info = that.variableAddPanel.info;
        info.object = Entry.playground.object.id;
        info.isCloud = false;
        that.updateVariableAddView('variable');
    });
    variableAddSpace.appendChild(addSpaceLocalWrapper);
    var addVariableLocalSpan = Entry.createElement('span');
    addVariableLocalSpan.innerHTML = Lang.Workspace.Variable_use_this_object;
    addSpaceLocalWrapper.appendChild(addVariableLocalSpan);


    var addVariableLocalCheck = Entry.createElement('span');
    addVariableLocalCheck.addClass('entryVariableAddSpaceCheckWorkspace');
    this.variableAddPanel.view.localCheck = addVariableLocalCheck;
    if (this.variableAddPanel.info.object)
        addVariableLocalCheck.addClass('entryVariableAddChecked');
    addSpaceLocalWrapper.appendChild(addVariableLocalCheck);


    var addSpaceCloudWrapper = Entry.createElement('div');
    variableAddSpace.cloudWrapper = addSpaceCloudWrapper;
    addSpaceCloudWrapper.addClass('entryVariableAddSpaceCloudWrapperWorkspace');
    addSpaceCloudWrapper.bindOnClick(function (e) {
        var info = that.variableAddPanel.info;
        if (info.object)
            return;

        info.isCloud = !info.isCloud;
        that.updateVariableAddView('variable');
    });
    variableAddSpace.appendChild(addSpaceCloudWrapper);
    var addSpaceCloudSpan = Entry.createElement('span');
    addSpaceCloudSpan.addClass('entryVariableAddSpaceCloudSpanWorkspace');
    addSpaceCloudSpan.innerHTML = '클라우드 변수로 사용 <br>(서버에 저장됩니다)';
    addSpaceCloudWrapper.appendChild(addSpaceCloudSpan);
    var addVariableCloudCheck = Entry.createElement('span');
    this.variableAddPanel.view.cloudCheck = addVariableCloudCheck;
    addVariableCloudCheck.addClass('entryVariableAddSpaceCheckWorkspace');
    addVariableCloudCheck.addClass('entryVariableAddSpaceCloudCheckWorkspace');
    if (this.variableAddPanel.info.isCloud)
        addVariableCloudCheck.addClass('entryVariableAddChecked');

    addSpaceCloudWrapper.appendChild(addVariableCloudCheck);

    var addSpaceButtonWrapper = Entry.createElement('div');
    addSpaceButtonWrapper.addClass('entryVariableAddSpaceButtonWrapperWorkspace');
    variableAddSpace.appendChild(addSpaceButtonWrapper);

    var addSpaceCancelButton = Entry.createElement('span');
    addSpaceCancelButton.addClass('entryVariableAddSpaceCancelWorkspace');
    addSpaceCancelButton.addClass('entryVariableAddSpaceButtonWorkspace');
    addSpaceCancelButton.innerHTML = Lang.Buttons.cancel;
    addSpaceCancelButton.bindOnClick(function (e) {
        that.variableAddPanel.view.addClass('entryRemove');
        that.resetVariableAddPanel('variable');
    });
    addSpaceButtonWrapper.appendChild(addSpaceCancelButton);

    var addSpaceConfirmButton = Entry.createElement('span');
    addSpaceConfirmButton.addClass('entryVariableAddSpaceConfirmWorkspace');
    addSpaceConfirmButton.addClass('entryVariableAddSpaceButtonWorkspace');
    addSpaceConfirmButton.innerHTML = Lang.Buttons.save;
    addSpaceConfirmButton.variableContainer = this;
    addSpaceConfirmButton.bindOnClick(function (e) {
        var variableContainer = this.variableContainer;
        var panel = variableContainer.variableAddPanel;

        Entry.variableContainer.addVariable();
        that.updateSelectedVariable(that.variables_[0]);
        var view = that.variables_[0].listElement;
        view.editButton.addClass('entryRemove');
        view.editSaveButton.removeClass('entryRemove');
        view.nameField.removeAttribute('disabled');
        view.nameField.focus();
    });
    addSpaceButtonWrapper.appendChild(addSpaceConfirmButton);
}

Entry.VariableContainer.prototype.generateListAddView = function() {
    var that = this;
    var listAddSpace = Entry.createElement('li');
    this.listAddPanel.view = listAddSpace;
    this.listAddPanel.isOpen = false;
    listAddSpace.addClass('entryVariableAddSpaceWorkspace');
    listAddSpace.addClass('entryRemove');

    var addSpaceNameWrapper = Entry.createElement('div');
    addSpaceNameWrapper.addClass('entryVariableAddSpaceNameWrapperWorkspace');
    addSpaceNameWrapper.addClass('entryListAddSpaceNameWrapperWorkspace');
    listAddSpace.appendChild(addSpaceNameWrapper);

    var addSpaceInput = Entry.createElement('input');
    addSpaceInput.addClass('entryVariableAddSpaceInputWorkspace');
    addSpaceInput.setAttribute('placeholder', '리스트 이름');
    this.listAddPanel.view.name = addSpaceInput;
    addSpaceInput.variableContainer = this;
    addSpaceInput.onkeypress = function (e) {
        if (e.keyCode == 13) {
            that.addList();
            var list = that.lists_[0];
            that.updateSelectedVariable(list);
            var view = list.listElement;
            view.editButton.addClass('entryRemove');
            view.editSaveButton.removeClass('entryRemove');
            view.nameField.removeAttribute('disabled');
            view.nameField.focus();
        }
    }
    addSpaceNameWrapper.appendChild(addSpaceInput);

    var addSpaceGlobalWrapper = Entry.createElement('div');
    addSpaceGlobalWrapper.addClass('entryVariableAddSpaceGlobalWrapperWorkspace');
    addSpaceGlobalWrapper.bindOnClick(function (e) {
        var info = that.listAddPanel.info;
        info.object = null;
        that.updateVariableAddView('list');
    });
    listAddSpace.appendChild(addSpaceGlobalWrapper);


    var addListGlobalSpan = Entry.createElement('span');
    addListGlobalSpan.innerHTML = '모든 오브젝트에서 사용';
    addSpaceGlobalWrapper.appendChild(addListGlobalSpan);


    var addListGlobalCheck = Entry.createElement('span');
    addListGlobalCheck.addClass('entryVariableAddSpaceCheckWorkspace');
    this.listAddPanel.view.globalCheck = addListGlobalCheck;
    if (!this.listAddPanel.info.object)
        addListGlobalCheck.addClass('entryVariableAddChecked');
    addSpaceGlobalWrapper.appendChild(addListGlobalCheck);


    var addSpaceLocalWrapper = Entry.createElement('div');
    addSpaceLocalWrapper.addClass('entryVariableAddSpaceLocalWrapperWorkspace');
    addSpaceLocalWrapper.bindOnClick(function (e) {
        if (!Entry.playground.object)
            return;
        var info = that.listAddPanel.info;
        info.object = Entry.playground.object.id;
        info.isCloud = false;
        that.updateVariableAddView('list');
    });
    listAddSpace.appendChild(addSpaceLocalWrapper);
    var addListLocalSpan = Entry.createElement('span');
    addListLocalSpan.innerHTML = '이 오브젝트에서 사용';
    addSpaceLocalWrapper.appendChild(addListLocalSpan);


    var addListLocalCheck = Entry.createElement('span');
    addListLocalCheck.addClass('entryVariableAddSpaceCheckWorkspace');
    this.listAddPanel.view.localCheck = addListLocalCheck;
    if (this.variableAddPanel.info.object)
        addVariableLocalCheck.addClass('entryVariableAddChecked');
    addSpaceLocalWrapper.appendChild(addListLocalCheck);


    var addSpaceCloudWrapper = Entry.createElement('div');
    listAddSpace.cloudWrapper = addSpaceCloudWrapper;
    addSpaceCloudWrapper.addClass('entryVariableAddSpaceCloudWrapperWorkspace');
    addSpaceCloudWrapper.bindOnClick(function (e) {
        var info = that.listAddPanel.info;
        if (info.object)
            return;

        info.isCloud = !info.isCloud;
        that.updateVariableAddView('list');
    });
    listAddSpace.appendChild(addSpaceCloudWrapper);
    var addSpaceCloudSpan = Entry.createElement('span');
    addSpaceCloudSpan.addClass('entryVariableAddSpaceCloudSpanWorkspace');
    addSpaceCloudSpan.innerHTML = '클라우드 변수로 사용 <br>(서버에 저장됩니다)';
    addSpaceCloudWrapper.appendChild(addSpaceCloudSpan);
    var addListCloudCheck = Entry.createElement('span');
    this.listAddPanel.view.cloudCheck = addListCloudCheck;
    addListCloudCheck.addClass('entryVariableAddSpaceCheckWorkspace');
    addListCloudCheck.addClass('entryVariableAddSpaceCloudCheckWorkspace');
    if (this.listAddPanel.info.isCloud)
        addListCloudCheck.addClass('entryVariableAddChecked');

    addSpaceCloudWrapper.appendChild(addListCloudCheck);

    var addSpaceButtonWrapper = Entry.createElement('div');
    addSpaceButtonWrapper.addClass('entryVariableAddSpaceButtonWrapperWorkspace');
    listAddSpace.appendChild(addSpaceButtonWrapper);

    var addSpaceCancelButton = Entry.createElement('span');
    addSpaceCancelButton.addClass('entryVariableAddSpaceCancelWorkspace');
    addSpaceCancelButton.addClass('entryVariableAddSpaceButtonWorkspace');
    addSpaceCancelButton.innerHTML = '취소';
    addSpaceCancelButton.bindOnClick(function (e) {
        that.listAddPanel.view.addClass('entryRemove');
        that.resetVariableAddPanel('list');
    });
    addSpaceButtonWrapper.appendChild(addSpaceCancelButton);

    var addSpaceConfirmButton = Entry.createElement('span');
    addSpaceConfirmButton.addClass('entryVariableAddSpaceConfirmWorkspace');
    addSpaceConfirmButton.addClass('entryVariableAddSpaceButtonWorkspace');
    addSpaceConfirmButton.innerHTML = '확인';
    addSpaceConfirmButton.variableContainer = this;
    addSpaceConfirmButton.bindOnClick(function (e) {
        that.addList();
        var list = that.lists_[0];
        that.updateSelectedVariable(list);
        var view = list.listElement;
        view.editButton.addClass('entryRemove');
        view.editSaveButton.removeClass('entryRemove');
        view.nameField.removeAttribute('disabled');
        view.nameField.focus();
    });
    addSpaceButtonWrapper.appendChild(addSpaceConfirmButton);
}

Entry.VariableContainer.prototype.generateVariableSplitterView = function() {
    var topSplitter = Entry.createElement('li');
    topSplitter.addClass('entryVariableSplitterWorkspace');
    var bottomSplitter = Entry.createElement('li');
    bottomSplitter.addClass('entryVariableSplitterWorkspace');

    this.variableSplitters = {
        top: topSplitter,
        bottom: bottomSplitter
    }
}

Entry.VariableContainer.prototype.openVariableAddPanel = function(type) {
    type = type ? type : 'variable';
    Entry.playground.toggleOnVariableView();
    Entry.playground.changeViewMode('variable');
    if (type == 'variable') {
        this.variableAddPanel.isOpen = true;
        this.selectFilter(type);
    } else {
        this.listAddPanel.isOpen = true;
        this.selectFilter(type);
    }
    this.updateVariableAddView(type);
};

Entry.VariableContainer.prototype.getMenuXml = function(xmlList) {
    var blocks = [];
    var hasVariable = this.variables_.length != 0;
    var hasList = this.lists_.length != 0;
    for (var i = 0, xml; xml = xmlList[i]; i++) {
        var tagName = xml.tagName;
        if (tagName && tagName.toUpperCase() == 'BLOCK') {
        var category = xml.getAttribute('bCategory');
        if (!hasVariable && category == 'variable')
            continue;
        if (!hasList && category == 'list')
            continue;
        blocks.push(xml);
      } else if (tagName && (tagName.toUpperCase() == 'SPLITTER' ||
            tagName.toUpperCase() == 'BTN')) {
            if (!hasVariable && category == 'variable')
                continue;
            if (!hasList&& category == 'list')
                continue;
            blocks.push(xml);
      }
    }
    return blocks;
}

Entry.VariableContainer.prototype.addCloneLocalVariables = function (param) {
    var variables = [];
    var that = this;
    this.mapVariable(function (variable, param) {
        if (variable.object_ && (variable.object_ == param.objectId)) {
            var newVar = variable.toJSON();
            newVar.originId = newVar.id;
            newVar.id = Entry.generateHash();
            newVar.object = param.newObjectId;
            delete newVar.x;
            delete newVar.y;
            variables.push(newVar);
            param.json.script = param.json.script.replace(newVar.originId, newVar.id);
        }
    }, param);

    variables.map(function (variable) {
        that.addVariable(variable);
    });
}

Entry.VariableContainer.prototype.generateTimer = function (timer) {
    if (!timer) {
        timer = {};
        timer.id = Entry.generateHash();
        timer.name = Lang.Workspace.Variable_Timer;
        timer.value = 0;
        timer.variableType = 'timer';
        timer.visible = false;
        timer.x = -45;
        timer.y = 2;
        timer = new Entry.Variable(timer);
    }

    timer.generateView();
    timer.tick = null;
    Entry.engine.projectTimer = timer;

    Entry.addEventListener('run', function () {
        Entry.engine.toggleProjectTimer();
    });
    Entry.addEventListener('stop', function () {
        Entry.engine.toggleProjectTimer();
    });
}

Entry.VariableContainer.prototype.generateVariableSettingView = function () {
    var that = this;
    var element = Entry.createElement('div');
    element.bindOnClick(function (e) {
        e.stopPropagation();
    });
    this.variableSettingView = element;
    element.addClass('entryVariableSettingWorkspace');
    this.listView_.appendChild(element);
    element.addClass('entryRemove');

    var visibleWrapper = Entry.createElement('div');
    visibleWrapper.addClass('entryVariableSettingVisibleWrapperWorkspace');
    visibleWrapper.bindOnClick(function (e) {
        var v = that.selectedVariable;
        var view = that.variableSettingView.visibleCheck;
        v.setVisible(!v.isVisible());

        if (v.isVisible())
            view.addClass('entryVariableSettingChecked');
        else
            view.removeClass('entryVariableSettingChecked');
    });
    element.appendChild(visibleWrapper);
    var visibleSpan = Entry.createElement('span');
    visibleSpan.innerHTML = '변수 보이기';
    visibleWrapper.appendChild(visibleSpan);
    var visibleCheck = Entry.createElement('span');
    visibleCheck.addClass('entryVariableSettingCheckWorkspace');
    element.visibleCheck = visibleCheck;
    visibleWrapper.appendChild(visibleCheck);

    var initValueWrapper = Entry.createElement('div');
    initValueWrapper.addClass('entryVariableSettingInitValueWrapperWorkspace');
    element.appendChild(initValueWrapper);
    var initValueSpan = Entry.createElement('span');
    initValueSpan.innerHTML = '기본값';
    initValueWrapper.appendChild(initValueSpan);
    var initValueInput = Entry.createElement('input');
    initValueInput.addClass('entryVariableSettingInitValueInputWorkspace');
    element.initValueInput = initValueInput;
    initValueInput.value = 0;
    initValueInput.onkeyup = function (e) {
        var v = that.selectedVariable;
        var value = this.value;
        v.setValue(this.value);
    }
    initValueInput.onblur = function (e) {
        var v = that.selectedVariable;
        var value = this.value;
        v.setValue(this.value);
    }
    element.initValueInput = initValueInput;
    initValueWrapper.appendChild(initValueInput);

    var splitter = Entry.createElement('div');
    splitter.addClass('entryVariableSettingSplitterWorkspace');
    element.appendChild(splitter);

    var slideWrapper = Entry.createElement('div');
    slideWrapper.addClass('entryVariableSettingSlideWrapperWorkspace');
    element.appendChild(slideWrapper);
    var slideSpan = Entry.createElement('span');
    slideSpan.innerHTML = '슬라이드';
    slideWrapper.appendChild(slideSpan);
    var slideCheck = Entry.createElement('span');
    slideCheck.addClass('entryVariableSettingCheckWorkspace');
    element.slideCheck = slideCheck;
    slideWrapper.appendChild(slideCheck);
    slideWrapper.bindOnClick(function (e) {
        var v = that.selectedVariable;
        var variables = that.variables_;
        var type = v.getType();
        if (type == 'variable') {
            var variableJSON = v.toJSON();
            variableJSON.variableType = 'slide';
            var newVariable = new Entry.Variable(variableJSON);
            variables.splice(variables.indexOf(v), 0, newVariable);
            if (newVariable.getValue() < 0)
                newVariable.setValue(0);
            if (newVariable.getValue() > 100)
                newVariable.setValue(100);
            minValueInput.removeAttribute('disabled');
            maxValueInput.removeAttribute('disabled');
        } else if (type == 'slide') {
            var variableJSON = v.toJSON();
            variableJSON.variableType = 'variable';
            var newVariable = new Entry.Variable(variableJSON);
            variables.splice(variables.indexOf(v), 0, newVariable);
            minValueInput.setAttribute('disabled', 'disabled');
            maxValueInput.setAttribute('disabled', 'disabled');
        }
        that.createVariableView(newVariable);
        that.removeVariable(v);
        that.updateSelectedVariable(newVariable);
        newVariable.generateView();
    });

    var minMaxWrapper = Entry.createElement('div');
    element.minMaxWrapper = minMaxWrapper;
    minMaxWrapper.addClass('entryVariableSettingMinMaxWrapperWorkspace');
    element.appendChild(minMaxWrapper);
    var minValueSpan = Entry.createElement('span');
    minValueSpan.innerHTML = '최소값';
    minMaxWrapper.appendChild(minValueSpan);
    var minValueInput = Entry.createElement('input');
    minValueInput.addClass('entryVariableSettingMinValueInputWorkspace');
    var v = that.selectedVariable;
    if (v && v.type == 'slide')
        minValueInput.value = v.minValue_;
    else
        minValueInput.value = 0;
    minValueInput.onblur = function (e) {
        if (!isNaN(this.value)) {
            var v = that.selectedVariable;
            v.setMinValue(Number(this.value));
            that.updateVariableSettingView(v);
        }

    }
    element.minValueInput = minValueInput;
    minMaxWrapper.appendChild(minValueInput);

    var maxValueSpan = Entry.createElement('span');
    maxValueSpan.addClass('entryVariableSettingMaxValueSpanWorkspace');
    maxValueSpan.innerHTML = '최대값';
    minMaxWrapper.appendChild(maxValueSpan);
    var maxValueInput = Entry.createElement('input');
    maxValueInput.addClass('entryVariableSettingMaxValueInputWorkspace');
    if (v && v.type == 'slide')
        maxValueInput.value = v.maxValue_;
    else
        maxValueInput.value = 100;
    maxValueInput.onblur = function (e) {
        if (!isNaN(this.value)) {
            var v = that.selectedVariable;
            v.setMaxValue(Number(this.value));
            that.updateVariableSettingView(v);
        }
    }
    element.maxValueInput = maxValueInput;
    minMaxWrapper.appendChild(maxValueInput);
}


/**
 * @param {object|Entry.Variable} object
 */
Entry.VariableContainer.prototype.updateVariableSettingView = function(v) {
    var view = this.variableSettingView,
        visibleCheck = view.visibleCheck,
        initValue = view.initValueInput,
        slide = view.slideCheck,
        minValue = view.minValueInput,
        maxValue = view.maxValueInput,
        minMaxWrapper = view.minMaxWrapper;

    visibleCheck.removeClass('entryVariableSettingChecked');
    if (v.isVisible())
        visibleCheck.addClass('entryVariableSettingChecked');

    slide.removeClass('entryVariableSettingChecked');
    if (v.getType() == 'slide') {
        slide.addClass('entryVariableSettingChecked');
        minValue.removeAttribute('disabled');
        maxValue.removeAttribute('disabled');
        minValue.value = v.getMinValue();
        maxValue.value = v.getMaxValue();
        minMaxWrapper.removeClass('entryVariableMinMaxDisabledWorkspace');
    } else {
        minMaxWrapper.addClass('entryVariableMinMaxDisabledWorkspace');
        minValue.setAttribute('disabled', 'disabled');
        maxValue.setAttribute('disabled', 'disabled');
    }

    initValue.value = v.getValue();
    v.listElement.appendChild(view);

    view.removeClass('entryRemove');
};

Entry.VariableContainer.prototype.generateListSettingView = function () {
    var that = this;
    var element = Entry.createElement('div');
    element.bindOnClick(function (e) {
        e.stopPropagation();
    });
    this.listSettingView = element;
    element.addClass('entryListSettingWorkspace');
    this.listView_.appendChild(element);
    element.addClass('entryRemove');

    var visibleWrapper = Entry.createElement('div');
    visibleWrapper.addClass('entryListSettingVisibleWrapperWorkspace');
    visibleWrapper.bindOnClick(function (e) {
        var v = that.selectedList;
        var view = that.listSettingView.visibleCheck;
        v.setVisible(!v.isVisible());

        if (v.isVisible())
            view.addClass('entryListSettingCheckedWorkspace');
        else
            view.removeClass('entryListSettingCheckedWorkspace');
    });
    element.appendChild(visibleWrapper);
    var visibleSpan = Entry.createElement('span');
    visibleSpan.innerHTML = '리스트 보이기';
    visibleWrapper.appendChild(visibleSpan);
    var visibleCheck = Entry.createElement('span');
    visibleCheck.addClass('entryListSettingCheckWorkspace');
    element.visibleCheck = visibleCheck;
    visibleWrapper.appendChild(visibleCheck);


    var lengthWrapper = Entry.createElement('div');
    lengthWrapper.addClass('entryListSettingLengthWrapperWorkspace');
    var lengthSpan = Entry.createElement('span');
    lengthSpan.addClass('entryListSettingLengthSpanWorkspace');
    lengthSpan.innerHTML = '리스트 길이';
    lengthWrapper.appendChild(lengthSpan);
    element.appendChild(lengthWrapper);
    var lengthController = Entry.createElement('div');
    lengthController.addClass('entryListSettingLengthControllerWorkspace');
    lengthWrapper.appendChild(lengthController);
    var minus = Entry.createElement('span');
    minus.addClass('entryListSettingMinusWorkspace');
    minus.bindOnClick(function (e) {
        var v = that.selectedList;
        var arr = that.selectedList.array_;
        arr.pop();
        that.updateListSettingView(that.selectedList);
    });
    lengthController.appendChild(minus);
    var lengthInput = Entry.createElement('input');
    lengthInput.addClass('entryListSettingLengthInputWorkspace');
    lengthInput.setAttribute('disabled', 'disabled');
    lengthInput.onblur = function () {
        that.setListLength(this.value);
    }

    lengthInput.onkeypress = function (e) {
        if (e.keyCode == 13)
            this.blur();
    }
    element.lengthInput = lengthInput;
    lengthController.appendChild(lengthInput);
    var plus = Entry.createElement('span');
    plus.addClass('entryListSettingPlusWorkspace');
    plus.bindOnClick(function (e) {
        var v = that.selectedList;
        var arr = that.selectedList.array_;
        arr.push({data: 0});
        that.updateListSettingView(that.selectedList);
    });
    lengthController.appendChild(plus);
    var seperator = Entry.createElement('div');
    element.seperator = seperator;
    element.appendChild(seperator);
    seperator.addClass('entryListSettingSeperatorWorkspace');

    var listValues = Entry.createElement('div');
    listValues.addClass('entryListSettingListValuesWorkspace');
    element.listValues = listValues;
    element.appendChild(listValues);
}

Entry.VariableContainer.prototype.updateListSettingView = function(list) {
    var that = this;
    list = list || this.selectedList;
    var view = this.listSettingView,
        listValues = view.listValues,
        visibleCheck = view.visibleCheck,
        lengthInput = view.lengthInput,
        seperator = view.seperator;

    visibleCheck.removeClass('entryListSettingCheckedWorkspace');
    if (list.isVisible())
        visibleCheck.addClass('entryListSettingCheckedWorkspace');

    lengthInput.value = list.array_.length;
    list.listElement.appendChild(view);

    while(listValues.firstChild)
        listValues.removeChild(listValues.firstChild);

    var arr = list.array_;
    if (arr.length == 0)
        seperator.addClass('entryRemove');
    else
        seperator.removeClass('entryRemove');

    for (var i=0; i<arr.length; i++) {
        (function (i) {
             var wrapper = Entry.createElement('div');
             wrapper.addClass('entryListSettingValueWrapperWorkspace');
             var numberSpan = Entry.createElement('span');
             numberSpan.addClass('entryListSettingValueNumberSpanWorkspace');
             numberSpan.innerHTML = i+1;
             wrapper.appendChild(numberSpan);
             var input = Entry.createElement('input');
             input.value = arr[i].data;
             input.onblur = function () {
                 arr[i].data = this.value;
                 list.updateView();
             }
             input.onkeypress = function (e) {
                 if (e.keyCode == 13)
                     this.blur();
             }
             input.addClass('entryListSettingEachInputWorkspace');
             wrapper.appendChild(input);
             var removeButton = Entry.createElement('span');
             removeButton.bindOnClick(function () {
                 arr.splice(i,1);
                 that.updateListSettingView();
             });
             removeButton.addClass('entryListSettingValueRemoveWorkspace');
             wrapper.appendChild(removeButton);
             listValues.appendChild(wrapper);
        })(i);
    }

    list.updateView();
    view.removeClass('entryRemove');
};

Entry.VariableContainer.prototype.setListLength = function(value) {
    value = Number(value);
    var arr = this.selectedList.array_;
    if (!isNaN(value)) {
        var arrLen = arr.length;
        if (arrLen < value) {
            var len = value - arrLen;
            for (var i=0; i<len; i++)
                arr.push({data: 0});
        } else if (arrLen > value) {
            arr.length = value;
        }
    }
    this.updateListSettingView();
}

Entry.VariableContainer.prototype.updateViews = function() {
    var variables = this.variables_,
        lists = this.lists_;

    variables.map(function (v) {
        v.updateView();
    });

    lists.map(function (l) {
        l.updateView();
    });
}

Entry.VariableContainer.prototype.updateSelectedVariable = function(object, type) {
    if (!object) {
        type = type || 'variable';
        this.selectedVariable = null;
        if (type == 'variable')
            this.variableSettingView.addClass('entryRemove');
        else
            this.listSettingView.addClass('entryRemove');
    } else if (object.type == 'variable') {
        this.selectedVariable = object;
        this.updateVariableSettingView(object);
    } else if (object.type == 'slide') {
        this.selectedVariable = object;
        this.updateVariableSettingView(object);
    } else if (object.type == 'list') {
        this.selectedList = object;
        this.updateListSettingView(object);
    }
}

Entry.VariableContainer.prototype.removeLocalVariables = function (objectId) {
    var variables = [];
    var that = this;
    this.mapVariable(function (variable, objectId) {
        if (variable.object_ &&
            (variable.object_ == objectId))
            variables.push(variable);
    }, objectId);

    variables.map(function (variable) {
        that.removeVariable(variable);
    });
}
