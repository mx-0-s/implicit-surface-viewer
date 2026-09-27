/**
 * 主程序：Three.js 场景初始化、MarchingCubes、UI交互
 */

// ===== 错误捕获提示 =====
window.addEventListener('error', (e) => {
    const msg = e.message || '未知错误';
    const errDiv = document.getElementById('errorOverlay');
    if (errDiv) {
        errDiv.style.display = 'block';
        errDiv.textContent = '加载错误: ' + msg + '\n\n提示: 请使用 start.bat 启动本地服务器访问，不要直接双击打开 index.html';
    }
});

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { PRESET_FUNCTIONS, parseCustomFunction } from './functions.js';

// ===== 场景初始化 =====
const canvas = document.getElementById('glCanvas');
const viewport = document.querySelector('.viewport');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(3, 2.5, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.autoRotate = false;

// ===== 灯光 =====
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0x4488ff, 0.3);
dirLight2.position.set(-5, -3, -5);
scene.add(dirLight2);

// ===== 坐标轴辅助 =====
const axesHelper = new THREE.AxesHelper(2.5);
scene.add(axesHelper);

// 网格辅助
const gridHelper = new THREE.GridHelper(5, 10, 0x444466, 0x333355);
scene.add(gridHelper);

// ===== 曲面网格 =====
let surfaceMesh = null;
let secondSurfaceMesh = null;
let currentMode = 'solid';
let currentFunction = 'sphere';
let currentParams = {};
let customFn = null;
let sharedCustomParams = {};
let secondFunction = 'torus';
let secondParams = {};
let secondCustomFn = null;
let secondSurfaceEnabled = false;
let coordinateMode = 'cartesian';
let generationFrame = null;
let pendingPrimaryGeneration = false;
let pendingSecondGeneration = false;

function createSurfaceMaterial(color) {
    return new THREE.MeshPhongMaterial({
        color,
        specular: 0x222222,
        shininess: 30,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1.0
    });
}

const material = createSurfaceMaterial(0x4cc2ff);
const secondMaterial = createSurfaceMaterial(0xc8b97a);

const CUSTOM_PARAMS = [
    { key: 'a', label: 'a', min: -5, max: 5, step: 0.1, value: 1 },
    { key: 'b', label: 'b', min: -5, max: 5, step: 0.1, value: 1 },
    { key: 'c', label: 'c', min: -5, max: 5, step: 0.1, value: 1 }
];

function createEvaluator(functionName, params, customFunction) {
    if (functionName === 'custom') {
        if (!customFunction) return null;
        return (x, y, z) => {
            const rho = Math.sqrt(x * x + y * y + z * z);
            const theta = Math.atan2(y, x);
            const phi = rho === 0 ? 0 : Math.acos(Math.max(-1, Math.min(1, z / rho)));
            const radialDistance = coordinateMode === 'spherical'
                ? rho
                : Math.sqrt(x * x + y * y);
            return customFunction(
                x,
                y,
                z,
                params.a,
                params.b,
                params.c,
                radialDistance,
                theta,
                coordinateMode === 'spherical' ? phi : 0
            );
        };
    }

    const preset = PRESET_FUNCTIONS[functionName];
    return (x, y, z) => preset.fn(x, y, z, params);
}

function createSurface(evaluate, surfaceMaterial, resolution, size) {
    if (!evaluate) return null;

    const maxPolyCount = Math.max(10000, resolution * resolution * 12);
    const marchingCubes = new MarchingCubes(resolution, surfaceMaterial, false, false, maxPolyCount);
    marchingCubes.isolation = 0;
    marchingCubes.scale.set(size / 2, size / 2, size / 2);

    const half = size / 2;
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            for (let k = 0; k < resolution; k++) {
                const x = (i / (resolution - 1)) * size - half;
                const y = (j / (resolution - 1)) * size - half;
                const z = (k / (resolution - 1)) * size - half;
                marchingCubes.field[i + j * resolution + k * resolution * resolution] = evaluate(x, y, z);
            }
        }
    }

    marchingCubes.update();
    return marchingCubes;
}

