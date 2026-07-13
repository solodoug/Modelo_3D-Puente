// Visor y Simulador 3D de Puente Warren - UNACH Ing. Civil
// Lógica de cálculo y renderizado 3D

// --- CONSTANTES Y CONFIGURACIÓN ---
let scene, camera, renderer, controls;
let bridgeGroup = null;
let nodeDetailGroup = null;

// Parámetros actuales (valores por defecto)
let params = {
    length: 20.00,  // Longitud prototipo (m)
    height: 3.00,   // Altura prototipo (m)
    width: 6.00,    // Ancho prototipo (m)
    panels: 4,      // Número de paneles
    scale: 25,      // Escala 1:25
    load: 5.00,     // Carga de prueba (N)
    mode: 'scale'   // Modo de visualización: scale, real, fea, node
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initThree();
    initUI();
    updateAll();
    
    // Auto-resize
    window.addEventListener('resize', onWindowResize);
});

// --- SISTEMA DE RENDERING 3D (THREE.JS) ---
function initThree() {
    const container = document.getElementById('canvas-container');
    
    // Crear escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    
    // Neblina sutil para profundidad
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);
    
    // Crear cámara
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(12, 6, 18);
    
    // Crear renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Controles de órbita
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // No bajar demasiado de la tierra
    controls.minDistance = 2;
    controls.maxDistance = 100;
    
    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(20, 40, 20);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 100;
    const d = 20;
    dirLight1.shadow.camera.left = -d;
    dirLight1.shadow.camera.right = d;
    dirLight1.shadow.camera.top = d;
    dirLight1.shadow.camera.bottom = -d;
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.3); // Luz azul de relleno
    dirLight2.position.set(-20, 20, -20);
    scene.add(dirLight2);
    
    // Crear grupo del puente
    bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);
    
    // Crear grupo de detalle de nudo (oculto inicialmente)
    nodeDetailGroup = new THREE.Group();
    scene.add(nodeDetailGroup);
    
    // Iniciar loop de animación
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Salvaguarda: si el contenedor está en transición y mide 0, evitar colgar la cámara con NaN
    if (width <= 0 || height <= 0) {
        return;
    }
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// --- CONTROLADOR DE INTERFAZ DE USUARIO (UI) ---
function initUI() {
    // Inputs de Rango
    const inputs = [
        { id: 'param-length', key: 'length', valId: 'val-length', isFloat: true },
        { id: 'param-height', key: 'height', valId: 'val-height', isFloat: true },
        { id: 'param-width', key: 'width', valId: 'val-width', isFloat: true },
        { id: 'param-panels', key: 'panels', valId: 'val-panels', isFloat: false },
        { id: 'param-scale', key: 'scale', valId: 'val-scale', isFloat: false },
        { id: 'param-load', key: 'load', valId: 'val-load', isFloat: true }
    ];
    
    inputs.forEach(input => {
        const el = document.getElementById(input.id);
        const valEl = document.getElementById(input.valId);
        
        el.addEventListener('input', (e) => {
            let val = input.isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
            params[input.key] = val;
            valEl.textContent = val.toFixed(input.isFloat ? 2 : 0);
            updateAll();
        });
    });
    
    // Botones de Modo Visual
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            params.mode = btn.getAttribute('data-mode');
            
            // Mostrar/ocultar leyendas e inputs
            const feaLegend = document.getElementById('fea-legend');
            const loadGroup = document.getElementById('group-load');
            const infoTitle = document.getElementById('visual-mode-title');
            
            if (params.mode === 'fea') {
                feaLegend.style.display = 'flex';
                loadGroup.style.display = 'block';
                infoTitle.textContent = 'Visualización: Análisis Estructural (FEA)';
            } else if (params.mode === 'node') {
                feaLegend.style.display = 'none';
                loadGroup.style.display = 'none';
                infoTitle.textContent = 'Visualización: Detalle de Nudo Típico';
            } else {
                feaLegend.style.display = 'none';
                loadGroup.style.display = 'block';
                if (params.mode === 'scale') {
                    infoTitle.textContent = 'Visualización: Escala 1:25 (Tallarines)';
                } else {
                    infoTitle.textContent = 'Visualización: Prototipo 1:1 (Real)';
                }
            }
            
            updateAll();
        });
    });
    
    // Tabs del Dashboard de Cálculos
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Botones de exportación
    document.getElementById('btn-export-obj').addEventListener('click', exportOBJ);
    document.getElementById('btn-export-stl').addEventListener('click', exportSTL);
    
    // Control de Pantalla Completa
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            const container = document.getElementById('canvas-container');
            if (!document.fullscreenElement) {
                container.requestFullscreen().then(() => {
                    btnFullscreen.innerHTML = '<span class="icon">🗗</span> Salir Pantalla Completa';
                }).catch(err => {
                    console.error(`Error al activar pantalla completa: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    // Monitorear cambios de pantalla completa
    document.addEventListener('fullscreenchange', () => {
        const btnFullscreen = document.getElementById('btn-fullscreen');
        if (btnFullscreen) {
            if (!document.fullscreenElement) {
                btnFullscreen.innerHTML = '<span class="icon">⛶</span> Pantalla Completa';
            } else {
                btnFullscreen.innerHTML = '<span class="icon">🗗</span> Salir Pantalla Completa';
            }
        }
        // Redimensionamiento seguro multietapa (inmediato y progresivo durante la transición de salida)
        onWindowResize();
        setTimeout(onWindowResize, 50);
        setTimeout(onWindowResize, 150);
        setTimeout(onWindowResize, 300);
        setTimeout(onWindowResize, 500);
    });

    // --- CONTROLES DE INTERFAZ RESPONSIVA ---
    
    // Toggle de la barra lateral en celulares
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    
    function openSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
            triggerSafeResize();
        }
    }
    
    function closeSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            triggerSafeResize();
        }
    }
    
    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', openSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Toggle del panel de cálculos inferior (colapsar / expandir)
    const dashboardPanel = document.getElementById('dashboard-panel');
    const btnToggleDashboard = document.getElementById('btn-toggle-dashboard');
    
    if (btnToggleDashboard && dashboardPanel) {
        btnToggleDashboard.addEventListener('click', () => {
            const isCollapsed = dashboardPanel.classList.toggle('collapsed');
            btnToggleDashboard.textContent = isCollapsed ? '▲' : '▼';
            btnToggleDashboard.title = isCollapsed ? 'Expandir panel' : 'Colapsar panel';
            
            // Cada vez que cambia la altura del panel, el canvas de Three.js cambia de tamaño.
            // Forzar actualización del visor en varias etapas durante la transición CSS (300ms)
            triggerSafeResize();
        });
    }
    
    // Función auxiliar para redimensionamiento en múltiples etapas
    function triggerSafeResize() {
        onWindowResize();
        setTimeout(onWindowResize, 50);
        setTimeout(onWindowResize, 100);
        setTimeout(onWindowResize, 200);
        setTimeout(onWindowResize, 350);
        setTimeout(onWindowResize, 500);
    }
}

// --- ACTUALIZACIÓN DE DATOS Y RENDERIZADO ---
function updateAll() {
    // 1. Cálculos de Geometría
    const Lp = params.length / params.panels; // Longitud panel real
    const d = Math.sqrt(Lp * Lp + params.height * params.height); // Diagonal real
    const thetaRad = Math.atan(params.height / Lp);
    const thetaDeg = thetaRad * (180 / Math.PI); // Ángulo grados
    
    // Dimensiones en modelo (cm)
    const scaleFactor = params.scale;
    const modelL = (params.length / scaleFactor) * 100;
    const modelH = (params.height / scaleFactor) * 100;
    const modelB = (params.width / scaleFactor) * 100;
    const modelLp = (Lp / scaleFactor) * 100;
    const modelD = (d / scaleFactor) * 100;
    
    // Actualizar Textos en Dashboard (Geometría)
    document.getElementById('model-dim-x').textContent = `${modelL.toFixed(2)} cm`;
    document.getElementById('model-dim-y').textContent = `${modelH.toFixed(2)} cm`;
    document.getElementById('model-dim-z').textContent = `${modelB.toFixed(2)} cm`;
    
    document.getElementById('geo-real-L').textContent = params.length.toFixed(2);
    document.getElementById('geo-model-L').textContent = modelL.toFixed(2);
    document.getElementById('geo-real-h').textContent = params.height.toFixed(2);
    document.getElementById('geo-model-h').textContent = modelH.toFixed(2);
    document.getElementById('geo-real-b').textContent = params.width.toFixed(2);
    document.getElementById('geo-model-b').textContent = modelB.toFixed(2);
    document.getElementById('geo-real-Lp').textContent = Lp.toFixed(2);
    document.getElementById('geo-model-Lp').textContent = modelLp.toFixed(2);
    
    // Fórmulas matemáticas detalladas
    document.getElementById('geo-math-pitagoras').innerHTML = 
        `d_m = \\sqrt{Lp_m^2 + h_m^2} = \\sqrt{${modelLp.toFixed(2)}^2 + ${modelH.toFixed(2)}^2} = \\sqrt{${(modelLp*modelLp).toFixed(1)} + ${(modelH*modelH).toFixed(1)}}`;
    document.getElementById('geo-model-d').textContent = modelD.toFixed(2);
    document.getElementById('geo-real-d').textContent = d.toFixed(2);
    document.getElementById('geo-math-trig').innerHTML = 
        `\\theta = \\arctan\\left(\\frac{h_m}{Lp_m}\\right) = \\arctan\\left(\\frac{${modelH.toFixed(2)}}{${modelLp.toFixed(2)}}\\right) = \\arctan(${ (modelH/modelLp).toFixed(4) })`;
    document.getElementById('geo-theta').textContent = thetaDeg.toFixed(2);
    
    // 2. Cálculos de Materiales
    const qtySup = params.panels;
    const qtyInf = params.panels;
    const qtyDiag = 2 * params.panels; // Warren Truss estándar sin verticales tiene 2n diagonales, pero con verticales son n diagonales
    // Nota: De acuerdo a nuestra topología, dibujamos n diagonales alternadas por cercha. 
    // Para n paneles:
    // Celosía con diagonales alternadas:
    // Hay exactamente n diagonales por celosía lateral.
    const qtyDiagPerSide = params.panels;
    const qtyVertPerSide = params.panels + 1; // x=0, Lp, 2Lp... n*Lp
    
    const lenSup = modelLp;
    const lenInf = modelLp;
    const lenDiag = modelD;
    const lenVert = modelH;
    
    const totSup = qtySup * lenSup;
    const totInf = qtyInf * lenInf;
    const totDiag = qtyDiagPerSide * lenDiag;
    const totVert = qtyVertPerSide * lenVert;
    const subtotalSide = totSup + totInf + totDiag + totVert;
    
    // Travesaños superiores e inferiores (ancho b)
    const qtyTravSup = params.panels + 1;
    const qtyTravInf = params.panels + 1;
    const lenTrav = modelB;
    const totTravSup = qtyTravSup * lenTrav;
    const totTravInf = qtyTravInf * lenTrav;
    
    // Arriostramientos (Wind bracing en X arriba)
    // Va de L_i a R_{i+1} en la cuerda superior. Longitud = sqrt(Lp^2 + b^2)
    const lenArr = Math.sqrt(modelLp*modelLp + modelB*modelB);
    const qtyArr = 2 * params.panels; // 2 por panel superior
    const totArr = qtyArr * lenArr;
    
    const grandTotalStruct = (2 * subtotalSide) + totTravSup + totTravInf + totArr;
    // Multiplicado por 15 (pues cada barra estructural tiene 15 tallarines)
    const grandTotalSpaghetti = grandTotalStruct * 15;
    
    // Masa promedio: 0.08 g/cm por fideo individual
    const estMassSpaghetti = grandTotalSpaghetti * 0.08;
    const estMassGlueThread = estMassSpaghetti * 0.18; // ~18% peso extra en hilo y pegamento UHU
    const totMassModel = estMassSpaghetti + estMassGlueThread;
    const totWeightModel = (totMassModel / 1000) * 9.81; // Newton
    
    // Inyectar en Dashboard (Materiales)
    document.getElementById('mat-qty-sup').textContent = qtySup;
    document.getElementById('mat-len-sup').textContent = lenSup.toFixed(2);
    document.getElementById('mat-total-sup').textContent = totSup.toFixed(2);
    
    document.getElementById('mat-qty-inf').textContent = qtyInf;
    document.getElementById('mat-len-inf').textContent = lenInf.toFixed(2);
    document.getElementById('mat-total-inf').textContent = totInf.toFixed(2);
    
    document.getElementById('mat-qty-diag').textContent = qtyDiagPerSide;
    document.getElementById('mat-len-diag').textContent = lenDiag.toFixed(2);
    document.getElementById('mat-total-diag').textContent = totDiag.toFixed(2);
    
    document.getElementById('mat-qty-vert').textContent = qtyVertPerSide;
    document.getElementById('mat-len-vert').textContent = lenVert.toFixed(2);
    document.getElementById('mat-total-vert').textContent = totVert.toFixed(2);
    
    document.getElementById('mat-subtotal-side').textContent = subtotalSide.toFixed(2);
    
    document.getElementById('mat-total-left').textContent = subtotalSide.toFixed(2);
    document.getElementById('mat-total-right').textContent = subtotalSide.toFixed(2);
    
    document.getElementById('mat-qty-trav-sup').textContent = qtyTravSup;
    document.getElementById('mat-len-trav-sup').textContent = lenTrav.toFixed(2);
    document.getElementById('mat-total-trav-sup').textContent = totTravSup.toFixed(2);
    
    document.getElementById('mat-qty-trav-inf').textContent = qtyTravInf;
    document.getElementById('mat-len-trav-inf').textContent = lenTrav.toFixed(2);
    document.getElementById('mat-total-trav-inf').textContent = totTravInf.toFixed(2);
    
    document.getElementById('mat-qty-arr').textContent = qtyArr;
    document.getElementById('mat-len-arr').textContent = lenArr.toFixed(2);
    document.getElementById('mat-total-arr').textContent = totArr.toFixed(2);
    
    document.getElementById('mat-grand-total').textContent = grandTotalStruct.toFixed(2);
    document.getElementById('mat-grand-total-m').textContent = (grandTotalStruct / 100).toFixed(2);
    document.getElementById('mat-est-mass').textContent = estMassSpaghetti.toFixed(1);
    document.getElementById('mat-total-mass').textContent = totMassModel.toFixed(1);
    document.getElementById('mat-est-weight').textContent = totWeightModel.toFixed(2);
    
    // 3. Simulación Estructural (FEA)
    const { nodes2D, elements2D, displacements } = runFEA();
    
    // Reacciones y carga
    const loadP = params.load;
    const ownWeight = totWeightModel;
    const reaction = (loadP + ownWeight) / 2;
    
    document.getElementById('static-load-val').textContent = loadP.toFixed(2);
    document.getElementById('static-weight-val').textContent = ownWeight.toFixed(2);
    document.getElementById('static-reaction-val').textContent = reaction.toFixed(2);
    
    // Inyectar esfuerzos críticos en la tabla
    const stressesTable = document.getElementById('table-stresses');
    stressesTable.innerHTML = '';
    
    // Mostrar esfuerzos más relevantes
    elements2D.forEach((el, index) => {
        let typeName = "";
        if (el.type === 'bottom') typeName = `Cuerda Inf. (${el.nodeA}-${el.nodeB})`;
        else if (el.type === 'top') typeName = `Cuerda Sup. (${el.nodeA - (params.panels+1)}-${el.nodeB - (params.panels+1)})`;
        else if (el.type === 'vertical') typeName = `Vertical (${el.nodeA}-${el.nodeB - (params.panels+1)})`;
        else if (el.type === 'diagonal') typeName = `Diagonal (${el.nodeA}-${el.nodeB - (params.panels+1)})`;
        
        let forceStr = Math.abs(el.force).toFixed(2) + " N";
        let stateClass = "";
        let stateText = "";
        
        if (el.force > 0.01) {
            stateClass = "stress-tens";
            stateText = "Tracción (Tensión)";
        } else if (el.force < -0.01) {
            stateClass = "stress-comp";
            stateText = "Compresión";
        } else {
            stateClass = "stress-zero";
            stateText = "Fuerza Cero";
            forceStr = "0.00 N";
        }
        
        // Agregar a la tabla sólo elementos críticos (limitar a 8 para limpieza visual)
        if (index < 12 || el.type === 'diagonal') {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${typeName}</td>
                <td class="${stateClass}">${stateText}</td>
                <td class="math">${forceStr}</td>
                <td><span class="dot" style="background-color: ${getElementColorHex(el.force)}"></span></td>
            `;
            stressesTable.appendChild(row);
        }
    });
    
    // 4. Renderizado 3D de la Estructura o Nudo
    if (params.mode === 'node') {
        bridgeGroup.visible = false;
        nodeDetailGroup.visible = true;
        buildNodeDetail();
    } else {
        bridgeGroup.visible = true;
        nodeDetailGroup.visible = false;
        buildBridge3D(nodes2D, elements2D);
        
        // 5. Ajustar Cámara Dinámicamente para que el puente se vea grande y centrado
        const targetDist = Math.max(params.length * 0.9, params.width * 1.5, params.height * 2.0) * 1.3;
        
        // Mantener la dirección de la cámara pero ajustar la distancia al target
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        
        if (dir.lengthSq() === 0) {
            dir.set(0.6, 0.4, 0.8).normalize();
        }
        
        // Establecer el punto de rotación en el centro del puente
        controls.target.set(0, params.height / 2, 0);
        
        // Mover la cámara a la distancia ideal conservando el ángulo
        camera.position.copy(dir.multiplyScalar(targetDist).add(controls.target));
    }
}

