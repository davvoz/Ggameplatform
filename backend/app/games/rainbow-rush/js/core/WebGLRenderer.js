/**
 * WebGLRenderer - Handles WebGL shader compilation and rendering primitives
 * Follows Single Responsibility and Open/Closed Principles
 */
export class WebGLRenderer {
    constructor(gl) {
        this.gl = gl;
        this.shaderProgram = this.createShaderProgram();
        this.buffers = {
            position: gl.createBuffer(),
            color: gl.createBuffer()
        };
    }

    createShaderProgram() {
        const gl = this.gl;
        
        const vertexShaderSource = `
            attribute vec2 aPosition;
            attribute vec4 aColor;
            varying vec4 vColor;
            uniform vec2 uResolution;
            
            void main() {
                vec2 clipSpace = ((aPosition / uResolution) * 2.0) - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                vColor = aColor;
            }
        `;
        
        const fragmentShaderSource = `
            precision mediump float;
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `;
        
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Shader program failed to link: ' + gl.getProgramInfoLog(program));
        }
        
        return program;
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Shader compilation failed: ' + gl.getShaderInfoLog(shader));
        }
        
        return shader;
    }

    drawRect(x, y, width, height, color) {
        const gl = this.gl;
        
        const positions = new Float32Array([
            x, y,
            x + width, y,
            x, y + height,
            x, y + height,
            x + width, y,
            x + width, y + height
        ]);
        
        const colors = new Float32Array([
            ...color, ...color, ...color,
            ...color, ...color, ...color
        ]);
        
        this.draw(positions, colors, gl.TRIANGLES);
    }

    drawCircle(x, y, radius, color, segments = 32) {
        const gl = this.gl;
        const positions = [];
        const colors = [];
        
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            positions.push(x, y);
            positions.push(x + Math.cos(angle1) * radius, y + Math.sin(angle1) * radius);
            positions.push(x + Math.cos(angle2) * radius, y + Math.sin(angle2) * radius);
            
            colors.push(...color, ...color, ...color);
        }
        
        this.draw(new Float32Array(positions), new Float32Array(colors), gl.TRIANGLES);
    }

    drawLine(x1, y1, x2, y2, thickness, color) {
        const gl = this.gl;
        
        // Calculate perpendicular vector for line thickness
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return; // Skip zero-length lines
        
        const perpX = -dy / length * thickness / 2;
        const perpY = dx / length * thickness / 2;
        
        // Create rectangle along the line
        const positions = new Float32Array([
            x1 - perpX, y1 - perpY,
            x1 + perpX, y1 + perpY,
            x2 - perpX, y2 - perpY,
            x2 - perpX, y2 - perpY,
            x1 + perpX, y1 + perpY,
            x2 + perpX, y2 + perpY
        ]);
        
        const colors = new Float32Array([
            ...color, ...color, ...color,
            ...color, ...color, ...color
        ]);
        
        this.draw(positions, colors, gl.TRIANGLES);
    }

    draw(positions, colors, mode) {
        const gl = this.gl;
        
        gl.useProgram(this.shaderProgram);
        
        // Position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        const positionLocation = gl.getAttribLocation(this.shaderProgram, 'aPosition');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        
        const colorLocation = gl.getAttribLocation(this.shaderProgram, 'aColor');
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
        
        // Resolution uniform
        const resolutionLocation = gl.getUniformLocation(this.shaderProgram, 'uResolution');
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
        
        gl.drawArrays(mode, 0, positions.length / 2);
    }
}
