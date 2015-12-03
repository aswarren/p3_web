define("p3/widget/GenomeNameSelector", [
	"dijit/form/FilteringSelect","dojo/_base/declare",
	"dojo/store/JsonRest","dojo/dom-construct","dijit/TooltipDialog",
	"dojo/on","dijit/popup","dojo/_base/lang","dojo/dom-construct",
	"dijit/form/CheckBox","dojo/string","dojo/when","dijit/form/_AutoCompleterMixin"
], function(
	FilteringSelect, declare, 
	Store,domConstr,TooltipDialog,
	on,popup,lang,domConstr,Checkbox,
	string,when,AutoCompleterMixin
){
	
	return declare([FilteringSelect,AutoCompleterMixin], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'Genome name.',
		missingMessage:'Specify genome name.',
		placeHolder:'e.g. Mycobacterium tuberculosis H37Rv',
		searchAttr: "genome_name",
		queryExpr: "*${0}*",
		queryFilter: "",
		resultFields: ["genome_id","genome_name", "strain", "public", "owner"],
		includePrivate: true,
		includePublic: true,	
		pageSize: 25,
		highlightMatch: "all",
		autoComplete: false,
		store: null,
		labelType:'html',
		constructor: function(){
			var _self=this;
			if (!this.store){
				
				this.store = new Store({target: this.apiServiceUrl + "/genome/", idProperty: "genome_id", headers: {accept: "application/json","Authorization":(window.App.authorizationToken||"")}});

			}

			var orig = this.store.query;
			this.store.query = lang.hitch(this.store, function(query,options){
				console.log("query: ", query);
				console.log("Store Headers: ", _self.store.headers);
				var q = "?eq(" + _self.searchAttr + "," + query[_self.searchAttr] + ")";
				if (_self.queryFilter) {
					q+=_self.queryFilter
				}

				if (_self.resultFields && _self.resultFields.length>0) {
					q += "&select(" + _self.resultFields.join(",") + ")";
				}
				console.log("Q: ", q);
				return orig.apply(_self.store,[q,options]);
			});	
		},

		_setIncludePublicAttr: function(val){
			this.includePublic = val;
			if (this.includePublic && this.includePrivate){
				this.queryFilter = "";
			}else if (this.includePublic && !this.includePrivate){
				this.queryFilter="&eq(public,true)"	
			}else if (this.includePrivate && !this.includePublic){
				this.queryFilter="&eq(public,false)"	
			}else{
				this.queryFilter = "&and(eq(public,true),eq(public,false))";
			}
		},

		_setIncludePrivateAttr: function(val){
			this.includePrivate = val;
			if (this.includePublic && this.includePrivate){
				this.queryFilter = "";
			}else if (this.includePublic && !this.includePrivate){
				this.queryFilter="&eq(public,true)"	
			}else if (this.includePrivate && !this.includePublic){
				this.queryFilter="&eq(private,false)"	
			}else{
				this.queryFilter = "&and(eq(private,true),eq(private,false))";
			}
		},

		postCreate: function(){
			this.inherited(arguments);
			this.filterButton = domConstr.create("i", {"class": "fa icon-filter fa-1x", style: {"float": "left", "font-size": "1.2em","margin": "2px"}});
			domConstr.place(this.filterButton,this.domNode,"first");

			//var dfc = '<div>Filter Genomes</div><div class="wsActionTooltip" rel="Public">Public</div><div class="wsActionTooltip" rel="private">My Genomes</div>'
			var dfc = domConstr.create("div");
			domConstr.create("div", {innerHTML: "Include in Search",style: {"font-weight":900}},dfc);

			var publicDiv = domConstr.create('div', {});		
			domConstr.place(publicDiv,dfc,"last");
			var publicCB = new Checkbox({checked: true})
			publicCB.on("change", lang.hitch(this,function(val) {
				console.log("Toggle Public Genomes to " + val);
				this.set("includePublic",val);
			}));
	
			domConstr.place(publicCB.domNode,publicDiv,"first");	
			domConstr.create("span", {innerHTML: "Public Genomes"},publicDiv);

			var privateDiv= domConstr.create('div', {});		
			domConstr.place(privateDiv,dfc,"last");
			var privateCB= new Checkbox({checked: true})
			privateCB.on("change", lang.hitch(this,function(val) {
				console.log("Toggle Private Genomes to " + val);
				this.set("includePrivate",val);
			}));
			domConstr.place(privateCB.domNode,privateDiv,"first");	
			domConstr.create("span", {innerHTML: "My Genomes"},privateDiv);



                        var filterTT=  new TooltipDialog({content: dfc, onMouseLeave: function(){ popup.close(filterTT); }})

			on(this.filterButton, "click", lang.hitch(this,function() {
	                     popup.open({
                                        popup: filterTT,
                                        around: this.domNode,
                                        orient: ["below"]
                                });
			}));
		},
        _startSearchFromInput: function(){
			var _self=this;
            if (_self.get("displayedValue") == "" && (! _self.required)){
                _self.reset();
                return;
            }
            else{
                this.inherited(arguments);
            }
        },


		/*isValid: function(){
			return (!this.required || this.get('displayedValue') != "");
		},*/
        labelFunc: function(item, store){
            var label="";
            if (typeof item.public !== 'undefined' && !item.public){
                label+="<i class='fa icon-lock3 fa-1x' />&nbsp;";
            }
            else {
                label+="<i class='fa fa-1x'> &nbsp; </i>&nbsp;";
            }

            label+=item.genome_name;
            var strainAppended=false;
            if(item.strain){
                strainAppended= (item.genome_name.indexOf(item.strain, item.genome_name.length - item.strain.length) !== -1);
                if(!strainAppended){
                    label+=" "+item.strain;
                    strainAppended=true;
                }
            }
            label+= " ["+item.genome_id+"]";
            /*else if(!strainAppended){
                if(item.genbank_accessions){
                    label+=" "+item.genbank_accessions;
                }
                else if(item.biosample_accession){
                    label+=" "+item.biosample_accession;
                }
                else if(item.bioproject_accession){
                    label+=" "+item.bioproject_accession;
                }
                else if(item.assembly_accession){
                    label+=" "+item.assembly_accession;
                }
                else{
                    label+=" "+item.genome_id;
                }
            }*/
            return label;
        }

	});
});
