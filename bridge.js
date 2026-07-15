// ============================================================
// Simulador Educativo 3D — Puente Warren — Ecuador
// Render cinematográfico + Análisis FEA + Contexto Real
// ============================================================

'use strict';

// ── THREE.JS GLOBALS ─────────────────────────────────────────
let scene, camera, renderer, controls;
let bridgeGroup = null;
let nodeDetailGroup = null;
let waterMesh = null;         // río animado
let spotLight = null;         // luz orbital
let spotLightAngle = 0;

// ── BUILD ANIMATION STATE ─────────────────────────────────────
let buildAnimItems = [];      // { mesh, targetScaleY, delay, done }
let buildAnimClock = 0;
let buildAnimActive = false;

// ── TRAFFIC ACTOR SYSTEM ──────────────────────────────────────
let trafficActors = [];        // moving vehicles + pedestrians
const ROAD_LEN = 35;           // carretera a cada lado del puente

// ── DYNAMIC FEA STATE ────────────────────────────────────────
let barMeshRefs  = [];         // [{mesh, elemIdx}] para repintar FEA sin rebuild
let dynamicFEATimer = 0;       // throttle acumulador
const DYNAMIC_FEA_INTERVAL = 0.12; // segundos entre recálculos FEA

// ── CINEMATIC TOUR STATE ──────────────────────────────────────
let cinematic = {
    active: false,
    t: 0,
    duration: 30,     // seconds for full 360 + elevation sweep
    radius: 25,
    savedPos: null,
    savedTarget: null
};

// ── ECUADOR SCENARIOS ─────────────────────────────────────────
const ECUADOR_SCENARIOS = {
    napo: {
        id: 'napo',
        icon: '🌿',
        name: 'Comunidad Kichwa — Río Napo',
        subtitle: 'Provincia de Napo · Amazonia ecuatoriana',
        type: 'Peatonal / Bicicletas',
        flow: '~120 m³/s (época seca)',
        span: '18 – 22 m',
        budget: '$45,000 – $70,000 USD',
        beneficiaries: '~850 personas',
        params: { length: 20, height: 3.5, width: 2.0, panels: 4, scale: 25, load: 5 },
        environment: 'amazon',
        badgeText: 'Río Napo · Amazonia',
        fact: 'En la Amazonia ecuatoriana, la provincia de Napo tiene más de 60 comunidades indígenas Kichwa con acceso limitado durante la creciente del río (noviembre–febrero). Un puente Warren de 20 m puede reducir el tiempo de acceso a salud y mercados de 3 horas en canoa a 15 minutos.',
        challenges: [
            { icon: '🌧️', title: 'Precipitación extrema', text: 'La Amazonia recibe hasta 4,000 mm/año. El acero requiere pintura epóxica y galvanizado para resistir la corrosión.' },
            { icon: '🌍', title: 'Zona sísmica alta (NEC Zona III)', text: 'Ecuador está en el Cinturón de Fuego. La NEC exige análisis dinámico para estructuras mayores a 12 m.' },
            { icon: '🚧', title: 'Acceso logístico', text: 'El diseño Warren modular permite transportar elementos en lanchas o mulas y ensamblar sin grúa pesada.' }
        ],
        loadRef: 'AASHTO LRFD §3.14 — Carga peatonal: 4.8 kN/m²',
        fogColor: 0x0d2137,
        fogDensity: 0.022
    },
    pastaza: {
        id: 'pastaza',
        icon: '🌊',
        name: 'Puente Peatonal — Río Pastaza',
        subtitle: 'Provincia de Pastaza · Amazonia ecuatoriana',
        type: 'Peatonal / Motocicletas',
        flow: '~850 m³/s (creciente)',
        span: '22 – 28 m',
        budget: '$60,000 – $95,000 USD',
        beneficiaries: '~1,200 personas',
        params: { length: 25, height: 4.0, width: 2.5, panels: 5, scale: 25, load: 8 },
        environment: 'amazon',
        badgeText: 'Río Pastaza · Amazonia',
        fact: 'El Río Pastaza es uno de los más caudalosos de Ecuador con ~850 m³/s promedio. Su cuenca alimenta al Río Marañón en Perú. La anchura del río en épocas de crecida puede llegar a 80 m, haciendo del Puente Warren de doble celosía la solución más económica para luces de 22–30 m.',
        challenges: [
            { icon: '💧', title: 'Caudal alto y crecidas repentinas', text: 'El nivel puede subir 4 m en 6 horas. El puente debe tener galibo libre mínimo de 3 m sobre el nivel máximo de crecida.' },
            { icon: '🌿', title: 'Impacto ambiental', text: 'La NEC y el MAE exigen EIA (Estudio de Impacto Ambiental) para estructuras en ríos amazónicos. Apoyos sobre roca firme o pilotes en la orilla.' },
            { icon: '⚡', title: 'Suministro energético', text: 'Sin energía eléctrica continua. El diseño debe prescindir de equipos de soldadura pesada in situ — uniones atornilladas (ASTM A325).' }
        ],
        loadRef: 'NEC-SE-CG §4.2 — Carga viva peatonal: 4.8 kN/m²',
        fogColor: 0x0a1a2e,
        fogDensity: 0.025
    },
    blanco: {
        id: 'blanco',
        icon: '🏗️',
        name: 'Puente "La Independencia" — Río Blanco',
        subtitle: 'Cantón Puerto Quito · Pichincha',
        type: 'Vehicular (2 carriles)',
        flow: '~45 m³/s',
        span: '16 – 20 m',
        budget: '$90,000 – $140,000 USD',
        beneficiaries: '~5,000 vehículos/día',
        params: { length: 18, height: 3.0, width: 6.0, panels: 4, scale: 25, load: 25 },
        environment: 'andean',
        badgeText: 'Río Blanco · Pichincha',
        fact: 'El Puente La Independencia sobre el Río Blanco es un caso documentado por la Escuela Politécnica Nacional (EPN). Fue construido bajo norma HS 20-44, pero el tráfico actual de vehículos pesados sobrepasa su capacidad. La EPN propuso reforzamiento con cubierta de acero A572 Gr.50 para elevar la carga de diseño a HL-93 (AASHTO LRFD).',
        challenges: [
            { icon: '🚛', title: 'Sobrecarga vehicular', text: 'Los camiones de caña azucarera superan las 30 ton. La norma original HS 20-44 equivale a ~18 ton. Requiere verificación urgente de pandeo en cuerdas superiores.' },
            { icon: '🔩', title: 'Corrosión en empalmes', text: 'El 60% de las conexiones remachadas del puente presentan corrosión activa. AISC 360 exige inspección visual y de ultrasonido cada 2 años.' },
            { icon: '📐', title: 'Deflexión excesiva', text: 'La deflexión en carga viva supera L/400 (límite AASHTO). Requiere análisis dinámico (vibración por carga vehicular en movimiento).' }
        ],
        loadRef: 'AASHTO LRFD §3.6 — Camión de diseño HL-93: 325 kN',
        fogColor: 0x121820,
        fogDensity: 0.018
    },
    chimborazo: {
        id: 'chimborazo',
        icon: '⛰️',
        name: 'Quebrada Andina — Chimborazo',
        subtitle: 'Provincia de Chimborazo · Sierra',
        type: 'Peatonal / Pecuario',
        flow: '~8 m³/s',
        span: '12 – 18 m',
        budget: '$25,000 – $50,000 USD',
        beneficiaries: '~400 personas',
        params: { length: 15, height: 2.5, width: 1.5, panels: 3, scale: 25, load: 3 },
        environment: 'andean',
        badgeText: 'Quebrada Andina · Chimborazo',
        fact: 'En Chimborazo, las comunidades indígenas Puruhá acceden a sus parcelas agrícolas cruzando quebradas de 8–15 m de profundidad. Un puente Warren de guadúa angustifolia Kunth, material nativo ecuatoriano, puede ser una alternativa de bajo costo ($15,000 USD) con resistencia comparable al acero en tensión pura.',
        challenges: [
            { icon: '❄️', title: 'Temperatura extrema', text: 'A 3,600 m.s.n.m., la variación térmica es de -5°C a 20°C. Los aceros deben ser de baja temperatura de transición frágil (Charpy ≥ 27 J a -20°C).' },
            { icon: '🌋', title: 'Sismicidad alta', text: 'Chimborazo está en la zona sísmica V (la más alta de Ecuador). La NEC-15 exige sa(T=0) ≥ 1.5g en diseño espectral.' },
            { icon: '🌿', title: 'Alternativa sostenible', text: 'La guadúa angustifolia tiene un módulo elástico de ~10 GPa y resistencia a tensión de ~40 MPa. Ideal para luces menores a 15 m y cargas peatonales.' }
        ],
        loadRef: 'NEC-15 §5.2 — Zona sísmica V: Sa(T=0) = 1.5g',
        fogColor: 0x1a1a28,
        fogDensity: 0.015
    }
};

