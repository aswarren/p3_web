define([
	"dojo/_base/declare", "dojo/on", "dojo/_base/Deferred", "dijit/_Templated",
	"dojo/dom-class", "dojo/dom-construct", "dijit/_WidgetBase",
	"dojo/_base/xhr", "dojo/_base/lang", "dojo/dom-attr", "dojo/query",
	"dojo/dom-geometry", "dojo/dom-style", "dojo/when", "dojo/text!./templates/FilterValueButton.html"
], function(declare, on, Deferred, Templated,
			domClass, domConstruct, WidgetBase,
			xhr, lang, domAttr, Query,
			domGeometry, domStyle, when, template){

	return declare([WidgetBase, Templated], {
		templateString: template,
		baseClass: "FilteredValueButton",
		category: "",
		selected: null,

		_setSelectedAttr: function(selected){
			// console.log("FFV _setSelected: ", selected);

			var content = [];
			selected = selected.map(function(s, idx){
				var s = s.replace(/\"/g, "");
				var co = [];
				co.push('<div class="ValueWrapper">');
				co.push('<span class="ValueContent">' + s + "</span>");
				co.push("</div>");
				content.push(co.join(""));
				return s
			}, this)
			this._set("selected", selected);

			if(!this._started){
				this._set("selected", selected);
				return;
			}

			if(content.length == 1){
				this.selectedNode.innerHTML = content[0];
			}else if(content.length == 2){
				this.selectedNode.innerHTML = content.join("&nbsp;or&nbsp;");
			}else{
				this.selectedNode.innerHTML = content.slice(0, -1).join(",&nbsp;") + "&nbsp;or&nbsp;" + content[content.length - 1];
			}
			this._set("selected", selected);

		},
		clearAll: function(){
			// console.log("Clear Selected")
			this.innerHTML = "";
			// console.log("clear Category: ", this.category);
			on.emit(this.domNode, "UpdateFilterCategory", {
				category: this.category,
				selected: [],
				bubbles: true,
				cancelable: true
			});
			// this._set("selected",[])
		},
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			// console.log("FilteredValueButton Startup()", this.selected);
			this.set('selected', this.selected);
		},
		postCreate: function(){
			this.inherited(arguments);
		}
	})
});