function replaceSurface(previousSurface, nextSurface) {
    if (previousSurface) {
        scene.remove(previousSurface);
        previousSurface.geometry.dispose();
    }
    if (nextSurface) scene.add(nextSurface);
    return nextSurface;
}

// ===== Marching Cubes 生成曲面 =====
function generateSurface(updatePrimary = true, updateSecond = true) {
    const resolution = parseInt(document.getElementById('resolution').value);
    const range = parseFloat(document.getElementById('domainRange').value);
    const size = range * 2;

    if (updatePrimary) {
        const primarySurface = createSurface(
            createEvaluator(
                currentFunction,
                currentFunction === 'custom' ? sharedCustomParams : currentParams,
                customFn
            ),
            material,
            resolution,
            size
        );
        surfaceMesh = replaceSurface(surfaceMesh, primarySurface);
    }

    if (updateSecond) {
        const secondarySurface = secondSurfaceEnabled
            ? createSurface(
                createEvaluator(
                    secondFunction,
                    secondFunction === 'custom' ? sharedCustomParams : secondParams,
                    secondCustomFn
                ),
                secondMaterial,
                resolution,
                size
            )
            : null;
        secondSurfaceMesh = replaceSurface(secondSurfaceMesh, secondarySurface);
    }

    applyDisplayMode();
}

function scheduleSurfaceGeneration(target = 'all') {
    if (target !== 'second') pendingPrimaryGeneration = true;
    if (target !== 'primary') pendingSecondGeneration = true;
    if (generationFrame !== null) return;
    generationFrame = requestAnimationFrame(() => {
        generationFrame = null;
        const updatePrimary = pendingPrimaryGeneration;
        const updateSecond = pendingSecondGeneration;
        pendingPrimaryGeneration = false;
        pendingSecondGeneration = false;
        generateSurface(updatePrimary, updateSecond);
    });
}

function buildParamSliders(containerId, functionName, onChange) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const params = functionName === 'custom'
        ? CUSTOM_PARAMS
        : PRESET_FUNCTIONS[functionName].params;
    const values = {};

    params.forEach(param => {
        values[param.key] = param.value;

        const row = document.createElement('div');
        row.className = 'slider-row';

        const label = document.createElement('label');
        label.textContent = param.label;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = param.min;
        slider.max = param.max;
        slider.step = param.step;
        slider.value = param.value;

        const valueLabel = document.createElement('span');
        valueLabel.className = 'value-label';
        valueLabel.textContent = param.value.toFixed(2);

        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            values[param.key] = value;
            valueLabel.textContent = value.toFixed(2);
            onChange();
        });

        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valueLabel);
        container.appendChild(row);
    });

    return values;
}

function buildPrimaryParamSliders() {
    const container = document.getElementById('paramSliders');
    if (currentFunction === 'custom') {
        container.innerHTML = '';
        currentParams = sharedCustomParams;
    } else {
        currentParams = buildParamSliders(
            'paramSliders',
            currentFunction,
            () => scheduleSurfaceGeneration('primary')
        );
    }
    updateSharedCustomParamVisibility();
}

function buildSecondParamSliders() {
    const container = document.getElementById('secondParamSliders');
    if (secondFunction === 'custom') {
        container.innerHTML = '';
        secondParams = sharedCustomParams;
    } else {
        secondParams = buildParamSliders(
            'secondParamSliders',
            secondFunction,
            () => scheduleSurfaceGeneration('second')
        );
    }
    updateSharedCustomParamVisibility();
}

function updateSharedCustomParamVisibility() {
    const secondUsesCustomFunction = secondSurfaceEnabled && secondFunction === 'custom';
    document.getElementById('sharedCustomParamSection').hidden =
        currentFunction !== 'custom' && !secondUsesCustomFunction;
}

function scheduleSharedCustomGeneration() {
    const primaryUsesCustomFunction = currentFunction === 'custom';
    const secondUsesCustomFunction = secondSurfaceEnabled && secondFunction === 'custom';
    if (primaryUsesCustomFunction && secondUsesCustomFunction) {
        scheduleSurfaceGeneration();
    } else if (primaryUsesCustomFunction) {
        scheduleSurfaceGeneration('primary');
    } else if (secondUsesCustomFunction) {
        scheduleSurfaceGeneration('second');
    }
}

