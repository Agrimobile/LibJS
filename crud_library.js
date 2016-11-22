
var f_crud = {
	
    load_store: function(store_name, sql_command, callback) {
        
		var store      = Ext.getStore(store_name);
        var record     = Ext.create(store.model.$className);
		// Extraigo campos del modelo
        var sql_fields = '';  
		var fields = record.getFields( );
		for (i=0; i < fields.length;i++ ) {	sql_fields += fields[i].name+','; }
		sql_fields = sql_fields.substring(0,sql_fields.length -1);
		//alert(sql_fields);
		//---------------------------
        var proxy     = store.getProxy();
        var sql_table = proxy.getReader().getRootProperty();
        proxy.url = MyApp.url_lib + 'crud.php';

        proxy.setExtraParam('base_url', MyApp.base_url);
        proxy.setExtraParam('base_nombre', MyApp.base_nombre);
        proxy.setExtraParam('base_usuario', MyApp.base_usuario);
        proxy.setExtraParam('base_clave', MyApp.base_clave);

        proxy.setExtraParam('sql_table', sql_table);
        proxy.setExtraParam('sql_fields',sql_fields+' ');
		
		if (sql_command) {
			if (sql_command.length >1) {
				proxy.setExtraParam('sql_command', sql_command);
			}
		}
        store.load(function(records, operation, success) { 
			if (records != null && records !== undefined) {
				console.log('Table: ' + sql_table + '" records: ' + records.length);
				if(typeof callback == 'function') callback(store);
			} else {
				alert('Error de lectura en tabla: '+sql_table+'. Controle su conexión a Internet.')
			};
        });		

    },

	init_window: function(win,store_name){
		var phone = false;
		//if (window.innerHeight > window.innerWidth && window.orientation ===0) phone = true;
		if (window.innerHeight > window.innerWidth) phone = true;
		if (phone) {
			win.setPosition(0, 0,false);
			win.setSize( window.innerWidth,window.innerHeight);

			window.addEventListener("orientationchange", function () {
				f_crud.setSize(win);
			}, false);

		}

		f_crud.disable_edit(win);
		if (phone) {
			win.down('grid').setVisible( false ) ;
			var msg = f_crud.mensaje('Leyendo...');
		}
		f_crud.load_store(store_name,'',function(){
			win.down('grid').getSelectionModel().select(0); 
			if (phone) {
				win.down('grid').setVisible(true) ;
				msg.close();
			}
		});

		win.store_array = [win.down('grid').getStore()];


	},
	
	sync_form: function(win,model){
		var record = model.getLastSelected();
		if (record)  {win.down('form').loadRecord(record);}
	},

    disable_edit: function(win, sql_action) {
        Ext.suspendLayouts();

		win.down('#grupo_abm').show();
		win.down('#grupo_grabar').hide();
        win.down('#agregar').enable();
        win.down('#modificar').enable();
        win.down('#borrar').enable();

        win.down('#grabar').disable();
        win.down('#cancelar').disable();

        win.down('grid').enable();
        //win.down('grid').expand();

        fields = win.down('form').getForm().getFields().items;

        for (var field_name in fields){fields[field_name].setReadOnly(true);}
		if (sql_action==='cancelar'){
			var record = win.down('grid').getSelectionModel().getLastSelected();
			win.down('form').loadRecord(record);
		
		} 

        Ext.resumeLayouts(true);
    },

    enable_edit: function(win, sql_action) {

        win.sql_action = sql_action;

        Ext.suspendLayouts();

		win.down('#grupo_abm').hide();
		win.down('#grupo_grabar').show();
        win.down('#agregar').disable();
        win.down('#modificar').disable();
        win.down('#borrar').disable();

        win.down('#grabar').enable();
        win.down('#cancelar').enable();

        win.down('grid').disable();
        //win.down('grid').collapse();

        var form = win.down('form'); 
        var fields = win.down('form').getForm().getFields().items;
        for (var field_name in fields){fields[field_name].setReadOnly(false);}

        Ext.resumeLayouts(true);

        if (sql_action === 'ADD') {

            var grid = win.down('grid');

            var model_name =grid.getStore().model.getName();
            record = Ext.create(model_name);
            record.sql_action = 'insert';
            //---- Get next ID ------
            f_crud.get_sequence(function(resp) { record.set('id',resp); });
            form.setTitle('Adding record..');
            form.loadRecord(record);
        }
        if (sql_action === 'MODIFY') {
            var record = win.down('form').getRecord();
            record.sql_action = 'update';
       }


    },

    delete_rec: function(win) {
        var sql_table = win.sql_table;
        Ext.Msg.confirm('', 'Delete this record?',function(btn){
            if (btn === 'yes') {

                var record = win.down('form').getRecord();
                var store  = win.down('grid').getStore();

                // Set new position in grid 
                var pos = win.down('grid').getSelectionModel().getCurrentPosition();
                if (pos.row > 0 ) {
                win.down('grid').getSelectionModel().selectPrevious();}
                else {
                    win.down('grid').getSelectionModel().selectNext();
                }

                store.remove(record);
                var store_array = [store];        
                f_crud.save_stores(win,store_array);
            }
        });



    },

    get_sequence: function(callback) {
        Ext.Ajax.request({
            url: 'php/get_id.php?companycode=farm',
            success: function(response){
                callback(Number(response.responseText));
            }
        });


    },

    get_json_data: function(store) {
        var record, name;
        var json_data = '';
        var values = {};

        // Update
        var sql_table   = store.getProxy().getReader().root;
        var records = store.getUpdatedRecords();
        for (var i in records) {
            record = records[i];
            values.sql_table = sql_table;
            values.sql_action = record.sql_action;

            for (var j in record.fields.items){
                if (record.fields.items[j].persist) {
                    name = record.fields.items[j].name;
                    values[name] = record.get(name) ;
                }
            }
            json_data += JSON.stringify(values) + ',';
        }
        var update_data = json_data.substr(0,json_data.length -1);

        // Insert
        records = store.getNewRecords();
        json_data = '';
        for (i in records) {
            //alert('Dentro Insert...');
            record = records[i];
            values.sql_table = sql_table;
            values.sql_action = 'insert';
            for (j in record.fields.items){
                if (record.fields.items[j].persist) {
                    name = record.fields.items[j].name;
                    values[name] = record.get(name) ;
                }
            }
            json_data += JSON.stringify(values) + ',';
        }
        var insert_data = json_data.substr(0,json_data.length -1);

        // Delete
        records = store.getRemovedRecords();
        json_data = '';
        for (i in records) {
            //alert('Dentro Delete...');
            record = records[i];
            values.sql_table = sql_table;
            values.sql_action = 'delete';
            for (j in record.fields.items){
                if (record.fields.items[j].persist) {
                    name = record.fields.items[j].name;
                    values[name] = record.get(name) ;
                }
            }
            json_data += JSON.stringify(values) + ',';
        }

        var delete_data = json_data.substr(0,json_data.length -1);
        var data = '';

        if (update_data.length >0) 					   {data = update_data;}
        if (insert_data.length >0 && data.length >0)   {data = data +','+insert_data;}
        if (insert_data.length >0 && data.length ===0) {data = insert_data;}

        if (delete_data.length >0 && data.length >0)   {data = data +','+delete_data;}
        if (delete_data.length >0 && data.length ===0) {data = delete_data;}

        return data ;
    },

	mensaje: function(msg){
		var win_msg = Ext.create('Ext.window.Window', {
			header : false,
			modal : true,
			html: '<p style="padding-left: 20px;padding-right: 20px;">  '+msg+'  </p>'
		}).show();		
		
		return win_msg;
	},
	
    save_form: function(win) {
		var msg = f_crud.mensaje('Grabando...');
		f_crud.save_stores(win, win.store_array,function(resp){
			msg.close();
			f_crud.disable_edit(win);
			if (!resp.success) alert('Error durante la grabación: ' + resp.message);
		});
	},
	
    save_stores: function(win, store_array,callback) {
        var form = win.down('form');
        form.updateRecord();
        var record = form.getRecord();

        if (win.sql_action === 'ADD') {
            store_array[0].add(record);
            var select_model = win.down('grid').getSelectionModel();
            select_model.select(store_array[0].getCount()-1); 
        }
        if (win.sql_action === 'MODIFY') {
        }
        if (win.sql_action === 'DELETE') {
            store_array[0].remove(record);
        }


        //---- Get data in json format
        var data='', data_tmp='' ;
        for (var i in store_array) {
			//alert(store_array[i].getCount());
            data_tmp = '';
            data_tmp = f_crud.get_json_data(store_array[i]);
            if      (data.length===0) {data = data_tmp;}   
            else if (data.length > 0 && data_tmp.length > 0 ) {data = data + ',' + data_tmp;}   
        }    
        data = '{"records":[' + data + ']}';

        alert(data);

        Ext.Ajax.request({
            url: 'php/crud.php' + '?action=batch',
            params: {data: data,base_url:MyApp.base_url,base_nombre:MyApp.base_nombre,base_usuario:MyApp.base_usuario,base_clave:MyApp.base_clave},
            success: function(response){
                var resp_json = Ext.JSON.decode( response.responseText, true ) ;
                if (resp_json.success === true) {
                    f_crud.disable_edit(win);
                    for (var i in store_array) {store_array[i].commitChanges();}
					console.log('dentro success.');
					if(typeof callback == 'function') callback(resp_json);
                }
                else {
					console.log('dentro else.');
					 if(typeof callback == 'function') callback(resp_json);
                }
            }
        });

    },
	
	setSize: function(obj) {
		//obj.setSize( MyApp.main.width,MyApp.main.height);
	//alert('dentro orient..');
		/*
		if (Ext.isChrome === true) {
			obj.setSize(window.innerWidth,window.innerHeight);
		}
		else 
		{
			if (window.orientation == 0) 							   {obj.setSize(window.innerHeight+85,window.innerWidth)};
			if (window.orientation == 90 || window.orientation == -90) {obj.setSize(window.innerHeight+85,window.innerWidth)};
			
		}	
		*/
	},


	dic: function(container){
		//alert('container.xtype = '+container.xtype);
		if (container.title) 		container.title 	 = container.title + '...';
		if (container.text) 		container.text 		 = container.text + '...';
		if (container.fieldLabel) 	container.fieldLabel = container.fieldLabel + '...';
		if (container.items) { 
			var items = container.items;
			items.each(function(item){
				f_crud.dic(item);
			});
		}
		if (container.dockedItems){
			var dockedItems = container.dockedItems;
			dockedItems.each(function(item){
				f_crud.dic(item);
			})
		}
		if (container.columns) { 
			var columns = container.columns;
			for (var i in columns) {
				columns[i].title = columns[i].title + '...';
				columns[i].text	 = columns[i].text + '...';
			};
		}
	}
	
};
