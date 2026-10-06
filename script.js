// Core Map Initialization
const map = L.map('map').setView([-23.1794, -45.8869], 12); // Centralizado em São José dos Campos

// Basemaps
const basemaps = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
    }),
    carto: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    }),
    dark: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    })
};

// Set default basemap
basemaps.dark.addTo(map);

// Add Coordinates Control
const coordsControl = L.control({position: 'bottomleft'});
coordsControl.onAdd = function() {
    this._div = L.DomUtil.create('div', 'coords-control');
    this._div.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    this._div.style.padding = '5px 10px';
    this._div.style.border = '1px solid #ccc';
    this._div.style.borderRadius = '4px';
    this._div.style.fontSize = '12px';
    this._div.style.fontWeight = 'bold';
    this._div.innerHTML = 'Latitude: - , Longitude: -';
    return this._div;
};
coordsControl.addTo(map);

function toDMS(deg, isLat) {
    const dir = deg < 0 ? (isLat ? 'S' : 'O') : (isLat ? 'N' : 'L');
    const absDeg = Math.abs(deg);
    const d = Math.floor(absDeg);
    const m = Math.floor((absDeg - d) * 60);
    const s = ((absDeg - d - m / 60) * 3600).toFixed(1);
    return `${d}° ${m}' ${s}" ${dir}`;
}

map.on('mousemove', function(e) {
    const latDMS = toDMS(e.latlng.lat, true);
    const lngDMS = toDMS(e.latlng.lng, false);
    coordsControl._div.innerHTML = `Latitude: ${latDMS} <br> Longitude: ${lngDMS}`;
});

// Handle basemap change
document.getElementById('basemap-select').addEventListener('change', function(e) {
    for (let key in basemaps) {
        map.removeLayer(basemaps[key]);
    }
    basemaps[e.target.value].addTo(map);
});

// Layer Configurations (Order defines initial top-to-bottom visualization)
// preload: true  = carregado automaticamente ao abrir o mapa (arquivos leves)
// preload: false = carregado sob demanda (lazy loading) ao ativar a camada
const layerConfigs = [
    { id: 'Aerodromos',              name: 'Aeródromos',              file: 'Aerodromos.geojson',              type: 'point',   preload: true  },
    { id: 'Ferrovias',               name: 'Ferrovias',               file: 'Ferrovias.geojson',               type: 'line',    preload: true  },
    { id: 'Hidrografia_ANA',         name: 'Hidrografia ANA',         file: 'Hidrografia_ANA.geojson',         type: 'polygon', preload: false },
    { id: 'Trechos_Drenagem',        name: 'Trechos de Drenagem',     file: 'Trechos_Drenagem.geojson',        type: 'line',    preload: false },
    { id: 'Imovel_CAR',              name: 'Imóvel CAR',              file: 'Imovel_CAR.geojson',              type: 'polygon', preload: false },
    { id: 'Imovel_Consolidado_CAR',  name: 'Imóvel Consolidado CAR',  file: 'Imovel_Consolidado_CAR.geojson',  type: 'polygon', preload: false },
    { id: 'Municipios_SP_2025',      name: 'Municípios SP 2025',      file: 'Municipios_SP_2025.geojson',      type: 'polygon', preload: true  },
    { id: 'Reserva_Legal',           name: 'Reserva Legal',           file: 'Reserva_Legal.geojson',           type: 'polygon', preload: false },
    { id: 'Rodovias',                name: 'Rodovias',                file: 'Rodovias.geojson',                type: 'line',    preload: true  },
    { id: 'Servidao_Administrativa', name: 'Servidão Administrativa', file: 'Servidao_Administrativa.geojson', type: 'polygon', preload: false },
    { id: 'Sede_Municipal',          name: 'Sede Municipal',          file: 'Sede_Municipal.geojson',          type: 'point',   preload: true  },
    { id: 'Limite_Municipal',        name: 'Limite Municipal',        file: 'Limite_Municipal.geojson',        type: 'polygon', preload: true  },
    { id: 'UF_SP_2025',              name: 'UF SP 2025',              file: 'UF_SP_2025.geojson',              type: 'polygon', preload: false }
];

// Global state
const loadedLayers = {}; // Stores Leaflet layer objects
let activeInfoLayer = 'Aerodromos'; // Default active layer for Identify (click)