function applyDisplayMode() {
    [surfaceMesh, secondSurfaceMesh].forEach(surface => {
        if (!surface) return;
        const mat = surface.material;
        switch (currentMode) {
            case 'solid':
                mat.wireframe = false;
                mat.transparent = false;
                mat.opacity = 1.0;
                break;
            case 'wireframe':
                mat.wireframe = true;
                mat.transparent = false;
                mat.opacity = 1.0;
                break;
            case 'transparent':
                mat.wireframe = false;
                mat.transparent = true;
                mat.opacity = 0.5;
                break;
        }
        mat.needsUpdate = true;
    });
}

// ===== 主题切换 =====
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    themeToggle.addEventListener('click', () => {
        const isDark = body.dataset.theme === 'dark';
        body.dataset.theme = isDark ? 'light' : 'dark';
        themeToggle.textContent = isDark ? '🌙' : '☀️';
        // 更新场景背景
        scene.background = new THREE.Color(isDark ? 0x1a1a2e : 0xf0f0f5);
    });
}

// ===== 计算器键盘 =====
function initKeypad() {
    const inputs = [
        document.getElementById('customFunction'),
        document.getElementById('secondCustomFunction')
    ];
    let activeInput = inputs[0];
    const keypad = document.querySelector('.calc-keypad');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            activeInput = input;
        });
    });

    updateCoordinateKeys();

    keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.key-btn');
        if (!btn) return;

        const key = btn.dataset.key;
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const value = activeInput.value;

        switch (key) {
            case 'clear':
                activeInput.value = '';
                break;
            case 'backspace':
                if (start === end && start > 0) {
                    activeInput.value = value.slice(0, start - 1) + value.slice(end);
                    activeInput.selectionStart = activeInput.selectionEnd = start - 1;
                } else {
                    activeInput.value = value.slice(0, start) + value.slice(end);
                    activeInput.selectionStart = activeInput.selectionEnd = start;
                }
                break;
            case 'pi':
                insertText(activeInput, 'π', start, end);
                break;
            case 'e':
                insertText(activeInput, 'e', start, end);
                break;
            case 'sqrt':
                insertText(activeInput, 'sqrt(', start, end);
                break;
            case 'abs':
                insertText(activeInput, 'abs(', start, end);
                break;
            case 'sin':
            case 'cos':
            case 'tan':
            case 'log':
            case 'exp':
                insertText(activeInput, key + '(', start, end);
                break;
            default:
                insertText(activeInput, key, start, end);
        }

        activeInput.focus();
    });

    // 应用自定义函数
    document.getElementById('applyCustom').addEventListener('click', () => {
        const expr = inputs[0].value.trim();
        if (!expr) return;
        try {
            customFn = parseCustomFunction(expr);
            currentFunction = 'custom';
            document.getElementById('functionSelect').value = 'custom';
            buildPrimaryParamSliders();
            scheduleSurfaceGeneration();
        } catch (err) {
            alert(err.message);
        }
    });
}

function insertText(input, text, start, end) {
    const value = input.value;
    input.value = value.slice(0, start) + text + value.slice(end);
    input.selectionStart = input.selectionEnd = start + text.length;
}

