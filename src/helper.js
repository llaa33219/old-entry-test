/**
 * @fileoverview Object for help message
 */
'use strict';

/**
 * Helper provide block description with 'blockHelper'
 */
Entry.Helper = function() {
}

var p = Entry.Helper.prototype;

/**
 * initialize block helper
 * @param {!Element} parentView
 */
p.initBlockHelper = function(parentView) {
    if (this.parentView_)
        return;
    /** @type {!Element} parent view */
    this.parentView_ = parentView;
}

/**
 * toggle on block helper
 */
p.blockHelperOn = function() {
    if (this.blockHelperView_)
        return this.blockHelperOff();
    var helper = this;
    helper.blockHelpData = EntryStatic.blockInfo;
    var blockHelperView = Entry.createElement('div',
                            'entryBlockHelperWorkspace');
    if (Entry.isForLecture)
        blockHelperView.addClass('lecture');
    helper.parentView_.appendChild(blockHelperView);
    if (!Entry.isForLecture) {
        var blockHelperHeader = Entry.createElement('div',
                                'entryBlockHelperHeaderWorkspace');
        blockHelperHeader.innerHTML = '블록 설명';
        var blockHelperDispose = Entry.createElement('button',
                                'entryBlockHelperDisposeWorkspace');
        blockHelperDispose.addClass('entryBtn');
        blockHelperDispose.bindOnClick(function() {
            helper.blockHelperOff();
        });
        blockHelperHeader.appendChild(blockHelperDispose);
        blockHelperView.appendChild(blockHelperHeader);
    }
    var blockHelperContent = Entry.createElement('div',
                            'entryBlockHelperContentWorkspace');
    blockHelperContent.addClass('entryBlockHelperIntro');
    if (Entry.isForLecture)
        blockHelperContent.addClass('lecture');
    blockHelperView.appendChild(blockHelperContent);
    helper.blockHelperContent_ = blockHelperContent;
    helper.blockHelperView_ = blockHelperView;

    var blockHelperBlock = Entry.createElement('div',
                            'entryBlockHelperBlockWorkspace');
    this.blockMenu_ = new Blockly.BlockMenu(blockHelperBlock);
    this.blockMenu_.isViewOnly = true;
    this.blockMenu_.isCenterAlign = true;
    helper.blockHelperContent_.appendChild(blockHelperBlock);

    var blockHelperDescription = Entry.createElement('div',
                            'entryBlockHelperDescriptionWorkspace');
    helper.blockHelperContent_.appendChild(blockHelperDescription);
    blockHelperDescription.innerHTML = '블록을 클릭하면 블록에 대한 설명이 나타납니다.';
    this.blockHelperDescription_ = blockHelperDescription;

    this.blockChangeEvent = Blockly.bindEvent_(Blockly.mainWorkspace.getCanvas(),
        'blocklySelectChange', this, this.updateSelectedBlock);
    if (Entry.playground.blockMenu)
        this.menuBlockChangeEvent = Blockly.bindEvent_(
            Entry.playground.blockMenu.workspace_.getCanvas(),
            'blocklySelectChange', this, this.updateSelectedBlock);

    this.first = true;
}

/**
 * toggle on block helper
 */
p.blockHelperOff = function() {
    if (!this.blockHelperView_)
        return;
    if (Entry.isForLecture)
        return;
    var helper = this;
    helper.blockHelperView_.addClass('dispose');
    Blockly.unbindEvent_(this.blockChangeEvent);
    delete this.blockChangeEvent;
    if (Entry.playground.blockMenu) {
        Blockly.unbindEvent_(this.menuBlockChangeEvent);
        delete this.menuBlockChangeEvent;
    }
    Entry.bindAnimationCallback(helper.blockHelperView_, function(e) {
        helper.parentView_.removeChild(helper.blockHelperView_);
        delete helper.blockHelperContent_;
        delete helper.blockHelperView_;
    });
};

/**
 * toggle on block helper
 */
p.updateSelectedBlock = function() {
    if (!Blockly.selected)
        return;
    if (this.first) {
        this.blockHelperContent_.removeClass('entryBlockHelperIntro');
        this.first = false;
    }
    var type = Blockly.selected.type;
    this.renderBlock(type);
};

p.renderBlock = function(type) {
    var data = this.blockHelpData[type];
    if (!data)
        return;
    var xmlText = data.xml;
    var XML = jQuery.parseXML(xmlText);
    var blockHeight = this.blockMenu_.show(XML.childNodes);
    this.blockHelperDescription_.innerHTML = data.description;
    $(this.blockHelperDescription_).css({
        top: blockHeight + 40
    })
};
