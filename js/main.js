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
let currentMode = 'solid';
let currentFunction = 'sphere';
let currentParams = {};
let customFn = null;
let generationFrame = null;

// 材质
const material = new THREE.MeshPhongMaterial({
    color: 0x4cc2ff,
    specular: 0x222222,
    shininess: 30,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1.0
});

const CUSTOM_PARAMS = [
    { key: 'a', label: 'a', min: -5, max: 5, step: 0.1, value: 1 },
    { key: 'b', label: 'b', min: -5, max: 5, step: 0.1, value: 1 },
    { key: 'c', label: 'c', min: -5, max: 5, step: 0.1, value: 1 }
];

// ===== Marching Cubes 生成曲面 =====
function generateSurface() {
    const resolution = parseInt(document.getElementById('resolution').value);
    const range = parseFloat(document.getElementById('domainRange').value);
    const size = range * 2; // 采样空间 [-range, range]

    // 获取当前函数
    let fn;
    if (currentFunction === 'custom') {
        if (!customFn) return;
        fn = (x, y, z) => customFn(x, y, z, currentParams.a, currentParams.b, currentParams.c);
    } else {
        const preset = PRESET_FUNCTIONS[currentFunction];
        fn = (x, y, z) => preset.fn(x, y, z, currentParams);
    }

    // 创建 MarchingCubes，按分辨率预留足够的三角形缓冲区
    // MarchingCubes 的 field 数组大小为 resolution^3
    const maxPolyCount = Math.max(10000, resolution * resolution * 12);
    const mc = new MarchingCubes(resolution, material, false, false, maxPolyCount);
    mc.isolation = 0;
    // MarchingCubes 顶点坐标已经是 [-1, 1]，映射到采样空间 [-size/2, size/2]
    mc.scale.set(size / 2, size / 2, size / 2);

    // 填充场值
    const n = resolution;
    const half = size / 2;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                const x = (i / (resolution - 1)) * size - half;
                const y = (j / (resolution - 1)) * size - half;
                const z = (k / (resolution - 1)) * size - half;
                mc.field[i + j * n + k * n * n] = fn(x, y, z);
            }
        }
    }

    mc.update();

    // 移除旧曲面
    if (surfaceMesh) {
        scene.remove(surfaceMesh);
        surfaceMesh.geometry.dispose();
    }
    surfaceMesh = mc;
    scene.add(surfaceMesh);

    applyDisplayMode();
}

function scheduleSurfaceGeneration() {
    if (generationFrame !== null) return;
    generationFrame = requestAnimationFrame(() => {
        generationFrame = null;
        generateSurface();
    });
}

// ===== 显示模式 =====
function applyDisplayMode() {
    if (!surfaceMesh) return;
    const mat = surfaceMesh.material;
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
}

// ===== 参数滑块 =====
function buildParamSliders() {
    const container = document.getElementById('paramSliders');
    container.innerHTML = '';

    const params = currentFunction === 'custom'
        ? CUSTOM_PARAMS
        : PRESET_FUNCTIONS[currentFunction].params;
    currentParams = {};

    params.forEach(param => {
        currentParams[param.key] = param.value;

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
            const val = parseFloat(slider.value);
            currentParams[param.key] = val;
            valueLabel.textContent = val.toFixed(2);
            scheduleSurfaceGeneration();
        });

        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valueLabel);
        container.appendChild(row);
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
    const input = document.getElementById('customFunction');
    const keypad = document.querySelector('.calc-keypad');

    keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.key-btn');
        if (!btn) return;

        const key = btn.dataset.key;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;

        switch (key) {
            case 'clear':
                input.value = '';
                break;
            case 'backspace':
                if (start === end && start > 0) {
                    input.value = value.slice(0, start - 1) + value.slice(end);
                    input.selectionStart = input.selectionEnd = start - 1;
                } else {
                    input.value = value.slice(0, start) + value.slice(end);
                    input.selectionStart = input.selectionEnd = start;
                }
                break;
            case 'pi':
                insertText(input, 'π', start, end);
                break;
            case 'e':
                insertText(input, 'e', start, end);
                break;
            case 'sqrt':
                insertText(input, 'sqrt(', start, end);
                break;
            case 'abs':
                insertText(input, 'abs(', start, end);
                break;
            case 'sin':
            case 'cos':
            case 'tan':
            case 'log':
            case 'exp':
                insertText(input, key + '(', start, end);
                break;
            default:
                insertText(input, key, start, end);
        }

        input.focus();
    });

    // 应用自定义函数
    document.getElementById('applyCustom').addEventListener('click', () => {
        const expr = input.value.trim();
        if (!expr) return;
        try {
            customFn = parseCustomFunction(expr);
            currentFunction = 'custom';
            document.getElementById('functionSelect').value = 'custom';
            buildParamSliders();
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
        currentFunction = e.target.value;
        if (currentFunction === 'custom') {
            // 使用自定义函数
            const expr = document.getElementById('customFunction').value.trim();
            if (expr) {
                try {
                    customFn = parseCustomFunction(expr);
                } catch (err) {
                    alert(err.message);
                    return;
                }
            } else {
                alert('请先输入自定义函数表达式');
                e.target.value = 'sphere';
                currentFunction = 'sphere';
                return;
            }
        }
        buildParamSliders();
        scheduleSurfaceGeneration();
    });

    // 分辨率
    const resolutionSlider = document.getElementById('resolution');
    const resolutionValue = document.getElementById('resolutionValue');
    resolutionSlider.addEventListener('input', () => {
        resolutionValue.textContent = resolutionSlider.value;
        scheduleSurfaceGeneration();
    });

    document.getElementById('domainRange').addEventListener('change', scheduleSurfaceGeneration);

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
    buildParamSliders();
    generateSurface();
    animate();
}

init();