// ===== 事件绑定 =====
function initEvents() {
    // 函数选择
    document.getElementById('functionSelect').addEventListener('change', (e) => {
        const selectedFunction = e.target.value;
        if (selectedFunction === 'custom') {
            // 使用自定义函数
            const expr = document.getElementById('customFunction').value.trim();
            if (expr) {
                try {
                    customFn = parseCustomFunction(expr);
                } catch (err) {
                    alert(err.message);
                    e.target.value = currentFunction;
                    return;
                }
            } else {
                alert('请先输入自定义函数表达式');
                e.target.value = currentFunction;
                return;
            }
        } else {
            customFn = null;
        }
        currentFunction = selectedFunction;
        buildPrimaryParamSliders();
        scheduleSurfaceGeneration();
    });

    const enableSecondSurface = document.getElementById('enableSecondSurface');
    const secondSurfaceControls = document.getElementById('secondSurfaceControls');
    enableSecondSurface.addEventListener('change', () => {
        secondSurfaceEnabled = enableSecondSurface.checked;
        secondSurfaceControls.hidden = !secondSurfaceEnabled;
        secondCustomControls.hidden = !secondSurfaceEnabled || secondFunction !== 'custom';
        updateSharedCustomParamVisibility();
        scheduleSurfaceGeneration('second');
    });

    const secondFunctionSelect = document.getElementById('secondFunctionSelect');
    const secondCustomControls = document.getElementById('secondCustomControls');
    secondFunctionSelect.addEventListener('change', () => {
        secondFunction = secondFunctionSelect.value;
        secondCustomControls.hidden = !secondSurfaceEnabled || secondFunction !== 'custom';
        secondCustomFn = null;
        if (secondFunction === 'custom') {
            const expr = document.getElementById('secondCustomFunction').value.trim();
            if (expr) {
                try {
                    secondCustomFn = parseCustomFunction(expr);
                } catch (err) {
                    alert(err.message);
                }
            }
        }
        buildSecondParamSliders();
        if (secondSurfaceEnabled) scheduleSurfaceGeneration('second');
    });

    document.getElementById('applySecondCustom').addEventListener('click', () => {
        const expr = document.getElementById('secondCustomFunction').value.trim();
        if (!expr) return;
        try {
            secondCustomFn = parseCustomFunction(expr);
            secondFunction = 'custom';
            secondFunctionSelect.value = 'custom';
            secondCustomControls.hidden = !secondSurfaceEnabled;
            buildSecondParamSliders();
            if (secondSurfaceEnabled) scheduleSurfaceGeneration('second');
        } catch (err) {
            alert(err.message);
        }
    });

    // 分辨率
    const resolutionSlider = document.getElementById('resolution');
    const resolutionValue = document.getElementById('resolutionValue');
    resolutionSlider.addEventListener('input', () => {
        resolutionValue.textContent = resolutionSlider.value;
    });
    resolutionSlider.addEventListener('change', () => {
        resolutionValue.textContent = resolutionSlider.value;
        generateSurface();
    });

    document.getElementById('domainRange').addEventListener('change', scheduleSurfaceGeneration);

    // 自定义函数坐标模式
    const coordinateModeSelect = document.getElementById('coordinateMode');
    const coordinateHint = document.getElementById('coordinateHint');
    const secondCoordinateHint = document.getElementById('secondCoordinateHint');
    coordinateModeSelect.addEventListener('change', () => {
        coordinateMode = coordinateModeSelect.value;
        updateCoordinateKeys();
        const hint = getCoordinateHint();
        coordinateHint.textContent = hint;
        secondCoordinateHint.textContent = hint;
        scheduleSurfaceGeneration();
    });

    // 显示模式
    document.querySelectorAll('.btn-group .calc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-group .calc-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            applyDisplayMode();
        });
    });
}

function updateCoordinateKeys() {
    const coordinateKeys = document.querySelectorAll('.coordinate-key');
    const labels = coordinateMode === 'cylindrical'
        ? ['ρ', 'θ', 'z']
        : coordinateMode === 'spherical'
            ? ['ρ', 'θ', 'φ']
            : ['x', 'y', 'z'];

    coordinateKeys.forEach((button, index) => {
        button.dataset.key = labels[index];
        button.textContent = labels[index];
    });
}

function getCoordinateHint() {
    switch (coordinateMode) {
        case 'cylindrical':
            return '可用变量：ρ(√(x²+y²)), θ(方位角), z';
        case 'spherical':
            return '可用变量：ρ(距离), θ(方位角), φ(极角)';
        default:
            return '可用变量：x, y, z';
    }
}

// ===== 窗口大小调整 =====
function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

window.addEventListener('resize', resize);

// ===== 渲染循环 =====
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ===== 初始化 =====
function init() {
    resize();
    initTheme();
    initKeypad();
    initEvents();
    sharedCustomParams = buildParamSliders(
        'sharedCustomParamSliders',
        'custom',
        scheduleSharedCustomGeneration
    );
    buildPrimaryParamSliders();
    buildSecondParamSliders();
    generateSurface();
    animate();
}

init();