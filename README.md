# 三维隐函数曲面绘制器 | 3D Implicit Surface Viewer

一个基于 Three.js 和 Marching Cubes 算法的浏览器端三维隐函数曲面可视化工具。

A browser-based 3D implicit surface visualizer powered by Three.js and the Marching Cubes algorithm.

## 功能 Features

- 预设曲面：球面、环面、心脏曲面、双叶双曲面和克莱因瓶
- Presets: sphere, torus, heart, two-sheet hyperboloid, and Klein bottle
- 自定义隐函数 `f(x, y, z, a, b, c) = 0`
- Custom implicit functions: `f(x, y, z, a, b, c) = 0`
- 计算器键盘支持 `x, y, z, a, b, c`、常数、基本运算和常用函数
- Keypad support for `x, y, z, a, b, c`, constants, operators, and common functions
- `a, b, c` 参数范围：`-5` 到 `5`
- Parameter range for `a, b, c`: `-5` to `5`
- 可选坐标范围：`±2`、`±5`、`±10`
- Selectable coordinate ranges: `±2`, `±5`, and `±10`
- 可调 Marching Cubes 分辨率
- Adjustable Marching Cubes resolution
- 实体、线框和半透明显示模式
- Solid, wireframe, and transparent display modes
- 鼠标拖拽旋转、滚轮缩放
- Mouse drag rotation and wheel zoom
- 明暗主题切换
- Light and dark themes

## 在线运行 Run Online

项目使用 `unpkg` CDN 加载 Three.js，因此运行时需要网络连接。

The project loads Three.js from the `unpkg` CDN, so an internet connection is required at runtime.

可以使用 GitHub Pages、任意静态网站托管服务，或本地 HTTP 服务器运行。

It can be deployed to GitHub Pages, any static hosting service, or a local HTTP server.

## 本地运行 Run Locally

### 使用启动脚本 Using the startup script

Windows 用户可以双击：

Windows users can double-click:

```text
start.bat
```

脚本会优先使用 Python 启动服务器；如果没有 Python，则尝试使用 Node.js。

The script tries Python first and falls back to Node.js when Python is unavailable.

### 手动启动 Using a manual server

```bash
python -m http.server 8000
```

然后打开：

Then open:

```text
http://localhost:8000/
```

不要直接双击 `index.html`，因为浏览器可能限制 `file://` 页面中的 ES Module 和 importmap 加载。

Do not open `index.html` directly with a double-click, because browsers may restrict ES Module and importmap loading from `file://` pages.

## 自定义函数 Custom Functions

在输入框中输入满足以下形式的表达式：

Enter an expression in the following form:

```text
f(x, y, z, a, b, c) = 0
```

实际输入时只需要填写等式左侧表达式，例如：

Only enter the expression, without `= 0`. For example:

```text
x*x + y*y + z*z - a*a
```

支持的函数包括：

Supported functions include:

```text
sin(x)  cos(x)  tan(x)  sqrt(x)  abs(x)  log(x)  exp(x)
```

幂运算可以使用 `^`，例如 `x^2`。

Use `^` for powers, such as `x^2`.

## 技术说明 Technical Notes

- Three.js version: `0.160.0`
- Rendering: WebGL through Three.js
- Surface extraction: Marching Cubes
- Module delivery: `unpkg` CDN with importmap
- Supported browsers: modern browsers with WebGL and ES Module support

## 项目结构 Project Structure

```text
implicit-surface-viewer/
├── index.html        页面结构和 importmap / HTML layout and importmap
├── start.bat         Windows 本地启动脚本 / Windows startup script
├── css/style.css     页面样式 / UI styles
└── js/
    ├── functions.js  预设函数和自定义函数解析 / functions and parser
    └── main.js       Three.js 场景及交互逻辑 / scene and interaction logic
```

## 许可证 License

本项目已采用 MIT 许可证。

This project is licensed under the MIT License.

本项目使用 Three.js（MIT License）通过 `unpkg` CDN 引入，相关版权和许可信息请参考 Three.js 官方仓库：

This project uses Three.js (MIT License) via the `unpkg` CDN. Please refer to the official Three.js repository for copyright and license details:

- https://github.com/mrdoob/three.js
- https://github.com/mrdoob/three.js/blob/dev/LICENSE

如果你将此项目重新分发或用于公开发布，请保留上述第三方依赖的版权与许可证说明。

If you redistribute or publish this project, please retain the copyright and license notices for the third-party dependency above.