// --- RESOLVEDOR DE RIGIDEZ DIRECTA 2D (FEA) ---
function runFEA() {
    const n = params.panels;
    const Lp = params.length / n;
    const h = params.height;
    const numNodes = 2 * n + 2;
    
    // Construir nodos 2D
    const nodes2D = [];
    // Nodos inferiores: 0 a n
    for (let i = 0; i <= n; i++) {
        nodes2D.push({
            x: i * Lp,
            y: 0,
            fx: 0,
            fy: 0,
            rx: (i === 0), // Apoyo fijo en x=0
            ry: (i === 0 || i === n) // Apoyos simples en y
        });
    }
    // Nodos superiores: n+1 a 2n+1
    for (let i = 0; i <= n; i++) {
        nodes2D.push({
            x: i * Lp,
            y: h,
            fx: 0,
            fy: 0,
            rx: false,
            ry: false
        });
    }
    
    // Aplicar cargas
    // Carga de prueba central P
    const loadP = params.load;
    if (n % 2 === 0) {
        const centerNodeIndex = n / 2;
        nodes2D[centerNodeIndex].fy -= loadP / 2; // Carga estática por celosía
    } else {
        const leftCenter = Math.floor(n / 2);
        const rightCenter = Math.ceil(n / 2);
        nodes2D[leftCenter].fy -= loadP / 4;
        nodes2D[rightCenter].fy -= loadP / 4;
    }
    
    // Añadir peso propio distribuido en nodos inferiores
    // Calculamos el peso aproximado (ej: 0.83 N por celosía)
    const subtotalSide = (2 * n * Lp + n * Math.sqrt(Lp*Lp + h*h) + (n+1)*h);
    const weightSide = (subtotalSide * 100 * 15 * 0.08 * 1.18 / 1000) * 9.81 / 2; // Fuerza en N
    const wNode = weightSide / (n + 1);
    for (let i = 0; i <= n; i++) {
        nodes2D[i].fy -= wNode;
    }
    
    // Construir elementos 2D
    const elements2D = [];
    const E = 2.0e9; // Módulo elástico típico fideo (Pa)
    const A = 15 * Math.PI * Math.pow(0.0008, 2); // Área sección (15 tallarines de 0.8mm radio)
    
    // Cuerdas inferiores
    for (let i = 0; i < n; i++) {
        elements2D.push({ nodeA: i, nodeB: i + 1, E, A, type: 'bottom' });
    }
    // Cuerdas superiores
    for (let i = 0; i < n; i++) {
        elements2D.push({ nodeA: n + 1 + i, nodeB: n + 1 + i + 1, E, A, type: 'top' });
    }
    // Verticales
    for (let i = 0; i <= n; i++) {
        elements2D.push({ nodeA: i, nodeB: n + 1 + i, E, A, type: 'vertical' });
    }
    // Diagonales alternadas
    for (let i = 0; i < n; i++) {
        if (i % 2 === 0) {
            elements2D.push({ nodeA: i, nodeB: n + 1 + i + 1, E, A, type: 'diagonal' });
        } else {
            elements2D.push({ nodeA: n + 1 + i, nodeB: i + 1, E, A, type: 'diagonal' });
        }
    }
    
    // Resolver sistema
    const displacements = solveDirectStiffness2D(nodes2D, elements2D);
    
    return { nodes2D, elements2D, displacements };
}