// ── PARAMS ────────────────────────────────────────────────────
let params = {
    length: 20.00,
    height: 3.50,
    width: 2.00,
    panels: 4,
    scale: 25,
    load: 5.00,
    mode: 'scale',
    scenario: 'napo'
};

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initThree();
    initUI();
    updateAll();
    window.addEventListener('resize', onWindowResize);
});

// ── THREE.JS INIT ─────────────────────────────────────────────
function initThree() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14);
    scene.fog = new THREE.FogExp2(0x0d2137, 0.022);

    camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.01, 1000);
    camera.position.set(14, 8, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.12;
    controls.minDistance = 2;
    controls.maxDistance = 120;

    // ── CINEMATIC 5-POINT LIGHTING ────────────────────────────
    // 1. Ambient — noche azulada
    const ambient = new THREE.AmbientLight(0x1a2e4a, 0.4);
    scene.add(ambient);

    // 2. Sun — sol dorado amazónico
    const sunLight = new THREE.DirectionalLight(0xffd580, 1.3);
    sunLight.position.set(30, 60, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width  = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far  = 150;
    const sd = 25;
    sunLight.shadow.camera.left   = -sd;
    sunLight.shadow.camera.right  =  sd;
    sunLight.shadow.camera.top    =  sd;
    sunLight.shadow.camera.bottom = -sd;
    scene.add(sunLight);

    // 3. Fill — cielo azul frío
    const fillLight = new THREE.DirectionalLight(0x4fc3f7, 0.45);
    fillLight.position.set(-25, 18, -18);
    scene.add(fillLight);

    // 4. Rim — contorno metálico (blanco duro)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
    rimLight.position.set(0, 5, -22);
    scene.add(rimLight);

    // 5. Orbital spotlight — luz naranja que orbita
    spotLight = new THREE.PointLight(0xf97316, 0.8, 40, 2);
    spotLight.position.set(10, 8, 0);
    scene.add(spotLight);

    // Groups
    bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);

    nodeDetailGroup = new THREE.Group();
    scene.add(nodeDetailGroup);

    animate();
}

// ── ANIMATION LOOP ────────────────────────────────────────────
let lastTime = 0;

function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

// ── UI INIT ───────────────────────────────────────────────────
function initUI() {
    // Range inputs
    [
        { id: 'param-length', key: 'length', valId: 'val-length', float: true },
        { id: 'param-height', key: 'height', valId: 'val-height', float: true },
        { id: 'param-width',  key: 'width',  valId: 'val-width',  float: true },
        { id: 'param-panels', key: 'panels', valId: 'val-panels', float: false },
        { id: 'param-scale',  key: 'scale',  valId: 'val-scale',  float: false },
        { id: 'param-load',   key: 'load',   valId: 'val-load',   float: true }
    ].forEach(cfg => {
        const el = document.getElementById(cfg.id);
        const vEl = document.getElementById(cfg.valId);
        el.addEventListener('input', e => {
            const v = cfg.float ? parseFloat(e.target.value) : parseInt(e.target.value);
            params[cfg.key] = v;
            vEl.textContent = v.toFixed(cfg.float ? 2 : 0);
            updateAll();
        });
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            params.mode = btn.dataset.mode;

            const feaLegend = document.getElementById('fea-legend');
            const loadGroup = document.getElementById('group-load');
            const title = document.getElementById('visual-mode-title');

            if (params.mode === 'fea') {
                feaLegend.style.display = 'flex';
                loadGroup.style.display = 'block';
                title.textContent = 'Análisis FEA — Esfuerzos';
            } else if (params.mode === 'node') {
                feaLegend.style.display = 'none';
                loadGroup.style.display = 'none';
                title.textContent = 'Detalle de Nudo Típico';
            } else {
                feaLegend.style.display = 'none';
                loadGroup.style.display = 'block';
                title.textContent = params.mode === 'scale' ? 'Escala 1:25 (Tallarines)' : 'Acero A36 — Render Real';
            }
            updateAll();
        });
    });

    // Dashboard tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            if (tabId) document.getElementById(tabId).classList.add('active');
        });
    });

    // Ecuador scenario cards
    document.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            loadScenario(card.dataset.scenario);
        });
    });

    // Export
    document.getElementById('btn-export-obj').addEventListener('click', exportOBJ);
    document.getElementById('btn-export-stl').addEventListener('click', exportSTL);

    // Fullscreen
    const btnFS = document.getElementById('btn-fullscreen');
    if (btnFS) {
        btnFS.addEventListener('click', () => {
            const cont = document.getElementById('canvas-container');
            if (!document.fullscreenElement) {
                cont.requestFullscreen().then(() => {
                    btnFS.innerHTML = '<span class="icon">🗗</span> Salir Pantalla Completa';
                }).catch(err => console.error(err));
            } else {
                document.exitFullscreen();
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        const btnFS2 = document.getElementById('btn-fullscreen');
        if (btnFS2) {
            btnFS2.innerHTML = document.fullscreenElement
                ? '<span class="icon">🗗</span> Salir Pantalla Completa'
                : '<span class="icon">⛶</span> Pantalla Completa';
        }
        triggerSafeResize();
    });

    // Cinematic Tour
    const btnCine = document.getElementById('btn-cinematic');
    if (btnCine) {
        btnCine.addEventListener('click', () => {
            cinematic.active = !cinematic.active;
            const wrap = document.getElementById('tour-progress-wrap');

            if (cinematic.active) {
                cinematic.t = 0;
                cinematic.savedPos    = camera.position.clone();
                cinematic.savedTarget = controls.target.clone();
                cinematic.radius = Math.max(params.length * 0.85, params.width * 1.5, 14);
                btnCine.classList.add('active');
                btnCine.querySelector('.cinematic-label').textContent = 'Detener Tour';
                wrap.style.display = 'flex';
                controls.enabled = false;
            } else {
                btnCine.classList.remove('active');
                btnCine.querySelector('.cinematic-label').textContent = 'Tour Cinematográfico';
                wrap.style.display = 'none';
                if (cinematic.savedPos) camera.position.copy(cinematic.savedPos);
                if (cinematic.savedTarget) controls.target.copy(cinematic.savedTarget);
                controls.enabled = true;
            }
        });
    }

    // Stop cinematic on user interaction
    renderer.domElement.addEventListener('pointerdown', () => {
        if (cinematic.active) {
            cinematic.active = false;
            controls.enabled = true;
            const btnC = document.getElementById('btn-cinematic');
            if (btnC) {
                btnC.classList.remove('active');
                btnC.querySelector('.cinematic-label').textContent = 'Tour Cinematográfico';
            }
            const wrap = document.getElementById('tour-progress-wrap');
            if (wrap) wrap.style.display = 'none';
        }
    });

    // Sidebar mobile
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btnOpen = document.getElementById('btn-toggle-sidebar');
    const btnClose = document.getElementById('btn-close-sidebar');

    const openSidebar = () => {
        sidebar?.classList.add('open');
        overlay?.classList.add('active');
        triggerSafeResize();
    };
    const closeSidebar = () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
        triggerSafeResize();
    };

    btnOpen?.addEventListener('click', openSidebar);
    btnClose?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    // Dashboard collapse
    const dashPanel = document.getElementById('dashboard-panel');
    const btnDash = document.getElementById('btn-toggle-dashboard');
    if (btnDash && dashPanel) {
        btnDash.addEventListener('click', () => {
            const collapsed = dashPanel.classList.toggle('collapsed');
            btnDash.textContent = collapsed ? '▲' : '▼';
            btnDash.title = collapsed ? 'Expandir panel' : 'Colapsar panel';
            triggerSafeResize();
        });
    }
}