// -----------------------------------------------------------------------
// Toast Notification System (substitui alert() por notificações elegantes)
// -----------------------------------------------------------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        info:    'fa-circle-info',
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-triangle-exclamation'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);

    // Auto-remover após 4 segundos com animação de saída
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Symbology Functions
function getColorByArea(areaHa) {
    return areaHa > 1000 ? '#b10026' :
           areaHa > 500  ? '#e31a1c' :
           areaHa > 100  ? '#fc4e2a' :
           areaHa > 50   ? '#fd8d3c' :
                           '#fed976';
}

function getStyle(feature, layerId) {
    switch(layerId) {
        case 'Ferrovias':
            return { color: '#555555', weight: 2, opacity: 1 };
        case 'Hidrografia_ANA':
        case 'Trechos_Drenagem':
            return { color: '#00FFFF', fillColor: '#00FFFF', fillOpacity: 0.6, weight: 1.5, opacity: 1 };
        case 'Imovel_CAR':
        case 'Imovel_Consolidado_CAR':
            // Calcula área em Hectares usando Turf
            let areaHa = 0;
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                areaHa = turf.area(feature) / 10000;
            }
            return { color: '#333', weight: 0.5, fillColor: getColorByArea(areaHa), fillOpacity: 0.7 };
        case 'Municipios_SP_2025':
            return { color: '#333333', weight: 1.5, fillColor: '#808080', fillOpacity: 0.5, opacity: 1 };
        case 'Reserva_Legal':
            return { color: '#006400', weight: 1, fillColor: '#32CD32', fillOpacity: 0.5 };
        case 'Rodovias':
            return { color: '#000000', weight: 4, opacity: 1 };
        case 'Servidao_Administrativa':
            return { color: '#000000', fillColor: '#000000', weight: 1, fillOpacity: 0.4 };
        case 'Limite_Municipal':
            return { color: '#FFFF00', weight: 2, fill: false, opacity: 1 };
        case 'UF_SP_2025':
            return { color: '#FF0000', weight: 2, fillColor: '#808080', fillOpacity: 0.25, opacity: 1 };
        default:
            return { color: '#3388ff', weight: 1, fillOpacity: 0.2 };
    }
}