function solveDirectStiffness2D(nodes, elements) {
    const numNodes = nodes.length;
    const DOF = numNodes * 2;
    
    const K = Array(DOF).fill(0).map(() => Array(DOF).fill(0));
    const F = Array(DOF).fill(0);
    
    for (let i = 0; i < numNodes; i++) {
        F[i * 2] = nodes[i].fx;
        F[i * 2 + 1] = nodes[i].fy;
    }
    
    for (const el of elements) {
        const nA = nodes[el.nodeA];
        const nB = nodes[el.nodeB];
        
        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const L = Math.sqrt(dx*dx + dy*dy);
        
        const c = dx / L;
        const s = dy / L;
        const kFactor = (el.E * el.A) / L;
        
        const kLocal = [
            [ c*c,  c*s, -c*c, -c*s],
            [ c*s,  s*s, -c*s, -s*s],
            [-c*c, -c*s,  c*c,  c*s],
            [-c*s, -s*s,  c*s,  s*s]
        ];
        
        const idx = [el.nodeA * 2, el.nodeA * 2 + 1, el.nodeB * 2, el.nodeB * 2 + 1];
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                K[idx[i]][idx[j]] += kFactor * kLocal[i][j];
            }
        }
    }
    
    // Aplicar condiciones de apoyo (método de penalización)
    const penalty = 1e16;
    for (let i = 0; i < numNodes; i++) {
        if (nodes[i].rx) K[i * 2][i * 2] += penalty;
        if (nodes[i].ry) K[i * 2 + 1][i * 2 + 1] += penalty;
    }
    
    // Resolver sistema
    const U = solveLinearSystem(K, F);
    
    // Calcular fuerzas internas
    for (const el of elements) {
        const nA = nodes[el.nodeA];
        const nB = nodes[el.nodeB];
        
        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const L = Math.sqrt(dx*dx + dy*dy);
        
        const c = dx / L;
        const s = dy / L;
        
        const uA_x = U[el.nodeA * 2];
        const uA_y = U[el.nodeA * 2 + 1];
        const uB_x = U[el.nodeB * 2];
        const uB_y = U[el.nodeB * 2 + 1];
        
        const elongation = (uB_x - uA_x) * c + (uB_y - uA_y) * s;
        el.force = (el.E * el.A / L) * elongation;
    }
    
    return U;
}