// ── LOAD SCENARIO ─────────────────────────────────────────────
function loadScenario(id) {
    const sc = ECUADOR_SCENARIOS[id];
    if (!sc) return;
    params.scenario = id;

    // Animate sliders to new values
    Object.entries(sc.params).forEach(([key, val]) => {
        params[key] = val;
        const inputEl = document.getElementById('param-' + key);
        const valEl   = document.getElementById('val-' + key);
        if (inputEl) {
            inputEl.value = val;
            if (valEl) {
                const isFloat = ['length','height','width','load'].includes(key);
                valEl.textContent = isFloat ? val.toFixed(2) : val;
            }
        }
    });

    // Update scenario badge
    const badge = document.getElementById('scenario-badge-text');
    const badgeIcon = document.querySelector('.scenario-badge-icon');
    if (badge) badge.textContent = sc.badgeText;
    if (badgeIcon) badgeIcon.textContent = sc.icon;

    // Update Ecuador tab content
    updateEcuadorTab(sc);

    // Update fog for environment
    if (scene) {
        scene.fog = new THREE.FogExp2(sc.fogColor, sc.fogDensity);
    }

    updateAll();
}

function updateEcuadorTab(sc) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('ec-icon', sc.icon);
    set('ec-title', sc.name);
    set('ec-subtitle', sc.subtitle);
    set('ec-type', sc.type);
    set('ec-flow', sc.flow);
    set('ec-span', sc.span);
    set('ec-budget', sc.budget);
    set('ec-beneficiaries', sc.beneficiaries);
    set('edu-fact-text', sc.fact);
    set('ec-load-formula', 'q_p = 4.8 kN/m²');

    // Design load calc
    const designLoad = (4.8 * sc.params.width * sc.params.length).toFixed(1);
    set('ec-design-load', designLoad);

    // Challenges
    const cl = document.getElementById('challenges-list');
    if (cl) {
        cl.innerHTML = sc.challenges.map(c => `
            <div class="challenge-item">
                <span class="challenge-icon">${c.icon}</span>
                <div>
                    <strong>${c.title}</strong>
                    <p>${c.text}</p>
                </div>
            </div>
        `).join('');
    }
}

function triggerSafeResize() {
    onWindowResize();
    [50, 150, 300, 500].forEach(t => setTimeout(onWindowResize, t));
}

