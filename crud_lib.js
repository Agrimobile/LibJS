var f_crud = {

  cerrar_mensaje: function(tiempo){
    Ext.Function.defer(function(){
      Ext.Msg.hide();
    }, tiempo * 1000);    
  },

  mensaje: function(title, msg, tiempo){
    var mensaje = Ext.create('MyApp.view.Mensaje');
    mensaje.show();
    mensaje.f_mensaje(title,msg);
    if(tiempo > 0 ){
      Ext.Function.defer(function(){
        mensaje.close();
      }, tiempo * 10000);          
    }
    f_crud.enviar_msg_error(title+', '+msg);
  }, 
  
  enviar_msg_error: function(msg){
    if(MyApp.main.estado === 'on'){
      Ext.Ajax.request({
        url: MyApp.url_lib + 'js_error_log.php',
        //url:  '../LibPHP/js_error_log.php',
        params: {mensaje: msg},
        success: function(response){
          console.log('Mensaje enviado OK.');
        },
        failure: function(response, opts) {
          console.log('Falla en envio de mensaje!');
        }
      });      
    }
  },
  
  // Carga un store desde una tabla MySql, usando su estrura para contruir la orden SQL 
  // Si se pasa el parametro [sql_command] ejecuta la orden SQL "Select..." sin tener en cuenta la estructura del store. 
  load_mysql_store: function(store_name, sql_command, callback) {   
    var store = Ext.getStore(store_name);
    var record = Ext.create(store.getProxy().getModel().getName());
    // Extraigo campos del modelo
    var sql_fields = '';  
    var fields = record.getFields();

    for (var i = 0; i < fields.length; i++) {
      sql_fields = sql_fields + fields[i].getName()+',';
    };  

    sql_fields = sql_fields.substring(0,sql_fields.length -1);
    //---------------------------
    var proxy = store.getProxy();
    proxy.setUrl(MyApp.url_lib + 'crud_lib.php');
    
    console.log("MyApp.url_lib + 'crud_lib.php'",MyApp.url_lib + 'crud_lib.php');
    
    var sql_table = proxy.getReader().getRootProperty();

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
      if (!success) {
        f_crud.mensaje('Error 1 de lectura en tabla: '+sql_table ,'Controle su conexión a Internet.');      
        f_crud.cerrar_mensaje(5);
        if(typeof callback == 'function') callback(-1);        
      }
      if (success && records != null && records !== undefined){
        console.log('Table: ' + sql_table + '" records: ' + records.length);
        if (records.length === 0) console.log('Sql:',sql_command);
        if(typeof callback == 'function') callback(store);
      } else {
        f_crud.mensaje('Error 2 de lectura en tabla: '+sql_table ,'Controle su conexión a Internet.');      
        f_crud.cerrar_mensaje(5);
        if(typeof callback == 'function') callback(-1);
      };
    });    

  },

  // Permite ejecutar un conjunto de ordenes SQL contra Mysql en un sola transaccion. 
  // Si alguna falla, aborta todas las ordenes. 
  save_mysql_array: function(array, callback) {
    //---- Get data in json format
    var data = '' ;
    data = '{"records":' + JSON.stringify(array) + '}';
    console.log(data);
    
    Ext.Ajax.request({
      url: MyApp.url_lib + 'crud_lib.php'+ '?action=batch',
      params: {
        data: data,
        base_url:MyApp.base_url,
        base_nombre:MyApp.base_nombre,
        base_usuario:MyApp.base_usuario,
        base_clave:MyApp.base_clave
      },
      success: function(response){
        var resp_json = Ext.JSON.decode( response.responseText, true ) ;
        if (!resp_json) {
          console.log(response.responseText);
          if(typeof callback == 'function') callback(1);
        }
        
        //if (resp_json.success === true) {
        if (resp_json.success) {
           console.log('dentro success.');
          if(typeof callback == 'function') callback(1);
        }
        else {
          f_crud.mensaje('Error SQL',resp_json.message+ ' - ' +data,5);
          if(typeof callback == 'function') callback(-1);
        }
      },
      failure: function(response, opts) {
        alert(MyApp.url_lib + 'crud_lib.php'+ '?action=batch');
        f_crud.mensaje('Error','Error en conexion con el servidor, revise su conexion Internet.  Resp text: '+response.responseText+' Respuesta n: ' +response.status,5);
        if(typeof callback == 'function') callback(-1);
      }
    });
  },
  
  // Genera el siguiente Id en la tabla secuencia, [cantidad] se usa para aumentar mas de 1.
  secuencia_mysql: function(cantidad, callback){
    if (!cantidad) var cantidad = 0;
    //Ext.Ajax.setTimeout(10000); // 10 seconds
    Ext.Ajax.request({
      url: MyApp.url_lib + 'crud_lib.php'+ '?action=secuencia',
      //url:  '../LibPHP/crud_lib.php'+ '?action=secuencia',
      params: {
        cant:cantidad,
        base_url:MyApp.base_url,
        base_nombre:MyApp.base_nombre,
        base_usuario:MyApp.base_usuario,
        base_clave:MyApp.base_clave
      },
      success: function(response){
        var resp = Ext.JSON.decode( response.responseText, true ) ;
        if (resp.secuencia > 0) {
          if(typeof callback == 'function') callback(resp.secuencia);
        }
        else {
          f_crud.mensaje('Error al obtener secuencia',response.responseText,5);
          if(typeof callback == 'function') callback(-1);
        }
      },
      failure: function(response, opts) {
        console.log('server-side failure with status code ' + response.status);
        if(typeof callback == 'function') callback(-1);
      }
    });
  },
  
  //SqLite: Ejecuta un comando en SqLite (Insert, Update, Delete). No devuelve datos. No se puede usar Select.   
  sql_command: function(sql, callback){
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024);
    var data_array = [];    
    db.transaction(function (tx) {
      tx.executeSql(sql);
    },f_fail,f_success);
    
    function f_success() { 
      console.log('db.transaction = Ok ',sql); 
      if(typeof callback == 'function') callback(1);
    }
    function f_fail(error) { 
      console.log('db.transaction = Fail! ',sql); 
      //Ext.Msg.alert('Error','Se produjo un error de lectura, orden sql: '+sql);
      if(typeof callback == 'function') callback(-1);
    }      
  },  

  // SqLite: Ejecuta un array de comandos SQL en SqLite (Insert, Update, Delete) en una sola trasaccion y aborta todo si alguno falla. 
  // No devuelve datos. No se puede usar Select.   
  sql_commands: function(sql_array, callback){
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024);
    var data_array = [];  
    var last_sql ='';  
    db.transaction(function (tx) {
      for (var j in sql_array){
        last_sql = sql_array[j];
        tx.executeSql(sql_array[j]);                    
      }
    },f_fail,f_success);
    
    function f_success() { 
      console.log('db.transaction = Ok - last sql = ',last_sql); 
      if(typeof callback == 'function') callback(1);
    }
    function f_fail(error)    { 
      console.log('db.transaction = Fail! ',sql); 
      //Ext.Msg.alert('Error','Se produjo un error de lectura, orden sql: '+sql);
      if(typeof callback == 'function') callback(-1);
    }      
  },  

  sql_select: function(sql, callback){
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024);
    var data_array = [];    
    db.transaction(function (tx) {
      tx.executeSql(sql, [], function (tx, results) {
        for (var i = 0; i < results.rows.length; i++){
          data_array.push(results.rows.item(i));
        }
      });
    }, f_fail, f_success);
    
    function f_success() { 
      //console.log('db.transaction = Ok - ' + sql_table + ' count: ' + store.getCount()); 
      if(typeof callback == 'function') callback(data_array);
    }
    function f_fail()    { 
      console.log('db.transaction = Fail! ',sql); 
      //Ext.Msg.alert('Error','Se produjo un error de lectura, orden sql: '+sql);
      if(typeof callback == 'function') callback(-1);
    }  

  },
  
  load_store: function(store_name, sql_where, sql_command, callback) {
    var store = Ext.getStore(store_name);
    var record = Ext.create(store.getProxy().getModel().getName());
    // Extract fields in model
    var sql_fields = '';  
    var fields = record.getFields(); 

    for (var i = 0; i < fields.length; i++) {
      sql_fields = sql_fields + fields[i].getName() + ',';
    };  

    sql_fields = sql_fields.substring(0,sql_fields.length -1);
    //---------------------------
    // Get Table name in model
    var modelName = store.getProxy().getModel().getName();
    var sql_table = modelName.slice(modelName.lastIndexOf('.') + 1);
    //--------------------------
    var proxy = store.getProxy();
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024);
    var sql = ' Select ' + sql_fields + ' from ' + sql_table;
    if (sql_command && sql_command.length >1)   {sql = sql_command ;}
    if (sql_where && sql_where.length >1)     {sql = sql + ' where ' + sql_where ;}
    var data_array = [];

    // Limpio el store 
    store.getProxy().clear();
    store.data.clear();
    store.sync();
     
    // Leo datos via SQL
    db.transaction(function (tx) {
      tx.executeSql(sql, [], function (tx, results) {
        for (var i = 0; i < results.rows.length; i++){
          data_array.push(results.rows.item(i));
        }
          store.add(data_array);
      });
    },f_fail,f_success);
    
    function f_success() { 
      console.log('db.transaction = Ok - ' + sql_table + ' count: ' + store.getCount()); 
      if(typeof callback == 'function') callback(store);
    }
    function f_fail()    { 
      console.log('db.transaction = Fail! ',sql); 
      f_crud.create_table(sql_table);
      if(typeof callback == 'function') callback(store);
    }  
  },
    
  form_open: function(grid_panel, action){
    if (action==='EDIT' && typeof grid_panel.record==='undefined') return;
    // Open new screen
    // MyApp.main.down('#estado_editar').setHtml('Editando');
    // MyApp.main.down('#estado_sinc').setHtml('');
    MyApp.pantalla_anterior = MyApp.main.getLayout().getActiveItem();
    var form_panel = Ext.create(grid_panel.form_name);
    // MyApp.screen_count++ ;
    // MyApp.screen_name[MyApp.screen_count] = form_panel;
    MyApp.main.add(form_panel);
    MyApp.main.getLayout().setActiveItem(form_panel);
    //---------------
    if(grid_panel.pivot_code) {
      form_panel.pivot_code = grid_panel.pivot_code;
    }
    form_panel.model_name  = grid_panel.model_name;
    form_panel.store_name  = grid_panel.store_name;
    form_panel.store_array = grid_panel.form_store_array;
    form_panel.grid_panel  = grid_panel.down('#grid');
    form_panel.action = action;

    if (form_panel.getItemId()==='form') {
      var form = form_panel;  
    } else {
      var form = form_panel.down('#form');
    }
    if (action=='ADD'){
      form_panel.title = 'Agregando';
      var newrecord = Ext.create(form_panel.model_name);    
      f_crud.secuencia(function(rtn){
        if (rtn !== -1) {
          newrecord.set('id',rtn);
          form.loadRecord(newrecord);
          if (typeof newrecord.get('codigo') === 'undefined') {} else {
            f_crud.get_codigo(newrecord,function(rtn) {
              newrecord.set('codigo',rtn)
              form.loadRecord(newrecord);
            } );
          }          
        }        
        // form_panel.form_init();
      });
    }
    if (action=='EDIT'){
      form_panel.title = 'Editando';
      form.loadRecord(grid_panel.record);
      // form_panel.form_init();
    }
  },
  
  //grid_check_delete can be used in grid with records that are asociated by agregation with other tabless
  grid_check_delete: function(grid_panel, checkConfig) {
    var query = "select * from " + checkConfig.table + " where " + checkConfig.field + "=" + grid_panel.record.data.codigo;
    f_crud.sql_select(query, function(resultSet){
      if(resultSet === -1 || !Array.isArray(resultSet)) {
        console.log("Query statement: " + query);
        throw "Database error: Check your sql statement or your WebSql instance";
      }
      else{
        if(resultSet.length > 0) {
          Ext.Msg.alert({
            title: checkConfig.msgTitle,
            message: checkConfig.message,
            iconCls: 'x-fa fa-warning',
            buttons:  Ext.Msg.OK
          });
        }
        else {
          f_crud.grid_delete(grid_panel);
        }
      }
    });
  },

  grid_delete: function(grid_panel){
    //if (!grid_panel.down('#grid').record ) return;
    Ext.Msg.show({
      title:'Borrar registro',
      message: 'Desea borrar el registro',
      buttons:  Ext.Msg.YESNO,
      iconCls: 'x-fa fa-warning',
      fn: opcion
    });
    var store;
    function opcion(btn){
      var store = Ext.getStore(grid_panel.store_name);
      if (btn=='yes'){
        grid_panel.form_store_array[0].remove(grid_panel.record);

        if (grid_panel.form_store_array.length > 1) {
          //for (var i in store_array) {
          for (var i=1; i < grid_panel.form_store_array.length ; i++) {
            store = grid_panel.form_store_array[i];
            console.log('store',store);
            store.each(function (item, index, length) {
              console.log('dentro each');
              store.remove(item);
            });            
          }          
        } 
        f_crud.save_stores(grid_panel.form_store_array);
      }
    }
  },
      
  close_form: function(form){
    if (MyApp.main.getLayout().getLayoutItems().length > 1) MyApp.main.getLayout().prev();
    form.close();
    // MyApp.main.down('#estado_editar').setHtml('');    
    if (MyApp.estado_sinc === 'PENDIENTE'){
      // MyApp.main.down('#estado_sinc').setHtml('Sinc: Pendiente');
    }
  },

  save_several_records: function(form_panel) {
    var store_array = form_panel.store_array;
    if (form_panel.getItemId()==='form') {
      var form = form_panel;  
    } else {
      var form = form_panel.down('#form');
    }
    var listOfLotes = form_panel.down("#lotesgrid").store.data.items;
    var saveRecord = function(lote, cb) {
      if(lote.data.agregar) {
        var newRecordValues = {
          cod_lote: lote.data.codigo,
          cod_actividad: form_panel.pivot_code
        }, 
        newrecord = Ext.create(form_panel.model_name);
        f_crud.secuencia(function(rtn){
          if (rtn > -1) {
            newrecord.set('id',rtn);
            if (typeof newrecord.get('codigo') === 'undefined') {} else {
              f_crud.get_codigo(newrecord,function(rtn) {
                if(rtn > -1) {
                  newrecord.set('codigo',rtn);
                  newrecord.set(newRecordValues);
                  store_array[0].add(newrecord);
                  f_crud.save_stores( store_array, function(rtn){
                    if (rtn > -1) {
                      var modelName, sql_table;
                      for (i in store_array){
                        modelName = store_array[i].getProxy().getModel().getName();
                        sql_table = modelName.slice(modelName.lastIndexOf('.') + 1);
                      }
                      cb();
                    }
                    else {
                      reject("Error: while trying to save record");
                      cb();
                    }
                  });
                }
                else {
                  reject("Error: while trying to generate codigo value");
                  cb();
                }
              });
            }
          }
          else {
            reject("Error: while trying to generate id value");
            cb();
          }   
        });
      }
      else {
        cb();
      }
    };
    async.eachSeries(listOfLotes, saveRecord, function(){ 
      f_crud.close_form(form_panel);
      if (MyApp.estado_sinc !== 'PENDIENTE') {
        MyApp.estado_sinc = 'PENDIENTE' ;
        // MyApp.main.down('#estado_sinc').setHtml('Sinc: Pendiente');
        // f_sinc.defer_sinc();     
      }
    });
  },

  save_form: function(form_panel) {
    var store_array = form_panel.store_array;
    if (form_panel.getItemId()==='form') {
      var form = form_panel;  
    } else {
      var form = form_panel.down('#form');
    }
    else {
      var record = form.getRecord();
      record.set(form.getValues());  
      if (form_panel.action === 'ADD') {
        store_array[0].add(record);
        form_panel.grid_panel.getSelectionModel().select(record);
      }
      f_crud.save_stores( store_array,function(rtn){
        if (rtn === -1) {
          alert('Error durante la grabación ');}
        else {
          var modelName, sql_table;
          for (i in store_array){
            modelName = store_array[i].getProxy().getModel().getName();
            sql_table = modelName.slice(modelName.lastIndexOf('.') + 1);
            // f_sinc.agregar_tabla(sql_table);        
          }
        }
      });
      f_crud.close_form(form_panel);
      if (MyApp.estado_sinc !== 'PENDIENTE') {
        MyApp.estado_sinc = 'PENDIENTE' ;
        // MyApp.main.down('#estado_sinc').setHtml('Sinc: Pendiente');
        // f_sinc.defer_sinc();      
      }
    }
  },
  
  save_stores: function(store_array, callback, sincronizar) {
    //---- Get data in json format
    var data='', data_tmp='' ;
    var sql_array = [];
    for (var i in store_array) {
      f_crud.get_sql_commands(store_array[i],sql_array,sincronizar);
    }    

    //console.log(sql_array);
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024);
    var last_sql = '';
    db.transaction(function (tx) {
      for (var j in sql_array){
        last_sql = sql_array[j];
        // console.log(last_sql);
        tx.executeSql(sql_array[j]);                    
      }
    },f_fail,f_success);
    //console.log(sql_array);
    function f_success() { 
      console.log('db.transaction = Ok'); 
      for (var i in store_array) {
        //Reset stores states.
        store_array[i].sync(); 
      }
      if(typeof callback == 'function') callback(1);
    }
    function f_fail(error)    { 
      console.log('error',error.message);
      f_crud.mensaje('db.transaction = Fail!','Error: '+error.message+' Orden SQL:' +last_sql);
      if(typeof callback == 'function') callback(-1);
    }


    //alert(data);
    // db.transaction
  },

  get_sql_commands: function(store,sql_array, sincronizar) {
    var record, name, alias;
    var sql = '',sql_log = '';
    // Get Table name in model
    var modelName = store.getProxy().getModel().getName()
    var sql_table = modelName.slice(modelName.lastIndexOf('.') + 1);
    
    // Update
    var records = store.getUpdatedRecords();
    sql = '';
    for (var i in records) {
      record = records[i];
      if (sincronizar !== 'bajar') {
        if (record.get('estado_registro') !== 'A') record.set('estado_registro','M');
      }
      if (sincronizar == 'subir' && record.sql_alias){
        sql_table = record.sql_alias;  
      }
      sql     = 'Update '+sql_table+' set ';
      var fields = record.getFields();
      var field ='';
      for (var i = 0; i < fields.length; i++) {  
        field = fields[i];
        name = field.getName();
        alias = name;
        if(field.sql_alias)  alias = field.sql_alias;            

        if (field.sincronizar === false) name = null;
        
        if (record.get(name)){ 
          if (name === 'estado_registro' && sincronizar == 'subir'){
            // No agrega este campo.
          }else{
            if (field.getType().type === 'date') {
              sql = sql + alias + " = '" + Ext.Date.format( record.get(name), "Y-m-d" ) +"', ";
            } else if (field.getType().type === 'int' || field.getType().type === 'float') {
              sql = sql + alias + " = " + record.get(name) +", ";            
            } else {
              sql = sql + alias + " = '" + record.get(name) +"', ";
            }                      
          } 
        }        
      };
      sql = sql.substr(0,sql.length -2) + ' where id=' + record.get('id');
      if (sincronizar == 'subir'){
          if(record.where) sql = sql+' and '+record.where ;
      }
      sql_array.push(sql);
    }

    // Insert
    records = store.getNewRecords();
    sql = '';
    var sql_fields = '';
    var sql_values = '';
    for (i in records) {
      record = records[i];
      if (sincronizar !== 'bajar') record.set('estado_registro','A');
      if (sincronizar == 'subir' && record.sql_alias){
        sql_table = record.sql_alias;  
        console.log('sql_table',sql_table);
      }
      sql = 'Insert into ' + sql_table + ' ';
      sql_fields = '(';
      sql_values = '(';

      var fields = record.getFields();
      var field ='';
      for (var i = 0; i < fields.length; i++) {  
         field = fields[i];
        name = field.getName();
        alias = name;
        if (sincronizar == 'subir'){
          if(field.sql_alias) alias = field.sql_alias;
          if(field.sincronizar === false) name = null;
        }
        if (record.get(name) ){
          if (name === 'estado_registro' && sincronizar == 'subir'){
            // No agrega este campo.
          }else{
            sql_fields = sql_fields + alias + ',';
            if (field.getType().type === 'date') {
              sql_values = sql_values + "'" + Ext.Date.format( record.get(name), "Y-m-d" ) + "'," ;
            } else if (field.getType().type === 'int' || field.getType().type === 'float') {
              sql_values = sql_values +  record.get(name) + ',' ;
            } else {  
              sql_values = sql_values + "'" +record.get(name) + "',"; 
            }
          }            
        }        
      };
      sql_fields = sql_fields.substr(0,sql_fields.length -1)+')';
      sql_values = sql_values.substr(0,sql_values.length -1)+')';
      sql = sql + sql_fields + ' values '+ sql_values;      
      sql_array.push(sql);
    }

    // Delete
    records = store.getRemovedRecords();
    sql = '';
    for (i in records) {
      record = records[i];
       if (sincronizar == 'subir' && record.sql_alias){
        sql_table = record.sql_alias;  
      }
      sql = 'Delete from '+sql_table+' where id='+record.get('id');
      if (record.get('estado_registro') !=='A') {
        sql_log = "Insert into Registros_borrados (id_registro,tabla) Values (" + record.get('id') + ",'" + sql_table + "')";
        // sql_array.push(sql_log);
      }
      sql_array.push(sql);
    }

    return sql_array ;
  },

  get_codigo: function(record, callback){
    // Obtengo siguiente codigo 
    var modelName = record.self.getName();
    var table_name = modelName.slice(modelName.lastIndexOf('.') + 1);
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 2 * 1024 * 1024);
    var sql = 'SELECT max(codigo) as codigo FROM ' + table_name ;
    db.transaction(function (tx) {
      tx.executeSql(sql, [], function (tx, results) {
        var maxcodigo = Number(results.rows.item(0).codigo)+1;
        if(typeof callback == 'function') callback(maxcodigo); 
      });
    }, f_fail, f_success);
    function f_success() { }
    function f_fail() { 
      f_crud.mensaje('Error','Se produjo un error al generar el nuevo Código - SQL:' + sql);
    }        
  },
  
  get_max_id: function(record){
    var modelName = record.self.getName();
    var table_name = modelName.slice(modelName.lastIndexOf('.') + 1);
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 2 * 1024 * 1024);
    var sql = 'SELECT max(id) as id FROM ' + table_name ;
    db.transaction(function (tx) {
      tx.executeSql(sql, [], function (tx, results) {
        var max_id = Number(results.rows.item(0).id)+1;
        record.set({id: max_id});
      });
    }, f_fail, f_success);
    function f_success() { }
    function f_fail() { 
      f_crud.mensaje('Error', 'Se produjo un error al generar el nuevo ID - SQL:'+sql);
    }    
  }, 

  secuencia: function(callback, cantidad) {
    if (!cantidad) var cantidad = 0;
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 2 * 1024 * 1024);
    var sql = 'Update secuencia Set secuencia = secuencia +1 +' + cantidad ;
    var max_id ;
    db.transaction(function (tx) {
      tx.executeSql(sql);
    },f_fail_update,f_select_secuencia);
    
    function f_fail_update() {
      console.log('fail update');
      f_crud.create_table('Secuencia', function(rtn){
        //If ok create table
        if (rtn === 1) {
          sql = 'Insert Into Secuencia (id,secuencia) Values (1,1) ';
          db.transaction(function (tx) {
            tx.executeSql(sql);
          },f_fail,f_select_secuencia);                  
        }
      });
    }
    
    function f_select_secuencia() {
      sql = 'SELECT max(secuencia) as id FROM secuencia' ;
      db.transaction(function (tx) {
        tx.executeSql(sql, [], function (tx, results) {
          max_id = Number(results.rows.item(0).id)+1;
          //record.set({id: max_id});
        });
      },f_fail,f_success);      
    }

    function f_success() {     
      if(typeof callback == 'function') callback(max_id);
    }

    function f_fail() { 
      console.log('f_fail');
      if(typeof callback == 'function') callback(-1);
      f_crud.mensaje('Error Secuencia','Se produjo un error al generar el nuevo ID - SQL:'+sql);
    }    
  }, 
    
  drop_table: function(table_name) {
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 2 * 1024 * 1024);
    db.transaction(function (tx) {
      tx.executeSql('drop table ' + table_name);  
      console.log('Drop table: '+table_name);
    })
  },
  
  create_table: function(store_name, callback) {
    var store = Ext.getStore(store_name);  
    console.log('store',store);  
    var proxy = store.getModel().getProxy();
    // Get Table name in model
    var modelName = store.getProxy().getModel().getName();
    var sql_table = modelName.slice(modelName.lastIndexOf('.') + 1);
    var sql_create = 'CREATE TABLE IF NOT EXISTS ' + sql_table + ' (' + f_crud.getSchemaString(proxy, store.getModel()) + ')';
    console.log('sql_create',sql_create)
    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024);
    db.transaction(function (tx) {
      tx.executeSql(sql_create);                    
    }, f_fail, f_success);
    function f_success() { 
      console.log('Create table = Ok'); 
      if(typeof callback == 'function') callback(1);
    }
    function f_fail()    {     
      console.log('db.transaction = Fail! ',sql_create); 
      if(typeof callback == 'function') callback(-1);
    }

  },
  
  getSchemaString: function(proxy, model) {
    var me = proxy,
      schema = [],
      //model = proxy.getModel(),
      //idProperty = model.getIdProperty(),
      idProperty = 'uid',
      fields = model.getFields().items,
      uniqueIdStrategy = false,//proxy.getUniqueIdStrategy(),
      ln = fields.length,
      i, field, type, name;
    for (i = 0; i < ln; i++) {
      field = fields[i];
      //type = field.getType().type;
      type = field.getType();
      name = field.getName();

      if (name === idProperty) {
        if (uniqueIdStrategy) {
          type = f_crud.convertToSqlType(type);
          schema.unshift(idProperty + ' ' + type);
        } else {
          schema.unshift(idProperty + ' INTEGER PRIMARY KEY AUTOINCREMENT');
        }
      } else {
        type = f_crud.convertToSqlType(type);
        schema.push(name + ' ' + type);
      }
    }

    return schema.join(', ');
  },

  convertToSqlType: function(type) {
    switch (type.toLowerCase()) {
      case 'date':
      case 'string':
      case 'auto':
        return 'TEXT';
      case 'int':
        return 'INTEGER';
      case 'float':
        return 'REAL';
      case 'bool':
        return 'NUMERIC';
    }
  }
};