// Resolver Ax = b por Eliminación Gaussiana
function solveLinearSystem(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
        let maxEl = Math.abs(A[i][i]);
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > maxEl) {
                maxEl = Math.abs(A[k][i]);
                maxRow = k;
            }
        }
        for (let k = i; k < n; k++) {
            const tmp = A[maxRow][k];
            A[maxRow][k] = A[i][k];
            A[i][k] = tmp;
        }
        const tmp = b[maxRow];
        b[maxRow] = b[i];
        b[i] = tmp;
        
        if (Math.abs(A[i][i]) < 1e-12) {
            // Singular, evitar división por cero
            A[i][i] = 1e-12;
        }
        
        for (let k = i + 1; k < n; k++) {
            const c = -A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
                if (i === j) {
                    A[k][j] = 0;
                } else {
                    A[k][j] += c * A[i][j];
                }
            }
            b[k] += c * b[i];
        }
    }
    
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = b[i] / A[i][i];
        for (let k = i - 1; k >= 0; k--) {
            b[k] -= A[k][i] * x[i];
        }
    }
    return x;
}

// Mapear fuerza a color
// Verde: sin esfuerzo
function getElementColorHex(force) {
    if (Math.abs(force) < 0.05) return '#10b981';
    if (force > 0) {
        // Tracción: Azul (de celeste a azul marino)
        const t = Math.min(force / 15, 1); // Normalizar
        const r = Math.round(59 + (20 - 59) * t);
        const g = Math.round(130 + (40 - 130) * t);
        const b = Math.round(246 + (150 - 246) * t);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // Compresión: Rojo
        const c = Math.min(Math.abs(force) / 15, 1);
        const r = Math.round(239 + (150 - 239) * c);
        const g = Math.round(68 + (20 - 68) * c);
        const b = Math.round(68 + (20 - 68) * c);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// --- CONSTRUIDOR 3D DE PUENTE ---
function buildBridge3D(nodes2D, elements2D) {
    // Limpiar grupo de puente
    while (bridgeGroup.children.length > 0) {
        bridgeGroup.remove(bridgeGroup.children[0]);
    }
    
    // Decouple Three.js geometry from scaleFactor (always 1.0) to keep the bridge large
    const scaleFactor = 1.0; 
    const zOffset = params.width / 2;
    
    // Centrar puente en la escena
    const xOffset = params.length / 2;
    
    // Definir materiales según el modo
    let barMaterialLeft, barMaterialRight, braceMaterial, nodeMaterial, deckMaterial;
    let barRadius, nodeRadius, loadArrowScale;
    
    if (params.mode === 'scale' || params.mode === 'fea') {
        // Modo Escala o FEA
        const isFEA = (params.mode === 'fea');
        
        // Pasta color madera/tallarín
        barMaterialLeft = new THREE.MeshPhongMaterial({
            color: 0xefcf8d, 
            roughness: 0.8,
            shininess: 10
        });
        barMaterialRight = barMaterialLeft;
        braceMaterial = barMaterialLeft;
        
        // Nudos (hilo + cola)
        nodeMaterial = new THREE.MeshPhongMaterial({
            color: 0x5c4a37,
            roughness: 0.9,
            shininess: 40
        });
        
        // Tablero madera
        deckMaterial = new THREE.MeshPhongMaterial({
            color: 0xbc9d75,
            transparent: true,
            opacity: 0.6
        });
        
        // Set realistic proportional thicknesses for scale model spaghetti bundle in prototype meters
        barRadius = 0.075; 
        nodeRadius = 0.14;
        loadArrowScale = 1.0;
        
    } else {
        // Modo Real 1:1 (Acero y Concreto)
        barMaterialLeft = new THREE.MeshStandardMaterial({
            color: 0x78909c,
            metalness: 0.8,
            roughness: 0.2
        });
        barMaterialRight = barMaterialLeft;
        braceMaterial = barMaterialLeft;
        
        nodeMaterial = new THREE.MeshStandardMaterial({
            color: 0x455a64,
            metalness: 0.9,
            roughness: 0.1
        });
        
        deckMaterial = new THREE.MeshStandardMaterial({
            color: 0x374151, // Asfalto
            roughness: 0.9
        });
        
        barRadius = 0.08; // Tubos de acero gruesos en 1:1
        nodeRadius = 0.15;
        loadArrowScale = 1.0;
    }
    
    // Crear cilindro entre dos puntos
    function createCylinderBetweenPoints(p1, p2, radius, material, customColorHex = null) {
        const direction = new THREE.Vector3().subVectors(p2, p1);
        const length = direction.length();
        
        const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
        
        let mat = material;
        if (customColorHex) {
            mat = new THREE.MeshPhongMaterial({
                color: new THREE.Color(customColorHex),
                shininess: 15
            });
        }
        
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Alinear cilindro con la dirección de la barra
        mesh.position.copy(new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5));
        
        const up = new THREE.Vector3(0, 1, 0);
        direction.normalize();
        
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
        mesh.setRotationFromQuaternion(quaternion);
        
        bridgeGroup.add(mesh);
    }
    
    // 1. Dibujar Cerchas Laterales (Izquierda: z = -zOffset, Derecha: z = zOffset)
    const sides = [-zOffset, zOffset];
    
    sides.forEach((zVal, sideIndex) => {
        // Nodos 3D
        const nodes3D = nodes2D.map(n => new THREE.Vector3((n.x - xOffset) * scaleFactor, n.y * scaleFactor, zVal * scaleFactor));
        
        // Dibujar barras estructurales
        elements2D.forEach(el => {
            const pA = nodes3D[el.nodeA];
            const pB = nodes3D[el.nodeB];
            
            let colorHex = null;
            if (params.mode === 'fea') {
                colorHex = getElementColorHex(el.force);
            }
            
            createCylinderBetweenPoints(pA, pB, barRadius, barMaterialLeft, colorHex);
        });
        
        // Dibujar esferas en las juntas (nudos)
        nodes3D.forEach(nodePos => {
            const sphereGeom = new THREE.SphereGeometry(nodeRadius, 16, 16);
            const sphereMesh = new THREE.Mesh(sphereGeom, nodeMaterial);
            sphereMesh.position.copy(nodePos);
            sphereMesh.castShadow = true;
            bridgeGroup.add(sphereMesh);
        });
    });
    
    // 2. Dibujar Travesaños e Interconexiones
    const Lp = params.length / params.panels;
    
    // Travesaños inferiores y superiores
    for (let i = 0; i <= params.panels; i++) {
        const xVal = (i * Lp - xOffset) * scaleFactor;
        
        // Travesaño Inferior
        const pInfL = new THREE.Vector3(xVal, 0, -zOffset * scaleFactor);
        const pInfR = new THREE.Vector3(xVal, 0, zOffset * scaleFactor);
        createCylinderBetweenPoints(pInfL, pInfR, barRadius, braceMaterial);
        
        // Travesaño Superior
        const pSupL = new THREE.Vector3(xVal, params.height * scaleFactor, -zOffset * scaleFactor);
        const pSupR = new THREE.Vector3(xVal, params.height * scaleFactor, zOffset * scaleFactor);
        createCylinderBetweenPoints(pSupL, pSupR, barRadius, braceMaterial);
    }
    
    // Arriostramientos superiores (Bracing en X en el plano superior)
    for (let i = 0; i < params.panels; i++) {
        const x1 = (i * Lp - xOffset) * scaleFactor;
        const x2 = ((i + 1) * Lp - xOffset) * scaleFactor;
        const yVal = params.height * scaleFactor;
        
        // Diagonal 1: Izq_i -> Der_i+1
        const p1 = new THREE.Vector3(x1, yVal, -zOffset * scaleFactor);
        const p2 = new THREE.Vector3(x2, yVal, zOffset * scaleFactor);
        createCylinderBetweenPoints(p1, p2, barRadius * 0.8, braceMaterial);
        
        // Diagonal 2: Der_i -> Izq_i+1
        const p3 = new THREE.Vector3(x1, yVal, zOffset * scaleFactor);
        const p4 = new THREE.Vector3(x2, yVal, -zOffset * scaleFactor);
        createCylinderBetweenPoints(p3, p4, barRadius * 0.8, braceMaterial);
    }
    
    // 3. Dibujar Tablero (Deck)
    const deckLength = params.length * scaleFactor;
    const deckWidth = params.width * scaleFactor;
    const deckThickness = 0.02 * scaleFactor;
    
    const deckGeom = new THREE.BoxGeometry(deckLength, deckThickness, deckWidth);
    const deckMesh = new THREE.Mesh(deckGeom, deckMaterial);
    deckMesh.position.set(0, -deckThickness / 2, 0);
    deckMesh.receiveShadow = true;
    bridgeGroup.add(deckMesh);
    
    // 4. Dibujar Flecha de Carga (Modo FEA o normal, si P > 0)
    if (params.load > 0 && params.mode !== 'node') {
        const arrowLength = 1.2 * loadArrowScale;
        const arrowDir = new THREE.Vector3(0, -1, 0);
        const arrowOrigin = new THREE.Vector3(0, params.height * scaleFactor + arrowLength, 0); // Desde arriba
        
        // Si es FEA, flecha amarilla brillante. Si no, verde
        const arrowColor = params.mode === 'fea' ? 0xffeb3b : 0x10b981;
        const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowColor, 0.4 * loadArrowScale, 0.25 * loadArrowScale);
        
        // Hacer la flecha más gruesa
        arrowHelper.line.material.linewidth = 4;
        bridgeGroup.add(arrowHelper);
    }
    
    // 5. Dibujar Apoyos (Pilares) en Modo Real
    if (params.mode === 'real') {
        const pierMaterial = new THREE.MeshStandardMaterial({
            color: 0x90a4ae, // Concreto gris
            roughness: 0.9
        });
        
        const pierGeom = new THREE.BoxGeometry(1.5, 4.0, params.width + 1.0);
        
        // Pilar izquierdo (Estribo)
        const pierL = new THREE.Mesh(pierGeom, pierMaterial);
        pierL.position.set(-xOffset - 0.5, -2.0, 0);
        pierL.castShadow = true;
        pierL.receiveShadow = true;
        bridgeGroup.add(pierL);
        
        // Pilar derecho (Estribo)
        const pierR = new THREE.Mesh(pierGeom, pierMaterial);
        pierR.position.set(xOffset + 0.5, -2.0, 0);
        pierR.castShadow = true;
        pierR.receiveShadow = true;
        bridgeGroup.add(pierR);
        
        // Pilares intermedios en el río (bajo cada nodo inferior interno de la celosía)
        const intPierGeom = new THREE.BoxGeometry(0.6, 4.0, params.width - 0.5);
        for (let i = 1; i < params.panels; i++) {
            const xVal = -xOffset + i * Lp;
            const intPier = new THREE.Mesh(intPierGeom, pierMaterial);
            intPier.position.set(xVal, -2.0, 0);
            intPier.castShadow = true;
            intPier.receiveShadow = true;
            bridgeGroup.add(intPier);
        }
        
        // Añadir agua/río sutil abajo (el ancho del río es igual a la longitud del puente)
        const waterGeom = new THREE.PlaneGeometry(params.length + 0.2, 80);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x1d4ed8,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        const water = new THREE.Mesh(waterGeom, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(0, -3.9, 0);
        bridgeGroup.add(water);
        
        // Orillas de tierra/pasto
        const landGeom = new THREE.BoxGeometry(40, 5, 80);
        const landMat = new THREE.MeshStandardMaterial({
            color: 0x1b4332, // pasto verde
            roughness: 0.9
        });
        
        const landL = new THREE.Mesh(landGeom, landMat);
        landL.position.set(-xOffset - 20, -5.5, 0);
        bridgeGroup.add(landL);
        
        const landR = new THREE.Mesh(landGeom, landMat);
        landR.position.set(xOffset + 20, -5.5, 0);
        bridgeGroup.add(landR);
    }
    
    // 6. Carreteras de inicio y fin, Vehículos y Peatones
    if (params.mode === 'real' || params.mode === 'fea' || params.mode === 'scale') {
        const isScale = (params.mode === 'scale');
        
        // Materiales para carretera y líneas
        const roadMat = new THREE.MeshStandardMaterial({
            color: isScale ? 0xbcaaa4 : 0x27272a, // Madera clara en escala, asfalto oscuro en real
            roughness: 0.9
        });
        
        const lineMat = new THREE.MeshBasicMaterial({
            color: isScale ? 0x8d6e63 : 0xfacc15 // Madera oscura en escala, amarillo en real
        });
        
        const skinMat = new THREE.MeshPhongMaterial({
            color: isScale ? 0xd7ccc8 : 0xffdbac // Piel o madera clara
        });
        
        // Dibujar Carreteras
        const roadLength = 30;
        const roadThickness = 0.04;
        const roadGeom = new THREE.BoxGeometry(roadLength, roadThickness, params.width);
        
        // Carretera Izquierda
        const roadL = new THREE.Mesh(roadGeom, roadMat);
        roadL.position.set(-xOffset - roadLength/2, -roadThickness/2, 0);
        roadL.receiveShadow = true;
        bridgeGroup.add(roadL);
        
        // Carretera Derecha
        const roadR = new THREE.Mesh(roadGeom, roadMat);
        roadR.position.set(xOffset + roadLength/2, -roadThickness/2, 0);
        roadR.receiveShadow = true;
        bridgeGroup.add(roadR);
        
        // Línea central (carreteras + puente)
        const totalRoadLength = params.length + 2 * roadLength;
        const numDashes = Math.floor(totalRoadLength / 3);
        for (let i = 0; i < numDashes; i++) {
            const dashLength = 1.0;
            const xPos = -totalRoadLength/2 + (i * 3) + 0.5;
            const dashGeom = new THREE.BoxGeometry(dashLength, 0.005, 0.08);
            const dash = new THREE.Mesh(dashGeom, lineMat);
            dash.position.set(xPos, 0.005, 0);
            bridgeGroup.add(dash);
        }
        
        // Funciones para crear vehículos low-poly
        function createVehicle(x, z, colorHex, type, heading) {
            const vehicleGroup = new THREE.Group();
            
            const bodyColor = isScale ? 0xd7ccc8 : colorHex;
            const glassColor = isScale ? 0x8d6e63 : 0x0f172a;
            const wheelColor = isScale ? 0x5c4a37 : 0x18181b;
            
            const carMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
            const windowMat = new THREE.MeshStandardMaterial({ color: glassColor, roughness: 0.2 });
            const wheelMat = new THREE.MeshStandardMaterial({ color: wheelColor, roughness: 0.8 });
            
            if (type === 'car') {
                // Carrocería
                const bodyGeom = new THREE.BoxGeometry(1.8, 0.45, 0.9);
                const body = new THREE.Mesh(bodyGeom, carMat);
                body.position.y = 0.35;
                body.castShadow = true;
                vehicleGroup.add(body);
                
                // Cabina
                const cabGeom = new THREE.BoxGeometry(0.9, 0.4, 0.8);
                const cab = new THREE.Mesh(cabGeom, windowMat);
                cab.position.set(-0.1, 0.7, 0);
                cab.castShadow = true;
                vehicleGroup.add(cab);
                
                // Ruedas (4)
                const wheelGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12);
                const wheelPositions = [
                    [-0.5, 0.2, -0.48], [-0.5, 0.2, 0.48],
                    [0.5, 0.2, -0.48], [0.5, 0.2, 0.48]
                ];
                wheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
                    wheel.position.set(pos[0], pos[1], pos[2]);
                    wheel.rotation.x = Math.PI / 2;
                    wheel.castShadow = true;
                    vehicleGroup.add(wheel);
                });
            } else {
                // Camión
                // Chasis
                const chGeom = new THREE.BoxGeometry(3.6, 0.2, 1.0);
                const chassis = new THREE.Mesh(chGeom, wheelMat);
                chassis.position.y = 0.3;
                chassis.castShadow = true;
                vehicleGroup.add(chassis);
                
                // Cabina
                const cabGeom = new THREE.BoxGeometry(0.8, 0.9, 0.95);
                const cab = new THREE.Mesh(cabGeom, carMat);
                cab.position.set(1.1, 0.8, 0);
                cab.castShadow = true;
                vehicleGroup.add(cab);
                
                // Ventana parabrisas
                const glassGeom = new THREE.BoxGeometry(0.2, 0.3, 0.85);
                const glass = new THREE.Mesh(glassGeom, windowMat);
                glass.position.set(1.41, 0.95, 0);
                vehicleGroup.add(glass);
                
                // Contenedor trasero
                const boxGeom = new THREE.BoxGeometry(2.4, 1.3, 1.0);
                const boxMat = new THREE.MeshStandardMaterial({ color: isScale ? 0xbcaaa4 : 0xe2e8f0, roughness: 0.4 });
                const box = new THREE.Mesh(boxGeom, boxMat);
                box.position.set(-0.4, 1.05, 0);
                box.castShadow = true;
                vehicleGroup.add(box);
                
                // Ruedas (6)
                const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12);
                const wheelPositions = [
                    [1.0, 0.28, -0.55], [1.0, 0.28, 0.55],
                    [-0.3, 0.28, -0.55], [-0.3, 0.28, 0.55],
                    [-1.1, 0.28, -0.55], [-1.1, 0.28, 0.55]
                ];
                wheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
                    wheel.position.set(pos[0], pos[1], pos[2]);
                    wheel.rotation.x = Math.PI / 2;
                    wheel.castShadow = true;
                    vehicleGroup.add(wheel);
                });
            }
            
            // Posición final y orientación
            vehicleGroup.position.set(x, 0, z);
            vehicleGroup.rotation.y = heading;
            bridgeGroup.add(vehicleGroup);
        }
        
        // Crear peatón low-poly
        function createPedestrian(x, z, shirtColorHex) {
            const pGroup = new THREE.Group();
            
            const shirtMat = new THREE.MeshPhongMaterial({ color: isScale ? 0x8d6e63 : shirtColorHex });
            const pantsMat = new THREE.MeshPhongMaterial({ color: isScale ? 0x5c4a37 : 0x1d4ed8 });
            
            // Cuerpo (Cilindro)
            const bodyGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8);
            const body = new THREE.Mesh(bodyGeom, shirtMat);
            body.position.y = 0.325;
            body.castShadow = true;
            pGroup.add(body);
            
            // Cabeza (Esfera)
            const headGeom = new THREE.SphereGeometry(0.07, 8, 8);
            const head = new THREE.Mesh(headGeom, skinMat);
            head.position.y = 0.55;
            head.castShadow = true;
            pGroup.add(head);
            
            // Piernas (Cilindros pequeños)
            const legGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
            const legL = new THREE.Mesh(legGeom, pantsMat);
            legL.position.set(-0.03, 0.075, 0);
            pGroup.add(legL);
            
            const legR = new THREE.Mesh(legGeom, pantsMat);
            legR.position.set(0.03, 0.075, 0);
            pGroup.add(legR);
            
            pGroup.position.set(x, 0, z);
            bridgeGroup.add(pGroup);
        }
        
        // Colocar vehículos en carriles alternos
        // Carril derecho (z = params.width / 4, hacia la derecha heading = 0)
        createVehicle(-xOffset - 8, params.width / 4, 0xef4444, 'car', 0); // Auto rojo en la carretera izq
        createVehicle(xOffset / 3, params.width / 4, 0x3b82f6, 'car', 0);  // Auto azul en el puente
        
        // Carril izquierdo (z = -params.width / 4, hacia la izquierda heading = Math.PI)
        createVehicle(xOffset + 12, -params.width / 4, 0x10b981, 'car', Math.PI); // Auto verde en la carretera der
        createVehicle(-xOffset / 4, -params.width / 4, 0xf97316, 'truck', Math.PI); // Camión naranja en el puente
        
        // Colocar peatones en las aceras del puente (laterales z = -width/2 + 0.3 y z = width/2 - 0.3)
        const sideZ1 = -params.width / 2 + 0.3;
        const sideZ2 = params.width / 2 - 0.3;
        
        createPedestrian(-xOffset / 2, sideZ1, 0xec4899); // Persona rosa
        createPedestrian(xOffset / 2, sideZ1, 0x06b6d4);  // Persona cian
        createPedestrian(-xOffset / 5, sideZ2, 0x8b5cf6); // Persona morada
        createPedestrian(xOffset / 4, sideZ2, 0xeab308);  // Persona amarilla
    }
}

