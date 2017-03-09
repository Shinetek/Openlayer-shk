/**
 * Created by johm-z on 2017/1/16.
 */
var obj=new Object();
var map ;
var styleCache = {};
var Shinetek = {};

Shinetek.Ol3Opt={
    /**
     * 地图初始化函数
     * @param url 地图初始化时基底图层的地址
     */
    init:function(url){
          map = new ol.Map({
            layers:[
                // 加载底图
                Shinetek.Ol3Opt.addLayer("BaseLayer","baseLayer",url,"true","TMS"),
            ],
            target: 'map',
            controls: ol.control.defaults({
                attribution: false,
            }).extend([
                new ol.control.FullScreen(), //全屏
                new ol.control.MousePosition({
                    undefinedHTML: 'outside',
                    projection: 'EPSG:4326',
                    coordinateFormat: function(coordinate) {
                        return ol.coordinate.format(coordinate, '{x}, {y}', 5);
                    }
                }), //经纬度坐标
                /*new ol.control.OverviewMap(),*/ //鸟瞰图
                new ol.control.ScaleLine(), // 比例尺
                new ol.control.ZoomSlider(), //滚动轴
                new ol.control.ZoomToExtent(), //回到最大
            ]),
            /* logo:{src: '../img/face_monkey.png', href: 'http://www.openstreetmap.org/'},*/
            view: new ol.View({
                projection: 'EPSG:4326',
                center: [105, 34],
                zoom: 4,
                minZoom: 0,
                maxZoom: 10,
                // 设置地图中心范围
                /*extent: [102, 29, 104, 31],*/
                // 设置成都为地图中心
                /*center: [104.06, 30.67],*/
                resolutions:[0.703125, 0.3515625, 0.17578125, 0.087890625, 0.0439453125, 0.01953125, 0.009765625, 0.0048828125, 0.00244140625,0.001220703125,0.0006103515625], //设置分辨率
                extent: [-180, -90, 180, 90],
            }),
        });
    },

    /**
     * TMS瓦片拼接规则
     * @param nameFun 图层对象名
     * @param nameLayer 图层名
     * @param oURL 图层地址
     * @param isBase 是否为基底图层
     * @param WorT 图层格式WMS/TMS/KML
     * @returns {ol.layer.Tile}
     */
    addTile:function (nameFun,nameLayer,oURL,isBase,WorT) {
        //判断如果为TMS天地图，则使用png格式
        if(oURL=="http://10.24.10.108/IMAGEL2/tianditu/WMS_20160820/"){
            var urlTemplate = oURL+"{z}/{x}/{y}.png";
        }
        //其他TMS图使用jpg格式
        else {
            var urlTemplate = oURL+"{z}/{x}/{y}.jpg";
        }
        var layer = new ol.layer.Tile({
            source: new ol.source.TileImage({
                projection: 'EPSG:4326',
                tileGrid: new ol.tilegrid.TileGrid({
                    origin: ol.extent.getBottomLeft(new ol.proj.get("EPSG:4326").getExtent()),    // 设置原点坐标
                    resolutions:[0.703125, 0.3515625, 0.17578125, 0.087890625, 0.0439453125, 0.01953125, 0.009765625, 0.0048828125/*, 0.00244140625*/], //设置分辨率
                    /*extent: [-180, -90, 180, 90],*/
                    tileSize:[256,256],
                }),
                wrapX:false,
                tileUrlFunction:function(tileCoord, pixelRatio, projection) {
                    var z = tileCoord[0];
                    var x = tileCoord[1];
                    /*var y = Math.pow(2, z) + tileCoord[2];*/
                    var y = tileCoord[2];
                    // wrap the world on the X axis
                    var n = Math.pow(2, z + 1); // 2 tiles at z=0
                    x = x % n;
                    if (x * n < 0) {
                        // x and n differ in sign so add n to wrap the result
                        // to the correct sign
                        x = x + n;
                    }
                    return urlTemplate.replace('{z}', z.toString())
                        .replace('{y}', y.toString())
                        .replace('{x}', x.toString());
                },
            }),
        });
        //判断如果是基底图层只需要返回一个url地址即可
        if(isBase=="true"){
            return layer;
        }
        //如果是叠加图层,则需要返回添加图层的函数
        else if(isBase=="false"){
            window.obj[nameFun]=layer;
            var m_LayerADD=map.addLayer(layer);
            return m_LayerADD;
        }
    },

    /**
     * KML火点图样式
     * @param feature
     * @returns {*}
     */
    styleFunction : function(feature) {
        // 2012_Earthquakes_Mag5.kml stores the magnitude of each earthquake in a
        // standards-violating <magnitude> tag in each Placemark.  We extract it from
        // the Placemark's name instead.
        var name = feature.get('name');
        var magnitude = parseFloat(name.substr(2));
        var radius = 5 + 20 * (magnitude - 5);
        var style = styleCache[radius];
        if (!style) {
            style = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: radius,
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 153, 0, 0.4)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: 'rgba(255, 204, 0, 0.2)',
                        width: 1
                    })
                })
            });
            styleCache[radius] = style;
        }
        return style;
    },

    /**
     * 添加图层（TMS/WMS/KML）
     * @param nameFun 图层对象名，添加、隐藏、删除图层时使用
     * @param nameLayer 图层名
     * @param oURL 图层地址
     * @param isBase 是否为基底图层
     * @param WorT 判断图层格式是WMS/TMS/KML
     * @returns {*}
     */
    addLayer: function (nameFun,nameLayer,oURL,isBase,WorT){
        //判断不同的图层格式调用不同的加载方式
        if(WorT==="WMS"){
            var layer=new ol.layer.Tile({
                title: nameLayer,
                source: new ol.source.TileWMS({
                    url: oURL,
                    wrapX:false,
                   /* params: {
                        'VERSION': '1.1.1',
                        LAYERS: 'lzugis:capital',
                        STYLES: '',
                        tiled:true,
                    },*/
                    params: {'LAYERS': 'ne:ne'},
                    serverType: 'geoserver',
                    crossOrigin: 'anonymous'
                    })
            });
            window.obj[nameFun]=layer;
            var m_LayerADD=map.addLayer(layer);
            return m_LayerADD;
        }
        else if(WorT==="TMS") {
            return Shinetek.Ol3Opt.addTile(nameFun, nameLayer, oURL, isBase, WorT);
        }
        else if(WorT==="KML"){
            //火点的俩种加载方式
            //方法一
            var layer = new ol.layer.Heatmap({
                source : new ol.source.Vector({
                    //1.生成的KML文件，保存到此网页文件所在的目录
                    //2.也可以直接使用生成这个文件的链接，动态生成数据文件
                    url : oURL,
                    projection: 'EPSG:4326',
                    format : new ol.format.KML({
                        extractStyles: false
                    }),
                    wrapX:true,
                }),
                blur: 5,
                radius: 5,
            });
            window.obj[nameFun]=layer;
            var m_LayerADD=map.addLayer(layer);
            return m_LayerADD;

            /*//方法二
            var layer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    url: oURL,      //https://openlayers.org/en/v3.20.1/examples/data/kml/2012_Earthquakes_Mag5.kml
                    format: new ol.format.KML({
                        extractStyles: false
                    })
                }),
                style:WMS.styleFunction
            });
            window.obj[nameFun]=layer;
            var m_LayerADD=map.addLayer(layer);
            return m_LayerADD;*/
        }
        else if(WorT==="XYZ"){
            var layer=new ol.layer.Tile({
                title: nameLayer,
                source: new ol.source.XYZ({
                    url: oURL,
                    /*WMS.addLayer("WMS1","天地图路网","http://t4.tianditu.com/DataServer?T=vec_w&x={x}&y={y}&l={z}","false","XYZ");*/
                    /*WMS.addLayer("WMS2","天地图文字标注","http://t3.tianditu.com/DataServer?T=cva_w&x={x}&y={y}&l={z}","false","XYZ");*/
                })
            });
            window.obj[nameFun]=layer;
            var m_LayerADD=map.addLayer(layer);
            return m_LayerADD;
        }
        else if(WorT==="GEOJSON"){
            var layer = new ol.layer.Vector({
                source: new ol.source.Vector({                 
                    format: new ol.format.GeoJSON(),
                    url: oURL,
                }),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'blue',
                        lineDash: [4],
                        width: 1.3
                    }),
                    /*fill: new ol.style.Fill({
                        color: 'rgba(0, 0, 0, 0)'
                    })*/
                })
            });
            window.obj[nameFun]=layer;
            var m_LayerADD=map.addLayer(layer);
            return m_LayerADD;
        }
    },

    /**
     * 移除图层
     * @param nameFun 图层对象名
     * @param WorT 图层格式WMS/TMS/KML
     */
    removeLayer:function (nameFun,WorT) {
        var WorT=WorT;
        var layer=window.obj[nameFun];
        map.removeLayer(layer);
        delete window.obj[nameFun];
    },

    /**
     *  显示隐藏图层
     * @param nameFun 图层对象名
     * @param WorT 图层格式WMS/TMS/KML
     */
    setVisibility:function(nameFun,WorT){
        var WorT=WorT;
        var layer=window.obj[nameFun];
        (layer.getVisible()==true) ? layer.setVisible(false) : layer.setVisible(true);
    },

    /**
     * 获取图层当前z-index值
     * @param nameFun 图层对象名
     */
    getZIndex:function(nameFun){
        var layer=window.obj[nameFun];
        layer.getZIndex();
    },

    /**
     * 设置图层z-index值
     * @param nameFun 图层对象名
     * @param zIndex 新的z-index值
     */
    setZIndex:function(nameFun,zIndex){
        var layer=window.obj[nameFun];
        layer.setZIndex(zIndex);
    },

    /*// Create the graticule component 经纬度网格
    graticule : new ol.Graticule({
        // the style to use for the lines, optional.
        strokeStyle: new ol.style.Stroke({
            color: 'rgba(255,120,0,0.9)',
            width: 2,
            lineDash: [0.5, 4]
        })
    }),
    graticule.setMap(map);*/

    /**
     * 移动到固定位置
     */
   moveToChengDu: function() {
       var view = map.getView();
       // 设置地图中心为成都的坐标，即可让地图移动到成都
       view.setCenter(ol.proj.transform([104.06, 30.67], 'EPSG:4326', 'EPSG:3857'));
       map.render();
   },

    /**
     * 显示固定范围
     */
   fitToChengdu: function () {
       // 让地图最大化完全地显示区域[104, 30.6, 104.12, 30.74]
       map.getView().fit([104, 30.6, 104.12, 30.74], map.getSize());
   },

    /**
     * 经纬度网格
     */
    graticule:function () {
        var graticule = new ol.Graticule({
            // the style to use for the lines, optional.
            strokeStyle: new ol.style.Stroke({
                color: 'rgba(255,120,0,0.9)',
                width: 2,
                lineDash: [0.5, 4],
            }),
        });
        graticule.setMap(map);
    },

}

