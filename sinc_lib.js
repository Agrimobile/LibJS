f_sinc = {

  agregar_todas: function(){

    MyApp.sinc_array_store[0]= 'ActividadesMysql';
    MyApp.sinc_array_tabla[0]  ='Actividades';

    MyApp.sinc_array_store[1]= 'CampaniasMysql';
    MyApp.sinc_array_tabla[1]  ='Campanias';

    MyApp.sinc_array_store[2]= 'ContratistasMysql';
    MyApp.sinc_array_tabla[2]  ='Contratistas';

    MyApp.sinc_array_store[3]= 'DepositosMysql';
    MyApp.sinc_array_tabla[3]  ='Depositos';

    MyApp.sinc_array_store[4]= 'EstablecimientosMysql';
    MyApp.sinc_array_tabla[4]  ='Establecimientos';

    MyApp.sinc_array_store[5]= 'InsumosMysql';
    MyApp.sinc_array_tabla[5]  ='Insumos';

    MyApp.sinc_array_store[6]= 'LaboresMysql';
    MyApp.sinc_array_tabla[6]  ='Labores';

    MyApp.sinc_array_store[7]= 'Labores_insumosMysql';
    MyApp.sinc_array_tabla[7]  ='Labores_insumos';

    MyApp.sinc_array_store[8]= 'Labores_maquinariaMysql';
    MyApp.sinc_array_tabla[8]  ='Labores_maquinaria';

    MyApp.sinc_array_store[9]= 'Labores_personalMysql';
    MyApp.sinc_array_tabla[9]  ='Labores_personal';

    MyApp.sinc_array_store[10]= 'LotesMysql';
    MyApp.sinc_array_tabla[10] ='Lotes';

    MyApp.sinc_array_store[11]= 'Lotes_actividadesMysql';
    MyApp.sinc_array_tabla[11] ='Lotes_actividades';

    MyApp.sinc_array_store[12]= 'Lotes_coordenadasMysql';
    MyApp.sinc_array_tabla[12] ='Lotes_coordenadas';

    MyApp.sinc_array_store[13]= 'MaquinariaMysql';
    MyApp.sinc_array_tabla[13] ='Maquinaria';

    MyApp.sinc_array_store[14]= 'PersonalMysql';
    MyApp.sinc_array_tabla[14] ='Personal';

    MyApp.sinc_array_store[15]= 'RubrosMysql';
    MyApp.sinc_array_tabla[15] ='Rubros';

    MyApp.sinc_array_store[16]= 'TareasMysql';
    MyApp.sinc_array_tabla[16] ='Tareas';
  },
  
  sincronizar: function(panel){
    var contador = 0;
    f_crud.checkSecuencia();
    
    function f_sinc_tabla(store_name,tabla) {
      if (panel) {
        panel.down('#tabla').setValue(tabla + ' ('+contador+'/'+MyApp.sinc_array_store.length+')');
      }
      else{
        MyApp.main.down('#estado_sinc').setHtml('Sincronizando: ' + tabla);
        window.localStorage.setItem("estado_sinc", "Pendiente");
      }      
      f_sinc.sincronizar_upload(tabla,tabla,function(rtn){
        if (rtn === -1) {
          Ext.Function.defer(function(){ cerrar_ventana(); }, 3000);
          MyApp.main.down('#estado_sinc').setHtml('Sincronizado: Error!');
          window.localStorage.setItem("estado_sinc", "Pendiente - Error");
          f_releer_tablas();
          if (!panel) f_sinc.defer_sinc();;
          return;
        }
        console.log('Fin Upload',tabla);
        if (rtn !== -1){
          f_sinc.sincronizar_download(store_name,tabla,function(rtn) {
            if (rtn === -1){
              Ext.Function.defer(function(){ cerrar_ventana(); }, 3000);
              MyApp.main.down('#estado_sinc').setHtml('Sincronizado: Error!');
              window.localStorage.setItem("estado_sinc", "Pendiente - Error");
              f_releer_tablas();
              if (!panel) f_sinc.defer_sinc();;
              return;
            }
            console.log('Fin Download',tabla);
            contador++;
            f_sinc_todas();
          });
        }
      });

    } 

    function f_sinc_todas() {
      if (contador === MyApp.sinc_array_store.length ) {
        if (panel) panel.down('#tabla').setValue('SINC. TERMINADA.');
        f_releer_tablas();
        if (panel) Ext.Function.defer(function(){ cerrar_ventana(); }, 2000);
        MyApp.main.down('#estado_sinc').setHtml('Sincronizado: terminado');
        window.localStorage.setItem("estado_sinc", "Terminado");

        MyApp.sinc_array_store = [];
        MyApp.sinc_array_tabla = [];
        f_crud.secuencia_mysql(1,function(secuencia) {
          f_crud.sql_command('Update secuencia set secuencia = '+secuencia, function(rtn){
            console.log('Update secuencia set secuencia='+secuencia,rtn)
          } )
        });

        return;
      }
      f_sinc_tabla(MyApp.sinc_array_store[contador],MyApp.sinc_array_tabla[contador]);
    }

    function f_chec_table() {
      for (var i in MyApp.sinc_array_tabla){
        f_crud.create_table(MyApp.sinc_array_tabla[i]);
      }
    }

    function f_releer_tablas() {
      for (var i in MyApp.sinc_array_tabla){
        console.log(MyApp.sinc_array_tabla[i]);
        f_crud.load_store(MyApp.sinc_array_tabla[i]);
      }
    }

    function cerrar_ventana() {
      var lay = MyApp.main.getLayout();
      if(lay.getPrev()){
        lay.prev();
      }
    }

    f_chec_table();
    f_sinc_todas();
  },  
  
  agregar_tabla: function(tabla){
    if (MyApp.sinc_array_tabla.indexOf(tabla) === -1) {
      MyApp.sinc_array_store.push(tabla+'Mysql');
      MyApp.sinc_array_tabla.push(tabla);      
    }
  },
  
  defer_sinc: function(){
    return ;
    Ext.Function.defer(function(){ 
      if(MyApp.main.estado === 'on' && MyApp.main.down('#estado_editar').getHtml()==='' ){
        f_sinc.sincronizar();
      } 
      else {
        f_sinc.defer_sinc();
      }        
    }, 30000);          
  },

  sincronizar_upload: function(store_name,tabla,callback){
    var sql_where = "estado_registro = 'A' or estado_registro='M' ",
      sql_array = [],
      labores_sql_array = [],
      cant_secuencia = 0;
    
    f_crud.load_store(store_name, sql_where, '', function(store){
      if (store === -1) {
        console.log('Error subiendo');
        f_crud.mensaje('Error en Load sinc tabla:', tabla);
        if(typeof callback == 'function') callback(-1); // Sinc error.
        return;
      }
      if (typeof store==='object') {
        console.log('Sincronizando upload tabla: '+store_name,store.getCount());
        store.each(function (item, index, length) {
          if (item.get('estado_registro') === 'A'){
            item.phantom = true;
            cant_secuencia++ ;
            //obtener id base en la nube.
          } else {
            //item.setDirty();
            item.set('estado_registro','E');
          }
        });        
        if (cant_secuencia > 0 ) { 

          f_crud.secuencia_mysql(cant_secuencia,function(secuencia) {
            if (secuencia ===  -1) {
              if(typeof callback == 'function') callback(-1); // Sinc error.
            }
            var cont_sec = secuencia - cant_secuencia ;
            store.each(function (item, index, length) {
              if (item.get('estado_registro') === 'A') {
                if (tabla==='Labores'){
                  labores_sql_array.push('Update Labores_insumos    set id_labores='+cont_sec+' where id_labores='+item.get('id'))
                  labores_sql_array.push('Update Labores_personal   set id_labores='+cont_sec+' where id_labores='+item.get('id'))
                  labores_sql_array.push('Update Labores_maquinaria set id_labores='+cont_sec+' where id_labores='+item.get('id'))
                }

                item.set('id',cont_sec);
                cont_sec++;
              }
            });
            f_save_sinc_store();
          });
        }
        else {
          f_save_sinc_store();
        }
        function f_save_sinc_store(){
          f_crud.get_sql_commands(store,sql_array,'subir');
          f_crud.load_store('Registros_borrados', "Upper(tabla)='" + tabla.toUpperCase() + "'", '', function(store_borrados){
            if (store_borrados === -1) {
              console.log('Error subiendo');
              f_crud.mensaje('Error:', 'Error de lectura de registros borrados.', 5);
              if(typeof callback == 'function') callback(-1); // Sinc error.
              return;
            }
            var sql_tabla = tabla;
            var record = Ext.create(store.getProxy().getModel().getName());
            if (record.getInitialConfig('sql_alias')){
              sql_tabla = record.getInitialConfig('sql_alias');
            }              
            store_borrados.each(function (item, index, length) {
              sql_array.push('Delete from ' + sql_tabla + ' where id='+item.get('id_registro'));
            });    
            f_crud.save_mysql_array(sql_array,function(rtn){
              if (rtn === -1) {
                //Ext.Msg.alert('Error en save mysql:','Error enviando ordenes sql en tabla: '+tabla);
                if(typeof callback == 'function') callback(-1); // Sinc error.
                return;                
              }
              console.log('dentro rtn',rtn);
              f_crud.sql_command('Update '+ tabla +' set estado_registro=null');
              f_crud.sql_command("Delete from Registros_borrados where Upper(tabla)='" + tabla.toUpperCase() + "'");

              if (tabla === 'Labores') {
                f_crud.sql_commands(labores_sql_array, function(rtn) {
                  console.log('update id_labores... =', rtn);
                });
              }

              if(typeof callback == 'function') callback(1); // Sinc ok.
            });
          });          
        }
      
      }
    });
  },

  sincronizar_download: function(store_name,tabla,callback){
    var store_tmp = Ext.getStore(store_name);
    if (!store_tmp) {
      f_crud.mensaje('Error', 'No existe el datastore: ' + store_name + ', o no tiene definida una orden SQL', 5);
      if(typeof callback == 'function') callback(-1); // Sinc error
      return;
    }
    
    f_crud.load_mysql_store(store_name,store_tmp.getSql(),function(store){
      if (store === -1) {
        console.log('Error de descarga');
        
        if(typeof callback == 'function') callback(-1);
        return;
      }
      if (typeof store==='object') {

        if (store.getCount() > 0) {
          f_crud.sql_command('Delete from ' + tabla, function(rtn){
            if (rtn===1) {
              store.each(function (item, index, length) {
                  item.phantom = true;
              });
              //debugger;        
              f_crud.save_stores([store],function(rtn){
                if (rtn === -1) {
                  console.log('Error al sincronizar tabla:',tabla);
                  if(typeof callback == 'function') callback(rtn);
                }
                store.each(function (item, index, length) {
                    item.phantom = false;
                });
                if(typeof callback == 'function') callback(rtn);
              },'bajar');
            }
          });          
        } else {
          if(typeof callback == 'function') callback(1);
        }

      }
    });
  },  
  
};