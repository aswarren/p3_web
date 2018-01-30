/**
 * PermissionEditor
 *
 * - Takes a single selection {path: 'path/to/some/object'}
 * 	and allows user to edit permissions on that object.
 *
 * - Note: this editor saves permissions on each add/remove,
 * 		using the appropriate API (as opposed to saving after
 * 		the dialog is closed).
 *
 *
 * Example Usage:
 *
 *		var editor = PermissionEditor({
 *			path: 'my/object',
 *			owner_id: user@patricbrc.org
		})
 *		editor.onConfirm = function(){ //do something }
 *		editor.show()
 *
 * API
 *
 * 		.selection - object (meta) for which we are editing permissions
 * 		.show() - opens the eidtor
 * 		.onConfirm() - callback for when "ok" button is clicked
 * 		.onCancel() - callback for when dialog is canceled
 *
 * Author(s):
 *		nconrad
 *
 */

define([
	"dojo", "dojo/_base/declare", "dijit/_WidgetBase", "./Confirmation", // dojo/on
	"../widget/UserSelector", "./Formatter", "dojo/dom-construct",
	"dijit/form/Select", "dijit/form/Button", "../WorkspaceManager",
	"dojo/_base/Deferred", "dijit/form/CheckBox", "dojo/query", "dojo/topic",
	"../DataAPI"
],function(
	dojo, declare, WidgetBase, Confirmation,
	UserSelector, Formatter, domConstruct,
	Select, Button, WorkspaceManager,
	Deferred, CheckBox, query, Topic,
	DataAPI
){
	return declare([WidgetBase], {
		/* required widget input */
		selection: null,    // objects to be shared
		useSolrAPI: false,

 		constructor: function(o){
			this.selection = o.selection;
			this.onConfirm = o.onConfirm ? o.onConfirm : function(){};
			this.onCancel = o.onCancel ? o.onCancel : function(){};
			this.useSolrAPI = o.useSolrAPI || false;
		},
		postCreate: function(){},
		startup: function(){
			if(this._started){
				return;
			}

			this._started = true;
		},

		/**
		 * What to do after confirm
		 */
		onConfirm: function(){},

		/**
		 * What to do after cancel (x button)
		 */
		onCancel: function(){},

		loadingHTML:
			'<img src="/patric/images/loader.gif" class="pull-right" height="20"/>',
		/**
		 * Data model and data model helpers
		 */
		_userPerms: [],

		rmUser: function(userId){
			this._userPerms = this._userPerms.filter(function(perm){
				return userId != perm.user ;
			})
		},

		addUser: function(userId, perm){
			if(this.findUser(userId)) return false;

			this._userPerms.push({
				user: userId,
				permission: perm
			})

			return true;
		},

		findUser: function(userId){
			return this._userPerms.find(function(perm){
				return userId == perm.user
			})
		},


		/**
		 * Opens the editor (in dialog)
		 */
		show: function(){
			var self = this;

			var folderPath = this.selection.path;

			/**
			 * Build the form and events
			 */
			var ownerId = Formatter.baseUsername(this.selection.owner_id);

			var form = self.form = domConstruct.toDom('<div class="userPermForm">')
			domConstruct.place(
				'<h4 style="margin-bottom: 5px;" class="pull-left">'+
					'Share with Specific Users'+
				'</h4>'
			, form);
			self.progressEle = domConstruct.place(
				'<span>'+
					self.loadingHTML+
				'</span>'
			, form);
			self.currentUsers = domConstruct.toDom(
				'<table class="currentUsers p3basic striped" style="margin-bottom: 10px;">'+
					'<thead>'+
						'<tr>'+
							'<th>User Name'+
							'<th>Permission'+
							'<th>&nbsp;'+
					'<tbody>'+
						'<tr>'+
							'<td><i>'+ this.selection.owner_id.split('@')[0] + ' ' + (ownerId == 'me' ? '(me)': '')+'</i>'+
							'<td>Owner'+
							'<td>&nbsp;'
			);

			// user search box
			var userSelector = new UserSelector({name: "user"});

			// user's permission
			var permSelect = new Select({
				name: "perm",
				style: { width: '100px', margin: '0 10px' },
				options: [
					{
						label: "Can view",
						value: "r",
						selected: true
					},{
						label: "Can edit",
						value: "w"
					}
				]
			})

			// add user's permission button
			// Note: on click, the user is added server side.
			var addUserBtn = new Button({
				label: '<i class="icon-plus"></i> Add User',
				onClick: function(){
					var userId = userSelector.getSelected();
						perm = permSelect.attr('value')

					console.log('userID, perm', userId, perm)

					if (!userId) return;

					// don't add already existing users
					if(self.findUser(userId)) return;

					self.progressEle.innerHTML = self.loadingHTML;
					var prom = self.useSolrAPI ?
						DataAPI.addGenomePermission(self.selection.genome_id, userId, perm) :
						WorkspaceManager.setPermissions(folderPath, [[userId, perm]]);

					console.log('prom', prom)

					Deferred.when(prom, function(result) {
						console.log('result', result)
						dojo.place(
							'<tr>'+
								'<td data-user="'+userId+'">'+Formatter.baseUsername(userId)+
								'<td data-perm="'+perm+'">'+Formatter.permissionMap(perm)+
								'<td style="width: 1px;"><i class="fa icon-trash-o fa-2x">',
							query('tbody', self.currentUsers)[0]
						);

						self.addUser(userId, perm)
						self.reinitDeleteEvents();

						self.progressEle.innerHTML = '';

						// reset filter select
						userSelector.reset();
					})
				}
			});

			domConstruct.place(self.currentUsers, form)
			domConstruct.place(userSelector.domNode, form)
			domConstruct.place(permSelect.domNode, form, "last")
			domConstruct.place(addUserBtn.domNode, form, "last")

			// open form in dialog
			var dlg = this.dialog = new Confirmation({
				title: "Edit Sharing",
				okLabel: "Save",
				cancelLabel: 'Cancel',
				content: form,
				style: { width: '500px'},
				onConfirm: this.onConfirm,
				onCancel: this.onCancel
			})
			dlg.okButton.set('disabled', true)




			console.log('use solr', this.useSolrAPI)
			if(this.useSolrAPI){
				this.listSolrPermissions();
			}else{
				this.listWSPermissions();
			}

			dlg.startup()
			dlg.show();
		},


		/*
		 * list solr (initial) permissions in dom
		*/
		listSolrPermissions: function(){
			var self = this,
				form = self.form;
				id = this.selection.genome_id,
				isPublic = this.selection.public;

			var perms = this.solrPermsToObjs(this.selection.user_read, this.selection.user_write);

			var checkBox = domConstruct.toDom('<div class="publicCheckBox">');
			var cb = new CheckBox({
				name: "checkBox",
				value: "isPublic",
				checked: isPublic,
				onChange: function(e){
					//var prom = WorkspaceManager.setPublicPermission(folderPath, isPublic ? 'n' : 'r');


					Deferred.when(prom, function(res){
					}, function(e){
						alert('oh no, something has went wrong!')
					})
				}
			})
			cb.placeAt(checkBox);
			checkBox.appendChild(domConstruct.create('label', {
				'for': 'publicCB',
				'innerHTML': " Publicly Readable"
			}))
			domConstruct.place(checkBox, form, 'first');


			domConstruct.place(
				'<h4 style="margin-bottom: 5px;">'+
					'Share with Everybody'+
				'</h4>',
			form, 'first');

			// user perms
			perms.forEach(function(p){
				// server sometimes returns 'none' permissions, so ignore them.
				if(p.perm == 'n' || p.user == 'global_permission') return;


				self.addUser(p.user, p.perm)

				dojo.place(
					'<tr>'+
						'<td data-user="'+p.user+'">'+Formatter.baseUsername(p.user)+
						'<td data-perm="'+p.perm+'">'+p.perm+
						'<td style="width: 1px;"><i class="fa icon-trash-o fa-2x">',
					query('tbody', self.currentUsers)[0]
				);
			})

			// event for deleting users
			self.reinitDeleteEvents();

			self.progressEle.innerHTML = '';

		},

		solrPermsToObjs: function(readList, writeList){
			var readObjs = (readList || []).map(function(user){
				return {
					user: user,
					perm: 'Can read'
				}
			})

			var writeObjs = (writeList || []).map(function(user){
				return {
					user: user,
					perm: 'Can edit'
				}
			})

			return readObjs.concat(writeObjs);
		},


		/*
		 * list workspace (initial) permissions in dom
		*/
		listWSPermissions: function(){
			var self = this,
				form = self.form;
				folderPath = this.selection.path;

			var prom = WorkspaceManager.listPerms(folderPath, true /* include global */);
			Deferred.when(prom, function(perms){
				// add global permission toggle (using latest state)
				var globalPerm = perms.filter(function(p){
					return p.user == 'global_permission'
				})[0].perm;
				var isPublic = globalPerm != 'No access';

				var checkBox = domConstruct.toDom('<div class="publicCheckBox">');
				var cb = new CheckBox({
					name: "checkBox",
					value: "isPublic",
					checked: isPublic,
					onChange: function(e){
						var prom = WorkspaceManager.setPublicPermission(folderPath, isPublic ? 'n' : 'r');
						Deferred.when(prom, function(res){
						}, function(e){
							alert('oh no, something has went wrong!')
						})
					}
				})
				cb.placeAt(checkBox);
				checkBox.appendChild(domConstruct.create('label', {
					'for': 'publicCB',
					'innerHTML': " Publicly Readable"
				}))

				domConstruct.place(checkBox, form, 'first');
				domConstruct.place(
					'<h4 style="margin-bottom: 5px;">'+
						'Share with Everybody'+
					'</h4>',
				form, 'first');

				// user perms
				perms.forEach(function(p){
					// server sometimes returns 'none' permissions, so ignore them.
					if(p.perm == 'n' || p.user == 'global_permission') return;


					self.addUser(p.user, p.perm)

					dojo.place(
						'<tr>'+
							'<td data-user="'+p.user+'">'+Formatter.baseUsername(p.user)+
							'<td data-perm="'+p.perm+'">'+p.perm+
							'<td style="width: 1px;"><i class="fa icon-trash-o fa-2x">',
						query('tbody', self.currentUsers)[0]
					);
				})

				// event for deleting users
				self.reinitDeleteEvents();

				self.progressEle.innerHTML = '';
			})
		},

		reinitDeleteEvents: function(){
			var self = this;

			query('tbody .icon-trash-o', self.currentUsers).on('click', function(){
				var userRow = query(this).parents('tr')[0],
					userId = dojo.attr(query('[data-user]', userRow)[0], 'data-user');

				self.progressEle.innerHTML = self.loadingHTML;
				var prom = WorkspaceManager.setPermissions(folderPath, [[userId, 'n']]);
				Deferred.when(prom, function(result){
					domConstruct.destroy(userRow)

					self.rmUser(userId);
					self.progressEle.innerHTML = '';

				}, function(err){
					var parts = err.split("_ERROR_");
					var d = new Dialog({
						content: parts[1] || parts[0],
						title: "Error deleting user: "+userId,
						style: "width: 250px !important;"
					}).show();
				})
			})
		}




	});
});
