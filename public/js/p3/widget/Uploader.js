define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Uploader.html","dijit/form/Form","dojo/_base/Deferred",
	"dijit/ProgressBar","dojo/dom-construct","p3/UploadManager","dojo/query","dojo/dom-attr",
	"dojo/_base/lang","dojo/dom-geometry", "dojo/dom-style","dojo/promise/all","../WorkspaceManager"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin,Deferred,
	ProgressBar,domConstruct,UploadManager,Query,domAttr,
	lang,domGeometry,domStyle,All,WorkspaceManager
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
		overwrite: false,
		multiple:false, 
		types: false, 
		pathLabel: "Upload file to: ", 
		buttonLabel: "Select Files",
		typeLabel: "Upload type: ",
		knownTypes: {
			unspecified: {label: "Unspecified",formats: ["*.*"]},
			contigs: {label: "Contigs", formats: [".fa",".fasta",".fna"], description: "Contigs must be provided in fasta format (typically .fa, .fasta, .fna). Genbank formatted files are not currently accepted."},
			reads: {label: "Reads", formats: [".fq",".fastq",".fa",".fasta",".gz",".bz2"], description: "Reads must be in fasta or fastq format (typically .fa, .fasta, .fa, .fastq).  Genbank formatted files are not currently accepted."},
			diffexp_input_data: {label: "Diff. Expression Input Data", formats: [".csv",".txt",".xls",".xlsx"]},
			diffexp_input_metadata:{label: "Diff. Expression Input Metadata", formats: [".csv",".txt",".xls",".xlsx"]},
			feature_protein_fasta: {label: "Protein Sequence FASTA", formats: [".fa",".fasta",".faa"], description: "Protein sequences must be provided in fasta format (typically .fa, .fasta, .faa). Genbank formatted files are not currently accepted."}
		},
		_setPathAttr: function(val){
			this.path = val;
			this.destinationPath.innerHTML=val;
		},

		onUploadTypeChanged: function(val){
			console.log("UPLOAD TYPE CHANGED: ", val);
			var formats = this.knownTypes[val].formats;
			console.log("formats: ", val, formats);
			this.formatListNode.innerHTML=formats.join(", ");
		
			var description = this.knownTypes[val].description;

			if (!this.showAllFormats.get('value')) {
				console.log("Accept All formats");
				domAttr.set(this.fileInput, "accept", "*.*");
			}else{
				//var formats = this.knownTypes[this.uploadType.get('value')].formats;
				if (formats == "*.*"){
					domClass.add(this.fileFilterContainer,"dijitHidden");
				}else{
					domClass.remove(this.fileFilterContainer,"dijitHidden");
				}
				console.log("set formats to: ", formats.join(","));
				domAttr.set(this.fileInput, "accept", formats.join(","));
			}

			if (description) {
				domClass.remove(this.typeDescriptionContainer, "dijitHidden"); 
				this.typeDescriptionContainer.innerHTML = description; 
			}else{
				domClass.add(this.typeDescriptionContainer, "dijitHidden"); 
			}
		},
		onChangeShowAllFormats: function(val){
			console.log("Show All Formats: ", val);
			if (!val) {
				console.log("Accept All formats");
				domAttr.set(this.fileInput, "accept", "*.*");
			}else{
				var type = this.uploadType.get('value');
				console.log("uploadType value: ", type);
				var formats = this.knownTypes[this.uploadType.get('value')].formats;
				console.log("uploadType: ", this.uploadType.get('value'));
				domAttr.set(this.fileInput, "accept", formats.join(","));
			}

		},

                createUploadTable: function(empty){

			if (!this.uploadTable){
				var table = domConstruct.create("table",{style: {border: "1px solid #eee", width: "100%"}}, this.fileTableContainer);
				this.uploadTable = domConstruct.create('tbody',{}, table)
				var htr = domConstruct.create("tr", {}, this.uploadTable);
				domConstruct.create("th",{style: {"background-color":"#eee","border":"none","text-align":"left"}, innerHTML: "File Selected"}, htr);
				domConstruct.create("th",{style: {"background-color":"#eee","border":"none","text-align":"left"}, innerHTML:"Type"},htr);
				domConstruct.create("th",{style: {"background-color":"#eee","border":"none","text-align":"left"}, innerHTML:"Size"},htr);
				domConstruct.create("th",{style: {"background-color":"#eee","border":"none","text-align": "right"}},htr);
				if(empty){
					var row = domConstruct.create("tr",{"class":"fileRow"},this.uploadTable);
					domConstruct.create("td",{style: {"padding-left":"5px","text-align":"left"}, innerHTML: "<i>None</i>"}, row);
					domConstruct.create("td",{style: {"text-align":"left"}},row);
					domConstruct.create("td",{style: {"text-align":"left"}},row);
					domConstruct.create("td",{style: {"text-align": "right"}},row);
				}
			}
		},

		createNewFileInput: function(){
			if (this.fileInput){
				if (!this._previousFileInputs){
					this._previousFileInputs = [];
				}
				if (this.inputHandler) {
					this.inputHandler.remove();
				}
				domStyle.set(this.fileInput, "display", "none");
				this._previousFileInputs.push(this.fileInput);
			}
			
			this.fileInput = domConstruct.create("input", {type: "file", multiple: this.multiple});
			console.log("Created fileInput: ", this.fileInput);
			domConstruct.place(this.fileInput, this.fileUploadButton, "last");
			this.inputHandler = on(this.fileInput, "change", lang.hitch(this, "onFileSelectionChange"));

		},
		startup: function(){
			if (this._started){return;}

			this.inherited(arguments);
			var state = this.get("state")
			this.createNewFileInput();
	
			var _self=this;
			console.log("Add Dropdown Options");
			Object.keys(this.knownTypes).filter(function(t){
				console.log("CHECKING: ", t);
				return (!_self.types || (_self.types=="*") || ((_self.types instanceof Array)&&(_self.types.indexOf(t)>=0)))
			}).forEach(function(t){
				console.log("Add OPTION: ", t, _self.knownTypes[t], _self.uploadType,_self.uploadType.addOption);
				_self.uploadType.addOption({disabled:false,label:_self.knownTypes[t].label, value: t});
			});

			var type = this.uploadType.get('value');
			if (type && this.knownTypes[type]) {
				var description = this.knownTypes[type].description;
	                        if (description) {
					domClass.remove(this.typeDescriptionContainer, "dijitHidden");
					this.typeDescriptionContainer.innerHTML = description;
				}else{
					domClass.add(this.typeDescriptionContainer, "dijitHidden");
				}
			}else{
				domClass.add(this.typeDescriptionContainer, "dijitHidden");
			}
	

                        if (!this.path) {
                                Deferred.when(WorkspaceManager.get("currentPath"), function(path){
                                        console.log("CURRENT PATH: ", path);
                                        _self.set('path', path);
                                });
			}

			if ((state == "Incomplete") || (state == "Error")) {
			        this.saveButton.set("disabled", true);
			}

			this.watch("state", function(prop, val, val2){
			        console.log("Upload Form State: ",prop, val, val2);
			        if (val2=="Incomplete" || val2=="Error") {
			                this.saveButton.set("disabled", true);
			        }else{
			                this.saveButton.set('disabled',false);
			        }
			});
			this.createUploadTable(true);
		},
		validate: function(){
			console.log("this.validate()",this);
			var valid = this.inherited(arguments);
			var validFiles = []
			Query("TR.fileRow",this.uploadTable).map(function(tr){
					validFiles.push({filename: domAttr.get(tr,"data-filename"), type: domAttr.get(tr, "data-filetype")});
			})
			if (!validFiles || validFiles.length<1){
				valid = false;
			}

			if (valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled",true);
			}
			return valid;
		},

		uploadFile: function(file, uploadDirectory,type){
			if (!this._uploading){ this._uploading=[]}

			var _self=this;
			var obj = {path: uploadDirectory, name: file.name, type: type}
			return Deferred.when(WorkspaceManager.create(obj,true), function(obj){
				domClass.add(_self.domNode,"Working");
				console.log("obj: ", obj);
				console.log("obj.link_reference: ", obj.link_reference);
//				console.log("getUrlRes",getUrlRes, getUrlRes[0]);
//				var uploadUrl = getUrlRes[0][0][11];
				var uploadUrl = obj.link_reference;
//				console.log("uploadUrl: ", uploadUrl);
				if (!_self.uploadTable){
					var table = domConstruct.create("table",{style: {width: "100%"}}, _self.fileTableContainer);
					_self.uploadTable = domConstruct.create('tbody',{}, table)
				}

				var row = domConstruct.create("tr",{},_self.uploadTable);
				var nameNode = domConstruct.create("td",{innerHTML: file.name},row);

//					window._uploader.postMessage({file: file, uploadDirectory: uploadDirectory, url: uploadUrl});
				var msg = {file: file, uploadDirectory: uploadDirectory, url: uploadUrl};
				UploadManager.upload(msg, window.App.authorizationToken);
				return obj;	
			});

		},
		onFileSelectionChange: function(evt){
			console.log("onFileSelectionChange",evt, this.fileInput);
	
			if (this.uploadTable && !this.multiple){
				domConstruct.empty(this.uploadTable);
				delete this.uploadTable;
			}

			this.createUploadTable(false);

			var files = evt.target.files;
			console.log("files: ", files);
			var _self=this;
			
			Object.keys(files).forEach(function(idx) {
				console.log("files key: ", idx);
				var file = files[idx];
				if (file && file.name && file.size) {
					console.log("file: ", file);
					var row = domConstruct.create("tr",{"class":"fileRow"},_self.uploadTable);
					console.log('setfiletype: ', _self.uploadType.get('value'))
					domAttr.set(row,"data-filename",file.name);
					domAttr.set(row,"data-filetype",_self.uploadType.get('value'));
					var nameNode = domConstruct.create("td",{innerHTML: file.name},row);
					var typeNode = domConstruct.create("td",{innerHTML: _self.uploadType.get("value")},row);
					var sizeNode = domConstruct.create("td",{innerHTML: file.size},row);
					var delNode = domConstruct.create("td", {innerHTML: '<i class="fa fa-times fa-1x" />'},row);
					var handle=on(delNode,"click", lang.hitch(this,function(evt){
						handle.remove();	
						domConstruct.destroy(row);
						this.validate()
					}));
				}
			},this);

			this.createNewFileInput();
		},

		onSubmit: function(evt){
			var _self =this;
			evt.preventDefault();
			evt.stopPropagation();

			if (!_self.path) {
				console.error("Missing Path for Upload: ", _self.path);
				return;
			}

//			domClass.add(_self.domNode, "working");
			var validFiles=[]
			var inputFiles={};
			var defs=[];
			var wsFiles=[]
			
			this._previousFileInputs.forEach(lang.hitch(this, function(FI){
				console.log("FI: ", FI);
				Object.keys(FI.files).forEach(lang.hitch(this,function(key){
					console.log(" FI FILE KEY: ", key);
					var f = FI.files[key];
					console.log(" f: ", f);
					if (f.name){
					console.log(" f.name: ", f.name);
						inputFiles[f.name]=f;
					}
				}));
			}));


			console.log("InputFIles: ", inputFiles);
			console.log("uploadTable: ", this.uploadTable);
			Query("TR.fileRow",this.uploadTable).forEach(lang.hitch(this, function(tr){
				console.log("File INPUT Row: ", tr, domAttr.get(tr,"data-filename"), domAttr.get(tr, "data-filetype") );
//				var v = {fileInput: tr.fileInput,filename: domAttr.get(tr,"data-filename"), type: domAttr.get(tr, "data-filetype")};
//				console.log("V: ", v);
//				validFiles.push(v);
				if (tr && domAttr.get(tr,"data-filename")) {
					console.log("Got Name: ", domAttr.get(tr, "data-filename"));
					var f = inputFiles[domAttr.get(tr,"data-filename")];
					console.log("Got File: ", f);
					if (f.name) {
						defs.push(Deferred.when(this.uploadFile(f,_self.path,domAttr.get(tr,"data-filetype")), function(res){
							wsFiles.push(res);
							return true;
						}));
					}
				}
			}));

			All(defs).then(function(results){	
				console.log("UPLOAD Create WS files results: ", wsFiles);	
				on.emit(_self.domNode, "dialogAction", {action:"close",files: wsFiles, bubbles:true});
			});
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		},
                resize: function(changeSize, resultSize){
                        // summary:
                        //              Call this to resize a widget, or after its size has changed.
                        // description:
                        //              ####Change size mode:
                        //
                        //              When changeSize is specified, changes the marginBox of this widget
                        //              and forces it to re-layout its contents accordingly.
                        //              changeSize may specify height, width, or both.
                        //
                        //              If resultSize is specified it indicates the size the widget will
                        //              become after changeSize has been applied.
                        //
                        //              ####Notification mode:
                        //
                        //              When changeSize is null, indicates that the caller has already changed
                        //              the size of the widget, or perhaps it changed because the browser
                        //              window was resized.  Tells widget to re-layout its contents accordingly.
                        //
                        //              If resultSize is also specified it indicates the size the widget has
                        //              become.
                        //
                        //              In either mode, this method also:
                        //
                        //              1. Sets this._borderBox and this._contentBox to the new size of
                        //                      the widget.  Queries the current domNode size if necessary.
                        //              2. Calls layout() to resize contents (and maybe adjust child widgets).
                        // changeSize: Object?
                        //              Sets the widget to this margin-box size and position.
                        //              May include any/all of the following properties:
                        //      |       {w: int, h: int, l: int, t: int}
                        // resultSize: Object?
                        //              The margin-box size of this widget after applying changeSize (if
                        //              changeSize is specified).  If caller knows this size and
                        //              passes it in, we don't need to query the browser to get the size.
                        //      |       {w: int, h: int}

                        var node = this.domNode;

                        // set margin box size, unless it wasn't specified, in which case use current size
                        if(changeSize){
                                domGeometry.setMarginBox(node, changeSize);
                        }

                        // If either height or width wasn't specified by the user, then query node for it.
                        // But note that setting the margin box and then immediately querying dimensions may return
                        // inaccurate results, so try not to depend on it.
                        var mb = resultSize || {};
                        lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
                        if( !("h" in mb) || !("w" in mb) ){
                                mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
                        }

                        // Compute and save the size of my border box and content box
                        // (w/out calling domGeometry.getContentBox() since that may fail if size was recently set)
                        var cs = domStyle.getComputedStyle(node);
                        var me = domGeometry.getMarginExtents(node, cs);
                        var be = domGeometry.getBorderExtents(node, cs);
                        var bb = (this._borderBox = {
                                w: mb.w - (me.w + be.w),
                                h: mb.h - (me.h + be.h)
                        });
                        var pe = domGeometry.getPadExtents(node, cs);
                        this._contentBox = {
                                l: domStyle.toPixelValue(node, cs.paddingLeft),
                                t: domStyle.toPixelValue(node, cs.paddingTop),
                                w: bb.w - pe.w,
                                h: bb.h - pe.h
                        };

                }
	});
});