// ── MAIN UPDATE ───────────────────────────────────────────────
function updateAll() {
    // Geometry calcs
    const Lp = params.length / params.panels;
    const d = Math.sqrt(Lp * Lp + params.height * params.height);
    const thetaRad = Math.atan(params.height / Lp);
    const thetaDeg = thetaRad * (180 / Math.PI);

    const sf = params.scale;
    const modelL  = (params.length / sf) * 100;
    const modelH  = (params.height / sf) * 100;
    const modelB  = (params.width  / sf) * 100;
    const modelLp = (Lp / sf) * 100;
    const modelD  = (d  / sf) * 100;

    // Overlay stats
    document.getElementById('model-dim-x').textContent = modelL.toFixed(2) + ' cm';
    document.getElementById('model-dim-y').textContent = modelH.toFixed(2) + ' cm';
    document.getElementById('model-dim-z').textContent = modelB.toFixed(2) + ' cm';

    // Geometry tab
    const s = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    s('geo-real-L', params.length.toFixed(2));
    s('geo-model-L', modelL.toFixed(2));
    s('geo-real-h', params.height.toFixed(2));
    s('geo-model-h', modelH.toFixed(2));
    s('geo-real-b', params.width.toFixed(2));
    s('geo-model-b', modelB.toFixed(2));
    s('geo-real-Lp', Lp.toFixed(2));
    s('geo-model-Lp', modelLp.toFixed(2));

    const mpEl = document.getElementById('geo-math-pitagoras');
    if (mpEl) mpEl.textContent = `d = \\sqrt{${modelLp.toFixed(1)}^2 + ${modelH.toFixed(1)}^2}`;
    s('geo-model-d', modelD.toFixed(2));
    s('geo-real-d', d.toFixed(2));

    const mtEl = document.getElementById('geo-math-trig');
    if (mtEl) mtEl.textContent = `\\theta = \\arctan(${modelH.toFixed(2)} / ${modelLp.toFixed(2)})`;
    s('geo-theta', thetaDeg.toFixed(2));

    // Materials
    const n = params.panels;
    const lenSup = modelLp, lenInf = modelLp;
    const lenDiag = modelD, lenVert = modelH;
    const totSup  = n * lenSup;
    const totInf  = n * lenInf;
    const totDiag = n * lenDiag;
    const totVert = (n + 1) * lenVert;
    const subtotalSide = totSup + totInf + totDiag + totVert;

    const qtyTravSup = n + 1, qtyTravInf = n + 1;
    const lenTrav = modelB;
    const totTravSup = qtyTravSup * lenTrav;
    const totTravInf = qtyTravInf * lenTrav;

    const lenArr = Math.sqrt(modelLp * modelLp + modelB * modelB);
    const qtyArr = 2 * n;
    const totArr = qtyArr * lenArr;

    const grandTotal = (2 * subtotalSide) + totTravSup + totTravInf + totArr;
    const grandTotalSpaghetti = grandTotal * 15;
    const estMass = grandTotalSpaghetti * 0.08;
    const totMass = estMass * 1.18;
    const totWeight = (totMass / 1000) * 9.81;

    s('mat-qty-sup', n);  s('mat-len-sup', lenSup.toFixed(2));  s('mat-total-sup', totSup.toFixed(2));
    s('mat-qty-inf', n);  s('mat-len-inf', lenInf.toFixed(2));  s('mat-total-inf', totInf.toFixed(2));
    s('mat-qty-diag', n); s('mat-len-diag', lenDiag.toFixed(2)); s('mat-total-diag', totDiag.toFixed(2));
    s('mat-qty-vert', n+1); s('mat-len-vert', lenVert.toFixed(2)); s('mat-total-vert', totVert.toFixed(2));
    s('mat-subtotal-side', subtotalSide.toFixed(2));
    s('mat-total-left', subtotalSide.toFixed(2));
    s('mat-total-right', subtotalSide.toFixed(2));
    s('mat-qty-trav-sup', qtyTravSup); s('mat-len-trav-sup', lenTrav.toFixed(2)); s('mat-total-trav-sup', totTravSup.toFixed(2));
    s('mat-qty-trav-inf', qtyTravInf); s('mat-len-trav-inf', lenTrav.toFixed(2)); s('mat-total-trav-inf', totTravInf.toFixed(2));
    s('mat-qty-arr', qtyArr); s('mat-len-arr', lenArr.toFixed(2)); s('mat-total-arr', totArr.toFixed(2));
    s('mat-grand-total', grandTotal.toFixed(2));
    s('mat-grand-total-m', (grandTotal / 100).toFixed(2));
    s('mat-est-mass', estMass.toFixed(1));
    s('mat-total-mass', totMass.toFixed(1));
    s('mat-est-weight', totWeight.toFixed(2));

    // FEA
    const { nodes2D, elements2D } = runFEA();

    const loadP = params.load;
    const ownW = totWeight;
    const reaction = (loadP + ownW) / 2;

    s('static-load-val', loadP.toFixed(2));
    s('static-weight-val', ownW.toFixed(2));
    s('static-reaction-val', reaction.toFixed(2));

    // Stress table
    const tBody = document.getElementById('table-stresses');
    if (tBody) {
        tBody.innerHTML = '';
        elements2D.forEach((el, i) => {
            if (i >= 14 && el.type !== 'diagonal') return;
            let name = '';
            if (el.type === 'bottom')    name = `Cuerda Inf. (${el.nodeA}–${el.nodeB})`;
            else if (el.type === 'top')  name = `Cuerda Sup.`;
            else if (el.type === 'vertical') name = `Vertical`;
            else if (el.type === 'diagonal') name = `Diagonal`;

            const absF = Math.abs(el.force).toFixed(2);
            let cls = 'stress-zero', state = 'Fuerza Cero';
            if (el.force >  0.01) { cls = 'stress-tens'; state = 'Tracción'; }
            if (el.force < -0.01) { cls = 'stress-comp'; state = 'Compresión'; }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${name}</td>
                <td class="${cls}">${state}</td>
                <td class="math">${absF} N</td>
                <td><span class="dot" style="background:${getElemColor(el.force)};display:inline-block;width:8px;height:8px;border-radius:50%"></span></td>`;
            tBody.appendChild(row);
        });
    }

    // Safety semaphore
    const maxForce = Math.max(...elements2D.map(e => Math.abs(e.force)));
    updateSemaphore(maxForce, loadP);

    // Update Ecuador tab design load dynamically
    const sc = ECUADOR_SCENARIOS[params.scenario];
    if (sc) {
        const designLoad = (4.8 * params.width * params.length).toFixed(1);
        s('ec-design-load', designLoad);
    }

    // 3D render
    if (params.mode === 'node') {
        bridgeGroup.visible = false;
        nodeDetailGroup.visible = true;
        buildNodeDetail();
    } else {
        bridgeGroup.visible = true;
        nodeDetailGroup.visible = false;
        buildBridge3D(nodes2D, elements2D);

        const targetDist = Math.max(params.length * 0.95, params.width * 1.6, params.height * 2.2) * 1.35;
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        if (dir.lengthSq() === 0) dir.set(0.6, 0.4, 0.8).normalize();
        controls.target.set(0, params.height / 2, 0);
        if (!cinematic.active) {
            camera.position.copy(dir.multiplyScalar(targetDist).add(controls.target));
        }
        cinematic.radius = targetDist * 1.1;
    }
}

function updateSemaphore(maxF, loadP) {
    const ratio = maxF / Math.max(loadP * 3, 1);
    const gEl = document.getElementById('sem-green');
    const yEl = document.getElementById('sem-yellow');
    const rEl = document.getElementById('sem-red');
    const tEl = document.getElementById('safety-text');

    gEl?.classList.remove('active');
    yEl?.classList.remove('active');
    rEl?.classList.remove('active');

    if (ratio < 0.5) {
        gEl?.classList.add('active');
        if (tEl) { tEl.textContent = 'Seguro'; tEl.style.color = '#10d48a'; }
    } else if (ratio < 0.85) {
        yEl?.classList.add('active');
        if (tEl) { tEl.textContent = 'Revisión'; tEl.style.color = '#facc15'; }
    } else {
        rEl?.classList.add('active');
        if (tEl) { tEl.textContent = 'Crítico'; tEl.style.color = '#ef4444'; }
    }
}

// ── FEA ───────────────────────────────────────────────────────
function runFEA() {
    const n = params.panels;
    const Lp = params.length / n;
    const h = params.height;
    const nodes2D = [];

    for (let i = 0; i <= n; i++) {
        nodes2D.push({ x: i * Lp, y: 0, fx: 0, fy: 0, rx: i === 0, ry: i === 0 || i === n });
    }
    for (let i = 0; i <= n; i++) {
        nodes2D.push({ x: i * Lp, y: h, fx: 0, fy: 0, rx: false, ry: false });
    }

    const loadP = params.load;
    if (n % 2 === 0) {
        nodes2D[n / 2].fy -= loadP / 2;
    } else {
        nodes2D[Math.floor(n/2)].fy -= loadP / 4;
        nodes2D[Math.ceil(n/2)].fy  -= loadP / 4;
    }

    const subtotalSide = (2 * n * Lp + n * Math.sqrt(Lp*Lp + h*h) + (n+1)*h);
    const weightSide = (subtotalSide * 100 * 15 * 0.08 * 1.18 / 1000) * 9.81 / 2;
    const wNode = weightSide / (n + 1);
    for (let i = 0; i <= n; i++) nodes2D[i].fy -= wNode;

    const elements2D = [];
    const E = 2.0e9, A = 15 * Math.PI * Math.pow(0.0008, 2);

    for (let i = 0; i < n; i++) elements2D.push({ nodeA: i, nodeB: i+1, E, A, type: 'bottom' });
    for (let i = 0; i < n; i++) elements2D.push({ nodeA: n+1+i, nodeB: n+2+i, E, A, type: 'top' });
    for (let i = 0; i <= n; i++) elements2D.push({ nodeA: i, nodeB: n+1+i, E, A, type: 'vertical' });
    for (let i = 0; i < n; i++) {
        if (i % 2 === 0) elements2D.push({ nodeA: i, nodeB: n+2+i, E, A, type: 'diagonal' });
        else             elements2D.push({ nodeA: n+1+i, nodeB: i+1, E, A, type: 'diagonal' });
    }

    solveDirectStiffness2D(nodes2D, elements2D);
    return { nodes2D, elements2D };
}

function solveDirectStiffness2D(nodes, elements) {
    const dof = nodes.length * 2;
    const K = Array.from({length: dof}, () => new Float64Array(dof));
    const F = new Float64Array(dof);

    nodes.forEach((n, i) => { F[i*2] = n.fx; F[i*2+1] = n.fy; });

    for (const el of elements) {
        const nA = nodes[el.nodeA], nB = nodes[el.nodeB];
        const dx = nB.x - nA.x, dy = nB.y - nA.y;
        const L = Math.sqrt(dx*dx + dy*dy);
        const c = dx/L, s = dy/L;
        const kf = (el.E * el.A) / L;
        const kl = [[c*c, c*s, -c*c, -c*s],[c*s, s*s, -c*s, -s*s],[-c*c,-c*s,c*c,c*s],[-c*s,-s*s,c*s,s*s]];
        const idx = [el.nodeA*2, el.nodeA*2+1, el.nodeB*2, el.nodeB*2+1];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K[idx[i]][idx[j]] += kf * kl[i][j];
    }

    const P = 1e16;
    nodes.forEach((n, i) => {
        if (n.rx) K[i*2][i*2] += P;
        if (n.ry) K[i*2+1][i*2+1] += P;
    });

    const U = solveGauss(K, Array.from(F));

    for (const el of elements) {
        const nA = nodes[el.nodeA], nB = nodes[el.nodeB];
        const dx = nB.x - nA.x, dy = nB.y - nA.y;
        const L = Math.sqrt(dx*dx + dy*dy);
        const c = dx/L, s = dy/L;
        const elong = (U[el.nodeB*2]-U[el.nodeA*2])*c + (U[el.nodeB*2+1]-U[el.nodeA*2+1])*s;
        el.force = (el.E * el.A / L) * elong;
    }
}

function solveGauss(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
        let maxR = i;
        for (let k = i+1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[maxR][i])) maxR = k;
        [A[i], A[maxR]] = [A[maxR], A[i]];
        [b[i], b[maxR]] = [b[maxR], b[i]];
        if (Math.abs(A[i][i]) < 1e-12) A[i][i] = 1e-12;
        for (let k = i+1; k < n; k++) {
            const f = -A[k][i] / A[i][i];
            for (let j = i; j < n; j++) A[k][j] = j === i ? 0 : A[k][j] + f * A[i][j];
            b[k] += f * b[i];
        }
    }
    const x = new Array(n).fill(0);
    for (let i = n-1; i >= 0; i--) {
        x[i] = b[i] / A[i][i];
        for (let k = i-1; k >= 0; k--) b[k] -= A[k][i] * x[i];
    }
    return x;
}

function getElemColor(force) {
    if (Math.abs(force) < 0.05) return '#10d48a';
    if (force > 0) {
        const t = Math.min(force / 15, 1);
        return `rgb(${Math.round(59+(20-59)*t)},${Math.round(130+(40-130)*t)},${Math.round(246+(150-246)*t)})`;
    } else {
        const c = Math.min(Math.abs(force) / 15, 1);
        return `rgb(${Math.round(239+(180-239)*c)},${Math.round(68+(20-68)*c)},${Math.round(68+(20-68)*c)})`;
    }
}

// ── 3D BRIDGE BUILDER ─────────────────────────────────────────
function buildBridge3D(nodes2D, elements2D) {
    while (bridgeGroup.children.length > 0) bridgeGroup.remove(bridgeGroup.children[0]);
    waterMesh = null;
    trafficActors = [];    // reset moving actors
    barMeshRefs   = [];    // reset FEA bar refs

    buildAnimItems = [];
    buildAnimClock = 0;
    buildAnimActive = true;
    document.getElementById('build-indicator').style.display = 'flex';

    const isFEA   = params.mode === 'fea';
    const isScale = params.mode === 'scale';
    const isReal  = params.mode === 'real';

    const sc = ECUADOR_SCENARIOS[params.scenario] || ECUADOR_SCENARIOS.napo;
    const isAmazon = sc.environment === 'amazon';

    const xOff = params.length / 2;
    const zOff = params.width  / 2;

    // ── MATERIALS ──────────────────────────────────────────────
    let barMat, nodeMat, deckMat, braceMat;

    if (isScale) {
        barMat = new THREE.MeshPhongMaterial({ color: 0xefcf8d, shininess: 12 });
        nodeMat = new THREE.MeshPhongMaterial({ color: 0x5c4a37, shininess: 30 });
        deckMat = new THREE.MeshPhongMaterial({ color: 0xbc9d75, transparent: true, opacity: 0.55 });
        braceMat = barMat;
    } else {
        // Cinematic A36 steel — azul acero pintado anticorrosivo (típico Ecuador)
        barMat = new THREE.MeshStandardMaterial({
            color: 0x4a6fa5,
            metalness: 0.88,
            roughness: 0.12,
            envMapIntensity: 1.1
        });
        nodeMat = new THREE.MeshStandardMaterial({
            color: 0x2a4070,
            metalness: 0.95,
            roughness: 0.08
        });
        deckMat = new THREE.MeshStandardMaterial({
            color: 0x2d3748,
            roughness: 0.88
        });
        braceMat = new THREE.MeshStandardMaterial({
            color: 0x3a5580,
            metalness: 0.85,
            roughness: 0.18
        });
    }

    const barR  = isScale ? 0.075 : 0.085;
    const nodeR = isScale ? 0.13  : 0.16;

    // ── HELPER: animated cylinder between two points ───────────
    function makeCylinder(p1, p2, radius, mat, colorHex, animDelay, elemIdx) {
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();
        if (len < 0.001) return;

        const geom = new THREE.CylinderGeometry(radius, radius, len, 24);

        let m = mat;
        if (colorHex && isFEA) {
            const col = new THREE.Color(colorHex);
            const emitCol = col.clone();
            const isComp = colorHex.includes('rgb(') && parseInt(colorHex.split(',')[0].split('(')[1]) > 200;
            const isTens = colorHex.includes('rgb(') && parseInt(colorHex.split(',')[2]) > 200;
            m = new THREE.MeshStandardMaterial({
                color: col,
                metalness: 0.3,
                roughness: 0.4,
                emissive: emitCol,
                emissiveIntensity: 0.15
            });
            if (isComp || isTens) {
                m.emissiveIntensity = 0.3;
            }
        }

        const mesh = new THREE.Mesh(geom, m);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        mesh.position.copy(mid);

        dir.normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
        mesh.setRotationFromQuaternion(q);

        // Build animation
        const halfLen = len / 2;
        mesh.scale.y = 0.001;
        mesh.position.y = mid.y - halfLen + 0.0005;

        // Tag structural bars for FEA color repaint (skip cross-members)
        if (elemIdx !== undefined) {
            mesh.userData.feaElemIdx = elemIdx;
            barMeshRefs.push({ mesh, elemIdx });
        }

        buildAnimItems.push({ mesh, delay: animDelay, centerY: mid.y, halfLen, done: false });
        bridgeGroup.add(mesh);
        return mesh;
    }

    let animIdx = 0;

    // ── LATERAL TRUSSES ────────────────────────────────────────
    [-zOff, zOff].forEach(zVal => {
        const n3D = nodes2D.map(nd => new THREE.Vector3(nd.x - xOff, nd.y, zVal));

        elements2D.forEach((el, i) => {
            const pA = n3D[el.nodeA], pB = n3D[el.nodeB];
            const colorH = isFEA ? getElemColor(el.force) : null;
            const delay = (animIdx++) * 0.045;
            // elemIdx tags this bar for dynamic FEA repaint
            makeCylinder(pA, pB, barR, barMat, colorH, delay, i);
        });

        // Nodes (spheres)
        n3D.forEach((pos, ni) => {
            const geom = new THREE.SphereGeometry(nodeR, 32, 32);
            const mesh = new THREE.Mesh(geom, nodeMat);
            mesh.position.copy(pos);
            mesh.castShadow = true;
            // Animate as a group (instant appear after build is done approx)
            mesh.scale.setScalar(0.001);
            const delay = (animIdx++) * 0.03;
            buildAnimItems.push({
                mesh,
                delay,
                centerY: pos.y,
                halfLen: nodeR,
                done: false,
                isSphere: true
            });
            bridgeGroup.add(mesh);
        });
    });

    // ── CROSS MEMBERS ──────────────────────────────────────────
    const Lp = params.length / params.panels;
    for (let i = 0; i <= params.panels; i++) {
        const xv = i * Lp - xOff;
        const delay = (animIdx++) * 0.04;
        // Bottom cross
        makeCylinder(
            new THREE.Vector3(xv, 0, -zOff),
            new THREE.Vector3(xv, 0,  zOff),
            barR, braceMat, null, delay
        );
        // Top cross
        makeCylinder(
            new THREE.Vector3(xv, params.height, -zOff),
            new THREE.Vector3(xv, params.height,  zOff),
            barR, braceMat, null, delay + 0.02
        );
    }

    // Wind bracing X on top chord
    for (let i = 0; i < params.panels; i++) {
        const x1 = i * Lp - xOff, x2 = (i+1) * Lp - xOff;
        const yv = params.height;
        const d2 = (animIdx++) * 0.04;
        makeCylinder(new THREE.Vector3(x1,yv,-zOff), new THREE.Vector3(x2,yv, zOff), barR*0.75, braceMat, null, d2);
        makeCylinder(new THREE.Vector3(x1,yv, zOff), new THREE.Vector3(x2,yv,-zOff), barR*0.75, braceMat, null, d2+0.015);
    }

    // ── DECK ──────────────────────────────────────────────────
    const deckGeom = new THREE.BoxGeometry(params.length, 0.04, params.width);
    const deckMesh = new THREE.Mesh(deckGeom, deckMat);
    deckMesh.position.set(0, -0.02, 0);
    deckMesh.receiveShadow = true;
    bridgeGroup.add(deckMesh);

    // ── LOAD ARROW ────────────────────────────────────────────
    if (params.load > 0) {
        const arLen = 1.4;
        const arOrigin = new THREE.Vector3(0, params.height + arLen, 0);
        const arDir = new THREE.Vector3(0, -1, 0);
        const arCol = isFEA ? 0xffeb3b : 0x10d48a;
        const arrow = new THREE.ArrowHelper(arDir, arOrigin, arLen, arCol, 0.45, 0.28);
        arrow.line.material.linewidth = 3;
        bridgeGroup.add(arrow);
    }

    // ── REAL MODE ENVIRONMENT ──────────────────────────────────
    if (isReal || isFEA) {
        buildEnvironment(isAmazon, xOff, zOff);
    }

    // Fix sphere animations (scale uniformly)
    buildAnimItems.forEach(item => {
        if (item.isSphere) {
            item.mesh.userData._sphere = true;
        }
    });
}

// ── ENVIRONMENT BUILDER ───────────────────────────────────────
function buildEnvironment(isAmazon, xOff, zOff) {
    const concrete = new THREE.MeshStandardMaterial({ color: 0x7b8fa1, roughness: 0.85 });
    const asphalt  = new THREE.MeshStandardMaterial({ color: 0x1e2535, roughness: 0.9 });

    // Abutments (Estribos principales)
    const pierGeom = new THREE.BoxGeometry(1.6, 4.2, params.width + 1.2);
    [-1, 1].forEach(side => {
        const pier = new THREE.Mesh(pierGeom, concrete);
        // Colocar el estribo ligeramente por debajo del césped (-0.02) para que no sobresalga lateralmente
        pier.position.set(side * (xOff + 0.7), -2.12, 0);
        pier.castShadow = pier.receiveShadow = true;
        bridgeGroup.add(pier);
    });

    // Wing Walls (Muros de ala de concreto para contener el terraplén de la carretera)
    const wingWallGeom = new THREE.BoxGeometry(4.0, 3.8, 0.4);
    [-1, 1].forEach(side => {
        [-1, 1].forEach(zSide => {
            const wall = new THREE.Mesh(wingWallGeom, concrete);
            // Rotar ligeramente hacia afuera (diseño civil típico)
            wall.rotation.y = side * zSide * 0.26; // ~15 grados
            // Colocar los muros de ala por debajo del nivel del césped (-0.15) para evitar Z-fighting en los laterales
            wall.position.set(
                side * (xOff + 2.2),
                -2.05,  // Enterrado bajo el nivel del césped
                zSide * (params.width / 2 + 0.35)
            );
            wall.castShadow = wall.receiveShadow = true;
            bridgeGroup.add(wall);
        });
    });

    // ── Water / River ──────────────────────────────────────────
    const waterGeom = new THREE.PlaneGeometry(params.length + 0.5, 90);

    // Procedural water canvas texture
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 256; wCanvas.height = 64;
    const wCtx = wCanvas.getContext('2d');
    const grad = wCtx.createLinearGradient(0, 0, 256, 0);

    if (isAmazon) {
        grad.addColorStop(0,    '#0d3b52');
        grad.addColorStop(0.3,  '#0e4f6b');
        grad.addColorStop(0.7,  '#0a3a50');
        grad.addColorStop(1,    '#0d3b52');
    } else {
        grad.addColorStop(0,    '#1a3a5c');
        grad.addColorStop(0.5,  '#1e4d72');
        grad.addColorStop(1,    '#1a3a5c');
    }
    wCtx.fillStyle = grad;
    wCtx.fillRect(0, 0, 256, 64);
    // Ripples
    wCtx.strokeStyle = 'rgba(255,255,255,0.08)';
    wCtx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        wCtx.beginPath();
        wCtx.moveTo(0, i * 8 + 4);
        wCtx.bezierCurveTo(64, i*8, 128, i*8+8, 192, i*8, 256, i*8+4);
        wCtx.stroke();
    }

    const wTex = new THREE.CanvasTexture(wCanvas);
    wTex.wrapS = THREE.RepeatWrapping;
    wTex.repeat.set(4, 1);

    const waterMat = new THREE.MeshStandardMaterial({
        map: wTex,
        metalness: 0.05,
        roughness: 0.3,
        transparent: true,
        opacity: 0.88
    });

    waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -4.1, 0);
    bridgeGroup.add(waterMesh);

    // ── Terrain / Banks ────────────────────────────────────────
    const bankColor = isAmazon ? 0x1a3a2a : 0x2c3a1e;
    const bankMat = new THREE.MeshStandardMaterial({ color: bankColor, roughness: 0.95 });
    const bankGeom = new THREE.BoxGeometry(45, 8.2, 90);

    [-1, 1].forEach(side => {
        const bank = new THREE.Mesh(bankGeom, bankMat);
        // Desfase vertical de -0.01 para evitar Z-fighting con la calzada
        bank.position.set(side * (xOff + 22.5), -4.11, 0);
        bank.receiveShadow = true;
        bridgeGroup.add(bank);
    });

    // ── Roads ─────────────────────────────────────────────────
    const roadLen = 35;
    const roadGeom = new THREE.BoxGeometry(roadLen, 0.06, params.width);
    [-1, 1].forEach(side => {
        const road = new THREE.Mesh(roadGeom, asphalt);
        road.position.set(side * (xOff + roadLen/2), -0.03, 0);
        road.receiveShadow = true;
        bridgeGroup.add(road);
    });

    // Road markings
    // Empleo de polygonOffset para forzar la renderización de marcas sobre el asfalto sin parpadeos
    const markMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2.0
    });
    const totalLen = params.length + roadLen * 2;
    for (let i = 0; i < Math.floor(totalLen / 3); i++) {
        const dashG = new THREE.BoxGeometry(0.9, 0.005, 0.1);
        const dash = new THREE.Mesh(dashG, markMat);
        dash.position.set(-totalLen/2 + i * 3 + 0.45, 0.01, 0);
        bridgeGroup.add(dash);
    }

    // ── Vegetation ────────────────────────────────────────────
    if (isAmazon) {
        buildAmazonVegetation(xOff);
    } else {
        buildAndeanVegetation(xOff);
    }

    // ── Vehicles / Traffic ────────────────────────────────────
    buildTraffic(xOff, zOff);
}

// ── VEGETATION ────────────────────────────────────────────────
function buildAmazonVegetation(xOff) {
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const treeLeafMat  = new THREE.MeshStandardMaterial({ color: 0x1a5c2a, roughness: 0.8 });
    const leafMat2     = new THREE.MeshStandardMaterial({ color: 0x236b30, roughness: 0.8 });

    const positions = [
        [-xOff-8,  0, -15], [-xOff-14, 0, -8], [-xOff-18, 0, 10], [-xOff-10, 0, 18],
        [-xOff-22, 0, -18], [-xOff-6,  0, -22],
        [ xOff+8,  0, -15], [ xOff+14, 0, -8], [ xOff+18, 0, 10], [ xOff+10, 0, 18],
        [ xOff+22, 0, -20], [ xOff+6,  0, -25]
    ];

    positions.forEach(([x, y, z], idx) => {
        const h = 7 + Math.sin(idx * 1.7) * 4;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.28, h, 7),
            treeTrunkMat
        );
        trunk.position.set(x, y + h/2 - 4.5, z);
        trunk.castShadow = true;
        bridgeGroup.add(trunk);

        // Canopy — 2 layers
        const lm = idx % 2 === 0 ? treeLeafMat : leafMat2;
        [0, 1].forEach(layer => {
            const cr = 2.5 - layer * 0.8;
            const ch = 3.5 - layer * 1.2;
            const canopy = new THREE.Mesh(
                new THREE.ConeGeometry(cr, ch, 7),
                lm
            );
            canopy.position.set(x, y + h - 2.5 - layer * 1.8, z);
            canopy.castShadow = true;
            bridgeGroup.add(canopy);
        });
    });
}

function buildAndeanVegetation(xOff) {
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const treeLeafMat  = new THREE.MeshStandardMaterial({ color: 0x2e4a1e, roughness: 0.8 });
    const bushMat      = new THREE.MeshStandardMaterial({ color: 0x3d5e28, roughness: 0.9 });

    [[-xOff-6, 0, -12], [-xOff-12, 0, 8], [xOff+6, 0, -12], [xOff+12, 0, 8]].forEach(([x,y,z]) => {
        const h = 4 + Math.random() * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 6), treeTrunkMat);
        trunk.position.set(x, y+h/2-4.5, z);
        trunk.castShadow = true;
        bridgeGroup.add(trunk);

        const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.8, 7, 6), treeLeafMat);
        canopy.scale.y = 1.3;
        canopy.position.set(x, y+h-2, z);
        canopy.castShadow = true;
        bridgeGroup.add(canopy);
    });

    // Bushes
    for (let i = 0; i < 8; i++) {
        const bx = (i < 4 ? -xOff-5 : xOff+5) + (i%4) * -4;
        const bz = (Math.random() - 0.5) * 20;
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.8 + Math.random()*0.4, 7, 5), bushMat);
        bush.scale.y = 0.7;
        bush.position.set(bx, -3.8, bz);
        bush.castShadow = true;
        bridgeGroup.add(bush);
    }
}

// ── TRAFFIC: MOVING ACTORS ────────────────────────────────────
function buildTraffic(xOff, zOff) {
    trafficActors = [];
    const TOTAL_PATH = 2 * ROAD_LEN + params.length;
    const startX     = -xOff - ROAD_LEN;

    // ── Wheel helper ──────────────────────────────────────────────
    function mkWheel(radius, mat) {
        const w = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, radius * 0.85, 12), mat
        );
        w.rotation.x = Math.PI / 2;
        return w;
    }

    // ── Car builder ───────────────────────────────────────────────
    function mkCar(col) {
        const g  = new THREE.Group();
        const bm = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.22 });
        const gm = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.18, metalness: 0.55 });
        const wm = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
        const lm = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: new THREE.Color(0xfef9c3), emissiveIntensity: 0.7 });
        const rm = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: new THREE.Color(0xef4444), emissiveIntensity: 0.55 });

        const body  = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.48, 0.92), bm); body.position.y = 0.36;  g.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 0.85), gm); cabin.position.set(-0.08, 0.72, 0); g.add(cabin);
        // Front lights
        [[0.93,0.42, 0.22],[0.93,0.42,-0.22]].forEach(([x,y,z]) => {
            const h = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.12,0.2), lm); h.position.set(x,y,z); g.add(h);
        });
        // Rear lights
        [[-0.93,0.42, 0.22],[-0.93,0.42,-0.22]].forEach(([x,y,z]) => {
            const r = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.1,0.18), rm); r.position.set(x,y,z); g.add(r);
        });

        const wheels = [];
        [[ 0.58,0.2, 0.5],[ 0.58,0.2,-0.5],[-0.55,0.2, 0.5],[-0.55,0.2,-0.5]].forEach(([wx,wy,wz]) => {
            const w = mkWheel(0.2, wm); w.position.set(wx,wy,wz); g.add(w); wheels.push(w);
        });
        g.traverse(c => { if (c.isMesh) c.castShadow = true; });
        return { group: g, wheels, legs: [] };
    }

    // ── Truck builder ─────────────────────────────────────────────
    function mkTruck(col) {
        const g  = new THREE.Group();
        const bm = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 });
        const wm = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
        const tm = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
        const lm = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: new THREE.Color(0xfef9c3), emissiveIntensity: 0.8 });

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.22, 1.05), tm); chassis.position.y = 0.37; g.add(chassis);
        const cab     = new THREE.Mesh(new THREE.BoxGeometry(1.05,1.05,1.02), bm); cab.position.set(1.65, 0.9, 0); g.add(cab);
        const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.9,1.5,1.02), tm);  trailer.position.set(-0.55, 1.1, 0); g.add(trailer);
        const pipe    = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.0,8), wm); pipe.position.set(1.1,1.42,0.56); g.add(pipe);
        // Cab headlights
        [[2.1,0.75, 0.3],[2.1,0.75,-0.3]].forEach(([x,y,z]) => {
            const h = new THREE.Mesh(new THREE.BoxGeometry(0.07,0.14,0.24), lm); h.position.set(x,y,z); g.add(h);
        });

        const wheels = [];
        [[ 1.4,0.32, 0.58],[ 1.4,0.32,-0.58],
         [ 0.5,0.32, 0.58],[ 0.5,0.32,-0.58],
         [-0.5,0.32, 0.58],[-0.5,0.32,-0.58],
         [-1.4,0.32, 0.58],[-1.4,0.32,-0.58]].forEach(([wx,wy,wz]) => {
            const w = mkWheel(0.3, wm); w.position.set(wx,wy,wz); g.add(w); wheels.push(w);
        });
        g.traverse(c => { if (c.isMesh) c.castShadow = true; });
        return { group: g, wheels, legs: [] };
    }

    // ── Register and spawn actor ──────────────────────────────────
    function spawnActor(meshResult, type, speed, zLane, dir, startT) {
        const { group, wheels, legs } = meshResult;
        const actor = { group, type, speed, zLane, dir, t: startT, TOTAL_PATH, startX, xOff, wheels, legs };
        const rawX = startX + startT * TOTAL_PATH;
        group.position.set(dir > 0 ? rawX : -rawX, 0, zLane);
        group.rotation.y = dir > 0 ? 0 : Math.PI;
        trafficActors.push(actor);
        bridgeGroup.add(group);
    }

    const laneR   =  params.width / 4;
    const laneL   = -params.width / 4;

    // Vehicles
    spawnActor(mkCar(0xef4444),   'car',   13, laneR,  +1, 0.05);
    spawnActor(mkCar(0x3b82f6),   'car',    9, laneR,  +1, 0.55);
    spawnActor(mkCar(0x10d48a),   'car',   11, laneL,  -1, 0.30);
    spawnActor(mkTruck(0xf97316), 'truck',  7, laneL,  -1, 0.75);
}

// ── MAIN ANIMATION LOOP ───────────────────────────────────────
function animate(timestamp = 0) {
    requestAnimationFrame(animate);

    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // ── 1. Orbital spotlight ──────────────────────────────────────
    spotLightAngle += dt * 0.4;
    if (spotLight) {
        const r = Math.max(params.length * 0.7, 12);
        spotLight.position.x = Math.cos(spotLightAngle) * r;
        spotLight.position.z = Math.sin(spotLightAngle) * r;
        spotLight.position.y = 8 + Math.sin(spotLightAngle * 0.5) * 3;
    }

    // ── 2. Animated river ─────────────────────────────────────────
    if (waterMesh && waterMesh.material.map) {
        waterMesh.material.map.offset.x += dt * 0.15;
        waterMesh.material.map.needsUpdate = true;
    }

    // ── 3. Bridge construction animation ─────────────────────────
    if (buildAnimActive) {
        buildAnimClock += dt;
        let allDone = true;
        buildAnimItems.forEach(item => {
            if (item.done) return;
            const elapsed = buildAnimClock - item.delay;
            if (elapsed < 0) { allDone = false; return; }
            const progress = Math.min(elapsed / 0.45, 1);
            const eased = easeOutBack(progress);
            if (item.isSphere) {
                item.mesh.scale.setScalar(Math.max(eased, 0.001));
            } else {
                item.mesh.scale.y = Math.max(eased, 0.001);
                item.mesh.position.y = item.centerY + (eased - 1) * item.halfLen;
            }
            if (progress >= 1) item.done = true;
            else allDone = false;
        });
        if (allDone) {
            buildAnimActive = false;
            document.getElementById('build-indicator').style.display = 'none';
        }
    }

    // ── 4. Moving traffic actors ──────────────────────────────────
    trafficActors.forEach(actor => {
        actor.t += dt * actor.speed / actor.TOTAL_PATH;
        if (actor.t > 1) actor.t -= 1;   // loop seamlessly

        // World X position
        const rawX = actor.startX + actor.t * actor.TOTAL_PATH;
        const worldX = actor.dir > 0 ? rawX : -rawX;
        actor.group.position.x = worldX;

        // Wheel rotation (radian per meter driven)
        const wheelRadius = actor.type === 'truck' ? 0.3 : 0.2;
        const dRot = (dt * actor.speed) / wheelRadius;
        actor.wheels.forEach(w => { w.rotation.z -= dRot; });

    });

    // ── 5. Dynamic FEA — throttled repaint as truck crosses ───────
    if (params.mode === 'fea' && trafficActors.length > 0) {
        dynamicFEATimer += dt;
        if (dynamicFEATimer >= DYNAMIC_FEA_INTERVAL) {
            dynamicFEATimer = 0;
            // Find the truck (heaviest load) — use first truck found
            const truck = trafficActors.find(a => a.type === 'truck');
            if (truck) {
                const xOff = params.length / 2;
                // truck position in bridge-local coordinates: -xOff..+xOff
                const bridgeX = truck.group.position.x;
                const isOnBridge = bridgeX > -xOff && bridgeX < xOff;
                if (isOnBridge) {
                    const xNorm = (bridgeX + xOff) / params.length;  // 0..1
                    updateDynamicFEA(xNorm);
                }
                // Show/hide HUD
                const hud = document.getElementById('dynamic-load-hud');
                if (hud) hud.style.display = isOnBridge ? 'block' : 'none';
            }
        }
    } else if (params.mode !== 'fea') {
        // Hide HUD outside FEA mode
        const hud = document.getElementById('dynamic-load-hud');
        if (hud) hud.style.display = 'none';
    }

    // ── 6. FEA breathing effect (for non-dynamic mode) ───────────
    if (params.mode === 'fea' && trafficActors.length === 0) {
        const breathVal = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(timestamp * 0.003));
        bridgeGroup.children.forEach(child => {
            if (child.isMesh && child.material?.emissive && child.material.emissiveIntensity > 0.05) {
                child.material.emissiveIntensity = 0.15 + breathVal * 0.35;
            }
        });
    }

    // ── 7. Cinematic camera tour ──────────────────────────────────
    if (cinematic.active) {
        cinematic.t += dt / cinematic.duration;
        if (cinematic.t >= 1) cinematic.t = 0;
        const angle = cinematic.t * Math.PI * 2;
        const r = cinematic.radius;
        const baseH = controls.target.y;
        const height = baseH + Math.sin(cinematic.t * Math.PI * 2) * params.height * 1.2 + params.height * 0.6;
        camera.position.set(
            controls.target.x + Math.cos(angle) * r,
            height,
            controls.target.z + Math.sin(angle) * r
        );
        camera.lookAt(controls.target);
        const bar = document.getElementById('tour-progress-bar');
        if (bar) bar.style.setProperty('--progress', (cinematic.t * 100).toFixed(1) + '%');
    }

    controls.update();
    renderer.render(scene, camera);
}

// ── DYNAMIC FEA — Moving Load Analysis ───────────────────────
// Recalculates FEA with a point load at xNorm (0..1 from left support)
// and repaints bar materials without rebuilding the scene.
function updateDynamicFEA(xNorm) {
    const n      = params.panels;
    const Lp     = params.length / n;
    const h      = params.height;
    const numNodes = (n + 1) * 2;

    // Build node array
    const nodes2D = [];
    for (let i = 0; i <= n; i++) nodes2D.push({ x: i*Lp, y: 0, fx:0, fy:0, rx: i===0, ry: i===0||i===n });
    for (let i = 0; i <= n; i++) nodes2D.push({ x: i*Lp, y: h, fx:0, fy:0, rx:false, ry:false });

    // Place truck load at nearest bottom node to xNorm
    const truckX  = xNorm * params.length;
    const nodeIdx = Math.round(truckX / Lp);
    const clampedIdx = Math.max(0, Math.min(n, nodeIdx));
    // Equivalent point load from truck: roughly 120 kN truck weight, scaled to model
    const truckLoad = Math.max(params.load * 6, 30);   // 6× static live load
    nodes2D[clampedIdx].fy -= truckLoad;

    // Own-weight distribution (same as runFEA)
    const wNode = params.load * 0.2 / (n + 1);
    for (let i = 0; i <= n; i++) nodes2D[i].fy -= wNode;

    // Build elements (same topology as bridge)
    const E = 2.0e9, A = 15 * Math.PI * Math.pow(0.0008, 2);
    const elements2D = [];
    for (let i = 0; i < n; i++) elements2D.push({ nodeA:i, nodeB:i+1, E, A, type:'bottom' });
    for (let i = 0; i < n; i++) elements2D.push({ nodeA:n+1+i, nodeB:n+2+i, E, A, type:'top' });
    for (let i = 0; i <= n; i++) elements2D.push({ nodeA:i, nodeB:n+1+i, E, A, type:'vertical' });
    for (let i = 0; i < n; i++) {
        if (i%2===0) elements2D.push({ nodeA:i, nodeB:n+2+i, E, A, type:'diagonal' });
        else         elements2D.push({ nodeA:n+1+i, nodeB:i+1, E, A, type:'diagonal' });
    }

    solveDirectStiffness2D(nodes2D, elements2D);

    // Repaint bar meshes without rebuild
    repaintBarsFEA(elements2D);

    // Update reactions for HUD
    const RA = (truckLoad * (params.length - truckX) / params.length).toFixed(1);
    const RB = (truckLoad * truckX / params.length).toFixed(1);
    const speed = trafficActors.find(a => a.type === 'truck')?.speed ?? 0;
    const DAF  = (1 + (speed * speed) / (9.81 * params.length)).toFixed(3);
    const Pef  = (truckLoad * parseFloat(DAF)).toFixed(1);

    updateDynamicHUD(xNorm, RA, RB, DAF, Pef, truckLoad);
}

// Repaint existing bar meshes with new force colors (no scene rebuild)
function repaintBarsFEA(elements2D) {
    barMeshRefs.forEach(ref => {
        if (ref.elemIdx >= elements2D.length) return;
        const force = elements2D[ref.elemIdx].force;
        const col   = new THREE.Color(getElemColor(force));
        if (ref.mesh.material && ref.mesh.material.isMaterial) {
            ref.mesh.material.color.copy(col);
            if (ref.mesh.material.emissive) {
                ref.mesh.material.emissive.copy(col.clone().multiplyScalar(0.6));
                // Pulse: stronger emissive for critical bars
                const crit = Math.abs(force) > 5;
                ref.mesh.material.emissiveIntensity = crit ? 0.55 : 0.15;
            }
            ref.mesh.material.needsUpdate = true;
        }
    });
}

// Update the dynamic HUD widget in the overlay
function updateDynamicHUD(xNorm, RA, RB, DAF, Pef, P) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setW = (id, w) => { const el = document.getElementById(id); if (el) el.style.width = w; };

    set('dlh-ra-val', RA + ' N');
    set('dlh-rb-val', RB + ' N');
    set('dlh-daf-val', DAF);
    set('dlh-pef-val', Pef);

    // Fill bars proportional to max
    const maxR = parseFloat(P);
    setW('dlh-ra-fill', (Math.min(parseFloat(RA)/maxR, 1)*100).toFixed(0) + '%');
    setW('dlh-rb-fill', (Math.min(parseFloat(RB)/maxR, 1)*100).toFixed(0) + '%');

    // Truck position marker
    const marker = document.getElementById('dlh-truck-marker');
    if (marker) marker.style.left = (xNorm * 100).toFixed(1) + '%';
}



// ── NODE DETAIL ───────────────────────────────────────────────
function buildNodeDetail() {
    while (nodeDetailGroup.children.length > 0) nodeDetailGroup.remove(nodeDetailGroup.children[0]);

    const spMat = new THREE.MeshPhongMaterial({ color: 0xf3d99e, shininess: 14 });
    const thMat = new THREE.MeshPhongMaterial({ color: 0x7a6955, shininess: 5 });
    const glMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.1, metalness: 0.1,
        transparent: true, opacity: 0.72
    });

    const bW = 0.5, bH = 0.25;

    function makeBundle(length, rotZ, pos) {
        const g = new THREE.Group();
        const nX = 4, nY = 3;
        const tW = bW/nX, tH = bH/nY;
        for (let ix = 0; ix < nX; ix++) {
            for (let iy = 0; iy < nY; iy++) {
                const m = new THREE.Mesh(new THREE.BoxGeometry(length, tH*0.88, tW*0.88), spMat);
                m.position.set(length/2, (iy-nY/2+0.5)*tH, (ix-nX/2+0.5)*tW);
                m.castShadow = true;
                g.add(m);
            }
        }
        g.position.copy(pos);
        g.rotation.z = rotZ;
        nodeDetailGroup.add(g);
    }

    makeBundle(3.0, 0, new THREE.Vector3(-3,0,0));
    makeBundle(3.0, Math.PI, new THREE.Vector3(3,0,0));
    makeBundle(2.5, Math.PI/2, new THREE.Vector3(0,0,0));
    const ang = 38.66 * Math.PI / 180;
    makeBundle(3.0, ang, new THREE.Vector3(0,0,0));
    makeBundle(3.0, Math.PI-ang, new THREE.Vector3(0,0,0));

    for (let i = 0; i < 14; i++) {
        const tor = new THREE.Mesh(
            new THREE.TorusGeometry(0.33 + Math.random()*0.06, 0.03, 16, 40),
            thMat
        );
        tor.position.set((Math.random()-0.5)*0.3,(Math.random()-0.5)*0.3,(Math.random()-0.5)*0.3);
        tor.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        tor.castShadow = true;
        nodeDetailGroup.add(tor);
    }

    nodeDetailGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.48,32,32), glMat));
    for (let i = 0; i < 4; i++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.11,24,24), glMat);
        drop.position.set((Math.random()-0.5)*0.8,(Math.random()-0.5)*0.8,(Math.random()-0.5)*0.4);
        nodeDetailGroup.add(drop);
    }

    camera.position.set(0, 1.6, 4.2);
    controls.target.set(0, 0.5, 0);
}

// ── EXPORT ────────────────────────────────────────────────────
function exportOBJ() {
    if (!bridgeGroup || params.mode === 'node') {
        alert('Selecciona un modo de puente completo para exportar.');
        return;
    }
    const result = new THREE.OBJExporter().parse(bridgeGroup);
    download(result, 'puente_warren_ecuador.obj', 'text/plain');
}

function exportSTL() {
    if (!bridgeGroup || params.mode === 'node') {
        alert('Selecciona un modo de puente completo para exportar.');
        return;
    }
    const result = new THREE.STLExporter().parse(bridgeGroup, { binary: true });
    download(result, 'puente_warren_ecuador.stl', 'application/octet-stream');
}

function download(content, name, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