function pointToLayerConfig(feature, latlng, layerId) {
    if (layerId === 'Aerodromos') {
        const icon = L.divIcon({
            html: '<i class="fa-solid fa-plane"></i>',
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        return L.marker(latlng, {icon: icon});
    } else if (layerId === 'Sede_Municipal') {
        return L.circleMarker(latlng, {
            radius: 8,
            fillColor: "#000000",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        });
    }
    return L.circleMarker(latlng);
}

let activeFilterClass = -1; // -1 = sem filtro (exibir todos)

function generateSidebarLegendAndStats(layerGrp) {
    const grades = [0, 50, 100, 500, 1000];
    const counts = [0, 0, 0, 0, 0];

    // Calcular estatísticas
    layerGrp.eachLayer(layer => {
        let areaHa = 0;
        if (layer.feature.geometry.type === 'Polygon' || layer.feature.geometry.type === 'MultiPolygon') {
            areaHa = turf.area(layer.feature) / 10000;
        }
        if (areaHa > 1000) counts[4]++;
        else if (areaHa > 500) counts[3]++;
        else if (areaHa > 100) counts[2]++;
        else if (areaHa > 50) counts[1]++;
        else counts[0]++;
    });

    let html = '<p style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">* Clique em uma linha para filtrar no mapa.</p>';
    html += '<table style="width: 100%; border-collapse: collapse; margin-top: 5px;">';
    html += '<tr><th style="text-align:left; padding:4px; border-bottom:1px solid #ccc;">Classe (ha)</th><th style="text-align:center; padding:4px; border-bottom:1px solid #ccc;">Qtd</th></tr>';

    for (let i = 0; i < grades.length; i++) {
        const color = getColorByArea(grades[i] + 1);
        const label = grades[i] + (grades[i + 1] ? ' &ndash; ' + grades[i + 1] : '+');
        html += `<tr class="stat-row" data-class="${i}" style="cursor: pointer; transition: background 0.2s;">
                    <td style="padding:4px; border-bottom:1px solid #eee;">
                        <i style="background:${color}; width: 15px; height: 15px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #999;"></i>
                        ${label}
                    </td>
                    <td style="text-align:center; padding:4px; border-bottom:1px solid #eee;">${counts[i]}</td>
                 </tr>`;
    }
    html += '</table>';

    const contentEl = document.getElementById('sidebar-legend-content');
    if (contentEl) {
        contentEl.innerHTML = html;

        const rows = contentEl.querySelectorAll('.stat-row');
        rows.forEach(row => {
            row.addEventListener('mouseover', () => {
                if (parseInt(row.getAttribute('data-class')) !== activeFilterClass) {
                    row.style.background = '#f0f0f0';
                }
            });
            row.addEventListener('mouseout', () => {
                if (parseInt(row.getAttribute('data-class')) !== activeFilterClass) {
                    row.style.background = 'transparent';
                }
            });

            row.addEventListener('click', () => {
                const clickedClass = parseInt(row.getAttribute('data-class'));

                // Toggle: clique novamente na mesma classe para remover o filtro
                activeFilterClass = (activeFilterClass === clickedClass) ? -1 : clickedClass;

                rows.forEach(r => {
                    if (parseInt(r.getAttribute('data-class')) === activeFilterClass) {
                        r.style.background = '#d6eaf8';
                        r.style.fontWeight = 'bold';
                    } else {
                        r.style.background = 'transparent';
                        r.style.fontWeight = 'normal';
                    }
                });

                applyImovelFilter();
            });
        });
    }
}

function applyImovelFilter() {
    const layersToFilter = ['Imovel_CAR', 'Imovel_Consolidado_CAR'];

    layersToFilter.forEach(id => {
        const grp = loadedLayers[id];
        if (!grp) return;

        grp.eachLayer(layer => {
            let areaHa = 0;
            if (layer.feature.geometry.type === 'Polygon' || layer.feature.geometry.type === 'MultiPolygon') {
                areaHa = turf.area(layer.feature) / 10000;
            }

            let classIdx = 0;
            if (areaHa > 1000) classIdx = 4;
            else if (areaHa > 500) classIdx = 3;
            else if (areaHa > 100) classIdx = 2;
            else if (areaHa > 50) classIdx = 1;

            if (activeFilterClass === -1 || activeFilterClass === classIdx) {
                layer.setStyle(getStyle(layer.feature, id));
                layer.options.interactive = true;
                if (layer.getElement && layer.getElement()) {
                    layer.getElement().style.display = '';
                }
            } else {
                layer.setStyle({opacity: 0, fillOpacity: 0});
                layer.options.interactive = false;
                if (layer.getElement && layer.getElement()) {
                    layer.getElement().style.display = 'none';
                }
            }
        });
    });
}

// Generate Popup HTML
function generatePopupContent(feature) {
    let html = '<table class="popup-table">';
    for (let prop in feature.properties) {
        if (feature.properties[prop] !== null && feature.properties[prop] !== '') {
            html += `<tr><th>${prop}</th><td>${feature.properties[prop]}</td></tr>`;
        }
    }
    html += '</table>';
    return html;
}

// -----------------------------------------------------------------------
// loadLayer — carrega GeoJSON sob demanda (lazy loading) ou no startup
// -----------------------------------------------------------------------
function loadLayer(config) {
    const spinnerEl = document.getElementById(`spinner-${config.id}`);
    if (spinnerEl) {
        spinnerEl.className = 'fas fa-spinner fa-spin loading-spinner';
        spinnerEl.style.display = 'inline-block';
    }

    fetch(config.file)
        .then(response => {
            if (!response.ok) throw new Error('File not found');
            return response.json();
        })
        .then(data => {
            const geoJsonLayer = L.geoJSON(data, {
                pane: config.id,
                style: (feature) => getStyle(feature, config.id),
                pointToLayer: (feature, latlng) => pointToLayerConfig(feature, latlng, config.id),
                onEachFeature: (feature, layer) => {
                    layer.layerId = config.id;
                    layer.bindPopup(generatePopupContent(feature));

                    // Tooltip de nome para municípios
                    if (config.id === 'Municipios_SP_2025' && feature.properties.NM_MUN) {
                        layer.bindTooltip(feature.properties.NM_MUN, {
                            permanent: true,
                            direction: 'center',
                            className: 'municipio-label'
                        });
                    }
                }
            });

            loadedLayers[config.id] = geoJsonLayer;

            // Adiciona ao mapa somente se o checkbox estiver marcado
            const cb = document.querySelector(`.layer-visibility[data-id="${config.id}"]`);
            if (!cb || cb.checked) {
                geoJsonLayer.addTo(map);
            }

            if (config.id === 'Imovel_CAR') {
                generateSidebarLegendAndStats(geoJsonLayer);
                document.getElementById('sidebar-legend-section').style.display = 'block';
            }

            if (spinnerEl) spinnerEl.style.display = 'none';

            // Ajusta a vista para a região de São José dos Campos após carregar municípios
            if (config.id === 'Municipios_SP_2025') {
                map.fitBounds(geoJsonLayer.getBounds());
            }
        })
        .catch(error => {
            console.error(`Error loading ${config.file}:`, error);
            if (spinnerEl) {
                spinnerEl.className = 'fas fa-exclamation-triangle';
                spinnerEl.style.color = 'red';
                spinnerEl.title = 'Erro ao carregar arquivo';
            }
            showToast(`Erro ao carregar a camada "${config.name}".`, 'error');
        });
}

// Build Sidebar and load layers
const layerListEl = document.getElementById('layer-list');
let baseZIndex = 500; // z-index inicial para panes (pane padrão do Leaflet é 400)

layerConfigs.forEach((config, index) => {
    // 1. Cria um Pane específico para gerenciar z-index (ordenação)
    map.createPane(config.id);
    // Maior índice no config = z-index menor (renderizado embaixo)
    map.getPane(config.id).style.zIndex = baseZIndex - index;

    // 2. Cria item na sidebar
    const li = document.createElement('li');
    li.className = 'layer-item';
    li.setAttribute('data-id', config.id);

    li.innerHTML = `
        <i class="fas fa-grip-vertical drag-handle"></i>
        <input type="checkbox" class="layer-visibility" data-id="${config.id}" ${config.preload ? 'checked' : ''}>
        <input type="radio" name="active_layer" class="layer-info-radio" data-id="${config.id}" ${index === 0 ? 'checked' : ''}>
        <span class="layer-name">${config.name}</span>
        <i class="fas fa-spinner fa-spin loading-spinner" id="spinner-${config.id}" ${config.preload ? '' : 'style="display:none"'}></i>
    `;
    layerListEl.appendChild(li);

    // 3. Carrega automaticamente apenas as camadas leves (preload: true)
    //    Camadas pesadas usam lazy loading: carregam ao ativar o checkbox
    if (config.preload) {
        loadLayer(config);
    }
});

// Handle Layer Visibility Toggle
layerListEl.addEventListener('change', (e) => {
    if (e.target.classList.contains('layer-visibility')) {
        const id = e.target.getAttribute('data-id');

        if (e.target.checked) {
            if (loadedLayers[id]) {
                // Camada já carregada — apenas exibir
                map.addLayer(loadedLayers[id]);
            } else {
                // Lazy load: primeira vez que o usuário ativa esta camada
                const config = layerConfigs.find(c => c.id === id);
                if (config) loadLayer(config);
            }
        } else {
            const layer = loadedLayers[id];
            if (layer) map.removeLayer(layer);
        }

        // Controla visibilidade da legenda das camadas CAR
        if (id === 'Imovel_CAR' || id === 'Imovel_Consolidado_CAR') {
            const car1 = document.querySelector('.layer-visibility[data-id="Imovel_CAR"]');
            const car2 = document.querySelector('.layer-visibility[data-id="Imovel_Consolidado_CAR"]');
            const legendEl = document.getElementById('sidebar-legend-section');
            if (legendEl) {
                legendEl.style.display = ((car1 && car1.checked) || (car2 && car2.checked)) ? 'block' : 'none';
            }
        }
    }

    // Handle Radio Selection for Identify
    if (e.target.classList.contains('layer-info-radio')) {
        activeInfoLayer = e.target.getAttribute('data-id');
    }
});

// Intercepta abertura de popup: exibe apenas se a camada estiver ativa para identificação
map.on('popupopen', function(e) {
    const popup = e.popup;
    const sourceLayer = popup._source;

    if (sourceLayer && sourceLayer.layerId !== activeInfoLayer) {
        map.closePopup(popup);
    }
});

// Make Sidebar Sortable
const sortable = new Sortable(layerListEl, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: function () {
        updateLayerOrder();
    }
});

function updateLayerOrder() {
    const items = layerListEl.querySelectorAll('.layer-item');
    items.forEach((item, index) => {
        const id = item.getAttribute('data-id');
        const newZIndex = baseZIndex - index;
        const pane = map.getPane(id);
        if (pane) pane.style.zIndex = newZIndex;
    });
}

// Toggle all layers button
let allLayersVisible = true;
document.getElementById('toggle-all-layers').addEventListener('click', function() {
    allLayersVisible = !allLayersVisible;
    const checkboxes = document.querySelectorAll('.layer-visibility');
    checkboxes.forEach(cb => {
        if (cb.checked !== allLayersVisible) {
            cb.checked = allLayersVisible;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
});

// Search Municipality Logic
document.getElementById('btn-search').addEventListener('click', () => {
    const term = document.getElementById('search-mun').value.toLowerCase().trim();
    if (!term) return;

    const layerGrp = loadedLayers['Municipios_SP_2025'];
    if (!layerGrp) {
        showToast('Camada de municípios ainda não carregada. Ative-a na lista de camadas.', 'warning');
        return;
    }

    let found = false;
    layerGrp.eachLayer(layer => {
        if (layer.feature.properties.NM_MUN && layer.feature.properties.NM_MUN.toLowerCase().includes(term)) {
            map.fitBounds(layer.getBounds());
            layer.openPopup();
            found = true;
        }
    });

    if (!found) showToast('Município não encontrado.', 'warning');
});

// Pesquisa por município também ao pressionar Enter
document.getElementById('search-mun').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-search').click();
});

// Search Imovel CAR Logic
document.getElementById('btn-search-imovel').addEventListener('click', () => {
    const term = document.getElementById('search-imovel').value.trim().toLowerCase();
    if (!term) return;

    const layerGrp = loadedLayers['Imovel_CAR'];
    if (!layerGrp) {
        showToast('Camada de Imóvel CAR ainda não carregada. Ative-a na lista de camadas.', 'warning');
        return;
    }

    let found = false;
    layerGrp.eachLayer(layer => {
        if (layer.feature.properties) {
            for (let prop in layer.feature.properties) {
                if (prop.toLowerCase() === 'cod_imovel' || prop.toLowerCase() === 'codigo_imovel') {
                    const val = String(layer.feature.properties[prop]).trim().toLowerCase();
                    if (val === term || val.includes(term)) {
                        map.fitBounds(layer.getBounds());
                        layer.openPopup();
                        found = true;
                        break;
                    }
                }
            }
        }
    });

    if (!found) showToast('Imóvel não encontrado na camada Imóvel CAR.', 'warning');
});

// Pesquisa por imóvel também ao pressionar Enter
document.getElementById('search-imovel').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-search-imovel').click();
});

// Dynamic Labels Logic (Oculta rótulos quando zoom for menor que 10)
map.on('zoomend', function() {
    if (map.getZoom() < 10) {
        map.getContainer().classList.add('hide-labels');
    } else {
        map.getContainer().classList.remove('hide-labels');
    }
});
// Dispara inicialmente para aplicar a lógica no zoom inicial
map.fire('zoomend');

// script.js – início
const GEOJSON_BASE = "https://raw.githubusercontent.com/rcosta1974webgis/geoportalsjc/main/data";
const LAYERS = {
  hidrografia: {
    name: "Hidrografia (ANA)",
    url: `${GEOJSON_BASE}/Hidrografia_ANA.geojson`,
    style: { color: "#0066ff", weight: 2 }
  },
  reservaLegal: {
    name: "Reserva Legal",
    url: `${GEOJSON_BASE}/Reserva_Legal.geojson`,
    style: { color: "#2ecc71", weight: 2 }
  },
  imovelCAR: {
    name: "Imóvel Consolidado (CAR)",
    url: `${GEOJSON_BASE}/Imovel_Consolidado_CAR.geojson`,
    style: { color: "#ff7800", weight: 2 }
  }
  // …outros layers menores podem permanecer em “public/data/…”
};