// --- CONSTRUIDOR 3D DE DETALLE DE NUDO ---
function buildNodeDetail() {
    // Limpiar grupo de nudo
    while (nodeDetailGroup.children.length > 0) {
        nodeDetailGroup.remove(nodeDetailGroup.children[0]);
    }
    
    // Configuración del Detalle de Nudo
    // Visualizaremos una junta central inferior donde concurren:
    // - 2 barras de cuerda inferior (horizontales, izquierda y derecha)
    // - 1 barra vertical (hacia arriba)
    // - 2 diagonales (hacia arriba-izquierda y arriba-derecha)
    
    // Materiales del Nudo Detallado
    const spaghettiMaterial = new THREE.MeshPhongMaterial({
        color: 0xf3d99e, // Pasta clara
        roughness: 0.7,
        shininess: 12
    });
    
    const threadMaterial = new THREE.MeshPhongMaterial({
        color: 0x7a6955, // Hilo marrón de yute/costal
        roughness: 0.95,
        shininess: 5
    });
    
    const glueMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.75, // Pegamento UHU translúcido seco
        refractionRatio: 0.98
    });
    
    // 1. Dibujar barras individuales del tallarín Don Vittorio
    // En lugar de cilindros sólidos, simularemos que están compuestos por múltiples tallarines planos individuales!
    // Un tallarín individual mide ~0.3cm x 0.1cm x largo. Renderizaremos pequeñas tiras juntas!
    // Para simplificar y hacerlo ultra-estético, crearemos barras rectangulares detalladas con estrías
    
    const barW = 0.5; // Ancho del paquete de tallarines
    const barH = 0.25; // Espesor del paquete
    
    function createSpaghettiBundle(length, rotationZ, position) {
        const group = new THREE.Group();
        
        // Simular 5 capas de tallarines apilados
        const numTallarinesX = 4;
        const numTallarinesY = 3;
        const tW = barW / numTallarinesX;
        const tH = barH / numTallarinesY;
        
        for (let ix = 0; ix < numTallarinesX; ix++) {
            for (let iy = 0; iy < numTallarinesY; iy++) {
                const geom = new THREE.BoxGeometry(length, tH * 0.9, tW * 0.9);
                const mesh = new THREE.Mesh(geom, spaghettiMaterial);
                mesh.position.set(
                    length / 2, 
                    (iy - numTallarinesY/2 + 0.5) * tH, 
                    (ix - numTallarinesX/2 + 0.5) * tW
                );
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);
            }
        }
        
        // Posicionar y rotar el grupo completo
        group.position.copy(position);
        group.rotation.z = rotationZ;
        nodeDetailGroup.add(group);
    }
    
    // Cuerda inferior izquierda
    createSpaghettiBundle(3.0, 0, new THREE.Vector3(-3.0, 0, 0));
    // Cuerda inferior derecha
    createSpaghettiBundle(3.0, Math.PI, new THREE.Vector3(3.0, 0, 0));
    // Barra vertical
    createSpaghettiBundle(2.5, Math.PI / 2, new THREE.Vector3(0, 0, 0));
    
    // Diagonales (38.66 grados aprox)
    const angle = 38.66 * (Math.PI / 180);
    createSpaghettiBundle(3.0, angle, new THREE.Vector3(0, 0, 0));
    createSpaghettiBundle(3.0, Math.PI - angle, new THREE.Vector3(0, 0, 0));
    
    // 2. Dibujar el Amarre de Hilo (Thread Wrap)
    // El hilo envuelve la intersección de los fideos.
    // Creamos varios aros torus superpuestos en la intersección central para simular el embobinado del hilo
    const numWraps = 15;
    for (let i = 0; i < numWraps; i++) {
        const radius = 0.35 + Math.random() * 0.05;
        const tubeRadius = 0.03;
        const torusGeom = new THREE.TorusGeometry(radius, tubeRadius, 8, 24);
        const torus = new THREE.Mesh(torusGeom, threadMaterial);
        
        torus.position.set(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        );
        torus.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        torus.castShadow = true;
        nodeDetailGroup.add(torus);
    }
    
    // 3. Simular Pegamento UHU Seco
    // Creamos burbujas/gotas sutiles translúcidas sobre el amarre de hilo
    const glueGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const glueMesh = new THREE.Mesh(glueGeom, glueMaterial);
    glueMesh.position.set(0, 0, 0);
    nodeDetailGroup.add(glueMesh);
    
    // Gotitas adicionales
    for (let i = 0; i < 4; i++) {
        const smallGlueGeom = new THREE.SphereGeometry(0.12, 8, 8);
        const drop = new THREE.Mesh(smallGlueGeom, glueMaterial);
        drop.position.set(
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.4
        );
        nodeDetailGroup.add(drop);
    }
    
    // Reposicionar cámara para una buena vista de cerca del nudo
    camera.position.set(0, 1.5, 4.0);
    controls.target.set(0, 0.5, 0);
}

// --- UTILIDADES DE EXPORTACIÓN ---
function exportOBJ() {
    if (!bridgeGroup) return;
    
    // Forzar modo puente antes de exportar
    const prevMode = params.mode;
    if (params.mode === 'node') {
        alert("Por favor, selecciona un modo de puente completo (Escala 1:25 o 1:1) para exportar.");
        return;
    }
    
    const exporter = new THREE.OBJExporter();
    const result = exporter.parse(bridgeGroup);
    
    triggerDownload(result, 'puente_warren_3d.obj', 'text/plain');
}

function exportSTL() {
    if (!bridgeGroup) return;
    
    if (params.mode === 'node') {
        alert("Por favor, selecciona un modo de puente completo (Escala 1:25 o 1:1) para exportar.");
        return;
    }
    
    const exporter = new THREE.STLExporter();
    const result = exporter.parse(bridgeGroup, { binary: true });
    
    triggerDownload(result, 'puente_warren_3d.stl', 'application/octet-stream');
}

function triggerDownload(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
