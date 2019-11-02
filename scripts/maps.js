var sMap = sMap || {};

sMap = {
    popisek: "",
    map: {},
    layer: {},
    init: function () {
        let that = this;
        let center = SMap.Coords.fromWGS84(14.41790, 50.12655);
        let mouse = new SMap.Control.Mouse(SMap.MOUSE_PAN | SMap.MOUSE_WHEEL | SMap.MOUSE_ZOOM); /* Ovládání myší */
        that.map = new SMap(JAK.gel("map"), center, 13);
        that.map.addDefaultLayer(SMap.DEF_BASE);
        that.map.addDefaultLayer(SMap.DEF_OPHOTO).enable();
        that.map.addDefaultLayer(SMap.DEF_TURIST);
        that.map.addDefaultLayer(SMap.DEF_TURIST_WINTER);
        that.map.addDefaultControls();
        that.map.addControl(new SMap.Control.Sync()); /* Aby mapa reagovala na změnu velikosti průhledu */
        that.map.addControl(mouse);
        that.layer = new SMap.Layer.Marker();
        that.map.addLayer(that.layer);
        that.layer.enable();
        that.map.getSignals().addListener(window, "map-click", that.click);
        
        that.suggestSearchInit();
        that.layerSwitchInit();
        that.signalsInit();
    },
    altitudeResponse: function(a) {
        let that = this;
        let inputEl = document.querySelector("input[id='altitude']");
        let altRounded = Math.round(a);
        inputEl.value = altRounded;
        that.sMap.popisek.innerHTML = altRounded;
    },
    click: function(e, elm) {
        let that = this;
        let coords = SMap.Coords.fromEvent(e.data.event, that.sMap.map);
        that.sMap.addMarker(coords, that.sMap.layer, "#9B1617");
        coords.getAltitude().then(that.sMap.altitudeResponse);
    },
    addMarker: function (coords, layer, color) {
        let that = this;
        let markerElement = JAK.mel("div");
        let obrazek = JAK.mel("img", {src:SMap.CONFIG.img+"/marker/drop-red.png"});
        markerElement.appendChild(obrazek)
        that.popisek = JAK.mel("div", {}, {position:"absolute", left:"0px", top:"0px", textAlign:"center", width:"auto", color:"white", background: color});
        markerElement.appendChild(that.popisek);
        let marker = new SMap.Marker(coords, null, {url:markerElement});
        marker.decorate(SMap.Marker.Feature.Draggable);
        layer.addMarker(marker);  
    },
    suggestSearchInit: function() {
         // naseptavac
        let that = this;
        let inputEl = document.querySelector("input[id='find']");
        let suggest = new SMap.Suggest(inputEl, {
                    provider: new SMap.SuggestProvider({
                    updateParams: params => {
                    let c = that.map.getCenter().toWGS84();
                    params.lon = c[0].toFixed(5);
                    params.lat = c[1].toFixed(5);
                    params.zoom = that.map.getZoom();
                    // povolime kategorie
                    params.enableCategories = 1;
                    // priorita jazyku, oddelene carkou
                    params.lang = "cs,en";
                }
            })
        });
        suggest.addListener("suggest", suggestData => {
            // vyber polozky z naseptavace
            console.log(suggestData.data.longitude + " " + suggestData.data.latitude);
            //center = SMap.Coords.fromWGS84(suggestData.longitude, suggestData.latitude);
            that.map.setCenter(SMap.Coords.fromWGS84(suggestData.data.longitude, suggestData.data.latitude), false);
        });
    },
    layerSwitchInit: function() {
        let that = this;
        let layerSwitch = new SMap.Control.Layer({
            width: 65,
            items: 4,
            page: 4
        });
        layerSwitch.addDefaultLayer(SMap.DEF_BASE);
        layerSwitch.addDefaultLayer(SMap.DEF_OPHOTO);
        layerSwitch.addDefaultLayer(SMap.DEF_TURIST);
        layerSwitch.addDefaultLayer(SMap.DEF_TURIST_WINTER);
        that.map.addControl(layerSwitch, {left:"3px", top:"63px"});
    },
    signalsInit: function() {
        let that = this;
        let start = function(e) { 
            let node = e.target.getContainer();
            node[SMap.LAYER_MARKER].style.cursor = "help";
        };

        let stop = function(e) {
            let node = e.target.getContainer();
            node[SMap.LAYER_MARKER].style.cursor = "";
            that.popisek = node[SMap.LAYER_MARKER].querySelector("div div");
            e.target.getCoords().getAltitude().then(that.altitudeResponse);
        };

        let signals = that.map.getSignals();
        signals.addListener(window, "marker-drag-stop", stop);
        signals.addListener(window, "marker-drag-start", start); 
    },
    openFile: function(event) {
        let that = this;
        let input = event.target;

        let reader = new FileReader();
        reader.onload = function() {
            let text = reader.result;
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(text,"text/xml");
            let coordsArray = [];
            let altsArray = [];
            let lowAltitude = -59;
            let userDronAltitude = parseInt(document.querySelector("input[id='userDronAltitude']").value, 10);

            let x = xmlDoc.getElementsByTagName("coordinates");
            for (let i = 0; i < x.length; i++) {
                let coord = x[i].childNodes[0].nodeValue.split(",");
                let coords = SMap.Coords.fromWGS84(coord[0], coord[1]);
                coordsArray.push(coords);
                altsArray.push(Math.round(coord[2]));
            }
            let firstAltitude = altsArray[0];
            let markers = altsArray.length;
            let differencesAltitudes = firstAltitude - altsArray[markers-1];
            let startDronAltitude;

            if (differencesAltitudes > lowAltitude) {
                lowAltitude = differencesAltitudes;
                startDronAltitude = 0;
            } else {
                startDronAltitude = altsArray[markers-1] - firstAltitude + lowAltitude;
            }
            for (let i = 0; i < coordsArray.length; i++) {
                that.addMarker(coordsArray[i], that.layer, "green");
                let dronAltitude = userDronAltitude + altsArray[i] - firstAltitude + lowAltitude;
                that.popisek.innerHTML = dronAltitude + "(" + (markers--) + ":" +  altsArray[i] + ")";
            }
            //let centerzoom = [arr[0], 21];//SMap.computeCenterZoom(arr);
            that.map.setCenterZoom(coordsArray[0], 20, false);
            document.querySelector("input[id='startDronAltitude']").value = startDronAltitude;
        };
        reader.readAsText(input.files[0]);
    }
};
sMap.init();