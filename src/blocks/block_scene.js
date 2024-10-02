"use strict";

Blockly.Blocks.when_scene_start = {
    init: function() {
    this.setColour("#189FC1");
    this.appendDummyInput()
        .appendField(new Blockly.FieldIcon('/img/assets/block_icon/start_icon_scene.png', '*', "start"))
        .appendField(Lang.Blocks.SCENE_when_scene_start);
    this.setInputsInline(true);
    this.setNextStatement(true);
    this.setTooltip('');
  }
};

Entry.block.when_scene_start = function (sprite, script) {
    return script.callReturn();
};

Blockly.Blocks.start_scene = {
  init: function() {
    this.setColour("#189FC1");
    this.appendDummyInput()
        .appendField(Lang.Blocks.SCENE_start_scene_1)
        .appendField(new Blockly.FieldDropdownDynamic("scenes"), "VALUE")
        .appendField(Lang.Blocks.SCENE_start_scene_2)
        .appendField(new Blockly.FieldIcon('/img/assets/block_icon/entry_icon_scene.png', '*'));
    this.setInputsInline(true);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setTooltip('');
  }
};

Entry.block.start_scene = function (sprite, script) {
    var value = script.getField("VALUE", script);
    var scene = Entry.scene.getSceneById(value);
    if (scene) {
        Entry.scene.selectScene(scene);
        Entry.engine.fireEvent('when_scene_start');
    }
    return null;
};


Blockly.Blocks.start_neighbor_scene = {
  init: function() {
    this.setColour("#189FC1");
    this.appendDummyInput()
        .appendField(Lang.Blocks.SCENE_start_neighbor_scene_1)
        .appendField(new Blockly.FieldDropdown([
          [Lang.Blocks.SCENE_start_scene_pre,"pre"],
          [Lang.Blocks.SCENE_start_scene_next,"next"]
          ]), "OPERATOR")
        .appendField(Lang.Blocks.SCENE_start_neighbor_scene_2)
        .appendField(new Blockly.FieldIcon('/img/assets/block_icon/entry_icon_scene.png', '*'));
    this.setInputsInline(true);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setTooltip('');
  }
};

Entry.block.start_neighbor_scene = function (sprite, script) {
    var currentScene = Entry.scene.selectedScene;
    var scenes = Entry.scene.getScenes();
    var index = scenes.indexOf(currentScene);
    var o = script.getField("OPERATOR", script);
    if (o == 'next') {
        if (index + 1 < scenes.length) {
            var nextScene = Entry.scene.getSceneById(scenes[index + 1].id);
            if (nextScene) {
                Entry.scene.selectScene(nextScene);
                Entry.engine.fireEvent('when_scene_start');
            }
        }
    } else {
        if (index > 0) {
            var nextScene = Entry.scene.getSceneById(scenes[index - 1].id);
            if (nextScene) {
                Entry.scene.selectScene(nextScene);
                Entry.engine.fireEvent('when_scene_start');
            }
        }
    }
    return null;
}
