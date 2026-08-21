/**
 * 预设隐函数定义及参数配置
 * 每个函数返回 f(x,y,z) 的值，等值面为 f(x,y,z)=0
 */

// 预设函数配置
export const PRESET_FUNCTIONS = {
    sphere: {
        name: '球面',
        params: [
            { key: 'r', label: '半径', min: 0.3, max: 1.5, step: 0.05, value: 1.0 }
        ],
        fn: (x, y, z, p) => x*x + y*y + z*z - p.r*p.r
    },
    torus: {
        name: '环面',
        params: [
            { key: 'R', label: '主半径', min: 0.5, max: 1.5, step: 0.05, value: 1.0 },
            { key: 'r', label: '管半径', min: 0.1, max: 0.8, step: 0.05, value: 0.4 }
        ],
        fn: (x, y, z, p) => {
            const R = p.R, r = p.r;
            const d = Math.sqrt(x*x + y*y) - R;
            return d*d + z*z - r*r;
        }
    },
    heart: {
        name: '心脏曲面',
        params: [
            { key: 's', label: '缩放', min: 0.5, max: 2.0, step: 0.1, value: 1.0 }
        ],
        fn: (x, y, z, p) => {
            const s = p.s;
            x /= s; y /= s; z /= s;
            const a = x*x + 9*y*y/4 + z*z - 1;
            return a*a*a - x*x*z*z*z - 9*y*y*z*z*z/80;
        }
    },
    hyperboloid: {
        name: '双叶双曲面',
        params: [
            { key: 'a', label: 'a', min: 0.3, max: 1.5, step: 0.05, value: 0.8 },
            { key: 'b', label: 'b', min: 0.3, max: 1.5, step: 0.05, value: 0.8 },
            { key: 'c', label: 'c', min: 0.3, max: 1.5, step: 0.05, value: 0.8 }
        ],
        fn: (x, y, z, p) => z*z/(p.c*p.c) - x*x/(p.a*p.a) - y*y/(p.b*p.b) - 1
    },
    klein: {
        name: '克莱因瓶',
        params: [
            { key: 's', label: '缩放', min: 0.5, max: 2.0, step: 0.1, value: 1.0 }
        ],
        fn: (x, y, z, p) => {
            const s = p.s;
            x /= s; y /= s; z /= s;
            // 克莱因瓶近似隐函数
            const r = 2.0;
            const a = x*x + y*y + z*z + r*r - 1;
            const b = x*x + y*y - 1;
            return a*a*a*a - 4*r*r*b*b - 4*z*z*(x*x+y*y);
        }
    }
};

// 自定义函数解析
export function parseCustomFunction(expr) {
    // 替换数学符号
    let code = expr
        .replace(/\^/g, '**')
        .replace(/π/g, 'Math.PI')
        .replace(/\be\b(?![\w.])/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/log\(/g, 'Math.log(')
        .replace(/exp\(/g, 'Math.exp(');

    // 编译为函数
    try {
        const fn = new Function('x', 'y', 'z', `"use strict"; return (${code});`);
        // 测试执行
        fn(0, 0, 0);
        return fn;
    } catch (e) {
        throw new Error('函数表达式无效: ' + e.message);
    }
}