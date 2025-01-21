import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import {TileWMS} from "ol/source.js";
import {fromLonLat, Projection} from "ol/proj.js";
import VectorLayer from "ol/layer/Vector.js";
import {Feature} from "ol";
import {Point} from "ol/geom.js";
import VectorSource from "ol/source/Vector.js";
import {Fill, RegularShape, Stroke, Style} from "ol/style.js";
import {register} from 'ol/proj/proj4';

import proj4 from "proj4";
proj4.defs("EPSG:3405", "+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +datum=WGS84 +units=m +no_defs");
register(proj4);
let road = new TileLayer({
    source: new TileWMS({
        url: 'http://localhost:8080/geoserver/gis_local/wms', // Đường dẫn tới GeoServer WMS
        params: {
            'SERVICE': 'WMS',
            'VERSION': '1.1.0',
            'LAYERS': 'gis_local:gis_osm_buildings_a_free_1', // Tên layer
            'TILED': true,
            'FORMAT': 'image/png',
        },
        // serverType: 'geoserver', // Chỉ định loại server
        // crossOrigin: 'anonymous', // Cho phép tải tài nguyên qua CORS
    })
})

let building = new TileLayer({
    source: new TileWMS({
        url: 'http://localhost:8080/geoserver/gis_local/wms', // Đường dẫn tới GeoServer WMS
        params: {
            'SERVICE': 'WMS',
            'VERSION': '1.1.0',
            'LAYERS': 'gis_local:gis_osm_roads_free_1', // Tên layer
            'TILED': true,
            'FORMAT': 'image/png',
        },
        // serverType: 'geoserver', // Chỉ định loại server
        // crossOrigin: 'anonymous', // Cho phép tải tài nguyên qua CORS
    })
})

const map = new Map({
    layers: [road, building
    ],
    target: 'map',
    view: new View({
        // center: [0, 0],
        zoom: 30,
        maxZoom: 50,                 // Tăng giới hạn zoom tối đa
        minZoom: 0,
        projection: new Projection({
            code: 'EPSG:3405',
            units: 'm',
            axisOrientation: 'neu'
        })
    }),
});
var bounds = [101.590576171875, 7.20703125, 114.884033203125, 24.08203125];

map.getView().fit(bounds, map.getSize());
// map.getView().setCenter([101.590576171875,7.20703125,114.884033203125,24.08203125]);

document.getElementById('zoom-out').onclick = function () {
    const view = map.getView();
    const zoom = view.getZoom();
    view.setZoom(zoom - 1);
};

document.getElementById('zoom-in').onclick = function () {
    const view = map.getView();
    const zoom = view.getZoom();
    console.log(view)
    view.setZoom(zoom + 1);
};
// map.on('singleclick', function (evt) {
//     // Lấy toạ độ của điểm click, nếu cần có thể chuyển đổi sang tọa độ lon/lat
//     var coordinate = evt.coordinate;
//     var lonLat = fromLonLat(coordinate);  // Chuyển đổi từ EPSG:404000 sang lon/lat nếu cần
//
//     console.log('Toạ độ click:', coordinate);
//     console.log('Lon/Lat:', lonLat);  // In ra toạ độ dạng lon/lat
//
//     // Thực hiện các hành động khác, ví dụ như vẽ marker, hiển thị thông tin...
// });

let pinLayer;
map.on('singleclick', function(evt) {
    if (pinLayer) {
        map.removeLayer(pinLayer);
    }

    const view = map.getView();
    const viewResolution = view.getResolution();
    const layers = [road, building];
    const promises = [];

    const center = evt.coordinate;
    const feature = new Feature(new Point(center));

    pinLayer = new VectorLayer({
        source: new VectorSource({
            features: [feature],
        }),
        style: new Style({
            image: new RegularShape({
                fill: new Fill({ color: 'yellow' }),
                stroke: new Stroke({ color: 'black', width: 1 }),
                points: 5,
                radius: 5,
            }),
        }),
    });
    map.addLayer(pinLayer);

    layers.forEach(function(layer) {
        const source = layer.getSource();
        const url = source.getFeatureInfoUrl(
            evt.coordinate,
            viewResolution,
            view.getProjection(),
            { 'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 50 }
        );

        if (url) {
            fetch(
                url, {
                    method: 'GET',
                   }

            )
                .then((response) => response.json())
                .then((geojsonData) => {
                    console.log(geojsonData);
                    const container = document.getElementById('geojson-container');

                    // Create a table
                    const table = document.createElement('table');
                    const headerRow = `
      <tr>
        <th>ID</th>
        <th>Type</th>
        <th>Name</th>
        <th>Coordinates</th>
      </tr>
    `;
                    table.innerHTML = headerRow;

                    // Process each feature
                    geojsonData?.features.forEach(feature => {
                        const { id, geometry, properties } = feature;

                        // Extract coordinates
                        const coordinates = geometry.coordinates
                            .map(lines => lines.map(coord => `(${coord[0]}, ${coord[1]})`).join(', '))
                            .join('<br>');

                        // Add a row for this feature
                        const row = `
        <tr>
          <td>${id}</td>
          <td>${geometry.type}</td>
          <td>${properties.name || 'N/A'}</td>
          <td>${coordinates}</td>
        </tr>
      `;
                        table.innerHTML += row;
                    });

                    // Append the table to the container
                    container.replaceChildren();
                    container.appendChild(table);
                });
            // Sử dụng XMLHttpRequest để thay thế fetch
            // const xhr = new XMLHttpRequest();
            // xhr.open('GET', url, true);
            // xhr.setRequestHeader('Content-Type', 'application/json');
            // // Thêm header CORS
            // // xhr.setRequestHeader('Access-Control-Allow-Origin', '*'); // Cho phép tất cả các domain
            //
            // xhr.onload = function () {
            //     if (xhr.status === 200) {
            //         const response = JSON.parse(xhr.responseText);
            //         if (response.features.length > 0) {
            //             // Xử lý dữ liệu từ response
            //             let content = "<table border='1' style='border-collapse: collapse;'>";
            //             content += `<tr><th colspan="4">Lớp ${layers.indexOf(layer) + 1}</th></tr>`;
            //             response.features.forEach(feature => {
            //                 const properties = feature.properties;
            //                 content += `
            //                     <tr>
            //                         <td>Số thửa:</td><td>${properties.shthua || 'N/A'}</td>
            //                         <td>Số tờ bản đồ:</td><td>${properties.shbando || 'N/A'}</td>
            //                     </tr>
            //                     <tr>
            //                         <td>Diện tích:</td><td>${properties.dientich || 'N/A'}</td>
            //                         <td>Loại đất:</td><td>${properties.kh2003 || 'N/A'}</td>
            //                     </tr>
            //                 `;
            //             });
            //             content += "</table>";
            //             document.getElementById('info').innerHTML = content;
            //         }
            //     } else {
            //         document.getElementById('info').innerHTML = "Error loading information!";
            //         console.error("Error:", xhr.status, xhr.statusText);
            //     }
            // };
            //
            // xhr.onerror = function () {
            //     document.getElementById('info').innerHTML = "Error loading information!";
            //     console.error("Error:", xhr.status, xhr.statusText);
            // };
            //
            // xhr.send();
        }


        
    });

    // Xử lý kết quả từ tất cả các lớp

});