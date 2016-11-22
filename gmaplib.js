var poligono = [];

var f_mapa = {
	
	dibujar_poligono: function (cod_lote,nombre_lote,callback){
		var map = MyApp.mapa ;
		var polyOptions = {
          strokeColor: 'Maroon',
          strokeOpacity: 1.0,
          strokeWeight: 3
		};
		var polyline = new google.maps.Polyline(polyOptions);
		polyline.setMap(map);
		var marcador;
		var puntos_poligono = [];
		
		google.maps.event.addListener(map, 'click', addLatLng);		
		function addLatLng(event) {
			puntos_poligono.push(event.latLng);
			var latLng = event.latLng;
			var path = polyline.getPath();
			path.push(event.latLng);
			// Agrega un marcador al poligono
			if (path.getLength() == 1 ) {
				marcador = new google.maps.Marker({
					position: event.latLng,
					title: '#' + path.getLength(),
					map: map
				});
				//alert("dentro");
				google.maps.event.addListener(marcador, 'click', function() {
					google.maps.event.clearListeners(marcador, 'click');
					google.maps.event.clearListeners(map, 'click');
					//Borro polyline
					polyline.setMap(null);
					// Borro marcador
					marcador.setMap(null);
					f_mapa.dibujar_lote(cod_lote,nombre_lote, puntos_poligono,true);
					if(typeof callback == 'function') callback();				
				});	
			}
		} 		
	},

	dibujar_todos: function(store_lotes,store_coordenadas){
		var map = MyApp.mapa ;
		// Limpio Lotes
		for (i=0;i<store_lotes.getCount(); i++){
			cod_lote = store_lotes.getAt(i).get('codigo');
			if (poligono[cod_lote]) { poligono[cod_lote].setMap(null);}
		}			
		// Dibujo lotes	
		var cod_lote,nombre_lote,puntos;
        
		for (var i=0;i<store_lotes.getCount(); i++){
			cod_lote = store_lotes.getAt(i).get('codigo') ;
			nombre_lote = store_lotes.getAt(i).get('nombre') ;
			puntos = f_mapa.cargar_puntos_lote(cod_lote,store_coordenadas) ;
			f_mapa.dibujar_lote(cod_lote,nombre_lote,puntos,false,"Maroon",0) ;
		}
	},
	
	cargar_puntos_lote: function(cod_lote,store_coordenadas) {
		var puntos_poligono = [];
		for (var i=0;i < store_coordenadas.getCount();i++) {
			if (cod_lote === store_coordenadas.getAt(i).get('cod_lote')) {
				puntos_poligono.push(new google.maps.LatLng(store_coordenadas.getAt(i).get('latitud'), store_coordenadas.getAt(i).get('longitud')));
			}
		}
		return puntos_poligono;
	},
	
	dibujar_lote: function(cod_lote,nombre_lote, puntos, editar, color_linea, transparencia){
		var map = MyApp.mapa ;
		if(!color_linea)   color_linea   = "Maroon";
		if(!transparencia) transparencia = 0;
		poligono[cod_lote] = new google.maps.Polygon({
		  paths: puntos,
		  strokeColor: color_linea,
		  strokeOpacity: 0.8,
		  strokeWeight: 3,
		  fillColor: color_linea,
		  fillOpacity: transparencia,
		  cod_lote: cod_lote,
		  nombre_lote: nombre_lote,
		  editable: editar
		});
		poligono[cod_lote].setMap(MyApp.mapa);	
		var actividades = '<p> </p> <p> Actividades:</p>' ;
		f_crud.sql_select('Select nombre from Lotes_actividades where cod_lote='+cod_lote,function(data){
            console.log('dentro select ',cod_lote);
			for (var i in data ) {
				actividades = actividades + '<p> '+ data[i].nombre+' </p>';
			}
			google.maps.event.addListener(poligono[cod_lote], 'click', function(e) {
				var superficie = google.maps.geometry.spherical.computeArea(puntos) / 10000;
				var texto = ""+poligono[cod_lote].nombre_lote + "<p>Superficie Calculada: " + superficie.toFixed(2) +"</p>"+actividades;
				poligono[cod_lote].infoWindow = new google.maps.InfoWindow({content: texto});
				var latLng = e.latLng;
				poligono[cod_lote].infoWindow.setPosition(latLng);
				poligono[cod_lote].infoWindow.open(MyApp.mapa);
			});		
		});		
				
		google.maps.event.addListener(poligono[cod_lote], 'mouseover', function(e) {
			poligono[cod_lote].setOptions({strokeColor : 'White'}) ;
			MyApp.loteActivoMapa = cod_lote ;
		});
		google.maps.event.addListener(poligono[cod_lote], 'mouseout', function(e) {
			poligono[cod_lote].setOptions({strokeColor : color_linea}) ;
		});
	},
		
	limpiar_poligono: function(id_lote){
		
		poligono[id_lote].setMap(null);
	}
};