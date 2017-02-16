var f_crud = {

  cerrar_mensaje: function(tiempo){
  // testing cerrar mensaje
    Ext.Function.defer(function(){
      Ext.Msg.hide();
    }, tiempo * 1000);    
  },

  mensaje: function(title, msg, tiempo){
    
    Ext.Msg.show({
      title: title,
      width: "80%",
      message: msg,
      iconCls: 'x-fa fa-warning',
      buttons:  Ext.Msg.OK,
      fn: function(btn) {
        f_crud.enviar_msg_error(title + ', ' + msg);
      }
    });
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
        f_crud.mensaje('Error 1 de lectura en tabla: ' + sql_table , 'Controle su conexión a Internet.');      
        // f_crud.cerrar_mensaje(5);
        if(typeof callback == 'function') callback(-1);        
      }
      if (success && records != null && records !== undefined){
        console.log('Table: ' + sql_table + '" records: ' + records.length);
        if (records.length === 0) console.log('Sql:',sql_command);
        if(typeof callback == 'function') callback(store);
      } else {
        f_crud.mensaje('Error 2 de lectura en tabla: ' + sql_table , 'Controle su conexión a Internet.');      
        // f_crud.cerrar_mensaje(5);
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
          f_crud.mensaje('Error SQL', resp_json.message + ' -<br>' + data, 5);
          if(typeof callback == 'function') callback(-1);
        }
      },
      failure: function(response, opts) {
        alert(MyApp.url_lib + 'crud_lib.php' + '?action=batch');
        f_crud.mensaje('Error','Error en conexion con el servidor, revise su conexion Internet.  Resp text: ' + response.responseText + ' Respuesta n: ' + response.status, 5);
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
    }, f_fail, f_success);
    
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
    var store = Ext.getStore(store_name),
        record = Ext.create(store.getProxy().getModel().getName()),
    // Extract fields in model
        sql_fields = '',  
        fields = record.getFields(); 

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
        for (var i = 0; i < results.rows.length; i++) {
          data_array.push(results.rows.item(i));
        }
        store.add(data_array);
      });
    }, f_fail, f_success);
    
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

  openNestedForm: function(panelName) {
    var pantalla = Ext.create('MyApp.view.' + panelName);
    pantalla.fireEvent("render",pantalla);
    f_crud.form_open(pantalla,'ADD');
    pantalla.close();
    pantalla.destroy();
  },
    
  form_open: function(grid_panel, action) {
    var form_panel = Ext.create(grid_panel.form_name), frm, 
        // event onEnter handler
        onEnterHandler = function(textfield, e, eOpts) {
          if(e.keyCode === 13) {
            e.stopEvent();            
            textfield.blur();
          }
        };
    
    if (action==='EDIT' && typeof grid_panel.record==='undefined') return;
    
    MyApp.pantalla_anterior = MyApp.main.getLayout().getActiveItem();
    
    // Code for add an eventHandler in each input of any form
    if(form_panel.getForm) {
      frmFields = form_panel.getForm().getFields().items;
      for (var i = frmFields.length - 1; i >= 0; i--) {
        frmFields[i].enableKeyEvents = true;
        frmFields[i].addListener("keypress", onEnterHandler);
      }
    
    }
      
    if(grid_panel.parent) {
      form_panel.parent = grid_panel.parent;
    }
    form_panel.model_name  = grid_panel.model_name;
    form_panel.store_name  = grid_panel.store_name;
    form_panel.store_array = grid_panel.form_store_array;
    form_panel.grid_panel = grid_panel.down('#grid');
    form_panel.action = action;

    if (action === 'ADD') {
      
      var newrecord = Ext.create(form_panel.model_name);    
      f_crud.secuencia(function(rtn){
        if (rtn !== -1) {
          newrecord.set('id', rtn);
          form_panel.loadRecord(newrecord);
          if (typeof newrecord.get('codigo') === 'undefined') {
            MyApp.main.add(form_panel);
            MyApp.main.getLayout().setActiveItem(form_panel);
          } 
          else {
            f_crud.get_codigo(newrecord,function(rtn) {
              newrecord.set('codigo', rtn)
              form_panel.loadRecord(newrecord);
              MyApp.main.add(form_panel);
              MyApp.main.getLayout().setActiveItem(form_panel);
            });
          }          
        }
      });
    }
    else {
      if (action === 'EDIT') {
        form_panel.loadRecord(grid_panel.record);
      }
      MyApp.main.add(form_panel);
      MyApp.main.getLayout().setActiveItem(form_panel);
    }
  },
  
  //grid_check_delete can be used in grid with records that are asociated by agregation with other tables

  grid_check_delete: function(grid_panel, checkConfig) {
    var allowDelete = true, sqlTablesToDelete = [], sqlTablesExist = "", sqlSelect = "", tableConfig, pkFieldName,
      db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024), tablesCreated=[];

    if(!Array.isArray(checkConfig)) {
      checkConfig = [checkConfig];
    }

    sqlTablesExist = "SELECT name FROM sqlite_master WHERE type='table' AND (";

    for (var i = checkConfig.length - 1; i >= 0; i--) {
      sqlTablesExist = sqlTablesExist + "name = '" + checkConfig[i].table + "'";
      if (i > 0 ) {
        sqlTablesExist = sqlTablesExist + " OR ";
      }
    }
    
    sqlTablesExist = sqlTablesExist + ")";
    db.transaction(function(tx){
      tx.executeSql(sqlTablesExist, [], function(tx, result){
        for (var i = result.rows.length - 1; i >= 0; i--) {
          tablesCreated.push(result.rows[i].name);
        }
      });
    }, function(e) { //transaction failed cb
      console.log('db.transaction = Fail! - sql statement: ' + e.message); 
    }, function() {  //transaction succeeded cb
      
      if(tablesCreated.length > 0) {
        // LAS TABLAS EXISTEN - chequear contenido
        for (var i = checkConfig.length - 1; i >= 0; i--) {
          tableConfig = checkConfig[i];
          if(tablesCreated.indexOf(tableConfig.table) > -1) {
            if (!tableConfig.pkName) {
              pkFieldName = "codigo";
            }
            else {
              pkFieldName = tableConfig.pkName;
            }
            sqlSelect = sqlSelect + "select count(*) as 'Count', '" + tableConfig.table + "' as 'Table' from " + tableConfig.table + " where " + tableConfig.field + "=" + grid_panel.record.data[pkFieldName];
            sqlTablesToDelete.push("delete from " + tableConfig.table + " where " + tableConfig.field + "=" + grid_panel.record.data[pkFieldName]);
            if(i>0) { // glue
              sqlSelect = sqlSelect + " union ";
            }
          }
        }
        
        db.transaction(function(tx){
          tx.executeSql(sqlSelect, [], function(tx, result){
            for (var i = result.rows.length - 1; i >= 0; i--) {
              if(result.rows[i].Count > 0 ) {
                allowDelete = false;
              }
            }
          });
        }, function(e) { //transaction failed cb
          console.log('db.transaction = Fail! - sql statement: ' + e.message); 
        }, function() {  //transaction succeeded cb
          if(allowDelete) {
            f_crud.grid_delete(grid_panel);
          }
          else {

            // CODIGO PARA 'BORRAR DE TODAS FORMAS'
            /*var borrarVinculados =  function(btn) {
              if(btn === 'yes') {
                f_crud.sql_commands(sqlTablesToDelete, function(rtn) {
                  if(rtn > 0) {
                    f_crud.grid_delete(grid_panel, true);  
                  }
                  else {
                    console.log("Error: algo salio mal cuando se intento los registros vinculados");
                  }
                });
              }
            },
            borrarVinculadosAlert = function(btn) {
              console.log("borrarVinculadosAlert-btn: " + btn);
              if(btn === "no") {
                Ext.Msg.show({
                  title: checkConfig[0].msgTitle,
                  message: 'Se borraran todos los registros relacionados, continuar?',
                  iconCls: 'x-fa fa-warning',
                  buttons:  Ext.Msg.YESNO,
                  buttonText: {
                    yes: 'Si',
                    no: 'No' 
                  },
                  fn: borrarVinculados
                });
              }
            };
            Ext.Msg.show({
              title: checkConfig[0].msgTitle,
              message: checkConfig[0].message,
              iconCls: 'x-fa fa-warning',
              buttons:  Ext.Msg.YESNO,
              buttonText: {
                yes: 'Ok',
                no: 'Borrar de todas formas' 
              },
              fn: borrarVinculadosAlert
            });*/

            // CODIGO PARA 'NO BORRAR DE TODAS FORMAS'
            Ext.Msg.show({
              title: checkConfig[0].msgTitle,
              message: checkConfig[0].message,
              iconCls: 'x-fa fa-warning',
              buttons:  Ext.Msg.OK
            });
          }
        });
        // Termina el chequeo del contenido.
      }
      else {
        // tablas asociadas no existen
        f_crud.grid_delete(grid_panel);
      }

    });
    // Termina por la existencia de las tablas

  }, // Termina metodo grid_check_delete

  grid_delete: function(grid_panel, force) {
    var opcion = function (btn) {
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
    };
    if(force) {
      opcion('yes');
    }
    else{
      Ext.Msg.show({
        title:'Borrar registro',
        message: 'Desea borrar el registro',
        buttons:  Ext.Msg.YESNO,
        iconCls: 'x-fa fa-warning',
        fn: opcion
      });
    }
  },
      
  close_form: function(form) {
    if (MyApp.main.getLayout().getLayoutItems().length > 1) {MyApp.main.getLayout().prev();
    }
    form.close();
    // MyApp.main.down('#estado_editar').setHtml(''); 
    var sync = window.localStorage.getItem("estado_sinc");   
    if (sync === 'Pendiente'){
      MyApp.main.down('#estado_sinc').setHtml('Sincronizado: ' + sync);
      window.localStorage.setItem("estado_sinc", "Pendiente");
    }
  },

  /* 
    Mientras que save_form toma el record generado por el form, y lo inserta en la tabla, save_several_records 
    loopeara sobre los records de una grilla y los irá insertando (TIENE QUE SER SECUENCIAL, ya que cada registro
    necesita generar una nueva clave) - config should have the name of the pivot pk and the name of the recordsPk, like
    
    var config = {
      gridRecordPK: 'cod_lote',
      pivotPK: 'cod_actividad'
    };
  */

  save_several_records: function(form_panel, config) {
    var recordsToAdd = form_panel.down("#addinggrid").getSelection(),
        store_array = form_panel.store_array, 
        len = recordsToAdd.length, 
        modelName = store_array[0].getModel().getName(),
        tableName = modelName.slice(modelName.lastIndexOf('.') + 1);

    f_crud.secuencia(function(genMaxId) {
      if(genMaxId > -1) {
        f_crud.get_codigos(tableName, len, function(genMaxCod) {
          if(genMaxCod > -1) {
            // magic happens here.. 
            var newrecord, newRecordValues = {}, maxId = genMaxId, maxCod = genMaxCod, gridRecord;
            for (var i = len - 1; i >= 0; i--) {
              gridRecord = recordsToAdd[i];

              // identifiers
              newrecord = Ext.create(form_panel.model_name);
              newrecord.set('id', maxId);
              newrecord.set('codigo', maxCod);

              // record DATA
              
              newRecordValues[config.gridRecordPK] = gridRecord.data.codigo;
              newRecordValues[config.pivotPK] = form_panel.parent.codigo;
              newRecordValues.nombre = gridRecord.data.nombre + "(" + form_panel.parent.nombre + ")";

              // set record DATA
              newrecord.set(newRecordValues);

              // adding record
              store_array[0].add(newrecord);

              // next identifiers
              maxId--;
              maxCod--;
            }

            // saving store
            
            f_crud.save_stores(store_array, function(rtn){
              if (rtn > -1) {
                f_crud.close_form(form_panel);
                console.log("Worked ok!");
              }
              else {
                reject("Error: while trying to save record");
              }
            });
          }
          else {
            reject("Error: while trying to generate codigo value");
          }
        });
      }
      else {
        reject("Error: while trying to generate id value");
      }
    }, len);  
  },
  
  save_form: function(form_panel) {
    var store_array = form_panel.store_array,
        record = form_panel.getRecord(),
        values = form_panel.getValues(),
        invalidDateRegEx = /^(3[0-1]|[1-2][0-9]|0[1-9])\-(1[0-2]|0[1-9])\-(\d{4})$/i, 
        validDateRegEx = /^(\d{4})\-(1[0-2]|0[1-9])\-(3[0-1]|[1-2][0-9]|0[1-9])$/i;
    record.set(values);
    
    // check dates: itera sobre las propiedades del nuevo record, 
    // si encuentra una fecha y esta en d-m-Y, la convierte a Y-m-d
    for(property in values) {
      var invalidDate = String(values[property]).match(invalidDateRegEx);
      if(invalidDate){
        var newDateStr = invalidDate[3] + "-" + invalidDate[2] + "-" + invalidDate[1],
            newDateObj = {};
        newDateObj[property] = newDateStr;
        record.set(newDateObj);
      }
    }

    if (form_panel.action === 'ADD') {
      store_array[0].add(record);
      if(form_panel.grid_panel.viewConfig) { // TODO: encontrar una mejor forma de hacer este control.
        form_panel.grid_panel.getSelectionModel().select(record);
      }
      else {
        if(MyApp.pantalla_anterior.initialCls === "formpanel" && MyApp.pantalla_anterior.dropdownId) {
          var ddf = MyApp.pantalla_anterior.dropdownId;
          var dd = MyApp.pantalla_anterior.down("#" + ddf);
          dd.setValue(form_panel.getValues().codigo); 
        }
        
      }
    }
    f_crud.save_stores( store_array,function(rtn){
      if (rtn === -1) {
        alert('Error durante la grabación ');
      }
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

    var sync = window.localStorage.getItem("estado_sinc");
    if (sync !== 'Pendiente') {
      window.localStorage.setItem("estado_sinc", "Pendiente");
      MyApp.main.down('#estado_sinc').setHtml('Sincronizado: Pendiente');
      // f_sinc.defer_sinc();      
    }
  },
  
  save_stores: function(store_array, callback, sincronizar) {
    //---- Get data in json format
    var data='', data_tmp='' ;
    var sql_array = [];
    for (var i in store_array) {
      f_crud.get_sql_commands(store_array[i],sql_array,sincronizar);
    }    

    var db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 5 * 1024 * 1024);
    var last_sql = '';
    db.transaction(function (tx) {
      for (var j in sql_array){
        last_sql = sql_array[j];
        tx.executeSql(sql_array[j]);                    
      }
    },f_fail,f_success);

    function f_success() { 
      console.log('db.transaction = Ok'); 
      for (var i in store_array) {
        //Reset stores states.
        store_array[i].sync(); 
      }
      if(typeof callback == 'function') callback(1);
    }
    function f_fail(error) { 
      console.log('error',error.message);
      f_crud.mensaje('db.transaction = Fail!','Error: '+error.message+' Orden SQL:' +last_sql);
      if(typeof callback == 'function') callback(-1);
    }
  },

  get_sql_commands: function(store, sql_array, sincronizar) {

    var record, name, alias,
    sql = '',sql_log = '',
    // Get Table name in model
    modelName = store.getProxy().getModel().getName(), sql_table;
    sql_table = modelName.slice(modelName.lastIndexOf('.') + 1);
    
    // Update
    var records = store.getUpdatedRecords();
    sql = '';
    for (var i in records) {
      record = records[i];
      if (sincronizar !== 'bajar') {
        if (record.get('estado_registro') !== 'A') {
          record.set('estado_registro','M');
        }
      }
      if (sincronizar === 'subir' && record.aliasSQL){
        sql_table = record.aliasSQL;  
      }
      sql     = 'Update '+sql_table+' set ';
      var fields = record.getFields();
      var field = '';
      for (var i = 0; i < fields.length; i++) {  
        field = fields[i];
        name = field.getName();
        alias = name;
        if (field.aliasSQL && sincronizar === 'subir') {
          alias = field.aliasSQL;
        }
        
        if (field.sincronizar === false) {
          name = null;
        } //??
        
        if (record.get(name)){ 
          if (name === 'estado_registro' && sincronizar === 'subir'){
            // No agrega este campo.
          }
          else{
            if (field.getType() === 'date') {
              sql = sql + alias + " = '" + Ext.Date.format( record.get(name), "Y-m-d" ) +"', ";
            } else if (field.getType() === 'int' || field.getType() === 'float') {
              sql = sql + alias + " = " + record.get(name) + ", ";            
            } else {
              sql = sql + alias + " = '" + record.get(name) + "', ";
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
      if (sincronizar !== 'bajar') {
        record.set('estado_registro','A');
      }

      if (sincronizar === 'subir' && record.aliasSQL) {
        sql_table = record.aliasSQL;  
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
        if (sincronizar === 'subir' ){
          if(field.aliasSQL) {
            alias = field.aliasSQL;
          }
          if(field.sincronizar === false) {
            name = null;
          }
        }
       /* if(sincronizar === 'bajar' && field.aliasSQL) {
          name = field.aliasSQL;
        }*/
        if (record.get(name) ){
          if (name === 'estado_registro' && sincronizar === 'subir'){
            // No agrega este campo.
          }else{
            sql_fields = sql_fields + alias + ',';
            if (field.getType() === 'date') {
              sql_values = sql_values + "'" + Ext.Date.format( record.get(name), "Y-m-d" ) + "'," ;
            } else if (field.getType() === 'int' || field.getType() === 'float') {
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
       if (sincronizar === 'subir' && record.aliasSQL){
        sql_table = record.aliasSQL;  
      }
      sql = 'Delete from '+sql_table+' where id='+record.get('id');
      if (record.get('estado_registro') !=='A') {
        sql_log = "Insert into Registros_borrados (id_registro,tabla) Values (" + record.get('id') + ",'" + sql_table + "')";
        sql_array.push(sql_log);
      }
      sql_array.push(sql);
    }

    return sql_array ;
  },

  get_codigo: function(record, callback){
    // Obtengo siguiente codigo 
    var modelName = record.self.getName(), table_name, db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 2 * 1024 * 1024), sql;
    table_name = modelName.slice(modelName.lastIndexOf('.') + 1);

    sql = 'SELECT max(codigo) as codigo FROM ' + table_name ;
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

  get_codigos: function(table, cantidad, callback){
    // Obtengo siguiente/s codigo/s 
    var  maxcodigo, sql,
    db = openDatabase(MyApp.archivo_base, '1.0', MyApp.archivo_base, 2 * 1024 * 1024);

    var sql = 'SELECT max(codigo) as codigo FROM ' + table;
    db.transaction(function (tx) {
      tx.executeSql(sql, [], function (tx, results) {
        if(cantidad) {
          maxcodigo = Number(results.rows.item(0).codigo) + cantidad;
        }
        else {
          maxcodigo = Number(results.rows.item(0).codigo) + 1;
        }
        if(typeof callback === 'function') callback(maxcodigo);
      });
    }, f_fail, f_success);
    function f_success() { }
    function f_fail() { 
      f_crud.mensaje('Error','Se produjo un error al generar el nuevo Código - SQL:' + sql);
    }        
  },
  
  get_max_id: function(record) {
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

  checkSecuencia: function() {
    //----- controlo que exista un registro en secuencia
    var sql ='select count(id) as cant from secuencia';
    var me = this;
    me.load_store('Secuencia','','',function(rtn) {
      me.sql_select(sql,function(array) {
        var cant = array[0].cant;
        if (cant===0) {
          me.sql_command('Insert into secuencia (id,secuencia) values (1,1)', function(rtn){
            console.log('Insert en tabla secuencia = ',rtn);
          } );
        }
      });
    });
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
  },

  applyRenderer: function(panel, gridId, storeName, targetField, colDataIndex) {
    var i, cols = panel.down("#" + gridId).columns,
        rendFn = function(value, metaData, record, rowIndex, colIndex, store){
          return f_crud.getDisplayValue(storeName, value, targetField);
        };

    for (i = cols.length - 1; i >= 0; i--) {
      if(cols[i].dataIndex === colDataIndex) {
        cols[i].renderer = rendFn;
      }
    }
  },

  getDisplayValue: function(storeName, value, fieldName, idName) {
    var st = Ext.getStore(storeName), cod, displayValue;
    if(idName) {
      cod = st.find(idName, value);  
    }
    else {
      cod = st.find("codigo", value);
    }
    if(cod > -1) {
      displayValue = st.getAt(cod).get(fieldName);
    }
    else {
      displayValue = '';
    }
    return displayValue;
  },

  renderGridWidth: function(component) {
    var cols = component.getColumns(), nonHiddenCols = 0, avg = 0;
    for (var i = cols.length - 1; i >= 0; i--) {
      if(cols[i].hidden === false){
        nonHiddenCols++;
      }
    }
    if(nonHiddenCols > 0) {
      avg = 100/nonHiddenCols;
      avgStr = avg + "%";
      for (i = cols.length - 1; i >= 0; i--) {
        if(cols[i].hidden === false){
         cols[i].width = avgStr;
        }
      }
    }
    else {
      console.log("Error: all the columns were hidden!");
    }
  },

  setFormTitle: function(component, fem) {
    var initTitle = component.initialTitle;
    if(component.action === 'ADD') {
      if(fem) {
        component.setTitle('Nueva ' + initTitle);  
      }
      else {
        component.setTitle('Nuevo ' + initTitle);  
      }
    }
    else if(component.action === 'EDIT') {
      component.setTitle('Editar ' + initTitle);
    }
    else {
      component.setTitle(initTitle);
    }
  }
};